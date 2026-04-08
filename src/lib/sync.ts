import { db } from "./db";
import { getPlaylistItems } from "./youtube";
import { refreshAccessToken, addTracksToPlaylist } from "./spotify";
import { matchTrack } from "./matcher";

/**
 * Get a valid Spotify access token for a user, refreshing if needed.
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  if (user.tokenExpiry > new Date(Date.now() + 60_000)) {
    return user.accessToken;
  }

  const refreshed = await refreshAccessToken(user.refreshToken);
  await db.user.update({
    where: { id: userId },
    data: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      tokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  });

  return refreshed.accessToken;
}

/**
 * Sync a single playlist link: fetch YouTube items, match to Spotify, add new tracks.
 */
export async function syncPlaylistLink(
  linkId: string,
  options: { forceRetryFailed?: boolean } = {}
): Promise<{
  found: number;
  matched: number;
  failed: number;
}> {
  const link = await db.playlistLink.findUniqueOrThrow({
    where: { id: linkId },
    include: {
      syncedTracks: {
        select: { youtubeVideoId: true, spotifyTrackId: true },
      },
    },
  });

  const log = await db.syncLog.create({
    data: { playlistLinkId: linkId },
  });

  try {
    const accessToken = await getValidAccessToken(link.userId);
    const ytItems = await getPlaylistItems(link.youtubePlaylistId);
    const dedupedItems = Array.from(
      new Map(ytItems.map((item) => [item.videoId, item])).values()
    );

    const syncedTrackMap = new Map(
      link.syncedTracks.map((t) => [t.youtubeVideoId, t.spotifyTrackId])
    );

    const itemsToProcess = dedupedItems.filter((item) => {
      const existingSpotifyId = syncedTrackMap.get(item.videoId);
      // 신규 곡이거나, 옵션이 켜져 있고 기존에 실패한 곡인 경우
      const isNew = !syncedTrackMap.has(item.videoId);
      const isFailedAndRetry =
        options.forceRetryFailed &&
        syncedTrackMap.has(item.videoId) &&
        existingSpotifyId === null;

      return isNew || isFailedAndRetry;
    });

    if (itemsToProcess.length === 0) {
      await db.syncLog.update({
        where: { id: log.id },
        data: {
          completedAt: new Date(),
          tracksFound: 0,
          status: "success",
        },
      });
      await db.playlistLink.update({
        where: { id: linkId },
        data: { lastSyncedAt: new Date() },
      });
      return { found: 0, matched: 0, failed: 0 };
    }

    let matched = 0;
    let failed = 0;
    const trackUrisToAdd: string[] = [];

    for (const item of itemsToProcess) {
      const result = await matchTrack(accessToken, item.title, item.channelTitle);

      await db.syncedTrack.upsert({
        where: {
          playlistLinkId_youtubeVideoId: {
            playlistLinkId: linkId,
            youtubeVideoId: item.videoId,
          },
        },
        update: {
          youtubeTitle: item.title,
          spotifyTrackId: result.spotifyTrack?.id ?? null,
          matchConfidence: result.confidence,
        },
        create: {
          playlistLinkId: linkId,
          youtubeVideoId: item.videoId,
          youtubeTitle: item.title,
          spotifyTrackId: result.spotifyTrack?.id ?? null,
          matchConfidence: result.confidence,
        },
      });

      if (result.spotifyTrack) {
        trackUrisToAdd.push(result.spotifyTrack.uri);
        matched++;
      } else {
        failed++;
      }
    }

    if (trackUrisToAdd.length > 0) {
      await addTracksToPlaylist(accessToken, link.spotifyPlaylistId, trackUrisToAdd);
    }

    const status = failed === 0 ? "success" : matched === 0 ? "failed" : "partial";

    await db.syncLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        tracksFound: itemsToProcess.length,
        tracksMatched: matched,
        tracksFailed: failed,
        status,
      },
    });

    await db.playlistLink.update({
      where: { id: linkId },
      data: { lastSyncedAt: new Date() },
    });

    return { found: itemsToProcess.length, matched, failed };
  } catch (error) {
    await db.syncLog.update({
      where: { id: log.id },
      data: {
        completedAt: new Date(),
        status: "failed",
      },
    });
    throw error;
  }
}

/**
 * Run sync for all enabled playlist links that are due.
 */
export async function syncAllDueLinks(): Promise<void> {
  const links = await db.playlistLink.findMany({
    where: { syncEnabled: true },
  });

  const now = Date.now();

  for (const link of links) {
    const lastSync = link.lastSyncedAt?.getTime() ?? 0;
    const intervalMs = link.syncIntervalHours * 60 * 60 * 1000;

    if (now - lastSync >= intervalMs) {
      try {
        await syncPlaylistLink(link.id);
      } catch (error) {
        console.error(`Sync failed for link ${link.id}:`, error);
      }
    }
  }
}

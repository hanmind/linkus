const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubePlaylistItem {
  videoId: string;
  title: string;
  channelTitle: string;
}

export interface YouTubePlaylistInfo {
  id: string;
  title: string;
  itemCount: number;
}

export function extractPlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("list");
  } catch {
    const match = url.match(/(?:list=)([a-zA-Z0-9_-]+)/);
    return match?.[1] ?? null;
  }
}

export async function getPlaylistInfo(
  playlistId: string
): Promise<YouTubePlaylistInfo | null> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    id: playlistId,
    key: process.env.YOUTUBE_API_KEY!,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/playlists?${params}`);
  if (!res.ok) return null;

  const data = await res.json();
  const playlist = data.items?.[0];
  if (!playlist) return null;

  return {
    id: playlist.id,
    title: playlist.snippet.title,
    itemCount: playlist.contentDetails.itemCount,
  };
}

export async function getPlaylistItems(
  playlistId: string
): Promise<YouTubePlaylistItem[]> {
  const items: YouTubePlaylistItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId,
      maxResults: "50",
      key: process.env.YOUTUBE_API_KEY!,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params}`);
    if (!res.ok) break;

    const data = await res.json();

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      if (snippet.resourceId?.kind !== "youtube#video") continue;

      // Skip deleted/private videos
      if (snippet.title === "Deleted video" || snippet.title === "Private video") {
        continue;
      }

      items.push({
        videoId: snippet.resourceId.videoId,
        title: snippet.title,
        channelTitle: snippet.videoOwnerChannelTitle ?? snippet.channelTitle ?? "",
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

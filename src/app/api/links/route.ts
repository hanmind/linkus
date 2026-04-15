import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractPlaylistId, getPlaylistInfo } from "@/lib/youtube";
import {
  refreshAccessToken,
  createPlaylist,
} from "@/lib/spotify";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { spotifyId: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const links = await db.playlistLink.findMany({
    where: { userId: user.id },
    include: {
      syncedTracks: {
        select: {
          youtubeTitle: true,
          youtubeVideoId: true,
          spotifyTrackId: true,
          matchConfidence: true,
        },
        orderBy: { syncedAt: "asc" },
      },
      syncLogs: {
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = links.map((link) => ({
    id: link.id,
    youtubePlaylistId: link.youtubePlaylistId,
    youtubePlaylistTitle: link.youtubePlaylistTitle,
    spotifyPlaylistId: link.spotifyPlaylistId,
    syncEnabled: link.syncEnabled,
    syncIntervalHours: link.syncIntervalHours,
    lastSyncedAt: link.lastSyncedAt,
    totalTracks: link.syncedTracks.length,
    matchedTracks: link.syncedTracks.filter((t) => t.spotifyTrackId).length,
    lastSyncStatus: link.syncLogs[0]?.status ?? null,
    createdAt: link.createdAt,
    tracks: link.syncedTracks.map((t) => ({
      youtubeTitle: t.youtubeTitle,
      youtubeVideoId: t.youtubeVideoId,
      spotifyTrackId: t.spotifyTrackId,
      matchConfidence: t.matchConfidence,
    })),
  }));

  return NextResponse.json(formatted);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { youtubeUrl } = body;

  if (!youtubeUrl || typeof youtubeUrl !== "string") {
    return NextResponse.json(
      { error: "YouTube URL을 입력해 주세요" },
      { status: 400 }
    );
  }

  const playlistId = extractPlaylistId(youtubeUrl);
  if (!playlistId) {
    return NextResponse.json(
      { error: "유효하지 않은 YouTube 플레이리스트 URL입니다" },
      { status: 400 }
    );
  }

  const ytPlaylist = await getPlaylistInfo(playlistId);
  if (!ytPlaylist) {
    return NextResponse.json(
      { error: "YouTube 플레이리스트를 찾을 수 없거나 접근할 수 없습니다 (비공개 여부 확인)" },
      { status: 404 }
    );
  }

  const user = await db.user.findUnique({
    where: { spotifyId: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다" }, { status: 404 });
  }

  const existing = await db.playlistLink.findUnique({
    where: {
      userId_youtubePlaylistId: {
        userId: user.id,
        youtubePlaylistId: playlistId,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 연동된 플레이리스트입니다" },
      { status: 409 }
    );
  }

  // Ensure fresh token
  let accessToken = user.accessToken;
  if (user.tokenExpiry <= new Date(Date.now() + 60_000)) {
    const refreshed = await refreshAccessToken(user.refreshToken);
    accessToken = refreshed.accessToken;
    await db.user.update({
      where: { id: user.id },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenExpiry: new Date(Date.now() + refreshed.expiresIn * 1000),
      },
    });
  }

  const spotifyPlaylist = await createPlaylist(
    accessToken,
    `${ytPlaylist.title} (Linkus)`,
    `Auto-synced from YouTube by Linkus`
  );

  const link = await db.playlistLink.create({
    data: {
      userId: user.id,
      youtubePlaylistId: playlistId,
      youtubePlaylistTitle: ytPlaylist.title,
      spotifyPlaylistId: spotifyPlaylist.id,
    },
  });

  return NextResponse.json(
    {
      id: link.id,
      youtubePlaylistTitle: ytPlaylist.title,
      spotifyPlaylistId: spotifyPlaylist.id,
      message: "Playlist linked. Initial sync will start now.",
    },
    { status: 201 }
  );
}

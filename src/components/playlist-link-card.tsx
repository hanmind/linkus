"use client";

import { useState } from "react";
import { SyncStatusBadge } from "./sync-status-badge";

interface PlaylistLinkData {
  id: string;
  youtubePlaylistId: string;
  youtubePlaylistTitle: string;
  spotifyPlaylistId: string;
  syncEnabled: boolean;
  syncIntervalHours: number;
  lastSyncedAt: string | null;
  totalTracks: number;
  matchedTracks: number;
  lastSyncStatus: string | null;
}

export function PlaylistLinkCard({
  link,
  isSyncing,
  onDelete,
  onSync,
}: {
  link: PlaylistLinkData;
  isSyncing: boolean;
  onDelete: (id: string) => void;
  onSync: (id: string) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(link.syncEnabled);
  const failedTracks = link.totalTracks - link.matchedTracks;

  async function handleSync() {
    await onSync(link.id);
  }

  async function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    await fetch(`/api/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncEnabled: next }),
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[var(--card-foreground)]">
            {link.youtubePlaylistTitle}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <SyncStatusBadge status={isSyncing ? "running" : link.lastSyncStatus} />
            {link.lastSyncedAt && (
              <span className="text-xs text-[var(--muted-foreground)]">
                {new Date(link.lastSyncedAt).toLocaleString("ko-KR")}
              </span>
            )}
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-[var(--muted)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[var(--primary)] peer-checked:after:translate-x-full" />
        </label>
      </div>

      <div className="mt-4 flex gap-4 text-sm text-[var(--muted-foreground)]">
        <div>
          <span className="font-medium text-[var(--card-foreground)]">
            {link.matchedTracks}
          </span>{" "}
          곡 매칭
        </div>
        {failedTracks > 0 && (
          <div>
            <span className="font-medium text-[var(--destructive)]">
              {failedTracks}
            </span>{" "}
            곡 실패
          </div>
        )}
        <div>
          <span className="font-medium text-[var(--card-foreground)]">
            하루 1회
          </span>{" "}
          자동 동기화
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4">
        <a
          href={`https://www.youtube.com/playlist?list=${link.youtubePlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          YouTube
        </a>
        <a
          href={`https://open.spotify.com/playlist/${link.spotifyPlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--muted)]"
        >
          Spotify
        </a>
        <div className="flex-1" />
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
        >
          {isSyncing ? "동기화 중..." : "지금 동기화"}
        </button>
        <button
          onClick={() => onDelete(link.id)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

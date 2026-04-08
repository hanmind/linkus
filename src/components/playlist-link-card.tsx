"use client";

import { useState } from "react";
import { SyncStatusBadge } from "./sync-status-badge";

export interface SyncedTrackRow {
  youtubeTitle: string;
  youtubeVideoId: string;
  spotifyTrackId: string | null;
  matchConfidence: number | null;
}

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
  tracks?: SyncedTrackRow[];
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
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
  const tracks = link.tracks ?? [];

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
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-[var(--card-foreground)]">
              {link.youtubePlaylistTitle}
            </h3>
            <SyncStatusBadge status={isSyncing ? "running" : link.lastSyncStatus} />
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {link.lastSyncedAt && (
              <span className="text-xs text-[var(--muted-foreground)]">
                마지막 동기화: {new Date(link.lastSyncedAt).toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-xs font-medium text-[var(--muted-foreground)]">
            자동 동기화
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${enabled ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
            >
              {enabled ? "켜짐" : "꺼짐"}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={enabled}
                onChange={handleToggle}
                className="peer sr-only"
                aria-label="자동 동기화 켜기 또는 끄기"
              />
              <div className="h-5 w-9 rounded-full bg-[var(--muted)] after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[var(--primary)] peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
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
      </div>

      {tracks.length > 0 && (
        <details className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-[var(--card-foreground)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              <span>곡 목록 ({tracks.length}곡)</span>
              <span className="text-xs font-normal text-[var(--muted-foreground)]">
                매칭 / 실패 확인
              </span>
            </span>
          </summary>
          <ul className="max-h-60 overflow-y-auto border-t border-[var(--border)] px-3 py-2 text-sm">
            {tracks.map((t) => {
              const ok = Boolean(t.spotifyTrackId);
              return (
                <li
                  key={t.youtubeVideoId}
                  className="flex items-start gap-2 border-b border-[var(--border)] py-2 last:border-0"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      ok
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
                    }`}
                  >
                    {ok ? "매칭" : "실패"}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-[var(--card-foreground)]">
                    {t.youtubeTitle}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-4">
        <a
          href={`https://www.youtube.com/playlist?list=${link.youtubePlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-[var(--muted)] dark:text-red-400"
          title="YouTube에서 열기"
          aria-label="YouTube에서 열기"
        >
          <YouTubeIcon />
        </a>
        <a
          href={`https://open.spotify.com/playlist/${link.spotifyPlaylistId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#1DB954] transition-colors hover:bg-[var(--muted)]"
          title="Spotify에서 열기"
          aria-label="Spotify에서 열기"
        >
          <SpotifyIcon />
        </a>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
          title={isSyncing ? "동기화 중" : "지금 동기화"}
          aria-label={isSyncing ? "동기화 중" : "지금 동기화"}
        >
          <RefreshIcon />
          <span className="hidden sm:inline">{isSyncing ? "동기화 중..." : "지금 동기화"}</span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(link.id)}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
          title="연동 삭제"
          aria-label="연동 삭제"
        >
          <TrashIcon />
          <span className="hidden sm:inline">삭제</span>
        </button>
      </div>
    </div>
  );
}

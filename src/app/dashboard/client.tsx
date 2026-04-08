"use client";

import { useCallback, useEffect, useState } from "react";
import { PlaylistLinkCard } from "@/components/playlist-link-card";
import { NewLinkForm } from "./new-link-form";

interface LinkData {
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
  tracks?: {
    youtubeTitle: string;
    youtubeVideoId: string;
    spotifyTrackId: string | null;
    matchConfidence: number | null;
  }[];
}

interface NewLinkResponse {
  id: string;
  youtubePlaylistTitle: string;
  spotifyPlaylistId: string;
  message: string;
}

export function DashboardClient() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [pendingInitialSyncId, setPendingInitialSyncId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        setLinks(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  async function handleDelete(id: string) {
    if (!confirm("이 연동을 삭제하시겠습니까? Spotify 플레이리스트는 유지됩니다.")) {
      return;
    }
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  const handleSync = useCallback(async (id: string) => {
    setSyncingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));

    try {
      await fetchLinks();

      const res = await fetch(`/api/sync/${id}`, { method: "POST" });
      if (!res.ok) {
        console.error(`Sync failed for link ${id}`);
      }
    } finally {
      setSyncingIds((prev) => prev.filter((syncingId) => syncingId !== id));
      await fetchLinks();
    }
  }, [fetchLinks]);

  useEffect(() => {
    if (!pendingInitialSyncId) {
      return;
    }

    const linkExists = links.some((link) => link.id === pendingInitialSyncId);
    const alreadySyncing = syncingIds.includes(pendingInitialSyncId);

    if (!linkExists || alreadySyncing) {
      return;
    }

    setPendingInitialSyncId(null);
    void handleSync(pendingInitialSyncId);
  }, [handleSync, links, pendingInitialSyncId, syncingIds]);

  async function handleLinkCreated(link: NewLinkResponse) {
    await fetchLinks();
    setPendingInitialSyncId(link.id);
  }

  if (loading) {
    return (
      <div className="mt-12 text-center text-[var(--muted-foreground)]">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <NewLinkForm onCreated={handleLinkCreated} />

      {links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted-foreground)]">
          <p className="text-lg font-medium">아직 연동된 플레이리스트가 없습니다</p>
          <p className="mt-1 text-sm">
            위에서 YouTube 플레이리스트 URL을 입력해 시작하세요
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">연동된 플레이리스트</h2>
          {links.map((link) => (
            <PlaylistLinkCard
              key={link.id}
              link={link}
              isSyncing={syncingIds.includes(link.id)}
              onDelete={handleDelete}
              onSync={handleSync}
            />
          ))}
        </div>
      )}
    </div>
  );
}

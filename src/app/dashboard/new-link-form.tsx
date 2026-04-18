"use client";

import { useState } from "react";

interface NewLinkResponse {
  id: string;
  youtubePlaylistTitle: string;
  spotifyPlaylistId: string;
  message: string;
}

export function NewLinkForm({
  onCreated,
}: {
  onCreated: (link: NewLinkResponse) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!url.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다");
        return;
      }

      setSuccess(`"${data.youtubePlaylistTitle}" 연동 완료! 첫 동기화를 시작합니다.`);
      setUrl("");
      await onCreated(data);
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-medium">
        YouTube 플레이리스트 URL
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/playlist?list=..."
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "연동 중..." : "연동하기"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-[var(--destructive)]">{error}</p>
      )}
      {success && (
        <p className="text-sm text-[var(--primary)]">{success}</p>
      )}
    </form>
  );
}

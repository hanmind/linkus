"use client";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  success: {
    label: "동기화 완료",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  partial: {
    label: "부분 매칭",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  failed: {
    label: "동기화 실패",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  running: {
    label: "동기화 중...",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

export function SyncStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
        대기 중
      </span>
    );
  }

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

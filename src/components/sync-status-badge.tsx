"use client";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckIcon; colorClass: string; label: string }
> = {
  success: {
    icon: CheckIcon,
    colorClass: "text-green-600 dark:text-green-400",
    label: "동기화 완료",
  },
  partial: {
    icon: CheckIcon,
    colorClass: "text-green-600 dark:text-green-400",
    label: "동기화 완료",
  },
  failed: {
    icon: AlertIcon,
    colorClass: "text-red-600 dark:text-red-400",
    label: "동기화 실패",
  },
  running: {
    icon: LoaderIcon,
    colorClass: "text-blue-600 dark:text-blue-400",
    label: "동기화 중",
  },
};

export function SyncStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.failed;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center justify-center ${config.colorClass}`}
      title={config.label}
      aria-label={config.label}
    >
      <Icon />
    </div>
  );
}

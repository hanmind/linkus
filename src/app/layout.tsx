import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linkus - YouTube to Spotify Sync",
  description:
    "Automatically sync your YouTube playlists to Spotify. Never miss a beat.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

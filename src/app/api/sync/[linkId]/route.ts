import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncPlaylistLink } from "@/lib/sync";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { linkId } = await params;

  const user = await db.user.findUnique({
    where: { spotifyId: session.user.id },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const link = await db.playlistLink.findUnique({
    where: { id: linkId },
  });
  if (!link || link.userId !== user.id) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  try {
    const result = await syncPlaylistLink(linkId, { forceRetryFailed: true });
    return NextResponse.json({
      message: "Sync completed",
      ...result,
    });
  } catch (error) {
    console.error(`Manual sync failed for link ${linkId}:`, error);
    return NextResponse.json(
      { error: "Sync failed. Please try again." },
      { status: 500 }
    );
  }
}

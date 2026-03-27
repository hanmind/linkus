import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
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

  await db.playlistLink.delete({ where: { id: linkId } });

  return NextResponse.json({ message: "Link deleted" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { linkId } = await params;
  const body = await req.json();

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

  const updateData: Record<string, unknown> = {};
  if (typeof body.syncEnabled === "boolean") {
    updateData.syncEnabled = body.syncEnabled;
  }
  if (typeof body.syncIntervalHours === "number" && body.syncIntervalHours >= 1) {
    updateData.syncIntervalHours = body.syncIntervalHours;
  }

  const updated = await db.playlistLink.update({
    where: { id: linkId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

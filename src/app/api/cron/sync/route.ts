import { NextRequest, NextResponse } from "next/server";
import { syncAllDueLinks } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncAllDueLinks();
    return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: "Sync failed" },
      { status: 500 }
    );
  }
}

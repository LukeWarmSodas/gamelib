import { prisma } from "@/lib/db";
import { runScan } from "@/lib/scanner";
import { NextResponse } from "next/server";

export async function GET() {
  const latest = await prisma.scanJob.findFirst({
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json(latest);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { force?: boolean };
    const result = await runScan({ force: Boolean(body.force) });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    const badLibraryRoot =
      message.includes("Cannot read library folder") ||
      message.includes("LIBRARY_ROOT must");
    return NextResponse.json({ message }, { status: badLibraryRoot ? 400 : 500 });
  }
}

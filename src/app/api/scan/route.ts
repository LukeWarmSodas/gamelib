import { prisma } from "@/lib/db";
import { runScan } from "@/lib/scanner";
import { NextResponse } from "next/server";

export async function GET() {
  const latest = await prisma.scanJob.findFirst({
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json(latest);
}

export async function POST() {
  const result = await runScan();
  return NextResponse.json(result);
}

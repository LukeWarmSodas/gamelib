import { searchMetadataCandidates } from "@/lib/metadata/providers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json([]);
  }
  const results = await searchMetadataCandidates(q);
  return NextResponse.json(results);
}

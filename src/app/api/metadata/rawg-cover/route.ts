import { getRawgBackgroundImageUrl } from "@/lib/metadata/rawg";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ url: null }, { status: 400 });
  }
  const url = await getRawgBackgroundImageUrl(q);
  return NextResponse.json({ url });
}

const UA = "GameLib/1.0 (metadata)";

type RawgGameHit = {
  name?: string;
  background_image?: string | null;
};

type RawgSearchResponse = {
  results?: RawgGameHit[];
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 12_000, ...rest } = init;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      headers: {
        "User-Agent": UA,
        ...(rest.headers as Record<string, string> | undefined),
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/** First RAWG search hit background image URL, or null if no key / no result. */
export async function getRawgBackgroundImageUrl(searchTitle: string): Promise<string | null> {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) return null;
  const q = searchTitle.trim().replace(/"/g, "");
  if (!q) return null;
  const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&page_size=1&key=${encodeURIComponent(key)}`;
  const res = await fetchWithTimeout(url, { method: "GET" });
  if (!res.ok) return null;
  const data = (await res.json()) as RawgSearchResponse;
  const hit = data.results?.[0];
  const bg = hit?.background_image?.trim();
  return bg || null;
}

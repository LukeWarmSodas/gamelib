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

/** True when the URL should be replaced (missing, forbidden, server error, timeout). */
export async function isArtworkUrlBroken(url: string): Promise<boolean> {
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD", redirect: "follow" });
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(url, {
        method: "GET",
        redirect: "follow",
        headers: { Range: "bytes=0-0" },
      });
    }
    if (res.ok) return false;
    if (res.status >= 400) return true;
    return true;
  } catch {
    return true;
  }
}

async function rawgFirstHit(searchTitle: string): Promise<RawgGameHit | null> {
  const key = process.env.RAWG_API_KEY?.trim();
  if (!key) return null;
  const q = searchTitle.trim().replace(/"/g, "");
  if (!q) return null;
  const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&page_size=1&key=${encodeURIComponent(key)}`;
  const res = await fetchWithTimeout(url, { method: "GET" });
  if (!res.ok) return null;
  const data = (await res.json()) as RawgSearchResponse;
  const hit = data.results?.[0];
  if (!hit?.background_image?.trim()) return null;
  return hit;
}

/**
 * After enrich picks IGDB image URLs, fills gaps: missing slot or 4xx/5xx → RAWG first hit
 * (`background_image`) when RAWG_API_KEY is set.
 */
export async function resolveArtworkUrls(
  displayTitle: string,
  input: { coverUrl?: string; backdropUrl?: string },
): Promise<{ coverUrl?: string; backdropUrl?: string }> {
  let coverUrl = input.coverUrl?.trim() || undefined;
  let backdropUrl = input.backdropUrl?.trim() || undefined;

  const coverOk = coverUrl ? !(await isArtworkUrlBroken(coverUrl)) : false;
  const backdropOk = backdropUrl ? !(await isArtworkUrlBroken(backdropUrl)) : false;

  if (coverOk && backdropOk) {
    return { coverUrl, backdropUrl };
  }

  const rawg = await rawgFirstHit(displayTitle);
  const fallback = rawg?.background_image?.trim();
  if (!fallback) {
    return { coverUrl, backdropUrl };
  }

  if (!coverOk) {
    coverUrl = fallback;
  }
  if (!backdropOk) {
    backdropUrl = fallback;
  }

  return { coverUrl, backdropUrl };
}

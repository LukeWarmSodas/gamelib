export type MetadataResult = {
  title: string;
  releaseYear?: number;
  genres?: string[];
  description?: string;
  coverUrl?: string;
  backdropUrl?: string;
  provider: string;
  steamAppId?: string;
  steamTitle?: string;
};

export type MetadataEnrichmentResult = MetadataResult & {
  queryUsed?: string;
};

export type MetadataCandidate = {
  title: string;
  source: "igdb" | "steam";
  coverUrl?: string;
  year?: number;
  steamAppId?: string;
};

const COMMON_WORDS = /\b(usa|eur|jpn|rev\d+|v\d+|iso|rom|multi\d*)\b/gi;
const SCENE_TAGS =
  /\b(repack|readnfo|incl\.?dlc|proper|goty|complete|update|hotfix|ripped|unrated|steamrip|p2p|0xdeadcode|insaneramzes)\b/gi;
const PLATFORM_TAGS =
  /\b(gog|steam|epic|origin|uplay|battle\s*net|battlenet|bethesda|windows|ps3|ps4|ps5|xbox|switch|pc|win64|x64|x86|linux|macos)\b/gi;
const QUALITY_TAGS =
  /\b(internal|retail|crackfix|dirfix|dodi|fitgirl|elamigos|portable|rip|multi\d+|dlc|bonus)\b/gi;
/** Strip common deluxe/ultimate strings so IGDB queries match base game titles */
const EDITION_FLUFF =
  /\b(ultimate|deluxe|premium|gold|definitive|complete)\s+edition\b|\bgoty\b|\bgame\s+of\s+the\s+year\b/gi;
const BRACKETED = /\[[^\]]*]|\([^)]*\)/g;
const TRAILING_GROUP = /-[A-Za-z0-9]+$/;
const YEAR_TOKEN = /\b(19|20)\d{2}\b/g;
const LEADING_SCENE_GROUP = /^(rune|wow|tenoke|flt|codex|skidrow|razor1911|empress|p2p|goldberg|ofme|elamigos|insaneramzes)[-_. ]+/i;
const TRAILING_TIMESTAMP = /(?:^|[ _-])\d{4}-\d{2}-\d{2}t\d{2}(?:[-:]\d{2}){2}(?:\.\d+)?z?$/i;
/**
 * Semver-ish tokens: v1.5.6.F1 / v1.42a (letter glued to last numeric segment) / 1.0.0.R2502.
 * Trailing `(?:[a-z]\d*)?` eats patch letters like `42a` without a dot before the letter.
 */
const VERSION_TOKENS =
  /\bv(?:ersion)?\s*\d+(?:[._\s]\d+)*(?:[._][a-z]\d*)?(?:[a-z]\d*)?\b|\b\d+(?:[._]\d+){1,}(?:[._][a-z]\d*)?(?:[a-z]\d*)?\b|\bbuild[ ._-]*\d+\b|\bearly\s*access\b/gi;
const NOISE_SUFFIX =
  /(?:^|[ ._-])(?:p2p|0xdeadcode|insaneramzes|goldberg|ofme|steamrip\.com|gog|battle\.net|epic)$/i;
const TRAILING_GROUP_TOKEN =
  /(?:^|[ ._-])(p2p|0xdeadcode|insaneramzes|goldberg|ofme|tenoke|rune|wow|fitgirl|dodi)$/i;

type IgdbGame = {
  name?: string;
  summary?: string;
  first_release_date?: number;
  genres?: Array<{ name?: string }>;
  cover?: { image_id?: string };
  artworks?: Array<{ image_id?: string }>;
};

type SteamSearchHit = { appid: string; name: string };
type SteamAppDetails = {
  name?: string;
  short_description?: string;
  about_the_game?: string;
  header_image?: string;
  capsule_image?: string;
  genres?: Array<{ id?: string; description?: string }>;
  release_date?: { coming_soon?: boolean; date?: string };
  screenshots?: Array<{ path_full?: string }>;
};

let igdbTokenCache:
  | {
      token: string;
      expiresAt: number;
    }
  | undefined;
const steamSearchCache = new Map<string, string | null>();

function prettyTitle(raw: string): string {
  return raw
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(TRAILING_TIMESTAMP, "")
    .replace(LEADING_SCENE_GROUP, "")
    // Launcher / store rip chunks before splitting dots (Battle.NET.Rip, etc.)
    .replace(/\bbattle\.net\b/gi, " ")
    .replace(/\bbattle\.?\s*net(?:\s*rip)?\b/gi, " ")
    .replace(VERSION_TOKENS, "")
    .replace(/[._-]+/g, " ")
    .replace(BRACKETED, "")
    .replace(NOISE_SUFFIX, "")
    .replace(TRAILING_GROUP_TOKEN, "")
    .replace(TRAILING_GROUP, "")
    .replace(SCENE_TAGS, "")
    .replace(PLATFORM_TAGS, "")
    .replace(QUALITY_TAGS, "")
    .replace(EDITION_FLUFF, "")
    .replace(/\br\d{4,}\b/gi, "") // orphan scene build tags (e.g. R2502)
    .replace(COMMON_WORDS, "")
    .trim()
    .replace(/\s{2,}/g, " ");
}

export function titleCandidates(raw: string): string[] {
  const withoutExt = raw.replace(/\.[a-z0-9]+$/i, "");
  const stripped = withoutExt
    .replace(TRAILING_TIMESTAMP, "")
    .replace(LEADING_SCENE_GROUP, "")
    .replace(NOISE_SUFFIX, "")
    .replace(TRAILING_GROUP_TOKEN, "");
  const normalized = stripped.replace(/[._-]+/g, " ").replace(/\s{2,}/g, " ").trim();
  const cleaned = prettyTitle(withoutExt);
  const withoutYear = cleaned.replace(YEAR_TOKEN, "").replace(/\s{2,}/g, " ").trim();
  const noVersion = normalized.replace(VERSION_TOKENS, "").replace(/\s{2,}/g, " ").trim();

  const candidates = [
    cleaned,
    withoutYear,
    noVersion,
    normalized,
    normalized.replace(TRAILING_GROUP, "").trim(),
  ]
    .map((t) => t.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);

  return [...new Set(candidates)].slice(0, 6);
}

function imageUrl(imageId: string | undefined, size: "cover_big" | "screenshot_huge") {
  if (!imageId) return undefined;
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

function normalizeForSimilarity(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function similarity(a: string, b: string) {
  const left = normalizeForSimilarity(a).split(" ").filter(Boolean);
  const right = normalizeForSimilarity(b).split(" ").filter(Boolean);
  if (left.length === 0 || right.length === 0) return 0;
  const inter = left.filter((w) => right.includes(w));
  const union = new Set([...left, ...right]);
  return inter.length / union.size;
}

async function searchSteamApps(query: string): Promise<SteamSearchHit[]> {
  const res = await fetch(
    `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(query)}`,
    {
      headers: { "User-Agent": "GameLib/1.0" },
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ appid: string | number; name: string }>;
  if (!Array.isArray(data)) return [];
  return data.slice(0, 20).map((item) => ({ appid: String(item.appid), name: item.name }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function steamReleaseYear(
  rd?: SteamAppDetails["release_date"],
): number | undefined {
  if (!rd?.date || rd.coming_soon) return undefined;
  const y = rd.date.match(/\b(19|20)\d{2}\b/);
  return y ? Number(y[0]) : undefined;
}

function steamGenres(details: SteamAppDetails): string[] | undefined {
  const tags =
    details.genres?.map((g) => g.description).filter((x): x is string => Boolean(x?.trim())) ??
    [];
  return tags.length ? tags : undefined;
}

function steamDescription(details: SteamAppDetails): string | undefined {
  if (details.short_description?.trim()) {
    return details.short_description.trim();
  }
  if (details.about_the_game?.trim()) {
    return stripHtml(details.about_the_game).slice(0, 8000);
  }
  return undefined;
}

async function resolveSteam(
  rawName: string,
  candidateOffset = 0,
): Promise<{ appId?: string; title?: string }> {
  const candidates = titleCandidates(rawName).slice(candidateOffset, candidateOffset + 4);
  for (const candidate of candidates) {
    const cacheKey = candidate.toLowerCase();
    if (steamSearchCache.has(cacheKey)) {
      const cached = steamSearchCache.get(cacheKey);
      if (cached) return { appId: cached };
      continue;
    }

    const hits = await searchSteamApps(candidate);
    let best: SteamSearchHit | null = null;
    let bestScore = 0;
    for (const hit of hits) {
      const score = similarity(candidate, hit.name);
      if (score > bestScore) {
        bestScore = score;
        best = hit;
      }
    }
    if (best && bestScore >= 0.5) {
      steamSearchCache.set(cacheKey, best.appid);
      return { appId: best.appid, title: best.name };
    }
    steamSearchCache.set(cacheKey, null);
  }
  return {};
}

async function fetchSteamAppDetails(appId: string): Promise<SteamAppDetails | null> {
  const res = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${encodeURIComponent(appId)}&l=en`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, { success: boolean; data?: SteamAppDetails }>;
  const payload = data[appId];
  if (!payload?.success || !payload.data) return null;
  return payload.data;
}

async function getIgdbToken() {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  if (igdbTokenCache && Date.now() < igdbTokenCache.expiresAt) {
    return { clientId, token: igdbTokenCache.token };
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST",
  });
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  igdbTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in - 120) * 1000,
  };

  return { clientId, token: data.access_token };
}

/**
 * Resolve cover + hero/backdrop from IGDB search (first good hit per query string).
 * Does not use Steam CDN. Optional anchor title (e.g. Steam store name) rejects weak name matches.
 */
export async function fetchIgdbGameArt(
  searchQueries: string[],
  anchorTitle?: string,
): Promise<{ coverUrl?: string; backdropUrl?: string } | null> {
  const auth = await getIgdbToken();
  if (!auth) return null;
  const anchor = anchorTitle?.trim();

  const seen = new Set<string>();
  for (const q of searchQueries) {
    const qt = q.trim().replace(/"/g, "");
    if (!qt) continue;
    const key = qt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const body = [
      "fields name,cover.image_id,artworks.image_id;",
      `search "${qt}";`,
      "limit 1;",
    ].join(" ");

    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": auth.clientId,
        Authorization: `Bearer ${auth.token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body,
    });
    if (!res.ok) continue;

    const games = (await res.json()) as IgdbGame[];
    const match = games[0];
    if (!match?.name) continue;
    if (anchor && similarity(match.name, anchor) < 0.18) continue;

    const coverUrl = imageUrl(match.cover?.image_id, "cover_big");
    const backdropUrl = imageUrl(match.artworks?.[0]?.image_id, "screenshot_huge");
    if (coverUrl || backdropUrl) {
      return { coverUrl, backdropUrl };
    }
  }

  return null;
}

function uniqueArtQueries(rawName: string, resolvedTitle: string, cleanedTitle: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  push(resolvedTitle);
  push(cleanedTitle);
  push(rawName.trim());
  for (const c of titleCandidates(rawName)) {
    push(c);
  }
  return out.slice(0, 10);
}

export async function searchMetadataCandidates(query: string): Promise<MetadataCandidate[]> {
  const clean = query.trim();
  if (!clean) return [];
  const candidates: MetadataCandidate[] = [];
  const seen = new Set<string>();

  const auth = await getIgdbToken();
  if (auth) {
    const igdbQuery = [
      "fields name,first_release_date,cover.image_id;",
      `search "${clean.replace(/"/g, "")}";`,
      "limit 8;",
    ].join(" ");
    const res = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: {
        "Client-ID": auth.clientId,
        Authorization: `Bearer ${auth.token}`,
        Accept: "application/json",
        "Content-Type": "text/plain",
      },
      body: igdbQuery,
    });
    if (res.ok) {
      const games = (await res.json()) as IgdbGame[];
      for (const game of games) {
        if (!game.name) continue;
        const key = `igdb:${game.name.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push({
          title: game.name,
          source: "igdb",
          coverUrl: imageUrl(game.cover?.image_id, "cover_big"),
          year: game.first_release_date
            ? new Date(game.first_release_date * 1000).getUTCFullYear()
            : undefined,
        });
      }
    }
  }

  const steamHits = await searchSteamApps(clean);
  for (const hit of steamHits.slice(0, 8)) {
    const key = `steam:${hit.name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({
      title: hit.name,
      source: "steam",
      steamAppId: hit.appid,
    });
  }

  return candidates.slice(0, 12);
}

export async function enrichGameMetadata(
  rawName: string,
  options?: { candidateOffset?: number; steamAppId?: string },
): Promise<MetadataEnrichmentResult> {
  const cleanedTitle = prettyTitle(rawName);
  const candidateOffset = Math.max(0, options?.candidateOffset ?? 0);

  let appId = options?.steamAppId?.trim();
  let resolvedTitle: string | undefined;

  if (!appId) {
    const steam = await resolveSteam(rawName, candidateOffset);
    appId = steam.appId;
    resolvedTitle = steam.title;
  }

  if (appId) {
    const details = (await fetchSteamAppDetails(appId)) ?? {};
    const title =
      details.name?.trim() ||
      resolvedTitle ||
      cleanedTitle ||
      rawName.trim();

    const artQueries = uniqueArtQueries(rawName, title, cleanedTitle);
    const igdbArt = await fetchIgdbGameArt(artQueries, title);

    return {
      title,
      releaseYear: steamReleaseYear(details.release_date),
      genres: steamGenres(details),
      description:
        steamDescription(details) ||
        `${title} — imported from your library; Steam metadata is partial.`,
      coverUrl: igdbArt?.coverUrl,
      backdropUrl: igdbArt?.backdropUrl,
      provider: "steam",
      queryUsed: rawName.trim(),
      steamAppId: appId,
      steamTitle: details.name?.trim() || resolvedTitle,
    };
  }

  const fallbackTitle = cleanedTitle || rawName.trim();
  const artQueries = uniqueArtQueries(rawName, fallbackTitle, cleanedTitle);
  const igdbArt = await fetchIgdbGameArt(artQueries, fallbackTitle);

  return {
    title: fallbackTitle,
    releaseYear: undefined,
    genres: undefined,
    description: `${fallbackTitle} — no Steam store match yet.`,
    coverUrl: igdbArt?.coverUrl,
    backdropUrl: igdbArt?.backdropUrl,
    provider: "local",
    queryUsed: rawName.trim(),
    steamAppId: undefined,
    steamTitle: undefined,
  };
}

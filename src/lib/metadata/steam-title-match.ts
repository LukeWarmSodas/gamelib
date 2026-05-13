/**
 * Steam store search returns many close titles (sequels, GOTY, remasters).
 * These helpers bias matching toward the same release the library file names.
 */

export type SteamSearchHit = { appid: string; name: string };

/** Detects deluxe / bundle / remaster style listings on a Steam title. */
const EDITION_OR_REMASTER_TEST =
  /\b(complete|definitive|ultimate|deluxe|premium|gold|legendary|anniversary|remastered|remaster|enhanced|redux|directors?\s*cut|special\s+edition|collectors?\s*edition|game\s+of\s+the\s+year|\bgoty\b|bundle|trilogy|anthology|franchise\s+pack|legacy)\b/i;

const EDITION_OR_REMASTER_STRIP =
  /\b(complete|definitive|ultimate|deluxe|premium|gold|legendary|anniversary|remastered|remaster|enhanced|redux|directors?\s*cut|special\s+edition|collectors?\s*edition|game\s+of\s+the\s+year|\bgoty\b|bundle|trilogy|anthology|franchise\s+pack|legacy)\b/gi;

const DLC_OR_TOOLS_TEST =
  /\b(dlc|downloadable\s+content|expansion\s+pack|soundtrack|artbook|season\s+pass|starter\s+pack|multiplayer|beta|playtest|demo|sdk|editor|workshop|tools)\b/i;

const ROMAN_TO_CHAPTER: Record<string, string> = {
  ii: "2",
  iii: "3",
  iv: "4",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
  xi: "11",
  xii: "12",
};

function normalizeTokens(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeTokens(value)
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardWordSimilarity(a: string, b: string): number {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.length === 0 || right.length === 0) return 0;
  const ls = new Set(left);
  const rs = new Set(right);
  let inter = 0;
  for (const w of ls) {
    if (rs.has(w)) inter += 1;
  }
  const union = ls.size + rs.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function userSignalsEditionOrRemaster(rawLibraryName: string, searchCandidate: string): boolean {
  const blob = `${rawLibraryName}\n${searchCandidate}`.toLowerCase();
  return EDITION_OR_REMASTER_TEST.test(blob);
}

export function steamListingLooksEditionOrRemaster(steamName: string): boolean {
  return EDITION_OR_REMASTER_TEST.test(steamName);
}

export function steamListingLooksNonGameNoise(steamName: string): boolean {
  return DLC_OR_TOOLS_TEST.test(steamName);
}

/**
 * Pulls coarse "chapter" ids (2,3,…,12) from a title so we can avoid matching
 * a sequel when the file name has no chapter marker. Intentionally ignores
 * most two-digit numbers (sports years, etc.).
 */
export function extractInstallmentIds(title: string): Set<string> {
  const ids = new Set<string>();
  const norm = normalizeTokens(title);
  if (!norm) return ids;

  const trailingRoman = norm.match(
    /\s(ii|iii|iv|vi|vii|viii|ix|x|xi|xii)\s*$/,
  );
  if (trailingRoman) {
    const id = ROMAN_TO_CHAPTER[trailingRoman[1]];
    if (id) ids.add(id);
  }

  // Common "Grand Theft Auto V" style (token `v` is too ambiguous elsewhere; only at end).
  if (/\sv$/i.test(norm)) {
    ids.add("5");
  }

  const trailingNum = norm.match(/\s(\d{1,2})\s*$/);
  if (trailingNum) {
    const n = Number(trailingNum[1]);
    if (n >= 2 && n <= 15) ids.add(String(n));
  }

  for (const w of norm.split(/\s+/)) {
    const id = ROMAN_TO_CHAPTER[w];
    if (id) ids.add(id);
    if (/^\d$/.test(w)) {
      const n = Number(w);
      if (n >= 2 && n <= 9) ids.add(w);
    }
    if (w === "10" || w === "11" || w === "12") ids.add(w);
  }

  return ids;
}

function stripEditionWordsForCoreCompare(value: string): string {
  return normalizeTokens(value)
    .replace(EDITION_OR_REMASTER_STRIP, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function corePhraseKey(value: string): string {
  return stripEditionWordsForCoreCompare(value);
}

/**
 * Scores a Steam search hit against what the library scanner/rematcher is asking for.
 * Higher is better. Caller applies a minimum threshold.
 */
export function scoreSteamHitForLibrary(
  searchCandidate: string,
  rawLibraryName: string,
  prettyLibraryTitle: string,
  steamHitName: string,
): number {
  let score = jaccardWordSimilarity(searchCandidate, steamHitName);

  const userEdition = userSignalsEditionOrRemaster(rawLibraryName, searchCandidate);
  const steamEdition = steamListingLooksEditionOrRemaster(steamHitName);
  if (steamEdition && !userEdition) {
    score *= 0.42;
  }

  if (steamListingLooksNonGameNoise(steamHitName) && !steamListingLooksNonGameNoise(rawLibraryName)) {
    score *= 0.35;
  }

  const userChapters = new Set<string>([
    ...extractInstallmentIds(searchCandidate),
    ...extractInstallmentIds(prettyLibraryTitle),
    ...extractInstallmentIds(rawLibraryName),
  ]);
  const steamChapters = extractInstallmentIds(steamHitName);

  if (steamChapters.size > 0 && userChapters.size === 0) {
    score *= 0.22;
  } else if (steamChapters.size > 0 && userChapters.size > 0) {
    let anyOverlap = false;
    for (const c of steamChapters) {
      if (userChapters.has(c)) anyOverlap = true;
    }
    if (!anyOverlap) {
      score *= 0.3;
    }
  }

  const coreHit = corePhraseKey(steamHitName);
  const coreAsk = corePhraseKey(`${searchCandidate} ${prettyLibraryTitle}`);
  if (coreHit.length >= 4 && coreAsk.length >= 4) {
    if (coreHit === coreAsk) {
      score += 0.18;
    } else if (coreHit.startsWith(`${coreAsk} `) || coreAsk.startsWith(`${coreHit} `)) {
      score += 0.08;
    }
  }

  return Math.min(1, score);
}

export function pickBestSteamHit(
  searchCandidate: string,
  rawLibraryName: string,
  prettyLibraryTitle: string,
  hits: SteamSearchHit[],
): { hit: SteamSearchHit | null; score: number } {
  let best: SteamSearchHit | null = null;
  let bestScore = 0;
  for (const hit of hits) {
    const s = scoreSteamHitForLibrary(searchCandidate, rawLibraryName, prettyLibraryTitle, hit.name);
    if (s > bestScore) {
      bestScore = s;
      best = hit;
    }
  }
  return { hit: best, score: bestScore };
}

export function rankSteamHitsForSearch(
  searchQuery: string,
  rawLibraryName: string,
  prettyLibraryTitle: string,
  hits: SteamSearchHit[],
): SteamSearchHit[] {
  const scored = hits.map((hit) => ({
    hit,
    score: scoreSteamHitForLibrary(searchQuery, rawLibraryName, prettyLibraryTitle, hit.name),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.map((row) => row.hit);
}

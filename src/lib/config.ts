/**
 * Windows: `Z:` is not a valid directory for fs (it means “current dir on Z” in CMD).
 * Use `Z:\` or `Z:/` to scan the drive root, or `Z:\Games` for a folder.
 */
export function normalizeLibraryRoot(raw: string): string {
  const trimmed = raw.trim();
  if (process.platform === "win32" && /^[A-Za-z]:$/.test(trimmed)) {
    return `${trimmed}\\`;
  }
  return trimmed;
}

export function getConfig() {
  const isDev = process.env.NODE_ENV !== "production";
  const defaultLibraryRoot =
    process.platform === "win32" ? "Z:\\Games" : "/library/games";

  const databaseUrl = process.env.DATABASE_URL ?? (isDev ? "file:./dev.db" : undefined);
  const libraryRootRaw = process.env.LIBRARY_ROOT ?? (isDev ? defaultLibraryRoot : undefined);
  const libraryRoot = libraryRootRaw ? normalizeLibraryRoot(libraryRootRaw) : undefined;

  if (!databaseUrl) {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }
  if (!libraryRoot) {
    throw new Error("Missing required environment variable: LIBRARY_ROOT");
  }

  return {
    databaseUrl,
    libraryRoot,
    artCacheDir: process.env.ART_CACHE_DIR ?? "/app/data/artwork",
  };
}

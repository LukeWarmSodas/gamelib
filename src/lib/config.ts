export function getConfig() {
  const isDev = process.env.NODE_ENV !== "production";
  const defaultLibraryRoot =
    process.platform === "win32" ? "Z:\\Games" : "/library/games";

  const databaseUrl = process.env.DATABASE_URL ?? (isDev ? "file:./dev.db" : undefined);
  const libraryRoot = process.env.LIBRARY_ROOT ?? (isDev ? defaultLibraryRoot : undefined);

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

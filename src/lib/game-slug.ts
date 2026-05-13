/** Matches scanner slug shape so manual title edits stay unique-friendly. */
export function buildGameSlug(platform: string, title: string, relativePath: string): string {
  const relSlug = relativePath.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return `${platform}-${title}-${relSlug}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 150);
}

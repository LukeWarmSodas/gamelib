/** Match game detail / scanner grouping for multi-version rows */
export function normalizeGroupTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(deluxe|ultimate|premium|complete|edition|early access)\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

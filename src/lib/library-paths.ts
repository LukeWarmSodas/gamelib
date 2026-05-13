import path from "node:path";

/**
 * Whether `resolvedFile` lies under `resolvedRoot` (same drive / containment).
 */
export function isFilePathUnderLibraryRoot(filePath: string, libraryRoot: string): boolean {
  const root = path.resolve(libraryRoot);
  const file = path.resolve(filePath);
  if (file === root) return false;
  const rel = path.relative(root, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
  return true;
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startScheduledLibraryScan } = await import("@/lib/scheduled-scan");
  startScheduledLibraryScan();
}

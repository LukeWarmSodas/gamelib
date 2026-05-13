const DAY_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 60 * 1000;

/**
 * Runs an incremental library scan once per day while the server is up.
 * Disabled outside production or when SCAN_CRON_DISABLED=1.
 *
 * Scanner (and Prisma) are loaded only when a timer fires — not at module init —
 * so Next.js `instrumentation` hook does not pull Prisma before it is ready in dev.
 */
export function startScheduledLibraryScan() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.SCAN_CRON_DISABLED === "1") return;

  const run = () => {
    void import("@/lib/scanner")
      .then(({ runScan }) => runScan({ force: false }))
      .catch((err) => {
        console.error("[gamelib] scheduled scan failed:", err);
      });
  };

  setTimeout(run, STARTUP_DELAY_MS);
  setInterval(run, DAY_MS);
}

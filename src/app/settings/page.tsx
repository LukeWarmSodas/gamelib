import Link from "next/link";
import { prisma } from "@/lib/db";
import { RematchAllButton } from "@/components/rematch-all-button";
import { ScanButton } from "@/components/scan-button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const scan = await prisma.scanJob.findFirst({ orderBy: { startedAt: "desc" } });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-16 pt-8 md:px-8 md:pt-10">
      <Link
        href="/"
        className="group inline-flex items-center gap-2 rounded-full border border-border bg-panel-solid/80 px-4 py-2 text-sm text-muted shadow-sm shadow-black/20 transition-all hover:border-border-bright hover:bg-white/[0.05] hover:text-foreground"
      >
        <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden>
          ←
        </span>
        Library
      </Link>

      <header className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
          Settings
        </p>
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Library &amp; metadata
        </h1>
        <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-muted md:text-[15px]">
          Scan your configured library root to index files, then rematch to refresh Steam titles,
          descriptions, and artwork for existing rows.
        </p>
      </header>

      <section className="mt-10 rounded-3xl border border-border-bright bg-panel-solid/90 p-8 shadow-xl shadow-black/30 md:p-10">
        <h2 className="text-lg font-semibold text-foreground">Actions</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Scan walks <code className="rounded-md border border-border-bright bg-black/35 px-1.5 py-0.5 font-mono text-[13px]">LIBRARY_ROOT</code>{" "}
          and upserts games. Rematch re-runs Steam metadata for titles already in the database.
        </p>

        {scan ? (
          <p className="mt-4 rounded-xl border border-border bg-black/25 px-4 py-3 text-sm text-muted">
            <span className="font-medium text-foreground/90">Last scan:</span>{" "}
            <span className="capitalize">{scan.status}</span>
            {scan.completedAt ? (
              <>
                {" "}
                · finished{" "}
                {new Intl.DateTimeFormat("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(scan.completedAt)}
              </>
            ) : null}
            {" · "}
            {scan.gamesUpsert}/{scan.filesSeen} imported
            {scan.errors ? ` (${scan.errors} errors)` : ""}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-faint">No scan jobs recorded yet.</p>
        )}

        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
          <ScanButton />
          <RematchAllButton />
        </div>
      </section>
    </main>
  );
}

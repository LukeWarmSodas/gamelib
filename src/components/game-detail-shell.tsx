"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DeleteArchiveSection, type DeleteVersionRow } from "@/components/delete-archive-section";
import { GameMetadataEditor } from "@/components/game-metadata-editor";
import { ManualRemapForm } from "@/components/manual-remap-form";
import { MetadataImageChooser } from "@/components/metadata-image-chooser";
import { RematchGameButton } from "@/components/rematch-game-button";

type Tab = "overview" | "settings";

type Props = {
  gameId: string;
  manualMapTitle: string | null;
  currentTitle: string;
  initialMetadata: {
    title: string;
    description: string | null;
    releaseYear: number | null;
    genres: string | null;
  };
  deleteVersions: DeleteVersionRow[];
  overview: ReactNode;
};

export function GameDetailShell({
  gameId,
  manualMapTitle,
  currentTitle,
  initialMetadata,
  deleteVersions,
  overview,
}: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Game page sections"
        className="sticky top-0 z-30 flex flex-wrap gap-2 border-b border-border bg-panel-solid/95 px-6 py-3 backdrop-blur-md md:px-10"
      >
        {(
          [
            ["overview", "Overview"],
            ["settings", "Settings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            id={`tab-${id}`}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              tab === id
                ? "border border-accent/40 bg-accent/15 text-accent shadow-sm shadow-accent/10"
                : "border border-transparent text-muted hover:border-border-bright hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
        hidden={tab !== "overview"}
        className={tab === "overview" ? "pt-2 md:pt-4" : "hidden"}
      >
        {overview}
      </div>

      <div
        id="panel-settings"
        role="tabpanel"
        aria-labelledby="tab-settings"
        hidden={tab !== "settings"}
        className={tab === "settings" ? "mx-auto max-w-3xl space-y-6 px-6 pb-8 pt-4 md:px-10 md:pt-6" : "hidden"}
      >
        <GameMetadataEditor gameId={gameId} initial={initialMetadata} />
        <div className="rounded-2xl border border-border bg-black/25 p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-faint">
            Match and refresh from stores
          </h2>
          <p className="mt-1 text-xs text-muted">
            Re-query Steam / IGDB using your file name or manual map, or try the next ranked Steam hit.
          </p>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:flex-wrap md:items-start">
            <RematchGameButton gameId={gameId} />
          </div>
        </div>
        <ManualRemapForm gameId={gameId} initialValue={manualMapTitle} currentTitle={currentTitle} />
        <MetadataImageChooser gameId={gameId} />
        <DeleteArchiveSection currentGameId={gameId} versions={deleteVersions} />
      </div>
    </div>
  );
}

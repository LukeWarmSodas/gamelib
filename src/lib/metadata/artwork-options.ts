import { fetchSteamAppDetails, searchMetadataCandidates } from "@/lib/metadata/providers";

export type GameArtworkOption = {
  id: string;
  label: string;
  source: string;
  coverUrl?: string;
  backdropUrl?: string;
};

type GameFields = {
  title: string;
  manualMapTitle: string | null;
  steamAppId: string | null;
};

function dedupeKey(o: Pick<GameArtworkOption, "coverUrl" | "backdropUrl">) {
  return `${o.coverUrl ?? ""}|${o.backdropUrl ?? ""}`;
}

/** Collects cover/backdrop URLs from the linked Steam app and IGDB/Steam search hits. */
export async function listArtworkOptionsForGame(game: GameFields): Promise<GameArtworkOption[]> {
  const seen = new Set<string>();
  const out: GameArtworkOption[] = [];
  const push = (row: GameArtworkOption) => {
    const k = dedupeKey(row);
    if (!k.replace("|", "")) return;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ ...row, id: `${row.id}-${out.length}` });
  };

  if (game.steamAppId) {
    const d = await fetchSteamAppDetails(game.steamAppId);
    if (d) {
      const name = d.name?.trim() || "Steam";
      const capsule = d.capsule_image?.trim();
      const header = d.header_image?.trim();
      const shot = d.screenshots?.[0]?.path_full?.trim();
      if (capsule || header) {
        push({
          id: `steam-store-${game.steamAppId}`,
          label: `${name} (Steam store)`,
          source: "steam",
          coverUrl: capsule || header,
          backdropUrl: header || shot,
        });
      }
      if (shot && shot !== header) {
        push({
          id: `steam-ss0-${game.steamAppId}`,
          label: `${name} (Steam screenshot)`,
          source: "steam",
          coverUrl: shot,
          backdropUrl: header,
        });
      }
    }
  }

  const query = game.manualMapTitle?.trim() || game.title;
  const candidates = await searchMetadataCandidates(query);
  for (const c of candidates) {
    if (c.coverUrl?.trim()) {
      push({
        id: `${c.source}-${c.title}`.replace(/\s+/g, "-").replace(/[^a-z0-9-]/gi, "").slice(0, 96),
        label: `${c.title} (${c.source})`,
        source: c.source,
        coverUrl: c.coverUrl.trim(),
      });
    }
  }

  return out;
}

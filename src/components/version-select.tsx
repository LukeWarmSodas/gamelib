"use client";

import { useRouter } from "next/navigation";

type VersionOption = {
  id: string;
  steamAppId: string | null;
  relativePath: string;
  updatedAt: string;
};

type Props = {
  currentGameId: string;
  versions: VersionOption[];
};

function shortPath(value: string) {
  const parts = value.split(/[\\/]/);
  return parts.slice(-2).join("/");
}

export function VersionSelect({ currentGameId, versions }: Props) {
  const router = useRouter();

  if (versions.length <= 1) {
    return null;
  }

  return (
    <div className="min-w-0 flex-1 space-y-2 md:max-w-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-faint">
        Release version
      </p>
      <select
        value={currentGameId}
        onChange={(e) => {
          const picked = versions.find((v) => v.id === e.target.value);
          const segment = picked?.steamAppId ?? picked?.id ?? e.target.value;
          router.push(`/games/${segment}`);
        }}
        className="w-full cursor-pointer rounded-xl border border-border-bright bg-black/35 px-4 py-3 text-sm text-foreground shadow-inner shadow-black/20 outline-none ring-offset-background transition-colors hover:border-accent/30 focus:border-accent/50 focus:ring-2 focus:ring-accent/35"
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {new Date(version.updatedAt).toLocaleDateString()} - {shortPath(version.relativePath)}
          </option>
        ))}
      </select>
    </div>
  );
}

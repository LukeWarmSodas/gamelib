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
    <div className="space-y-1">
      <p className="text-xs text-muted">Version</p>
      <select
        value={currentGameId}
        onChange={(e) => {
          const picked = versions.find((v) => v.id === e.target.value);
          const segment = picked?.steamAppId ?? picked?.id ?? e.target.value;
          router.push(`/games/${segment}`);
        }}
        className="w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent"
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

"use client";

import { useState } from "react";

export function ScanButton() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onScan = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      if (!res.ok) {
        throw new Error("Scan failed");
      }
      const data = (await res.json()) as {
        filesSeen: number;
        gamesUpsert: number;
        errors: number;
      };
      setMessage(`Done: ${data.gamesUpsert}/${data.filesSeen} imported (${data.errors} errors)`);
      window.location.reload();
    } catch {
      setMessage("Scan failed. Check mounts and env config.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onScan}
        disabled={running}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {running ? "Scanning..." : "Scan Now"}
      </button>
      {message ? <p className="text-xs text-muted">{message}</p> : null}
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

type TabKey = "overview" | "settings";

type Props = {
  overview: ReactNode;
  settings: ReactNode;
};

export function GameDetailTabs({ overview, settings }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-2xl border border-border bg-black/25 p-1 shadow-inner shadow-black/20">
        {[
          { key: "overview" as const, label: "Overview" },
          { key: "settings" as const, label: "Settings" },
        ].map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-muted hover:bg-white/[0.05] hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div hidden={activeTab !== "overview"}>{overview}</div>
      <div hidden={activeTab !== "settings"}>{settings}</div>
    </div>
  );
}

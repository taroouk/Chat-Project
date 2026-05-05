"use client";

import { useEffect, useState } from "react";

type Stats = { total: number; weekCount: number; streak: number; error?: string };

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const res = await fetch("/api/stats", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as Stats;

      if (!mounted) return;

      if (!res.ok) {
        setStats({ total: 0, weekCount: 0, streak: 0, error: json.error ?? "Failed to load stats" });
        return;
      }

      setStats(json);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!stats) return null;

  if (stats.error) {
    return (
      <div className="border rounded-md p-4 text-sm text-red-500">
        {stats.error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="border rounded-md p-4">
        <div className="text-xs text-muted-foreground">Total updates</div>
        <div className="text-2xl font-bold">{stats.total}</div>
      </div>

      <div className="border rounded-md p-4">
        <div className="text-xs text-muted-foreground">Last 7 days</div>
        <div className="text-2xl font-bold">{stats.weekCount}</div>
      </div>

      <div className="border rounded-md p-4">
        <div className="text-xs text-muted-foreground">Streak</div>
        <div className="text-2xl font-bold">
          {stats.streak} <span aria-hidden>🔥</span>
        </div>
      </div>
    </div>
  );
}
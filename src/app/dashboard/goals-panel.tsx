"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type GoalRow = {
  id: string;
  title: string;
  week_start: string;
  created_at: string;
};

function mondayOfCurrentWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // how many days since Monday
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function GoalsPanel() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState(mondayOfCurrentWeek());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await fetch("/api/goals", { cache: "no-store" });
    const json = (await res.json()) as { goals?: GoalRow[]; error?: string };
    if (!res.ok) return setErr(json.error ?? "Failed to load goals");
    setGoals(json.goals ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addGoal() {
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, weekStart }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) return setErr(json.error ?? "Failed to add goal");

    setTitle("");
    await load();
  }

  async function deleteGoal(id: string) {
    setBusy(true);
    setErr(null);

    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) return setErr(json.error ?? "Failed to delete goal");
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <aside className="space-y-4">
      <div className="border rounded-md p-4 space-y-3">
        <div className="text-sm font-semibold">Weekly Goal</div>

        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="This week I will..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
        />

        <Button onClick={addGoal} disabled={busy || !title.trim()}>
          Add goal
        </Button>

        {err && <p className="text-sm text-red-500">{err}</p>}
      </div>

      <div className="space-y-2">
        {goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goals yet.</p>
        ) : (
          goals.map((g) => (
            <div key={g.id} className="border rounded-md p-3 flex justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm">{g.title}</div>
                <div className="text-xs text-muted-foreground">Week: {g.week_start}</div>
              </div>

              <Button variant="outline" onClick={() => deleteGoal(g.id)} disabled={busy}>
                Delete
              </Button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Notif = {
  id: string;
  actor_id: string;
  type: string;
  update_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: { username: string; display_name: string | null } | null;
};

export default function NotificationsPanel() {
  const [items, setItems] = useState<Notif[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const res = await fetch("/api/notifications", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as { items?: Notif[]; error?: string };

    if (!res.ok) return setErr(json.error ?? "Failed to load notifications");
    setItems(json.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAllRead() {
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    setBusy(false);
    if (!res.ok) return setErr(json.error ?? "Failed to mark read");

    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">Likes, comments, and new posts.</p>
        </div>

        <Button variant="outline" onClick={markAllRead} disabled={busy}>
          Mark all read
        </Button>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const username = n.actor?.username;
            const label = n.actor?.display_name || (username ? `@${username}` : "Someone");
            const unread = !n.read_at;

            const verb =
              n.type === "new_update" ? "posted an update" : n.type === "like" ? "liked your post" : "commented";

            return (
              <div
                key={n.id}
                className="border rounded-lg p-3 bg-background flex items-start justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="text-sm">
                    {username ? (
                      <Link className="underline font-semibold" href={`/u/${username}`}>
                        {label}
                      </Link>
                    ) : (
                      <span className="font-semibold">{label}</span>
                    )}{" "}
                    {verb}
                    {unread ? <span className="ml-2 text-xs text-red-500">• new</span> : null}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="shrink-0">
                  <Link className="text-sm underline" href="/dashboard">
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
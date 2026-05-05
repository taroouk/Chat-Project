"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type UserRow = { username: string; display_name: string | null };

type SocialMe = {
  followersCount: number;
  followingCount: number;
  following: UserRow[];
};

export default function SocialPanel() {
  const [me, setMe] = useState<SocialMe | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const followingSet = useMemo(() => {
    return new Set((me?.following ?? []).map((u) => u.username));
  }, [me]);

  async function loadMe() {
    const res = await fetch("/api/social/me", { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as SocialMe & { error?: string };

    if (!res.ok) {
      setErr(json.error ?? "Failed to load social data");
      return;
    }
    setMe(json);
  }

  async function searchUsers(nextQ: string) {
    const trimmed = nextQ.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { users?: UserRow[]; error?: string };

    if (!res.ok) {
      setErr(json.error ?? "Search failed");
      return;
    }

    setResults(json.users ?? []);
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function follow(username: string) {
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setErr(json.error ?? "Follow failed");
      return;
    }

    await loadMe();
  }

  async function unfollow(username: string) {
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/follow", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) {
      setErr(json.error ?? "Unfollow failed");
      return;
    }

    await loadMe();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main: Search */}
      <section className="lg:col-span-2 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Find people</h2>
            <p className="text-sm text-muted-foreground">
              Search by username and follow them to see their posts in your Following timeline.
            </p>
          </div>

          <div className="flex gap-3 text-sm">
            <Link className="underline" href="/timeline">
              Global
            </Link>
            <Link className="underline" href="/timeline/following">
              Following
            </Link>
          </div>
        </div>

        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="Search username (min 2 chars)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {err && <p className="text-sm text-red-500">{err}</p>}

        <div className="space-y-2">
          {results.length === 0 && q.trim().length >= 2 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : null}

          {results.map((u) => {
            const isFollowing = followingSet.has(u.username);
            const label = u.display_name || `@${u.username}`;

            return (
              <div
                key={u.username}
                className="border rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link className="text-sm font-semibold underline" href={`/u/${u.username}`}>
                    {label}
                  </Link>
                  <div className="text-xs text-muted-foreground">@{u.username}</div>
                </div>

                <Button
                  variant={isFollowing ? "outline" : "default"}
                  onClick={() => (isFollowing ? unfollow(u.username) : follow(u.username))}
                  disabled={busy}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sidebar: Counts + Following list */}
      <aside className="space-y-4">
        <section className="border rounded-md p-4 space-y-3">
          <h3 className="text-sm font-semibold">Your network</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">Followers</div>
              <div className="text-xl font-bold">{me?.followersCount ?? "-"}</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-xs text-muted-foreground">Following</div>
              <div className="text-xl font-bold">{me?.followingCount ?? "-"}</div>
            </div>
          </div>
        </section>

        <section className="border rounded-md p-4 space-y-3">
          <h3 className="text-sm font-semibold">Following</h3>

          {!me ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : me.following.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You’re not following anyone yet.
            </p>
          ) : (
            <div className="space-y-2">
              {me.following.map((u) => (
                <div
                  key={u.username}
                  className="flex items-center justify-between gap-3"
                >
                  <Link className="text-sm underline" href={`/u/${u.username}`}>
                    {u.display_name || `@${u.username}`}
                  </Link>

                  <Button
                    variant="outline"
                    onClick={() => unfollow(u.username)}
                    disabled={busy}
                  >
                    Unfollow
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
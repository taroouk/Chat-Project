"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MediaGrid from "@/components/media/media-grid";
import FollowButton from "@/components/follow-button";

type Profile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type TrendingItem = {
  id: string;
  content: string;
  created_at: string;
  media_urls: string[];
  profile: Profile;
  like_count: number;
  comment_count: number;
};

function Avatar({ url }: { url: string | null }) {
  return (
    <div className="w-10 h-10 rounded-full border overflow-hidden bg-background shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">🙂</div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="border rounded-xl bg-background p-4">{children}</div>;
}

function PostCard({ item }: { item: TrendingItem }) {
  const name = item.profile.display_name?.trim() || item.profile.username;

  return (
    <article className="border rounded-xl bg-background p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar url={item.profile.avatar_url} />
          <div className="min-w-0">
            <Link className="font-semibold underline truncate block" href={`/u/${item.profile.username}`}>
              {name}
            </Link>
            <div className="text-xs text-muted-foreground truncate">@{item.profile.username}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground shrink-0">
          {new Date(item.created_at).toLocaleString()}
        </div>
      </div>

      {item.content ? <div className="text-sm whitespace-pre-wrap">{item.content}</div> : null}

      <MediaGrid urls={item.media_urls ?? []} />

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>👍 {item.like_count}</span>
        <span>💬 {item.comment_count}</span>
      </div>
    </article>
  );
}

function UserRow({ user }: { user: Profile & { posts_7d?: number } }) {
  const name = user.display_name?.trim() || user.username;

  return (
    <div className="flex items-center justify-between gap-3 border rounded-xl bg-background p-4">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar url={user.avatar_url} />
        <div className="min-w-0">
          <Link className="font-semibold underline truncate block" href={`/u/${user.username}`}>
            {name}
          </Link>
          <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {typeof user.posts_7d === "number" ? (
          <div className="text-xs text-muted-foreground">{user.posts_7d} posts/7d</div>
        ) : null}
        <FollowButton username={user.username} />
      </div>
    </div>
  );
}

export default function DiscoverPanel() {
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [suggested, setSuggested] = useState<Array<Profile & { posts_7d?: number }>>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSearch = useMemo(() => q.trim().length >= 2, [q]);

  async function loadAll() {
    setBusy(true);
    setErr(null);

    const [tRes, sRes] = await Promise.all([
      fetch("/api/discover/trending", { cache: "no-store" }),
      fetch("/api/discover/suggested", { cache: "no-store" }),
    ]);

    const tJson = (await tRes.json().catch(() => ({}))) as { items?: TrendingItem[]; error?: string };
    const sJson = (await sRes.json().catch(() => ({}))) as { users?: any[]; error?: string };

    if (!tRes.ok) setErr(tJson.error ?? "Failed to load trending");
    if (!sRes.ok) setErr((p) => p ?? sJson.error ?? "Failed to load suggested");

    setTrending(tJson.items ?? []);
    setSuggested(sJson.users ?? []);

    setBusy(false);
  }

  async function searchUsers(nextQ: string) {
    const query = nextQ.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const res = await fetch(`/api/discover/search-users?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { users?: Profile[]; error?: string };
    if (!res.ok) {
      setErr(json.error ?? "Search failed");
      return;
    }
    setResults(json.users ?? []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      searchUsers(q);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Discover</h2>
          <p className="text-sm text-muted-foreground">
            Trending posts, suggested people, and search.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link className="text-sm underline" href="/timeline">
            Open global timeline
          </Link>
          <Button variant="outline" onClick={loadAll} disabled={busy}>
            {busy ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="space-y-3">
          <div className="text-sm font-semibold">Search people</div>
          <Input
            placeholder="Search username (min 2 chars)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {canSearch ? (
            <div className="space-y-2">
              {results.length === 0 ? (
                <div className="text-sm text-muted-foreground">No results.</div>
              ) : (
                results.map((u) => <UserRow key={u.user_id} user={u} />)
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Tip: type at least 2 characters.</div>
          )}
        </div>
      </Card>

      {/* Trending */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Trending (Top 24h)</h3>
          <p className="text-sm text-muted-foreground">Most engaging posts in the last 24 hours.</p>
        </div>

        {trending.length === 0 ? (
          <Card>
            <div className="text-sm text-muted-foreground">No trending posts yet.</div>
          </Card>
        ) : (
          <div className="space-y-3">
            {trending.map((it) => (
              <PostCard key={it.id} item={it} />
            ))}
          </div>
        )}
      </div>

      {/* Suggested */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Suggested builders</h3>
          <p className="text-sm text-muted-foreground">Active people posting recently.</p>
        </div>

        {suggested.length === 0 ? (
          <Card>
            <div className="text-sm text-muted-foreground">No suggestions yet.</div>
          </Card>
        ) : (
          <div className="space-y-2">
            {suggested.map((u) => (
              <UserRow key={u.user_id} user={u} />
            ))}
          </div>
        )}
      </div>

      {err ? <div className="text-sm text-red-500">{err}</div> : null}
    </div>
  );
}
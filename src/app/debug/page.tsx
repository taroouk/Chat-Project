"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type TestResult = {
  name: string;
  ok: boolean;
  details?: string;
};

type FeedItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { username?: string; display_name?: string | null } | null;
  like_count?: number;
  liked_by_me?: boolean;
  comment_count?: number;
};

function Row({ r }: { r: TestResult }) {
  return (
    <div className="border rounded-md p-3 flex items-start justify-between gap-3 bg-background">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{r.name}</div>
        {r.details ? (
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">{r.details}</div>
        ) : null}
      </div>
      <div className={`text-sm font-bold ${r.ok ? "text-green-600" : "text-red-600"}`}>
        {r.ok ? "✅ OK" : "❌ FAIL"}
      </div>
    </div>
  );
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null as any, text };
  }
}

export default function DebugPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [busy, setBusy] = useState(false);

  const [testUpdateId, setTestUpdateId] = useState<string | null>(null);
  const [testCommentId, setTestCommentId] = useState<string | null>(null);

  const [rtLog, setRtLog] = useState<string[]>([]);

  function pushResult(r: TestResult) {
    setResults((prev) => [...prev, r]);
  }

  function pushRt(s: string) {
    setRtLog((prev) => [s, ...prev].slice(0, 10));
  }

  // Auth check
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setAuthed(false);
        router.replace("/login");
        return;
      }
      setAuthed(true);
    })();
  }, [router, supabase]);

  // Realtime listeners (optional but useful)
  useEffect(() => {
    if (authed !== true) return;

    let likesCh: any = null;
    let commentsCh: any = null;
    let notifCh: any = null;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const meId = data.user?.id;
      if (!meId) return;

      likesCh = supabase
        .channel("debug:likes")
        .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, (p: any) => {
          pushRt(`likes ${p.eventType} update_id=${p.new?.update_id ?? p.old?.update_id ?? "?"}`);
        })
        .subscribe();

      commentsCh = supabase
        .channel("debug:comments")
        .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (p: any) => {
          pushRt(
            `comments ${p.eventType} update_id=${p.new?.update_id ?? p.old?.update_id ?? "?"}`,
          );
        })
        .subscribe();

      notifCh = supabase
        .channel("debug:notif")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${meId}`,
          },
          (p: any) => {
            pushRt(`notifications ${p.eventType} type=${p.new?.type ?? p.old?.type ?? "?"}`);
          },
        )
        .subscribe();
    })();

    return () => {
      if (likesCh) supabase.removeChannel(likesCh);
      if (commentsCh) supabase.removeChannel(commentsCh);
      if (notifCh) supabase.removeChannel(notifCh);
    };
  }, [authed, supabase]);

  async function runSmoke() {
    setBusy(true);
    setResults([]);
    setTestUpdateId(null);
    setTestCommentId(null);

    try {
      // 1) social/me
      {
        const res = await fetch("/api/social/me", { cache: "no-store" });
        const { json, text } = await safeJson(res);
        pushResult({
          name: "GET /api/social/me",
          ok: res.ok && typeof json?.followingCount !== "undefined",
          details: res.ok ? `followers=${json.followersCount} following=${json.followingCount}` : text,
        });
      }

      // 2) notifications unread count
      {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        const { json, text } = await safeJson(res);
        pushResult({
          name: "GET /api/notifications/unread-count",
          ok: res.ok && typeof json?.unread === "number",
          details: res.ok ? `unread=${json.unread}` : text,
        });
      }

      // 3) feed2 global
      let firstGlobal: FeedItem | null = null;
      {
        const res = await fetch("/api/feed2?mode=global&limit=3", { cache: "no-store" });
        const { json, text } = await safeJson(res);
        firstGlobal = (json?.items?.[0] as FeedItem) ?? null;

        pushResult({
          name: "GET /api/feed2?mode=global",
          ok: res.ok && Array.isArray(json?.items),
          details: res.ok ? `items=${json.items.length}` : text,
        });
      }

      // 4) feed2 following
      {
        const res = await fetch("/api/feed2?mode=following&limit=3", { cache: "no-store" });
        const { json, text } = await safeJson(res);
        pushResult({
          name: "GET /api/feed2?mode=following",
          ok: res.ok && Array.isArray(json?.items),
          details: res.ok ? `items=${json.items.length}` : text,
        });
      }

      // 5) Create test update (POST /api/updates)
      let createdUpdateId: string | null = null;
      {
        const res = await fetch("/api/updates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: `SMOKE TEST ✅ ${new Date().toISOString()}` }),
        });
        const { json, text } = await safeJson(res);

        // We don't get id back in your current API; so we fetch it from feed
        pushResult({
          name: "POST /api/updates (create)",
          ok: res.ok,
          details: res.ok ? "created" : (json?.error ?? text),
        });

        if (res.ok) {
          const feed = await fetch("/api/feed2?mode=following&limit=5", { cache: "no-store" });
          const { json: feedJson } = await safeJson(feed);
          const mine = (feedJson?.items?.find((x: any) =>
            String(x?.content ?? "").includes("SMOKE TEST ✅"),
          ) ?? null) as FeedItem | null;

          if (mine?.id) {
            createdUpdateId = mine.id;
            setTestUpdateId(mine.id);
            pushResult({
              name: "Locate created update in feed",
              ok: true,
              details: `updateId=${mine.id}`,
            });
          } else {
            pushResult({
              name: "Locate created update in feed",
              ok: false,
              details: "Could not find the created update in /api/feed2 (following).",
            });
          }
        }
      }

      // 6) Like/unlike test on created update (if found)
      if (createdUpdateId) {
        const updateId = createdUpdateId;

        // Like
        {
          const res = await fetch("/api/likes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updateId }),
          });
          const { json, text } = await safeJson(res);
          pushResult({
            name: "POST /api/likes (like)",
            ok: res.ok,
            details: res.ok ? "liked" : (json?.error ?? text),
          });
        }

        // Unlike
        {
          const res = await fetch("/api/likes", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updateId }),
          });
          const { json, text } = await safeJson(res);
          pushResult({
            name: "DELETE /api/likes (unlike)",
            ok: res.ok,
            details: res.ok ? "unliked" : (json?.error ?? text),
          });
        }

        // 7) Comment create + fetch + delete
        {
          const res = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updateId, content: "Smoke test comment ✅" }),
          });
          const { json, text } = await safeJson(res);
          pushResult({
            name: "POST /api/comments (create)",
            ok: res.ok,
            details: res.ok ? "commented" : (json?.error ?? text),
          });

          // Fetch comments & find it
          const listRes = await fetch(`/api/comments?updateId=${encodeURIComponent(updateId)}`, {
            cache: "no-store",
          });
          const { json: listJson, text: listText } = await safeJson(listRes);

          const found = (listJson?.items ?? []).find((c: any) =>
            String(c?.content ?? "").includes("Smoke test comment ✅"),
          );

          if (listRes.ok && found?.id) {
            setTestCommentId(found.id);
            pushResult({
              name: "GET /api/comments (verify created comment)",
              ok: true,
              details: `commentId=${found.id}`,
            });

            const delRes = await fetch(`/api/comments/${found.id}`, { method: "DELETE" });
            const { json: delJson, text: delText } = await safeJson(delRes);
            pushResult({
              name: "DELETE /api/comments/[id]",
              ok: delRes.ok,
              details: delRes.ok ? "deleted" : (delJson?.error ?? delText),
            });
          } else {
            pushResult({
              name: "GET /api/comments (verify created comment)",
              ok: false,
              details: listRes.ok ? "comment not found in list" : listText,
            });
          }
        }
      } else {
        pushResult({
          name: "Like/Comment tests skipped",
          ok: false,
          details: "No test update id found (feed did not return it).",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  if (authed === null) return null;

  return (
    <main className="min-h-screen p-10 max-w-3xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Smoke Test</h1>
          <p className="text-sm text-muted-foreground">
            Verifies: feed, social, likes, comments, notifications, realtime hooks.
          </p>
        </div>
        <div className="flex gap-3">
          <Link className="underline text-sm" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <Button onClick={runSmoke} disabled={busy}>
          {busy ? "Running..." : "Run smoke test"}
        </Button>

        {testUpdateId ? (
          <span className="text-xs text-muted-foreground">
            testUpdateId: <code>{testUpdateId}</code>
          </span>
        ) : null}
        {testCommentId ? (
          <span className="text-xs text-muted-foreground">
            testCommentId: <code>{testCommentId}</code>
          </span>
        ) : null}
      </div>

      <section className="space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Click “Run smoke test”. It will create a test post + like/unlike + comment/delete.
          </p>
        ) : (
          results.map((r, i) => <Row key={i} r={r} />)
        )}
      </section>

      <section className="border rounded-md p-4 space-y-2 bg-background">
        <div className="text-sm font-semibold">Realtime log (last 10 events)</div>
        {rtLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No realtime events yet. Run test / like / comment to see events here.
          </p>
        ) : (
          <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
            {rtLog.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
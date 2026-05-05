"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type CommentRow = {
  id: string;
  update_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: { username: string; display_name: string | null } | null;
};

export default function CommentsPanel({
  updateId,
  onCountChange,
}: {
  updateId: string;
  onCountChange?: (delta: number) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [items, setItems] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/comments?updateId=${encodeURIComponent(updateId)}`, {
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as { items?: CommentRow[] };
    setItems(json.items ?? []);
  }

  useEffect(() => {
    load();

    // realtime: comments changes for this update
    const ch = supabase
      .channel(`comments:${updateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `update_id=eq.${updateId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateId]);

  async function add() {
    const content = text.trim();
    if (!content) return;

    setBusy(true);
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateId, content }),
    });
    setBusy(false);

    setText("");
    onCountChange?.(+1);
    load();
  }

  async function del(id: string) {
    setBusy(true);
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setBusy(false);

    onCountChange?.(-1);
    load();
  }

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/10">
      <div className="space-y-2">
        <textarea
          className="w-full border rounded-md px-3 py-2 bg-background min-h-[70px]"
          placeholder="Write a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button onClick={add} disabled={busy || !text.trim()}>
          Comment
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((c) => {
            const u = c.profile?.username;
            const label = c.profile?.display_name || (u ? `@${u}` : "User");
            return (
              <div key={c.id} className="border rounded-md p-2 bg-background">
                <div className="flex items-center justify-between gap-2">
                  {u ? (
                    <Link className="text-sm font-semibold underline" href={`/u/${u}`}>
                      {label}
                    </Link>
                  ) : (
                    <div className="text-sm font-semibold">{label}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="text-sm whitespace-pre-wrap mt-1">{c.content}</div>

                <div className="mt-2">
                  <Button variant="outline" onClick={() => del(c.id)} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
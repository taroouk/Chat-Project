"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type UpdateRow = {
  id: string;
  content: string;
  created_at: string;
};

export default function UpdatesPanel() {
  const [updates, setUpdates] = useState<UpdateRow[]>([]);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const updatesById = useMemo(() => {
    const m = new Map<string, UpdateRow>();
    updates.forEach((u) => m.set(u.id, u));
    return m;
  }, [updates]);

  async function load() {
    setErr(null);
    const res = await fetch("/api/updates", { cache: "no-store" });
    const json = (await res.json()) as { updates?: UpdateRow[]; error?: string };

    if (!res.ok) {
      setErr(json.error ?? "Failed to load updates");
      return;
    }

    // filter أي صف ناقص id عشان مايكسرش delete/edit
    setUpdates((json.updates ?? []).filter((u) => !!u.id));
  }

  useEffect(() => {
    load();
  }, []);

  async function addUpdate() {
    setBusy(true);
    setErr(null);

    const res = await fetch("/api/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };

    setBusy(false);

    if (!res.ok) {
      setErr(json.error ?? "Failed to add update");
      return;
    }

    setContent("");
    await load();
  }

  function startEdit(id: string) {
    const row = updatesById.get(id);
    if (!row) return;
    setEditingId(id);
    setEditingContent(row.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingContent("");
  }

  async function saveEdit() {
    if (!editingId) return;
    const next = editingContent.trim();
    if (!next) {
      setErr("Content is required");
      return;
    }

    setBusy(true);
    setErr(null);

    const res = await fetch(`/api/updates/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: next }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };

    setBusy(false);

    if (!res.ok) {
      setErr(json.error ?? "Failed to update");
      return;
    }

    setUpdates((prev) =>
      prev.map((u) => (u.id === editingId ? { ...u, content: next } : u)),
    );
    cancelEdit();
  }

  async function deleteUpdate(id: string) {
    if (!id) {
      setErr('Invalid row id (got "undefined")');
      return;
    }

    setBusy(true);
    setErr(null);

    const res = await fetch(`/api/updates/${id}`, { method: "DELETE" });
    const json = (await res.json().catch(() => ({}))) as { error?: string };

    setBusy(false);

    if (!res.ok) {
      setErr(json.error ?? "Failed to delete update");
      return;
    }

    setUpdates((prev) => prev.filter((u) => u.id !== id));
    if (editingId === id) cancelEdit();
  }

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <textarea
          className="w-full border rounded-md px-3 py-2 bg-background min-h-[100px]"
          placeholder="What did you build today?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <Button onClick={addUpdate} disabled={busy || !content.trim()}>
          {busy ? "Working..." : "Add update"}
        </Button>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="space-y-2">
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          updates.map((u) => {
            const isEditing = editingId === u.id;

            return (
              <div
                key={u.id}
                className="border rounded-md p-3 flex items-start justify-between gap-3"
              >
                <div className="space-y-2 w-full">
                  {isEditing ? (
                    <textarea
                      className="w-full border rounded-md px-3 py-2 bg-background min-h-[90px]"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                    />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{u.content}</div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}
                  </div>

                  {isEditing && (
                    <div className="flex gap-2">
                      <Button onClick={saveEdit} disabled={busy}>
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEdit} disabled={busy}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {!isEditing && (
                    <Button variant="outline" onClick={() => startEdit(u.id)} disabled={busy}>
                      Edit
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => deleteUpdate(u.id)} disabled={busy}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
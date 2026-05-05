"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import AvatarUploader from "@/components/media/avatar-uploader";
import { uploadAvatarToMediaBucket } from "@/lib/media/upload";

type Profile = {
  username: string;
  display_name: string | null;
  is_public: boolean;
  avatar_url?: string | null;
};

export default function ProfileSettings() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const publicUrl = useMemo(() => {
    if (!username) return null;
    return `${location.origin}/u/${username}`;
  }, [username]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as { profile?: Profile | null; error?: string };
      if (!res.ok) return setMsg(json.error ?? "Failed to load profile");

      if (json.profile) {
        setUsername(json.profile.username);
        setDisplayName(json.profile.display_name ?? "");
        setIsPublic(json.profile.is_public);
        setAvatarUrl(json.profile.avatar_url ?? null);
      }
    })();
  }, []);

  async function save(extra?: Partial<{ avatar_url: string | null }>) {
    setBusy(true);
    setMsg(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, isPublic, ...(extra ?? {}) }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);

    if (!res.ok) return setMsg(json.error ?? "Failed to save");
    setMsg("✅ Saved");
  }

  async function onAvatarPick(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const up = await uploadAvatarToMediaBucket(file);
      setAvatarUrl(up.publicUrl);
      await save({ avatar_url: up.publicUrl });
      setMsg("✅ Avatar updated");
    } catch (e: any) {
      setMsg(e?.message ?? "Avatar upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeAvatar() {
    setAvatarUrl(null);
    await save({ avatar_url: null });
  }

  return (
    <section className="border rounded-md p-4 space-y-4">
      <div className="text-sm font-semibold">Profile Settings</div>

      <AvatarUploader disabled={busy} value={avatarUrl} onPick={onAvatarPick} onRemove={removeAvatar} />

      <div className="grid gap-3">
        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="username (3-20, letters/numbers/_)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          Public profile
        </label>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={() => save()} disabled={busy || !username.trim()}>
            {busy ? "Saving..." : "Save"}
          </Button>

          {publicUrl && isPublic ? (
            <a className="text-sm underline" href={publicUrl} target="_blank" rel="noreferrer">
              Open public page
            </a>
          ) : null}
        </div>
      </div>

      {msg ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg}</p> : null}
    </section>
  );
}
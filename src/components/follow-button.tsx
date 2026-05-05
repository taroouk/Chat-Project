"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function FollowButton({ username }: { username: string }) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/follow/status?username=${encodeURIComponent(username)}`, {
      cache: "no-store",
    });
    if (!res.ok) return setFollowing(null);
    const json = (await res.json()) as { following: boolean };
    setFollowing(json.following);
  }

  useEffect(() => {
    load();
  }, [username]);

  async function toggle() {
    if (following === null) return;
    setBusy(true);

    const res = await fetch("/api/follow", {
      method: following ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    setBusy(false);
    if (!res.ok) return;
    setFollowing(!following);
  }

  if (following === null) return null;

  return (
    <Button variant={following ? "outline" : "default"} onClick={toggle} disabled={busy}>
      {busy ? "..." : following ? "Following" : "Follow"}
    </Button>
  );
}
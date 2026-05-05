"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import CommentsPanel from "./comments-panel";
import { uploadImagesToMediaBucket } from "@/lib/media/upload";
import ImagePicker from "@/components/media/image-picker";
import MediaGrid from "@/components/media/media-grid";

type FeedItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_urls: string[];
  profile: { username: string; display_name: string | null; avatar_url?: string | null } | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
};

type Mode = "following" | "global";
type Sort = "latest" | "top24h";
type SocialMe = { following: Array<{ username: string; display_name: string | null }> };
type MyProfile = { username: string } | null;

function SkeletonCard() {
  return (
    <div className="border rounded-lg p-4 bg-background space-y-3 animate-pulse">
      <div className="h-4 w-40 bg-muted rounded" />
      <div className="h-3 w-full bg-muted rounded" />
      <div className="h-3 w-5/6 bg-muted rounded" />
      <div className="h-40 w-full bg-muted rounded" />
    </div>
  );
}

export default function HomeFeed() {
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("following");
  const [sort, setSort] = useState<Sort>("latest");

  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  const [loadingFirst, setLoadingFirst] = useState(true);
  const [busyMore, setBusyMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);

  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [pickedPreviews, setPickedPreviews] = useState<string[]>([]);

  const [social, setSocial] = useState<SocialMe | null>(null);
  const [myProfile, setMyProfile] = useState<MyProfile>(null);

  const [followBusy, setFollowBusy] = useState<string | null>(null);
  const [likeBusy, setLikeBusy] = useState<string | null>(null);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  const seenIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const followingSet = useMemo(
    () => new Set((social?.following ?? []).map((u) => u.username)),
    [social],
  );

  async function loadSocial() {
    const [meRes, profRes] = await Promise.all([
      fetch("/api/social/me", { cache: "no-store" }),
      fetch("/api/profile", { cache: "no-store" }),
    ]);

    if (meRes.ok) setSocial((await meRes.json()) as SocialMe);

    if (profRes.ok) {
      const json = (await profRes.json().catch(() => ({}))) as { profile?: { username: string } | null };
      setMyProfile(json.profile ?? null);
    }
  }

  function resetFeedState() {
    seenIdsRef.current = new Set();
    setItems([]);
    setCursor(null);
  }

  function mergeDedup(nextItems: FeedItem[], reset: boolean) {
    const seen = seenIdsRef.current;
    const out: FeedItem[] = reset ? [] : [...items];
    if (reset) seen.clear();

    for (const it of nextItems) {
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(it);
    }
    setItems(out);
  }

  async function loadFeed(reset = false) {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (reset) setLoadingFirst(true);
    else setBusyMore(true);

    setErr(null);

    const qs = new URLSearchParams();
    qs.set("mode", mode);
    qs.set("sort", sort);
    qs.set("limit", "15");
    if (!reset && cursor) qs.set("cursor", cursor);

    const res = await fetch(`/api/feed2?${qs.toString()}`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      items?: FeedItem[];
      nextCursor?: string | null;
      error?: string;
    };

    if (!res.ok) {
      setErr(json.error ?? "Failed to load feed");
      setLoadingFirst(false);
      setBusyMore(false);
      inFlightRef.current = false;
      return;
    }

    const nextItems = (json.items ?? []).map((x) => ({
      ...x,
      media_urls: Array.isArray((x as any).media_urls) ? (x as any).media_urls : [],
    })) as FeedItem[];

    setCursor(json.nextCursor ?? null);
    mergeDedup(nextItems, reset);

    setLoadingFirst(false);
    setBusyMore(false);
    inFlightRef.current = false;
  }

  useEffect(() => {
    loadSocial();
  }, []);

  useEffect(() => {
    resetFeedState();
    loadFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sort]);

  // realtime counts (lightweight)
  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map((x) => x.id);

    const likesCh = supabase
      .channel("rt:likes")
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, (p: any) => {
        const row = p.new ?? p.old;
        const updateId = row?.update_id;
        if (!updateId || !ids.includes(updateId)) return;

        setItems((prev) =>
          prev.map((x) =>
            x.id !== updateId
              ? x
              : {
                  ...x,
                  like_count:
                    p.eventType === "INSERT"
                      ? x.like_count + 1
                      : p.eventType === "DELETE"
                        ? Math.max(0, x.like_count - 1)
                        : x.like_count,
                },
          ),
        );
      })
      .subscribe();

    const commentsCh = supabase
      .channel("rt:comments")
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (p: any) => {
        const row = p.new ?? p.old;
        const updateId = row?.update_id;
        if (!updateId || !ids.includes(updateId)) return;

        setItems((prev) =>
          prev.map((x) =>
            x.id !== updateId
              ? x
              : {
                  ...x,
                  comment_count:
                    p.eventType === "INSERT"
                      ? x.comment_count + 1
                      : p.eventType === "DELETE"
                        ? Math.max(0, x.comment_count - 1)
                        : x.comment_count,
                },
          ),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(likesCh);
      supabase.removeChannel(commentsCh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((x) => x.id).join("|")]);

  function onPick(files: File[]) {
    setPickedFiles(files);
    setPickedPreviews(files.map((f) => URL.createObjectURL(f)));
  }

  function removeAt(i: number) {
    const nextFiles = pickedFiles.filter((_, idx) => idx !== i);
    const nextPrev = pickedPreviews.filter((_, idx) => idx !== i);
    setPickedFiles(nextFiles);
    setPickedPreviews(nextPrev);
  }

  function clearPicked() {
    setPickedFiles([]);
    setPickedPreviews([]);
  }

  async function postUpdate() {
    const content = postText.trim();
    if (!content && pickedFiles.length === 0) return;

    setPosting(true);
    setErr(null);

    try {
      let mediaUrls: string[] = [];
      if (pickedFiles.length) {
        const uploaded = await uploadImagesToMediaBucket(pickedFiles);
        mediaUrls = uploaded.map((u) => u.publicUrl);
      }

      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mediaUrls }),
      });

      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to post");

      setPostText("");
      clearPicked();
      resetFeedState();
      await loadFeed(true);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to post");
    } finally {
      setPosting(false);
    }
  }

  async function toggleFollow(username: string) {
    if (!username || followBusy) return;

    const isFollowing = followingSet.has(username);
    setFollowBusy(username);
    setErr(null);

    const res = await fetch("/api/follow", {
      method: isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setFollowBusy(null);

    if (!res.ok) return setErr(json.error ?? "Follow failed");
    await loadSocial();
  }

  async function toggleLike(updateId: string) {
    const item = items.find((x) => x.id === updateId);
    if (!item || likeBusy) return;

    setLikeBusy(updateId);
    setErr(null);

    // optimistic
    setItems((prev) =>
      prev.map((x) =>
        x.id !== updateId
          ? x
          : {
              ...x,
              liked_by_me: !x.liked_by_me,
              like_count: x.liked_by_me ? Math.max(0, x.like_count - 1) : x.like_count + 1,
            },
      ),
    );

    const res = await fetch("/api/likes", {
      method: item.liked_by_me ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateId }),
    });

    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setLikeBusy(null);

    if (!res.ok) {
      setItems((prev) => prev.map((x) => (x.id === updateId ? item : x)));
      setErr(json.error ?? "Like failed");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{mode === "following" ? "Home" : "Global"}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant={mode === "following" ? "default" : "outline"} onClick={() => setMode("following")} disabled={posting}>
            Following
          </Button>
          <Button variant={mode === "global" ? "default" : "outline"} onClick={() => setMode("global")} disabled={posting}>
            Global
          </Button>
          <Button variant={sort === "latest" ? "default" : "outline"} onClick={() => setSort("latest")} disabled={posting}>
            Latest
          </Button>
          <Button variant={sort === "top24h" ? "default" : "outline"} onClick={() => setSort("top24h")} disabled={posting}>
            Top 24h
          </Button>
        </div>
      </div>

      {/* Composer */}
      <div className="border rounded-lg bg-background p-4 space-y-4">
        <div className="text-sm font-semibold">Create post</div>

        <textarea
          className="w-full border rounded-md px-3 py-2 bg-background min-h-[100px]"
          placeholder="What’s on your mind?"
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
        />

        <ImagePicker
          disabled={posting}
          files={pickedFiles}
          previews={pickedPreviews}
          onPick={onPick}
          onRemoveAt={removeAt}
          onClear={clearPicked}
        />

        <div className="flex items-center justify-end">
          <Button onClick={postUpdate} disabled={posting || (!postText.trim() && pickedFiles.length === 0)}>
            {posting ? "Posting..." : "Post"}
          </Button>
        </div>

        {err ? <p className="text-sm text-red-500">{err}</p> : null}
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {loadingFirst ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        ) : (
          items.map((it) => {
            const username = it.profile?.username ?? "";
            const name = it.profile?.display_name || (username ? `@${username}` : "User");
            const avatar = it.profile?.avatar_url ?? null;

            const isMe = !!myProfile?.username && username === myProfile.username;
            const canShowFollow = mode === "global" && username && !isMe;
            const isFollowing = username ? followingSet.has(username) : false;

            return (
              <article key={it.id} className="border rounded-lg p-4 space-y-3 bg-background">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full border overflow-hidden bg-background shrink-0">
                      {avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">🙂</div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {username ? (
                        <Link className="text-sm font-semibold underline" href={`/u/${username}`}>
                          {name}
                        </Link>
                      ) : (
                        <div className="text-sm font-semibold">{name}</div>
                      )}
                      {username ? <div className="text-xs text-muted-foreground">@{username}</div> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-xs text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
                    {canShowFollow ? (
                      <Button
                        variant={isFollowing ? "outline" : "default"}
                        onClick={() => toggleFollow(username)}
                        disabled={followBusy === username}
                      >
                        {followBusy === username ? "..." : isFollowing ? "Following" : "Follow"}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {it.content ? <div className="text-sm whitespace-pre-wrap">{it.content}</div> : null}

                <MediaGrid urls={it.media_urls ?? []} />

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    variant={it.liked_by_me ? "default" : "outline"}
                    onClick={() => toggleLike(it.id)}
                    disabled={likeBusy === it.id}
                  >
                    {likeBusy === it.id ? "..." : it.liked_by_me ? "Liked" : "Like"}
                  </Button>

                  <div className="text-sm text-muted-foreground">{it.like_count} likes</div>

                  <Button variant="outline" onClick={() => setOpenComments((p) => ({ ...p, [it.id]: !p[it.id] }))}>
                    Comments ({it.comment_count})
                  </Button>
                </div>

                {openComments[it.id] ? (
                  <CommentsPanel
                    updateId={it.id}
                    onCountChange={(delta) => {
                      setItems((prev) =>
                        prev.map((x) =>
                          x.id === it.id ? { ...x, comment_count: Math.max(0, x.comment_count + delta) } : x,
                        ),
                      );
                    }}
                  />
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <div className="flex justify-center">
        <Button onClick={() => loadFeed(false)} disabled={busyMore || !cursor}>
          {busyMore ? "Loading..." : cursor ? "Load more" : "No more"}
        </Button>
      </div>
    </div>
  );
}
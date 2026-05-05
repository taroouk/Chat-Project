// src/app/api/feed2/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") ?? "following") as "global" | "following";
  const sort = (searchParams.get("sort") ?? "latest") as "latest" | "top24h";
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? 15), 50);

  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user?.id ?? null;

  let ids: string[] | null = null;

  if (mode === "following") {
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: follows, error: fErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", me);

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    ids = Array.from(new Set([me, ...(follows ?? []).map((f) => f.following_id)]));
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let q = supabasePublic
    .from("updates")
    .select("id, user_id, content, created_at, media_urls")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ids) q = q.in("user_id", ids);
  if (cursor) q = q.lt("created_at", cursor);
  if (sort === "top24h") q = q.gte("created_at", since24h);

  const { data: updates, error: uErr } = await q;
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const updateIds = Array.from(new Set((updates ?? []).map((u) => u.id)));
  const userIds = Array.from(new Set((updates ?? []).map((u) => u.user_id)));

  const { data: profiles, error: pErr } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, is_public")
    .in("user_id", userIds)
    .eq("is_public", true);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const { data: likeRows, error: lErr } = await supabasePublic
    .from("likes")
    .select("update_id, user_id")
    .in("update_id", updateIds);

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  const likeCountByUpdate = new Map<string, number>();
  const likedByMeSet = new Set<string>();

  for (const r of likeRows ?? []) {
    likeCountByUpdate.set(r.update_id, (likeCountByUpdate.get(r.update_id) ?? 0) + 1);
    if (me && r.user_id === me) likedByMeSet.add(r.update_id);
  }

  const { data: commentRows, error: cErr } = await supabasePublic
    .from("comments")
    .select("update_id")
    .in("update_id", updateIds);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const commentCountByUpdate = new Map<string, number>();
  for (const r of commentRows ?? []) {
    commentCountByUpdate.set(r.update_id, (commentCountByUpdate.get(r.update_id) ?? 0) + 1);
  }

  const items = (updates ?? [])
    .map((u) => {
      const profile = profileById.get(u.user_id) ?? null;
      return {
        ...u,
        media_urls: Array.isArray((u as any).media_urls) ? (u as any).media_urls : [],
        profile,
        like_count: likeCountByUpdate.get(u.id) ?? 0,
        liked_by_me: likedByMeSet.has(u.id),
        comment_count: commentCountByUpdate.get(u.id) ?? 0,
      };
    })
    .filter((x) => x.profile);

  if (sort === "top24h") {
    const score = (x: any) => (x.like_count ?? 0) + 2 * (x.comment_count ?? 0);
    items.sort((a: any, b: any) => score(b) - score(a));
  }

  const nextCursor = items.length ? items[items.length - 1].created_at : null;
  return NextResponse.json({ items, nextCursor });
}
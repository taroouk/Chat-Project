import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const me = userRes.user?.id ?? null;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: updates, error: uErr } = await supabasePublic
    .from("updates")
    .select("id, user_id, content, created_at, media_urls")
    .eq("is_public", true)
    .gte("created_at", since24h)
    .order("created_at", { ascending: false })
    .limit(20);

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

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const r of likeRows ?? []) {
    likeCount.set(r.update_id, (likeCount.get(r.update_id) ?? 0) + 1);
    if (me && r.user_id === me) likedByMe.add(r.update_id);
  }

  const { data: commentRows, error: cErr } = await supabasePublic
    .from("comments")
    .select("update_id")
    .in("update_id", updateIds);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const commentCount = new Map<string, number>();
  for (const r of commentRows ?? []) {
    commentCount.set(r.update_id, (commentCount.get(r.update_id) ?? 0) + 1);
  }

  const items = (updates ?? [])
    .map((u) => {
      const profile = profileById.get(u.user_id) ?? null;
      return {
        ...u,
        media_urls: Array.isArray((u as any).media_urls) ? (u as any).media_urls : [],
        profile,
        like_count: likeCount.get(u.id) ?? 0,
        comment_count: commentCount.get(u.id) ?? 0,
        liked_by_me: likedByMe.has(u.id),
      };
    })
    .filter((x) => x.profile);

  // ranking: likes + 2*comments
  const score = (x: any) => (x.like_count ?? 0) + 2 * (x.comment_count ?? 0);
  items.sort((a: any, b: any) => score(b) - score(a));

  return NextResponse.json({ items: items.slice(0, 8) });
}
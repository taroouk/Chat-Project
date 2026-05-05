import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = userRes.user.id;

  const { data: follows, error: fErr } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", me);

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  const ids = Array.from(new Set([me, ...(follows ?? []).map((f) => f.following_id)]));

  const { data: updates, error: uErr } = await supabasePublic
    .from("updates")
    .select("id, user_id, content, created_at")
    .eq("is_public", true)
    .in("user_id", ids)
    .order("created_at", { ascending: false })
    .limit(50);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  const userIds = Array.from(new Set((updates ?? []).map((u) => u.user_id)));

  const { data: profiles, error: pErr } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, is_public")
    .in("user_id", userIds)
    .eq("is_public", true);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const profileById = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const items = (updates ?? [])
    .map((u) => ({ ...u, profile: profileById.get(u.user_id) ?? null }))
    .filter((x) => x.profile);

  return NextResponse.json({ items });
}
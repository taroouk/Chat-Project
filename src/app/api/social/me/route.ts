import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = userRes.user.id;

  const { data: followingRows, error: fErr } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", me);

  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });

  const { count: followersCount, error: fcErr } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", me);

  if (fcErr) return NextResponse.json({ error: fcErr.message }, { status: 500 });

  const { count: followingCount, error: fgErr } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", me);

  if (fgErr) return NextResponse.json({ error: fgErr.message }, { status: 500 });

  const ids = (followingRows ?? []).map((r) => r.following_id);

  const { data: profiles } = ids.length
    ? await supabasePublic
        .from("profiles")
        .select("user_id, username, display_name, is_public")
        .in("user_id", ids)
        .eq("is_public", true)
    : { data: [] as any[] };

  const following = (profiles ?? [])
    .map((p) => ({ username: p.username, display_name: p.display_name }))
    .sort((a, b) => a.username.localeCompare(b.username));

  return NextResponse.json({
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
    following,
  });
}
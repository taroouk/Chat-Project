import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recent, error: rErr } = await supabasePublic
    .from("updates")
    .select("user_id")
    .eq("is_public", true)
    .gte("created_at", since7d);

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const counts = new Map<string, number>();
  for (const row of recent ?? []) {
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }

  const topIds = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  if (topIds.length === 0) return NextResponse.json({ users: [] });

  const { data: profiles, error: pErr } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, is_public")
    .in("user_id", topIds)
    .eq("is_public", true);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const users = (profiles ?? [])
    .map((p) => ({ ...p, posts_7d: counts.get(p.user_id) ?? 0 }))
    .sort((a, b) => (b.posts_7d ?? 0) - (a.posts_7d ?? 0));

  return NextResponse.json({ users });
}
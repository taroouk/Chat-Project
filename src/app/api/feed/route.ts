import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET() {
  const { data: updates, error: uErr } = await supabasePublic
    .from("updates")
    .select("id, user_id, content, created_at")
    .eq("is_public", true)
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
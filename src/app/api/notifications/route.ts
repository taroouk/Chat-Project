import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notifications")
    .select("id, actor_id, type, update_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actorIds = Array.from(new Set((data ?? []).map((n) => n.actor_id)));
  const { data: actors } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, is_public")
    .in("user_id", actorIds)
    .eq("is_public", true);

  const actorById = new Map((actors ?? []).map((a) => [a.user_id, a]));
  const items = (data ?? []).map((n) => ({ ...n, actor: actorById.get(n.actor_id) ?? null }));

  return NextResponse.json({ items });
}
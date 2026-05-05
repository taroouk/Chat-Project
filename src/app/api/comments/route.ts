import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const updateId = searchParams.get("updateId")?.trim();

  if (!updateId || !isUuid(updateId)) {
    return NextResponse.json({ error: "Invalid updateId" }, { status: 400 });
  }

  const { data: rows, error } = await supabasePublic
    .from("comments")
    .select("id, update_id, user_id, content, created_at")
    .eq("update_id", updateId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userIds = Array.from(new Set((rows ?? []).map((c) => c.user_id)));
  const { data: profiles } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, is_public")
    .in("user_id", userIds)
    .eq("is_public", true);

  const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const items = (rows ?? []).map((c) => ({ ...c, profile: byId.get(c.user_id) ?? null }));

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { updateId?: string; content?: string } | null;
  const updateId = body?.updateId?.trim();
  const content = body?.content?.trim();

  if (!updateId || !isUuid(updateId)) return NextResponse.json({ error: "Invalid updateId" }, { status: 400 });
  if (!content) return NextResponse.json({ error: "Content is required" }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ error: "Max 500 chars" }, { status: 400 });

  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount, error: cErr } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneMinAgo);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if ((recentCount ?? 0) >= 10) return NextResponse.json({ error: "Rate limit: 10 comments per minute" }, { status: 429 });

  const { error } = await supabase.from("comments").insert({
    update_id: updateId,
    user_id: userRes.user.id,
    content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: updateRow } = await supabase.from("updates").select("user_id").eq("id", updateId).maybeSingle();
  const ownerId = updateRow?.user_id as string | undefined;
  if (ownerId && ownerId !== userRes.user.id) {
    await supabase.from("notifications").insert({
      recipient_id: ownerId,
      actor_id: userRes.user.id,
      type: "comment",
      update_id: updateId,
    });
  }

  return NextResponse.json({ ok: true });
}
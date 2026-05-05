import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = { updateId?: string };

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const updateId = body?.updateId?.trim();
  if (!updateId || !isUuid(updateId)) return NextResponse.json({ error: "Invalid updateId" }, { status: 400 });

  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount, error: cErr } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", oneMinAgo);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if ((recentCount ?? 0) >= 30) return NextResponse.json({ error: "Rate limit: too many likes" }, { status: 429 });

  const { error } = await supabase.from("likes").insert({ update_id: updateId, user_id: userRes.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: updateRow } = await supabase.from("updates").select("user_id").eq("id", updateId).maybeSingle();
  const ownerId = updateRow?.user_id as string | undefined;
  if (ownerId && ownerId !== userRes.user.id) {
    await supabase.from("notifications").insert({
      recipient_id: ownerId,
      actor_id: userRes.user.id,
      type: "like",
      update_id: updateId,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const updateId = body?.updateId?.trim();
  if (!updateId || !isUuid(updateId)) return NextResponse.json({ error: "Invalid updateId" }, { status: 400 });

  const { error } = await supabase.from("likes").delete().eq("update_id", updateId).eq("user_id", userRes.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
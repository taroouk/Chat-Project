import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

async function getTargetId(username: string) {
  const { data, error } = await supabasePublic
    .from("profiles")
    .select("user_id, is_public")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.is_public !== true) return null;
  return data.user_id as string;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { username?: string } | null;
  const username = body?.username?.trim();
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  const targetId = await getTargetId(username);
  if (!targetId) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (targetId === userRes.user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { error } = await supabase.from("follows").insert({
    follower_id: userRes.user.id,
    following_id: targetId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { username?: string } | null;
  const username = body?.username?.trim();
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  const targetId = await getTargetId(username);
  if (!targetId) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", userRes.user.id)
    .eq("following_id", targetId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
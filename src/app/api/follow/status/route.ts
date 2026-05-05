import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.trim();
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: pErr } = await supabasePublic
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data: row, error } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userRes.user.id)
    .eq("following_id", profile.user_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ following: !!row });
}
import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json({ users: [] });

  // basic search (username prefix)
  const { data, error } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, is_public")
    .ilike("username", `${q}%`)
    .eq("is_public", true)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data ?? [] });
}
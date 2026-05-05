import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json({ users: [] });

  const { data, error } = await supabasePublic
    .from("profiles")
    .select("username, display_name, is_public")
    .eq("is_public", true)
    .ilike("username", `%${q}%`)
    .order("username", { ascending: true })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    users: (data ?? []).map((u) => ({ username: u.username, display_name: u.display_name })),
  });
}
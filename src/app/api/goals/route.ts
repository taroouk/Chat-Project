import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("goals")
    .select("id, title, week_start, created_at")
    .order("week_start", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { title?: string; weekStart?: string } | null;
  const title = body?.title?.trim();
  const weekStart = body?.weekStart?.trim(); // YYYY-MM-DD

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!weekStart) return NextResponse.json({ error: "weekStart is required" }, { status: 400 });

  const { error } = await supabase.from("goals").insert({
    user_id: userRes.user.id,
    title,
    week_start: weekStart,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
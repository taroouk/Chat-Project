import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CreateBody = { content?: string; mediaUrls?: string[] };

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("updates")
    .select("id, content, created_at, is_public, media_urls")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updates: data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  const content = body?.content?.trim() ?? "";
  const mediaUrls = Array.isArray(body?.mediaUrls) ? body!.mediaUrls!.filter(Boolean) : [];

  if (!content && mediaUrls.length === 0) {
    return NextResponse.json({ error: "Content or images required" }, { status: 400 });
  }

  if (content.length > 1000) return NextResponse.json({ error: "Max 1000 chars" }, { status: 400 });
  if (mediaUrls.length > 6) return NextResponse.json({ error: "Max 6 images" }, { status: 400 });

  const { error } = await supabase.from("updates").insert({
    user_id: userRes.user.id,
    content,
    media_urls: mediaUrls,
    is_public: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isValidUsername(u: string) {
  return /^[a-z0-9_]{3,20}$/i.test(u);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, is_public, avatar_url")
    .eq("user_id", userRes.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data ?? null });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { username?: string; displayName?: string; isPublic?: boolean; avatar_url?: string | null }
    | null;

  const username = body?.username?.trim() ?? "";
  const displayName = body?.displayName?.trim() ?? "";
  const isPublic = body?.isPublic ?? true;

  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Invalid username. Use 3-20 letters/numbers/underscore." },
      { status: 400 },
    );
  }

  // ✅ critical: update avatar_url ONLY if client sent it
  const hasAvatarKey = !!body && Object.prototype.hasOwnProperty.call(body, "avatar_url");

  const payload: Record<string, any> = {
    user_id: userRes.user.id,
    username,
    display_name: displayName || null,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  };

  if (hasAvatarKey) {
    payload.avatar_url = body?.avatar_url ?? null; // allow explicit remove
  }

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
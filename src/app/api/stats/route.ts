import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function toUTCDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // YYYY-MM-DD
}

function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function dayDiffUTC(a: Date, b: Date): number {
  return Math.floor((utcMidnight(a) - utcMidnight(b)) / (24 * 60 * 60 * 1000));
}

function computeStreak(uniqueDayKeysDesc: string[]): number {
  if (uniqueDayKeysDesc.length === 0) return 0;

  const today = new Date();
  const todayKey = toUTCDateKey(today);

  const latestKey = uniqueDayKeysDesc[0];
  const latestDate = new Date(`${latestKey}T00:00:00Z`);
  const diffFromToday = Math.abs(dayDiffUTC(today, latestDate));

  // streak starts only if last update is today or yesterday
  if (diffFromToday > 1) return 0;

  let streak = 1;
  let prev = latestDate;

  for (let i = 1; i < uniqueDayKeysDesc.length; i++) {
    const cur = new Date(`${uniqueDayKeysDesc[i]}T00:00:00Z`);
    const gap = Math.abs(dayDiffUTC(prev, cur));
    if (gap === 1) {
      streak += 1;
      prev = cur;
      continue;
    }
    break;
  }

  return streak;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (!userRes.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull only what we need
  const { data: rows, error } = await supabase
    .from("updates")
    .select("created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = rows?.length ?? 0;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let weekCount = 0;
  const uniqueDaysSet = new Set<string>();

  for (const r of rows ?? []) {
    const d = new Date(r.created_at);
    if (d >= sevenDaysAgo) weekCount += 1;
    uniqueDaysSet.add(toUTCDateKey(d));
  }

  // Unique days sorted desc
  const uniqueDaysDesc = Array.from(uniqueDaysSet).sort((a, b) =>
    a > b ? -1 : a < b ? 1 : 0,
  );

  const streak = computeStreak(uniqueDaysDesc);

  return NextResponse.json({
    total,
    weekCount,
    streak,
  });
}
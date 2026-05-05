import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: { username: string; display_name: string | null } | null;
};

export default async function FollowingTimelinePage() {
  // protect page
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/feed/following`, { cache: "no-store" });
  const json = (await res.json()) as { items?: FeedItem[]; error?: string };

  const items = json.items ?? [];

  return (
    <main className="min-h-screen p-10 max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Following</h1>
        <div className="flex gap-3 text-sm">
          <Link className="underline" href="/timeline">
            Global
          </Link>
          <Link className="underline" href="/timeline/following">
            Following
          </Link>
        </div>
      </header>

      {json.error && <p className="text-sm text-red-500">{json.error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No posts yet. Go follow someone from their profile page.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const name = it.profile?.display_name || `@${it.profile?.username}`;
            const username = it.profile?.username;

            return (
              <article key={it.id} className="border rounded-md p-4 space-y-2">
                {username ? (
                  <Link className="text-sm font-semibold underline" href={`/u/${username}`}>
                    {name}
                  </Link>
                ) : (
                  <div className="text-sm font-semibold">{name}</div>
                )}

                <div className="text-sm whitespace-pre-wrap">{it.content}</div>

                <div className="text-xs text-muted-foreground">
                  {new Date(it.created_at).toLocaleString()}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
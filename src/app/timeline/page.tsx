import Link from "next/link";

type FeedItem = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: { username: string; display_name: string | null } | null;
};

export default async function TimelinePage() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/feed`, {
    cache: "no-store",
  }).catch(() => null);

  // fallback لو NEXT_PUBLIC_SITE_URL مش متظبط
  const res2 = res ?? (await fetch("http://localhost:3000/api/feed", { cache: "no-store" }));
  const json = (await res2.json()) as { items?: FeedItem[] };

  const items = json.items ?? [];

  return (
    <main className="min-h-screen p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Timeline</h1>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public posts yet.</p>
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
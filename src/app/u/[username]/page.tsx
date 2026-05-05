// src/app/u/[username]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import MediaGrid from "@/components/media/media-grid";
import FollowButton from "@/components/follow-button";
import { supabasePublic } from "@/lib/supabase/public";

type PageProps = {
  params: { username: string };
};

type PublicProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
};

type PublicPost = {
  id: string;
  content: string;
  created_at: string;
  media_urls: string[];
  is_public: boolean;
};

async function getProfileByUsername(username: string) {
  const { data, error } = await supabasePublic
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, is_public")
    .eq("username", username)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PublicProfile | null) ?? null;
}

async function getPublicPosts(userId: string) {
  const { data, error } = await supabasePublic
    .from("updates")
    .select("id, content, created_at, media_urls, is_public")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data as PublicPost[]) ?? [];
}

async function getCounts(userId: string) {
  const [{ count: posts }, { count: followers }, { count: following }] = await Promise.all([
    supabasePublic
      .from("updates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_public", true),
    supabasePublic
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),
    supabasePublic
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId),
  ]);

  return {
    posts: posts ?? 0,
    followers: followers ?? 0,
    following: following ?? 0,
  };
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg bg-background px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const username = decodeURIComponent(params.username ?? "").trim();

  if (!username) notFound();

  const profile = await getProfileByUsername(username);
  if (!profile || !profile.is_public) notFound();

  const [posts, counts] = await Promise.all([getPublicPosts(profile.user_id), getCounts(profile.user_id)]);

  const displayName = profile.display_name?.trim() || `@${profile.username}`;

  return (
    <main className="min-h-screen bg-muted/20">
      <header className="border-b bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-6 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">
              <Link className="underline" href="/dashboard">
                Dashboard
              </Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">@{profile.username}</span>
            </div>
            <h1 className="text-2xl font-bold truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground truncate">@{profile.username}</p>
          </div>

          <div className="flex items-center gap-3">
            <FollowButton username={profile.username} />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
        {/* Profile card */}
        <section className="border rounded-xl bg-background p-5">
          <div className="flex items-start gap-4">
            <a
              href={profile.avatar_url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="relative h-20 w-20 rounded-full overflow-hidden border bg-muted shrink-0"
              aria-label="Open avatar"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">🙂</div>
              )}
            </a>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-semibold truncate">{displayName}</div>
                  <div className="text-sm text-muted-foreground truncate">@{profile.username}</div>
                </div>
                <div className="shrink-0">
                  <FollowButton username={profile.username} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat label="Posts" value={counts.posts} />
                <Stat label="Followers" value={counts.followers} />
                <Stat label="Following" value={counts.following} />
              </div>
            </div>
          </div>
        </section>

        {/* Posts */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Posts</h2>
              <p className="text-sm text-muted-foreground">Public posts by @{profile.username}</p>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="border rounded-xl bg-background p-6 text-sm text-muted-foreground">
              No public posts yet.
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((p) => (
                <article key={p.id} className="border rounded-xl bg-background p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold truncate">{displayName}</div>
                    <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
                  </div>

                  {p.content ? <div className="text-sm whitespace-pre-wrap">{p.content}</div> : null}

                  <MediaGrid urls={Array.isArray(p.media_urls) ? p.media_urls : []} />

                  <div className="text-xs text-muted-foreground">
                    Post ID: <span className="font-mono">{p.id}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import NotificationsDropdown from "@/components/notifications/notifications-dropdown";

type SidebarItem = {
  title: string;
  href: string;
  desc?: string;
};

const SIDEBAR: SidebarItem[] = [
  { title: "Home", href: "/dashboard", desc: "Following / Global feed" },
  { title: "Discover", href: "/dashboard/discover", desc: "Trending + suggestions + search" },
  { title: "Overview", href: "/dashboard/overview", desc: "Stats + shortcuts" },
  { title: "Updates", href: "/dashboard/updates", desc: "Create / edit / delete" },
  { title: "Goals", href: "/dashboard/goals", desc: "Weekly planning" },
  { title: "Profile", href: "/dashboard/profile", desc: "Username + public page" },
  { title: "Social", href: "/dashboard/social", desc: "Search + following" },
];

function activeClass(pathname: string, href: string) {
  const isActive = pathname === href;
  return isActive ? "border-blue-600 bg-muted/30" : "border-transparent hover:bg-muted/40";
}

export default function DashboardTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-bold">Dashboard</div>
            <div className="text-xs text-muted-foreground">Build In Public Tracker</div>
          </div>

          <nav className="flex items-center gap-2 flex-wrap">
            <Button asChild variant="ghost">
              <Link href="/dashboard/discover">Discover</Link>
            </Button>

            <Button asChild variant="ghost">
              <Link href="/timeline">Global</Link>
            </Button>

            <Button asChild variant="ghost">
              <Link href="/timeline?mode=following">Following</Link>
            </Button>

            <NotificationsDropdown />

            <Button asChild variant="outline">
              <Link href="/auth/signout">Sign out</Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-4">
          <div className="border rounded-xl bg-background p-4">
            <div className="text-sm font-semibold mb-3">Navigation</div>

            <div className="space-y-2">
              {SIDEBAR.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "block rounded-lg border px-3 py-2 transition",
                    activeClass(pathname, item.href),
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">{item.title}</div>
                  {item.desc ? <div className="text-xs text-muted-foreground">{item.desc}</div> : null}
                </Link>
              ))}
            </div>
          </div>

          <div className="border rounded-xl bg-background p-4">
            <div className="text-sm font-semibold mb-2">Shortcuts</div>
            <div className="space-y-1 text-sm">
              <Link className="underline block" href="/timeline">
                Open global timeline
              </Link>
              <Link className="underline block" href="/timeline?mode=following">
                Open following timeline
              </Link>
            </div>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
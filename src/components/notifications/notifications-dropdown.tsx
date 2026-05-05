"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notif = {
  id: string;
  created_at: string;
  read?: boolean;
  type?: string;
  title?: string;
  message?: string;
  actor_username?: string | null;
};

function pickList(json: any): Notif[] {
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.notifications)) return json.notifications;
  return [];
}

function formatText(n: Notif) {
  if (n.title) return n.title;
  if (n.message) return n.message;
  if (n.type === "like") return `${n.actor_username ?? "Someone"} liked your post`;
  if (n.type === "comment") return `${n.actor_username ?? "Someone"} commented on your post`;
  if (n.type === "follow") return `${n.actor_username ?? "Someone"} followed you`;
  return "Notification";
}

export default function NotificationsDropdown() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/notifications?limit=6", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    const list = pickList(json);
    setItems(list);
    setUnread(list.filter((x) => x.read === false).length);
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" }).catch(() => null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="relative">
          <Bell className="h-4 w-4 mr-2" />
          Notifications
          {unread > 0 ? (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-black text-white text-[11px] px-2 py-[1px]">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px]">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={busy}>
            <Check className="h-4 w-4 mr-1" />
            Mark all read
          </Button>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {items.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">No notifications yet.</div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem key={n.id} className="cursor-pointer">
              <Link href="/notifications" className="w-full">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {formatText(n)}
                    {n.read === false ? <span className="ml-2 text-[11px] text-blue-600">• new</span> : null}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/notifications" className="w-full text-sm font-medium">
            Open notifications page →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
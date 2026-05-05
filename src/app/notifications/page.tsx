import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">All your notifications in one place.</p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard">← Back to Home</Link>
        </Button>
      </div>

      {/* Placeholder - keep your existing notifications UI here later */}
      <div className="border rounded-xl bg-background p-4">
        <div className="text-sm text-muted-foreground">
          This is your notifications page. (We can render real notifications list here next.)
        </div>
      </div>
    </main>
  );
}
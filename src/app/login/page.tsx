// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) return setMsg(signUpError.message);

        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          return setMsg(
            `${signInError.message}\nIf email confirmation is ON, confirm your email OR disable it temporarily.`,
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return setMsg(error.message);
      }

      router.replace("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen p-10 max-w-md mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Login</h1>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "signin" ? "default" : "outline"}
          onClick={() => setMode("signin")}
          className="flex-1"
          disabled={busy}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant={mode === "signup" ? "default" : "outline"}
          onClick={() => setMode("signup")}
          className="flex-1"
          disabled={busy}
        >
          Sign up
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
        />
        <input
          className="w-full border rounded-md px-3 py-2 bg-background"
          placeholder="password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          minLength={6}
          required
        />
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
        </Button>
      </form>

      {msg && <pre className="whitespace-pre-wrap text-sm text-red-500">{msg}</pre>}
    </main>
  );
}
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { SIGNALOPS_TM } from "@/lib/sm/ui";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      const from = searchParams.get("from") ?? "/";
      router.push(from);
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
      />
      {error && <p className="text-center text-xs text-red-400">Incorrect password</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-xl bg-white py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-100 disabled:opacity-40"
      >
        {loading ? "Entering..." : "Enter →"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#060608] px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Image
          src="/inventious-logo.png"
          alt="inventious"
          width={200}
          height={60}
          className="h-10 w-auto object-contain"
          priority
        />

        <Suspense fallback={<div className="h-24 w-full" />}>
          <LoginForm />
        </Suspense>

        <p className="text-xs text-zinc-700">✦ {SIGNALOPS_TM} Creative Engine</p>
      </div>
    </div>
  );
}

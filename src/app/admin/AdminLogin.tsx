"use client";

import { type FormEvent, useState } from "react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not sign in.");
      return;
    }
    window.location.reload();
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e31b23]">piece/out</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#171411]">orders</h1>
      <p className="mt-2 text-sm text-[#7a7268]">Staff only. Orders also land in your inbox.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="checkout-input"
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-[#e31b23]">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#171411] px-6 py-3 text-sm font-extrabold text-[#fffaf3]"
        >
          {busy ? "Opening…" : "Open dashboard"}
        </button>
      </form>
    </main>
  );
}

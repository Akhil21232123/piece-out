"use client";

import { useState } from "react";

export function AdminSignOut() {
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.assign("/admin");
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void leave()}
      className="rounded-full border border-[#171411]/16 bg-[#fffaf3] px-4 py-2 text-xs font-extrabold text-[#171411] disabled:opacity-60"
    >
      {busy ? "Leaving…" : "Sign out"}
    </button>
  );
}

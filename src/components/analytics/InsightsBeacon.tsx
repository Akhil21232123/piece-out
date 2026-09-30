"use client";

import { useEffect } from "react";

function sid() {
  try {
    const existing = sessionStorage.getItem("po_sid");
    if (existing && existing.length >= 8) return existing;
    const next = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("po_sid", next);
    return next;
  } catch {
    return `${Date.now().toString(36)}guest`;
  }
}

function post(body: unknown) {
  const text = JSON.stringify(body);
  return fetch("/api/insights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: text,
    keepalive: true,
    cache: "no-store",
  }).catch(() => undefined);
}

export function InsightsBeacon() {
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    const session = sid();
    const started = Date.now();
    let views = 1;
    let left = false;
    const queue: unknown[] = [];
    let flushTimer = 0;

    const flush = () => {
      if (!queue.length) return;
      const batch = queue.splice(0, queue.length);
      void post(batch);
    };

    const send = (event: Record<string, unknown>) => {
      queue.push(event);
      if (event.kind === "view" || event.kind === "buy" || event.kind === "leave") {
        window.clearTimeout(flushTimer);
        flush();
        return;
      }
      window.clearTimeout(flushTimer);
      flushTimer = window.setTimeout(flush, 700);
    };

    send({ sid: session, kind: "view", path: window.location.pathname });

    const onTap = (event: PointerEvent) => {
      const node = (event.target as Element | null)?.closest("button, a, [role='button'], [data-hero-piece]");
      const label = (
        node?.getAttribute("aria-label") ||
        node?.getAttribute("data-insight") ||
        node?.textContent ||
        "page"
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 48);
      const height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
      send({
        sid: session,
        kind: "tap",
        label,
        x: event.clientX / Math.max(window.innerWidth, 1),
        y: (event.clientY + window.scrollY) / height,
      });
    };

    const leave = () => {
      if (left) return;
      left = true;
      queue.push({ sid: session, kind: "leave", views, ms: Date.now() - started });
      flush();
    };

    const onBought = () => send({ sid: session, kind: "buy" });

    document.addEventListener("pointerup", onTap, { passive: true });
    window.addEventListener("pagehide", leave);
    window.addEventListener("po-bought", onBought);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) leave();
    });

    return () => {
      window.clearTimeout(flushTimer);
      flush();
      document.removeEventListener("pointerup", onTap);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("po-bought", onBought);
    };
  }, []);

  return null;
}

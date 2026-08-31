"use client";

import { Component, type ReactNode, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { canCreateWebGL } from "@/lib/webgl";

const RelicCanvas = dynamic(
  () => import("./RelicCanvas").then((mod) => mod.RelicCanvas),
  { ssr: false },
);

class WebGLGuard extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {}

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Relic({ reduced, fallback }: { reduced: boolean; fallback: ReactNode }) {
  const [mode, setMode] = useState<"wait" | "gl" | "css">("wait");

  useEffect(() => {
    setMode(canCreateWebGL() ? "gl" : "css");
    const onLost = (event: Event) => {
      event.preventDefault();
      setMode("css");
    };
    const onReject = (event: PromiseRejectionEvent) => {
      const msg = String((event.reason as { message?: string })?.message || event.reason || "");
      if (/webgl/i.test(msg)) {
        event.preventDefault();
        setMode("css");
      }
    };
    window.addEventListener("webglcontextlost", onLost, true);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("webglcontextlost", onLost, true);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);

  if (mode === "wait") return <div className="relic-wait" />;
  if (mode === "css") return <>{fallback}</>;

  return (
    <WebGLGuard fallback={fallback}>
      <RelicCanvas reduced={reduced} />
    </WebGLGuard>
  );
}

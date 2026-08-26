"use client";

import { useEffect } from "react";

export function FitPhone() {
  useEffect(() => {
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent);
    if (!ios) return;
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("gesturestart", block, { passive: false });
    document.addEventListener("gesturechange", block, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
    };
  }, []);

  return null;
}

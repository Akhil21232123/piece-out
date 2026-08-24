"use client";

import { useEffect } from "react";
import { useMediaStore } from "@/store/mediaStore";

export function useMediaFlags() {
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 768px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      useMediaStore.getState().setFlags({
        ready: true,
        isMobile: mobile.matches,
        reducedMotion: motion.matches,
      });
    };

    sync();
    mobile.addEventListener("change", sync);
    motion.addEventListener("change", sync);
    return () => {
      mobile.removeEventListener("change", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);
}

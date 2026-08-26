"use client";

import { useEffect, useState } from "react";

export function useFinePointer() {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = window.matchMedia("(pointer: fine)");
    const hover = window.matchMedia("(hover: hover)");
    const sync = () => setFine(pointer.matches && hover.matches && !motion.matches);
    sync();
    motion.addEventListener("change", sync);
    pointer.addEventListener("change", sync);
    hover.addEventListener("change", sync);
    return () => {
      motion.removeEventListener("change", sync);
      pointer.removeEventListener("change", sync);
      hover.removeEventListener("change", sync);
    };
  }, []);

  return fine;
}

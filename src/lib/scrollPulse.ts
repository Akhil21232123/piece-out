export type ScrollPulse = {
  dir: 1 | -1;
  settling: boolean;
  y: number;
};

type Listener = (pulse: ScrollPulse) => void;

const listeners = new Set<Listener>();
let hooked = false;
let lastY = 0;
let dir: 1 | -1 = 1;
let timer = 0;

function ensure() {
  if (hooked || typeof window === "undefined") return;
  hooked = true;
  lastY = window.scrollY;
  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const dy = y - lastY;
      if (dy > 0.8) dir = 1;
      else if (dy < -0.8) dir = -1;
      lastY = y;
      listeners.forEach((fn) => fn({ dir, settling: false, y }));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        listeners.forEach((fn) => fn({ dir, settling: true, y: lastY }));
      }, 88);
    },
    { passive: true },
  );
}

export function onScrollPulse(fn: Listener) {
  ensure();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

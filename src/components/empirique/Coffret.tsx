"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/motion";
import { useChamberStore } from "@/store/chamberStore";
import { Relic } from "./Relic";

const WHISPERS = ["Not yet.", "It isn't time.", "Wait.", "Some things remain."];

function smoothstep(a: number, b: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function CssCoffret() {
  const pose = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const poseEl = pose.current;
      const lidEl = lid.current;
      if (!poseEl || !lidEl) return;
      gsap.set(poseEl, { rotationX: 14, rotationY: -18, y: 0, scale: 1 });
      const reduced = prefersReducedMotion();
      const tick = (time: number) => {
        const { pointer, progress } = useChamberStore.getState();
        const open = reduced ? 0 : smoothstep(0.04, 0.3, progress);
        const dive = reduced ? 0 : smoothstep(0.2, 0.84, progress);
        const spin = reduced || open > 0.04 ? 0 : time * 7;
        gsap.set(poseEl, {
          rotationY: (-18 + pointer.x * 16 + spin) * (1 - open),
          rotationX: (14 + pointer.y * 6) * (1 - open),
          y: reduced ? 0 : Math.sin(time * 0.65) * 6 * (1 - open),
          scale: 1 + dive * 7.5,
          z: dive * 220,
        });
        gsap.set(lidEl, { rotationX: -118 * open });
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: pose },
  );

  return (
    <div ref={pose} className="coffret-pose">
      <div className="coffret">
        <span className="coffret-face coffret-front" />
        <span className="coffret-face coffret-side coffret-left" />
        <span className="coffret-face coffret-side coffret-right" />
        <span className="coffret-face coffret-top" />
        <div ref={lid} className="coffret-lid">
          <span className="coffret-lid-top" />
          <span className="coffret-lid-front" />
          <span className="coffret-ribbon" />
          <span className="coffret-clasp" />
        </div>
      </div>
    </div>
  );
}

export function Coffret() {
  const stage = useRef<HTMLDivElement>(null);
  const whisperIndex = useRef(0);
  const reduced = prefersReducedMotion();
  const live = useChamberStore((state) => state.objectRevealed);

  useGSAP(
    () => {
      const stageEl = stage.current;
      if (!stageEl) return;

      const onEnter = () => useChamberStore.getState().setHoveringBox(true);
      const onLeave = () => useChamberStore.getState().setHoveringBox(false);
      const onClick = () => {
        if (useChamberStore.getState().progress > 0.06) return;
        const line = WHISPERS[whisperIndex.current % WHISPERS.length];
        whisperIndex.current += 1;
        useChamberStore.getState().setWhisper(line);
        window.setTimeout(() => {
          if (useChamberStore.getState().whisper === line) {
            useChamberStore.getState().setWhisper(null);
          }
        }, 1800);
      };

      stageEl.addEventListener("pointerenter", onEnter);
      stageEl.addEventListener("pointerleave", onLeave);
      stageEl.addEventListener("click", onClick);
      return () => {
        stageEl.removeEventListener("pointerenter", onEnter);
        stageEl.removeEventListener("pointerleave", onLeave);
        stageEl.removeEventListener("click", onClick);
      };
    },
    { scope: stage },
  );

  return (
    <div
      ref={stage}
      className={`coffret-stage relic-stage relic-bleed${live ? " is-live" : ""}`}
      data-cursor="hot"
      role="img"
      aria-label="A closed velvet coffret. Scroll to open it and enter."
    >
      <Relic reduced={reduced} fallback={<CssCoffret />} />
    </div>
  );
}

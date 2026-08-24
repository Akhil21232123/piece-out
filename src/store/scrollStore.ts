import { create } from "zustand";
import { getStage, type ScrollStage } from "@/types/scroll";

export interface ScrollState {
  inCatalog: boolean;
  chapterIndex: number;
  /** 0–1 progress inside the current catalog chapter. */
  chapterProgress: number;
  /** 0–1 through the hero screen. */
  heroScroll: number;
  stage: ScrollStage;
  lidOpen: number;
  heroFocus: number;
  piecePhase: number;
  wallLock: number;
  ctaVisible: boolean;
  setHeroScroll: (heroScroll: number) => void;
  setChapter: (inCatalog: boolean, chapterIndex: number, chapterProgress: number) => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function derive(inCatalog: boolean, chapterIndex: number, local: number, heroScroll: number) {
  const p = inCatalog ? clamp01(local) : 0;
  const heroFocus = inCatalog ? clamp01(p / 0.12) : clamp01(heroScroll * 0.35);
  const lidOpen = inCatalog ? clamp01((p - 0.12) / 0.18) : 0;
  const piecePhase = inCatalog ? clamp01((p - 0.3) / 0.5) : 0;
  const wallLock = inCatalog ? clamp01((p - 0.78) / 0.22) : 0;
  const ctaVisible = inCatalog && p >= 0.72;

  return {
    inCatalog,
    chapterIndex,
    chapterProgress: p,
    heroScroll,
    stage: getStage(p, inCatalog),
    lidOpen,
    heroFocus,
    piecePhase,
    wallLock,
    ctaVisible,
  };
}

export const useScrollStore = create<ScrollState>((set, get) => ({
  ...derive(false, 0, 0, 0),
  setHeroScroll: (heroScroll) => {
    const { inCatalog, chapterIndex, chapterProgress } = get();
    if (inCatalog) return;
    if (Math.abs(get().heroScroll - heroScroll) < 0.002) return;
    set(derive(false, chapterIndex, chapterProgress, heroScroll));
  },
  setChapter: (inCatalog, chapterIndex, chapterProgress) => {
    const cur = get();
    if (
      cur.inCatalog === inCatalog &&
      cur.chapterIndex === chapterIndex &&
      Math.abs(cur.chapterProgress - chapterProgress) < 0.001
    ) {
      return;
    }
    set(derive(inCatalog, chapterIndex, chapterProgress, cur.heroScroll));
  },
}));

/** Scroll-driven narrative stages (chapter-local 0–1, or hero). */
export type ScrollStage =
  | "float"
  | "hero"
  | "peel"
  | "erupt"
  | "assemble"
  | "reveal";

export interface StageRange {
  id: ScrollStage;
  start: number;
  end: number;
  label: string;
}

export const STAGES: readonly StageRange[] = [
  { id: "hero", start: 0.0, end: 0.12, label: "focus" },
  { id: "peel", start: 0.12, end: 0.3, label: "open" },
  { id: "erupt", start: 0.3, end: 0.5, label: "out" },
  { id: "assemble", start: 0.5, end: 0.8, label: "puzzle" },
  { id: "reveal", start: 0.8, end: 1.0, label: "display" },
] as const;

export function getStage(progress: number, inCatalog: boolean): ScrollStage {
  if (!inCatalog) return "float";
  const p = Math.min(1, Math.max(0, progress));
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (p >= STAGES[i].start) return STAGES[i].id;
  }
  return "hero";
}

export interface PuzzleLayout {
  cols: number;
  rows: number;
  pieceCount: number;
  wallWidth: number;
  wallHeight: number;
  wallX: number;
  wallY: number;
  wallZ: number;
}

/** Assembled poster sits IN FRONT of the can (higher Z = closer to camera). */
export const DESKTOP_LAYOUT: PuzzleLayout = {
  cols: 12,
  rows: 12,
  pieceCount: 144,
  wallWidth: 2.15,
  wallHeight: 2.15,
  wallX: 0.62,
  wallY: 1.02,
  wallZ: 1.85,
};

export const MOBILE_LAYOUT: PuzzleLayout = {
  cols: 8,
  rows: 8,
  pieceCount: 64,
  wallWidth: 1.85,
  wallHeight: 1.85,
  wallX: 0.22,
  wallY: 1.05,
  wallZ: 1.42,
};

export const PUZZLE_CONFIG = DESKTOP_LAYOUT;

export function getPuzzleLayout(isMobile: boolean): PuzzleLayout {
  return isMobile ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
}

export const SPACE = {
  canHome: { x: 0.02, y: 0.02, z: 0 },
  canAside: { x: -1.72, y: -0.18, z: 0.15 },
  camera: { x: 0.48, y: 0.92, z: 4.55 },
  lookAt: { x: 0.22, y: 0.72, z: 0.55 },
} as const;

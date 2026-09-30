import type { PieceEdges } from "./jigsaw";

const TAB = 0.23;
const NECK = 0.145;

function bumpSvg(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: -1 | 0 | 1,
  tab: number,
  neck: number,
): string {
  if (kind === 0) return `L${round(x1)} ${round(y1)}`;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const ox = uy * kind;
  const oy = -ux * kind;
  const mid = len * 0.5;
  const a0x = x0 + ux * (mid - neck);
  const a0y = y0 + uy * (mid - neck);
  const a1x = x0 + ux * (mid + neck);
  const a1y = y0 + uy * (mid + neck);
  const cx = x0 + ux * mid + ox * tab;
  const cy = y0 + uy * mid + oy * tab;
  const w = neck * 0.9;
  return [
    `L${round(a0x)} ${round(a0y)}`,
    `C${round(a0x + ox * tab * 0.4 - ux * w)} ${round(a0y + oy * tab * 0.4 - uy * w)}`,
    `${round(cx - ux * w)} ${round(cy - uy * w)}`,
    `${round(cx)} ${round(cy)}`,
    `C${round(cx + ux * w)} ${round(cy + uy * w)}`,
    `${round(a1x + ox * tab * 0.4 + ux * w)} ${round(a1y + oy * tab * 0.4 + uy * w)}`,
    `${round(a1x)} ${round(a1y)}`,
    `L${round(x1)} ${round(y1)}`,
  ].join(" ");
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function jigSvgPath(width: number, edges: PieceEdges, height = width): string {
  const tab = Math.min(width, height) * TAB;
  const neck = Math.min(width, height) * NECK;
  return [
    `M0 0`,
    bumpSvg(0, 0, width, 0, edges.n, tab, neck),
    bumpSvg(width, 0, width, height, edges.e, tab, neck),
    bumpSvg(width, height, 0, height, edges.s, tab, neck),
    bumpSvg(0, height, 0, 0, edges.w, tab, neck),
    "Z",
  ].join(" ");
}

export function jigPad(size: number) {
  return size * TAB + 4;
}

export function jigViewBox(width = 100, height = width) {
  const pad = jigPad(Math.min(width, height));
  return `${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`;
}

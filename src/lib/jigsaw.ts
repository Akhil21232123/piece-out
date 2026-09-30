export type Edge = -1 | 0 | 1;

export type PieceEdges = {
  n: Edge;
  e: Edge;
  s: Edge;
  w: Edge;
};

function signed(bit: number): Edge {
  return bit ? -1 : 1;
}

export function edgesFor(col: number, row: number, cols: number, rows: number): PieceEdges {
  const east: Edge = col === cols - 1 ? 0 : signed((col * 2 + row * 5) & 1);
  const south: Edge = row === rows - 1 ? 0 : signed((col * 3 + row * 7) & 1);
  const west: Edge = col === 0 ? 0 : ((-signed(((col - 1) * 2 + row * 5) & 1)) as Edge);
  const north: Edge = row === 0 ? 0 : ((-signed((col * 3 + (row - 1) * 7) & 1)) as Edge);
  return { n: north, e: east, s: south, w: west };
}

function tabSize(width: number, height: number) {
  const span = Math.min(width, height);
  return { tab: span * 0.23, neck: span * 0.145 };
}

export function jigPath(width: number, edges: PieceEdges, height = width): Path2D {
  const path = new Path2D();
  const { tab, neck } = tabSize(width, height);
  path.moveTo(0, 0);
  bump(path, 0, 0, width, 0, edges.n, tab, neck);
  bump(path, width, 0, width, height, edges.e, tab, neck);
  bump(path, width, height, 0, height, edges.s, tab, neck);
  bump(path, 0, height, 0, 0, edges.w, tab, neck);
  path.closePath();
  return path;
}

/** Unique seams only: east + south of every cell, plus the outer north/west rim. */
export function jigSeams(width: number, edges: PieceEdges, height: number, col: number, row: number): Path2D {
  const path = new Path2D();
  const { tab, neck } = tabSize(width, height);
  if (row === 0) {
    path.moveTo(0, 0);
    bump(path, 0, 0, width, 0, edges.n, tab, neck);
  }
  path.moveTo(width, 0);
  bump(path, width, 0, width, height, edges.e, tab, neck);
  path.moveTo(width, height);
  bump(path, width, height, 0, height, edges.s, tab, neck);
  if (col === 0) {
    path.moveTo(0, height);
    bump(path, 0, height, 0, 0, edges.w, tab, neck);
  }
  return path;
}

function bump(
  path: Path2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: Edge,
  tab: number,
  neck: number,
) {
  if (kind === 0) {
    path.lineTo(x1, y1);
    return;
  }

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

  path.lineTo(a0x, a0y);
  path.bezierCurveTo(
    a0x + ox * tab * 0.4 - ux * w,
    a0y + oy * tab * 0.4 - uy * w,
    cx - ux * w,
    cy - uy * w,
    cx,
    cy,
  );
  path.bezierCurveTo(
    cx + ux * w,
    cy + uy * w,
    a1x + ox * tab * 0.4 + ux * w,
    a1y + oy * tab * 0.4 + uy * w,
    a1x,
    a1y,
  );
  path.lineTo(x1, y1);
}

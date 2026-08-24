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

export function jigPath(size: number, edges: PieceEdges): Path2D {
  const path = new Path2D();
  const tab = size * 0.2;
  const neck = size * 0.13;
  path.moveTo(0, 0);
  bump(path, 0, 0, size, 0, edges.n, tab, neck);
  bump(path, size, 0, size, size, edges.e, tab, neck);
  bump(path, size, size, 0, size, edges.s, tab, neck);
  bump(path, 0, size, 0, 0, edges.w, tab, neck);
  path.closePath();
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

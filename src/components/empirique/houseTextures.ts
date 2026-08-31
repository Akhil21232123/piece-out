import * as THREE from "three";

function canvas2d(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d");
  return { canvas, ctx };
}

function toMap(canvas: HTMLCanvasElement, colorSpace: typeof THREE.SRGBColorSpace | typeof THREE.NoColorSpace) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export function createVelvetAlbedo(size = 1024) {
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = "#120608";
  ctx.fillRect(0, 0, size, size);
  const g = ctx.createRadialGradient(size * 0.32, size * 0.22, 0, size * 0.4, size * 0.38, size * 0.78);
  g.addColorStop(0, "#6b2434");
  g.addColorStop(0.35, "#3a141c");
  g.addColorStop(1, "#14080c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 28; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const warm = Math.random() > 0.62;
    ctx.fillStyle = warm
      ? `rgba(196, 140, 110, ${0.03 + Math.random() * 0.07})`
      : `rgba(6, 1, 3, ${0.05 + Math.random() * 0.1})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2.2, 1 + Math.random() * 4);
  }
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(90, 28, 42, ${0.04 + Math.random() * 0.08})`;
    ctx.lineWidth = 8 + Math.random() * 18;
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, 0);
    ctx.lineTo(Math.random() * size, size);
    ctx.stroke();
  }
  return toMap(canvas, THREE.SRGBColorSpace);
}

export function createVelvetBump(size = 1024) {
  const { canvas, ctx } = canvas2d(size);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 22; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 70 + Math.floor(Math.random() * 110);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 1, 1 + Math.random() * 2);
  }
  const tex = toMap(canvas, THREE.NoColorSpace);
  tex.repeat.set(2.4, 2.4);
  return tex;
}

export function createGoldMetal(size = 512) {
  const { canvas, ctx } = canvas2d(size);
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#f0d7a8");
  g.addColorStop(0.35, "#c4a574");
  g.addColorStop(0.7, "#8a6240");
  g.addColorStop(1, "#e4c896");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(255,240,210,${0.04 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
  return toMap(canvas, THREE.SRGBColorSpace);
}

export function createHouseEnv() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d");
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#1a0c10");
  sky.addColorStop(0.42, "#0c0608");
  sky.addColorStop(0.72, "#12080c");
  sky.addColorStop(1, "#070506");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);
  const strips = [
    [80, 10, 0.22],
    [210, 6, 0.14],
    [470, 16, 0.32],
    [640, 5, 0.16],
    [860, 12, 0.24],
  ] as const;
  for (const [x, w, a] of strips) {
    ctx.fillStyle = `rgba(232, 210, 176, ${a})`;
    ctx.fillRect(x, 12, w, 140);
  }
  const warm = ctx.createRadialGradient(512, 40, 0, 512, 80, 220);
  warm.addColorStop(0, "rgba(196, 165, 116, 0.22)");
  warm.addColorStop(1, "rgba(196, 165, 116, 0)");
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

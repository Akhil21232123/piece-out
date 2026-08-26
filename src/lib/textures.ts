import * as THREE from "three";

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function sourceSize(img: CanvasImageSource): { w: number; h: number } {
  if (img instanceof HTMLImageElement) return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  if (img instanceof HTMLCanvasElement) return { w: img.width, h: img.height };
  if (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) {
    return { w: img.width, h: img.height };
  }
  return { w: 1024, h: 1024 };
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amt = 0.045) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 16) {
    const n = (Math.random() - 0.5) * amt * 255;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.4;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function wrapToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function fillPinkLabel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#F3B3C4";
  ctx.fillRect(0, 0, w, h);
  const shade = ctx.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0, "rgba(70, 24, 38, 0.16)");
  shade.addColorStop(0.12, "rgba(70, 24, 38, 0)");
  shade.addColorStop(0.88, "rgba(70, 24, 38, 0)");
  shade.addColorStop(1, "rgba(70, 24, 38, 0.16)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

function drawYellowWaves(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const cx = w / 2;
  ctx.strokeStyle = "#FFD54A";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const side of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      ctx.lineWidth = 9 - k * 2;
      ctx.globalAlpha = 0.92 - k * 0.18;
      ctx.beginPath();
      const x0 = cx + side * (500 + k * 18);
      for (let y = 16; y <= h - 16; y += 3) {
        const x = x0 + Math.sin(y * 0.055 + k) * 22 * side;
        if (y === 16) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

const FONT = "Outfit, Arial Black, Helvetica Neue, sans-serif";

/** Upper sleeve: piece/out lockup, tagline, 120 pcs badge. */
export function createUpperLabel(): THREE.CanvasTexture {
  const w = 2048;
  const h = 640;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  fillPinkLabel(ctx, w, h);
  drawYellowWaves(ctx, w, h);

  const cx = w / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#111111";
  ctx.font = `800 118px ${FONT}`;
  ctx.fillText("piece/out", cx, 250);

  ctx.font = `500 36px ${FONT}`;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillText("puzzles you can pop open", cx, 318);

  roundRect(ctx, cx + 310, 168, 248, 118, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.font = `800 34px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("120 pieces", cx + 434, 220);
  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = "#444";
  ctx.fillText("1 hour of your time", cx + 434, 252);

  grain(ctx, w, h, 0.035);
  return wrapToTexture(canvas);
}

/** Lower sleeve: edition name + yellow star. */
export function createLowerLabel(title: string, subtitle: string): THREE.CanvasTexture {
  const w = 2048;
  const h = 512;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  fillPinkLabel(ctx, w, h);
  drawYellowWaves(ctx, w, h);

  const cx = w / 2;
  ctx.textAlign = "center";
  ctx.fillStyle = "#E31B23";
  ctx.font = `800 92px ${FONT}`;
  ctx.fillText(title.toLowerCase(), cx - 40, 250);

  ctx.fillStyle = "#111111";
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText(subtitle.toLowerCase(), cx - 40, 302);

  drawStar(ctx, cx + 420, 230, 34);
  ctx.fillStyle = "#FFD54A";
  ctx.fill();
  ctx.fillStyle = "#111111";
  ctx.font = `700 20px ${FONT}`;
  ctx.fillText("for wall", cx + 420, 290);
  ctx.fillText("or shelf", cx + 420, 314);

  grain(ctx, w, h, 0.035);
  return wrapToTexture(canvas);
}

export function createLidTexture(): THREE.CanvasTexture {
  const s = 512;
  const canvas = makeCanvas(s, s);
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(256, 210, 12, 256, 256, 250);
  g.addColorStop(0, "#f4f6f8");
  g.addColorStop(0.35, "#d0d4d9");
  g.addColorStop(0.7, "#b4b8be");
  g.addColorStop(1, "#8e949c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1.2;
  for (let r = 28; r < 240; r += 13) {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(60,64,70,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 198, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Studio HDR-stand-in: pink bounce + hot strip lights so aluminum reads as metal. */
export function createEnvMapTexture(): THREE.CanvasTexture {
  const canvas = makeCanvas(512, 256);
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#fff7fb");
  g.addColorStop(0.42, "#f3d0da");
  g.addColorStop(0.7, "#e8b4c4");
  g.addColorStop(1, "#c98a9c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 256);

  const strips = [
    [48, 10, 0.95],
    [92, 7, 0.7],
    [210, 18, 1],
    [268, 6, 0.55],
    [380, 12, 0.85],
    [450, 8, 0.6],
  ] as const;
  for (const [x, w, a] of strips) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, 8, w, 150);
  }

  const blob = ctx.createRadialGradient(160, 40, 0, 160, 40, 90);
  blob.addColorStop(0, "rgba(255,255,255,0.65)");
  blob.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = blob;
  ctx.fillRect(0, 0, 512, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Fine horizontal brush so aluminum reads as real metal, not gray plastic. */
export function createBrushedMetalTexture(): THREE.CanvasTexture {
  const s = 512;
  const canvas = makeCanvas(s, s);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#c5c9ce";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 1100; i++) {
    const y = Math.random() * s;
    const light = Math.random() > 0.45;
    ctx.strokeStyle = light ? `rgba(255,255,255,${0.05 + Math.random() * 0.14})` : `rgba(50,54,60,${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(s, y + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 6);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function createFrameLogoTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 128;
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F6C2D0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111111";
  ctx.font = `800 64px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("piece/out", w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function createCardboardTexture(): THREE.CanvasTexture {
  const canvas = makeCanvas(8, 8);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F4B7C5";
  ctx.fillRect(0, 0, 8, 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const artCache = new Map<string, THREE.Texture>();
let loader: THREE.TextureLoader | null = null;

function getLoader() {
  if (!loader) loader = new THREE.TextureLoader();
  return loader;
}

export function loadPuzzleArt(url: string): Promise<THREE.Texture> {
  const hit = artCache.get(url);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        artCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

export function prefetchPuzzleArt(url: string) {
  void loadPuzzleArt(url);
}

export { sourceSize };

"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { useChamberStore } from "@/store/chamberStore";

type Blob = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  gold: boolean;
};

type Speck = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
};

function noise(x: number, y: number) {
  return Math.sin(x) * Math.cos(y * 0.91) + Math.sin((x + y) * 0.47) * 0.45;
}

function flow(x: number, y: number, t: number) {
  const nx = x * 0.0042 + t;
  const ny = y * 0.0038 - t * 0.55;
  const a = noise(nx, ny);
  const b = noise(ny + 2.1, nx - 1.4);
  return Math.atan2(b - a, a + b);
}

function makeSprite(size: number, r: number, g: number, b: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(${r},${g},${b},0.78)`);
  grd.addColorStop(0.32, `rgba(${r},${g},${b},0.28)`);
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

type Ring = { x: number; y: number; r: number; a: number; gold: boolean };

export function Mist() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const mobile = window.matchMedia("(max-width: 800px)").matches;
    const wine = makeSprite(256, 107, 22, 42);
    const gold = makeSprite(192, 196, 165, 116);
    const heat = makeSprite(256, 212, 196, 176);
    const blobCount = mobile ? 16 : 28;
    const speckCount = mobile ? 56 : 130;
    const silkCount = mobile ? 10 : 18;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastPulse = 0;
    let lastSpeedBurst = 0;

    const blobs: Blob[] = [];
    const specks: Speck[] = [];
    const silk = Array.from({ length: silkCount }, () => ({ x: 0, y: 0 }));
    const rings: Ring[] = [];

    const seed = (w: number, h: number) => {
      blobs.length = 0;
      specks.length = 0;
      for (let i = 0; i < blobCount; i++) {
        const cluster = i < blobCount * 0.5;
        blobs.push({
          x: cluster ? w * 0.5 + (Math.random() - 0.5) * w * 0.42 : Math.random() * w,
          y: cluster ? h * 0.52 + (Math.random() - 0.5) * h * 0.38 : Math.random() * h,
          z: 0.4 + Math.random() * 0.85,
          vx: 0,
          vy: 0,
          size: 180 + Math.random() * 280,
          alpha: 0.28 + Math.random() * 0.18,
          gold: i % 3 === 0,
        });
      }
      for (let i = 0; i < speckCount; i++) {
        specks.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: 0.2 + Math.random() * 1,
          vx: 0,
          vy: 0,
          size: 0.6 + Math.random() * 1.6,
        });
      }
      for (const node of silk) {
        node.x = w * 0.5;
        node.y = h * 0.5;
      }
    };

    const resize = () => {
      dpr = Math.min(1.25, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const wrap = (p: { x: number; y: number }, pad: number) => {
      if (p.x < -pad) p.x = width + pad;
      if (p.x > width + pad) p.x = -pad;
      if (p.y < -pad) p.y = height + pad;
      if (p.y > height + pad) p.y = -pad;
    };

    const spawnRing = (x: number, y: number, goldRing: boolean) => {
      if (rings.length > 10) rings.shift();
      rings.push({ x, y, r: 12, a: goldRing ? 0.42 : 0.22, gold: goldRing });
    };

    const tick = (time: number) => {
      if (document.hidden) return;
      const { pointer, progress, hoveringBox, velocity, pulse } = useChamberStore.getState();
      const px = (pointer.x * 0.5 + 0.5) * width;
      const py = (pointer.y * 0.5 + 0.5) * height;
      const speed = Math.min(1.6, Math.hypot(velocity.x, velocity.y) * 18);
      const t = time * 0.12;
      const open = Math.min(1, Math.max(0, (progress - 0.04) / 0.26));
      const dive = Math.min(1, Math.max(0, (progress - 0.2) / 0.64));
      const density = 0.92 + dive * 0.58 - open * 0.08;
      const wake = (hoveringBox ? 1.55 : 1) * (1 + speed * 0.85);

      if (pulse !== lastPulse) {
        lastPulse = pulse;
        spawnRing(px, py, true);
        spawnRing(px, py, false);
      }
      if (speed > 0.35 && time - lastSpeedBurst > 0.18) {
        lastSpeedBurst = time;
        spawnRing(px, py, speed > 0.7);
      }

      ctx.clearRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = (0.12 + speed * 0.18) * density;
      ctx.drawImage(heat, px - 140, py - 140, 280, 280);

      for (const blob of blobs) {
        const ang = flow(blob.x, blob.y, t);
        blob.vx += Math.cos(ang) * 0.022;
        blob.vy += Math.sin(ang) * 0.022 - 0.028;
        const dx = blob.x - px;
        const dy = blob.y - py;
        const d2 = dx * dx + dy * dy + 80;
        const f = (18000 * wake) / d2;
        blob.vx += -dy * f * 0.000012 + velocity.x * 8;
        blob.vy += dx * f * 0.000012 + velocity.y * 8;
        blob.vx *= 0.96;
        blob.vy *= 0.96;
        blob.x += blob.vx;
        blob.y += blob.vy;
        wrap(blob, blob.size);

        const titleY = height * 0.26;
        const boxY = height * 0.5;
        const titleMask = Math.min(1, Math.hypot(blob.x - width * 0.5, blob.y - titleY) / (height * 0.16));
        const nearBox = 1 - Math.min(1, Math.hypot(blob.x - width * 0.5, blob.y - boxY) / (height * 0.32));
        const a = blob.alpha * density * (0.42 + titleMask * 0.58) * (1 + nearBox * 0.35);
        ctx.globalAlpha = a;
        const sprite = blob.gold ? gold : wine;
        const s = blob.size * blob.z;
        ctx.save();
        ctx.translate(blob.x, blob.y);
        ctx.rotate(ang * 0.35);
        ctx.scale(1.55, 0.62);
        ctx.drawImage(sprite, -s / 2, -s / 2, s, s);
        ctx.restore();
      }

      silk[0].x += (px - silk[0].x) * 0.38;
      silk[0].y += (py - silk[0].y) * 0.38;
      for (let i = 1; i < silk.length; i++) {
        const lag = 0.22 - i * 0.006;
        silk[i].x += (silk[i - 1].x - silk[i].x) * lag;
        silk[i].y += (silk[i - 1].y - silk[i].y) * lag;
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(196, 165, 116, 0.55)";
      ctx.lineWidth = 1.35 + speed * 1.4;
      ctx.globalAlpha = (0.22 + speed * 0.35) * density;
      ctx.beginPath();
      ctx.moveTo(silk[0].x, silk[0].y);
      for (let i = 1; i < silk.length - 1; i++) {
        const mx = (silk[i].x + silk[i + 1].x) / 2;
        const my = (silk[i].y + silk[i + 1].y) / 2;
        ctx.quadraticCurveTo(silk[i].x, silk[i].y, mx, my);
      }
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      for (const speck of specks) {
        const ang = flow(speck.x * 1.4, speck.y * 1.4, t * 1.3);
        speck.vx += Math.cos(ang) * 0.03;
        speck.vy += Math.sin(ang) * 0.03 - 0.045;
        const dx = speck.x - px;
        const dy = speck.y - py;
        const d2 = dx * dx + dy * dy + 40;
        speck.vx += (-dy / d2) * 18 * wake + velocity.x * 22;
        speck.vy += (dx / d2) * 18 * wake + velocity.y * 22;
        speck.vx *= 0.94;
        speck.vy *= 0.94;
        speck.x += speck.vx;
        speck.y += speck.vy;
        wrap(speck, 12);

        const near = 1 - Math.min(1, Math.hypot(speck.x - px, speck.y - py) / 280);
        ctx.globalAlpha = (0.18 + near * 0.45 + speed * 0.12) * density * speck.z;
        ctx.fillStyle = speck.z > 0.7 ? "#c4a574" : "#8a3a4c";
        ctx.beginPath();
        ctx.arc(speck.x, speck.y, speck.size * speck.z * (1 + near * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += 2.4 + speed * 1.6;
        ring.a *= 0.955;
        if (ring.a < 0.02) {
          rings.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = ring.a * density;
        ctx.strokeStyle = ring.gold ? "rgba(196, 165, 116, 0.9)" : "rgba(107, 15, 42, 0.7)";
        ctx.lineWidth = ring.gold ? 1.1 : 0.7;
        ctx.beginPath();
        ctx.ellipse(ring.x, ring.y, ring.r * 1.35, ring.r * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="emp-mist" aria-hidden />;
}

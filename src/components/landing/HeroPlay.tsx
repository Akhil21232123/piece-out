"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { edgesFor } from "@/lib/jigsaw";
import { jigPad, jigSvgPath, jigViewBox } from "@/lib/jigSvg";

gsap.registerPlugin(useGSAP);

const ART = "/products/diet-coke-puzzle.jpg";
const COLS = 3;
const ROWS = 4;
const COUNT = COLS * ROWS;
const VW = 100;
const VH = 132;

const PIECES = Array.from({ length: COUNT }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const edges = edgesFor(col, row, COLS, ROWS);
  const d = jigSvgPath(VW, edges, VH);
  const pad = jigPad(Math.min(VW, VH));
  const boxW = VW + pad * 2;
  const boxH = VH + pad * 2;
  const mask = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${jigViewBox(VW, VH)}" preserveAspectRatio="none"><path fill="#fff" d="${d}"/></svg>`,
  )}")`;
  return {
    i,
    col,
    row,
    d,
    box: jigViewBox(VW, VH),
    pad,
    mask,
    artW: ((COLS * VW) / boxW) * 100,
    artH: ((ROWS * VH) / boxH) * 100,
    artL: ((pad - col * VW) / boxW) * 100,
    artT: ((pad - row * VH) / boxH) * 100,
  };
});

function shuffleSlots() {
  const slots = PIECES.map((_, i) => i);
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

export function HeroPlay() {
  "use no memo";
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLButtonElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const stage = stageRef.current;
      const board = boardRef.current;
      const tray = trayRef.current;
      const stamp = stampRef.current;
      const hint = hintRef.current;
      if (!root || !stage || !board || !tray) return;

      const pieces = gsap.utils.toArray<HTMLElement>(stage.querySelectorAll("[data-hero-piece]"));
      const slots = gsap.utils.toArray<HTMLElement>(tray.querySelectorAll("[data-tray-slot]"));
      if (pieces.length !== COUNT || slots.length !== COUNT) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const phone = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 720;
      const boardHome = pieces.map(() => ({ x: 0, y: 0 }));
      const trayHome = slots.map(() => ({ x: 0, y: 0 }));
      const placed = pieces.map(() => false);
      const trayOf = pieces.map(() => -1);
      const trayOwner = slots.map(() => -1);
      const prefer = pieces.map(() => -1);
      const pos = pieces.map(() => ({ x: 0, y: 0, s: 1 }));
      let pieceW = 80;
      let pieceH = 100;
      let trayScale = 0.7;
      let done = false;
      let winAt = 0;
      let dragging = -1;
      let pid = -1;
      let ox = 0;
      let oy = 0;
      let sx = 0;
      let sy = 0;
      let lastBoardW = 0;
      let laid = false;

      const preload = new Image();
      preload.decoding = "async";
      preload.src = ART;

      const setHint = (text: string) => {
        if (hint) hint.textContent = text;
      };

      const paint = (i: number) => {
        pieces[i].style.transform = `translate3d(${pos[i].x}px,${pos[i].y}px,0) scale(${pos[i].s})`;
      };

      const showWin = (on: boolean) => {
        done = on;
        if (on) winAt = Date.now();
        root.classList.toggle("is-won", on);
        if (stamp) {
          gsap.to(stamp, {
            autoAlpha: on ? 1 : 0,
            scale: on ? 1 : 1.2,
            duration: reduced ? 0 : 0.32,
            ease: "back.out(2)",
            overwrite: "auto",
          });
        }
        setHint(on ? "solved. tap to scramble." : "drag a piece from the tray.");
      };

      const moveTo = (i: number, x: number, y: number, scale: number, duration: number) => {
        gsap.killTweensOf(pos[i]);
        if (duration <= 0) {
          pos[i].x = x;
          pos[i].y = y;
          pos[i].s = scale;
          paint(i);
          return;
        }
        gsap.to(pos[i], {
          x,
          y,
          s: scale,
          duration,
          ease: "power3.out",
          overwrite: "auto",
          onUpdate: () => paint(i),
        });
      };

      const freeTray = (i: number) => {
        const slot = trayOf[i];
        if (slot >= 0 && trayOwner[slot] === i) trayOwner[slot] = -1;
        trayOf[i] = -1;
      };

      const seatBoard = (i: number, duration: number) => {
        freeTray(i);
        placed[i] = true;
        pieces[i].style.zIndex = "3";
        moveTo(i, boardHome[i].x, boardHome[i].y, 1, duration);
        if (placed.every(Boolean)) showWin(true);
      };

      const seatTray = (i: number, slot: number, duration: number) => {
        const bay = ((slot % COUNT) + COUNT) % COUNT;
        freeTray(i);
        placed[i] = false;
        trayOf[i] = bay;
        trayOwner[bay] = i;
        prefer[i] = bay;
        pieces[i].style.zIndex = "2";
        moveTo(i, trayHome[bay].x, trayHome[bay].y, trayScale, duration);
      };

      const nearestEmptyTray = (x: number, y: number, liked: number) => {
        let best = liked >= 0 && trayOwner[liked] < 0 ? liked : -1;
        let bestD = best >= 0 ? (x - trayHome[best].x) ** 2 + (y - trayHome[best].y) ** 2 : Infinity;
        for (let s = 0; s < COUNT; s += 1) {
          if (trayOwner[s] >= 0) continue;
          const d = (x - trayHome[s].x) ** 2 + (y - trayHome[s].y) ** 2;
          if (d < bestD) {
            best = s;
            bestD = d;
          }
        }
        if (best >= 0) return best;
        return trayOwner.findIndex((owner) => owner < 0);
      };

      const cellBox = (i: number) => {
        const box = board.getBoundingClientRect();
        const cw = box.width / COLS;
        const ch = box.height / ROWS;
        const { col, row } = PIECES[i];
        return {
          left: box.left + col * cw,
          top: box.top + row * ch,
          right: box.left + (col + 1) * cw,
          bottom: box.top + (row + 1) * ch,
          cx: box.left + (col + 0.5) * cw,
          cy: box.top + (row + 0.5) * ch,
          w: cw,
          h: ch,
        };
      };

      const inHome = (i: number, pointer?: { x: number; y: number }) => {
        const cell = cellBox(i);
        const box = pieces[i].getBoundingClientRect();
        const pcx = box.left + box.width / 2;
        const pcy = box.top + box.height / 2;
        const near =
          Math.abs(pcx - cell.cx) <= cell.w * 0.78 && Math.abs(pcy - cell.cy) <= cell.h * 0.78;
        if (near) return true;
        if (!pointer) return false;
        return (
          pointer.x >= cell.left - cell.w * 0.28 &&
          pointer.x <= cell.right + cell.w * 0.28 &&
          pointer.y >= cell.top - cell.h * 0.28 &&
          pointer.y <= cell.bottom + cell.h * 0.28
        );
      };

      const drop = (i: number, pointer?: { x: number; y: number }) => {
        pieces[i].classList.remove("is-hot", "is-lift");
        if (inHome(i, pointer)) {
          seatBoard(i, reduced ? 0 : 0.2);
          return;
        }
        const slot = nearestEmptyTray(pos[i].x, pos[i].y, prefer[i]);
        seatTray(i, slot < 0 ? 0 : slot, reduced ? 0 : 0.24);
      };

      const finish = (i: number, pointer?: { x: number; y: number }) => {
        if (dragging !== i) return;
        dragging = -1;
        pid = -1;
        drop(i, pointer);
      };

      const parkShuffled = (animate: boolean) => {
        showWin(false);
        trayOwner.fill(-1);
        const order = shuffleSlots();
        pieces.forEach((el, i) => {
          placed[i] = false;
          el.style.zIndex = "2";
          seatTray(i, order[i], animate && !reduced ? 0.32 : 0);
        });
      };

      const layout = () => {
        if (dragging >= 0) return;
        const stageBox = stage.getBoundingClientRect();
        let boardBox = board.getBoundingClientRect();
        if (boardBox.width < 24 || boardBox.height < 24) {
          const fallback = Math.min(root.getBoundingClientRect().width || 220, phone ? 220 : 264);
          if (fallback >= 80) {
            board.style.width = `${fallback}px`;
            boardBox = board.getBoundingClientRect();
          }
        }
        const cellW = boardBox.width / COLS;
        const cellH = boardBox.height / ROWS;
        if (cellW < 8 || cellH < 8) return;
        if (phone && laid && Math.abs(boardBox.width - lastBoardW) < 2) return;
        const padX = (PIECES[0].pad / VW) * cellW;
        const padY = (PIECES[0].pad / VH) * cellH;
        pieceW = cellW + padX * 2;
        pieceH = cellH + padY * 2;

        pieces.forEach((el, i) => {
          const piece = PIECES[i];
          el.style.width = `${pieceW}px`;
          el.style.height = `${pieceH}px`;
          boardHome[i] = {
            x: boardBox.left - stageBox.left + piece.col * cellW - padX,
            y: boardBox.top - stageBox.top + piece.row * cellH - padY,
          };
        });

        const first = slots[0].getBoundingClientRect();
        if (first.width < 24 || first.height < 24) return;
        trayScale = Math.min(first.width / pieceW, first.height / pieceH) * 0.86;
        if (!Number.isFinite(trayScale) || trayScale <= 0) trayScale = 0.55;

        slots.forEach((slot, s) => {
          const r = slot.getBoundingClientRect();
          trayHome[s] = {
            x: r.left - stageBox.left + (r.width - pieceW) / 2,
            y: r.top - stageBox.top + (r.height - pieceH) / 2,
          };
        });

        lastBoardW = boardBox.width;
        laid = true;
        pieces.forEach((_, i) => {
          if (placed[i]) moveTo(i, boardHome[i].x, boardHome[i].y, 1, 0);
          else if (trayOf[i] >= 0) moveTo(i, trayHome[trayOf[i]].x, trayHome[trayOf[i]].y, trayScale, 0);
        });
      };

      pieces.forEach((el) => {
        el.style.transformOrigin = "50% 50%";
      });
      parkShuffled(false);
      layout();

      if (reduced) {
        pieces.forEach((_, i) => seatBoard(i, 0));
        setHint("Diet Coke. 150 pieces.");
      } else {
        setHint("drag a piece from the tray.");
      }
      if (stamp) gsap.set(stamp, { autoAlpha: 0, scale: 1.25, rotation: -8 });

      const lift = (i: number) => {
        prefer[i] = trayOf[i];
        if (placed[i]) {
          placed[i] = false;
          if (done) showWin(false);
        }
        freeTray(i);
        pieces[i].style.zIndex = "8";
        pieces[i].classList.add("is-lift");
        pos[i].s = 1.03;
        paint(i);
      };

      const start = (i: number, x: number, y: number, pointerId: number) => {
        if (dragging >= 0 && dragging !== i) return;
        gsap.killTweensOf(pos[i]);
        dragging = i;
        pid = pointerId;
        ox = pos[i].x;
        oy = pos[i].y;
        sx = x;
        sy = y;
        lift(i);
      };

      const move = (x: number, y: number) => {
        if (dragging < 0) return;
        pos[dragging].x = ox + x - sx;
        pos[dragging].y = oy + y - sy;
        paint(dragging);
        pieces[dragging].classList.toggle("is-hot", inHome(dragging, { x, y }));
      };

      const onPointerDown = (event: PointerEvent) => {
        const el = event.currentTarget as HTMLElement;
        const i = Number(el.dataset.heroPiece);
        if (!Number.isFinite(i)) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        start(i, event.clientX, event.clientY, event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (dragging < 0) return;
        if (pid >= 0 && event.pointerId !== pid) return;
        move(event.clientX, event.clientY);
      };

      const onPointerUp = (event: PointerEvent) => {
        if (dragging < 0) return;
        if (pid >= 0 && event.pointerId !== pid) return;
        finish(dragging, { x: event.clientX, y: event.clientY });
      };

      pieces.forEach((el, i) => {
        el.dataset.heroPiece = String(i);
        el.addEventListener("pointerdown", onPointerDown, { passive: true });
      });
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp, { passive: true });
      window.addEventListener("pointercancel", onPointerUp, { passive: true });

      const onBlur = () => {
        if (dragging >= 0) finish(dragging);
      };
      window.addEventListener("blur", onBlur);
      document.addEventListener("visibilitychange", onBlur);

      layout();
      root.classList.add("is-ready");

      const safe = contextSafe ?? ((fn: () => void) => fn);
      const onReplay = safe(() => {
        if (done && Date.now() - winAt > 350) parkShuffled(true);
      });
      stamp?.addEventListener("click", onReplay);
      hint?.addEventListener("click", onReplay);

      let layoutRaf = 0;
      const requestLayout = () => {
        if (dragging >= 0) return;
        if (layoutRaf) cancelAnimationFrame(layoutRaf);
        layoutRaf = requestAnimationFrame(() => {
          layoutRaf = 0;
          layout();
        });
      };
      const ro = new ResizeObserver(() => requestLayout());
      ro.observe(root);
      ro.observe(board);
      ro.observe(tray);

      return () => {
        stamp?.removeEventListener("click", onReplay);
        hint?.removeEventListener("click", onReplay);
        if (dragging >= 0) finish(dragging);
        if (layoutRaf) cancelAnimationFrame(layoutRaf);
        ro.disconnect();
        pieces.forEach((el) => el.removeEventListener("pointerdown", onPointerDown));
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        window.removeEventListener("blur", onBlur);
        document.removeEventListener("visibilitychange", onBlur);
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="hero-play">
      <div className="hero-table">
        <div ref={boardRef} className="hero-board" aria-hidden>
          <div className="hero-board-cells">
            {PIECES.map((piece) => (
              <div key={`cell-${piece.i}`} className="hero-board-cell" />
            ))}
          </div>
        </div>
        <span ref={stampRef} className="hero-snap-stamp" aria-hidden>
          snap
        </span>
      </div>
      <div className="hero-tray">
        <p className="hero-tray-label">the pieces</p>
        <div ref={trayRef} className="hero-tray-grid">
          {PIECES.map((piece) => (
            <div key={`slot-${piece.i}`} data-tray-slot className="hero-tray-slot" />
          ))}
        </div>
      </div>
      <div ref={stageRef} className="hero-stage">
        {PIECES.map((piece) => (
          <div
            key={piece.i}
            data-hero-piece={piece.i}
            className="hero-piece"
            role="button"
            tabIndex={0}
            draggable={false}
            aria-label={`puzzle piece ${piece.i + 1}`}
            style={{
              WebkitMaskImage: piece.mask,
              maskImage: piece.mask,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
            }}
          >
            <span
              className="hero-piece-art"
              style={{
                width: `${piece.artW}%`,
                height: `${piece.artH}%`,
                left: `${piece.artL}%`,
                top: `${piece.artT}%`,
                backgroundImage: `url(${ART})`,
              }}
            />
            <svg className="hero-piece-svg" viewBox={piece.box} preserveAspectRatio="none" aria-hidden>
              <path d={piece.d} className="hero-piece-edge" />
            </svg>
          </div>
        ))}
      </div>
      <button ref={hintRef} type="button" className="hero-lock-hint">
        drag a piece from the tray.
      </button>
    </div>
  );
}

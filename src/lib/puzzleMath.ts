import * as THREE from "three";
import { type PuzzleLayout, DESKTOP_LAYOUT } from "@/types/scroll";
import { CAN } from "@/lib/can";

export interface PieceAttributes {
  startPos: Float32Array;
  scatterPos: Float32Array;
  targetPos: Float32Array;
  staggerDelay: Float32Array;
  random: Float32Array;
  uvOffset: Float32Array;
  uvScale: Float32Array;
}

function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Pieces pack INSIDE the can (local space), shoot out the lid toward
 * the camera (+Z), then lock into a poster in front — never behind.
 */
export function buildPieceAttributes(layout: PuzzleLayout = DESKTOP_LAYOUT): PieceAttributes {
  const { cols, rows, pieceCount, wallWidth, wallHeight, wallX, wallY, wallZ } = layout;
  const count = Math.min(pieceCount, cols * rows);

  const startPos = new Float32Array(count * 3);
  const scatterPos = new Float32Array(count * 3);
  const targetPos = new Float32Array(count * 3);
  const staggerDelay = new Float32Array(count);
  const random = new Float32Array(count);
  const uvOffset = new Float32Array(count * 2);
  const uvScale = new Float32Array(count * 2);

  const cellW = wallWidth / cols;
  const cellH = wallHeight / rows;
  const winH = CAN.windowMax - CAN.windowMin - 0.08;

  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const i3 = i * 3;
    const t = i / count;

    const a = hash(i, 1) * Math.PI * 2;
    const rad = 0.05 + hash(i, 2) * 0.21;
    startPos[i3] = Math.cos(a) * rad;
    startPos[i3 + 1] = CAN.windowMin + 0.04 + hash(i, 3) * winH;
    startPos[i3 + 2] = Math.sin(a) * rad;

    const burstA = t * Math.PI * 2 + hash(i, 4) * 1.4;
    const spread = 0.45 + t * 1.35;
    scatterPos[i3] = Math.cos(burstA) * spread * 1.05;
    scatterPos[i3 + 1] = 0.7 + Math.abs(Math.sin(burstA * 1.2)) * 1.25 + hash(i, 5) * 0.25;
    scatterPos[i3 + 2] = 2.15 + t * 1.05 + hash(i, 6) * 0.12;

    targetPos[i3] = wallX + (col + 0.5) * cellW - wallWidth / 2;
    targetPos[i3 + 1] = wallY + wallHeight / 2 - (row + 0.5) * cellH;
    targetPos[i3 + 2] = wallZ;

    staggerDelay[i] = (col / cols) * 0.22 + (row / rows) * 0.35 + hash(i, 7) * 0.08;
    random[i] = hash(i, 8);

    const i2 = i * 2;
    uvOffset[i2] = col / cols;
    uvOffset[i2 + 1] = 1 - (row + 1) / rows;
    uvScale[i2] = 1 / cols;
    uvScale[i2 + 1] = 1 / rows;
  }

  return { startPos, scatterPos, targetPos, staggerDelay, random, uvOffset, uvScale };
}

export function createPuzzlePieceGeometry(
  width = 0.32,
  height = 0.32,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const tab = Math.min(width, height) * 0.2;
  const corner = Math.min(width, height) * 0.055;

  shape.moveTo(-hw + corner, -hh);
  shape.lineTo(-tab * 0.48, -hh);
  shape.quadraticCurveTo(0, -hh - tab, tab * 0.48, -hh);
  shape.lineTo(hw - corner, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + corner);
  shape.lineTo(hw, -tab * 0.48);
  shape.quadraticCurveTo(hw + tab, 0, hw, tab * 0.48);
  shape.lineTo(hw, hh - corner);
  shape.quadraticCurveTo(hw, hh, hw - corner, hh);
  shape.lineTo(tab * 0.48, hh);
  shape.quadraticCurveTo(0, hh - tab * 0.62, -tab * 0.48, hh);
  shape.lineTo(-hw + corner, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - corner);
  shape.lineTo(-hw, tab * 0.48);
  shape.quadraticCurveTo(-hw + tab * 0.62, 0, -hw, -tab * 0.48);
  shape.lineTo(-hw, -hh + corner);
  shape.quadraticCurveTo(-hw, -hh, -hw + corner, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.052,
    bevelEnabled: true,
    bevelThickness: 0.007,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.center();
  geo.rotateX(Math.PI);
  geo.computeVertexNormals();
  return geo;
}

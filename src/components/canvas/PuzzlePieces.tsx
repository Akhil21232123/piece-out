"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollStore } from "@/store/scrollStore";
import { getPuzzleLayout } from "@/types/scroll";
import { buildPieceAttributes, createPuzzlePieceGeometry } from "@/lib/puzzleMath";
import { usePuzzleMaps } from "@/hooks/usePuzzleMaps";
import { useMediaStore } from "@/store/mediaStore";
import { poseToMatrix, sampleCanPose } from "@/lib/can";
import { createCardboardTexture } from "@/lib/textures";

const vertexShader = /* glsl */ `
attribute vec3 aStartPos;
attribute vec3 aScatterPos;
attribute vec3 aTargetPos;
attribute float aStaggerDelay;
attribute float aRandom;
attribute vec2 aUvOffset;
attribute vec2 aUvScale;

uniform float uProgress;
uniform float uTime;
uniform mat4 uCanMatrix;

varying vec2 vUv;
varying float vAssemble;
varying float vLock;
varying vec3 vNormalW;
varying float vErupt;

float easeOutCubic(float t) {
  float inv = 1.0 - t;
  return 1.0 - inv * inv * inv;
}

float easeInOutCubic(float t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

void main() {
  vUv = aUvOffset + uv * aUvScale;
  float delay = aStaggerDelay;

  float eruptStart = 0.28 + delay * 0.1;
  float eruptEnd = 0.5 + delay * 0.05;
  float eruptT = clamp((uProgress - eruptStart) / max(0.001, eruptEnd - eruptStart), 0.0, 1.0);
  eruptT = easeOutCubic(eruptT);
  vErupt = eruptT;

  float assembleStart = 0.5 + delay * 0.08;
  float assembleEnd = 0.8 + delay * 0.04;
  float assembleT = clamp((uProgress - assembleStart) / max(0.001, assembleEnd - assembleStart), 0.0, 1.0);
  assembleT = easeInOutCubic(assembleT);
  vAssemble = assembleT;
  vLock = smoothstep(0.8, 0.96, uProgress);

  vec3 startWorld = (uCanMatrix * vec4(aStartPos, 1.0)).xyz;
  vec3 mouthLocal = vec3(aStartPos.x * 0.12, 0.63, aStartPos.z * 0.12);
  vec3 mouthWorld = (uCanMatrix * vec4(mouthLocal, 1.0)).xyz;

  float upT = easeOutCubic(clamp(eruptT / 0.42, 0.0, 1.0));
  float outT = easeOutCubic(clamp((eruptT - 0.18) / 0.82, 0.0, 1.0));
  vec3 pos = mix(startWorld, mouthWorld, upT);
  pos = mix(pos, aScatterPos, outT);
  pos = mix(pos, aTargetPos, assembleT);

  float tumble = (1.0 - assembleT) * (0.25 + eruptT * 0.85);
  float ang = aRandom * 6.28318 + uTime * 0.4 * (1.0 - assembleT);
  float c = cos(ang * tumble);
  float s = sin(ang * tumble);
  mat3 rotY = mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);

  vec3 localPos = rotY * position;
  float scale = mix(0.2, 1.0, mix(0.35, 1.0, eruptT));
  scale = mix(scale, 1.0, assembleT);
  localPos *= scale;

  vNormalW = normalize(mat3(modelMatrix) * rotY * normal);

  vec4 world = vec4(pos + localPos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uProgress;
uniform float uSpecularSweep;

varying vec2 vUv;
varying float vAssemble;
varying float vLock;
varying vec3 vNormalW;
varying float vErupt;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 color;
  if (gl_FrontFacing) {
    color = texture2D(uMap, vUv).rgb;
  } else {
    N = -N;
    color = vec3(0.957, 0.718, 0.773);
  }

  vec3 L = normalize(vec3(0.45, 0.85, 0.55));
  float diff = 0.74 + 0.36 * max(dot(N, L), 0.0);
  vec3 hemi = mix(vec3(0.93, 0.84, 0.88), vec3(1.04, 1.02, 1.03), N.y * 0.5 + 0.5);
  color *= diff * hemi;

  float sweep = smoothstep(uSpecularSweep - 0.1, uSpecularSweep, vUv.x)
              * (1.0 - smoothstep(uSpecularSweep, uSpecularSweep + 0.1, vUv.x));
  color += vec3(0.16) * sweep * vLock;

  gl_FragColor = vec4(color, 1.0);
}
`;

const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

export function PuzzlePieces() {
  const isMobile = useMediaStore((s) => s.isMobile);
  const chapterIndex = useScrollStore((s) => s.chapterIndex);
  const { art } = usePuzzleMaps(chapterIndex);
  const layout = getPuzzleLayout(isMobile);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const canMatrix = useMemo(() => new THREE.Matrix4(), []);
  const cardboard = useMemo(() => createCardboardTexture(), []);

  const count = layout.pieceCount;
  const geometry = useMemo(
    () =>
      createPuzzlePieceGeometry(
        (layout.wallWidth / layout.cols) * 0.92,
        (layout.wallHeight / layout.rows) * 0.92,
      ),
    [layout],
  );
  const attrs = useMemo(() => buildPieceAttributes(layout), [layout]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uMap: { value: cardboard },
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uSpecularSweep: { value: -0.2 },
          uCanMatrix: { value: canMatrix },
        },
        transparent: false,
        side: THREE.DoubleSide,
        depthWrite: true,
        toneMapped: false,
      }),
    [canMatrix, cardboard],
  );

  useEffect(() => {
    if (art) material.uniforms.uMap.value = art;
  }, [art, material]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geo = mesh.geometry;
    geo.setAttribute("aStartPos", new THREE.InstancedBufferAttribute(attrs.startPos, 3));
    geo.setAttribute("aScatterPos", new THREE.InstancedBufferAttribute(attrs.scatterPos, 3));
    geo.setAttribute("aTargetPos", new THREE.InstancedBufferAttribute(attrs.targetPos, 3));
    geo.setAttribute("aStaggerDelay", new THREE.InstancedBufferAttribute(attrs.staggerDelay, 1));
    geo.setAttribute("aRandom", new THREE.InstancedBufferAttribute(attrs.random, 1));
    geo.setAttribute("aUvOffset", new THREE.InstancedBufferAttribute(attrs.uvOffset, 2));
    geo.setAttribute("aUvScale", new THREE.InstancedBufferAttribute(attrs.uvScale, 2));

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [attrs, count]);

  useFrame(({ clock }) => {
    const { chapterProgress, wallLock, inCatalog, lidOpen } = useScrollStore.getState();
    const mat = materialRef.current ?? material;
    const pose = sampleCanPose(chapterProgress, inCatalog, clock.elapsedTime, lidOpen);
    poseToMatrix(pose, canMatrix, _p, _q, _s, _e);
    mat.uniforms.uCanMatrix.value = canMatrix;
    mat.uniforms.uProgress.value = inCatalog ? chapterProgress : 0;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uSpecularSweep.value = -0.2 + wallLock * 1.4;
  });

  return (
    <instancedMesh
      key={`${isMobile ? "m" : "d"}-${count}`}
      ref={meshRef}
      args={[geometry, material, count]}
      frustumCulled={false}
      castShadow
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </instancedMesh>
  );
}

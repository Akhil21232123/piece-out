"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollStore } from "@/store/scrollStore";
import { useShopStore } from "@/store/shopStore";
import { getPuzzleLayout } from "@/types/scroll";
import { useMediaStore } from "@/store/mediaStore";
import { createFrameLogoTexture } from "@/lib/textures";

export function GalleryWall() {
  const frameRef = useRef<THREE.Group>(null);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const isMobile = useMediaStore((s) => s.isMobile);
  const { wallWidth, wallHeight, wallX, wallY, wallZ } = getPuzzleLayout(isMobile);

  const frameMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#F6C2D0",
        metalness: 0.02,
        roughness: 0.7,
        envMapIntensity: 0.18,
      }),
    [],
  );
  const logoMap = useMemo(() => createFrameLogoTexture(), []);

  useFrame(() => {
    const { chapterProgress, inCatalog } = useScrollStore.getState();
    const withFrame = useShopStore.getState().withFrame;
    const reveal = inCatalog ? THREE.MathUtils.smoothstep(chapterProgress, 0.48, 0.66) : 0;
    const want = withFrame ? reveal : 0;
    const group = frameRef.current;
    if (!group) return;
    group.visible = want > 0.02;
    const spread = (1 - want) * 0.22;
    const [top, bot, left, right] = bars.current;
    if (top) top.position.y = wallHeight / 2 + 0.06 + spread;
    if (bot) bot.position.y = -wallHeight / 2 - 0.06 - spread;
    if (left) left.position.x = -wallWidth / 2 - 0.06 - spread;
    if (right) right.position.x = wallWidth / 2 + 0.06 + spread;
  });

  const thick = 0.12;
  const depth = 0.1;
  const hw = wallWidth / 2;
  const hh = wallHeight / 2;

  return (
    <group>
      <group ref={frameRef} position={[wallX, wallY, wallZ - 0.05]}>
        <mesh
          ref={(el) => {
            bars.current[0] = el;
          }}
          position={[0, hh + thick / 2, 0]}
          castShadow
          material={frameMat}
        >
          <boxGeometry args={[wallWidth + thick * 2, thick, depth]} />
        </mesh>
        <mesh
          ref={(el) => {
            bars.current[1] = el;
          }}
          position={[0, -hh - thick / 2, 0]}
          castShadow
          material={frameMat}
        >
          <boxGeometry args={[wallWidth + thick * 2, thick, depth]} />
        </mesh>
        <mesh
          ref={(el) => {
            bars.current[2] = el;
          }}
          position={[-hw - thick / 2, 0, 0]}
          castShadow
          material={frameMat}
        >
          <boxGeometry args={[thick, wallHeight, depth]} />
        </mesh>
        <mesh
          ref={(el) => {
            bars.current[3] = el;
          }}
          position={[hw + thick / 2, 0, 0]}
          castShadow
          material={frameMat}
        >
          <boxGeometry args={[thick, wallHeight, depth]} />
        </mesh>

        {[
          [-hw, hh],
          [hw, hh],
          [-hw, -hh],
          [hw, -hh],
        ].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.01]} castShadow material={frameMat}>
            <boxGeometry args={[0.2, 0.2, depth + 0.02]} />
          </mesh>
        ))}

        <mesh position={[0, -hh - thick / 2, depth / 2 + 0.002]}>
          <planeGeometry args={[1.15, 0.075]} />
          <meshBasicMaterial map={logoMap} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

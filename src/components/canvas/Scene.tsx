"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { FloatingCans } from "./CanContainer";
import { PuzzlePieces } from "./PuzzlePieces";
import { GalleryWall } from "./GalleryWall";
import { useScrollStore } from "@/store/scrollStore";
import { createEnvMapTexture } from "@/lib/textures";
import { useMediaStore } from "@/store/mediaStore";
import { SPACE } from "@/types/scroll";
import { prefetchHeroSet } from "@/hooks/usePuzzleMaps";

const PINK = "#F6D0DA";

function CameraRig() {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(SPACE.lookAt.x, SPACE.lookAt.y, SPACE.lookAt.z), []);

  useFrame(() => {
    const { inCatalog, chapterProgress } = useScrollStore.getState();
    const settle = inCatalog ? Math.min(1, chapterProgress / 0.18) : 0;
    const assemble = inCatalog ? THREE.MathUtils.smoothstep(chapterProgress, 0.42, 0.78) : 0;
    const x = THREE.MathUtils.lerp(0.62, SPACE.camera.x, settle);
    const z = THREE.MathUtils.lerp(SPACE.camera.z, 5.55, assemble);
    const y = THREE.MathUtils.lerp(SPACE.camera.y, 1.08, assemble);
    camera.position.x = THREE.MathUtils.damp(camera.position.x, x, 5.5, 0.016);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, y, 5.5, 0.016);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 5.5, 0.016);
    look.x = THREE.MathUtils.lerp(0.08, 0.48, assemble);
    look.y = THREE.MathUtils.lerp(0.55, 1.02, assemble);
    look.z = THREE.MathUtils.lerp(0.25, 1.4, assemble);
    camera.lookAt(look);
  });

  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.62} color="#ffeef3" />
      <directionalLight
        position={[4.2, 5.8, 4.6]}
        intensity={1.85}
        color="#fff7fb"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-4.2, 2.4, 2.2]} intensity={0.55} color="#ffd0dc" />
      <pointLight position={[1.6, 2.2, 2.8]} intensity={0.4} color="#ffe27a" distance={11} />
    </>
  );
}

function Experience() {
  const envMap = useMemo(() => createEnvMapTexture(), []);
  const isMobile = useMediaStore((s) => s.isMobile);

  useEffect(() => {
    prefetchHeroSet();
  }, []);

  return (
    <>
      <color attach="background" args={[PINK]} />
      <PerspectiveCamera
        makeDefault
        position={[SPACE.camera.x, SPACE.camera.y, SPACE.camera.z]}
        fov={36}
        near={0.1}
        far={40}
      />
      <CameraRig />
      <Lights />
      <Environment map={envMap} environmentIntensity={0.95} />
      <FloatingCans />
      <PuzzlePieces />
      <GalleryWall key={isMobile ? "m" : "d"} />
    </>
  );
}

export default function Scene() {
  const isMobile = useMediaStore((s) => s.isMobile);

  return (
    <Canvas
      className="!fixed inset-0 z-0 h-screen w-screen"
      dpr={isMobile ? [1, 1.25] : [1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      shadows={!isMobile}
    >
      <Experience />
    </Canvas>
  );
}

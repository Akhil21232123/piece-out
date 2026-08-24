"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useScrollStore } from "@/store/scrollStore";
import { usePuzzleMaps } from "@/hooks/usePuzzleMaps";
import {
  CAN,
  createCanBottomGeometry,
  createCanTopGeometry,
  poseToMatrix,
  sampleCanPose,
} from "@/lib/can";
import { createBrushedMetalTexture, createLidTexture, createLowerLabel, createUpperLabel } from "@/lib/textures";

const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

export function CanContainer({ puzzleIndex = 0 }: { puzzleIndex?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const hingeRef = useRef<THREE.Group>(null);
  const tabRef = useRef<THREE.Group>(null);
  const { puzzle } = usePuzzleMaps(puzzleIndex);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    void document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  const aluminum = useMemo(() => {
    const brush = createBrushedMetalTexture();
    return new THREE.MeshStandardMaterial({
      color: "#d2d6db",
      map: brush,
      roughnessMap: brush,
      metalness: 0.97,
      roughness: 0.28,
      envMapIntensity: 2.35,
    });
  }, []);
  const aluminumDark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8b9098",
        metalness: 0.9,
        roughness: 0.32,
        envMapIntensity: 1.3,
        side: THREE.BackSide,
      }),
    [],
  );
  const tabMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d7dbe0",
        metalness: 0.98,
        roughness: 0.16,
        envMapIntensity: 2,
      }),
    [],
  );

  const upperMap = useMemo(() => createUpperLabel(), [fontsReady]);
  const lowerMap = useMemo(
    () => createLowerLabel(puzzle.name, puzzle.subtitle),
    [fontsReady, puzzle.name, puzzle.subtitle],
  );
  const lidMap = useMemo(() => createLidTexture(), []);

  const upperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: upperMap,
        color: "#ffffff",
        metalness: 0,
        roughness: 0.68,
        envMapIntensity: 0.12,
        side: THREE.DoubleSide,
      }),
    [upperMap],
  );
  const lowerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: lowerMap,
        color: "#ffffff",
        metalness: 0,
        roughness: 0.68,
        envMapIntensity: 0.12,
        side: THREE.DoubleSide,
      }),
    [lowerMap],
  );
  const lidMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: lidMap,
        color: "#dfe3e8",
        metalness: 0.94,
        roughness: 0.2,
        envMapIntensity: 1.7,
        side: THREE.DoubleSide,
      }),
    [lidMap],
  );

  const bottomGeo = useMemo(() => createCanBottomGeometry(), []);
  const topGeo = useMemo(() => createCanTopGeometry(), []);

  useFrame(({ clock }) => {
    const { lidOpen, chapterProgress, inCatalog } = useScrollStore.getState();
    const group = groupRef.current;
    if (!group) return;

    const pose = sampleCanPose(chapterProgress, inCatalog, clock.elapsedTime, lidOpen);
    poseToMatrix(pose, _m, _p, _q, _s, _e);
    group.position.copy(_p);
    group.quaternion.copy(_q);
    group.scale.copy(_s);

    const open = inCatalog ? lidOpen : 0;
    const tabLift = THREE.MathUtils.smoothstep(open, 0, 0.38);
    const peel = THREE.MathUtils.smoothstep(open, 0.18, 1);

    if (tabRef.current) {
      tabRef.current.rotation.x = -tabLift * 1.55;
      tabRef.current.position.y = 0.01 + tabLift * 0.02;
    }
    if (hingeRef.current) {
      hingeRef.current.rotation.x = -peel * 2.05;
      hingeRef.current.visible = peel < 0.98;
    }
  });

  const r = CAN.radius;
  const yT = CAN.height / 2;
  const upperTop = yT - 0.165;
  const upperH = upperTop - CAN.windowMax;
  const upperY = (upperTop + CAN.windowMax) / 2;
  const lowerBot = -CAN.height / 2 + 0.145;
  const lowerH = CAN.windowMin - lowerBot;
  const lowerY = (CAN.windowMin + lowerBot) / 2;
  const windowH = CAN.windowMax - CAN.windowMin;
  const windowY = (CAN.windowMax + CAN.windowMin) / 2;
  const lidR = r - 0.118;

  return (
    <group ref={groupRef}>
      <mesh geometry={bottomGeo} material={aluminum} castShadow receiveShadow />
      <mesh geometry={topGeo} material={aluminum} castShadow receiveShadow />

      <mesh position={[0, upperY, 0]} rotation={[0, Math.PI, 0]} castShadow>
        <cylinderGeometry args={[r + 0.004, r + 0.004, upperH, 72, 1, true]} />
        <primitive object={upperMat} attach="material" />
      </mesh>
      <mesh position={[0, lowerY, 0]} rotation={[0, Math.PI, 0]} castShadow>
        <cylinderGeometry args={[r + 0.004, r + 0.004, lowerH, 72, 1, true]} />
        <primitive object={lowerMat} attach="material" />
      </mesh>

      <mesh position={[0, windowY, 0]}>
        <cylinderGeometry args={[r - 0.002, r - 0.002, windowH, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#eaf2f8"
          transmission={0.42}
          roughness={0.14}
          thickness={0.06}
          ior={1.49}
          metalness={0}
          transparent
          opacity={1}
          envMapIntensity={0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, windowY, 0]}>
        <cylinderGeometry args={[r - 0.016, r - 0.016, windowH - 0.01, 48, 1, true]} />
        <meshPhysicalMaterial
          color="#f7fbff"
          transmission={0.2}
          roughness={0.22}
          thickness={0.02}
          transparent
          opacity={0.35}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh position={[0, CAN.windowMax, 0]} rotation={[Math.PI / 2, 0, 0]} material={aluminum}>
        <torusGeometry args={[r + 0.002, 0.011, 10, 56]} />
      </mesh>
      <mesh position={[0, CAN.windowMin, 0]} rotation={[Math.PI / 2, 0, 0]} material={aluminum}>
        <torusGeometry args={[r + 0.002, 0.011, 10, 56]} />
      </mesh>

      <mesh position={[0, yT - 0.09, 0]}>
        <cylinderGeometry args={[CAN.innerRadius, CAN.innerRadius, 0.16, 48, 1, true]} />
        <primitive object={aluminumDark} attach="material" />
      </mesh>

      <group ref={hingeRef} position={[0, yT, -lidR * 0.15]}>
        <group position={[0, 0.004, lidR * 0.15]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <circleGeometry args={[lidR, 64]} />
            <primitive object={lidMat} attach="material" />
          </mesh>
          <mesh position={[0, 0.01, 0]} castShadow>
            <cylinderGeometry args={[0.013, 0.013, 0.012, 20]} />
            <primitive object={tabMat} attach="material" />
          </mesh>
          <group ref={tabRef} position={[0, 0.012, 0.01]}>
            <mesh position={[0, 0.002, 0.07]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.42, 1]} castShadow>
              <torusGeometry args={[0.062, 0.013, 12, 32]} />
              <meshStandardMaterial color="#e4e8ed" metalness={0.98} roughness={0.12} envMapIntensity={2.2} />
            </mesh>
            <mesh position={[0, 0.002, 0.03]} castShadow>
              <boxGeometry args={[0.028, 0.007, 0.055]} />
              <meshStandardMaterial color="#e4e8ed" metalness={0.98} roughness={0.12} />
            </mesh>
          </group>
        </group>
      </group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -CAN.height / 2 + 0.012, 0.02]}
        scale={[1.15, 1.35, 1]}
      >
        <circleGeometry args={[0.4, 28]} />
        <meshBasicMaterial color="#c07082" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function FloatingCans() {
  const chapterIndex = useScrollStore((s) => s.chapterIndex);
  return <CanContainer puzzleIndex={chapterIndex} />;
}

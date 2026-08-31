"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useChamberStore } from "@/store/chamberStore";
import { useMediaStore } from "@/store/mediaStore";
import { createGoldMetal, createHouseEnv, createVelvetAlbedo, createVelvetBump } from "./houseTextures";

function smoothstep(a: number, b: number, t: number) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

function Velvet({
  map,
  bump,
  color = "#4a1824",
  side = THREE.FrontSide,
}: {
  map: THREE.Texture;
  bump: THREE.Texture;
  color?: string;
  side?: THREE.Side;
}) {
  return (
    <meshPhysicalMaterial
      map={map}
      bumpMap={bump}
      bumpScale={0.08}
      color={color}
      roughness={0.78}
      metalness={0.04}
      sheen={0.88}
      sheenRoughness={0.32}
      sheenColor="#7a3040"
      clearcoat={0.05}
      clearcoatRoughness={0.75}
      envMapIntensity={0.42}
      emissive="#2a0812"
      emissiveIntensity={0.18}
      side={side}
    />
  );
}

function Gold({ map }: { map: THREE.Texture }) {
  return (
    <meshPhysicalMaterial
      map={map}
      color="#c4a574"
      roughness={0.28}
      metalness={0.9}
      envMapIntensity={0.7}
      emissive="#3a2414"
      emissiveIntensity={0.28}
    />
  );
}

function Casket({ lid }: { lid: RefObject<THREE.Group | null> }) {
  const velvetMap = useMemo(() => createVelvetAlbedo(1024), []);
  const bump = useMemo(() => createVelvetBump(1024), []);
  const goldMap = useMemo(() => createGoldMetal(512), []);
  const w = 1.5;
  const d = 0.94;
  const h = 0.52;
  const t = 0.09;

  return (
    <group>
      <RoundedBox args={[w, 0.16, d]} radius={0.05} smoothness={7} position={[0, -h / 2 + 0.02, 0]}>
        <Velvet map={velvetMap} bump={bump} />
      </RoundedBox>
      <RoundedBox args={[w, h, t]} radius={0.04} smoothness={6} position={[0, 0, d / 2 - t / 2]}>
        <Velvet map={velvetMap} bump={bump} />
      </RoundedBox>
      <RoundedBox args={[w, h, t]} radius={0.04} smoothness={6} position={[0, 0, -d / 2 + t / 2]}>
        <Velvet map={velvetMap} bump={bump} />
      </RoundedBox>
      <RoundedBox args={[t, h, d - t * 1.6]} radius={0.03} smoothness={6} position={[-w / 2 + t / 2, 0, 0]}>
        <Velvet map={velvetMap} bump={bump} />
      </RoundedBox>
      <RoundedBox args={[t, h, d - t * 1.6]} radius={0.03} smoothness={6} position={[w / 2 - t / 2, 0, 0]}>
        <Velvet map={velvetMap} bump={bump} />
      </RoundedBox>

      <mesh position={[0, 0, d / 2 - t - 0.01]}>
        <planeGeometry args={[w - t * 2.2, h - 0.08]} />
        <Velvet map={velvetMap} bump={bump} color="#2a1018" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 0, -d / 2 + t + 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w - t * 2.2, h - 0.08]} />
        <Velvet map={velvetMap} bump={bump} color="#2a1018" side={THREE.BackSide} />
      </mesh>
      <mesh position={[-w / 2 + t + 0.01, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d - t * 2.2, h - 0.08]} />
        <Velvet map={velvetMap} bump={bump} color="#221014" side={THREE.BackSide} />
      </mesh>
      <mesh position={[w / 2 - t - 0.01, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d - t * 2.2, h - 0.08]} />
        <Velvet map={velvetMap} bump={bump} color="#221014" side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, -h / 2 + 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - t * 2.4, d - t * 2.4]} />
        <Velvet map={velvetMap} bump={bump} color="#1a0c10" />
      </mesh>

      <RoundedBox args={[w + 0.02, 0.018, 0.045]} radius={0.006} smoothness={3} position={[0, h / 2, d / 2 - 0.02]}>
        <Gold map={goldMap} />
      </RoundedBox>
      <RoundedBox args={[w + 0.02, 0.018, 0.045]} radius={0.006} smoothness={3} position={[0, h / 2, -d / 2 + 0.02]}>
        <Gold map={goldMap} />
      </RoundedBox>
      <RoundedBox args={[0.045, 0.018, d - 0.06]} radius={0.006} smoothness={3} position={[-w / 2 + 0.02, h / 2, 0]}>
        <Gold map={goldMap} />
      </RoundedBox>
      <RoundedBox args={[0.045, 0.018, d - 0.06]} radius={0.006} smoothness={3} position={[w / 2 - 0.02, h / 2, 0]}>
        <Gold map={goldMap} />
      </RoundedBox>

      <group ref={lid} position={[0, h / 2, -d / 2 + 0.01]}>
        <group position={[0, 0, d / 2 - 0.01]}>
          <mesh scale={[w / 1.44, 0.4, d / 1.44]}>
            <sphereGeometry args={[0.72, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Velvet map={velvetMap} bump={bump} />
          </mesh>
          <mesh scale={[(w - 0.12) / 1.44, 0.36, (d - 0.12) / 1.44]}>
            <sphereGeometry args={[0.72, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial color="#12080c" roughness={0.9} side={THREE.BackSide} envMapIntensity={0.1} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} scale={[w / 1.44, d / 1.44, 1]}>
            <torusGeometry args={[0.72, 0.012, 12, 64]} />
            <Gold map={goldMap} />
          </mesh>
          <mesh position={[0, 0.016, d / 2 - 0.02]}>
            <sphereGeometry args={[0.03, 16, 12]} />
            <Gold map={goldMap} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function CavityGlow({ reduced }: { reduced: boolean }) {
  const light = useRef<THREE.PointLight>(null);

  useFrame((_, delta) => {
    const p = useChamberStore.getState().progress;
    const open = reduced ? 0 : smoothstep(0.04, 0.3, p);
    const dive = reduced ? 0 : smoothstep(0.2, 0.84, p);
    const want = 2.2 + open * 8 + dive * 6;
    if (light.current) {
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, want, 3.2, delta);
    }
  });

  return <pointLight ref={light} position={[0, 0.02, 0.05]} color="#e8c4a0" intensity={2} distance={2.4} decay={2} />;
}

function CameraDive({ reduced }: { reduced: boolean }) {
  const { camera, scene } = useThree();
  const look = useRef(new THREE.Vector3(0, 0.04, 0));
  const want = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const p = useChamberStore.getState().progress;
    const open = reduced ? 0 : smoothstep(0.04, 0.3, p);
    const dive = reduced ? 0 : smoothstep(0.2, 0.84, p);
    const y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.32, 0.3, open), 0.34, dive);
    const z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(3.55, 2.2, open), 0.52, dive);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, 0.12 * (1 - dive), 3.6, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, y, 3.2, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, z, 2.8, delta);
    want.current.set(0, THREE.MathUtils.lerp(0.04, -0.24, dive), THREE.MathUtils.lerp(0, 0.02, dive));
    look.current.lerp(want.current, 1 - Math.exp(-3.4 * delta));
    cam.lookAt(look.current);
    const fov = THREE.MathUtils.lerp(32, 52, dive);
    cam.fov = THREE.MathUtils.damp(cam.fov, fov, 3.1, delta);
    cam.updateProjectionMatrix();
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = THREE.MathUtils.damp(fog.near, THREE.MathUtils.lerp(8, 1.8, dive), 3, delta);
      fog.far = THREE.MathUtils.damp(fog.far, THREE.MathUtils.lerp(18, 5.5, dive), 3, delta);
    }
  });

  return null;
}

function Rig({ reduced, lid }: { reduced: boolean; lid: RefObject<THREE.Group | null> }) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef(-0.22);
  const squash = useRef(1);
  const lastPulse = useRef(0);
  const appear = useRef(0);
  const lidRot = useRef(0);

  useFrame((_, delta) => {
    const group = root.current;
    if (!group) return;
    const { pointer, pulse, progress, objectRevealed } = useChamberStore.getState();
    const open = reduced ? 0 : smoothstep(0.04, 0.3, progress);
    appear.current = THREE.MathUtils.damp(appear.current, objectRevealed ? 1 : 0, 3.6, delta);

    if (pulse !== lastPulse.current) {
      lastPulse.current = pulse;
      if (progress < 0.06) squash.current = 0.97;
    }
    squash.current = THREE.MathUtils.damp(squash.current, 1, 8, delta);

    const turn = reduced || open > 0.04 ? 0 : 0.1;
    spin.current += delta * turn;
    const holdY = THREE.MathUtils.lerp(spin.current + pointer.x * 0.14, 0.32, open);
    const holdX = THREE.MathUtils.lerp(0.06 + pointer.y * 0.04, 0.14, open);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, holdY, 4.6, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, holdX, 4.6, delta);

    lidRot.current = THREE.MathUtils.damp(lidRot.current, -2.05 * open, 3.4, delta);
    if (lid.current) lid.current.rotation.x = lidRot.current;

    const lift = reduced ? 0 : Math.sin(performance.now() * 0.0006) * 0.016 * (1 - open);
    group.position.y = THREE.MathUtils.damp(group.position.y, lift + (1 - appear.current) * -0.28, 3.4, delta);
    const s = squash.current * appear.current;
    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, Math.max(0.001, s), 4.4, delta));
    group.visible = appear.current > 0.02;
  });

  return (
    <group ref={root} scale={0.001}>
      <Casket lid={lid} />
    </group>
  );
}

function Scene({ reduced }: { reduced: boolean }) {
  const env = useMemo(() => createHouseEnv(), []);
  const lid = useRef<THREE.Group>(null);

  return (
    <>
      <fog attach="fog" args={["#070506", 8, 18]} />
      <ambientLight intensity={0.32} color="#4a2030" />
      <spotLight
        position={[0.05, 3.6, 2.1]}
        angle={0.48}
        penumbra={1}
        intensity={90}
        color="#f0e0c8"
        distance={16}
        decay={1.6}
      />
      <spotLight
        position={[0, 2.2, -1.8]}
        angle={0.7}
        penumbra={1}
        intensity={18}
        color="#6b0f2a"
        distance={10}
        decay={2}
      />
      <directionalLight position={[-2.4, 1.4, 0.8]} intensity={0.55} color="#8a3048" />
      <directionalLight position={[1.8, 0.6, 1.2]} intensity={0.22} color="#c4a574" />
      <Environment map={env} environmentIntensity={0.48} />
      <CameraDive reduced={reduced} />
      <CavityGlow reduced={reduced} />
      <Rig reduced={reduced} lid={lid} />
    </>
  );
}

export function RelicCanvas({ reduced }: { reduced: boolean }) {
  const mobile = useMediaStore((state) => state.isMobile);

  return (
    <Canvas
      className="relic-canvas"
      dpr={mobile ? [1, 1.35] : [1, 2]}
      shadows={false}
      gl={{
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      camera={{ position: [0, 0.3, 3.55], fov: 32, near: 0.06, far: 24 }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.setClearColor(0x000000, 0);
        scene.background = null;
      }}
    >
      <Scene reduced={reduced} />
    </Canvas>
  );
}

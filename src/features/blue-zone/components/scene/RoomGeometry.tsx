import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { noRaycast, useLatest } from "./environment/envUtils";
import { useEnvironmentState } from "./environment/useEnvironmentState";

// Facility shell. Walls are dark glass with structural framing so the facility reads as embedded
// in the surrounding radio environment. Collision is unaffected: it comes from data/config.ts
// (ROOM_BOUNDS / OBSTACLES), not from these meshes.

const WALL_HALF = 8; // walls span x/z -8..8, matching the floor
const MULLION_STEP = 2;

// Wall placements: [position, rotationY]
const WALLS: [[number, number, number], number][] = [
  [[0, 3, -6], 0], // back
  [[-6, 3, 0], Math.PI / 2], // left
  [[6, 3, 0], -Math.PI / 2], // right
];

export const RoomGeometry: React.FC = () => {
  const beaconRef = useRef<THREE.PointLight | null>(null);
  const mullionsRef = useRef<THREE.InstancedMesh>(null);
  const stripsRef = useRef<THREE.InstancedMesh>(null);
  const ceilingStripsRef = useRef<THREE.InstancedMesh>(null);
  const roofBeamsRef = useRef<THREE.InstancedMesh>(null);
  const { level, motion } = useEnvironmentState();
  const latest = useLatest({ level, motion });

  const mullionCount = WALLS.length * (WALL_HALF * 2 / MULLION_STEP + 1);
  const STRIP_HEIGHTS = [0.52, 5.55];
  const stripCount = WALLS.length * STRIP_HEIGHTS.length;
  const CEILING_STRIPS = [-3, 0, 3];
  // Skylight structure: beams across the glass roof (z positions) plus a perimeter frame
  const ROOF_BEAMS = [-4, -1.5, 1, 3.5, 6];

  // Frame instances are generated once
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const local = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    let mi = 0;
    let si = 0;
    WALLS.forEach(([pos, rotY]) => {
      q.setFromAxisAngle(up, rotY);
      for (let x = -WALL_HALF; x <= WALL_HALF; x += MULLION_STEP) {
        // Mullions sit on the inner face of the glass
        local.set(x, 0, 0.26).applyQuaternion(q);
        // No mullion through the Investigation Board (mounted on the back wall, 4.2 wide)
        const behindBoard = rotY === 0 && Math.abs(x) < 2.3;
        m.compose(p.set(pos[0] + local.x, 3, pos[2] + local.z), q, behindBoard ? s.set(0, 0, 0) : s.set(0.14, 6, 0.14));
        mullionsRef.current?.setMatrixAt(mi++, m);
      }
      STRIP_HEIGHTS.forEach((y) => {
        local.set(0, 0, 0.27).applyQuaternion(q);
        m.compose(p.set(pos[0] + local.x, y, pos[2] + local.z), q, s.set(WALL_HALF * 2, 0.022, 0.022));
        stripsRef.current?.setMatrixAt(si++, m);
      });
    });
    CEILING_STRIPS.forEach((x, i) => {
      m.compose(p.set(x, 5.58, 0.5), q.identity(), s.set(0.035, 0.015, 12));
      ceilingStripsRef.current?.setMatrixAt(i, m);
    });
    ROOF_BEAMS.forEach((z, i) => {
      m.compose(p.set(0, 5.62, z), q.identity(), s.set(16, 0.16, 0.18));
      roofBeamsRef.current?.setMatrixAt(i, m);
    });
    [-5.9, 5.9].forEach((x, i) => {
      m.compose(p.set(x, 5.62, 0.5), q.identity(), s.set(0.22, 0.18, 13));
      roofBeamsRef.current?.setMatrixAt(ROOF_BEAMS.length + i, m);
    });
    [mullionsRef, stripsRef, ceilingStripsRef, roofBeamsRef].forEach((r) => {
      if (r.current) r.current.instanceMatrix.needsUpdate = true;
    });
  }, []);

  const glassMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0c2038",
        roughness: 0.15,
        metalness: 0.55,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    []
  );
  useLayoutEffect(() => () => glassMaterial.dispose(), [glassMaterial]);

  // Emergency beacon: steady unease, stronger once the broadcast relay is unlocked, calm on completion
  useFrame(({ clock }) => {
    if (!beaconRef.current) return;
    const t = clock.getElapsedTime() * latest.current.motion;
    const lvl = latest.current.level;
    const [base, swing] = lvl === 4 ? [0.5, 0.2] : lvl === 3 ? [1.8, 1.3] : [1.1, 0.7];
    beaconRef.current.intensity = base + Math.sin(t * 3.5) * swing;
  });

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#0d192c" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* Floor Grid Lines */}
      <gridHelper args={[16, 32, "#00f0ff", "#10203a"]} position={[0, 0.01, 0]} />

      {/* Glass walls (visual only) with an opaque kick plate at the base */}
      {WALLS.map(([pos, rotY], i) => (
        <group key={i} position={pos} rotation={[0, rotY, 0]}>
          <mesh material={glassMaterial}>
            <boxGeometry args={[16, 6, 0.4]} />
          </mesh>
          <mesh position={[0, -2.75, 0]}>
            <boxGeometry args={[16, 0.5, 0.42]} />
            <meshStandardMaterial color="#0a1426" roughness={0.6} metalness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Structural mullions and edge light strips */}
      <instancedMesh ref={mullionsRef} args={[undefined, undefined, mullionCount]} raycast={noRaycast}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0c1830" roughness={0.4} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={stripsRef} args={[undefined, undefined, stripCount]} raycast={noRaycast}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#127f9b" toneMapped={false} />
      </instancedMesh>

      {/* Glass skylight (the sky and the distant network stay visible overhead) with roof beams
          and the recessed light strips */}
      <mesh position={[0, 5.8, 0]} material={glassMaterial}>
        <boxGeometry args={[16, 0.4, 16]} />
      </mesh>
      <instancedMesh ref={roofBeamsRef} args={[undefined, undefined, ROOF_BEAMS.length + 2]} raycast={noRaycast}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#0c1830" roughness={0.4} metalness={0.7} />
      </instancedMesh>
      <instancedMesh ref={ceilingStripsRef} args={[undefined, undefined, CEILING_STRIPS.length]} raycast={noRaycast}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#0c4a5d" toneMapped={false} />
      </instancedMesh>

      {/* Industrial Floor Cable Conduits */}
      <mesh position={[-1.8, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <cylinderGeometry args={[0.08, 0.08, 10, 12]} />
        <meshStandardMaterial color="#1a273f" roughness={0.5} />
      </mesh>
      <mesh position={[1.8, 0.06, 0]} rotation={[-Math.PI / 2, 0, -0.2]}>
        <cylinderGeometry args={[0.08, 0.08, 10, 12]} />
        <meshStandardMaterial color="#1a273f" roughness={0.5} />
      </mesh>

      {/* Server Racks (Background Hardware) */}
      <group position={[-4.8, 1.8, -4.8]}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 3.6, 1.0]} />
          <meshStandardMaterial color="#0f192d" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* Blinking LEDs on rack */}
        {[-1.2, -0.6, 0.0, 0.6, 1.2].map((y, i) => (
          <mesh key={i} position={[0.6, y, 0.52]}>
            <boxGeometry args={[0.1, 0.05, 0.02]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#00f0ff" : "#ffb703"} />
          </mesh>
        ))}
      </group>

      <group position={[4.8, 1.8, -4.8]}>
        <mesh castShadow>
          <boxGeometry args={[1.6, 3.6, 1.0]} />
          <meshStandardMaterial color="#0f192d" metalness={0.6} roughness={0.4} />
        </mesh>
        {[-1.2, -0.6, 0.0, 0.6, 1.2].map((y, i) => (
          <mesh key={i} position={[-0.6, y, 0.52]}>
            <boxGeometry args={[0.1, 0.05, 0.02]} />
            <meshBasicMaterial color={i % 3 === 0 ? "#ff3344" : "#00f0ff"} />
          </mesh>
        ))}
      </group>

      {/* Center Console Pedestal */}
      <mesh position={[0, 0.5, -2.5]} castShadow>
        <boxGeometry args={[3.2, 1.0, 1.4]} />
        <meshStandardMaterial color="#0b162c" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Emergency Beacon Lamp (Ceiling) */}
      <group position={[0, 5.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 0.4, 16]} />
          <meshStandardMaterial color="#5a121a" emissive="#ff2233" emissiveIntensity={0.35} />
        </mesh>
        <pointLight ref={beaconRef} color="#ff3344" distance={14} decay={2} intensity={1.5} />
      </group>

      {/* Cinematic lighting: cool hemisphere fill, cyan key, red emergency beacon */}
      <hemisphereLight args={["#2a8fb8", "#040912", 0.55]} />
      <ambientLight intensity={0.22} color="#3d6d96" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} color="#90e0ef" castShadow />
      <pointLight position={[0, 3, -2.5]} intensity={1.8} color="#00f0ff" distance={8} decay={2} />
    </group>
  );
};

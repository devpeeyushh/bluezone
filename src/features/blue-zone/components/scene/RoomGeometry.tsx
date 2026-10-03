import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export const RoomGeometry: React.FC = () => {
  const beaconRef = useRef<THREE.PointLight | null>(null);

  // Subtle pulsing alarm light in the background
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const t = clock.getElapsedTime();
      beaconRef.current.intensity = 1.2 + Math.sin(t * 3.5) * 0.8;
    }
  });

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 16]} />
        <meshStandardMaterial color="#080e1b" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Floor Grid Lines */}
      <gridHelper args={[16, 32, "#00f0ff", "#10203a"]} position={[0, 0.01, 0]} />

      {/* Back Wall */}
      <mesh position={[0, 3, -6]}>
        <boxGeometry args={[16, 6, 0.4]} />
        <meshStandardMaterial color="#0a1224" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Left Wall */}
      <mesh position={[-6, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[16, 6, 0.4]} />
        <meshStandardMaterial color="#091020" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Right Wall */}
      <mesh position={[6, 3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[16, 6, 0.4]} />
        <meshStandardMaterial color="#091020" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Ceiling Beam Grid */}
      <mesh position={[0, 5.8, 0]}>
        <boxGeometry args={[16, 0.4, 16]} />
        <meshStandardMaterial color="#050811" roughness={0.9} />
      </mesh>

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
          <meshStandardMaterial color="#ff3344" emissive="#ff2233" emissiveIntensity={0.6} />
        </mesh>
        <pointLight
          ref={beaconRef}
          color="#ff3344"
          distance={14}
          decay={2}
          intensity={1.5}
        />
      </group>

      {/* Atmospheric Ambient Lighting */}
      <ambientLight intensity={0.35} color="#457b9d" />
      <directionalLight position={[5, 8, 4]} intensity={0.6} color="#90e0ef" castShadow />
      <pointLight position={[0, 3, -2.5]} intensity={1.8} color="#00f0ff" distance={8} decay={2} />
    </group>
  );
};

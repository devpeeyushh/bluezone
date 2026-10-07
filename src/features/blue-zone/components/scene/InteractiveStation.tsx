"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { StationConfig } from "../../types/radio.types";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { useInteractable } from "../../utils/useInteractable";
import { getStationStatus } from "../../utils/stationStatus";
import { damp } from "./environment/envUtils";
import { presenceNearness } from "./environment/playerPresence";
import { panFor } from "../../utils/audioSpace";

const SCREEN_IDLE = new THREE.Color("#061322");
const SCREEN_FOCUS = new THREE.Color("#0e2a4a");

interface InteractiveStationProps {
  station: StationConfig;
  onSelect: (id: StationConfig["id"]) => void;
  isActive: boolean;
}

// While the cursor is pointer-locked the R3F pointer is frozen at the lock position,
// so mesh hover/click would fire on whatever drifts under it. In-world use goes through [E].
const isPointerLocked = () => typeof document !== "undefined" && Boolean(document.pointerLockElement);

export const InteractiveStation: React.FC<InteractiveStationProps> = ({
  station,
  onSelect,
  isActive,
}) => {
  const meshRef = useRef<THREE.Group | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const screenRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const hoverLift = useRef(0);
  // Pointer-over bubbles from each child mesh; one focus cue per hover
  const lastHoverCue = useRef(0);
  const [hovered, setHovered] = useState(false);

  const {
    audioEnabled,
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    ctf03Solved,
    voiceArchiveUnlocked,
    signalMonitorUnlocked,
    networkUnlocked,
    broadcastUnlocked,
    completed,
    isModalOpen,
    isFocused,
  } = useBlueZoneStore(
    useShallow((s) => ({
      audioEnabled: s.audioEnabled,
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      ctf03Solved: s.ctf03Solved,
      voiceArchiveUnlocked: s.voiceArchiveUnlocked,
      signalMonitorUnlocked: s.signalMonitorUnlocked,
      networkUnlocked: s.networkUnlocked,
      broadcastUnlocked: s.broadcastUnlocked,
      completed: s.completed,
      isModalOpen: Boolean(s.activeStation || s.investigationBoardOpen),
      // In interaction range in first-person mode
      isFocused: s.interactionPrompt?.targetId === station.id,
    }))
  );

  // Determine dynamic station status & color based on CTF progression
  const status = getStationStatus(station.id, {
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    ctf03Solved,
    voiceArchiveUnlocked,
    signalMonitorUnlocked,
    networkUnlocked,
    broadcastUnlocked,
    completed,
  });
  const isLocked = status.isLocked;
  const isHighlighted = hovered || isActive || isFocused;

  // Light, screen glow and the highlight float ease between states instead of snapping.
  // Proximity adds a little light as the player approaches.
  const [sx, , sz] = station.position3D;
  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const near = presenceNearness(sx, sz, 2.0, 3.9);
    hoverLift.current = damp(hoverLift.current, isHighlighted ? 1 : 0, 6, dt);
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.position.y = station.position3D[1] + Math.sin(t * 4) * 0.04 * hoverLift.current;
    }
    if (lightRef.current) {
      // The light sits ~0.25 m from the screen, so locked consoles keep it low (no saturated red slab)
      const target = (isHighlighted ? 1.35 : isLocked ? 0.1 : 0.85) + near * (isLocked ? 0.06 : 0.2);
      lightRef.current.intensity = damp(lightRef.current.intensity, target, 5, dt);
    }
    if (screenRef.current) {
      // Up close the screen fills the view, so its glow eases down with proximity (like eye adaptation)
      // instead of washing out; focus is carried by the light, floor ring, hologram and reticle.
      // Locked screens stay a dim, unmistakable red rather than a saturated slab
      const target = (isHighlighted ? 0.56 : isLocked ? 0.15 : 0.48) * (1 - near * 0.42);
      screenRef.current.emissiveIntensity = damp(screenRef.current.emissiveIntensity, target, 5, dt);
      screenRef.current.color.lerp(isHighlighted ? SCREEN_FOCUS : SCREEN_IDLE, 1 - Math.exp(-5 * dt));
    }
  });

  // Reset the cursor if the station unmounts while hovered
  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isPointerLocked()) return;
    // Open / denied cue is played by useFacilityAudio
    onSelect(station.id);
  };

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isPointerLocked()) return;
    setHovered(true);
    document.body.style.cursor = "pointer";
    // Mouse hover is this station's "focus" in orbit mode
    const now = performance.now();
    if (audioEnabled && now - lastHoverCue.current > 600) {
      lastHoverCue.current = now;
      const solved = status.label === "VERIFIED" || status.label === "COMPLETE";
      sound.focus(isLocked ? "locked" : solved ? "solved" : "station", panFor(station.position3D[0], station.position3D[2]) * 0.7);
    }
  };

  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  useInteractable({
    id: station.id,
    name: station.name,
    position: station.position3D,
    isLocked,
    status: status.promptStatus,
    statusColor: status.color,
    requirement: status.requirement,
    onInteract: () => onSelect(station.id),
  });

  return (
    <group
      ref={meshRef}
      position={station.position3D}
      rotation={station.rotation3D}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Console Pedestal */}
      <mesh castShadow position={[0, -0.4, 0]}>
        <boxGeometry args={[1.4, 0.8, 0.8]} />
        <meshStandardMaterial color="#0c172d" roughness={0.4} metalness={0.6} />
      </mesh>

      {/* Terminal Screen Bezel */}
      <mesh position={[0, 0.35, 0]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.2, 0.7, 0.1]} />
        <meshStandardMaterial color="#080f1e" roughness={0.3} />
      </mesh>

      {/* CRT Glowing Screen Surface */}
      <mesh position={[0, 0.35, 0.06]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[1.1, 0.6]} />
        {/* Color / emissiveIntensity are eased in useFrame (locked consoles stay dim, available ones brighter) */}
        <meshStandardMaterial
          ref={screenRef}
          color="#061322"
          emissive={status.color}
          emissiveIntensity={isLocked ? 0.15 : 0.48}
          roughness={0.2}
        />
      </mesh>

      {/* Keypad / Control Deck */}
      <mesh position={[0, 0.05, 0.25]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[1.0, 0.06, 0.4]} />
        <meshStandardMaterial color="#101c36" roughness={0.5} />
      </mesh>

      {/* Point Light casting glow onto the desk */}
      <pointLight
        ref={lightRef}
        color={status.color}
        distance={2.5}
        intensity={isLocked ? 0.1 : 0.85}
        position={[0, 0.4, 0.3]}
      />

      {/* Floating 3D HUD Tag (fades out while in interaction range: distanceFactor makes it huge up close,
          and the [E] prompt below the crosshair already shows name + status) */}
      <Html position={[0, 0.95, 0]} center distanceFactor={7} zIndexRange={[16, 0]} occlude>
        <div
          onClick={handleClick}
          className={`px-2.5 py-1 rounded bg-[#030b18]/80 backdrop-blur-sm border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-out select-none cursor-pointer whitespace-nowrap text-center ${
            isModalOpen || isFocused
              ? "opacity-0 scale-90 translate-y-1 pointer-events-none"
              : isHighlighted
              ? "scale-110 shadow-cyan-glow border-cyan-400 text-white opacity-100"
              : isLocked
              ? "border-red-900/60 text-red-300 opacity-100"
              : "border-slate-700/80 text-slate-200 opacity-100"
          }`}
        >
          <div className="text-[10px] font-mono tracking-wider font-bold">
            {station.name}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: status.color }}
            />
            <span className="text-[9px] font-mono opacity-85 font-semibold">
              STATUS: {status.label}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
};

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { useInteractable } from "../../utils/useInteractable";
import { BoardHologram } from "./environment/BoardHologram";
import { damp } from "./environment/envUtils";
import { playerPresence, presenceNearness } from "./environment/playerPresence";
import { panFor } from "../../utils/audioSpace";

const SCREEN_IDLE = new THREE.Color("#041427");
const SCREEN_FOCUS = new THREE.Color("#0d2b4d");

interface InvestigationBoardMeshProps {
  position?: [number, number, number];
}

const BOARD_ID = "investigation-board";

export const InvestigationBoardMesh: React.FC<InvestigationBoardMeshProps> = ({
  position = [0, 2.5, -5.75], // Mounted on back wall
}) => {
  const [hovered, setHovered] = useState(false);
  // Pointer-over bubbles from each child mesh; one focus cue per hover
  const lastHoverCue = useRef(0);

  const { openInvestigationBoard, solvedCount, completed, audioEnabled, isModalOpen, isFocused } = useBlueZoneStore(
    useShallow((s) => ({
      openInvestigationBoard: s.openInvestigationBoard,
      solvedCount: (s.challenge1Solved ? 1 : 0) + (s.challenge2Solved ? 1 : 0) + (s.challenge3Solved ? 1 : 0),
      completed: s.completed,
      audioEnabled: s.audioEnabled,
      isModalOpen: Boolean(s.activeStation || s.investigationBoardOpen),
      isFocused: s.interactionPrompt?.targetId === BOARD_ID,
    }))
  );

  const isHighlighted = hovered || isFocused;

  // Across the room the board's label stacked on top of the terminal's label/hologram, so it fades
  // out beyond ~7.8 m (hysteresis; first-person only). State flips only when the threshold is crossed.
  const [distant, setDistant] = useState(false);
  const distantRef = useRef(false);

  // Screen glow eases between idle and focused instead of snapping, and adapts down when the player
  // stands right at the board (it fills the view there; the hologram carries the detail)
  const screenRef = useRef<THREE.MeshStandardMaterial | null>(null);
  useFrame((_, rawDelta) => {
    const d = Math.hypot(playerPresence.x - position[0], playerPresence.z - position[2]);
    const isDistant = playerPresence.active > 0.5 && d > (distantRef.current ? 7.2 : 7.8);
    if (isDistant !== distantRef.current) {
      distantRef.current = isDistant;
      setDistant(isDistant);
    }
    const m = screenRef.current;
    if (!m) return;
    const dt = Math.min(rawDelta, 0.1);
    const near = presenceNearness(position[0], position[2], 2.0, 6.0);
    m.emissiveIntensity = damp(m.emissiveIntensity, (isHighlighted ? 0.3 : 0.15) * (1 - near * 0.5), 5, dt);
    m.color.lerp(isHighlighted ? SCREEN_FOCUS : SCREEN_IDLE, 1 - Math.exp(-5 * dt));
  });

  // Activation cue is played by useFacilityAudio when the board opens
  const handleOpenBoard = () => {
    openInvestigationBoard();
  };

  // Reset the cursor if the board unmounts while hovered
  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  // Register with interactive proximity system for [E] INTERACT
  useInteractable({
    id: BOARD_ID,
    name: "INVESTIGATION BOARD",
    position: [position[0], 1.6, position[2] + 1.2],
    status: completed ? "TRAIL COMPLETE" : `EVIDENCE ${solvedCount}/3 RECONSTRUCTED`,
    statusColor: completed ? "#10b981" : "#00f0ff",
    onInteract: handleOpenBoard,
  });

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        // Pointer-locked clicks use a stale pointer position; in-world use goes through [E]
        if (document.pointerLockElement) return;
        handleOpenBoard();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (document.pointerLockElement) return;
        setHovered(true);
        document.body.style.cursor = "pointer";
        // Mouse hover is the board's "focus" in orbit mode
        const now = performance.now();
        if (audioEnabled && now - lastHoverCue.current > 600) {
          lastHoverCue.current = now;
          sound.focus("board", panFor(position[0], position[2]) * 0.7);
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Wall Display Frame */}
      <mesh castShadow position={[0, 0, 0]}>
        <boxGeometry args={[4.2, 2.4, 0.15]} />
        <meshStandardMaterial color="#081020" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Screen Surface */}
      <mesh position={[0, 0, 0.08]}>
        <planeGeometry args={[4.0, 2.2]} />
        <meshStandardMaterial ref={screenRef} color="#041427" emissive="#00f0ff" emissiveIntensity={0.15} roughness={0.2} />
      </mesh>

      {/* Holographic overlay (visual only) */}
      <BoardHologram progress={solvedCount + (completed ? 1 : 0)} focused={isHighlighted} />

      {/* Holographic Header Bar */}
      <mesh position={[0, 0.95, 0.09]}>
        <planeGeometry args={[3.8, 0.18]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>

      {/* Floating 3D HUD Tag */}
      <Html
        position={[0, 0, 0.12]}
        center
        distanceFactor={6}
        zIndexRange={[16, 0]}
        occlude
        className="pointer-events-none select-none font-mono"
      >
        <div className={`flex flex-col items-center bg-[#030b18]/80 border rounded px-3 py-2 text-center backdrop-blur-md min-w-[200px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 ease-out ${
          isHighlighted ? "border-cyan-300 shadow-cyan-glow" : "border-cyan-500/60"
        } ${isModalOpen || isFocused || distant ? "opacity-0 scale-95" : "opacity-100"}`}>
          <div className="text-[10px] tracking-widest text-cyan-400 font-bold uppercase">
            FORENSIC INVESTIGATION BOARD
          </div>
          <div className="text-[9px] text-slate-300 mt-0.5">
            EVIDENCE GRAPH: {solvedCount}/3 RECONSTRUCTED
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[8px] text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">
            <span>[E] OPEN BOARD</span>
          </div>
        </div>
      </Html>
    </group>
  );
};

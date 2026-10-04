"use client";

import React, { useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { useInteractable } from "../../utils/useInteractable";

interface InvestigationBoardMeshProps {
  position?: [number, number, number];
}

const BOARD_ID = "investigation-board";

export const InvestigationBoardMesh: React.FC<InvestigationBoardMeshProps> = ({
  position = [0, 2.5, -5.75], // Mounted on back wall
}) => {
  const [hovered, setHovered] = useState(false);

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

  const handleOpenBoard = () => {
    if (audioEnabled) {
      sound.playStationTone(1100);
      sound.playClick();
    }
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
        <meshStandardMaterial
          color={isHighlighted ? "#0d2b4d" : "#041427"}
          emissive="#00f0ff"
          emissiveIntensity={isHighlighted ? 0.35 : 0.15}
          roughness={0.2}
        />
      </mesh>

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
        <div className={`flex flex-col items-center bg-black/85 border rounded px-3 py-2 text-center backdrop-blur-md min-w-[200px] transition-all duration-300 ${
          isHighlighted ? "border-cyan-300 shadow-cyan-glow" : "border-cyan-500/60"
        } ${isModalOpen || isFocused ? "opacity-0" : "opacity-100"}`}>
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

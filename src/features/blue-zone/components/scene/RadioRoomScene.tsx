"use client";

import React, { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import { RoomGeometry } from "./RoomGeometry";
import { InteractiveStation } from "./InteractiveStation";
import { InvestigationBoardMesh } from "./InvestigationBoardMesh";
import { FirstPersonPlayer, PlayerPose } from "./FirstPersonPlayer";
import { RADIO_STATIONS } from "../../data/mockRadioData";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { StationId } from "../../types/radio.types";

export const RadioRoomScene: React.FC = () => {
  const {
    activeStation,
    setActiveStation,
    investigationBoardOpen,
    interactionPrompt,
    controlsMode,
    setControlsMode,
    audioEnabled,
  } = useBlueZoneStore(
    useShallow((s) => ({
      activeStation: s.activeStation,
      setActiveStation: s.setActiveStation,
      investigationBoardOpen: s.investigationBoardOpen,
      interactionPrompt: s.interactionPrompt,
      controlsMode: s.controlsMode,
      setControlsMode: s.setControlsMode,
      audioEnabled: s.audioEnabled,
    }))
  );

  const isModalOpen = Boolean(activeStation || investigationBoardOpen);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [hasEngaged, setHasEngaged] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const poseRef = useRef<PlayerPose | null>(null);

  // If a modal opens, make sure pointer lock is unmounted and state reset
  useEffect(() => {
    if (isModalOpen && isPointerLocked) {
      setIsPointerLocked(false);
    }
  }, [isModalOpen, isPointerLocked]);

  const handleLockChange = useCallback((locked: boolean) => {
    setIsPointerLocked(locked);
    if (locked) setHasEngaged(true);
  }, []);

  const requestPointerLock = () => {
    // Read live store state: a click on a station mesh opens its modal in the same event,
    // before this render's isModalOpen has a chance to update.
    const live = useBlueZoneStore.getState();
    if (live.controlsMode !== "first-person" || live.activeStation || live.investigationBoardOpen) return;

    const canvas = canvasRef.current?.querySelector("canvas");
    if (canvas && document.pointerLockElement !== canvas) {
      try {
        // Chrome rejects re-lock requests made too soon after ESC; swallow that rejection
        const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        request?.catch?.(() => {});
      } catch {
        // Older browsers throw synchronously; the "click to resume" prompt stays visible
      }
      if (audioEnabled) sound.playClick();
    }
  };

  const handleSelectStation = useCallback(
    (id: StationId) => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setActiveStation(id);
    },
    [setActiveStation]
  );

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full min-h-[450px] bg-[#03060f] select-none"
      onClick={requestPointerLock}
    >
      <Canvas
        shadows
        // Modals cover the viewport with a blurred backdrop: stop the 60fps render loop behind them
        // ("demand" still redraws on resize/invalidate so the backdrop never goes stale).
        frameloop={isModalOpen ? "demand" : "always"}
        className="w-full h-full cursor-crosshair"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget && controlsMode === "orbit") {
            setActiveStation(null);
          }
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.6, 3.8]} fov={55} />

        {controlsMode === "orbit" ? (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3.0}
            maxDistance={8.5}
            maxPolarAngle={Math.PI / 2.05}
            minPolarAngle={Math.PI / 6}
            target={[0, 1.2, 0]}
          />
        ) : (
          <FirstPersonPlayer
            isLocked={isPointerLocked && !isModalOpen}
            onLockChange={handleLockChange}
            poseRef={poseRef}
          />
        )}

        <Suspense fallback={null}>
          <RoomGeometry />
          <InvestigationBoardMesh />

          {RADIO_STATIONS.map((station) => (
            <InteractiveStation
              key={station.id}
              station={station}
              isActive={activeStation === station.id}
              onSelect={handleSelectStation}
            />
          ))}
        </Suspense>
      </Canvas>

      {/* Crosshair (First-Person Mode, only when no modal is open) */}
      {controlsMode === "first-person" && !isModalOpen && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-1.5 h-1.5 rounded-full shadow-cyan-glow transition-colors duration-150 ${
              interactionPrompt ? (interactionPrompt.isLocked ? "bg-red-400" : "bg-cyan-300") : "bg-cyan-400/80"
            }`}
          />
          <div
            className={`absolute rounded-full border transition-all duration-150 ${
              interactionPrompt
                ? interactionPrompt.isLocked
                  ? "w-8 h-8 border-red-400/60"
                  : "w-8 h-8 border-cyan-300/70"
                : "w-6 h-6 border-cyan-500/20"
            }`}
          />
        </div>
      )}

      {/* Interaction Prompt (below the crosshair; hidden when a modal is open) */}
      {interactionPrompt && !isModalOpen && (
        <div className="absolute left-1/2 top-[calc(50%+2.5rem)] -translate-x-1/2 z-20 pointer-events-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              if (audioEnabled) sound.playClick();
              interactionPrompt.action();
            }}
            className={`min-w-[17rem] max-w-[calc(100vw-2rem)] text-left px-3.5 py-2.5 rounded bg-black/85 border font-mono backdrop-blur-md transition-colors ${
              interactionPrompt.isLocked
                ? "border-red-500/60 hover:bg-red-950/40"
                : "border-cyan-400/70 shadow-cyan-glow hover:bg-cyan-950/60"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded border text-xs font-bold ${
                  interactionPrompt.isLocked
                    ? "border-red-400/70 text-red-300 bg-red-950/50"
                    : "border-cyan-300 text-cyan-200 bg-cyan-950/60"
                }`}
              >
                E
              </span>
              <span className="text-xs font-bold tracking-widest text-radio-textBright">
                {interactionPrompt.name}
              </span>
            </div>
            <div className="mt-1.5 pl-[2.125rem] space-y-0.5 text-[10px] tracking-wider">
              <div>
                <span className="text-radio-textMuted">STATUS // </span>
                <span className="font-bold" style={{ color: interactionPrompt.statusColor }}>
                  {interactionPrompt.status}
                </span>
              </div>
              {interactionPrompt.requirement && (
                <div>
                  <span className="text-radio-textMuted">REQUIRED // </span>
                  <span className="text-amber-300 font-semibold">{interactionPrompt.requirement}</span>
                </div>
              )}
            </div>
          </button>
        </div>
      )}

      {/* First-person lock prompt overlay (CLICK TO ENGAGE / RESUME) */}
      {controlsMode === "first-person" && !isPointerLocked && !isModalOpen && (
        // Sits lower below xl so it clears the objective panel on narrower desktops
        <div className="absolute top-40 xl:top-16 inset-x-0 mx-auto w-fit max-w-[calc(100%-2rem)] pointer-events-none z-10">
          <div className="px-4 py-2 rounded bg-black/85 border border-cyan-500/60 text-cyan-300 font-mono text-xs tracking-wider backdrop-blur-sm shadow-cyan-glow flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>
              {hasEngaged ? "CLICK VIEWPORT TO RESUME" : "CLICK VIEWPORT TO ENGAGE CONTROLS"} // [ESC] RELEASES CURSOR
            </span>
          </div>
        </div>
      )}

      {/* Controls HUD Hint and Mode Switcher (top-right, clear of the bottom station bar) */}
      {!isModalOpen && (
        <div className="absolute top-3 right-4 z-20 flex flex-wrap items-center justify-end gap-2 pointer-events-auto text-[10px] font-mono max-w-[calc(100%-20rem)]">
          <div className="hidden md:block text-cyan-400/80 bg-black/80 px-2.5 py-1 rounded border border-cyan-900/50 backdrop-blur-sm">
            {controlsMode === "first-person"
              ? "WASD: MOVE // MOUSE: LOOK // SHIFT: SPRINT // [E]: INTERACT"
              : "DRAG TO ORBIT // SCROLL TO ZOOM // CLICK CONSOLES"}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              if (audioEnabled) sound.playClick();
              setControlsMode(controlsMode === "first-person" ? "orbit" : "first-person");
            }}
            className="px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 transition-colors"
          >
            MODE: {controlsMode === "first-person" ? "1ST PERSON" : "ORBIT CAM"}
          </button>
        </div>
      )}
    </div>
  );
};

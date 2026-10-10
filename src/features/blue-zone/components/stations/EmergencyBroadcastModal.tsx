"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Lock, X } from "lucide-react";
import gsap from "gsap";
import { useShallow } from "zustand/react/shallow";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { BLUE_ZONE_COMPLETION } from "../../data/completion";
import { BlueZoneCompletionPayload } from "../../types/integration.types";
import { isDatasetUnlocked } from "../../utils/finalAnswer";
import { FinalTransmissionComplete, FinalTransmissionPuzzle } from "./broadcast/BroadcastPanels";
import { TransmissionPuzzle } from "./broadcast/TransmissionPuzzle";

interface Props {
  onClose: () => void;
  onComplete?: (payload: BlueZoneCompletionPayload) => void;
}

// Final transmission: reconstruct the 4×4 jigsaw, then answer from the complete image. A correct
// answer completes the zone through the existing path exactly once (setCompleted(true) +
// onComplete(BLUE_ZONE_COMPLETION)) and releases the complete Radio Communication dataset.

export const EmergencyBroadcastModal: React.FC<Props> = ({ onClose, onComplete }) => {
  const {
    broadcastUnlocked,
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    cinematicStage,
    setCinematicStage,
    setCompleted,
    completed,
  } = useBlueZoneStore(
    useShallow((s) => ({
      broadcastUnlocked: s.broadcastUnlocked,
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      cinematicStage: s.cinematicStage,
      setCinematicStage: s.setCinematicStage,
      setCompleted: s.setCompleted,
      completed: s.completed,
    }))
  );

  const containerRef = useModalEntrance<HTMLDivElement>();
  const completeRef = useRef<HTMLDivElement>(null);
  const [datasetReady, setDatasetReady] = useState(isDatasetUnlocked);

  // Keep the latest callback without re-firing completion when a parent re-renders
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // True when the answer was verified in this console, so the completion view animates in only then
  const justSolvedRef = useRef(false);

  // Jigsaw solved: move on to the answer step (stage lives in the store, so reopening keeps it)
  const handleReconstructed = useCallback(() => setCinematicStage("revealed"), [setCinematicStage]);

  const handleSolved = useCallback(() => {
    setDatasetReady(true);
    // Idempotent: a zone that is already complete never re-fires completion
    if (useBlueZoneStore.getState().completed) return;
    justSolvedRef.current = true;
    setCompleted(true);
    setCinematicStage("complete");
    onCompleteRef.current?.(BLUE_ZONE_COMPLETION);
  }, [setCompleted, setCinematicStage]);

  useEffect(() => {
    if (!completed || !justSolvedRef.current || !completeRef.current) return;
    const tween = gsap.fromTo(completeRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
    return () => {
      tween.kill();
    };
  }, [completed]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl max-h-[92vh] bg-radio-panel border border-red-500/50 rounded-lg shadow-red-glow flex flex-col overflow-hidden text-radio-text font-mono"
      >
        {/* Header */}
        <div className="bg-red-950/40 px-4 py-3 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {broadcastUnlocked ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            )}
            <span className="text-sm font-bold text-red-200 tracking-wider">
              STATION 05 // EMERGENCY BROADCAST RELAY [RF-ALERT-05]
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded border font-bold ${
                broadcastUnlocked
                  ? "border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
                  : "border-red-500/60 bg-red-950/60 text-red-300"
              }`}
            >
              {broadcastUnlocked ? "SECURITY OVERRIDDEN" : "LOCKED"}
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
            }}
            aria-label="Close station"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 bg-radio-dark/95 min-h-[400px] flex flex-col overflow-y-auto overflow-x-hidden">
          {!broadcastUnlocked ? (
            /* ===== LOCKED VIEW ===== */
            <div className="text-center py-6 my-auto">
              <Lock className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
              <div className="text-base font-bold text-red-300 tracking-wide">
                SYSTEM BROADCAST LOCKOUT ACTIVE
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto mt-2 leading-relaxed">
                The emergency broadcast console was locked following the initial alarm. To bypass the security lockout, all three radio investigation challenges must be verified:
              </p>

              <div className="max-w-md mx-auto mt-4 space-y-2 text-left text-xs">
                <div className={`p-2.5 rounded border flex items-center justify-between ${
                  challenge1Solved ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-black/40 text-slate-400"
                }`}>
                  <span>1. Intercepted Message (Terminal 01)</span>
                  <span>{challenge1Solved ? "✓ VERIFIED" : "PENDING"}</span>
                </div>

                <div className={`p-2.5 rounded border flex items-center justify-between ${
                  challenge3Solved ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-black/40 text-slate-400"
                }`}>
                  <span>2. Compromised Relay Node (Map 04)</span>
                  <span>{challenge3Solved ? "✓ VERIFIED" : "PENDING"}</span>
                </div>

                <div className={`p-2.5 rounded border flex items-center justify-between ${
                  challenge2Solved ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-black/40 text-slate-400"
                }`}>
                  <span>3. Failed Transmission & Carrier Lock (Monitor 03)</span>
                  <span>{challenge2Solved ? "✓ VERIFIED" : "PENDING"}</span>
                </div>
              </div>
            </div>
          ) : completed ? (
            /* ===== COMPLETE: dataset + zone cleared (every later visit too) ===== */
            <div ref={completeRef}>
              <FinalTransmissionComplete
                nextZone={BLUE_ZONE_COMPLETION.nextSector}
                datasetAvailable={datasetReady}
                onReopen={handleSolved}
              />
            </div>
          ) : (
            /* ===== FINAL PUZZLE: answer from the reconstructed image ===== */
            cinematicStage === "revealed" ? (
              <FinalTransmissionPuzzle onSolved={handleSolved} />
            ) : (
              /* ===== RECONSTRUCTION: shuffled 4×4 jigsaw, always starts unsolved ===== */
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] tracking-[0.35em] text-red-300 font-bold">FINAL TRANSMISSION</div>
                    <div className="text-sm font-bold tracking-[0.25em] text-radio-textBright">RECONSTRUCTING VISUAL RECORD</div>
                  </div>
                  <div className="text-[10px] tracking-[0.2em] text-amber-300">VISUAL RECORD // CORRUPTED</div>
                </div>
                <TransmissionPuzzle onSolved={handleReconstructed} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { getCurrentObjective, OBJECTIVE_STEPS } from "../../utils/objectives";
import motion from "./hudMotion.module.css";

// How long "OBJECTIVE UPDATED" stays lit once the player is back in the facility view
const UPDATE_FLASH_MS = 4000;

export const ObjectiveTracker: React.FC = () => {
  const progress = useBlueZoneStore(
    useShallow((s) => ({
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      voiceArchiveUnlocked: s.voiceArchiveUnlocked,
      signalMonitorUnlocked: s.signalMonitorUnlocked,
      networkUnlocked: s.networkUnlocked,
      broadcastUnlocked: s.broadcastUnlocked,
      completed: s.completed,
    }))
  );
  const isModalOpen = useBlueZoneStore((s) => Boolean(s.activeStation || s.investigationBoardOpen));
  const sessionExpired = useBlueZoneStore((s) => s.sessionTimeRemaining <= 0 && !s.completed);

  const objective = getCurrentObjective(progress);

  // The objective usually changes while a station modal is open, so the "updated" flag is held
  // until the player returns to the 3D view, then shown for a few seconds.
  const previousId = useRef(objective.id);
  const [updatePending, setUpdatePending] = useState(false);

  useEffect(() => {
    if (previousId.current !== objective.id) {
      previousId.current = objective.id;
      setUpdatePending(true);
    }
  }, [objective.id]);

  useEffect(() => {
    if (!updatePending || isModalOpen) return;
    const timer = setTimeout(() => setUpdatePending(false), UPDATE_FLASH_MS);
    return () => clearTimeout(timer);
  }, [updatePending, isModalOpen]);

  if (isModalOpen) return null;

  const isComplete = objective.id === "complete";
  const showUpdated = updatePending;

  return (
    // Re-enters with a short slide each time the player returns to the facility view
    <div className={`${motion.panelIn} absolute top-3 left-4 z-20 w-[17rem] max-w-[calc(100%-2rem)] pointer-events-none select-none font-mono`}>
      <div
        className={`rounded bg-[#030b18]/65 backdrop-blur-md shadow-[0_0_28px_rgba(0,190,255,0.07),inset_0_1px_0_rgba(255,255,255,0.05)] border-l-2 border px-3 py-2 transition-colors duration-500 ${showUpdated ? motion.flash : ""} ${
          showUpdated
            ? "border-amber-400/70 border-l-amber-400"
            : isComplete
            ? "border-emerald-700/50 border-l-emerald-400"
            : "border-cyan-900/50 border-l-cyan-400"
        }`}
      >
        <div className="flex items-center justify-between text-[9px] tracking-[0.2em] font-bold">
          <span className={`flex items-center gap-1.5 ${showUpdated ? "text-amber-300" : isComplete ? "text-emerald-300" : "text-cyan-300"}`}>
            <span
              className={`w-1 h-1 rounded-full ${isComplete && !showUpdated ? "" : motion.breathe} ${
                showUpdated ? "bg-amber-300" : isComplete ? "bg-emerald-400" : "bg-cyan-300"
              }`}
            />
            {showUpdated ? "OBJECTIVE UPDATED" : "OBJECTIVE"}
          </span>
          <span className="text-slate-400 tracking-wider">
            {String(objective.step).padStart(2, "0")}/{String(OBJECTIVE_STEPS).padStart(2, "0")}
          </span>
        </div>

        {/* Keyed on the objective so a new objective swaps in instead of replacing text in place */}
        <div key={objective.id} className={motion.swapIn}>
          <div className="mt-1 text-[11px] leading-snug text-radio-textBright">{objective.text}</div>

          <div className="mt-1 text-[9px] tracking-wider text-slate-400 truncate">
            {isComplete ? objective.location : `LOCATION // ${objective.location}`}
          </div>
        </div>

        {sessionExpired && (
          <div className="mt-1.5 pt-1.5 border-t border-red-900/50 text-[9px] tracking-wider text-red-400 font-semibold">
            SESSION WINDOW EXPIRED // INVESTIGATION MAY CONTINUE
          </div>
        )}
      </div>
    </div>
  );
};

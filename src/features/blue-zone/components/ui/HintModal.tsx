"use client";

import React, { useEffect, useRef } from "react";
import { X, Lightbulb, ChevronRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { HINTS_DATABASE } from "../../data/hints";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";

interface HintModalProps {
  challengeId: string;
  challengeTitle: string;
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  challengeId,
  challengeTitle,
  onClose,
}) => {
  const { activeHints, requestHint, audioEnabled } = useBlueZoneStore(
    useShallow((s) => ({ activeHints: s.activeHints, requestHint: s.requestHint, audioEnabled: s.audioEnabled }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  // ESC closes only this advisory layer, not the station underneath. Registered in the capture
  // phase on window so it runs before (and stops) the hub-level ESC handler.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  const hintsList = HINTS_DATABASE[challengeId] || [];
  const currentUnlockedLevel = activeHints[challengeId] || 0;

  const handleRequestNextHint = () => {
    if (audioEnabled) sound.hint();
    requestHint(challengeId);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div ref={panelRef} className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#070e1c] border border-amber-500/50 rounded-lg shadow-amber-glow overflow-hidden font-mono text-radio-text">
        {/* Header */}
        <div className="bg-amber-950/40 px-4 py-3 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              INVESTIGATION ADVISORY // {challengeTitle}
            </span>
          </div>
          <button
            onClick={() => {
              if (audioEnabled) sound.playClick();
              onClose();
            }}
            aria-label="Close advisory"
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-xs text-slate-300 leading-relaxed">
            Advisory telemetry can assist in correlating degraded evidence. Hints guide your reasoning without disclosing canonical data.
          </p>

          <div className="space-y-3">
            {hintsList.map((hint) => {
              const isUnlocked = currentUnlockedLevel >= hint.level;
              return (
                <div
                  key={hint.level}
                  className={`p-3.5 rounded border transition-all ${
                    isUnlocked
                      ? "border-amber-500/50 bg-amber-950/20 text-slate-200"
                      : "border-slate-800 bg-black/40 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-1">
                    <span className={isUnlocked ? "text-amber-400" : "text-slate-400"}>
                      CLUE TIER 0{hint.level} // {hint.title}
                    </span>
                    <span>{isUnlocked ? "UNLOCKED" : "LOCKED"}</span>
                  </div>

                  {isUnlocked ? (
                    <p className="text-xs text-amber-100/90 leading-relaxed mt-1">
                      {hint.clue}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-1">
                      [Encrypted advisory buffer. Request hint tier below.]
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action button */}
          {currentUnlockedLevel < hintsList.length ? (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleRequestNextHint}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all shadow-amber-glow"
              >
                <span>REQUEST TIER 0{currentUnlockedLevel + 1} HINT</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-400 text-center font-semibold pt-1">
              ALL INVESTIGATION ADVISORIES UNLOCKED
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

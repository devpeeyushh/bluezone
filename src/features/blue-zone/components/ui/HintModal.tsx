"use client";

import React, { useEffect, useRef } from "react";
import { X, Lightbulb, ExternalLink } from "lucide-react";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";

// Blue Zone help: the advisory points players to the Blue Zone Discord instead of tiered hints.
// Scoped to this component (rendered only by Blue Zone stations); not a shared or global link.
const DISCORD_INVITE = "https://discord.gg/EPwduT4Xx";

interface HintModalProps {
  challengeId: string;
  challengeTitle: string;
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({ challengeTitle, onClose }) => {
  const audioEnabled = useBlueZoneStore((s) => s.audioEnabled);
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
          <div>
            <div className="text-sm font-bold tracking-[0.2em] text-amber-200">NEED ASSISTANCE?</div>
            <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">Join the Blue Zone community on Discord for help.</p>
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the Discord server (opens discord.gg in a new tab)"
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-bold tracking-wider transition-all shadow-amber-glow focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
          >
            <span>JOIN THE DISCORD SERVER</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
          <p className="text-[10px] text-radio-textMuted text-center tracking-wider">OPENS DISCORD.GG IN A NEW TAB</p>
        </div>
      </div>
    </div>
  );
};

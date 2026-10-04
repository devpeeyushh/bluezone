"use client";

import React, { useEffect, useRef } from "react";
import { Volume2, VolumeX, Radio, LogOut, CheckCircle2, GitBranch } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";

interface StatusBarProps {
  onExit?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onExit }) => {
  const {
    audioEnabled,
    toggleAudio,
    exitHub,
    latestLog,
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    completed,
    openInvestigationBoard,
    sessionTimeRemaining,
    decrementTimer,
    sessionActive,
  } = useBlueZoneStore(
    useShallow((s) => ({
      audioEnabled: s.audioEnabled,
      toggleAudio: s.toggleAudio,
      exitHub: s.exitHub,
      latestLog: s.systemLogs.length > 0 ? s.systemLogs[s.systemLogs.length - 1] : "",
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      completed: s.completed,
      openInvestigationBoard: s.openInvestigationBoard,
      sessionTimeRemaining: s.sessionTimeRemaining,
      decrementTimer: s.decrementTimer,
      sessionActive: s.sessionActive,
    }))
  );
  // SYS_CLOCK ticks every 100ms. It writes straight to the DOM node instead of React state,
  // so the whole status bar no longer re-renders 10 times per second.
  const clockRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const updateTime = () => {
      if (!clockRef.current) return;
      const now = new Date();
      clockRef.current.textContent = `${now.toISOString().slice(11, 19)}.${Math.floor(now.getMilliseconds() / 100)}Z`;
    };
    updateTime();
    const timer = setInterval(updateTime, 100);
    return () => clearInterval(timer);
  }, []);

  const handleAudioToggle = () => {
    toggleAudio();
    if (!audioEnabled) {
      sound.playStationTone(920);
    }
  };

  const handleExit = () => {
    if (audioEnabled) sound.playRadioSquelch();
    exitHub();
    if (onExit) onExit();
  };

  // Session timer ticker (persists through station interaction).
  // A single interval exists only while the session is live: it stops on completion and at zero.
  const sessionExpired = sessionTimeRemaining <= 0 && !completed;
  const timerRunning = sessionActive && !completed && sessionTimeRemaining > 0;
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      decrementTimer(1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, decrementTimer]);

  const formatSessionTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const solvedCount = (challenge1Solved ? 1 : 0) + (challenge2Solved ? 1 : 0) + (challenge3Solved ? 1 : 0);

  return (
    <header className="w-full bg-radio-dark/90 backdrop-blur-md border-b border-radio-border px-4 py-2 flex flex-wrap items-center justify-between gap-y-2 text-xs font-mono text-radio-text select-none z-30">
      {/* Sector identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-radio-cyan font-bold tracking-wider">
          <Radio className="w-4 h-4 animate-pulse text-radio-cyan" />
          <span>MANU // BLUE ZONE</span>
        </div>
        <span className="text-radio-border">|</span>
        <span className="text-radio-cyanDim tracking-widest hidden xl:inline">
          RADIO COMMUNICATION SECTOR
        </span>
        <span className="text-radio-border hidden xl:inline">|</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/20 text-radio-cyan">
          <CheckCircle2 className="w-3 h-3 text-radio-cyan" />
          <span className="text-[10px] font-semibold tracking-wider">
            INVESTIGATION: {solvedCount}/3 RECONSTRUCTED
          </span>
        </div>
      </div>

      {/* Center recent system telemetry prompt */}
      <div className="hidden md:flex flex-1 min-w-0 max-w-md mx-3 items-center gap-2 px-3 py-0.5 rounded bg-black/60 border border-slate-800 text-[11px] text-cyan-300 font-mono truncate">
        <span className="text-cyan-500 font-bold animate-pulse">&gt;</span>
        <span className="truncate">{latestLog.replace(/^>\s*/, "")}</span>
      </div>

      {/* Right telemetry & controls */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden 2xl:block">
          <span className="text-radio-textMuted mr-2">SYS_CLOCK:</span>
          <span ref={clockRef} className="text-radio-textBright">00:00:00.0Z</span>
        </div>

        {/* Session Countdown Timer (atmospheric constraint only: no score, no ranking) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/60 border text-[11px] font-mono ${
            completed
              ? "border-emerald-500/40"
              : sessionExpired
              ? "border-red-500/60 shadow-red-glow"
              : "border-amber-500/40 shadow-amber-glow"
          }`}
          title={sessionExpired ? "Session window expired. Progress is kept; the investigation may continue." : undefined}
        >
          <span
            className={`font-bold hidden xl:inline ${
              completed ? "text-emerald-400" : sessionExpired ? "text-red-400" : "text-amber-400"
            }`}
          >
            {completed ? "SESSION SEALED:" : sessionExpired ? "SESSION WINDOW EXPIRED" : "RADIO NETWORK SESSION:"}
          </span>
          {sessionExpired ? (
            <span className="text-red-300 font-bold tracking-widest xl:hidden">EXPIRED</span>
          ) : (
            <span className={`font-bold tracking-widest ${completed ? "text-emerald-300" : "text-amber-300"}`}>
              {formatSessionTime(sessionTimeRemaining)}
            </span>
          )}
        </div>

        {/* Sound toggle */}
        <button
          onClick={handleAudioToggle}
          title={audioEnabled ? "Disable RF Audio" : "Enable RF Audio"}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
            audioEnabled
              ? "border-radio-cyan/50 text-radio-cyan bg-cyan-950/40 shadow-cyan-glow"
              : "border-radio-border text-radio-textMuted hover:text-radio-text"
          }`}
        >
          {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="text-[10px] uppercase font-bold">{audioEnabled ? "AUDIO ON" : "MUTED"}</span>
        </button>

        {/* Investigation Board */}
        <button
          onClick={() => {
            if (audioEnabled) sound.playClick();
            openInvestigationBoard();
          }}
          title="Open Investigation Board"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-400 transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold hidden sm:inline">BOARD</span>
        </button>

        {/* Exit Blue Zone */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-950/30 hover:border-red-500/60 transition-colors"
          title="Return to Sector Entrance"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase font-bold hidden sm:inline">EXIT HUB</span>
        </button>
      </div>
    </header>
  );
};

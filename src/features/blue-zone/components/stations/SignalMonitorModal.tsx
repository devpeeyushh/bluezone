"use client";

import React, { useEffect, useRef, useState } from "react";
import { Activity, X, Lock, CheckCircle2, HelpCircle, Pause, Play } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CHALLENGES, CTF_04 } from "../../data/ctf/registry";
import { SIGNALS } from "../../data/ctf/signalMonitor";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { HintModal } from "../ui/HintModal";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { CtfTabs, CtfTabPanel, CtfTab } from "../ctf/CtfTabs";
import { FlagSubmitForm } from "../ctf/FlagSubmitForm";
import { InvestigationNotes } from "../ctf/InvestigationNotes";
import { useSignalPlayback, formatSignalTime } from "./signal/useSignalPlayback";
import {
  AnalysisPanel,
  SignalEvidencePanel,
  SignalRecordingPanel,
  SignalsPanel,
  TransmissionLogPanel,
} from "./signal/SignalEvidence";
import { CarrierLockPanel } from "./signal/CarrierLockPanel";

interface Props {
  onClose: () => void;
}

type SignalTab = "signals" | "recording" | "analysis" | "log" | "evidence" | "notes" | "submit" | "failed";

const definition = CHALLENGES[CTF_04];

// Signal Monitor. Keeps its existing unlock rule. Hosts the standalone CTF 04 (intercepts → the one
// the relay accepted → keyed digits → archive index → navigation packet → external map → flag) and,
// under FAILED LOGS, its original carrier-lock challenge unchanged.
export const SignalMonitorModal: React.FC<Props> = ({ onClose }) => {
  const { signalMonitorUnlocked, ctf04Solved, reward, setActiveStation, audioEnabled, toggleAudio } = useBlueZoneStore(
    useShallow((s) => ({
      signalMonitorUnlocked: s.signalMonitorUnlocked,
      ctf04Solved: s.ctf04Solved,
      reward: s.challengeRewards[CTF_04],
      setActiveStation: s.setActiveStation,
      audioEnabled: s.audioEnabled,
      toggleAudio: s.toggleAudio,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  // Lockout check (existing rule, unchanged)
  if (!signalMonitorUnlocked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <div ref={panelRef} className="relative w-full max-w-md bg-radio-panel border border-red-500/50 rounded-lg p-6 text-center font-mono text-radio-text shadow-red-glow">
          <Lock className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
          <div className="text-sm font-bold text-red-300 tracking-wider">
            STATION 03 // SIGNAL MONITOR LOCKED
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            RF demodulator is currently locked. Restore the relay route at Station 04 (Network Map) to calibrate receiver synthesizers.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => {
                setActiveStation("network-map");
              }}
              className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60"
            >
              GO TO NETWORK MAP
            </button>
            <button
              onClick={() => {
                onClose();
              }}
              className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SignalMonitorWorkstation
      panelRef={panelRef}
      onClose={onClose}
      ctf04Solved={ctf04Solved}
      reward={reward}
      audioEnabled={audioEnabled}
      onEnableAudio={toggleAudio}
      onProceedToBroadcast={() => setActiveStation("emergency-broadcast")}
    />
  );
};

// Split out so the audio element only exists while the station is actually unlocked and open
const SignalMonitorWorkstation: React.FC<{
  panelRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  ctf04Solved: boolean;
  reward: { source?: string; communication?: string; recoveredFragment?: string } | undefined;
  audioEnabled: boolean;
  onEnableAudio: () => void;
  onProceedToBroadcast: () => void;
}> = ({ panelRef, onClose, ctf04Solved, reward, audioEnabled, onEnableAudio, onProceedToBroadcast }) => {
  const [tab, setTab] = useState<SignalTab>(() => (ctf04Solved ? "submit" : "signals"));
  const [selected, setSelected] = useState(SIGNALS[0].id);
  const [showHint, setShowHint] = useState(false);
  const rec = useSignalPlayback(selected, audioEnabled);
  const signal = SIGNALS.find((s) => s.id === selected) ?? SIGNALS[0];

  // CTF 04 sits outside the 3-challenge chain, so confirm its solve here, once
  const wasSolved = useRef(ctf04Solved);
  useEffect(() => {
    if (ctf04Solved && !wasSolved.current && audioEnabled) sound.solveConfirm();
    wasSolved.current = ctf04Solved;
  }, [ctf04Solved, audioEnabled]);

  const selectTab = (next: SignalTab) => {
    if (next !== tab && audioEnabled) sound.playClick();
    setTab(next);
  };

  const tabs: CtfTab<SignalTab>[] = [
    { id: "signals", label: "SIGNALS" },
    { id: "recording", label: "RECORDING" },
    { id: "analysis", label: "ANALYSIS" },
    { id: "log", label: "TRANSMISSION LOG" },
    { id: "evidence", label: "EVIDENCE" },
    { id: "notes", label: "NOTES" },
    { id: "submit", label: ctf04Solved ? "RECOVERED" : "SUBMIT", marker: ctf04Solved },
    { id: "failed", label: "FAILED LOGS" },
  ];

  // The header advisory follows the investigation in view: FAILED LOGS keeps its original hints
  const hintTarget = tab === "failed" ? { id: "challenge-2", title: "FAILED TRANSMISSION & CARRIER" } : { id: CTF_04, title: `${definition.label} // ${definition.title}` };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-amber-500/40 rounded-lg shadow-amber-glow flex flex-col overflow-hidden text-radio-text font-mono">

        {/* Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 shrink-0 text-amber-400" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider truncate">
              STATION 03 // SIGNAL MONITOR [RF-SPEC-03]
            </span>
            <span
              className={`hidden sm:inline shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                ctf04Solved
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-amber-500/40 bg-amber-950/40 text-amber-300"
              }`}
            >
              {ctf04Solved ? `${definition.label} SOLVED` : "INVESTIGATION ACTIVE"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (audioEnabled) sound.playClick();
                setShowHint(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>REQUEST HINT</span>
            </button>
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
        </div>

        {/* Case line + receiver transport (playback continues across tabs) */}
        <div className="px-4 py-2 border-b border-radio-border bg-radio-dark/70 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] tracking-[0.2em] text-radio-textMuted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-amber-300 font-bold">
              SIGNAL MONITOR // {definition.title}
            </span>
            <span>{definition.label} // {definition.category}</span>
          </div>
          <button
            type="button"
            onClick={rec.toggle}
            disabled={!rec.ready}
            aria-label={rec.playing ? `Pause ${signal.id}` : `Play ${signal.id}`}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-radio-border text-radio-text hover:border-radio-cyan disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            {rec.playing ? <Pause className="w-3 h-3 text-amber-300" /> : <Play className="w-3 h-3" />}
            <span>{signal.id}</span>
            <span className="tabular-nums" aria-hidden>
              {formatSignalTime(rec.time)}
            </span>
          </button>
        </div>

        <CtfTabs idPrefix="ctf04" label="Signal Monitor investigation" tabs={tabs} active={tab} onChange={selectTab} />

        <CtfTabPanel idPrefix="ctf04" active={tab}>
          {tab === "signals" && (
            <SignalsPanel
              selected={selected}
              onSelect={setSelected}
              onOpen={(id) => {
                setSelected(id);
                selectTab("recording");
              }}
            />
          )}
          {tab === "recording" && (
            <SignalRecordingPanel signal={signal} rec={rec} audioOn={audioEnabled} onEnableAudio={onEnableAudio} />
          )}
          {tab === "analysis" && <AnalysisPanel signal={signal} />}
          {tab === "log" && <TransmissionLogPanel />}
          {tab === "evidence" && <SignalEvidencePanel />}
          {tab === "notes" && (
            <div className="max-w-2xl">
              <div className="text-sm font-bold tracking-[0.2em] text-radio-textBright mb-2">INVESTIGATION NOTES</div>
              <InvestigationNotes
                challengeId={CTF_04}
                prompt="Record the intercept that matters, its carrier, what the bursts turn out to be, the reference they carry and where the recovered navigation data points."
              />
            </div>
          )}
          {tab === "submit" &&
            (ctf04Solved ? (
              <div className="max-w-2xl p-5 rounded border border-emerald-500/50 bg-emerald-950/20 space-y-3" role="status">
                <div className="text-[10px] tracking-[0.3em] text-radio-textMuted">SIGNAL MONITOR</div>
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm tracking-[0.2em]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>{reward?.communication ?? "NAVIGATION TARGET CONFIRMED"}</span>
                </div>
                <div className="text-xs font-bold tracking-[0.25em] text-amber-200">{reward?.recoveredFragment ?? "COASTAL RELAY IDENTIFIED"}</div>
                <p className="pt-3 border-t border-emerald-500/30 text-[11px] font-bold tracking-[0.25em] text-emerald-400/90">
                  {definition.label} COMPLETE
                </p>
              </div>
            ) : (
              <div className="max-w-2xl space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Identify the destination the recovered navigation packet points to and transmit its name as a flag, words joined by underscores.
                </p>
                <FlagSubmitForm challengeId={CTF_04} />
              </div>
            ))}
          {tab === "failed" && <CarrierLockPanel onProceedToBroadcast={onProceedToBroadcast} />}
        </CtfTabPanel>
      </div>
      {showHint && <HintModal challengeId={hintTarget.id} challengeTitle={hintTarget.title} onClose={() => setShowHint(false)} />}
    </div>
  );
};

"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, X, HelpCircle, CheckCircle2, Pause, Play } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CHALLENGES, CTF_03 } from "../../data/ctf/registry";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { HintModal } from "../ui/HintModal";
import { CtfTabs, CtfTabPanel, CtfTab } from "../ctf/CtfTabs";
import { FlagSubmitForm } from "../ctf/FlagSubmitForm";
import { InvestigationNotes } from "../ctf/InvestigationNotes";
import { useRecording, formatTime } from "./voice/useRecording";
import { RecordingPanel } from "./voice/RecordingPanel";
import { EvidencePanel, TowerLogsPanel, TranscriptPanel } from "./voice/ArchiveEvidence";

interface Props {
  onClose: () => void;
}

type VoiceTab = "recording" | "transcript" | "towers" | "evidence" | "notes" | "submit";

const definition = CHALLENGES[CTF_03];

// Voice Archive. Hosts the standalone CTF 03 (audio forensics → Morse → tower-log extraction →
// flag), open from a fresh session. Self-contained: no evidence from other stations.
export const VoiceArchiveModal: React.FC<Props> = ({ onClose }) => {
  const { ctf03Solved, reward, audioEnabled } = useBlueZoneStore(
    useShallow((s) => ({
      ctf03Solved: s.ctf03Solved,
      reward: s.challengeRewards[CTF_03],
      audioEnabled: s.audioEnabled,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();
  const rec = useRecording();

  const [tab, setTab] = useState<VoiceTab>(() => (ctf03Solved ? "submit" : "recording"));
  const [showHint, setShowHint] = useState(false);

  // CTF 03 is outside the 3-challenge chain, so the facility's solve cue (driven by those flags)
  // doesn't cover it: confirm the solve here, once
  const wasSolved = useRef(ctf03Solved);
  useEffect(() => {
    if (ctf03Solved && !wasSolved.current && audioEnabled) sound.solveConfirm();
    wasSolved.current = ctf03Solved;
  }, [ctf03Solved, audioEnabled]);

  const selectTab = (next: VoiceTab) => {
    if (next !== tab && audioEnabled) sound.playClick();
    setTab(next);
  };

  const tabs: CtfTab<VoiceTab>[] = [
    { id: "recording", label: "RECORDING" },
    { id: "transcript", label: "TRANSCRIPT" },
    { id: "towers", label: "TOWER LOGS" },
    { id: "evidence", label: "EVIDENCE" },
    { id: "notes", label: "NOTES" },
    { id: "submit", label: ctf03Solved ? "RECOVERED" : "SUBMIT", marker: ctf03Solved },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-cyan-500/40 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">

        {/* Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Mic className="w-4 h-4 shrink-0 text-cyan-400" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider truncate">
              STATION 02 // VOICE ARCHIVE [RF-VOX-02]
            </span>
            <span
              className={`hidden sm:inline shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                ctf03Solved
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-cyan-500/40 bg-cyan-950/40 text-cyan-300"
              }`}
            >
              {ctf03Solved ? `${definition.label} SOLVED` : "INVESTIGATION ACTIVE"}
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

        {/* Case line + persistent transport (playback continues across tabs) */}
        <div className="px-4 py-2 border-b border-radio-border bg-radio-dark/70 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[10px] tracking-[0.2em] text-radio-textMuted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-radio-cyan font-bold">
              {definition.label} // {definition.title}
            </span>
            <span>{definition.category}</span>
          </div>
          <button
            type="button"
            onClick={rec.toggle}
            disabled={!rec.ready}
            aria-label={rec.playing ? "Pause recording VA-07" : "Play recording VA-07"}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-radio-border text-radio-text hover:border-radio-cyan disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            {rec.playing ? <Pause className="w-3 h-3 text-amber-300" /> : <Play className="w-3 h-3" />}
            <span>VA-07</span>
            <span className="tabular-nums" aria-hidden>
              {formatTime(rec.time)}
            </span>
          </button>
        </div>

        <CtfTabs idPrefix="ctf03" label="Voice Archive evidence" tabs={tabs} active={tab} onChange={selectTab} />

        <CtfTabPanel idPrefix="ctf03" active={tab}>
          {tab === "recording" && <RecordingPanel rec={rec} />}
          {tab === "transcript" && <TranscriptPanel />}
          {tab === "towers" && <TowerLogsPanel />}
          {tab === "evidence" && <EvidencePanel />}
          {tab === "notes" && (
            <div className="max-w-2xl">
              <div className="text-sm font-bold tracking-[0.2em] text-radio-textBright mb-2">INVESTIGATION NOTES</div>
              <InvestigationNotes challengeId={CTF_03} prompt="Record observations from the recovered transmission." />
            </div>
          )}
          {tab === "submit" &&
            (ctf03Solved ? (
              <div className="max-w-2xl p-5 rounded border border-emerald-500/50 bg-emerald-950/20 space-y-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm tracking-[0.2em]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>TRANSMISSION RECOVERED</span>
                </div>
                <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2.5 text-xs">
                  <dt className="text-radio-textMuted tracking-wider">SOURCE</dt>
                  <dd className="text-emerald-200 font-bold tracking-wider">{reward?.source ?? "—"}</dd>
                  <dt className="text-radio-textMuted tracking-wider">RECORDING</dt>
                  <dd className="text-radio-textBright font-bold tracking-wider">{reward?.communication ?? "VA-07"}</dd>
                  <dt className="text-radio-textMuted tracking-wider">KEYWORD</dt>
                  <dd className="text-amber-200 font-bold tracking-[0.3em]">{reward?.recoveredFragment ?? "—"}</dd>
                </dl>
                <p className="pt-3 border-t border-emerald-500/30 text-[11px] text-emerald-400/90">
                  {definition.label} VERIFIED. This archive stands alone: no other station was affected.
                </p>
              </div>
            ) : (
              <div className="max-w-2xl space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  The recording points somewhere. Follow it through the archive, recover the keyword, and transmit it as
                  a flag.
                </p>
                <FlagSubmitForm challengeId={CTF_03} />
              </div>
            ))}
        </CtfTabPanel>
      </div>
      {showHint && (
        <HintModal
          challengeId={CTF_03}
          challengeTitle={`${definition.label} // ${definition.title}`}
          onClose={() => setShowHint(false)}
        />
      )}
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { Terminal, CheckCircle2, ArrowRight, X, HelpCircle } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { CHALLENGES, CTF_01 } from "../../data/ctf/registry";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { HintModal } from "../ui/HintModal";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { CtfTabs, CtfTabPanel, CtfTab } from "../ctf/CtfTabs";
import { FlagSubmitForm } from "../ctf/FlagSubmitForm";
import { InvestigationNotes } from "../ctf/InvestigationNotes";
import { ArchivePanel, MetadataPanel, TransmissionPanel } from "./terminal/TerminalEvidence";
import { ProfilePanel } from "./terminal/SocialArchive";

interface Props {
  onClose: () => void;
}

type TerminalTab = "transmission" | "profile" | "archive" | "evidence" | "notes" | "submit";

const TABS: CtfTab<TerminalTab>[] = [
  { id: "transmission", label: "TRANSMISSION" },
  { id: "profile", label: "PROFILE" },
  { id: "archive", label: "ARCHIVE" },
  { id: "evidence", label: "EVIDENCE" },
  { id: "notes", label: "NOTES" },
  { id: "submit", label: "SUBMIT" },
];

const definition = CHALLENGES[CTF_01];

// CTF 01 — INTERCEPTED MESSAGE. Investigation terminal: corrupted transmission + fictional social
// profile + survivor archive + metadata → node ID → flag. Validation is behind submitChallenge().
export const CommunicationTerminalModal: React.FC<Props> = ({ onClose }) => {
  const { challenge1Solved, reward, setActiveStation, audioEnabled } = useBlueZoneStore(
    useShallow((s) => ({
      challenge1Solved: s.challenge1Solved,
      reward: s.challengeRewards[CTF_01],
      setActiveStation: s.setActiveStation,
      audioEnabled: s.audioEnabled,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  const [tab, setTab] = useState<TerminalTab>(() => (challenge1Solved ? "submit" : "transmission"));
  const [showHint, setShowHint] = useState(false);

  const selectTab = (next: TerminalTab) => {
    if (next !== tab && audioEnabled) sound.playClick();
    setTab(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-radio-cyan/40 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">

        {/* Terminal Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Terminal className="w-4 h-4 shrink-0 text-radio-cyan" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider truncate">
              STATION 01 // COMMUNICATION TERMINAL [RF-COMM-01]
            </span>
            <span
              className={`hidden sm:inline shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${
                challenge1Solved
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-cyan-500/40 bg-cyan-950/40 text-radio-cyan"
              }`}
            >
              {challenge1Solved ? `${definition.label} SOLVED` : "INVESTIGATION ACTIVE"}
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
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Case line */}
        <div className="px-4 py-2 border-b border-radio-border bg-radio-dark/70 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] tracking-[0.2em] text-radio-textMuted">
          <span className="text-radio-cyan font-bold">
            {definition.label} // {definition.title}
          </span>
          <span>{definition.category}</span>
          <span className="hidden md:inline">RECONSTRUCT THE TRANSMISSION. IDENTIFY THE NODE IT POINTS TO.</span>
        </div>

        <CtfTabs
          idPrefix="ctf01"
          label="Communication Terminal evidence"
          tabs={TABS.map((t) => (t.id === "submit" && challenge1Solved ? { ...t, label: "HANDOFF", marker: true } : t))}
          active={tab}
          onChange={selectTab}
        />

        <CtfTabPanel idPrefix="ctf01" active={tab}>
          {tab === "transmission" && <TransmissionPanel />}
          {tab === "profile" && <ProfilePanel onOpenArchive={() => selectTab("archive")} />}
          {tab === "archive" && <ArchivePanel />}
          {tab === "evidence" && <MetadataPanel />}
          {tab === "notes" && (
            <InvestigationNotes
              challengeId={CTF_01}
              prompt="Reassemble the transmission, then write down what each source tells you about the node's word and its number."
            />
          )}
          {tab === "submit" &&
            (challenge1Solved ? (
              /* Forensic handoff */
              <div className="max-w-2xl p-5 rounded border border-emerald-500/50 bg-emerald-950/20 space-y-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm tracking-[0.2em]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>COMMUNICATION RESTORED</span>
                </div>
                <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2.5 text-xs">
                  <dt className="text-radio-textMuted tracking-wider">SOURCE</dt>
                  <dd className="text-emerald-200 font-bold tracking-wider">{reward?.source ?? "—"}</dd>
                  <dt className="text-radio-textMuted tracking-wider">NEXT ROUTE</dt>
                  <dd className="text-radio-textBright font-bold tracking-wider">{reward?.nextRoute ?? "NETWORK MAP"}</dd>
                  <dt className="text-radio-textMuted tracking-wider">RECOVERED FRAGMENT</dt>
                  <dd>
                    <code className="block p-2.5 rounded bg-black/70 border border-amber-500/40 text-amber-200 tracking-wider break-all select-text">
                      {reward?.recoveredFragment ?? "[FRAGMENT UNAVAILABLE]"}
                    </code>
                    <span className="block mt-1.5 text-[10px] text-radio-textMuted">
                      Scrambled. Kept in the investigation log; it will matter further down the route.
                    </span>
                  </dd>
                </dl>
                <div className="pt-3 border-t border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] text-emerald-400">NEXT OBJECTIVE: NETWORK MAP</span>
                  <button
                    onClick={() => setActiveStation("network-map")}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-xs font-bold transition-colors"
                  >
                    <span>PROCEED TO NETWORK MAP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  TRANSMISSION_07 names a relay node that isn&apos;t on any official map. Once the evidence agrees on
                  the node&apos;s word and its number, transmit it as a flag.
                </p>
                <FlagSubmitForm challengeId={CTF_01} />
              </div>
            ))}
        </CtfTabPanel>
      </div>
      {showHint && (
        <HintModal
          challengeId={CTF_01}
          challengeTitle={`${definition.label} // ${definition.title}`}
          onClose={() => setShowHint(false)}
        />
      )}
    </div>
  );
};

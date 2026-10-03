"use client";

import React from "react";
import { GitBranch, X, Cpu, Wifi, Share2, ShieldAlert, Lock } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";

interface Props {
  onClose: () => void;
}

// Evidence states shown on the board. Derived from the existing challenge flags;
// undiscovered values stay masked so the board remains a reasoning surface, not an answer sheet.
type EvidenceState = "VERIFIED" | "DISCOVERED" | "UNDISCOVERED" | "LOCKED";

const EVIDENCE_STYLE: Record<EvidenceState, { chip: string; label: string; description: string }> = {
  VERIFIED: {
    chip: "border-emerald-500/50 bg-emerald-950/40 text-emerald-300",
    label: "VERIFIED",
    description: "Reconstructed and confirmed",
  },
  DISCOVERED: {
    chip: "border-cyan-400/50 bg-cyan-950/40 text-cyan-300",
    label: "DISCOVERED",
    description: "Evidence found, pending confirmation",
  },
  UNDISCOVERED: {
    chip: "border-amber-500/40 bg-amber-950/40 text-amber-300",
    label: "UNDISCOVERED",
    description: "Accessible, not yet reconstructed",
  },
  LOCKED: {
    chip: "border-red-900/60 bg-red-950/30 text-red-400/90",
    label: "LOCKED // REQUIRES EVIDENCE",
    description: "Earlier evidence must be verified first",
  },
};

const EvidenceChip: React.FC<{ state: EvidenceState }> = ({ state }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border tracking-wider ${EVIDENCE_STYLE[state].chip}`}
  >
    {state === "LOCKED" && <Lock className="w-3 h-3" />}
    {EVIDENCE_STYLE[state].label}
  </span>
);

const RequiresNote: React.FC<{ text: string }> = ({ text }) => (
  <div className="mt-3 text-[10px] tracking-wider text-red-400/80">REQUIRES // {text}</div>
);

export const InvestigationBoardModal: React.FC<Props> = ({ onClose }) => {
  const {
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    completed,
    broadcastUnlocked,
    audioEnabled,
  } = useBlueZoneStore(
    useShallow((s) => ({
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      completed: s.completed,
      broadcastUnlocked: s.broadcastUnlocked,
      audioEnabled: s.audioEnabled,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  const sectionState: Record<"communication" | "signal" | "network" | "broadcast", EvidenceState> = {
    communication: challenge1Solved ? "VERIFIED" : "UNDISCOVERED",
    signal: challenge2Solved ? "VERIFIED" : challenge1Solved ? "UNDISCOVERED" : "LOCKED",
    network: challenge3Solved ? "VERIFIED" : challenge2Solved ? "UNDISCOVERED" : "LOCKED",
    broadcast: completed ? "VERIFIED" : broadcastUnlocked ? "DISCOVERED" : "LOCKED",
  };

  const handleClose = () => {
    if (audioEnabled) sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[88vh] bg-[#070d1c] border border-cyan-500/50 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">
        
        {/* Header */}
        <div className="bg-[#0b162c] px-5 py-3.5 border-b border-radio-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitBranch className="w-5 h-5 text-radio-cyan animate-pulse" />
            <div>
              <span className="text-sm font-bold text-radio-textBright tracking-widest uppercase">
                INVESTIGATION // RADIO COMMUNICATION SECTOR
              </span>
              <span className="text-[10px] text-cyan-400/80 block">
                FORENSIC REASONING BOARD // PERSISTENT EVIDENCE GRAPH
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close investigation board"
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board Body: 4 Forensic Sections */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[radial-gradient(#102544_1px,transparent_1px)] [background-size:20px_20px]">
          {/* Evidence state legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-radio-textMuted">
            <span className="tracking-widest font-semibold">EVIDENCE STATE:</span>
            {(Object.keys(EVIDENCE_STYLE) as EvidenceState[]).map((state) => (
              <span key={state} className="flex items-center gap-1.5">
                <EvidenceChip state={state} />
                <span className="hidden lg:inline">{EVIDENCE_STYLE[state].description}</span>
              </span>
            ))}
          </div>
          
          {/* SECTION 1: COMMUNICATION */}
          <div className="p-4 rounded-lg border border-radio-border bg-radio-surface/70 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-radio-border pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-radio-cyan">
                <Cpu className="w-4 h-4 text-radio-cyan" />
                <span>01 // COMMUNICATION PACKET TRAIL</span>
              </div>
              <EvidenceChip state={sectionState.communication} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Box 1 */}
              <div className={`p-3 rounded border text-center ${
                challenge1Solved
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-slate-700 bg-black/50 text-slate-400"
              }`}>
                <div className="text-[9px] text-radio-textMuted uppercase mb-1">TRANSMITTER CALLSIGN</div>
                <div className="text-base font-bold">
                  {challenge1Solved ? "SANC-0003" : "SANC-????"}
                </div>
                <div className="text-[10px] mt-1 text-slate-400">
                  {challenge1Solved ? "Sector 3 (Radio)" : "[CHECKSUM LOSS]"}
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-center text-xs text-radio-cyan/60 hidden md:block">
                <span className="block text-[10px] text-radio-textMuted mb-1">4 DISTRESS CALLS</span>
                ──────►
              </div>

              {/* Box 2 */}
              <div className={`p-3 rounded border text-center ${
                challenge1Solved
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-slate-700 bg-black/50 text-slate-400"
              }`}>
                <div className="text-[9px] text-radio-textMuted uppercase mb-1">PACKET BETA SIGNATURE</div>
                <div className="text-xs font-bold">
                  {challenge1Solved ? "7 ROUTE WARNINGS VERIFIED" : "TRAILER CORRUPTED"}
                </div>
                <div className="text-[10px] mt-1 text-slate-400">
                  {challenge1Solved ? "Correlates with Community evacuation" : "[UNRESOLVED]"}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: SIGNAL */}
          <div className={`p-4 rounded-lg border border-radio-border bg-radio-surface/70 backdrop-blur-sm transition-opacity ${sectionState.signal === "LOCKED" ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between border-b border-radio-border pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <Wifi className="w-4 h-4 text-amber-400" />
                <span>02 // RF CARRIER FREQUENCY & FAILED TRANSMISSIONS</span>
              </div>
              <EvidenceChip state={sectionState.signal} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Box 1 */}
              <div className={`p-3 rounded border text-center ${
                challenge2Solved
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-slate-700 bg-black/50 text-slate-400"
              }`}>
                <div className="text-[9px] text-radio-textMuted uppercase mb-1">ANOMALOUS TRANSMITTER</div>
                <div className="text-base font-bold">
                  {challenge2Solved ? "FAIL-LOG-02" : "UNKNOWN SENDER"}
                </div>
                <div className="text-[10px] mt-1 text-slate-400">
                  {challenge2Solved ? "5 Handshake Drops // 24.1h Non-Response" : "[DROPPED HANDSHAKE]"}
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-center text-xs text-amber-400/70 hidden md:block">
                <span className="block text-[10px] text-radio-textMuted mb-1">HARMONIC SWEEP</span>
                ──────►
              </div>

              {/* Box 2 */}
              <div className={`p-3 rounded border text-center ${
                challenge2Solved
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-slate-700 bg-black/50 text-slate-400"
              }`}>
                <div className="text-[9px] text-radio-textMuted uppercase mb-1">CARRIER BAND ALIGNMENT</div>
                <div className="text-base font-bold">
                  {challenge2Solved ? "156.30 MHz" : "[CARRIER DRIFT]"}
                </div>
                <div className="text-[10px] mt-1 text-slate-400">
                  {challenge2Solved ? "VHF Emergency Repeater Grid" : "Uncalibrated Frequency"}
                </div>
              </div>
            </div>
            {sectionState.signal === "LOCKED" && <RequiresNote text="SECTION 01 VERIFIED" />}
          </div>

          {/* SECTION 3: NETWORK */}
          <div className={`p-4 rounded-lg border border-radio-border bg-radio-surface/70 backdrop-blur-sm transition-opacity ${sectionState.network === "LOCKED" ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between border-b border-radio-border pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Share2 className="w-4 h-4 text-cyan-300" />
                <span>03 // RESIDENT COORDINATION MESH</span>
              </div>
              <EvidenceChip state={sectionState.network} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Source Nexus */}
              <div className={`p-3 rounded border text-center ${
                challenge3Solved
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-slate-700 bg-black/50 text-slate-400"
              }`}>
                <div className="text-[9px] text-radio-textMuted uppercase mb-1">RADIO NEXUS NODE</div>
                <div className="text-base font-bold">
                  {challenge3Solved ? "SANC-0002" : "NODE-????"}
                </div>
                <div className="text-[10px] mt-1 text-slate-400">
                  {challenge3Solved ? "Centrality 1.00 // 11 Contact Chains" : "[MAX CENTRALITY UNRESOLVED]"}
                </div>
              </div>

              {/* Connecting arrow */}
              <div className="text-center text-xs text-cyan-400/70 hidden md:block">
                <span className="block text-[10px] text-radio-textMuted mb-1">CROSS-SECTOR CIRCUIT</span>
                ──────►
              </div>

              {/* Destination Gateway */}
              <div className={`p-3 rounded border text-center ${
                challenge3Solved
                  ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-300"
                  : "border-slate-700 bg-black/50 text-slate-400"
              }`}>
                <div className="text-[9px] text-radio-textMuted uppercase mb-1">FORENSICS BORDER GATEWAY</div>
                <div className="text-base font-bold">
                  {challenge3Solved ? "SANC-0034" : "GATEWAY-????"}
                </div>
                <div className="text-[10px] mt-1 text-slate-400">
                  {challenge3Solved ? "Centrality 0.94 // 11 Contact Chains" : "[BORDER ROUTE UNMAPPED]"}
                </div>
              </div>
            </div>
            {sectionState.network === "LOCKED" && <RequiresNote text="SECTION 02 VERIFIED" />}
          </div>

          {/* SECTION 4: BROADCAST */}
          <div className={`p-4 rounded-lg border border-red-500/40 bg-red-950/15 backdrop-blur-sm transition-opacity ${sectionState.broadcast === "LOCKED" ? "opacity-60" : ""}`}>
            <div className="flex items-center justify-between border-b border-red-500/30 pb-2 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>04 // EMERGENCY BROADCAST ROOT DISCOVERY</span>
              </div>
              <EvidenceChip state={sectionState.broadcast} />
            </div>

            {completed ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-black/60 border border-emerald-500/30">
                  <div className="text-[9px] text-radio-textMuted uppercase">BROADCAST SOURCE</div>
                  <div className="text-sm font-bold text-emerald-300 mt-1">AUTOMATIC SYSTEM</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">No human or MANU dispatch</div>
                </div>

                <div className="p-3 rounded bg-black/60 border border-emerald-500/30">
                  <div className="text-[9px] text-radio-textMuted uppercase">SYSTEM TRIGGER</div>
                  <div className="text-sm font-bold text-amber-300 mt-1">UNAUTHORIZED ACCESS</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Security tripwire breach</div>
                </div>

                <div className="p-3 rounded bg-black/60 border border-emerald-500/30">
                  <div className="text-[9px] text-radio-textMuted uppercase">PHYSICAL ORIGIN</div>
                  <div className="text-sm font-bold text-cyan-300 mt-1">FORENSICS EVIDENCE VAULT</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Next Required Sector</div>
                </div>
              </div>
            ) : (
              <div className="p-2">
                <div className="text-xs text-slate-400 leading-relaxed italic">
                  {broadcastUnlocked
                    ? "\u201cRelay security lockout disengaged. Root broadcast headers are ready for decryption at the Emergency Broadcast Relay.\u201d"
                    : "\u201cRoot broadcast headers remain encrypted behind security tripwires. Resolve Communication, Signal, and Network challenges to decipher the true origin of the citywide evacuation alert.\u201d"}
                </div>
                {sectionState.broadcast === "LOCKED" && <RequiresNote text="SECTIONS 01–03 VERIFIED" />}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#091224] px-5 py-3 border-t border-radio-border flex items-center justify-between text-[11px] text-radio-textMuted">
          <div>SANCTUARY_ID DATA INTEGRATION // BLUE ZONE GROUND TRUTH</div>
          <button
            onClick={handleClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
          >
            RETURN TO FACILITY
          </button>
        </div>
      </div>
    </div>
  );
};

"use client";

import React, { useState } from "react";
import { Share2, X, Lock, CheckCircle2, ArrowRight, GitCommit, HelpCircle } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { NETWORK_CANDIDATE_NODES } from "../../data/challenges";
import { validateChallenge3 } from "../../utils/validation";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { HintModal } from "../ui/HintModal";
import { VerificationFeedback } from "../ui/VerificationFeedback";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";

interface Props {
  onClose: () => void;
}

export const NetworkMapModal: React.FC<Props> = ({ onClose }) => {
  const {
    networkUnlocked,
    challenge3Solved,
    solveChallenge3,
    setActiveStation,
    audioEnabled,
    recordFailedAttempt,
    failedAttempts,
  } = useBlueZoneStore(
    useShallow((s) => ({
      networkUnlocked: s.networkUnlocked,
      challenge3Solved: s.challenge3Solved,
      solveChallenge3: s.solveChallenge3,
      setActiveStation: s.setActiveStation,
      audioEnabled: s.audioEnabled,
      recordFailedAttempt: s.recordFailedAttempt,
      failedAttempts: s.failedAttemptCounts["challenge-3"] || 0,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  // Nothing is pre-selected: the route itself is the answer to this challenge
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedTarget, setSelectedTarget] = useState("");
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleVerifyNetwork = (e: React.FormEvent) => {
    e.preventDefault();
    // An incomplete form is not a wrong answer: report it without counting a failed attempt
    if (!selectedSource || !selectedTarget) {
      if (audioEnabled) sound.playClick();
      setFeedback({ success: false, message: "DIAGNOSTIC ERROR: Select both a source nexus and an exit gateway before routing." });
      return;
    }
    const res = validateChallenge3(selectedSource, selectedTarget);
    setFeedback(res);

    if (res.success) {
      if (audioEnabled) {
        sound.playStationTone(1400);
        sound.playClick();
      }
      solveChallenge3();
    } else {
      if (audioEnabled) sound.playRadioSquelch();
      recordFailedAttempt("challenge-3");
    }
  };

  const handleProceedToBroadcast = () => {
    if (audioEnabled) sound.playClick();
    setActiveStation("emergency-broadcast");
  };

  // Lockout check
  if (!networkUnlocked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <div ref={panelRef} className="relative w-full max-w-md bg-radio-panel border border-red-500/50 rounded-lg p-6 text-center font-mono text-radio-text shadow-red-glow">
          <Lock className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
          <div className="text-sm font-bold text-red-300 tracking-wider">
            STATION 04 // NETWORK TOPOLOGY LOCKED
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Network routing table requires synchronized carrier telemetry. Complete Challenge 02 at the Voice Archive and Signal Monitor to calculate mesh coordinates.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => {
                if (audioEnabled) sound.playClick();
                setActiveStation("signal-monitor");
              }}
              className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60"
            >
              GO TO SIGNAL MONITOR
            </button>
            <button
              onClick={() => {
                if (audioEnabled) sound.playClick();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-radio-cyan/40 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">
        
        {/* Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-radio-cyan" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider">
              STATION 04 // RESIDENT NETWORK TOPOLOGY [RF-TOPO-04]
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded border ${
                challenge3Solved
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-cyan-500/40 bg-cyan-950/40 text-cyan-300"
              }`}
            >
              {challenge3Solved ? "CHALLENGE 03 SOLVED" : "INVESTIGATION ACTIVE"}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
                if (audioEnabled) sound.playClick();
                onClose();
              }}
              aria-label="Close station"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left: Candidate Network Nodes */}
          <div className="md:col-span-6 border-r border-radio-border bg-radio-dark/70 p-4 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="text-[10px] text-radio-textMuted tracking-wider font-semibold mb-1">
                HIGH-CENTRALITY COORDINATION NODES
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Telemetry from 120-resident mesh. Identifies vital inter-sector relay points.
              </p>

              <div className="space-y-3">
                {NETWORK_CANDIDATE_NODES.map((node) => (
                  <div
                    key={node.sanctuaryId}
                    className="p-3 rounded border border-radio-border bg-radio-surface/60 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-radio-cyan flex items-center gap-1.5">
                        <GitCommit className="w-3.5 h-3.5" />
                        {node.sanctuaryId}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-slate-300">
                        SECTOR: {node.sector}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 mt-1">
                      <div>
                        <span className="text-[9px] text-radio-textMuted block">CENTRALITY</span>
                        <strong className="text-radio-textBright">
                          {(node.centralityScore * 100).toFixed(0)}%
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-radio-textMuted block">CONTACT CHAINS</span>
                        <strong className="text-amber-400">{node.contactChains}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-radio-textMuted block">COLLABORATION</span>
                        <strong className="text-cyan-300">
                          {(node.collaborationScore * 100).toFixed(0)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-radio-surface/50 border-t border-radio-border text-[11px] text-slate-400 mt-3">
              <span className="text-cyan-400 font-bold">SYSTEM AXIOM:</span> The emergency broadcast system could not have been triggered by human coordination without passing through the primary Radio Nexus node (Centrality 1.0, 11 chains).
            </div>
          </div>

          {/* Right: Challenge 3 Reconstruction Form */}
          <div className="md:col-span-6 p-6 bg-radio-dark/95 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="text-[10px] text-radio-textMuted tracking-wider uppercase">
                INTER-SECTOR RELAY ROUTING
              </div>
              <div className="text-xl font-bold text-radio-cyan mt-1">
                CROSS-SECTOR MESH CIRCUIT
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Connect the central coordination nexus in the Radio sector to the boundary gateway in Forensics to bypass the broadcast console tripwire lockout.
              </p>

              {!challenge3Solved ? (
                <form
                  onSubmit={handleVerifyNetwork}
                  className="mt-5 p-4 rounded border border-cyan-500/40 bg-cyan-950/20 space-y-4"
                >
                  <div>
                    <label className="block text-[10px] text-radio-textMuted uppercase mb-1">
                      1. Select Primary Radio Nexus Node (Centrality = 1.0)
                    </label>
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="w-full bg-black/70 border border-radio-border rounded px-3 py-1.5 text-xs text-radio-cyan focus:outline-none focus:border-radio-cyan"
                    >
                      <option value="">SELECT SOURCE NODE...</option>
                      {NETWORK_CANDIDATE_NODES.map((n) => (
                        <option key={n.sanctuaryId} value={n.sanctuaryId}>
                          {n.sanctuaryId} — {n.sector} (Centrality: {(n.centralityScore * 100).toFixed(0)}%, {n.contactChains} chains)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-radio-textMuted uppercase mb-1">
                      2. Select Forensics Border Gateway Node
                    </label>
                    <select
                      value={selectedTarget}
                      onChange={(e) => setSelectedTarget(e.target.value)}
                      className="w-full bg-black/70 border border-radio-border rounded px-3 py-1.5 text-xs text-radio-cyan focus:outline-none focus:border-radio-cyan"
                    >
                      <option value="">SELECT GATEWAY NODE...</option>
                      {NETWORK_CANDIDATE_NODES.map((n) => (
                        <option key={n.sanctuaryId} value={n.sanctuaryId}>
                          {n.sanctuaryId} — {n.sector} (Centrality: {(n.centralityScore * 100).toFixed(0)}%, {n.contactChains} chains)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-radio-cyan text-radio-textBright font-bold text-xs tracking-wider shadow-cyan-glow transition-all"
                  >
                    [ RECONSTRUCT INTER-SECTOR MESH CIRCUIT ]
                  </button>

                  <VerificationFeedback feedback={feedback} failedAttempts={failedAttempts} className="" />
                </form>
              ) : (
                <div className="mt-5 p-4 rounded border border-emerald-500/50 bg-emerald-950/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>INTER-SECTOR MESH CIRCUIT VERIFIED</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Routing bridge established between <strong className="text-emerald-300">SANC-0002</strong> (Radio Nexus) and <strong className="text-emerald-300">SANC-0034</strong> (Forensics Gateway). Emergency broadcast override disengaged!
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={handleProceedToBroadcast}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-xs font-bold transition-colors"
                    >
                      <span>PROCEED TO EMERGENCY BROADCAST CONSOLE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] text-slate-500 border-t border-radio-border pt-3 mt-4">
              TELEMETRY: Primary nexus contact density represents 100% saturation of Radio sector carrier links.
            </div>
          </div>
        </div>
      </div>
      {showHint && (
        <HintModal
          challengeId="challenge-3"
          challengeTitle="NETWORK COORDINATION MESH"
          onClose={() => setShowHint(false)}
        />
      )}
    </div>
  );
};

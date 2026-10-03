"use client";

import React, { useState } from "react";
import { Terminal, FileCode, CheckCircle2, ArrowRight, X, Cpu, HelpCircle } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { FRAGMENT_EVIDENCE } from "../../data/challenges";
import { validateChallenge1 } from "../../utils/validation";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { HintModal } from "../ui/HintModal";
import { VerificationFeedback } from "../ui/VerificationFeedback";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";

interface Props {
  onClose: () => void;
}

export const CommunicationTerminalModal: React.FC<Props> = ({ onClose }) => {
  const { challenge1Solved, solveChallenge1, setActiveStation, audioEnabled, recordFailedAttempt, failedAttempts } =
    useBlueZoneStore(
      useShallow((s) => ({
        challenge1Solved: s.challenge1Solved,
        solveChallenge1: s.solveChallenge1,
        setActiveStation: s.setActiveStation,
        audioEnabled: s.audioEnabled,
        recordFailedAttempt: s.recordFailedAttempt,
        failedAttempts: s.failedAttemptCounts["challenge-1"] || 0,
      }))
    );
  const panelRef = useModalEntrance<HTMLDivElement>();

  const [selectedPacket, setSelectedPacket] = useState(FRAGMENT_EVIDENCE[1]); // Default to corrupted Beta
  const [candidateId, setCandidateId] = useState("");
  const [candidateSector, setCandidateSector] = useState("");
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handlePacketSelect = (pkt: typeof FRAGMENT_EVIDENCE[0]) => {
    if (audioEnabled) sound.playClick();
    setSelectedPacket(pkt);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateChallenge1(candidateId, candidateSector);
    setFeedback(result);

    if (result.success) {
      if (audioEnabled) {
        sound.playStationTone(1200);
        sound.playClick();
      }
      solveChallenge1();
    } else {
      if (audioEnabled) sound.playRadioSquelch();
      // An incomplete form is not a wrong answer: report it without counting a failed attempt
      if (candidateId.trim() && candidateSector.trim()) {
        recordFailedAttempt("challenge-1");
      }
    }
  };

  const handleProceedToVoiceArchive = () => {
    if (audioEnabled) sound.playClick();
    setActiveStation("voice-archive");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-radio-cyan/40 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">
        
        {/* Terminal Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-radio-cyan" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider">
              STATION 01 // COMMUNICATION TERMINAL [RF-COMM-01]
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                challenge1Solved
                  ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                  : "border-cyan-500/40 bg-cyan-950/40 text-radio-cyan"
              }`}
            >
              {challenge1Solved ? "CHALLENGE 01 SOLVED" : "INVESTIGATION ACTIVE"}
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
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left: Fragment Packet Selector */}
          <div className="md:col-span-5 border-r border-radio-border flex flex-col bg-radio-dark/70">
            <div className="p-3 border-b border-radio-border">
              <div className="text-[10px] text-radio-textMuted tracking-wider font-semibold">
                INTERCEPTED TRANSMISSION PACKETS
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Packets buffered immediately following the citywide evacuation alert.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-radio-border/60">
              {FRAGMENT_EVIDENCE.map((pkt) => {
                const isSelected = selectedPacket.packetId === pkt.packetId;
                return (
                  <button
                    key={pkt.packetId}
                    onClick={() => handlePacketSelect(pkt)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1 ${
                      isSelected
                        ? "bg-cyan-950/40 border-l-4 border-radio-cyan"
                        : "hover:bg-slate-900/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-radio-textBright flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-radio-cyan" />
                        {pkt.packetId}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                          pkt.isCorrupted
                            ? "border-amber-500/50 bg-amber-950/40 text-amber-300"
                            : "border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {pkt.isCorrupted ? "DEGRADED" : "VERIFIED"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      ID: <span className="font-semibold">{pkt.sanctuaryId}</span> // SECTOR:{" "}
                      <span className="font-semibold">{pkt.originSector}</span>
                    </div>

                    <div className="text-[10px] text-radio-textMuted italic truncate">
                      {pkt.snippet}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Diagnostic Clue Box */}
            <div className="p-3 bg-radio-surface/50 border-t border-radio-border text-[11px] text-slate-400">
              <span className="text-amber-400 font-bold">CROSS-SECTOR REFERENCE:</span> Community incident report correlates a positive alert response with 4 distress calls and 7 route warnings.
            </div>
          </div>

          {/* Right: Forensic Inspection & Puzzle Form */}
          <div className="md:col-span-7 flex flex-col bg-radio-dark/95 overflow-y-auto p-4 sm:p-6 justify-between">
            <div>
              {/* Selected Packet Header */}
              <div className="border-b border-radio-border pb-3 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-radio-textMuted tracking-widest">
                    INSPECTING PACKET BUFFER
                  </div>
                  <div className="text-xl font-bold text-radio-cyan">
                    {selectedPacket.packetId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-radio-textMuted">ALERT RESPONSE FLAG</div>
                  <div
                    className={`text-xs font-bold ${
                      selectedPacket.alertResponse.includes("POSITIVE")
                        ? "text-amber-400"
                        : "text-slate-400"
                    }`}
                  >
                    {selectedPacket.alertResponse}
                  </div>
                </div>
              </div>

              {/* Packet Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-4">
                <div className="p-2.5 rounded bg-radio-surface/80 border border-radio-border">
                  <div className="text-[10px] text-radio-textMuted">CALLS MADE</div>
                  <div className="text-base font-bold text-radio-textBright mt-0.5">
                    {selectedPacket.callsMade}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-radio-surface/80 border border-radio-border">
                  <div className="text-[10px] text-radio-textMuted">ROUTE WARNINGS</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">
                    {selectedPacket.routeWarnings}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-radio-surface/80 border border-radio-border">
                  <div className="text-[10px] text-radio-textMuted">DUTY REQUESTS</div>
                  <div className="text-base font-bold text-radio-textBright mt-0.5">
                    {selectedPacket.dutyRequests}
                  </div>
                </div>
                <div className="p-2.5 rounded bg-radio-surface/80 border border-radio-border">
                  <div className="text-[10px] text-radio-textMuted">ORIGIN SECTOR</div>
                  <div className="text-base font-bold text-radio-cyan mt-0.5">
                    {selectedPacket.originSector}
                  </div>
                </div>
              </div>

              {/* Payload Snippet */}
              <div className="p-3 rounded bg-black/60 border border-radio-border text-xs mb-5 font-mono text-cyan-200/90 leading-relaxed">
                <span className="text-[10px] text-radio-textMuted block mb-1 uppercase tracking-wider">
                  RAW DECODED BUFFER PAYLOAD:
                </span>
                &ldquo;{selectedPacket.snippet}&rdquo;
              </div>

              {/* Reconstruction Challenge Interface */}
              {!challenge1Solved ? (
                <div className="p-4 rounded border border-cyan-500/40 bg-cyan-950/20">
                  <div className="flex items-center gap-2 text-radio-cyan font-bold text-xs mb-2">
                    <Cpu className="w-4 h-4 text-radio-cyan" />
                    <span>CHALLENGE 01: RECONSTRUCT PACKET BETA</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    Identify the transmitting resident ID and sector origin responsible for Packet Beta.
                  </p>

                  <form onSubmit={handleVerify} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-radio-textMuted uppercase mb-1">
                          Candidate Sanctuary ID (e.g. SANC-XXXX)
                        </label>
                        <input
                          type="text"
                          placeholder="ENTER SANC ID..."
                          value={candidateId}
                          onChange={(e) => setCandidateId(e.target.value)}
                          className="w-full bg-black/70 border border-radio-border rounded px-3 py-1.5 text-xs text-radio-cyan focus:outline-none focus:border-radio-cyan uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-radio-textMuted uppercase mb-1">
                          Origin Sector
                        </label>
                        <select
                          value={candidateSector}
                          onChange={(e) => setCandidateSector(e.target.value)}
                          className="w-full bg-black/70 border border-radio-border rounded px-3 py-1.5 text-xs text-radio-cyan focus:outline-none focus:border-radio-cyan"
                        >
                          <option value="">SELECT SECTOR...</option>
                          <option value="Community">Community</option>
                          <option value="Radio">Radio</option>
                          <option value="Forensics">Forensics</option>
                          <option value="Research">Research</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 px-4 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-radio-cyan text-radio-textBright font-bold text-xs tracking-wider shadow-cyan-glow transition-all"
                    >
                      [ EXECUTE PARITY CHECK & RECONSTRUCT ]
                    </button>
                  </form>

                  <VerificationFeedback feedback={feedback} failedAttempts={failedAttempts} />
                </div>
              ) : (
                /* Completed State */
                <div className="p-4 rounded border border-emerald-500/50 bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>PACKET BETA RECONSTRUCTION VERIFIED</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Identity verified as <strong className="text-emerald-300">SANC-0003</strong> from the <strong className="text-emerald-300">Radio Sector</strong>. Carrier routing indicates SANC-0003 attempted to relay emergency warnings before transmission dropped into critical non-response silence.
                  </p>

                  <div className="mt-4 pt-3 border-t border-emerald-500/30 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-400">
                      NEXT OBJECTIVE: VOICE ARCHIVE & SIGNAL MONITOR
                    </span>
                    <button
                      onClick={handleProceedToVoiceArchive}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-xs font-bold transition-colors"
                    >
                      <span>PROCEED TO VOICE ARCHIVE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom System Prompt */}
            <div className="mt-4 pt-3 border-t border-radio-border flex items-center justify-between text-[10px] text-radio-textMuted">
              <div>CHECKSUM: SHA-256 PARITY VERIFIED</div>
              <div>JOIN KEY: Sanctuary_ID</div>
            </div>
          </div>
        </div>
      </div>
      {showHint && (
        <HintModal
          challengeId="challenge-1"
          challengeTitle="FRAGMENT RECONSTRUCTION"
          onClose={() => setShowHint(false)}
        />
      )}
    </div>
  );
};

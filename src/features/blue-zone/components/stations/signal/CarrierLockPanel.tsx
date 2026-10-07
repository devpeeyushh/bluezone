"use client";

import React, { useState } from "react";
import { Wifi, CheckCircle2, ArrowRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { MOCK_FREQUENCY_PACKETS } from "../../../data/mockRadioData";
import { FAILED_TRANSMISSION_EVIDENCE } from "../../../data/challenges";
import { AudioWaveform } from "../../ui/AudioWaveform";
import { validateChallenge2 } from "../../../utils/validation";
import { sound } from "../../../utils/sound";
import { VerificationFeedback } from "../../ui/VerificationFeedback";
import { useBlueZoneStore } from "../../../store/useBlueZoneStore";

// The Signal Monitor's original challenge 2 (failed-transmission logs + carrier lock), moved here
// unchanged so the station can also host the standalone CTF 04. Its validation, attempt key
// ("challenge-2") and solve action are exactly as before; the broadcast chain still depends on it.
export const CarrierLockPanel: React.FC<{ onProceedToBroadcast: () => void }> = ({ onProceedToBroadcast }) => {
  const { challenge2Solved, solveChallenge2, audioEnabled, recordFailedAttempt, failedAttempts } = useBlueZoneStore(
    useShallow((s) => ({
      challenge2Solved: s.challenge2Solved,
      solveChallenge2: s.solveChallenge2,
      audioEnabled: s.audioEnabled,
      recordFailedAttempt: s.recordFailedAttempt,
      failedAttempts: s.failedAttemptCounts["challenge-2"] || 0,
    }))
  );

  const [freq, setFreq] = useState(142.85);
  // No log is pre-selected: choosing the anomalous log is part of the challenge
  const [selectedCandidateLog, setSelectedCandidateLog] = useState("");
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const matchedPacket = MOCK_FREQUENCY_PACKETS.reduce((prev, curr) =>
    Math.abs(curr.freqMhz - freq) < Math.abs(prev.freqMhz - freq) ? curr : prev
  );
  const isTunedIn = Math.abs(matchedPacket.freqMhz - freq) < 1.0;

  const handleFreqChange = (newVal: number) => {
    setFreq(newVal);
    if (audioEnabled && Math.random() < 0.25) sound.playRadioSquelch();
  };

  const handleVerifySignal = (e: React.FormEvent) => {
    e.preventDefault();
    // An incomplete form is not a wrong answer: report it without counting a failed attempt
    if (!selectedCandidateLog) {
      if (audioEnabled) sound.playClick();
      setFeedback({ success: false, message: "DIAGNOSTIC ERROR: Select a target distress log before locking the carrier." });
      return;
    }
    const res = validateChallenge2(selectedCandidateLog, freq);
    setFeedback(res);

    if (res.success) {
      solveChallenge2();
    } else {
      if (audioEnabled) sound.verifyFail();
      recordFailedAttempt("challenge-2");
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <div className="text-sm font-bold tracking-[0.2em] text-amber-300">FAILED TRANSMISSION LOGS // CARRIER LOCK</div>
        <p className="text-[11px] text-slate-400 mt-1">
          Distress traffic that failed to complete its handshake before the network collapsed.
        </p>
      </div>

      {/* Frequency Tuning Console */}
      <div className="p-4 rounded border border-radio-border bg-radio-surface/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-radio-textMuted tracking-wider">
              RECEIVER CARRIER FREQUENCY
            </div>
            <div className="text-3xl font-bold text-amber-400 tracking-wider flex items-baseline gap-2">
              {freq.toFixed(2)} <span className="text-sm text-slate-400">MHz</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {MOCK_FREQUENCY_PACKETS.map((p) => (
              <button
                key={p.freqMhz}
                onClick={() => handleFreqChange(p.freqMhz)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  Math.abs(freq - p.freqMhz) < 0.1
                    ? "border-amber-400 bg-amber-950/60 text-amber-300"
                    : "border-radio-border bg-radio-surface text-slate-400 hover:text-white"
                }`}
              >
                {p.freqMhz.toFixed(2)} MHz
              </button>
            ))}
          </div>
        </div>

        {/* Slider */}
        <div className="mt-4">
          <input
            type="range"
            min="135.0"
            max="175.0"
            step="0.05"
            value={freq}
            onChange={(e) => handleFreqChange(parseFloat(e.target.value))}
            aria-label="Receiver carrier frequency"
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[10px] text-radio-textMuted mt-1">
            <span>135.00 MHz (VHF LOW)</span>
            <span>156.30 MHz (EMERGENCY REPEATER)</span>
            <span>175.00 MHz (TELEMETRY HIGH)</span>
          </div>
        </div>
      </div>

      {/* Oscilloscope Waveform */}
      <div className="p-4 rounded border border-radio-border bg-black/60">
        <div className="flex items-center justify-between text-[10px] text-radio-textMuted mb-2">
          <div className="flex items-center gap-1.5 text-amber-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>CARRIER HARMONIC SWEEP</span>
          </div>
          <span className="text-xs">
            {isTunedIn ? `LOCKED: ${matchedPacket.sector}` : "TUNER SEARCHING..."}
          </span>
        </div>
        <AudioWaveform
          height={56}
          frequency={isTunedIn ? 0.04 : 0.15}
          amplitude={isTunedIn ? 24 : 8}
          noise={isTunedIn ? 0.2 : 0.8}
          color={isTunedIn ? "#ffb703" : "#4b6584"}
        />
      </div>

      {/* Challenge 2 Anomaly Confirmation Form */}
      {!challenge2Solved ? (
        <form
          onSubmit={handleVerifySignal}
          className="p-4 rounded border border-amber-500/40 bg-amber-950/20 space-y-3"
        >
          <div className="text-xs font-bold text-amber-300">
            CHALLENGE 02: LOCK ANOMALOUS TRANSMISSION CARRIER
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Select the distress log exhibiting maximal failed handshake bursts (5 packets) and align the receiver synthesizer to verify carrier sync.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-radio-textMuted uppercase mb-1">
                Select Target Distress Log
              </label>
              <select
                value={selectedCandidateLog}
                onChange={(e) => setSelectedCandidateLog(e.target.value)}
                className="w-full bg-black/70 border border-radio-border rounded px-3 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-400"
              >
                <option value="">SELECT DISTRESS LOG...</option>
                {FAILED_TRANSMISSION_EVIDENCE.map((log) => (
                  <option key={log.logId} value={log.logId}>
                    {log.logId} — {log.candidateId} ({log.failedCount} fails, {log.originSector})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-4 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-200 font-bold text-xs tracking-wider shadow-amber-glow transition-all"
              >
                [ LOCK CARRIER WAVE & VERIFY ANOMALY ]
              </button>
            </div>
          </div>

          <VerificationFeedback feedback={feedback} failedAttempts={failedAttempts} />
        </form>
      ) : (
        <div className="p-4 rounded border border-emerald-500/50 bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>DISTRESS ANOMALY CARRIER LOCKED AT 156.30 MHz</span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Transmitter SANC-0003 handshake pattern confirmed. Emergency broadcast console override is now available.
            </div>
          </div>
          <button
            onClick={onProceedToBroadcast}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-200 text-xs font-bold transition-colors"
          >
            <span>PROCEED TO EMERGENCY BROADCAST</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

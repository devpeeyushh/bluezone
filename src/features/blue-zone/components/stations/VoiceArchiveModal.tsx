"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Play, Square, X, Lock, ArrowRight } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { FAILED_TRANSMISSION_EVIDENCE } from "../../data/challenges";
import { RADIO_TRANSCRIPTS } from "../../data/transcripts";
import { AudioWaveform } from "../ui/AudioWaveform";
import { formatStressIndex } from "../../utils/formatters";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";

interface Props {
  onClose: () => void;
}

export const VoiceArchiveModal: React.FC<Props> = ({ onClose }) => {
  const { voiceArchiveUnlocked, setActiveStation, audioEnabled } = useBlueZoneStore(
    useShallow((s) => ({
      voiceArchiveUnlocked: s.voiceArchiveUnlocked,
      setActiveStation: s.setActiveStation,
      audioEnabled: s.audioEnabled,
    }))
  );
  const panelRef = useModalEntrance<HTMLDivElement>();

  // Open on the first log in the list rather than pre-selecting the anomaly
  const [selectedLog, setSelectedLog] = useState(FAILED_TRANSMISSION_EVIDENCE[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPlaybackTimer = () => {
    if (playbackTimer.current) {
      clearTimeout(playbackTimer.current);
      playbackTimer.current = null;
    }
  };

  // Stop the simulated playback timer if the station closes mid-playback
  useEffect(() => clearPlaybackTimer, []);

  const togglePlayback = () => {
    clearPlaybackTimer();
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (audioEnabled) {
        sound.playRadioSquelch();
        sound.playStationTone(selectedLog.voiceStressIndex > 0.8 ? 580 : 750);
      }
      playbackTimer.current = setTimeout(() => {
        playbackTimer.current = null;
        setIsPlaying(false);
      }, 3500);
    }
  };

  const handleSelectLog = (log: typeof FAILED_TRANSMISSION_EVIDENCE[0]) => {
    if (audioEnabled) sound.playClick();
    clearPlaybackTimer();
    setSelectedLog(log);
    setIsPlaying(false);
  };

  const handleGoToSignalMonitor = () => {
    if (audioEnabled) sound.playClick();
    setActiveStation("signal-monitor");
  };

  // If locked, render diagnostic lockout screen
  if (!voiceArchiveUnlocked) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
        <div ref={panelRef} className="relative w-full max-w-md bg-radio-panel border border-red-500/50 rounded-lg p-6 text-center font-mono text-radio-text shadow-red-glow">
          <Lock className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
          <div className="text-sm font-bold text-red-300 tracking-wider">
            STATION 02 // VOICE ARCHIVE LOCKED
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Audio buffer requires prior packet header reconstruction. Reconstruct transmission fragments at Station 01 (Communication Terminal) to unlock voice telemetry.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => {
                if (audioEnabled) sound.playClick();
                setActiveStation("communication-terminal");
              }}
              className="px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-500 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60"
            >
              GO TO TERMINAL 01
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

  const stressInfo = formatStressIndex(selectedLog.voiceStressIndex);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div ref={panelRef} className="relative w-full max-w-5xl h-[85vh] bg-radio-panel border border-cyan-500/40 rounded-lg shadow-cyan-glow flex flex-col overflow-hidden text-radio-text font-mono">
        
        {/* Header */}
        <div className="bg-radio-surface px-4 py-3 border-b border-radio-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-radio-textBright tracking-wider">
              STATION 02 // VOICE ARCHIVE [RF-VOX-02]
            </span>
            <span className="text-xs px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
              UNLOCKED // TELEMETRY BUFFER
            </span>
          </div>
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

        {/* Content */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left: Audio Log Selector */}
          <div className="md:col-span-5 border-r border-radio-border bg-radio-dark/70 p-3 flex flex-col">
            <div className="text-[10px] text-radio-textMuted tracking-wider font-semibold mb-1">
              FAILED TRANSMISSION LOGS
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Audio recordings captured prior to signal collapse.
            </p>

            <div className="space-y-2 overflow-y-auto flex-1">
              {FAILED_TRANSMISSION_EVIDENCE.map((log) => {
                const isSelected = log.logId === selectedLog.logId;
                return (
                  <button
                    key={log.logId}
                    onClick={() => handleSelectLog(log)}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/40 text-white shadow-cyan-glow"
                        : "border-radio-border bg-radio-surface/50 hover:bg-slate-900 text-radio-text"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-radio-cyan">{log.logId}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 border border-slate-700 text-slate-300">
                        {log.candidateId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1 flex justify-between">
                      <span>SECTOR: {log.originSector}</span>
                      <span className="text-amber-400 font-bold">
                        FAILS: {log.failedCount}
                      </span>
                    </div>
                    <div className="text-[10px] text-radio-textMuted mt-1">
                      NON-RESPONSE: {log.nonResponseHours}h // CARRIER: {log.carrierBandMhz.toFixed(2)} MHz
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-radio-surface/60 border-t border-radio-border text-[11px] text-slate-400 mt-2">
              <span className="text-amber-400 font-bold">CROSS-REFERENCE CLUE:</span> Isolate the transmitter with the most failed handshake bursts, then note the carrier band it was clipping on.
            </div>
          </div>

          {/* Right: Audio Waveform Demodulator & Signal Link */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between bg-radio-dark/95 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-radio-border pb-3">
                <div>
                  <div className="text-[10px] text-radio-textMuted">VOICE PACKET IDENTIFIER</div>
                  <div className="text-xl font-bold text-radio-cyan flex items-center gap-2">
                    {selectedLog.logId}
                    <span className="text-xs font-normal text-slate-300">
                      [{selectedLog.candidateId}]
                    </span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded border text-xs font-bold ${stressInfo.color}`}>
                  VOICE STRESS: {stressInfo.label}
                </div>
              </div>

              {/* Waveform Player */}
              <div className="mt-4 p-4 rounded bg-radio-surface/80 border border-radio-border">
                <div className="flex items-center justify-between text-[10px] text-radio-textMuted mb-2">
                  <span>SPECTROGRAM DEMODULATION</span>
                  <span>{isPlaying ? "DECODING AUDIO STREAM..." : "BUFFER READY"}</span>
                </div>

                <AudioWaveform
                  height={56}
                  amplitude={isPlaying ? 26 : 8}
                  frequency={isPlaying ? 0.08 : 0.02}
                  color={selectedLog.voiceStressIndex > 0.8 ? "#ff3344" : "#00f0ff"}
                />

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={togglePlayback}
                    className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-bold border transition-colors ${
                      isPlaying
                        ? "bg-red-950/60 border-red-500 text-red-300"
                        : "bg-cyan-950/60 border-cyan-500 text-cyan-300 hover:bg-cyan-900/60 shadow-cyan-glow"
                    }`}
                  >
                    {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isPlaying ? "ABORT PLAYBACK" : "TRANSMIT FRAGMENT"}</span>
                  </button>
                  <span className="text-xs text-slate-300 font-semibold">
                    CARRIER BAND: {selectedLog.carrierBandMhz.toFixed(2)} MHz
                  </span>
                </div>
              </div>

              {/* Decoded Transcript */}
              <div className="mt-4">
                <div className="text-[10px] text-radio-textMuted tracking-wider mb-1">
                  DECODED AUDIO TRANSCRIPTION:
                </div>
                <div className="p-4 rounded border border-radio-border bg-black/60 text-xs text-radio-textBright leading-relaxed italic">
                  &ldquo;{selectedLog.audioNotePreview}&rdquo;
                </div>
              </div>

              {/* Radio Transcript Fragment */}
              {RADIO_TRANSCRIPTS[selectedLog.logId] && (
                <div className="mt-4">
                  <div className="text-[10px] text-radio-textMuted tracking-wider mb-1">
                    INTERCEPTED TRANSMISSION FRAGMENT:
                  </div>
                  <div className="p-3 rounded border border-radio-border bg-black/70 space-y-2">
                    <div className="text-[10px] text-amber-400/80 mb-2 flex items-center justify-between">
                      <span>{RADIO_TRANSCRIPTS[selectedLog.logId].title}</span>
                      <span className="text-radio-cyanDim">{RADIO_TRANSCRIPTS[selectedLog.logId].frequency}</span>
                    </div>
                    {RADIO_TRANSCRIPTS[selectedLog.logId].lines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`text-xs leading-relaxed pl-2 border-l-2 ${
                          line.isCorrupted
                            ? "border-red-500/50 text-red-300/70 italic"
                            : "border-cyan-500/30 text-slate-200"
                        }`}
                      >
                        <span className="text-[10px] text-radio-textMuted mr-2">[{line.timestamp}]</span>
                        <span className={`text-[10px] font-bold mr-2 ${
                          line.isCorrupted ? "text-red-400" : "text-cyan-400"
                        }`}>
                          {line.sender}:
                        </span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Next Step Link */}
            <div className="mt-4 pt-3 border-t border-radio-border flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Align carrier frequency in Signal Monitor to isolate anomaly wave.
              </span>
              <button
                onClick={handleGoToSignalMonitor}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400 text-amber-200 text-xs font-bold transition-colors shadow-amber-glow"
              >
                <span>OPEN SIGNAL MONITOR</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

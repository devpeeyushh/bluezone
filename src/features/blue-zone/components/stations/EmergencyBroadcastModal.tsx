"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShieldAlert, ShieldCheck, Lock, X, Radio, CheckCircle2, Zap } from "lucide-react";
import gsap from "gsap";
import { useShallow } from "zustand/react/shallow";
import { sound } from "../../utils/sound";
import { useModalEntrance } from "../../utils/useModalEntrance";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";

interface Props {
  onClose: () => void;
  onComplete?: () => void;
}

// Cinematic stages:
// idle -> stabilizing -> reconstructing -> revealed -> complete
//
// Each stage is driven by its own effect with full cleanup. The stage lives in the store, so
// closing the console mid-sequence pauses it and reopening resumes from the same stage.
const STABILIZE_MS = 2000;
const RECONSTRUCT_MS = 1800;

export const EmergencyBroadcastModal: React.FC<Props> = ({ onClose, onComplete }) => {
  const {
    broadcastUnlocked,
    challenge1Solved,
    challenge2Solved,
    challenge3Solved,
    cinematicStage,
    setCinematicStage,
    setCompleted,
    audioEnabled,
    completed,
  } = useBlueZoneStore(
    useShallow((s) => ({
      broadcastUnlocked: s.broadcastUnlocked,
      challenge1Solved: s.challenge1Solved,
      challenge2Solved: s.challenge2Solved,
      challenge3Solved: s.challenge3Solved,
      cinematicStage: s.cinematicStage,
      setCinematicStage: s.setCinematicStage,
      setCompleted: s.setCompleted,
      audioEnabled: s.audioEnabled,
      completed: s.completed,
    }))
  );

  const containerRef = useModalEntrance<HTMLDivElement>();
  const revealSourceRef = useRef<HTMLDivElement>(null);
  const revealTriggerRef = useRef<HTMLDivElement>(null);
  const revealOriginRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef<HTMLDivElement>(null);
  const [flickerText, setFlickerText] = useState("");

  // Trigger cinematic sequence when broadcast unlocks
  useEffect(() => {
    if (broadcastUnlocked && cinematicStage === "idle" && !completed) {
      setCinematicStage("stabilizing");
    }
  }, [broadcastUnlocked, cinematicStage, completed, setCinematicStage]);

  // Keep the latest callbacks without restarting the sequence when a parent re-renders
  const onCompleteRef = useRef(onComplete);
  const audioEnabledRef = useRef(audioEnabled);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    audioEnabledRef.current = audioEnabled;
  }, [onComplete, audioEnabled]);

  // True once this console has played the reveal, so the completion banner animates in only then
  const playedRevealRef = useRef(false);

  // Stage 1: STABILIZING (flicker messages, then hand off to reconstruction)
  useEffect(() => {
    if (cinematicStage !== "stabilizing") return;

    if (audioEnabledRef.current) sound.playRadioSquelch();

    const flickerMessages = [
      "NETWORK STABILIZING...",
      "CARRIER FREQUENCY LOCKED...",
      "CRT BUFFER SYNC...",
      "RECONSTRUCTING BROADCAST PACKET...",
      "DECRYPTING HEADER FIELDS...",
    ];

    let msgIndex = 0;
    const flickerInterval = setInterval(() => {
      setFlickerText(flickerMessages[msgIndex % flickerMessages.length]);
      msgIndex++;
    }, 500);

    const stabilizeTimer = setTimeout(() => {
      setCinematicStage("reconstructing");
      if (audioEnabledRef.current) sound.playStationTone(650);
    }, STABILIZE_MS);

    return () => {
      clearInterval(flickerInterval);
      clearTimeout(stabilizeTimer);
    };
  }, [cinematicStage, setCinematicStage]);

  // Stage 2: RECONSTRUCTING
  useEffect(() => {
    if (cinematicStage !== "reconstructing") return;

    const reconstructTimer = setTimeout(() => {
      setCinematicStage("revealed");
      if (audioEnabledRef.current) sound.playStationTone(900);
    }, RECONSTRUCT_MS);

    return () => clearTimeout(reconstructTimer);
  }, [cinematicStage, setCinematicStage]);

  // Stage 3: REVEALED -> COMPLETE (sequential SOURCE / TRIGGER / ORIGIN reveal, then completion)
  useEffect(() => {
    if (cinematicStage !== "revealed") return;
    playedRevealRef.current = true;

    const tl = gsap.timeline();
    const cards = [revealSourceRef.current, revealTriggerRef.current, revealOriginRef.current];
    cards.forEach((card, i) => {
      if (!card) return;
      tl.fromTo(
        card,
        { opacity: 0, y: 30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
        i === 0 ? undefined : "-=0.3"
      );
    });

    tl.call(
      () => {
        setCompleted(true);
        setCinematicStage("complete");
        onCompleteRef.current?.();
      },
      [],
      "+=1.0"
    );

    return () => {
      tl.kill();
    };
  }, [cinematicStage, setCinematicStage, setCompleted]);

  // If already completed (revisiting), show the final state directly
  const showFinalState = completed && cinematicStage === "complete";

  // Fade the completion banner in when it follows the reveal (not when revisiting later)
  useEffect(() => {
    if (!showFinalState || !playedRevealRef.current || !completionRef.current) return;
    const tween = gsap.fromTo(
      completionRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
    );
    return () => {
      tween.kill();
    };
  }, [showFinalState]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
      <div
        ref={containerRef}
        className="relative w-full max-w-3xl max-h-[92vh] bg-radio-panel border border-red-500/50 rounded-lg shadow-red-glow flex flex-col overflow-hidden text-radio-text font-mono"
      >
        {/* Header */}
        <div className="bg-red-950/40 px-4 py-3 border-b border-red-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {broadcastUnlocked ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            )}
            <span className="text-sm font-bold text-red-200 tracking-wider">
              STATION 05 // EMERGENCY BROADCAST RELAY [RF-ALERT-05]
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded border font-bold ${
                broadcastUnlocked
                  ? "border-emerald-500/60 bg-emerald-950/60 text-emerald-300"
                  : "border-red-500/60 bg-red-950/60 text-red-300"
              }`}
            >
              {broadcastUnlocked ? "SECURITY OVERRIDDEN" : "LOCKED"}
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

        {/* Body */}
        <div className="p-6 space-y-5 bg-radio-dark/95 min-h-[400px] flex flex-col justify-center overflow-y-auto">
          {!broadcastUnlocked ? (
            /* ===== LOCKED VIEW ===== */
            <div className="text-center py-6">
              <Lock className="w-12 h-12 text-red-400 mx-auto mb-3 animate-pulse" />
              <div className="text-base font-bold text-red-300 tracking-wide">
                SYSTEM BROADCAST LOCKOUT ACTIVE
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto mt-2 leading-relaxed">
                The emergency broadcast console was locked following the initial alarm. To bypass the security lockout, all three radio investigation challenges must be verified:
              </p>

              <div className="max-w-md mx-auto mt-4 space-y-2 text-left text-xs">
                <div className={`p-2.5 rounded border flex items-center justify-between ${
                  challenge1Solved ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-black/40 text-slate-400"
                }`}>
                  <span>1. Fragment Reconstruction (Terminal 01)</span>
                  <span>{challenge1Solved ? "✓ VERIFIED" : "PENDING"}</span>
                </div>

                <div className={`p-2.5 rounded border flex items-center justify-between ${
                  challenge2Solved ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-black/40 text-slate-400"
                }`}>
                  <span>2. Failed Transmission & Carrier Lock (Monitor 03)</span>
                  <span>{challenge2Solved ? "✓ VERIFIED" : "PENDING"}</span>
                </div>

                <div className={`p-2.5 rounded border flex items-center justify-between ${
                  challenge3Solved ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300" : "border-slate-800 bg-black/40 text-slate-400"
                }`}>
                  <span>3. Network Mesh Reconstruction (Map 04)</span>
                  <span>{challenge3Solved ? "✓ VERIFIED" : "PENDING"}</span>
                </div>
              </div>
            </div>
          ) : !showFinalState ? (
            /* ===== CINEMATIC SEQUENCE ===== */
            <div className="space-y-6">
              {/* Stage: Stabilizing */}
              {cinematicStage === "stabilizing" && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  <div className="text-lg font-bold text-cyan-300 tracking-widest animate-pulse">
                    {flickerText || "INITIALIZING..."}
                  </div>
                  <div className="mt-3 flex justify-center gap-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-6 bg-cyan-500/40 rounded-sm animate-pulse"
                        style={{ animationDelay: `${i * 80}ms`, height: `${12 + (i % 5) * 4}px` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stage: Reconstructing */}
              {cinematicStage === "reconstructing" && (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-pulse" />
                  <div className="text-base font-bold text-amber-300 tracking-widest">
                    RECONSTRUCTING BROADCAST PACKET
                  </div>
                  <div className="mt-2 text-xs text-amber-200/70">Assembling decrypted header fields...</div>
                  <div className="mt-4 w-64 mx-auto bg-black/60 rounded-full h-2 border border-amber-500/30">
                    <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "70%" }} />
                  </div>
                </div>
              )}

              {/* Stage: Revealed - Progressive reveal */}
              {(cinematicStage === "revealed" || cinematicStage === "complete") && (
                <div className="space-y-4">
                  <div className="p-4 rounded border border-emerald-500/50 bg-emerald-950/20 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        DECRYPTED BROADCAST PACKET HEADER #EV-8801
                      </div>
                      <div className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                        Security lock disengaged. Root transmission log extracted from non-volatile carrier memory.
                      </div>
                    </div>
                  </div>

                  {/* Progressive reveal: SOURCE -> TRIGGER -> ORIGIN */}
                  <div className="p-4 rounded border border-radio-border bg-black/70 space-y-3 font-mono">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div ref={revealSourceRef} className="p-3 rounded bg-radio-surface border border-radio-border opacity-0">
                        <span className="text-[10px] text-radio-textMuted block">SOURCE</span>
                        <strong className="text-sm text-red-400">AUTOMATIC SYSTEM</strong>
                      </div>

                      <div ref={revealTriggerRef} className="p-3 rounded bg-radio-surface border border-radio-border opacity-0">
                        <span className="text-[10px] text-radio-textMuted block">TRIGGER</span>
                        <strong className="text-sm text-amber-300">UNAUTHORIZED ACCESS</strong>
                      </div>

                      <div ref={revealOriginRef} className="p-3 rounded bg-radio-surface border border-radio-border opacity-0">
                        <span className="text-[10px] text-radio-textMuted block">ORIGIN</span>
                        <strong className="text-sm text-cyan-300">FORENSICS EVIDENCE VAULT</strong>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-red-950/20 border border-red-500/30 text-xs text-slate-200 leading-relaxed">
                      <span className="text-amber-400 font-bold block mb-1">CRUCIAL NARRATIVE DISCOVERY:</span>
                      The citywide alert was not issued by human dispatch or MANU protocol decree. It was an automated security tripwire triggered by a physical or digital breach into the Evidence Vault located in the Forensics sector.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ===== FINAL COMPLETION STATE (revisiting or after sequence) ===== */
            <div className="space-y-4">
              <div className="p-4 rounded border border-emerald-500/50 bg-emerald-950/20 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    DECRYPTED BROADCAST PACKET HEADER #EV-8801
                  </div>
                  <div className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                    Security lock disengaged. Root transmission log extracted from non-volatile carrier memory.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded border border-radio-border bg-black/70 space-y-3 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded bg-radio-surface border border-radio-border">
                    <span className="text-[10px] text-radio-textMuted block">SOURCE</span>
                    <strong className="text-sm text-red-400">AUTOMATIC SYSTEM</strong>
                  </div>
                  <div className="p-3 rounded bg-radio-surface border border-radio-border">
                    <span className="text-[10px] text-radio-textMuted block">TRIGGER</span>
                    <strong className="text-sm text-amber-300">UNAUTHORIZED ACCESS</strong>
                  </div>
                  <div className="p-3 rounded bg-radio-surface border border-radio-border">
                    <span className="text-[10px] text-radio-textMuted block">ORIGIN</span>
                    <strong className="text-sm text-cyan-300">FORENSICS EVIDENCE VAULT</strong>
                  </div>
                </div>

                <div className="p-3 rounded bg-red-950/20 border border-red-500/30 text-xs text-slate-200 leading-relaxed">
                  <span className="text-amber-400 font-bold block mb-1">CRUCIAL NARRATIVE DISCOVERY:</span>
                  The citywide alert was not issued by human dispatch or MANU protocol decree. It was an automated security tripwire triggered by a physical or digital breach into the Evidence Vault located in the Forensics sector.
                </div>
              </div>

              {/* Completion Banner */}
              <div ref={completionRef} className="space-y-3">
                <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-950/40 via-emerald-950/30 to-cyan-950/40 border border-cyan-500/50 text-center">
                  <div className="text-lg font-bold text-emerald-300 tracking-[0.2em] mb-1">
                    COMMUNICATION TRAIL COMPLETE
                  </div>
                  <div className="text-xs text-cyan-200/90 tracking-wider">
                    ALL RADIO SECTOR EVIDENCE RECONSTRUCTED
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded border border-amber-500/40 bg-amber-950/20">
                  <div className="text-xs text-amber-200">
                    <span className="font-bold">NEXT REQUIRED SECTOR:</span> FORENSICS
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                    <Radio className="w-4 h-4" />
                    <span>RADIO SECTOR COMPLETE</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

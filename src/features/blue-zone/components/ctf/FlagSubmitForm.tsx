"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { BlueZoneChallengeId } from "../../types/challenge.types";
import { CHALLENGES } from "../../data/ctf/registry";
import { HINTS_DATABASE } from "../../data/hints";
import { submitChallenge } from "../../services/challengeService";
import { useBlueZoneStore } from "../../store/useBlueZoneStore";
import { sound } from "../../utils/sound";
import { VerificationFeedback } from "../ui/VerificationFeedback";

// Flag entry for a CTF station. It only renders what submitChallenge() returns; validation,
// attempt counting and completion happen behind that call.
export const FlagSubmitForm: React.FC<{ challengeId: BlueZoneChallengeId }> = ({ challengeId }) => {
  const definition = CHALLENGES[challengeId];
  const { audioEnabled, failedAttempts, hintLevel } = useBlueZoneStore(
    useShallow((s) => ({
      audioEnabled: s.audioEnabled,
      failedAttempts: s.failedAttemptCounts[challengeId] || 0,
      hintLevel: s.activeHints[challengeId] || 0,
    }))
  );
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fieldId = `flag-${challengeId}`;
  const totalHints = HINTS_DATABASE[challengeId]?.length ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await submitChallenge(challengeId, value);
    // On success the station swaps to its handoff view and this form unmounts
    if (!mounted.current) return;
    setBusy(false);
    setFeedback({ success: result.correct, message: result.message });
    if (result.status === "incorrect") {
      if (audioEnabled) sound.verifyFail();
    } else if (result.status === "malformed" || result.status === "error") {
      if (audioEnabled) sound.playClick();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded border border-cyan-500/40 bg-cyan-950/20 space-y-3" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-[10px] tracking-[0.25em] text-radio-cyan font-bold">
          {definition.label} // SUBMIT FLAG
        </label>
        <div className="flex gap-3 text-[10px] text-radio-textMuted tracking-wider">
          <span>ATTEMPTS {String(failedAttempts).padStart(2, "0")}</span>
          <span>
            ADVISORIES {hintLevel}/{totalHints}
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={fieldId}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={definition.flagFormat}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={`${fieldId}-format`}
          className="flex-1 min-w-0 bg-black/70 border border-radio-border rounded px-3 py-2 text-xs text-radio-cyan tracking-wider focus:outline-none focus:border-radio-cyan"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-radio-cyan text-radio-textBright font-bold text-xs tracking-wider shadow-cyan-glow transition-all disabled:opacity-60 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
        >
          <Send className="w-3.5 h-3.5" />
          {busy ? "VERIFYING…" : "TRANSMIT"}
        </button>
      </div>
      <div id={`${fieldId}-format`} className="text-[10px] text-radio-textMuted">
        FORMAT: {definition.flagFormat}. Case and spaces are ignored. A malformed entry is not counted.
      </div>
      <VerificationFeedback feedback={feedback} failedAttempts={failedAttempts} />
    </form>
  );
};

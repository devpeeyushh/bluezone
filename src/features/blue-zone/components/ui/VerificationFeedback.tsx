"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface VerificationFeedbackProps {
  feedback: { success: boolean; message: string } | null;
  failedAttempts: number;
  className?: string;
}

// After this many failed attempts, quietly point at the (optional) advisory channel
const HINT_NUDGE_AFTER = 3;

export const VerificationFeedback: React.FC<VerificationFeedbackProps> = ({
  feedback,
  failedAttempts,
  className = "mt-3",
}) => {
  if (!feedback) return null;

  if (feedback.success) {
    return (
      <div className={`${className} p-2.5 rounded text-xs font-semibold bg-emerald-950/60 border border-emerald-500 text-emerald-300 flex items-start gap-2`}>
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-px text-emerald-400" />
        <span>{feedback.message}</span>
      </div>
    );
  }

  return (
    // Keyed by attempt count so each new failure re-runs the entry flash
    <div
      key={failedAttempts}
      role="alert"
      className={`${className} p-2.5 rounded text-xs bg-red-950/60 border border-red-500 text-red-300 animate-[pulse_0.6s_ease-out_1]`}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-widest text-red-400 mb-1">
        <span className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5" />
          VERIFICATION FAILED
        </span>
        {failedAttempts > 0 && <span>ATTEMPT {String(failedAttempts).padStart(2, "0")}</span>}
      </div>
      <div className="font-semibold leading-relaxed">{feedback.message}</div>
      {failedAttempts >= HINT_NUDGE_AFTER && (
        <div className="mt-1.5 text-[10px] text-amber-300/80 tracking-wide">
          Optional advisory channel available via [REQUEST HINT].
        </div>
      )}
    </div>
  );
};

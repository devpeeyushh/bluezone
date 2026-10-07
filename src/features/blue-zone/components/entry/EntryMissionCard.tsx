"use client";

import React from "react";
import glass from "./entryGlass.module.css";
import { EntryPanel } from "./EntryPanel";

// Mission card + brief. Uses only content the entry screen already displayed (the public sector
// narrative, the overall objective and the field telemetry counts) — no challenge data, answers or
// dataset. The step comes from the existing objective utility.

interface CardProps {
  step: number;
  steps: number;
  complete: boolean;
  onViewBrief: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

export const EntryMissionCard: React.FC<CardProps> = ({ step, steps, complete, onViewBrief }) => (
  <div className={`${glass.glass} rounded-2xl px-5 py-4 w-[17.5rem] max-w-full font-mono`}>
    <div className="flex items-center justify-between text-[10px] tracking-[0.3em] text-cyan-200/70">
      <span>MISSION</span>
      <span className="text-radio-text/60">
        {pad(step)} / {pad(steps)}
      </span>
    </div>
    <div className="mt-2.5 text-[13px] leading-snug tracking-[0.12em] text-radio-textBright">
      {complete ? (
        <>
          COMMUNICATION TRAIL
          <br />
          COMPLETE
        </>
      ) : (
        <>
          RECONSTRUCT THE
          <br />
          COMMUNICATION TRAIL
        </>
      )}
    </div>
    <button
      type="button"
      onClick={onViewBrief}
      className="mt-3.5 text-[10px] tracking-[0.3em] text-cyan-200/90 hover:text-white border-b border-cyan-200/30 hover:border-white/60 pb-0.5 transition-colors focus-visible:outline-none focus-visible:text-white"
    >
      VIEW BRIEF
    </button>
  </div>
);

export const EntryBriefPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <EntryPanel title="SECTOR BRIEF" onClose={onClose} className="w-[24rem] max-w-[calc(100vw-2rem)]">
    <p className="text-[12px] leading-relaxed text-radio-text/90">
      The only emergency backup for Sanctuary population was Community. After records stabilized, residents
      abandoned assigned locations with a singular system note:{" "}
      <span className="text-cyan-200">&ldquo;Resident responded to citywide emergency alert.&rdquo;</span> The
      broadcast trail converges here.
    </p>
    <div className="mt-4 pt-3 border-t border-white/10">
      <div className="text-[10px] tracking-[0.3em] text-cyan-200/70 mb-1.5">OBJECTIVE</div>
      <p className="text-[12px] leading-relaxed text-radio-textBright">
        Reconstruct the communication trail and determine the origin of the emergency broadcast.
      </p>
    </div>
    <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
      {[
        ["14", "LOGGED", "text-cyan-200"],
        ["89", "CORRUPTED", "text-red-300"],
        ["03", "UNKNOWN", "text-amber-200"],
      ].map(([value, label, tone]) => (
        <div key={label}>
          <div className={`text-lg font-semibold ${tone}`}>{value}</div>
          <div className="text-[9px] tracking-[0.2em] text-radio-text/60">{label}</div>
        </div>
      ))}
    </div>
    <p className="mt-4 text-[10px] leading-relaxed text-radio-text/60">
      Inside the facility, click the viewport to engage controls. Approach a console and press [E] to access it.
    </p>
  </EntryPanel>
);

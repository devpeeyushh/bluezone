"use client";

import React, { useState } from "react";

// Player scratchpad. Kept in memory for the session (survives closing the station or leaving the
// facility, not a page reload). Never read by validation.
const notesCache = new Map<string, string>();

export const InvestigationNotes: React.FC<{ challengeId: string; prompt: string }> = ({ challengeId, prompt }) => {
  const [value, setValue] = useState(() => notesCache.get(challengeId) ?? "");
  const fieldId = `notes-${challengeId}`;

  return (
    <div className="flex flex-col gap-2 h-full min-h-[16rem]">
      <label htmlFor={fieldId} className="text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold">
        FIELD NOTES
      </label>
      <p className="text-[11px] text-slate-400 leading-relaxed">{prompt}</p>
      <textarea
        id={fieldId}
        value={value}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          notesCache.set(challengeId, e.target.value);
        }}
        placeholder="> start writing…"
        className="flex-1 min-h-[12rem] w-full resize-none bg-black/60 border border-radio-border rounded p-3 text-xs leading-relaxed text-cyan-100 focus:outline-none focus:border-radio-cyan"
      />
      <div className="text-[10px] text-radio-textMuted">Notes stay on this console for the session.</div>
    </div>
  );
};

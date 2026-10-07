"use client";

import React from "react";
import { EntryPanel } from "./EntryPanel";

// Existing controls, shown only on request (same keys and wording as before — no new controls).
const CONTROLS: { action: string; keys: string[] }[] = [
  { action: "MOVE", keys: ["W", "A", "S", "D"] },
  { action: "LOOK", keys: ["MOUSE"] },
  { action: "SPRINT", keys: ["SHIFT"] },
  { action: "INTERACT", keys: ["E"] },
  { action: "RELEASE CURSOR", keys: ["ESC"] },
];

export const EntryControlsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <EntryPanel title="CONTROLS" onClose={onClose} className="w-[17.5rem] max-w-[calc(100vw-2rem)]">
    <dl className="space-y-2.5">
      {CONTROLS.map(({ action, keys }) => (
        <div key={action} className="flex items-center justify-between gap-4">
          <dt className="text-[10px] tracking-[0.28em] text-radio-text/70">{action}</dt>
          <dd className="flex gap-1">
            {keys.map((k) => (
              <kbd
                key={k}
                className="min-w-[1.6rem] text-center px-1.5 py-0.5 rounded-md border border-white/15 bg-white/5 text-[10px] text-radio-textBright"
              >
                {k}
              </kbd>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  </EntryPanel>
);

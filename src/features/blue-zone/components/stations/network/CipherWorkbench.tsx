"use client";

import React, { useState } from "react";
import { ArrowUp, Play, RotateCcw } from "lucide-react";
import { runWorkbenchOperation, WORKBENCH_OPERATIONS, WorkbenchOperation } from "../../../utils/cipherTools";

// Offline decoding bench: one operation at a time, output can be fed back in as the next input.
// Generic tools only — it has no knowledge of the challenge or its answer.

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  fragment?: string;
}

export const CipherWorkbench: React.FC<Props> = ({ input, onInputChange, fragment }) => {
  const [op, setOp] = useState<WorkbenchOperation>("from-base64");
  const [param, setParam] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);

  const info = WORKBENCH_OPERATIONS.find((o) => o.id === op)!;

  const run = () => {
    try {
      const result = runWorkbenchOperation(op, input, param);
      setOutput(result);
      setError(null);
      setSteps((s) => [...s, info.param ? `${info.label} (${param || "—"})` : info.label].slice(-6));
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : "OPERATION FAILED");
    }
  };

  const chain = () => {
    onInputChange(output);
    setOutput("");
  };

  const reset = () => {
    onInputChange("");
    setOutput("");
    setError(null);
    setSteps([]);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Offline signal workbench. Paste or send a payload in, pick an operation, run it. Feed the output back in to
        peel off another layer.
      </p>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label htmlFor="workbench-input" className="text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold">
            INPUT
          </label>
          <div className="flex gap-2">
            {fragment && (
              <button
                type="button"
                onClick={() => onInputChange(fragment)}
                className="px-2 py-1 rounded border border-amber-500/40 text-amber-200 text-[10px] font-bold tracking-wider hover:bg-amber-950/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
              >
                LOAD RECOVERED FRAGMENT
              </button>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-radio-border text-slate-300 text-[10px] font-bold tracking-wider hover:border-radio-cyan focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
            >
              <RotateCcw className="w-3 h-3" />
              CLEAR
            </button>
          </div>
        </div>
        <textarea
          id="workbench-input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          spellCheck={false}
          rows={4}
          className="w-full resize-y bg-black/70 border border-radio-border rounded p-2.5 text-[11px] leading-relaxed text-cyan-100 break-all focus:outline-none focus:border-radio-cyan"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label htmlFor="workbench-op" className="block text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold mb-1">
            OPERATION
          </label>
          <select
            id="workbench-op"
            value={op}
            onChange={(e) => {
              setOp(e.target.value as WorkbenchOperation);
              setError(null);
            }}
            className="w-full bg-black/70 border border-radio-border rounded px-3 py-2 text-xs text-radio-cyan focus:outline-none focus:border-radio-cyan"
          >
            {WORKBENCH_OPERATIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {info.param && (
          <div className="sm:w-48">
            <label htmlFor="workbench-param" className="block text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold mb-1">
              {info.param === "key" ? "KEY" : "SHIFT"}
            </label>
            <input
              id="workbench-param"
              type={info.param === "shift" ? "number" : "text"}
              value={param}
              onChange={(e) => setParam(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-black/70 border border-radio-border rounded px-3 py-2 text-xs text-radio-cyan tracking-wider focus:outline-none focus:border-radio-cyan"
            />
          </div>
        )}
        <button
          type="button"
          onClick={run}
          disabled={!input.trim()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-radio-cyan bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-bold tracking-wider text-radio-textBright disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
        >
          <Play className="w-3.5 h-3.5" />
          RUN
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span id="workbench-output-label" className="text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold">
            OUTPUT
          </span>
          <button
            type="button"
            onClick={chain}
            disabled={!output}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-radio-border text-slate-300 text-[10px] font-bold tracking-wider hover:border-radio-cyan disabled:opacity-40 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            <ArrowUp className="w-3 h-3" />
            USE AS INPUT
          </button>
        </div>
        <output
          aria-labelledby="workbench-output-label"
          aria-live="polite"
          className={`block min-h-[4.5rem] p-2.5 rounded border text-[11px] leading-relaxed break-all whitespace-pre-wrap select-text ${
            error ? "border-red-500/50 bg-red-950/30 text-red-300" : "border-radio-border bg-black/70 text-emerald-200/90"
          }`}
        >
          {error ? `ERROR: ${error}` : output || "—"}
        </output>
      </div>

      {steps.length > 0 && (
        <div className="text-[10px] text-radio-textMuted tracking-wider">
          RECENT: {steps.join("  ›  ")}
        </div>
      )}
    </div>
  );
};

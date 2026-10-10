"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Download, ExternalLink, Loader2, Radio, Send } from "lucide-react";
import facilityRecord from "../../../assets/broadcast/facility-record.jpg";
import { useBlueZoneStore } from "../../../store/useBlueZoneStore";
import { normalizeFinalAnswer, openDataset, verifyFinalAnswer } from "../../../utils/finalAnswer";

// Emergency Broadcast final puzzle: the complete transmission image is the only reference. The
// player studies it, types an answer, and on success receives the complete Radio Communication
// dataset. Nothing about the answer or the dataset is rendered before the answer is verified.

const ATTEMPT_KEY = "emergency-broadcast";
const label = "text-[9px] tracking-[0.3em] text-radio-textMuted";

// ---------- PUZZLE ----------

export const FinalTransmissionPuzzle: React.FC<{ onSolved: () => void }> = ({ onSolved }) => {
  const attempts = useBlueZoneStore((s) => s.failedAttemptCounts[ATTEMPT_KEY] || 0);
  const recordFailedAttempt = useBlueZoneStore((s) => s.recordFailedAttempt);
  const [answer, setAnswer] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "empty" | "wrong" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "checking") return;
    // An empty entry is not an attempt
    if (!normalizeFinalAnswer(answer)) {
      setState("empty");
      return;
    }
    setState("checking");
    try {
      if (await verifyFinalAnswer(answer)) {
        onSolved();
        return;
      }
      recordFailedAttempt(ATTEMPT_KEY);
      setState("wrong");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[10px] tracking-[0.35em] text-red-300 font-bold">EMERGENCY BROADCAST</div>
          <div className="text-lg font-bold tracking-[0.25em] text-radio-textBright">FINAL TRANSMISSION</div>
        </div>
        <a
          href={facilityRecord.src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-cyan-300 hover:text-cyan-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 rounded px-1"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          VIEW FULL RESOLUTION
        </a>
      </div>

      <a
        href={facilityRecord.src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Transmission image. Opens the full-resolution image in a new tab."
        className="relative block mx-auto aspect-[3/2] w-full overflow-hidden rounded border border-cyan-500/40 bg-black shadow-[0_0_24px_rgba(34,211,238,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        style={{ maxWidth: "max(18rem, calc((92vh - 290px) * 1.5))" }}
      >
        <Image
          src={facilityRecord}
          alt="Recovered transmission image of the BLUEZONE Communications Facility."
          fill
          unoptimized
          loading="eager"
          sizes="(max-width: 900px) 100vw, 900px"
          className="object-contain"
        />
      </a>

      <form onSubmit={submit} className="space-y-2">
        <label htmlFor="eb-answer" className="block text-xs text-slate-300 leading-relaxed">
          Study the transmission image carefully. Use the information shown in the image to determine the final answer.
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="eb-answer"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (state !== "checking") setState("idle");
            }}
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            placeholder="FINAL ANSWER"
            className="flex-1 min-w-0 bg-black/70 border border-radio-border rounded px-3 py-2 text-sm text-cyan-200 tracking-[0.2em] focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={state === "checking"}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded border border-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 text-xs font-bold tracking-[0.25em] shadow-cyan-glow disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            {state === "checking" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <Send className="w-3.5 h-3.5" aria-hidden />}
            TRANSMIT
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 min-h-[1rem] text-[10px] tracking-wider">
          <span aria-live="polite">
            {state === "empty" && <span className="text-amber-300">ENTER AN ANSWER BEFORE TRANSMITTING.</span>}
            {state === "wrong" && <span className="text-red-300">ANSWER REJECTED. THE TRANSMISSION DOES NOT CONFIRM IT.</span>}
            {state === "error" && <span className="text-red-300">VERIFICATION UNAVAILABLE. TRY AGAIN.</span>}
          </span>
          {attempts > 0 && <span className="text-radio-textMuted tabular-nums">ATTEMPTS {String(attempts).padStart(2, "0")}</span>}
        </div>
      </form>
    </div>
  );
};

// ---------- DATASET ----------

interface OpenedDataset {
  url: string;
  filename: string;
  bytes: number;
  records: number;
  fields: number;
}

const DatasetDownload: React.FC = () => {
  const [dataset, setDataset] = useState<OpenedDataset | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    openDataset()
      .then(async ({ file, filename, bytes }) => {
        const lines = (await file.text()).trim().split(/\r?\n/);
        url = URL.createObjectURL(file);
        if (cancelled) return URL.revokeObjectURL(url);
        setDataset({ url, filename, bytes, records: lines.length - 1, fields: lines[0].split(",").length });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div className="p-4 rounded-lg border-2 border-cyan-400/70 bg-cyan-950/30 shadow-[0_0_28px_rgba(34,211,238,0.12)] space-y-3">
      <div>
        <div className={label}>RECOVERED ARCHIVE</div>
        <div className="text-base sm:text-lg font-bold tracking-[0.2em] text-cyan-100">RADIO COMMUNICATION DATASET</div>
        <div className="text-[11px] text-slate-300 mt-0.5 break-all">
          {dataset
            ? `${dataset.filename} // ${dataset.records} RECORDS // ${dataset.fields} FIELDS // ${(dataset.bytes / 1024).toFixed(1)} KB`
            : failed
              ? "DATASET COULD NOT BE OPENED IN THIS SESSION."
              : "UNSEALING ARCHIVE…"}
        </div>
      </div>
      {dataset ? (
        <a
          href={dataset.url}
          download={dataset.filename}
          className="flex w-full sm:w-auto sm:inline-flex items-center justify-center gap-2 px-6 py-3 rounded border border-cyan-300 bg-cyan-500/25 hover:bg-cyan-500/35 text-cyan-50 text-sm font-bold tracking-[0.25em] shadow-cyan-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          <Download className="w-4 h-4" aria-hidden />
          DOWNLOAD DATASET
        </a>
      ) : (
        <span className="inline-flex items-center gap-2 px-6 py-3 rounded border border-slate-700 text-slate-500 text-sm font-bold tracking-[0.25em]">
          <Download className="w-4 h-4" aria-hidden />
          DOWNLOAD DATASET
        </span>
      )}
    </div>
  );
};

// ---------- COMPLETE ----------

export const FinalTransmissionComplete: React.FC<{ nextZone: string; datasetAvailable: boolean; onReopen: () => void }> = ({
  nextZone,
  datasetAvailable,
  onReopen,
}) => {
  const [handoff, setHandoff] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 rounded border border-emerald-500/50 bg-emerald-950/20">
        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" aria-hidden />
        <div>
          <div className="text-sm font-bold tracking-[0.25em] text-emerald-300">FINAL TRANSMISSION DECODED</div>
          <div className="text-[11px] text-emerald-200/80 tracking-wider">ANSWER VERIFIED // ARCHIVE RELEASED</div>
        </div>
      </div>

      {/* After a page reload the dataset key is gone: re-verifying the answer reopens it */}
      {datasetAvailable ? <DatasetDownload /> : <FinalTransmissionPuzzle onSolved={onReopen} />}

      <div className="p-4 rounded-lg border border-emerald-500/40 bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className={label}>RADIO COMMUNICATION ZONE</div>
          <div className="text-sm font-bold tracking-[0.25em] text-emerald-300">STATUS // CLEARED</div>
          <div className="mt-2 flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-amber-200">
            <Radio className="w-4 h-4 text-cyan-300" aria-hidden />
            NEXT ZONE // {nextZone}
          </div>
          <div aria-live="polite" className="text-[10px] tracking-[0.2em] mt-0.5 min-h-[0.9rem] text-emerald-300">
            {handoff && "HAND-OFF DELIVERED TO THE HOST."}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHandoff(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-amber-400/70 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 text-[11px] font-bold tracking-wider focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
        >
          PROCEED TO {nextZone}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
};

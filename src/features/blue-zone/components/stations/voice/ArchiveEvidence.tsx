"use client";

import React from "react";
import { FileText, RadioTower, Database } from "lucide-react";
import {
  CHANNEL_BUFFER,
  OPERATOR_NOTE,
  RECORDING,
  TOWER_RECORDS,
  TowerRecord,
  VOICE_TRANSCRIPT,
} from "../../../data/ctf/voiceArchive";

// CTF 03 evidence views (transcript, tower logs, channel buffer). Pure presentation.

const card = "rounded-lg border border-radio-border/80 bg-[#06101f]/70 backdrop-blur-sm p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export const TranscriptPanel: React.FC = () => (
  <div className="max-w-2xl space-y-3">
    <div className="flex items-center gap-2 text-radio-cyan">
      <FileText className="w-4 h-4" />
      <span className="text-sm font-bold tracking-[0.2em]">RECOVERED VOICE TRANSCRIPT</span>
    </div>
    <p className="text-[11px] text-slate-400 leading-relaxed">
      Speech-to-text pass on {RECORDING.id}. Only the spoken layer could be transcribed; non-speech signal is
      not represented here.
    </p>
    <ol className={`${card} space-y-2 text-xs leading-relaxed`}>
      {VOICE_TRANSCRIPT.map((line, i) => (
        <li
          key={i}
          className={
            line.kind === "noise"
              ? "text-[10px] tracking-[0.2em] text-amber-300/70"
              : "pl-2 border-l-2 border-cyan-500/30 text-slate-200 italic"
          }
        >
          {line.kind === "voice" ? <>&ldquo;{line.text}&rdquo;</> : line.text}
        </li>
      ))}
    </ol>
  </div>
);

const STATUS_TONE: Record<TowerRecord["status"], string> = {
  PARTIAL: "text-amber-300 border-amber-500/40",
  ONLINE: "text-emerald-300 border-emerald-500/40",
  OFFLINE: "text-red-300 border-red-500/40",
};

export const TowerLogsPanel: React.FC = () => (
  <div className="space-y-4">
    <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
      Tower records held with {RECORDING.id}. Each tower keeps its own maintenance log.
    </p>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {TOWER_RECORDS.map((t) => (
        <section key={t.registry} aria-labelledby={`tower-${t.registry}`} className={card}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 id={`tower-${t.registry}`} className="flex items-center gap-2 text-sm font-bold tracking-[0.15em] text-radio-textBright">
                <RadioTower className="w-4 h-4 text-radio-cyan" aria-hidden />
                {t.name}
              </h3>
              <div className="text-[10px] tracking-[0.2em] text-radio-textMuted mt-0.5">REGISTRY {t.registry}</div>
            </div>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_TONE[t.status]}`}>{t.status}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-0.5 text-[11px]">
            <dt className="text-radio-textMuted">LAST MAINTENANCE</dt>
            <dd className="text-slate-200">{t.lastMaintenance}</dd>
            <dt className="text-radio-textMuted">TECHNICIAN</dt>
            <dd className="text-slate-200">{t.technician}</dd>
          </dl>
          <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{t.note}</p>
          <div className="mt-3 text-[10px] tracking-[0.25em] text-radio-textMuted">{t.name} // MAINTENANCE LOG</div>
          <table className="mt-1 w-full text-[11px]">
            <thead className="sr-only">
              <tr>
                <th>Day</th>
                <th>Event</th>
                <th>Technician</th>
              </tr>
            </thead>
            <tbody>
              {t.log.map((e) => (
                <tr key={`${e.day}-${e.event}`} className="border-t border-radio-border/50">
                  <td className="py-1 pr-3 text-amber-200/90 tabular-nums whitespace-nowrap">DAY {e.day}</td>
                  <td className="py-1 pr-3 text-slate-200">{e.event}</td>
                  <td className="py-1 text-right text-radio-textMuted whitespace-nowrap">{e.tech}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  </div>
);

export const EvidencePanel: React.FC = () => (
  <div className="max-w-3xl space-y-4">
    <section className={card} aria-labelledby="va-record">
      <h3 id="va-record" className="text-[10px] tracking-[0.25em] text-radio-cyan font-bold mb-2">
        VOICE ARCHIVE // RECOVERED TRANSMISSION
      </h3>
      <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-radio-textMuted">RECORDING</dt>
        <dd className="text-slate-200">{RECORDING.id}</dd>
        <dt className="text-radio-textMuted">DATE</dt>
        <dd className="text-slate-200">{RECORDING.date}</dd>
        <dt className="text-radio-textMuted">LOCATION</dt>
        <dd className="text-red-300">{RECORDING.location}</dd>
        <dt className="text-radio-textMuted">STATUS</dt>
        <dd className="text-amber-300">PARTIALLY RECOVERED</dd>
        <dt className="text-radio-textMuted">TOWERS</dt>
        <dd className="text-slate-200">{TOWER_RECORDS.map((t) => t.registry).join(" · ")}</dd>
      </dl>
    </section>

    <section className="rounded border border-amber-500/30 bg-amber-950/15 p-4" aria-labelledby="va-operator">
      <h3 id="va-operator" className="text-[10px] tracking-[0.25em] text-amber-300 font-bold mb-1.5">
        RECOVERED OPERATOR NOTE
      </h3>
      <p className="text-xs text-slate-200 leading-relaxed">&ldquo;{OPERATOR_NOTE}&rdquo;</p>
    </section>

    <section className={card} aria-labelledby="va-buffer">
      <h3 id="va-buffer" className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-radio-cyan font-bold">
        <Database className="w-3.5 h-3.5" aria-hidden />
        {RECORDING.id} // CHANNEL BUFFER
      </h3>
      <p className="mt-1 mb-3 text-[11px] text-slate-400 leading-relaxed">
        While {RECORDING.id} was held, the archive latched one character into this buffer each day. Partially
        recovered: DAY {CHANNEL_BUFFER[0].day}–{CHANNEL_BUFFER[CHANNEL_BUFFER.length - 1].day}.
      </p>
      <ul className="grid grid-cols-4 sm:grid-cols-5 gap-1.5" aria-label="Channel buffer by day">
        {CHANNEL_BUFFER.map((c) => (
          <li key={c.day} className="rounded border border-radio-border bg-black/60 px-2 py-1.5 text-center">
            <div className="text-[9px] tracking-wider text-radio-textMuted tabular-nums">DAY {c.day}</div>
            <div className="text-base font-bold text-radio-textBright">{c.char}</div>
          </li>
        ))}
      </ul>
    </section>
  </div>
);

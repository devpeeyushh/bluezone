"use client";

import React, { useState } from "react";
import { Radio, Archive } from "lucide-react";
import {
  EVIDENCE_METADATA,
  SURVIVOR_ARCHIVE,
  TRANSMISSION_07,
} from "../../../data/ctf/communicationTerminal";

// CTF 01 evidence views. Pure presentation of the fictional in-game material.

// Damaged characters (▒) render dimmed so corruption reads at a glance
const Damaged: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(▒+)/).map((part, i) =>
      part.startsWith("▒") ? (
        <span key={i} className="text-amber-400/50" aria-label="damaged characters">
          {part}
        </span>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      )
    )}
  </>
);

const Field: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone }) => (
  <div className="p-2.5 rounded bg-radio-surface/70 border border-radio-border min-w-0">
    <div className="text-[9px] tracking-[0.2em] text-radio-textMuted">{label}</div>
    <div className={`text-xs font-bold mt-0.5 break-words ${tone ?? "text-radio-textBright"}`}>{value}</div>
  </div>
);

export const TransmissionPanel: React.FC = () => {
  const [bySequence, setBySequence] = useState(false);
  const t = TRANSMISSION_07;
  const fragments = bySequence ? [...t.fragments].sort((a, b) => a.seq - b.seq) : t.fragments;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-radio-cyan">
            <Radio className="w-4 h-4" />
            <span className="text-lg font-bold tracking-wider">{t.id}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            <span>
              STATUS: <span className="text-amber-300 font-bold">{t.status}</span>
            </span>
            <span>
              SOURCE: <span className="text-red-300 font-bold">{t.source}</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBySequence((v) => !v)}
          aria-pressed={bySequence}
          className="px-3 py-1.5 rounded border border-radio-border bg-radio-surface/70 hover:border-radio-cyan text-[10px] font-bold tracking-wider text-radio-text focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
        >
          {bySequence ? "SHOW AS BUFFERED" : "REASSEMBLE BY SEQ"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="CAPTURED" value={t.captured} />
        <Field label="BAND" value={t.band} />
        <Field label="CARRIER" value={<Damaged text={t.carrier} />} tone="text-amber-300" />
        <Field label="INTEGRITY" value={t.integrity} tone="text-amber-300" />
      </div>

      <ol className="space-y-2" aria-label={bySequence ? "Fragments in sequence order" : "Fragments as buffered"}>
        {fragments.map((f) => (
          <li key={f.seq} className="p-3 rounded bg-black/60 border border-radio-border">
            <div className="text-[10px] tracking-[0.2em] text-radio-textMuted mb-1">
              FRAGMENT // SEQ {String(f.seq).padStart(2, "0")}/{String(t.total).padStart(2, "0")}
            </div>
            <p className="text-xs leading-relaxed text-cyan-100/90">
              <Damaged text={f.text} />
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const ArchivePanel: React.FC = () => {
  const a = SURVIVOR_ARCHIVE;
  return (
    <div className="space-y-5">
      <div className="border-b border-dashed border-slate-600 pb-3">
        <div className="flex items-center gap-2 text-amber-200">
          <Archive className="w-4 h-4" />
          <span className="text-base font-bold tracking-[0.15em]">{a.title}</span>
        </div>
        <div className="text-[10px] tracking-[0.2em] text-slate-400 mt-1">{a.subtitle}</div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          Kept by survivors after the network failed. Every relay mast in the district is listed under its registry
          number. Entries are community-reported.
        </p>
      </div>

      <section aria-labelledby="archive-registry">
        <h3 id="archive-registry" className="text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold mb-2">
          RELAY REGISTRY
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {a.registry.map((r) => (
            <li key={r.registry} className="p-3 rounded border border-slate-700/80 bg-[#0b1220] text-[11px] space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-200 tracking-wider">{r.registry}</span>
                <span className="text-[10px] text-slate-400 text-right">{r.status}</span>
              </div>
              <div className="text-xs font-semibold text-slate-200">{r.name}</div>
              <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-slate-400">
                <dt className="text-slate-500">LOCATION</dt>
                <dd>{r.location}</dd>
                <dt className="text-slate-500">LANDMARK</dt>
                <dd>{r.landmark}</dd>
                <dt className="text-slate-500">BEACON</dt>
                <dd>{r.beacon}</dd>
                <dt className="text-slate-500">OPERATOR</dt>
                <dd>{r.operator}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="archive-incidents">
        <h3 id="archive-incidents" className="text-[10px] tracking-[0.25em] text-radio-textMuted font-semibold mb-2">
          INCIDENT LOG
        </h3>
        <ul className="space-y-1.5 text-[11px]">
          {a.incidents.map((i) => (
            <li key={i.time} className="flex gap-3">
              <span className="shrink-0 text-amber-200/80 w-28">{i.time}</span>
              <span className="text-slate-300">{i.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export const MetadataPanel: React.FC = () => (
  <div className="space-y-3">
    <p className="text-[11px] text-slate-400 leading-relaxed">
      Recovered metadata for the captured transmission and for the image files attached to cached posts.
    </p>
    {EVIDENCE_METADATA.map((record) => (
      <section key={record.title} className="rounded border border-radio-border bg-radio-surface/50 p-3">
        <div className="text-xs font-bold text-radio-cyan tracking-wider">{record.title}</div>
        <div className="text-[10px] text-radio-textMuted mb-2">{record.origin}</div>
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-[11px]">
          {record.fields.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-radio-textMuted">{k}</dt>
              <dd className="text-slate-200 break-words">
                <Damaged text={v} />
              </dd>
            </React.Fragment>
          ))}
        </dl>
      </section>
    ))}
  </div>
);

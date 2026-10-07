"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Copy, Database, ExternalLink, MapPin, Pause, Play, RotateCcw, Search, Terminal, Volume2, VolumeX, Radio, ScrollText } from "lucide-react";
import { ArchiveRecord, InterceptedSignal, NavigationPacket, SIGNALS, TRANSMISSION_LOG } from "../../../data/ctf/signalMonitor";
import { lookupArchiveRecord, REFERENCE_SHAPE } from "../../../utils/archiveIndex";
import { formatSignalTime, SignalPlayback } from "./useSignalPlayback";

// CTF 04 views. Presentation only: no view decodes the keyed bursts or names the intercept that matters.

const card = "rounded-lg border border-radio-border/80 bg-[#06101f]/70 backdrop-blur-sm p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

const STATUS_TONE: Record<InterceptedSignal["status"], string> = {
  PARTIAL: "text-amber-300 border-amber-500/40",
  DAMAGED: "text-red-300 border-red-500/40",
  RECOVERED: "text-emerald-300 border-emerald-500/40",
  CORRUPTED: "text-red-300 border-red-500/40",
};

// ---------- SIGNALS ----------

export const SignalsPanel: React.FC<{ selected: string; onSelect: (id: string) => void; onOpen: (id: string) => void }> = ({
  selected,
  onSelect,
  onOpen,
}) => (
  <div className="space-y-3">
    <p className="text-[11px] text-slate-400 leading-relaxed max-w-2xl">
      Intercepts recovered after the communication network collapsed. Select one to load it into the receiver.
    </p>
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5" aria-label="Intercepted signals">
      {SIGNALS.map((s) => {
        const active = s.id === selected;
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              onDoubleClick={() => onOpen(s.id)}
              aria-pressed={active}
              className={`w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan ${
                active ? "border-radio-cyan/70 bg-cyan-950/40" : "border-radio-border bg-radio-surface/50 hover:border-radio-cyan/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-bold tracking-wider text-radio-textBright">
                  <Radio className="w-3.5 h-3.5 text-radio-cyan" aria-hidden />
                  {s.id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${STATUS_TONE[s.status]}`}>{s.status}</span>
              </div>
              <dl className="mt-2 grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                <dt className="text-radio-textMuted">CARRIER</dt>
                <dd className="text-amber-200">{s.carrier}</dd>
                <dt className="text-radio-textMuted">SOURCE</dt>
                <dd className="text-slate-200">{s.source}</dd>
                <dt className="text-radio-textMuted">CAPTURED</dt>
                <dd className="text-slate-200">{s.captured}</dd>
                <dt className="text-radio-textMuted">DURATION</dt>
                <dd className="text-slate-200">{s.duration}</dd>
              </dl>
            </button>
          </li>
        );
      })}
    </ul>
    <div className="flex justify-end">
      <button
        type="button"
        onClick={() => onOpen(selected)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-radio-cyan/60 bg-cyan-950/40 hover:bg-cyan-900/50 text-[10px] font-bold tracking-wider text-radio-textBright focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
      >
        <Play className="w-3 h-3" />
        LOAD {selected} IN RECEIVER
      </button>
    </div>
  </div>
);

// ---------- RECORDING ----------

const W = 480;
const H = 64;

const Meta: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="p-2.5 rounded bg-radio-surface/70 border border-radio-border min-w-0">
    <div className="text-[9px] tracking-[0.2em] text-radio-textMuted">{label}</div>
    <div className={`text-xs font-bold mt-0.5 break-words ${tone ?? "text-radio-textBright"}`}>{value}</div>
  </div>
);

export const SignalRecordingPanel: React.FC<{
  signal: InterceptedSignal;
  rec: SignalPlayback;
  audioOn: boolean;
  onEnableAudio: () => void;
}> = ({ signal, rec, audioOn, onEnableAudio }) => {
  const path = useMemo(() => {
    const v = Array.from(atob(signal.envelope), (c) => c.charCodeAt(0) / 255);
    const step = W / v.length;
    return v
      .map((a, i) => {
        const h = Math.max(1.2, a * (H - 8));
        return `M${((i + 0.5) * step).toFixed(2)} ${((H - h) / 2).toFixed(2)}v${h.toFixed(2)}`;
      })
      .join("");
  }, [signal.envelope]);

  // Played portion follows the audio clock via rAF only while playing (DOM writes, no React state)
  const clipRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const { audio, playing, time, duration } = rec;
  useEffect(() => {
    const paint = () => {
      const el = audio.current;
      const pct = el && el.duration ? Math.min(100, (el.currentTime / el.duration) * 100) : 0;
      if (clipRef.current) clipRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      if (headRef.current) headRef.current.style.left = `${pct}%`;
    };
    paint();
    if (!playing) return;
    let raf = requestAnimationFrame(function loop() {
      paint();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [audio, playing, time, duration, signal.id]);

  const muted = rec.volume === 0;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <div className="text-[10px] tracking-[0.25em] text-radio-textMuted">RECOVERED AUDIO</div>
        <div className="flex items-center gap-2 text-radio-cyan">
          <Activity className="w-4 h-4" />
          <span className="text-lg font-bold tracking-wider">{signal.id}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Meta label="RECORDED" value={signal.captured} />
        <Meta label="SOURCE" value={signal.source} />
        <Meta label="CARRIER" value={signal.carrier} tone="text-amber-200" />
        <Meta label="DURATION" value={signal.duration} />
        <Meta label="FORMAT" value="PCM WAV // MONO // 44.1 kHz" />
        <Meta label="STATUS" value={signal.status} tone={STATUS_TONE[signal.status].split(" ")[0]} />
      </div>

      {!audioOn && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200">
          <span>RF AUDIO IS MUTED FACILITY-WIDE. Playback runs silently.</span>
          <button
            type="button"
            onClick={onEnableAudio}
            className="px-2 py-1 rounded border border-amber-400/60 text-[10px] font-bold tracking-wider hover:bg-amber-900/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
          >
            ENABLE RF AUDIO
          </button>
        </div>
      )}

      <div className="rounded-lg border border-radio-border/80 bg-[#040a15]/90 p-3 sm:p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-radio-textMuted">
          <span>SIGNAL ENVELOPE // {signal.id}</span>
          <span aria-live="polite">{rec.error ? "BUFFER ERROR" : !rec.ready ? "LOADING BUFFER…" : rec.playing ? "PLAYBACK" : "READY"}</span>
        </div>
        <div
          className="relative h-16 cursor-pointer select-none overflow-hidden rounded bg-black/70 border border-radio-border"
          onClick={(e) => {
            if (!duration) return;
            const r = e.currentTarget.getBoundingClientRect();
            rec.seek(((e.clientX - r.left) / r.width) * duration);
          }}
          aria-hidden
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d={path} stroke="#6b4f1d" strokeWidth="1.1" fill="none" />
          </svg>
          <div ref={clipRef} className="absolute inset-0" style={{ clipPath: "inset(0 100% 0 0)" }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              <path d={path} stroke="#fbbf24" strokeWidth="1.1" fill="none" />
            </svg>
          </div>
          <div ref={headRef} className="absolute inset-y-0 w-px bg-amber-100/80" style={{ left: "0%" }} />
          <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_1px,transparent_1px,transparent_3px)]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rec.toggle}
              disabled={!rec.ready}
              aria-label={rec.playing ? `Pause ${signal.id}` : `Play ${signal.id}`}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded border text-xs font-bold tracking-wider disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan ${
                rec.playing
                  ? "border-amber-400/70 bg-amber-950/40 text-amber-200"
                  : "border-radio-cyan bg-cyan-500/20 hover:bg-cyan-500/30 text-radio-textBright shadow-cyan-glow"
              }`}
            >
              {rec.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {rec.playing ? "PAUSE" : "PLAY"}
            </button>
            <button
              type="button"
              onClick={() => rec.seek(0)}
              disabled={!rec.ready}
              aria-label="Back to start"
              className="p-2 rounded border border-radio-border text-slate-300 hover:border-radio-cyan disabled:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] tabular-nums text-slate-300" aria-hidden>
              {formatSignalTime(time)} / {formatSignalTime(duration)}
            </span>
          </div>
          <label className="flex-1 min-w-0">
            <span className="sr-only">Seek</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={Math.min(time, duration || 0)}
              disabled={!rec.ready}
              onChange={(e) => rec.seek(Number(e.target.value))}
              aria-valuetext={`${formatSignalTime(time)} of ${formatSignalTime(duration)}`}
              className="w-full accent-amber-400"
            />
          </label>
          <div className="flex items-center gap-2 sm:w-40">
            <button
              type="button"
              onClick={() => rec.setVolume(muted ? 0.8 : 0)}
              aria-label={muted ? "Unmute intercept" : "Mute intercept"}
              className="p-1.5 rounded text-slate-300 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <label className="flex-1 min-w-0">
              <span className="sr-only">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={rec.volume}
                onChange={(e) => rec.setVolume(Number(e.target.value))}
                aria-valuetext={`${Math.round(rec.volume * 100)} percent`}
                className="w-full accent-amber-400"
              />
            </label>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-radio-textMuted">
        Can&apos;t listen? The envelope is drawn from the intercept itself: every burst and gap is visible.
      </p>
    </div>
  );
};

// ---------- ANALYSIS ----------

export const AnalysisPanel: React.FC<{ signal: InterceptedSignal }> = ({ signal }) => (
  <div className="max-w-2xl space-y-3">
    <div className="flex items-center gap-2 text-amber-300">
      <Activity className="w-4 h-4" />
      <span className="text-sm font-bold tracking-[0.2em]">SIGNAL ANALYSIS // {signal.id}</span>
    </div>
    <ul className={`${card} space-y-2 text-xs leading-relaxed text-slate-200`}>
      <li>Carrier stable for the length of the capture.</li>
      <li>
        Repeated dual-frequency bursts detected: {signal.analysis.bursts} bursts of {signal.analysis.burstMs}, separated by{" "}
        {signal.analysis.spacingMs}.
      </li>
      <li>Each burst holds two tonal components sounding at the same time.</li>
      <li>Burst spacing is structured. Pattern is inconsistent with speech.</li>
      <li className="text-amber-200">Possible keypad signalling.</li>
    </ul>
    <p className="text-[11px] text-slate-400 leading-relaxed">
      Automated analysis classifies the signal type only. Content is not decoded at this station.
    </p>
  </div>
);

// ---------- TRANSMISSION LOG ----------

const KIND_TONE: Record<string, string> = {
  INTERCEPT: "text-radio-cyan",
  SYSTEM: "text-red-300",
  CONTROLLER: "text-amber-300",
};

export const TransmissionLogPanel: React.FC = () => (
  <div className="max-w-3xl space-y-3">
    <div className="flex items-center gap-2 text-radio-cyan">
      <ScrollText className="w-4 h-4" />
      <span className="text-sm font-bold tracking-[0.2em]">MONITOR & CONTROLLER LOG // DAY 214</span>
    </div>
    <ol className={`${card} space-y-2`}>
      {TRANSMISSION_LOG.map((e, i) => (
        <li key={i} className="grid grid-cols-[4.5rem_6.5rem_1fr] gap-x-2 text-[11px] leading-relaxed max-sm:grid-cols-[4.5rem_1fr]">
          <span className="tabular-nums text-amber-200/90">{e.time}</span>
          <span className={`font-bold tracking-wider ${KIND_TONE[e.kind]} max-sm:hidden`}>{e.kind}</span>
          <span className="text-slate-200">
            <span className={`sm:hidden font-bold mr-1.5 ${KIND_TONE[e.kind]}`}>{e.kind}</span>
            {e.text}
          </span>
        </li>
      ))}
    </ol>
  </div>
);

// ---------- EVIDENCE ----------

type LookupResult = { ref: string; record: ArchiveRecord | null } | { ref: string; malformed: true };

export const SignalEvidencePanel: React.FC = () => {
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ref.replace(/\s+/g, "");
    if (!REFERENCE_SHAPE.test(clean)) {
      setResult({ ref: clean, malformed: true });
      return;
    }
    setResult({ ref: clean, record: lookupArchiveRecord(clean) });
  };

  return (
    <div className="max-w-3xl space-y-4">
      <section className={card} aria-labelledby="sm-index">
        <h3 id="sm-index" className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-radio-cyan font-bold">
          <Database className="w-3.5 h-3.5" aria-hidden />
          ARCHIVE INDEX
        </h3>
        <p className="mt-1 mb-3 text-[11px] text-slate-400 leading-relaxed">
          Relay controllers file each event under a 6-digit reference. Records are retrieved by reference only.
        </p>
        <form onSubmit={search} className="flex flex-col sm:flex-row gap-2">
          <label htmlFor="sm-ref" className="sr-only">
            Record reference
          </label>
          <input
            id="sm-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            placeholder="REFERENCE (6 DIGITS)"
            className="flex-1 min-w-0 bg-black/70 border border-radio-border rounded px-3 py-2 text-xs text-radio-cyan tracking-[0.3em] focus:outline-none focus:border-radio-cyan"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-radio-cyan bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-bold tracking-wider text-radio-textBright focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            <Search className="w-3.5 h-3.5" />
            RETRIEVE
          </button>
        </form>

        <div aria-live="polite" className="mt-3">
          {result && "malformed" in result && (
            <p className="text-[11px] text-amber-300">References are exactly 6 digits.</p>
          )}
          {result && !("malformed" in result) && !result.record && (
            <p className="text-[11px] text-red-300">NO RECORD FILED UNDER {result.ref}.</p>
          )}
          {result && !("malformed" in result) && result.record && !result.record.packet && (
            <article className="rounded border border-amber-500/40 bg-amber-950/15 p-3 space-y-2">
              <div className="text-[10px] tracking-[0.25em] text-amber-300 font-bold">RECORD {result.ref}</div>
              <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-0.5 text-[11px]">
                <dt className="text-radio-textMuted">TYPE</dt>
                <dd className="text-slate-200">{result.record.type}</dd>
                <dt className="text-radio-textMuted">STATUS</dt>
                <dd className="text-slate-200">{result.record.status}</dd>
                <dt className="text-radio-textMuted">SOURCE</dt>
                <dd className="text-slate-200">{result.record.source}</dd>
                <dt className="text-radio-textMuted">FILED</dt>
                <dd className="text-slate-200">{result.record.filed}</dd>
              </dl>
              <ul className="space-y-1 text-xs text-slate-200 leading-relaxed">
                {result.record.lines.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </article>
          )}
          {result && !("malformed" in result) && result.record?.packet && (
            <NavigationPacketView command={result.ref} record={result.record} packet={result.record.packet} />
          )}
        </div>
      </section>
    </div>
  );
};

// ---------- RECOVERED NAVIGATION PACKET ----------

// External map link built from the recovered coordinates only (no SDK, no embed, no API key)
const mapUrl = (p: NavigationPacket) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.lat},${p.lon}`)}`;

const NavigationPacketView: React.FC<{ command: string; record: ArchiveRecord; packet: NavigationPacket }> = ({ command, record, packet }) => {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const coords = `${packet.lat}, ${packet.lon}`;

  const copyCoordinates = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    try {
      await navigator.clipboard.writeText(coords);
      setCopy("copied");
      return;
    } catch {
      // Clipboard API refused (permissions, unfocused document, insecure context): legacy copy below
    }
    const scratch = document.createElement("textarea");
    scratch.value = coords;
    scratch.setAttribute("readonly", "");
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.appendChild(scratch);
    scratch.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    scratch.remove();
    button.focus();
    setCopy(ok ? "copied" : "failed");
  };

  return (
    <article
      aria-labelledby="sm-packet"
      className="mt-3 rounded-lg border border-radio-cyan/50 bg-[#030b16]/90 p-4 space-y-4 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_24px_rgba(34,211,238,0.06)]"
    >
      <div>
        <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-emerald-300 font-bold">
          <Terminal className="w-3.5 h-3.5" aria-hidden />
          REMOTE COMMAND ACCEPTED
        </div>
        <dl className="mt-2 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5 text-[11px]">
          <dt className="text-radio-textMuted">COMMAND</dt>
          <dd className="text-amber-200 tracking-[0.3em] tabular-nums">{command}</dd>
          <dt className="text-radio-textMuted">STATUS</dt>
          <dd className="text-emerald-300 font-bold">{record.status}</dd>
          <dt className="text-radio-textMuted">SOURCE</dt>
          <dd className="text-slate-200">{record.source}</dd>
          <dt className="text-radio-textMuted">FILED</dt>
          <dd className="text-slate-200">{record.filed}</dd>
        </dl>
        <ul className="mt-2 space-y-1 text-xs text-slate-300 leading-relaxed">
          {record.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>

      <div className="border-t border-dashed border-radio-border pt-3">
        <h4 id="sm-packet" className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-radio-cyan font-bold">
          <MapPin className="w-3.5 h-3.5" aria-hidden />
          RECOVERED NAVIGATION PACKET
        </h4>
        <div className="mt-1 text-[9px] tracking-[0.2em] text-radio-textMuted">NAVIGATION DATA // INTEGRITY PARTIAL // DECIMAL DEGREES</div>
        <dl className="mt-3 grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-radio-textMuted self-center">LAT</dt>
          <dd className="text-radio-textBright text-base font-bold tracking-[0.15em] tabular-nums select-all break-all">{packet.lat}</dd>
          <dt className="text-radio-textMuted self-center">LON</dt>
          <dd className="text-radio-textBright text-base font-bold tracking-[0.15em] tabular-nums select-all break-all">{packet.lon}</dd>
          <dt className="text-radio-textMuted">REFERENCE</dt>
          <dd className="text-amber-200 tracking-[0.2em]">{packet.reference}</dd>
        </dl>

        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={copyCoordinates}
            aria-label={`Copy coordinates ${coords}`}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-radio-cyan/70 bg-cyan-950/40 hover:bg-cyan-900/50 text-[10px] font-bold tracking-wider text-radio-textBright focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden />
            COPY COORDINATES
          </button>
          <a
            href={mapUrl(packet)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open coordinates ${coords} in an external map (opens in a new tab)`}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded border border-amber-400/60 bg-amber-950/30 hover:bg-amber-900/40 text-[10px] font-bold tracking-wider text-amber-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            OPEN MAP
          </a>
        </div>
        <p aria-live="polite" className="mt-1.5 min-h-[1rem] text-[10px] tracking-wider">
          {copy === "copied" && <span className="text-emerald-300">COORDINATES COPIED TO CLIPBOARD.</span>}
          {copy === "failed" && <span className="text-amber-300">CLIPBOARD UNAVAILABLE. Select the coordinates above and copy them manually.</span>}
        </p>
      </div>

      <figure className="border-t border-dashed border-radio-border pt-3">
        <figcaption className="text-[9px] tracking-[0.3em] text-radio-textMuted">FIELD NOTE // APPENDED BY FIELD TEAM</figcaption>
        <blockquote className="mt-2 pl-3 border-l-2 border-amber-400/60 text-sm tracking-[0.15em] text-amber-100 leading-relaxed">
          {packet.note.map((line, i) => (
            <span key={i} className="block">
              {i === 0 ? "“" : ""}
              {line}
              {i === packet.note.length - 1 ? "”" : ""}
            </span>
          ))}
        </blockquote>
      </figure>
    </article>
  );
};

"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Download, Pause, Play, RotateCcw, Volume2, VolumeX, AudioLines } from "lucide-react";
import { RECORDING, RECORDING_ENVELOPE } from "../../../data/ctf/voiceArchive";
import { formatTime, Recording } from "./useRecording";

// RECORDING tab: evidence header, static waveform (precomputed envelope, one SVG path), and
// accessible transport controls. Nothing here decodes or transcribes the keyed tones.

const W = 700;
const H = 64;

function decodeEnvelope(b64: string): number[] {
  const binary = atob(b64);
  return Array.from(binary, (c) => c.charCodeAt(0) / 255);
}

const Meta: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="p-2.5 rounded bg-radio-surface/70 border border-radio-border min-w-0">
    <div className="text-[9px] tracking-[0.2em] text-radio-textMuted">{label}</div>
    <div className={`text-xs font-bold mt-0.5 break-words ${tone ?? "text-radio-textBright"}`}>{value}</div>
  </div>
);

export const RecordingPanel: React.FC<{ rec: Recording }> = ({ rec }) => {
  const envelopePath = useMemo(() => {
    const v = decodeEnvelope(RECORDING_ENVELOPE);
    const step = W / v.length;
    return v
      .map((a, i) => {
        const h = Math.max(1.2, a * (H - 8));
        const x = (i + 0.5) * step;
        return `M${x.toFixed(2)} ${((H - h) / 2).toFixed(2)}v${h.toFixed(2)}`;
      })
      .join("");
  }, []);

  // Played-portion overlay follows the audio clock with rAF only while playing (DOM write via ref,
  // no React state per frame)
  const progressRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const { audio, playing, time, duration } = rec;
  useEffect(() => {
    const paint = () => {
      const el = audio.current;
      if (!el || !el.duration) return;
      const pct = Math.min(100, (el.currentTime / el.duration) * 100);
      if (progressRef.current) progressRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      if (playheadRef.current) playheadRef.current.style.left = `${pct}%`;
    };
    paint();
    if (!playing) return;
    let raf = requestAnimationFrame(function loop() {
      paint();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [audio, playing, time, duration]);

  const seekFromPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    rec.seek(((e.clientX - r.left) / r.width) * duration);
  };

  const muted = rec.volume === 0;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] tracking-[0.25em] text-radio-textMuted">RECOVERED AUDIO</div>
          <div className="flex items-center gap-2 text-radio-cyan">
            <AudioLines className="w-4 h-4" />
            <span className="text-lg font-bold tracking-wider">{RECORDING.id}</span>
          </div>
          <div className="mt-1 text-[11px]">
            STATUS: <span className="text-amber-300 font-bold">{RECORDING.status}</span>
          </div>
        </div>
        {rec.url && (
          <a
            href={rec.url}
            download="VA-07.wav"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-radio-border bg-radio-surface/70 hover:border-radio-cyan text-[10px] font-bold tracking-wider text-radio-text focus:outline-none focus-visible:ring-1 focus-visible:ring-radio-cyan"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT VA-07.WAV
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Meta label="RECORDED" value={RECORDING.date} />
        <Meta label="LOCATION" value={RECORDING.location} tone="text-red-300" />
        <Meta label="LENGTH" value={RECORDING.durationLabel} />
        <Meta label="FORMAT" value={RECORDING.format} />
      </div>

      {/* Player */}
      <div className="rounded-lg border border-radio-border/80 bg-[#040a15]/90 p-3 sm:p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between text-[10px] tracking-[0.2em] text-radio-textMuted">
          <span>SIGNAL ENVELOPE // VA-07</span>
          <span aria-live="polite">{rec.error ? "BUFFER ERROR" : !rec.ready ? "LOADING BUFFER…" : rec.playing ? "PLAYBACK" : "READY"}</span>
        </div>

        <div
          className="relative h-16 cursor-pointer select-none overflow-hidden rounded bg-black/70 border border-radio-border"
          onClick={seekFromPointer}
          aria-hidden
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <path d={envelopePath} stroke="#1d5f7a" strokeWidth="0.9" fill="none" />
          </svg>
          <div ref={progressRef} className="absolute inset-0" style={{ clipPath: "inset(0 100% 0 0)" }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              <path d={envelopePath} stroke="#22d3ee" strokeWidth="0.9" fill="none" />
            </svg>
          </div>
          <div ref={playheadRef} className="absolute inset-y-0 w-px bg-cyan-200/80" style={{ left: "0%" }} />
          <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.25)_0px,rgba(0,0,0,0.25)_1px,transparent_1px,transparent_3px)]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={rec.toggle}
              disabled={!rec.ready}
              aria-label={rec.playing ? "Pause recording" : "Play recording"}
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
              {formatTime(time)} / {formatTime(duration)}
            </span>
          </div>

          <label className="flex-1 flex items-center gap-2 min-w-0">
            <span className="sr-only">Seek</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              disabled={!rec.ready}
              onChange={(e) => rec.seek(Number(e.target.value))}
              aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
              className="w-full accent-cyan-400"
            />
          </label>

          <div className="flex items-center gap-2 sm:w-40">
            <button
              type="button"
              onClick={() => rec.setVolume(muted ? 0.8 : 0)}
              aria-label={muted ? "Unmute recording" : "Mute recording"}
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
                className="w-full accent-cyan-400"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rounded border border-amber-500/30 bg-amber-950/15 p-3 text-[11px] leading-relaxed">
        <div className="text-[10px] tracking-[0.25em] text-amber-300 font-bold mb-1">SIGNAL ANALYSIS</div>
        <p className="text-slate-300">{RECORDING.analysis}</p>
        <p className="mt-1.5 text-radio-textMuted">
          Can&apos;t listen? The envelope above is drawn from the recording itself, so the bursts and the gaps between
          them can be read from it.
        </p>
      </div>
    </div>
  );
};

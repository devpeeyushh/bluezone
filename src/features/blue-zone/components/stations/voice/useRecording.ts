"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recordingUrl } from "../../../data/ctf/voiceArchive";

// One HTMLAudioElement per Voice Archive visit (no AudioContext, no analysis). It lives at the
// station level so playback survives tab changes, never autoplays, and is fully released when the
// station closes: listeners removed, playback stopped, source detached so the browser drops it.

export interface RecordingState {
  url: string | null;
  ready: boolean;
  playing: boolean;
  time: number; // updated from `timeupdate` (~4 Hz), never per frame
  duration: number;
  volume: number;
  error: boolean;
}

export interface Recording extends RecordingState {
  audio: React.MutableRefObject<HTMLAudioElement | null>;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

const DEFAULT_VOLUME = 0.8;

export function useRecording(): Recording {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<RecordingState>({
    url: null,
    ready: false,
    playing: false,
    time: 0,
    duration: 0,
    volume: DEFAULT_VOLUME,
    error: false,
  });

  useEffect(() => {
    const url = recordingUrl();
    const el = new Audio();
    el.preload = "metadata";
    el.volume = DEFAULT_VOLUME;
    el.src = url;
    audio.current = el;

    const patch = (p: Partial<RecordingState>) => setState((s) => ({ ...s, ...p }));
    const onMeta = () => patch({ ready: true, duration: Number.isFinite(el.duration) ? el.duration : 0, error: false });
    const onPlay = () => patch({ playing: true });
    const onPause = () => patch({ playing: false, time: el.currentTime });
    const onTime = () => patch({ time: el.currentTime });
    const onVolume = () => patch({ volume: el.volume });
    const onError = () => patch({ error: true, playing: false });

    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("volumechange", onVolume);
    el.addEventListener("error", onError);
    patch({ url });

    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("volumechange", onVolume);
      el.removeEventListener("error", onError);
      el.pause();
      el.removeAttribute("src");
      el.load();
      audio.current = null;
    };
  }, []);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => setState((s) => ({ ...s, playing: false })));
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (!el || !Number.isFinite(seconds)) return;
    el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
    setState((s) => ({ ...s, time: el.currentTime }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const el = audio.current;
    if (!el) return;
    el.volume = Math.max(0, Math.min(1, volume));
    // Mirror synchronously: `volumechange` is async, and a controlled range re-rendered with the
    // stale value would snap back between key presses
    setState((s) => ({ ...s, volume: el.volume }));
  }, []);

  return { ...state, audio, toggle, seek, setVolume };
}

export const formatTime = (t: number): string => {
  const safe = Number.isFinite(t) ? Math.max(0, t) : 0;
  const m = Math.floor(safe / 60);
  const s = safe - m * 60;
  return `${String(m).padStart(2, "0")}:${s.toFixed(1).padStart(4, "0")}`;
};

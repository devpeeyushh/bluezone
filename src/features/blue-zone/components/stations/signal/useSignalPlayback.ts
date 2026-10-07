"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signalUrl } from "../../../data/ctf/signalMonitor";

// One HTMLAudioElement per Signal Monitor visit, re-pointed when the player selects another
// intercept (so two intercepts never play at once). No AudioContext, no autoplay. Follows the
// facility's global audio switch (muted while RF audio is off). Fully released on close.

export interface SignalPlaybackState {
  signalId: string;
  url: string | null;
  ready: boolean;
  playing: boolean;
  time: number; // from `timeupdate`, not per frame
  duration: number;
  volume: number;
  error: boolean;
}

export interface SignalPlayback extends SignalPlaybackState {
  audio: React.MutableRefObject<HTMLAudioElement | null>;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
}

const DEFAULT_VOLUME = 0.8;

export function useSignalPlayback(signalId: string, globalAudioOn: boolean): SignalPlayback {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<SignalPlaybackState>({
    signalId,
    url: null,
    ready: false,
    playing: false,
    time: 0,
    duration: 0,
    volume: DEFAULT_VOLUME,
    error: false,
  });

  // Element lifetime = station visit
  useEffect(() => {
    const el = new Audio();
    el.preload = "metadata";
    el.volume = DEFAULT_VOLUME;
    audio.current = el;

    const patch = (p: Partial<SignalPlaybackState>) => setState((s) => ({ ...s, ...p }));
    const onMeta = () => patch({ ready: true, duration: Number.isFinite(el.duration) ? el.duration : 0, error: false });
    const onPlay = () => patch({ playing: true });
    const onPause = () => patch({ playing: false, time: el.currentTime });
    const onTime = () => patch({ time: el.currentTime });
    const onError = () => {
      // Detaching the source on cleanup also raises `error`; only report real failures
      if (el.getAttribute("src")) patch({ error: true, playing: false });
    };

    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("error", onError);
      el.pause();
      el.removeAttribute("src");
      el.load();
      audio.current = null;
    };
  }, []);

  // Selected intercept → source (stops whatever was playing)
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    const url = signalUrl(signalId);
    el.pause();
    el.src = url;
    el.load();
    setState((s) => ({ ...s, signalId, url, ready: false, playing: false, time: 0, duration: 0, error: false }));
  }, [signalId]);

  // Global RF audio switch
  useEffect(() => {
    if (audio.current) audio.current.muted = !globalAudioOn;
  }, [globalAudioOn]);

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
    // Mirror synchronously so the controlled range never snaps back between key presses
    setState((s) => ({ ...s, volume: el.volume }));
  }, []);

  return { ...state, audio, toggle, seek, setVolume };
}

export const formatSignalTime = (t: number): string => {
  const safe = Number.isFinite(t) ? Math.max(0, t) : 0;
  const m = Math.floor(safe / 60);
  return `${String(m).padStart(2, "0")}:${(safe - m * 60).toFixed(2).padStart(5, "0")}`;
};

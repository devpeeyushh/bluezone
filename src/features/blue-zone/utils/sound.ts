// Procedural Web Audio engine for the Blue Zone ("futuristic emergency communication facility").
//
// One AudioContext for the whole feature, created lazily on the first sound after a user gesture
// (audio is opt-in via the status bar toggle, so autoplay restrictions never block it). Everything
// routes through a single master bus, so muting silences all Blue Zone audio at once.
//
//  - One-shot cues: short layered voices built from a few primitives (signal tone, relay tick,
//    filtered noise). Nodes are created per cue and released when they end.
//  - Loops (ambience, movement texture, station presence, cinematic bed): created once while
//    audible, driven by parameter automation on state changes (never per frame), torn down on stop.
//  - No React state anywhere: callers are event handlers, store subscriptions or throttled refs.

type BusName = "sfx" | "ambience";
type ToneType = OscillatorType;
export type CinematicAudioStage = "stabilizing" | "reconstructing" | "revealed";
export type FocusKind = "station" | "locked" | "solved" | "board";
export type MovementLevel = 0 | 1 | 2; // idle, walk, sprint

interface ToneOptions {
  type?: ToneType;
  gain?: number;
  at?: number; // seconds from now
  attack?: number;
  decay?: number;
  glideTo?: number;
  lowpass?: number;
  pan?: number;
  bus?: BusName;
}

interface NoiseOptions {
  gain?: number;
  at?: number;
  dur?: number;
  attack?: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqTo?: number;
  q?: number;
  pan?: number;
  bus?: BusName;
}

interface LoopHandle {
  nodes: AudioNode[];
  sources: (AudioScheduledSourceNode | null)[];
  out: GainNode;
}

const clampPan = (p: number) => Math.max(-1, Math.min(1, p));

class SoundSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Record<BusName, GainNode> | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private resumeListener: (() => void) | null = null;
  private suspendTimer: ReturnType<typeof setTimeout> | null = null;

  private muted = true;
  private reducedMotion = false;

  private ambience: (LoopHandle & { interference: GainNode; timer: ReturnType<typeof setTimeout> | null; step: number }) | null =
    null;
  private movement: (LoopHandle & { filter: BiquadFilterNode; lfo: OscillatorNode; depth: GainNode; level: MovementLevel }) | null =
    null;
  private presence: (LoopHandle & { a: OscillatorNode; b: OscillatorNode; pan: StereoPannerNode; kind: string }) | null = null;
  private cinematic: (LoopHandle & {
    stage: CinematicAudioStage;
    droneFilter: BiquadFilterNode;
    lfoDepth: GainNode;
    fragments: GainNode;
    packets: GainNode;
    packetDepth: GainNode;
    harmonic: GainNode;
    harmonicA: OscillatorNode;
    harmonicB: OscillatorNode;
  }) | null = null;

  // ---------------------------------------------------------------- context / buses

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      const ctx = new AudioContextClass();
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 1;
      // Gentle glue so layered cues never clip
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.005;
      comp.release.value = 0.25;
      master.connect(comp);
      comp.connect(ctx.destination);
      const sfx = ctx.createGain();
      const ambience = ctx.createGain();
      sfx.connect(master);
      ambience.connect(master);
      // One shared 2 s noise buffer for every noise voice (no per-cue allocation)
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let seed = 1337;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647) * 2 - 1;
      }
      this.ctx = ctx;
      this.master = master;
      this.buses = { sfx, ambience };
      this.noiseBuffer = buffer;
    }
    this.cancelSuspend();
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
      this.armResumeOnGesture();
    }
    return this.ctx;
  }

  // If the browser kept the context suspended (no gesture yet), resume on the next one
  private armResumeOnGesture() {
    if (this.resumeListener || typeof window === "undefined") return;
    const resume = () => {
      this.ctx?.resume().catch(() => {});
      window.removeEventListener("pointerdown", resume, true);
      window.removeEventListener("keydown", resume, true);
      this.resumeListener = null;
    };
    this.resumeListener = resume;
    window.addEventListener("pointerdown", resume, true);
    window.addEventListener("keydown", resume, true);
  }

  private cancelSuspend() {
    if (this.suspendTimer) {
      clearTimeout(this.suspendTimer);
      this.suspendTimer = null;
    }
  }

  private ready(): AudioContext | null {
    if (this.muted) return null;
    return this.getContext();
  }

  // ---------------------------------------------------------------- global controls

  // Mirrors the existing audioEnabled toggle. Muting ramps the master bus to silence immediately,
  // stops every loop and lets the context sleep.
  setEnabled(enabled: boolean) {
    this.muted = !enabled;
    if (enabled) {
      const ctx = this.getContext();
      if (ctx && this.master) {
        this.master.gain.cancelScheduledValues(ctx.currentTime);
        this.master.gain.setTargetAtTime(1, ctx.currentTime, 0.03);
      }
      return;
    }
    if (this.ctx && this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
    }
    this.stopLoops(0.02);
    this.sleepSoon(300);
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
    if (this.movement && this.ctx) {
      this.movement.depth.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  // Stop every continuous layer (exit / unmount / mute)
  stopLoops(fade = 0.2) {
    this.stopAmbience(fade);
    this.setMovement(0);
    this.teardown("movement", fade);
    this.teardown("presence", fade);
    this.setCinematic(null, fade);
  }

  // Let the context suspend once nothing is audible (saves CPU on the entry screen / after exit)
  sleepSoon(ms = 1500) {
    if (!this.ctx) return;
    this.cancelSuspend();
    this.suspendTimer = setTimeout(() => {
      this.suspendTimer = null;
      if (!this.ambience && !this.cinematic && this.ctx?.state === "running") this.ctx.suspend().catch(() => {});
    }, ms);
  }

  // ---------------------------------------------------------------- primitives

  private connectOut(node: AudioNode, ctx: AudioContext, pan: number | undefined, bus: BusName) {
    const dest = this.buses![bus];
    if (pan !== undefined && pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = clampPan(pan);
      node.connect(p);
      p.connect(dest);
      return p;
    }
    node.connect(dest);
    return null;
  }

  // Primitives never throw: a failed voice must not interrupt the handler that triggered it
  private tone(freq: number, o: ToneOptions = {}) {
    safeAudio(() => this.toneUnsafe(freq, o));
  }

  private noise(o: NoiseOptions = {}) {
    safeAudio(() => this.noiseUnsafe(o));
  }

  private toneUnsafe(freq: number, o: ToneOptions) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + (o.at ?? 0);
    const attack = o.attack ?? 0.006;
    const decay = o.decay ?? 0.18;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, t + attack + decay);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(o.gain ?? 0.04, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    let head: AudioNode = osc;
    let filter: BiquadFilterNode | null = null;
    if (o.lowpass) {
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = o.lowpass;
      osc.connect(filter);
      head = filter;
    }
    head.connect(env);
    const panner = this.connectOut(env, ctx, o.pan, o.bus ?? "sfx");
    osc.onended = () => {
      osc.disconnect();
      filter?.disconnect();
      env.disconnect();
      panner?.disconnect();
    };
    osc.start(t);
    osc.stop(t + attack + decay + 0.02);
  }

  private noiseUnsafe(o: NoiseOptions) {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const t = ctx.currentTime + (o.at ?? 0);
    const dur = o.dur ?? 0.1;
    const attack = o.attack ?? 0.004;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter ?? "bandpass";
    filter.frequency.setValueAtTime(o.freq ?? 2000, t);
    if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
    filter.Q.value = o.q ?? 1;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(o.gain ?? 0.03, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(env);
    const panner = this.connectOut(env, ctx, o.pan, o.bus ?? "sfx");
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      env.disconnect();
      panner?.disconnect();
    };
    // Random-ish but deterministic offset into the shared buffer
    src.start(t, (t * 0.731) % 1.5, dur + 0.02);
  }

  // Short relay contact: the shared "tick" of the whole interface (replaces generic clicks)
  private relay(o: { at?: number; gain?: number; pan?: number; freq?: number } = {}) {
    this.noise({ at: o.at, gain: (o.gain ?? 0.035) * 1.2, dur: 0.022, freq: o.freq ?? 3400, q: 5, pan: o.pan });
    this.tone((o.freq ?? 3400) * 0.55, { at: o.at, gain: (o.gain ?? 0.035) * 0.4, attack: 0.002, decay: 0.03, pan: o.pan });
  }

  // ---------------------------------------------------------------- legacy API (existing call sites)

  // Interface tick (relay contact, not a web "click")
  playClick() {
    this.relay({ gain: 0.03 });
  }

  // Soft signal tone with a quieter upper partial
  playStationTone(freq = 880) {
    this.tone(freq * 0.75, { type: "triangle", gain: 0.035, decay: 0.2, lowpass: 2600 });
    this.tone(freq * 1.125, { gain: 0.014, at: 0.045, decay: 0.16 });
  }

  // Radio static squelch (shared buffer, swept band)
  playRadioSquelch() {
    this.noise({ gain: 0.045, dur: 0.14, freq: 2400, freqTo: 1100, q: 3 });
  }

  // Low warning burst (kept for API compatibility; softened)
  playEmergencyAlarm() {
    this.tone(520, { type: "sawtooth", gain: 0.03, decay: 0.22, lowpass: 1400, glideTo: 390 });
  }

  // ---------------------------------------------------------------- facility cues

  // Entering the facility: low power-up swell, carrier lock, faint transmission
  enterFacility() {
    this.tone(42, { gain: 0.06, attack: 0.35, decay: 1.3, glideTo: 66, lowpass: 200 });
    this.noise({ gain: 0.02, attack: 0.3, dur: 1.2, filter: "lowpass", freq: 300, freqTo: 1800, q: 0.7 });
    this.tone(660, { gain: 0.018, at: 0.55, attack: 0.08, decay: 0.9 });
    this.tone(990, { gain: 0.01, at: 0.62, attack: 0.08, decay: 0.8 });
    this.relay({ at: 0.5, gain: 0.025 });
  }

  // A station/board becomes the interaction target. Each kind has its own short signature.
  focus(kind: FocusKind, pan = 0) {
    switch (kind) {
      case "locked":
        // Single low, muted note: "this is here, but not available"
        this.tone(262, { type: "triangle", gain: 0.022, decay: 0.16, lowpass: 900, pan });
        break;
      case "solved":
        this.tone(1047, { gain: 0.014, decay: 0.12, pan });
        this.tone(1568, { gain: 0.01, at: 0.06, decay: 0.16, pan });
        break;
      case "board":
        // Holographic scan: rising sweep with a breath of noise
        this.tone(880, { gain: 0.016, attack: 0.03, decay: 0.22, glideTo: 1480, pan });
        this.noise({ gain: 0.008, dur: 0.24, freq: 5200, freqTo: 7600, q: 2, pan });
        break;
      default:
        // Lock-on: two quick soft signal notes
        this.tone(1319, { gain: 0.016, decay: 0.07, pan });
        this.tone(1760, { gain: 0.013, at: 0.055, decay: 0.1, pan });
    }
  }

  // E / click on an available station: relay engages, the modal opens with an airy lift
  openStation(pan = 0) {
    this.tone(110, { gain: 0.05, attack: 0.004, decay: 0.12, lowpass: 400, pan });
    this.relay({ gain: 0.035, pan });
    this.noise({ gain: 0.018, attack: 0.04, dur: 0.26, filter: "lowpass", freq: 500, freqTo: 3200, q: 0.8 });
    this.tone(523, { gain: 0.02, at: 0.03, decay: 0.22, glideTo: 784 });
  }

  // Modal closes: the inverse gesture
  closeModal() {
    this.noise({ gain: 0.014, attack: 0.01, dur: 0.22, filter: "lowpass", freq: 2600, freqTo: 350, q: 0.8 });
    this.tone(587, { gain: 0.014, decay: 0.18, glideTo: 392 });
    this.relay({ at: 0.12, gain: 0.018, freq: 2600 });
  }

  // Locked station: low electronic denial (two soft pulses), not an alarm
  denied(pan = 0) {
    this.tone(155, { type: "triangle", gain: 0.05, decay: 0.09, lowpass: 800, pan });
    this.tone(146, { type: "triangle", gain: 0.045, at: 0.13, decay: 0.16, lowpass: 700, pan });
    this.noise({ gain: 0.012, dur: 0.08, freq: 900, q: 2, pan });
  }

  // Manual hint: forensic analysis (a short run of quiet data ticks over a soft pad)
  hint() {
    const ticks = this.reducedMotion ? [0, 0.09] : [0, 0.045, 0.09, 0.135, 0.18];
    ticks.forEach((at, i) => this.relay({ at, gain: 0.014, freq: 2600 + ((i * 433) % 900) }));
    this.tone(740, { gain: 0.018, attack: 0.05, decay: 0.45 });
    this.tone(1110, { gain: 0.008, at: 0.08, attack: 0.05, decay: 0.4 });
  }

  // Wrong answer: brief distorted rejection ("that hypothesis was wrong")
  verifyFail() {
    this.noise({ gain: 0.03, dur: 0.12, freq: 1600, freqTo: 600, q: 4 });
    this.tone(233, { type: "sawtooth", gain: 0.02, decay: 0.16, lowpass: 650, glideTo: 175 });
  }

  // Successful verification (inside the station modal): confirmation pulse, then the signal
  // leaving the console. The environmental half plays when the player returns (see solveReturn).
  solveConfirm() {
    this.tone(70, { gain: 0.06, attack: 0.005, decay: 0.35, lowpass: 240 });
    [523, 784, 1047].forEach((f, i) => this.tone(f, { gain: 0.022, at: i * 0.045, attack: 0.01, decay: 0.6 }));
    // Signal transmission
    this.tone(620, { gain: 0.014, at: 0.32, attack: 0.04, decay: 0.42, glideTo: 1860 });
    this.noise({ gain: 0.01, at: 0.32, dur: 0.45, freq: 1800, freqTo: 6200, q: 3 });
    // Station activation
    this.relay({ at: 0.72, gain: 0.022 });
    this.relay({ at: 0.8, gain: 0.016, freq: 2900 });
  }

  // Back in the facility after a solve, in step with the visual energy wave: an environmental
  // surge, a data confirmation from the board, then the "system update" for the new objective.
  solveReturn(boardPan = 0, objectiveChanged = true) {
    const rm = this.reducedMotion;
    this.tone(55, { gain: 0.05, attack: 0.25, decay: 0.9, lowpass: 200, glideTo: 74, bus: "ambience" });
    this.noise({ gain: 0.016, attack: 0.3, dur: 1.1, filter: "lowpass", freq: 250, freqTo: 1400, q: 0.7, bus: "ambience" });
    // New evidence on the board (count only — the board itself already shows it)
    this.tone(1175, { gain: 0.012, at: 0.45, decay: 0.12, pan: boardPan });
    this.tone(1568, { gain: 0.01, at: 0.5, decay: 0.16, pan: boardPan });
    if (objectiveChanged) this.objectiveUpdate(rm ? 0.7 : 0.8);
  }

  // "New information has been reconstructed": three soft ascending packets and a shimmer
  objectiveUpdate(at = 0) {
    [880, 1175, 1480].forEach((f, i) => this.tone(f, { gain: 0.016, at: at + i * 0.075, attack: 0.008, decay: 0.2 }));
    this.noise({ gain: 0.006, at: at + 0.15, dur: 0.4, freq: 6800, q: 1.5 });
  }

  // EXIT HUB: facility powering down (falling carrier, closing filter, a last relay)
  shutdown() {
    this.tone(330, { gain: 0.03, attack: 0.01, decay: 0.45, glideTo: 98, lowpass: 1200 });
    this.noise({ gain: 0.014, dur: 0.4, filter: "lowpass", freq: 2400, freqTo: 180, q: 0.8 });
    this.tone(55, { gain: 0.045, at: 0.05, attack: 0.02, decay: 0.4, lowpass: 200 });
    this.relay({ at: 0.32, gain: 0.02, freq: 2200 });
  }

  // Investigation Board opens: layered holographic activation
  openBoard() {
    this.tone(98, { gain: 0.045, attack: 0.01, decay: 0.3, lowpass: 300 });
    this.relay({ gain: 0.03 });
    this.tone(659, { gain: 0.016, at: 0.04, attack: 0.04, decay: 0.4 });
    this.tone(988, { gain: 0.012, at: 0.1, attack: 0.04, decay: 0.42 });
    this.tone(1319, { gain: 0.008, at: 0.16, attack: 0.04, decay: 0.45 });
    this.noise({ gain: 0.01, at: 0.05, dur: 0.5, freq: 4200, freqTo: 7800, q: 2 });
  }

  // Blue Zone complete: transmission complete → channel sealed → facility stabilises. Not a jingle.
  sealed() {
    // Final transmission leaves
    this.tone(880, { gain: 0.02, attack: 0.02, decay: 0.5, glideTo: 2200 });
    this.noise({ gain: 0.012, dur: 0.5, freq: 2000, freqTo: 7000, q: 3 });
    // Encrypted channel seals (two relays close)
    this.relay({ at: 0.55, gain: 0.035, freq: 3000 });
    this.relay({ at: 0.63, gain: 0.03, freq: 2400 });
    // Facility stabilises: a low settle and an open fifth that fades into the ambience
    this.tone(65, { gain: 0.055, at: 0.6, attack: 0.08, decay: 1.6, lowpass: 220 });
    this.tone(392, { gain: 0.02, at: 0.7, attack: 0.25, decay: 2.2, bus: "ambience" });
    this.tone(587, { gain: 0.014, at: 0.78, attack: 0.25, decay: 2.1, bus: "ambience", pan: 0.3 });
    this.tone(784, { gain: 0.008, at: 0.86, attack: 0.25, decay: 2.0, bus: "ambience", pan: -0.3 });
  }

  // ---------------------------------------------------------------- loops

  private loopSource(ctx: AudioContext, offset: number) {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.start(0, offset);
    return src;
  }

  private teardown(name: "movement" | "presence" | "ambience" | "cinematic", fade = 0.2) {
    const loop = this[name];
    if (!loop) return;
    this[name] = null;
    const ctx = this.ctx;
    if (!ctx) return;
    loop.out.gain.cancelScheduledValues(ctx.currentTime);
    loop.out.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.005, fade / 3));
    const stopAt = ctx.currentTime + fade + 0.05;
    loop.sources.forEach((s) => {
      try {
        s?.stop(stopAt);
      } catch {
        // already stopped
      }
    });
    setTimeout(() => {
      loop.sources.forEach((s) => s?.disconnect());
      loop.nodes.forEach((n) => n.disconnect());
      loop.out.disconnect();
    }, (fade + 0.15) * 1000);
  }

  // Facility ambience: room tone (wide), faint mains hum, slow radio interference and the odd
  // distant transmission. Barely audible by design; mood follows progression.
  startAmbience() {
    const ctx = this.ready();
    if (!ctx || this.ambience) return;
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.buses!.ambience);
    const nodes: AudioNode[] = [];
    const sources: AudioScheduledSourceNode[] = [];

    // Room tone: two decorrelated low noise beds panned apart for depth on headphones
    [-0.7, 0.7].forEach((p, i) => {
      const src = this.loopSource(ctx, i * 0.83);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 180 + i * 40;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      const pan = ctx.createStereoPanner();
      pan.pan.value = p;
      src.connect(lp).connect(g).connect(pan).connect(out);
      nodes.push(lp, g, pan);
      sources.push(src);
    });

    // Electrical hum (50/100/150 Hz) with a slight beat
    [
      [50, 0.006],
      [100.35, 0.004],
      [150, 0.0015],
    ].forEach(([f, gv]) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = gv;
      osc.connect(g).connect(out);
      osc.start();
      nodes.push(g);
      sources.push(osc);
    });

    // Radio interference: narrow band of noise breathing on a very slow LFO
    const isrc = this.loopSource(ctx, 1.21);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1850;
    bp.Q.value = 9;
    const interference = ctx.createGain();
    interference.gain.value = 0.008;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.007;
    lfo.connect(lfoGain).connect(interference.gain);
    const ipan = ctx.createStereoPanner();
    ipan.pan.value = -0.35;
    isrc.connect(bp).connect(interference).connect(ipan).connect(out);
    lfo.start();
    nodes.push(bp, interference, lfoGain, ipan);
    sources.push(isrc, lfo);

    out.gain.setTargetAtTime(1, ctx.currentTime, 1.2); // slow fade in on entry
    this.ambience = { nodes, sources, out, interference, timer: null, step: 0 };
    this.scheduleTransmission();
  }

  // Occasional distant transmission (deterministic spacing 13–25 s), far away: low-passed and panned
  private scheduleTransmission() {
    const amb = this.ambience;
    if (!amb) return;
    const delay = 13000 + ((amb.step * 5237) % 12000);
    amb.timer = setTimeout(() => {
      if (this.ambience !== amb || this.muted) return;
      amb.step++;
      const pan = ((amb.step * 0.618) % 1.6) - 0.8;
      const count = this.reducedMotion ? 2 : 3 + (amb.step % 3);
      for (let i = 0; i < count; i++) {
        this.tone(1240 + (i % 2) * 180, { gain: 0.004, at: i * 0.11, decay: 0.06, lowpass: 1600, pan, bus: "ambience" });
      }
      this.noise({ gain: 0.005, dur: 0.35, freq: 1400, q: 4, pan, bus: "ambience" });
      this.scheduleTransmission();
    }, delay);
  }

  stopAmbience(fade = 0.6) {
    if (this.ambience?.timer) clearTimeout(this.ambience.timer);
    this.teardown("ambience", fade);
  }

  // Progression mood: 0..3 investigation, 3 = relay pending (more interference), 4 = complete (calm)
  setAmbienceMood(level: number) {
    const ctx = this.ctx;
    if (!ctx || !this.ambience) return;
    const target = level >= 4 ? 0.003 : level === 3 ? 0.013 : 0.008;
    this.ambience.interference.gain.setTargetAtTime(target, ctx.currentTime, 1.5);
  }

  // Movement texture: quiet floor/servo layer; level changes only on walk/sprint/stop transitions.
  // Stopping cuts it within ~30 ms. Reduced motion keeps a steady texture without the step rhythm.
  setMovement(level: MovementLevel) {
    const ctx = this.ctx;
    if (level === 0) {
      if (ctx && this.movement && this.movement.level !== 0) {
        this.movement.level = 0;
        this.movement.out.gain.cancelScheduledValues(ctx.currentTime);
        this.movement.out.gain.setTargetAtTime(0, ctx.currentTime, 0.025);
      }
      return;
    }
    const live = this.ready();
    if (!live) return;
    if (!this.movement) {
      const src = this.loopSource(live, 0.4);
      const filter = live.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 1.1;
      filter.frequency.value = 700;
      const body = live.createGain();
      body.gain.value = 1;
      const out = live.createGain();
      out.gain.value = 0;
      // Step rhythm: an LFO gently modulating the body level
      const lfo = live.createOscillator();
      lfo.frequency.value = 1.9;
      const depth = live.createGain();
      depth.gain.value = 0;
      lfo.connect(depth).connect(body.gain);
      src.connect(filter).connect(body).connect(out).connect(this.buses!.sfx);
      lfo.start();
      this.movement = { nodes: [filter, body, depth], sources: [src, lfo], out, filter, lfo, depth, level: 0 };
    }
    const m = this.movement;
    if (m.level === level) return;
    m.level = level;
    const t = live.currentTime;
    const sprint = level === 2;
    m.out.gain.cancelScheduledValues(t);
    m.out.gain.setTargetAtTime(sprint ? 0.022 : 0.012, t, 0.06);
    m.filter.frequency.setTargetAtTime(sprint ? 1100 : 700, t, 0.1);
    m.lfo.frequency.setTargetAtTime(sprint ? 2.7 : 1.9, t, 0.1);
    m.depth.gain.setTargetAtTime(this.reducedMotion ? 0 : 0.55, t, 0.1);
  }

  // Station presence: silent far away, a soft hum only when close (level 0..1 already eased by the
  // caller), panned toward the source. The board has its own holographic voice.
  setPresence(level: number, pan = 0, kind: "station" | "board" | "locked" = "station") {
    const ctx = this.ctx;
    if (level <= 0.001) {
      if (ctx && this.presence) this.presence.out.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
      return;
    }
    const live = this.ready();
    if (!live) return;
    if (!this.presence) {
      const a = live.createOscillator();
      const b = live.createOscillator();
      b.type = "triangle";
      const lp = live.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 900;
      const ga = live.createGain();
      ga.gain.value = 0.6;
      const gb = live.createGain();
      gb.gain.value = 0.25;
      const out = live.createGain();
      out.gain.value = 0;
      const pnode = live.createStereoPanner();
      a.connect(ga).connect(lp);
      b.connect(gb).connect(lp);
      lp.connect(out).connect(pnode).connect(this.buses!.sfx);
      a.start();
      b.start();
      this.presence = { nodes: [ga, gb, lp, pnode], sources: [a, b], out, a, b, pan: pnode, kind: "" };
    }
    const p = this.presence;
    const t = live.currentTime;
    if (p.kind !== kind) {
      p.kind = kind;
      const [fa, fb] = kind === "board" ? [196, 588.5] : kind === "locked" ? [98, 147] : [146.8, 440.5];
      p.a.frequency.setTargetAtTime(fa, t, 0.15);
      p.b.frequency.setTargetAtTime(fb, t, 0.15);
    }
    p.out.gain.setTargetAtTime(level * level * 0.03, t, 0.12);
    p.pan.pan.setTargetAtTime(clampPan(pan) * 0.8, t, 0.12);
  }

  // Emergency Broadcast cinematic bed. Follows the store stage while the console is open;
  // null fades it out (close mid-sequence, completion, mute). Reopening rebuilds it at the
  // current stage. Accents mark each stage change.
  setCinematic(stage: CinematicAudioStage | null, fade = 0.35) {
    if (!stage) {
      this.teardown("cinematic", fade);
      return;
    }
    const ctx = this.ready();
    if (!ctx) return;
    if (!this.cinematic) {
      const out = ctx.createGain();
      out.gain.value = 0.0001;
      out.connect(this.buses!.sfx);
      // Low drone with an unstable filter
      const drone = ctx.createOscillator();
      drone.type = "sawtooth";
      drone.frequency.value = 55;
      const drone2 = ctx.createOscillator();
      drone2.type = "sawtooth";
      drone2.frequency.value = 55.6;
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = "lowpass";
      droneFilter.frequency.value = 160;
      droneFilter.Q.value = 4;
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.05;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.45;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 70;
      lfo.connect(lfoDepth).connect(droneFilter.frequency);
      drone.connect(droneFilter);
      drone2.connect(droneFilter);
      droneFilter.connect(droneGain).connect(out);

      // Intermittent radio fragments: band noise gated by two square LFOs (irregular rhythm)
      const fsrc = this.loopSource(ctx, 0.2);
      const fbp = ctx.createBiquadFilter();
      fbp.type = "bandpass";
      fbp.frequency.value = 2100;
      fbp.Q.value = 3;
      const fragments = ctx.createGain();
      fragments.gain.value = 0;
      const gate = ctx.createGain();
      gate.gain.value = 0;
      const g1 = ctx.createOscillator();
      g1.type = "square";
      g1.frequency.value = 3.1;
      const g2 = ctx.createOscillator();
      g2.type = "square";
      g2.frequency.value = 1.7;
      const gd1 = ctx.createGain();
      gd1.gain.value = 0.5;
      const gd2 = ctx.createGain();
      gd2.gain.value = 0.5;
      g1.connect(gd1).connect(gate.gain);
      g2.connect(gd2).connect(gate.gain);
      const fpan = ctx.createStereoPanner();
      fpan.pan.value = 0.4;
      fsrc.connect(fbp).connect(gate).connect(fragments).connect(fpan).connect(out);

      // Data packets: high band noise chopped by a fast square LFO
      const psrc = this.loopSource(ctx, 0.9);
      const pbp = ctx.createBiquadFilter();
      pbp.type = "bandpass";
      pbp.frequency.value = 4200;
      pbp.Q.value = 6;
      const packets = ctx.createGain();
      packets.gain.value = 0;
      const pgate = ctx.createGain();
      pgate.gain.value = 0;
      const plfo = ctx.createOscillator();
      plfo.type = "square";
      plfo.frequency.value = 9;
      const packetDepth = ctx.createGain();
      packetDepth.gain.value = 0.5;
      plfo.connect(packetDepth).connect(pgate.gain);
      psrc.connect(pbp).connect(pgate).connect(packets).connect(out);

      // Harmonic texture that rises through reconstruction and opens wide on reveal
      const harmonicA = ctx.createOscillator();
      harmonicA.frequency.value = 220;
      const harmonicB = ctx.createOscillator();
      harmonicB.frequency.value = 330;
      const harmonic = ctx.createGain();
      harmonic.gain.value = 0;
      const hpa = ctx.createStereoPanner();
      hpa.pan.value = -0.6;
      const hpb = ctx.createStereoPanner();
      hpb.pan.value = 0.6;
      harmonicA.connect(hpa).connect(harmonic);
      harmonicB.connect(hpb).connect(harmonic);
      harmonic.connect(out);

      // (noise loops from loopSource() are already started)
      [drone, drone2, lfo, g1, g2, plfo, harmonicA, harmonicB].forEach((s) => s.start());
      out.gain.setTargetAtTime(1, ctx.currentTime, 0.25);
      this.cinematic = {
        stage,
        nodes: [droneFilter, droneGain, lfoDepth, fbp, fragments, gate, gd1, gd2, fpan, pbp, packets, pgate, packetDepth, hpa, hpb, harmonic],
        sources: [drone, drone2, lfo, fsrc, g1, g2, psrc, plfo, harmonicA, harmonicB],
        out,
        droneFilter,
        lfoDepth,
        fragments,
        packets,
        packetDepth,
        harmonic,
        harmonicA,
        harmonicB,
      };
      this.applyCinematicStage(stage, true);
      return;
    }
    if (this.cinematic.stage !== stage) {
      this.cinematic.stage = stage;
      this.applyCinematicStage(stage, false);
    }
  }

  private applyCinematicStage(stage: CinematicAudioStage, initial: boolean) {
    const c = this.cinematic;
    const ctx = this.ctx;
    if (!c || !ctx) return;
    const t = ctx.currentTime;
    const rm = this.reducedMotion;
    if (stage === "stabilizing") {
      // Unstable signal, low tension, intermittent fragments
      c.droneFilter.frequency.setTargetAtTime(150, t, 0.3);
      c.lfoDepth.gain.setTargetAtTime(rm ? 15 : 70, t, 0.3);
      c.fragments.gain.setTargetAtTime(rm ? 0.004 : 0.022, t, 0.2);
      c.packets.gain.setTargetAtTime(0, t, 0.2);
      c.harmonic.gain.setTargetAtTime(0, t, 0.2);
      // Opening squelch also marks a reopen mid-stage
      this.playRadioSquelch();
    } else if (stage === "reconstructing") {
      // Data activity builds: packets, rising harmonics, filter opening
      c.droneFilter.frequency.setTargetAtTime(260, t, 0.5);
      c.lfoDepth.gain.setTargetAtTime(rm ? 8 : 35, t, 0.4);
      c.fragments.gain.setTargetAtTime(0.006, t, 0.3);
      c.packets.gain.setTargetAtTime(rm ? 0.004 : 0.014, t, 0.25);
      c.packetDepth.gain.setTargetAtTime(rm ? 0 : 0.5, t, 0.1);
      c.harmonic.gain.setTargetAtTime(0.008, t, 0.6);
      c.harmonicA.frequency.setTargetAtTime(247, t, 0.8);
      c.harmonicB.frequency.setTargetAtTime(370, t, 0.8);
      if (!initial) this.relay({ gain: 0.02, freq: 3800 });
    } else {
      // Revealed: signal stabilises and widens; a clear transmission tone
      c.droneFilter.frequency.setTargetAtTime(420, t, 0.4);
      c.lfoDepth.gain.setTargetAtTime(0, t, 0.3);
      c.fragments.gain.setTargetAtTime(0, t, 0.2);
      c.packets.gain.setTargetAtTime(0, t, 0.3);
      c.harmonicA.frequency.setTargetAtTime(220, t, 0.3);
      c.harmonicB.frequency.setTargetAtTime(330, t, 0.3);
      c.harmonic.gain.setTargetAtTime(0.016, t, 0.3);
      this.tone(660, { gain: 0.022, attack: 0.05, decay: 0.9 });
      this.tone(990, { gain: 0.012, at: 0.05, attack: 0.05, decay: 0.8, pan: 0.5 });
      this.tone(495, { gain: 0.012, at: 0.05, attack: 0.05, decay: 0.8, pan: -0.5 });
    }
  }
}

export const sound = new SoundSystem();

// Audio must never break gameplay: callers driven by store subscriptions / frames run through this
export function safeAudio(fn: () => void) {
  try {
    fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[blue-zone audio]", err);
  }
}

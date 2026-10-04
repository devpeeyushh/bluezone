import { create } from "zustand";
import { StationId } from "../types/radio.types";
import { CinematicRevealStage } from "../types/investigation.types";
import { BLUE_ZONE_CONFIG } from "../data/config";

// HUD prompt shown when the player is within interaction range of a station
export interface InteractionPrompt {
  targetId: string;
  name: string;
  status: string;
  statusColor: string;
  requirement: string | null;
  isLocked: boolean;
  action: () => void;
}

export interface BlueZoneState {
  // Phase progression
  entered: boolean;
  activeStation: StationId | null;

  // CTF Challenge Progression Flags
  challenge1Solved: boolean;
  challenge2Solved: boolean;
  challenge3Solved: boolean;

  // Station unlock states (strictly enforced by CTF progression)
  terminalUnlocked: boolean;
  voiceArchiveUnlocked: boolean;
  signalMonitorUnlocked: boolean;
  networkUnlocked: boolean;
  broadcastUnlocked: boolean;
  completed: boolean;

  // Investigation Board & Discovered Forensic Facts
  investigationBoardOpen: boolean;
  discoveredSanctuaryIds: string[];
  discoveredSignals: string[];
  discoveredConnections: string[];
  discoveredBroadcastFacts: string[];

  // Cinematic sequence state
  cinematicStage: CinematicRevealStage;

  // Phase 4: Session Timer & Hint Architecture
  sessionTimeRemaining: number;
  sessionActive: boolean;
  hintMode: "manual" | "after-failed-attempts";
  activeHints: Record<string, number>; // challengeId -> hint level unlocked
  failedAttemptCounts: Record<string, number>; // challengeId -> fail count
  interactionPrompt: InteractionPrompt | null;
  controlsMode: "first-person" | "orbit";

  // UX, Audio & Diagnostic state
  audioEnabled: boolean;
  inspectedFrequency: number;
  systemLogs: string[];

  // Actions
  enterHub: () => void;
  exitHub: () => void;
  setActiveStation: (station: StationId | null) => void;
  openInvestigationBoard: () => void;
  closeInvestigationBoard: () => void;
  setCinematicStage: (stage: CinematicRevealStage) => void;

  solveChallenge1: () => void;
  solveChallenge2: () => void;
  solveChallenge3: () => void;

  setInspectedFrequency: (freq: number) => void;
  addSystemLog: (log: string) => void;
  toggleAudio: () => void;
  setCompleted: (val: boolean) => void;
  decrementTimer: (seconds?: number) => void;
  requestHint: (challengeId: string) => void;
  recordFailedAttempt: (challengeId: string) => void;
  setInteractionPrompt: (prompt: InteractionPrompt | null) => void;
  setControlsMode: (mode: "first-person" | "orbit") => void;
  resetZone: () => void;
}

export const useBlueZoneStore = create<BlueZoneState>((set) => ({
  entered: false,
  activeStation: null,

  // CTF Progression flags
  challenge1Solved: false,
  challenge2Solved: false,
  challenge3Solved: false,

  terminalUnlocked: true,
  voiceArchiveUnlocked: false,
  signalMonitorUnlocked: false,
  networkUnlocked: false,
  broadcastUnlocked: false,
  completed: false,

  // Investigation Board persistent state
  investigationBoardOpen: false,
  discoveredSanctuaryIds: [],
  discoveredSignals: [],
  discoveredConnections: [],
  discoveredBroadcastFacts: [],

  cinematicStage: "idle",
  sessionTimeRemaining: BLUE_ZONE_CONFIG.SESSION_TIME_LIMIT_SECONDS,
  sessionActive: false,
  hintMode: "manual",
  activeHints: {},
  failedAttemptCounts: {},
  interactionPrompt: null,
  controlsMode: "first-person",

  audioEnabled: false,
  inspectedFrequency: 142.85,
  systemLogs: [
    "> BLUE ZONE RADIO TERMINAL INITIALIZED",
    "> LOCAL TELEMETRY: CARRIER DEGRADATION DETECTED",
  ],

  enterHub: () =>
    set((state) => ({
      entered: true,
      // Re-entering after completion must not restart the session clock
      sessionActive: !state.completed,
      systemLogs: [...state.systemLogs, "> ENTERED RADIO COMMUNICATION SECTOR 03", "> RADIO NETWORK SESSION TIMER COMMENCED"],
    })),

  exitHub: () => set({ entered: false, activeStation: null }),

  setActiveStation: (station) => set({ activeStation: station }),

  openInvestigationBoard: () => set({ investigationBoardOpen: true }),
  closeInvestigationBoard: () => set({ investigationBoardOpen: false }),
  setCinematicStage: (stage) => set({ cinematicStage: stage }),

  solveChallenge1: () =>
    set((state) => ({
      challenge1Solved: true,
      voiceArchiveUnlocked: true,
      signalMonitorUnlocked: true,
      discoveredSanctuaryIds: Array.from(new Set([...state.discoveredSanctuaryIds, "SANC-0003"])),
      systemLogs: [
        ...state.systemLogs,
        "> COMMUNICATION FRAGMENT RECONSTRUCTED: SANC-0003 [RADIO SECTOR] CONFIRMED",
        "> VOICE ARCHIVE BUFFER UNLOCKED",
        "> SIGNAL MONITOR UNLOCKED",
      ],
    })),

  solveChallenge2: () =>
    set((state) => ({
      challenge2Solved: true,
      networkUnlocked: true,
      discoveredSignals: Array.from(new Set([...state.discoveredSignals, "156.30 MHz (EMERGENCY REPEATER)"])),
      systemLogs: [
        ...state.systemLogs,
        "> FAILED TRANSMISSION PATTERN CORRELATED: CARRIER WAVE LOCK AT 156.30 MHz CONFIRMED",
        "> RESIDENT NETWORK TOPOLOGY UNLOCKED",
      ],
    })),

  solveChallenge3: () =>
    set((state) => ({
      challenge3Solved: true,
      broadcastUnlocked: true,
      discoveredConnections: Array.from(
        new Set([...state.discoveredConnections, "SANC-0002 [RADIO NEXUS] → SANC-0034 [FORENSICS GATEWAY]"])
      ),
      systemLogs: [
        ...state.systemLogs,
        "> NETWORK ROUTE RECONSTRUCTED: SANC-0002 NEXUS LINKED TO FORENSICS GATEWAY SANC-0034",
        "> EMERGENCY BROADCAST CONSOLE OVERRIDE COMPLETE",
      ],
    })),

  setInspectedFrequency: (freq) => set({ inspectedFrequency: freq }),

  addSystemLog: (log) =>
    set((state) => ({
      systemLogs: [...state.systemLogs, log],
    })),

  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

  setCompleted: (val) =>
    set((state) => ({
      sessionActive: !val,
      completed: val,
      discoveredBroadcastFacts: [
        "SOURCE: AUTOMATIC SYSTEM",
        "TRIGGER: UNAUTHORIZED ACCESS",
        "ORIGIN: FORENSICS EVIDENCE VAULT",
      ],
    })),

  decrementTimer: (seconds = 1) =>
    set((state) => {
      if (!state.sessionActive || state.completed || state.sessionTimeRemaining <= 0) return state;
      const nextTime = Math.max(0, state.sessionTimeRemaining - seconds);
      // Expiry is non-destructive: progress is kept and the investigation may continue
      if (nextTime === 0) {
        return {
          sessionTimeRemaining: 0,
          systemLogs: [...state.systemLogs, "> SESSION WINDOW EXPIRED // INVESTIGATION MAY CONTINUE"],
        };
      }
      return { sessionTimeRemaining: nextTime };
    }),

  requestHint: (challengeId: string) =>
    set((state) => {
      const currentLevel = state.activeHints[challengeId] || 0;
      return {
        activeHints: { ...state.activeHints, [challengeId]: currentLevel + 1 },
        systemLogs: [...state.systemLogs, `> ADVISORY HINT UNLOCKED FOR ${challengeId.toUpperCase()}`],
      };
    }),

  recordFailedAttempt: (challengeId: string) =>
    set((state) => {
      const currentFails = (state.failedAttemptCounts[challengeId] || 0) + 1;
      const nextState: Partial<BlueZoneState> = {
        failedAttemptCounts: { ...state.failedAttemptCounts, [challengeId]: currentFails },
      };
      if (state.hintMode === "after-failed-attempts" && currentFails >= 3) {
        const currentLevel = state.activeHints[challengeId] || 0;
        nextState.activeHints = { ...state.activeHints, [challengeId]: Math.max(currentLevel, 1) };
      }
      return nextState;
    }),

  setInteractionPrompt: (prompt) => set({ interactionPrompt: prompt }),

  setControlsMode: (mode) => set({ controlsMode: mode }),

  resetZone: () =>
    set({
      entered: false,
      activeStation: null,
      challenge1Solved: false,
      challenge2Solved: false,
      challenge3Solved: false,
      terminalUnlocked: true,
      voiceArchiveUnlocked: false,
      signalMonitorUnlocked: false,
      networkUnlocked: false,
      broadcastUnlocked: false,
      completed: false,
      investigationBoardOpen: false,
      discoveredSanctuaryIds: [],
      discoveredSignals: [],
      discoveredConnections: [],
      discoveredBroadcastFacts: [],
      cinematicStage: "idle",
      sessionTimeRemaining: BLUE_ZONE_CONFIG.SESSION_TIME_LIMIT_SECONDS,
      sessionActive: false,
      activeHints: {},
      failedAttemptCounts: {},
      interactionPrompt: null,
      systemLogs: ["> SYSTEM RESET COMPLETE"],
    }),
}));

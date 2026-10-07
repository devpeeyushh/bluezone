import { create } from "zustand";
import { StationId } from "../types/radio.types";
import { CinematicRevealStage } from "../types/investigation.types";
import { BLUE_ZONE_CONFIG } from "../data/config";
import { BlueZoneChallengeId, ChallengeReward } from "../types/challenge.types";

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
  // CTF 03 (Voice Archive) is standalone: available from the start, unlocks nothing, not counted
  // in the 3-challenge broadcast gate
  ctf03Solved: boolean;
  // CTF 04 (Signal Monitor) is standalone in the same way: unlocks nothing, not in the broadcast gate
  ctf04Solved: boolean;

  // Content released by verified flags (e.g. the CTF 01 recovered fragment used at the Network Map)
  challengeRewards: Partial<Record<BlueZoneChallengeId, ChallengeReward>>;

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

  // Unlock order: CTF 01 (terminal) → CTF 02 (network map) → voice archive / signal monitor → broadcast
  solveChallenge1: (reward?: ChallengeReward) => void;
  solveChallenge2: () => void;
  solveChallenge3: (reward?: ChallengeReward) => void;
  solveCtf03: (reward?: ChallengeReward) => void;
  solveCtf04: (reward?: ChallengeReward) => void;

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
  ctf03Solved: false,
  ctf04Solved: false,
  challengeRewards: {},

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

  // Solve actions are idempotent: a repeated call never re-completes or re-logs a challenge
  solveChallenge1: (reward) =>
    set((state) => {
      if (state.challenge1Solved) return state;
      return {
        challenge1Solved: true,
        networkUnlocked: true,
        challengeRewards: reward ? { ...state.challengeRewards, "blue-zone-ctf-01": reward } : state.challengeRewards,
        discoveredSanctuaryIds: Array.from(new Set([...state.discoveredSanctuaryIds, "SANC-0003"])),
        systemLogs: [
          ...state.systemLogs,
          "> TRANSMISSION_07 RECONSTRUCTED: COMMUNICATION RESTORED",
          "> NETWORK MAP UNLOCKED",
        ],
      };
    }),

  solveChallenge2: () =>
    set((state) => {
      if (state.challenge2Solved) return state;
      return {
        challenge2Solved: true,
        broadcastUnlocked: state.challenge1Solved && state.challenge3Solved,
        discoveredSignals: Array.from(new Set([...state.discoveredSignals, "156.30 MHz (EMERGENCY REPEATER)"])),
        systemLogs: [
          ...state.systemLogs,
          "> FAILED TRANSMISSION PATTERN CORRELATED: CARRIER WAVE LOCK AT 156.30 MHz CONFIRMED",
          "> EMERGENCY BROADCAST CONSOLE OVERRIDE COMPLETE",
        ],
      };
    }),

  solveChallenge3: (reward) =>
    set((state) => {
      if (state.challenge3Solved) return state;
      return {
        challenge3Solved: true,
        voiceArchiveUnlocked: true,
        signalMonitorUnlocked: true,
        broadcastUnlocked: state.challenge1Solved && state.challenge2Solved,
        challengeRewards: reward ? { ...state.challengeRewards, "blue-zone-ctf-02": reward } : state.challengeRewards,
        discoveredConnections: Array.from(
          new Set([...state.discoveredConnections, "SANC-0002 [RADIO NEXUS] → SANC-0034 [FORENSICS GATEWAY]"])
        ),
        systemLogs: [
          ...state.systemLogs,
          "> NETWORK ROUTE RESTORED: NODE COMMUNICATION DECRYPTED",
          "> VOICE ARCHIVE BUFFER UNLOCKED",
          "> SIGNAL MONITOR UNLOCKED",
        ],
      };
    }),

  solveCtf03: (reward) =>
    set((state) => {
      if (state.ctf03Solved) return state;
      return {
        ctf03Solved: true,
        challengeRewards: reward ? { ...state.challengeRewards, "blue-zone-ctf-03": reward } : state.challengeRewards,
        systemLogs: [...state.systemLogs, "> VOICE ARCHIVE VA-07 RECOVERED"],
      };
    }),

  solveCtf04: (reward) =>
    set((state) => {
      if (state.ctf04Solved) return state;
      return {
        ctf04Solved: true,
        challengeRewards: reward ? { ...state.challengeRewards, "blue-zone-ctf-04": reward } : state.challengeRewards,
        systemLogs: [...state.systemLogs, "> SIGNAL MONITOR: NAVIGATION TARGET CONFIRMED"],
      };
    }),

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
      ctf03Solved: false,
      ctf04Solved: false,
      challengeRewards: {},
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

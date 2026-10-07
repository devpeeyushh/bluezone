import { StationId } from "./radio.types";

// Flag-based CTF layer (Phase 18). These identifiers are the stable pointers a future backend will
// use: the system ID is the station ("communication-terminal", "network-map"), the challenge ID is
// the CTF itself. Nothing in this file (or in the registry) contains an answer.

export type BlueZoneChallengeId = "blue-zone-ctf-01" | "blue-zone-ctf-02" | "blue-zone-ctf-03" | "blue-zone-ctf-04";

export interface ChallengeDefinition {
  id: BlueZoneChallengeId;
  systemId: StationId;
  label: string; // "CTF 01"
  title: string;
  category: string;
  flagFormat: string; // shown to the player, e.g. "BLUEZONE{WORD-NN}"
}

// Content released only when an answer verifies (decrypted by the local validator, or returned by a
// backend). Kept in progression state so later stations can use it.
export interface ChallengeReward {
  source?: string;
  nextRoute?: string;
  recoveredFragment?: string;
  communication?: string;
  route?: string;
}

// What a validator (local today, remote later) answers for one submission
export interface ValidatorVerdict {
  correct: boolean;
  message: string;
  reward?: ChallengeReward;
}

export interface ChallengeValidator {
  validate(challengeId: BlueZoneChallengeId, normalizedAnswer: string): Promise<ValidatorVerdict>;
}

export type SubmissionStatus = "correct" | "incorrect" | "malformed" | "already-completed" | "busy" | "error";

// What the UI receives from submitChallenge()
export interface ChallengeSubmissionResult {
  status: SubmissionStatus;
  correct: boolean;
  attempts: number; // failed attempts recorded for this challenge
  completed: boolean;
  hintLevel: number;
  message: string;
  metadata?: ChallengeReward;
}

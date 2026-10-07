import {
  BlueZoneChallengeId,
  ChallengeReward,
  ChallengeSubmissionResult,
  ChallengeValidator,
} from "../types/challenge.types";
import { useBlueZoneStore, BlueZoneState } from "../store/useBlueZoneStore";
import { localChallengeValidator } from "./localChallengeValidator";

// The single entry point the UI uses to submit a flag: submitChallenge(challengeId, answer).
// The UI never validates; it renders the returned result. Progression stays authoritative in the
// store — this service only maps a verified challenge onto the existing solve actions.
//
// Backend integration later: call setChallengeValidator(remoteValidator) once at startup. The
// remote validator receives the same (challengeId, normalizedAnswer) pair and returns the same
// verdict shape (including the reward), so no presentation component changes.

let validator: ChallengeValidator = localChallengeValidator;

export function setChallengeValidator(next: ChallengeValidator) {
  validator = next;
}

// Mapping onto the existing progression flags/actions (no parallel progression system)
const PROGRESSION: Record<
  BlueZoneChallengeId,
  { isSolved: (s: BlueZoneState) => boolean; complete: (s: BlueZoneState, reward?: ChallengeReward) => void }
> = {
  "blue-zone-ctf-01": {
    isSolved: (s) => s.challenge1Solved,
    complete: (s, reward) => s.solveChallenge1(reward),
  },
  "blue-zone-ctf-02": {
    isSolved: (s) => s.challenge3Solved,
    complete: (s, reward) => s.solveChallenge3(reward),
  },
  // Standalone: its own flag, unlocks nothing else
  "blue-zone-ctf-03": {
    isSolved: (s) => s.ctf03Solved,
    complete: (s, reward) => s.solveCtf03(reward),
  },
  // Standalone: its own flag, unlocks nothing else
  "blue-zone-ctf-04": {
    isSolved: (s) => s.ctf04Solved,
    complete: (s, reward) => s.solveCtf04(reward),
  },
};

const FLAG_SHAPE = /^BLUEZONE\{[^{}]+\}$/;

// Case-insensitive, whitespace-insensitive comparison form
export function normalizeFlag(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function isChallengeSolved(id: BlueZoneChallengeId): boolean {
  return PROGRESSION[id].isSolved(useBlueZoneStore.getState());
}

const pending = new Set<BlueZoneChallengeId>();

function result(
  id: BlueZoneChallengeId,
  status: ChallengeSubmissionResult["status"],
  message: string,
  metadata?: ChallengeReward
): ChallengeSubmissionResult {
  const s = useBlueZoneStore.getState();
  return {
    status,
    correct: status === "correct",
    attempts: s.failedAttemptCounts[id] || 0,
    completed: PROGRESSION[id].isSolved(s),
    hintLevel: s.activeHints[id] || 0,
    message,
    metadata: metadata ?? s.challengeRewards[id],
  };
}

export async function submitChallenge(id: BlueZoneChallengeId, rawAnswer: string): Promise<ChallengeSubmissionResult> {
  if (isChallengeSolved(id)) {
    return result(id, "already-completed", "> CHALLENGE ALREADY VERIFIED.");
  }

  const answer = normalizeFlag(rawAnswer);
  // Malformed input is reported but never counted as an attempt
  if (!answer) {
    return result(id, "malformed", "INPUT ERROR: Enter a flag before transmitting.");
  }
  if (!FLAG_SHAPE.test(answer)) {
    return result(id, "malformed", "FORMAT ERROR: Flags use the form BLUEZONE{...}. Nothing was transmitted.");
  }
  if (pending.has(id)) {
    return result(id, "busy", "VERIFICATION IN PROGRESS.");
  }

  pending.add(id);
  try {
    const verdict = await validator.validate(id, answer);
    const store = useBlueZoneStore.getState();
    // Re-check after the await: a concurrent submission may have completed it already
    if (PROGRESSION[id].isSolved(store)) {
      return result(id, "already-completed", "> CHALLENGE ALREADY VERIFIED.");
    }
    if (verdict.correct) {
      PROGRESSION[id].complete(store, verdict.reward);
      return result(id, "correct", verdict.message, verdict.reward);
    }
    store.recordFailedAttempt(id);
    return result(id, "incorrect", verdict.message);
  } catch {
    // A validator failure is not the player's mistake: nothing is counted
    return result(id, "error", "UPLINK ERROR: Verification unavailable. Try again.");
  } finally {
    pending.delete(id);
  }
}

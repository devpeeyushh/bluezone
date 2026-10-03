export type CTFChallengeId = "challenge-1" | "challenge-2" | "challenge-3";

export interface TransmissionFragment {
  packetId: string;
  sanctuaryId: string; // May be "[DATA LOST]"
  callsMade: string | number;
  routeWarnings: string | number;
  dutyRequests: string | number;
  alertResponse: string; // e.g. "POSITIVE", "NEGATIVE", "[UNRECOGNIZED]"
  originSector: string; // e.g. "Community", "Radio", "[MISSING]"
  snippet: string;
  isCorrupted: boolean;
}

export interface FailedTransmissionLog {
  logId: string;
  candidateId: string;
  emergencyCalls: number;
  failedCount: number;
  voiceStressIndex: number;
  nonResponseHours: number;
  originSector: string;
  audioNotePreview: string;
  carrierBandMhz: number;
}

export interface NetworkNodeMetric {
  sanctuaryId: string;
  centralityScore: number;
  contactChains: number;
  collaborationScore: number;
  sector: string;
  isRelayCandidate: boolean;
}

export interface CTFChallenge {
  id: CTFChallengeId;
  title: string;
  stationName: string;
  objective: string;
  briefing: string;
  completionFeedback: string;
}

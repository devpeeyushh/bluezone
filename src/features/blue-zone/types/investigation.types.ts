export interface DiscoveredFact {
  id: string;
  category: "COMMUNICATION" | "SIGNAL" | "NETWORK" | "BROADCAST";
  label: string;
  detail: string;
  timestamp: string;
  status: "VERIFIED" | "CORRUPTED" | "UNKNOWN";
}

export type CinematicRevealStage =
  | "idle"
  | "stabilizing"
  | "reconstructing"
  | "revealed"
  | "complete";


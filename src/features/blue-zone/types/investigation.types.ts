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

export interface RadioTranscriptLine {
  timestamp: string;
  sender: string;
  text: string;
  isCorrupted?: boolean;
}

export interface RadioTranscript {
  id: string;
  title: string;
  frequency: string;
  lines: RadioTranscriptLine[];
}

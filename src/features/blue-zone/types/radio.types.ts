export type StationId =
  | "communication-terminal"
  | "voice-archive"
  | "signal-monitor"
  | "network-map"
  | "emergency-broadcast";

export type StationStatus =
  | "AVAILABLE"
  | "PARTIAL DATA"
  | "DEGRADED"
  | "PARTIAL CONNECTION"
  | "LOCKED";

export interface StationConfig {
  id: StationId;
  name: string;
  code: string;
  status: StationStatus;
  description: string;
  position3D: [number, number, number];
  rotation3D: [number, number, number];
  color: string;
}

export type BroadcastTriggerSource = "manual" | "automatic" | "unknown";

export interface RadioCommunicationRecord {
  Sanctuary_ID: string;
  Emergency_Calls_Made: number;
  Duty_Requests_Count: number;
  Checkin_Timestamps: string[];
  Route_Warnings_Received: number;
  Voice_Notes_Count: number;
  Failed_Transmissions_Count: number;
  Last_Response_Timestamp: string;
  Non_Response_Duration_Hours: number | null;
  Contact_Chain_IDs: string[];
  Collaboration_Frequency_Score: number; // 0.0 - 1.0
  Alert_Response_Flag: boolean;
  Broadcast_Trigger_Source: BroadcastTriggerSource;
  Incident_Link_ID: string | null;
  Signal_Origin_Sector: string;
  Voice_Stress_Index: number; // 0.0 - 1.0
  Network_Centrality_Score: number; // 0.0 - 1.0
  // Narrative helper display fields
  Resident_Role?: "Runner" | "Medic" | "Builder" | "Analyst" | "UNKNOWN";
  Status_Flag?: "ACTIVE" | "OFFLINE" | "DEGRADED" | "TRANSMISSION FAILED" | "DATA LOST";
}

export interface VoiceNoteLog {
  id: string;
  sanctuaryId: string;
  timestamp: string;
  durationSeconds: number;
  stressIndex: number;
  originSector: string;
  transcriptPreview: string;
  integrity: "RECOVERED" | "CORRUPTED" | "PARTIAL";
}

export interface SignalPacket {
  freqMhz: number;
  strengthDbm: number;
  sector: string;
  status: "ACTIVE" | "UNVERIFIED" | "INTERFERENCE" | "DEGRADED";
  payloadSnippet: string;
}

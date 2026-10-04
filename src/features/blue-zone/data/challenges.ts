import { TransmissionFragment, FailedTransmissionLog, NetworkNodeMetric, CTFChallenge } from "../types/ctf.types";

export const CHALLENGE_1_META: CTFChallenge = {
  id: "challenge-1",
  title: "COMMUNICATION FRAGMENT RECONSTRUCTION",
  stationName: "COMMUNICATION TERMINAL",
  objective: "Correlate degraded packet headers with route hazard warnings and Community incident records to reconstruct the sender ID and sector.",
  briefing: "Following the citywide alert, multiple transmission packets were captured before the carrier buffer degraded. Packet Beta suffered severe header corruption (SANC-000?, Sector: [MISSING]). Cross-reference the 4 distress calls, 7 route warnings, and trailer parity checksum 0x03 to deduce the sender.",
  completionFeedback: "> COMMUNICATION FRAGMENT RECONSTRUCTED: SANC-0003 [RADIO SECTOR] CONFIRMED. VOICE ARCHIVE BUFFER UNLOCKED.",
};

export const FRAGMENT_EVIDENCE: TransmissionFragment[] = [
  {
    packetId: "PKT-ALPHA-01",
    sanctuaryId: "SANC-0001",
    callsMade: 0,
    routeWarnings: 0,
    dutyRequests: 2,
    alertResponse: "NEGATIVE",
    originSector: "Community",
    snippet: "Routine duty rotation check-in logged. No distress flags registered.",
    isCorrupted: false,
  },
  {
    packetId: "PKT-BETA-02",
    sanctuaryId: "SANC-000?",
    callsMade: 4,
    routeWarnings: 7,
    dutyRequests: 4,
    alertResponse: "[UNRECOGNIZED — POSITIVE]",
    originSector: "[MISSING]",
    snippet: "EMERGENCY: Multiple route hazards across repeater zone... [TRANSMISSION CLIPPED] ...alert beacon auto-tripped from vault conduit... TRAILER: CHK-0x03-RAD...",
    isCorrupted: true,
  },
  {
    packetId: "PKT-GAMMA-03",
    sanctuaryId: "SANC-0004",
    callsMade: 4,
    routeWarnings: 6,
    dutyRequests: 11,
    alertResponse: "NEGATIVE",
    originSector: "Forensics",
    snippet: "Standard shift handover from perimeter observation post. No alert engagement.",
    isCorrupted: false,
  },
  {
    packetId: "PKT-DELTA-04",
    sanctuaryId: "SANC-0005",
    callsMade: 0,
    routeWarnings: 1,
    dutyRequests: 8,
    alertResponse: "NEGATIVE",
    originSector: "Community",
    snippet: "Clinic ward maintenance rotation confirmed. Normal traffic.",
    isCorrupted: false,
  },
];

export const CHALLENGE_2_META: CTFChallenge = {
  id: "challenge-2",
  title: "FAILED TRANSMISSION & STRESS DEMODULATION",
  stationName: "VOICE ARCHIVE & SIGNAL MONITOR",
  objective: "Two-stage investigation: Identify the transmitter with maximal failed handshake drops (5 packets) from voice transcripts, then tune the receiver to its emergency carrier wave (156.30 MHz).",
  briefing: "Voice transcripts reveal that transmitter SANC-0003 suffered 5 consecutive handshake dropouts on the emergency repeater channel after 4 unanswered distress calls. Cross-reference the transcript header to determine the carrier frequency, tune the receiver, and confirm carrier lock.",
  completionFeedback: "> FAILED TRANSMISSION PATTERN CORRELATED: CARRIER WAVE LOCK AT 156.30 MHz CONFIRMED. NETWORK TOPOLOGY UNLOCKED.",
};

export const FAILED_TRANSMISSION_EVIDENCE: FailedTransmissionLog[] = [
  {
    logId: "FAIL-LOG-01",
    candidateId: "SANC-0010",
    emergencyCalls: 1,
    failedCount: 2,
    voiceStressIndex: 0.55,
    nonResponseHours: 26.8,
    originSector: "Forensics",
    audioNotePreview: "...auditing vault peripheral lines... logging 2 failed packets...",
    carrierBandMhz: 142.85,
  },
  {
    logId: "FAIL-LOG-02",
    candidateId: "SANC-0003",
    emergencyCalls: 4,
    failedCount: 5,
    voiceStressIndex: 0.65,
    nonResponseHours: 24.1,
    originSector: "Radio",
    audioNotePreview: "...repeat: 7 route hazards... emergency repeater VHF CH-02 (156.30 MHz) clipping... 5 failed handshakes...",
    carrierBandMhz: 156.30,
  },
  {
    logId: "FAIL-LOG-03",
    candidateId: "SANC-0012",
    emergencyCalls: 1,
    failedCount: 4,
    voiceStressIndex: 0.88,
    nonResponseHours: 25.2,
    originSector: "Community",
    audioNotePreview: "...clinic lines dropped... attempting manual relay through common hall...",
    carrierBandMhz: 168.95,
  },
];

export const CHALLENGE_3_META: CTFChallenge = {
  id: "challenge-3",
  title: "COMMUNICATION NETWORK RECONSTRUCTION",
  stationName: "NETWORK MAP",
  objective: "Identify the primary Radio communication nexus (Centrality = 1.0) and route through the Forensics border gateway (Centrality = 0.94) to complete the cross-sector circuit.",
  briefing: "Analysis of the 120-resident communication topology indicates that citywide emergency signals cannot bypass the central Radio Nexus node (Centrality 1.0, 11 contact chains). To complete the inter-sector circuit, route from this nexus to the Forensics border gateway.",
  completionFeedback: "> NETWORK ROUTE RECONSTRUCTED: SANC-0002 NEXUS LINKED TO FORENSICS GATEWAY SANC-0034. EMERGENCY BROADCAST CONSOLE UNLOCKED.",
};

export const NETWORK_CANDIDATE_NODES: NetworkNodeMetric[] = [
  {
    sanctuaryId: "SANC-0002",
    centralityScore: 1.0,
    contactChains: 11,
    collaborationScore: 1.0,
    sector: "Radio",
    isRelayCandidate: true, // Absolute Primary Radio Nexus
  },
  {
    sanctuaryId: "SANC-0067",
    centralityScore: 0.95,
    contactChains: 10,
    collaborationScore: 1.0,
    sector: "Community",
    isRelayCandidate: false,
  },
  {
    sanctuaryId: "SANC-0034",
    centralityScore: 0.94,
    contactChains: 11,
    collaborationScore: 0.87,
    sector: "Forensics",
    isRelayCandidate: true, // Forensics Border Gateway
  },
  {
    sanctuaryId: "SANC-0015",
    // Values match radioGroundTruth.json (previously displayed as Research / 0.62 / 6 / 0.55)
    centralityScore: 0.3,
    contactChains: 0,
    collaborationScore: 0.59,
    sector: "Radio",
    isRelayCandidate: false,
  },
];

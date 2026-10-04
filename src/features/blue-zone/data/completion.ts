import { BlueZoneCompletionPayload } from "../types/integration.types";

// Sent through onComplete when the Emergency Broadcast reveal finishes.
// Completion is only reachable after all three canonical answers are verified, so these values are fixed.
// Sanctuary_ID / sector values match radioGroundTruth.json; the log ID and carrier band are in-game evidence.
export const BLUE_ZONE_COMPLETION: BlueZoneCompletionPayload = {
  event: "BLUE_ZONE_COMPLETE",
  zone: "blue-zone",
  nextSector: "FORENSICS",
  broadcast: {
    source: "AUTOMATIC SYSTEM",
    trigger: "UNAUTHORIZED ACCESS",
    origin: "FORENSICS EVIDENCE VAULT",
  },
  evidence: {
    transmitter: { sanctuaryId: "SANC-0003", sector: "Radio" },
    failedTransmission: { logId: "FAIL-LOG-02", carrierMhz: 156.3 },
    networkRoute: { radioNexusId: "SANC-0002", forensicsGatewayId: "SANC-0034" },
  },
};

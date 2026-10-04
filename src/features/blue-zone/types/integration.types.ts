// Blue Zone integration contract: what the parent application receives when the zone completes.
// Blue Zone-specific on purpose — no shared/global model is modified.

export interface BlueZoneCompletionPayload {
  readonly event: "BLUE_ZONE_COMPLETE";
  readonly zone: "blue-zone";
  readonly nextSector: "FORENSICS";
  // Final reveal shown on the Emergency Broadcast Relay
  readonly broadcast: {
    readonly source: "AUTOMATIC SYSTEM";
    readonly trigger: "UNAUTHORIZED ACCESS";
    readonly origin: "FORENSICS EVIDENCE VAULT";
  };
  // Evidence the player verified in this zone (as shown on the Investigation Board)
  readonly evidence: {
    readonly transmitter: { readonly sanctuaryId: "SANC-0003"; readonly sector: "Radio" };
    readonly failedTransmission: { readonly logId: "FAIL-LOG-02"; readonly carrierMhz: 156.3 };
    readonly networkRoute: { readonly radioNexusId: "SANC-0002"; readonly forensicsGatewayId: "SANC-0034" };
  };
}

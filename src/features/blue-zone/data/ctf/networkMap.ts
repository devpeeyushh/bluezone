// CTF 02 — COMPROMISED NODE (Network Map) evidence. Relay nodes share their registry numbers with
// the survivor archive from CTF 01. Packets are public puzzle material: one carries the encrypted
// communication, two are decoys that decode to harmless traffic. No key and no flag are stored here.

export type RelayNodeStatus = "OFFLINE" | "DEGRADED" | "INTERMITTENT";

export interface RelayPacket {
  frame: string; // how the payload is wrapped (described, not named)
  cipher: string;
  key: string;
  payload: string;
}

export interface RelayNode {
  id: string; // "NODE-17"
  registry: string; // matches the survivor archive (RLY-17)
  alias: string;
  location: string;
  status: RelayNodeStatus;
  lastHeartbeat: string;
  x: number; // schematic position, 0–100
  y: number;
  packet?: RelayPacket;
  note?: string;
}

export const RELAY_NODES: RelayNode[] = [
  {
    id: "NODE-01",
    registry: "RLY-01",
    alias: "HILLTOP",
    location: "North ridge",
    status: "OFFLINE",
    lastHeartbeat: "DAY 214 21:40:02",
    x: 50,
    y: 11,
    note: "No carrier since the grid failure. Buffer empty.",
  },
  {
    id: "NODE-04",
    registry: "RLY-04",
    alias: "RAIL BRIDGE",
    location: "West bank",
    status: "OFFLINE",
    lastHeartbeat: "DAY 214 21:40:01",
    x: 30,
    y: 38,
    note: "Last frame before shutdown: HB-04 // MAINS LOST // 21:40:01",
  },
  {
    id: "NODE-07",
    registry: "RLY-07",
    alias: "CLINIC ROOF",
    location: "Clinic district",
    status: "DEGRADED",
    lastHeartbeat: "DAY 215 05:58:40",
    x: 18,
    y: 74,
    packet: {
      frame: "ARMOURED TEXT",
      cipher: "NONE DECLARED",
      key: "N/A",
      payload: "R0VORVJBVE9SIEFUIDQwIFBFUkNFTlQuIFdBUkQgMyBPTiBCQVRURVJZLiBOTyBJTkJPVU5EIFRSQUZGSUMgU0lOQ0UgREFZIDIxNC4=",
    },
  },
  {
    id: "NODE-12",
    registry: "RLY-12",
    alias: "WATER TANK // WEST",
    location: "West bank",
    status: "INTERMITTENT",
    lastHeartbeat: "DAY 215 04:12:09",
    x: 39,
    y: 60,
    packet: {
      frame: "RAW BYTES",
      cipher: "MUNICIPAL TEST ROTATION",
      key: "FIXED (MUNICIPAL)",
      payload:
        "54 42 55 50 4A 50 57 48 53 20 41 4C 5A 41 20 57 48 41 41 4C 59 55 20 41 44 4C 53 43 4C 2E 20 4A 48 59 59 50 4C 59 20 55 56 54 50 55 48 53 2E 20 55 56 41 4F 50 55 4E 20 41 56 20 59 4C 57 56 59 41 2E",
    },
  },
  {
    id: "NODE-17",
    registry: "RLY-17",
    alias: "▒▒▒▒▒▒▒▒ (OPERATOR-ASSIGNED)",
    location: "East bank",
    status: "INTERMITTENT",
    lastHeartbeat: "DAY 215 02:47:31",
    x: 63,
    y: 57,
    packet: {
      frame: "ARMOURED TEXT",
      cipher: "KEYED POLYALPHABETIC. Letters A–Z only; every other character passes through unchanged",
      key: "NOT TRANSMITTED. Shared out of band by the operator",
      payload:
        "RUhBUyBLVCBBWUogT1VYVlJZT0MgRFRORVAgQ05TRVBOTkdLLiBLTUUgTVdBSERTTFkgV0xEIE5UIExYRldNLiBFU0UgV1hQUkRTIE9URCBTSFggV0ZJVyAtIEVISlIgQVZXRSBFQ0lVSUlVLiBTRUlGUyBYVFJULTAwMDIgWFRUV0wgV0hZS0pTIEVaIEdGTUlORlkgRExOSC0wMDM0LiBGQyBDRlNFIFdPTEwgVlpJRSBFU0UgS1RNQ0pEIFNMTklMTFJQRSBOU0FTR0lDLiBIT1lRSVdGIFZGWlRQOiBNTFpYREZTRXtEVExKR1hfSUpMTEp9",
    },
  },
  {
    id: "NODE-21",
    registry: "RLY-21",
    alias: "FERRY PIER",
    location: "East bank",
    status: "OFFLINE",
    lastHeartbeat: "DAY 214 21:52:44",
    x: 80,
    y: 82,
    note: "Harbour mast dropped twelve minutes after the grid. Buffer empty.",
  },
];

// Mesh links drawn on the schematic (registry ids). "broken" links are drawn dashed.
export const RELAY_LINKS: { a: string; b: string; broken?: boolean }[] = [
  { a: "NODE-01", b: "NODE-04", broken: true },
  { a: "NODE-01", b: "NODE-17", broken: true },
  { a: "NODE-04", b: "NODE-12", broken: true },
  { a: "NODE-04", b: "NODE-07", broken: true },
  { a: "NODE-07", b: "NODE-12" },
  { a: "NODE-12", b: "NODE-17" },
  { a: "NODE-17", b: "NODE-21", broken: true },
];

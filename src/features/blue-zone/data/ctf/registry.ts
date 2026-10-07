import { BlueZoneChallengeId, ChallengeDefinition } from "../../types/challenge.types";

// Public challenge definitions — presentation-safe metadata only. Answers never live here: the local
// validator holds one-way checks, and a backend can replace it without touching this file or the UI.

export const CTF_01: BlueZoneChallengeId = "blue-zone-ctf-01";
export const CTF_02: BlueZoneChallengeId = "blue-zone-ctf-02";
// Standalone: not part of the CTF 01 → CTF 02 chain and not required by any other station
export const CTF_03: BlueZoneChallengeId = "blue-zone-ctf-03";
// Standalone puzzle hosted by the Signal Monitor (station keeps its existing unlock rule)
export const CTF_04: BlueZoneChallengeId = "blue-zone-ctf-04";

export const CHALLENGES: Record<BlueZoneChallengeId, ChallengeDefinition> = {
  "blue-zone-ctf-01": {
    id: "blue-zone-ctf-01",
    systemId: "communication-terminal",
    label: "CTF 01",
    title: "INTERCEPTED MESSAGE",
    category: "FORENSICS // OSINT",
    flagFormat: "BLUEZONE{WORD-NN}",
  },
  "blue-zone-ctf-02": {
    id: "blue-zone-ctf-02",
    systemId: "network-map",
    label: "CTF 02",
    title: "COMPROMISED NODE",
    category: "CRYPTOGRAPHY // OSINT",
    flagFormat: "BLUEZONE{...}",
  },
  "blue-zone-ctf-03": {
    id: "blue-zone-ctf-03",
    systemId: "voice-archive",
    label: "CTF 03",
    title: "RECOVERED TRANSMISSION",
    category: "AUDIO FORENSICS",
    flagFormat: "BLUEZONE{...}",
  },
  "blue-zone-ctf-04": {
    id: "blue-zone-ctf-04",
    systemId: "signal-monitor",
    label: "CTF 04",
    title: "INTERCEPTED CARRIER",
    category: "SIGNAL FORENSICS // GEOINT",
    flagFormat: "BLUEZONE{PLACE_NAME}",
  },
};

// Restrained feedback for a well-formed but wrong flag (never reveals which part is wrong)
export const INCORRECT_FEEDBACK: Record<BlueZoneChallengeId, string> = {
  "blue-zone-ctf-01":
    "ROUTE REJECTED: No relay answers to that node ID. Re-check which night, which tower and which registry entry the evidence agrees on.",
  "blue-zone-ctf-02":
    "DECRYPTION MISMATCH: The node does not acknowledge that confirmation string. Verify the node, the layer order and the key.",
  "blue-zone-ctf-03":
    "ARCHIVE REJECTED: That keyword does not unlock VA-07. Re-check what the recording points to and how those records were indexed.",
  "blue-zone-ctf-04":
    "TARGET REJECTED: The relay does not confirm that destination. Re-check which intercept was answered and where its recovered navigation data points.",
};

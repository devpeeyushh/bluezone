import { RadioTranscript } from "../types/investigation.types";

export const RADIO_TRANSCRIPTS: Record<string, RadioTranscript> = {
  "FAIL-LOG-02": {
    id: "FAIL-LOG-02",
    title: "EMERGENCY REPEATER // BUFFER DUMP #7702",
    frequency: "156.30 MHz (VHF EMERGENCY)",
    lines: [
      {
        timestamp: "19:42:04",
        sender: "SANC-0003",
        text: "...repeat... Sector 3 repeater is clipping... 7 route hazards on perimeter conduit...",
      },
      {
        timestamp: "19:42:12",
        sender: "[DATA LOSS]",
        text: "[STATIC SQUELCH] ...handshake rejected... carrier drop...",
        isCorrupted: true,
      },
      {
        timestamp: "19:42:19",
        sender: "SANC-0003",
        text: "...alert beacon was NOT sent from dispatch! Repeat: dispatch did not issue this... it auto-tripped from the vault line...",
      },
      {
        timestamp: "19:42:28",
        sender: "[SIGNAL SILENCE]",
        text: "[TRANSMISSION TERMINATED // 5 CONSECUTIVE HANDSHAKE DROPS // 24.1H NON-RESPONSE]",
        isCorrupted: true,
      },
    ],
  },
  "FAIL-LOG-01": {
    id: "FAIL-LOG-01",
    title: "FORENSICS PERIMETER TELEMETRY #7701",
    frequency: "142.85 MHz (INTERNAL)",
    lines: [
      {
        timestamp: "19:38:11",
        sender: "SANC-0010",
        text: "...auditing vault peripheral lines... telemetry fluctuates near evidence containment...",
      },
      {
        timestamp: "19:38:45",
        sender: "SANC-0010",
        text: "...handshake acknowledged... logging 2 failed packets... routing nominal...",
      },
    ],
  },
  "FAIL-LOG-03": {
    id: "FAIL-LOG-03",
    title: "COMMUNITY CLINIC DISPATCH #7703",
    frequency: "168.95 MHz (AUXILIARY)",
    lines: [
      {
        timestamp: "19:40:02",
        sender: "SANC-0012",
        text: "...clinic lines dropped... attempting manual relay through common hall...",
      },
      {
        timestamp: "19:40:30",
        sender: "[CARRIER DRIFT]",
        text: "...4 failed transmissions logged... noise floor rising...",
        isCorrupted: true,
      },
    ],
  },
};

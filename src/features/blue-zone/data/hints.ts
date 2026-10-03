// Modular Hint System for Blue Zone CTF Investigation
// Supports "manual" requests or configurable "after-failed-attempts"

export interface ChallengeHint {
  level: number;
  title: string;
  clue: string;
}

export const HINTS_DATABASE: Record<string, ChallengeHint[]> = {
  "challenge-1": [
    {
      level: 1,
      title: "PACKET CORRELATION",
      clue: "One of the recovered transmission fragments suffered corruption. Look at the calls made (4) and route hazard warnings (7) on Packet Beta, then cross-reference the checksum trailer CHK-0x03-RAD.",
    },
    {
      level: 2,
      title: "SECTOR ROUTING",
      clue: "The trailer tag 'RAD' denotes the resident was stationed in the Radio Communication Sector. Combine this with the 0x03 checksum suffix to recover the full Sanctuary ID format SANC-000X.",
    },
  ],
  "challenge-2": [
    {
      level: 1,
      title: "HANDSHAKE BURST ISOLATION",
      clue: "Examine the failed transmission logs in Station 02. Look for the transmitter that experienced 5 failed handshake drops and has been non-responsive for over 24 hours.",
    },
    {
      level: 2,
      title: "CARRIER HARMONIC TUNING",
      clue: "The intercepted audio transcript reveals that FAIL-LOG-02 was broadcasting across the VHF Emergency repeater band at approximately 156.30 MHz. Set the receiver frequency in Station 03 to this carrier.",
    },
  ],
  "challenge-3": [
    {
      level: 1,
      title: "NETWORK CENTRALITY AUDIT",
      clue: "Review the coordination mesh metrics. The primary Radio sector nexus node exhibits the maximum centrality score of 1.00 with 11 contact chains.",
    },
    {
      level: 2,
      title: "CROSS-SECTOR BORDER ROUTING",
      clue: "To complete the circuit to the adjacent Forensics sector, the Radio Nexus (SANC-0002) must link through the Forensics border gateway node (SANC-0034, centrality 0.94).",
    },
  ],
};

// Modular Hint System for Blue Zone CTF Investigation
// Supports "manual" requests or configurable "after-failed-attempts"

export interface ChallengeHint {
  level: number;
  title: string;
  clue: string;
}

export const HINTS_DATABASE: Record<string, ChallengeHint[]> = {
  // Phase 18 flag CTFs. Tier 1 points at the evidence, tier 2 narrows the extraction method.
  "blue-zone-ctf-01": [
    {
      level: 1,
      title: "READ IT IN ORDER",
      clue: "Sort the TRANSMISSION fragments by their sequence numbers before reading them. Put back together, the operator says the node is a word plus a number, and says where each half is kept. The broken signature points to the PROFILE. The incident log in the ARCHIVE tells you which night matters.",
    },
    {
      level: 2,
      title: "WORD + REGISTRY NUMBER",
      clue: "Both tower photos from the night of the grid failure carry the same tag, and that tag is the word. The number is the relay registry number of the operator's own tower. The carrier header keeps its first digit. Compare each photo's beacon colour and water-tank shape against the ARCHIVE, and remember which mast the transmission rules out. Submit as BLUEZONE{WORD-NN}.",
    },
  ],
  "blue-zone-ctf-02": [
    {
      level: 1,
      title: "FOLLOW THE SOURCE",
      clue: "Only one node on the map has the registry number of the source restored at Terminal 01. Its packet is wrapped in a transport encoding that has to come off first. The fragment recovered at Terminal 01 is lightly scrambled as well. Read it before going after the key.",
    },
    {
      level: 2,
      title: "ROTATION, THEN POLYALPHABETIC",
      clue: "The recovered fragment is a ROT13 rotation. Once it reads normally, it tells you how to build the key from the operator handle you found in CTF 01 (letters only). The node's own cipher is a keyed Vigenère. In the workbench, remove the encoding first, then run VIGENÈRE DECODE with that key.",
    },
  ],
  // Standalone audio CTF. Tiers 1–2 cover the recording; tier 3 is an optional, non-spoiling nudge
  // for the second stage.
  "blue-zone-ctf-03": [
    {
      level: 1,
      title: "MORE THAN A VOICE",
      clue: "The recording is carrying more than a voice. Listen for a repeating signal pattern.",
    },
    {
      level: 2,
      title: "TONES AND GAPS",
      clue: "Short and long tones are separated by deliberate gaps. Treat them as dots, dashes, and letter boundaries.",
    },
    {
      level: 3,
      title: "FOLLOW THE LOCATION",
      clue: "The message identifies a location. Search the archive for records belonging to that location.",
    },
  ],
  // Standalone Signal Monitor CTF. Two tiers; neither gives the reference, the coordinates or the destination.
  "blue-zone-ctf-04": [
    {
      level: 1,
      title: "THE ONE THAT WAS ANSWERED",
      clue: "The accepted transmission matters more than the signals that merely look recovered. Several intercepts carry the same kind of keyed signal, but only one command was accepted, and the transmission log tells you which. In that recording, listen for the repeated bursts where two tones sound at once.",
    },
    {
      level: 2,
      title: "KEYPAD SIGNALLING",
      clue: "Each burst is two simultaneous frequencies, the scheme telephone keypads use to send digits. Any keypad-tone decoder will turn the bursts into a number. The relay filed its event under that reference: look it up in EVIDENCE, then work out where the recovered data points. The place itself is the answer.",
    },
  ],
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

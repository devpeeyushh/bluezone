// CTF 03 — RECOVERED TRANSMISSION (Voice Archive) evidence. Standalone: nothing here refers to
// CTF 01 / CTF 02. All fictional in-game material.
//
// The recording's message exists only as Morse in the audio file; there is no transcript of it in
// the client. The second-stage answer is never stored: it has to be read out of the channel buffer
// using the day numbers of one tower's log. The flag itself is held by services/localChallengeValidator.

// Supplied evidence audio, served as an emitted static asset (resolved on the client only).
export const recordingUrl = (): string => new URL("../../assets/audio/va-07.wav", import.meta.url).href;

export const RECORDING = {
  id: "VA-07",
  status: "DAMAGED // PARTIALLY RECOVERED",
  date: "DAY 219",
  location: "UNKNOWN",
  durationLabel: "00:27",
  format: "PCM WAV // MONO // 48 kHz // 16-BIT",
  analysis: "Keyed tone bursts detected under the static: a single carrier near 700 Hz, switched on and off.",
};

// Precomputed RMS envelope of the recording (700 bins of ~39 ms, 0–255, base64). Static, so the
// waveform costs one SVG path and no live audio analysis. It mirrors the audio for players who
// can't hear it.
export const RECORDING_ENVELOPE =
  "//////9aAAAAAAAAALH/e0H/zQDN/0J6/7EAAAAAAAAAW//CAAAAAAAAAAAAAAAAAAAAAAAAAOzsAKn/////0gDG/1Ru/7kAAAAAAAAATf/JANH/////rAAAAAAAAABj/78A2vwAj/+gAAAAAAAAAHf/////8wAAAAAAAAAAAAAAAAAAAAAAAAC5/2xU/8UA1P8hAAAAAAAAAMX/V2z/ugAAAAAAAABF//////82fP/////vAKL/jQAAAAAAAACO/////+cAr/98AAAAAAAAAJv/lQD4/////2kAAAAAAAAAqP+FIv//////VG3/uQDf+AAAAAAAAAAAAAAAAAAAAAAAAACz/////8oAzv87fP/////vAKL/jQAAAAAAAACO/6IA8P////98AAAAAAAAAJv/////3QC6/////8MAAAAAAAAAIv/UAAAAAAAAAAAAAAAAAAAAAAAAANz6AJL/nQDz/////3VF/8sAAAAAAAAAAPzaAL//////wADZ/QAAAAAAAAAAyf////+0AOL/////kwD4/////2kAAAAAAAAAqP/////UAMb/////uAAAAAAAAAAAAAAAAAAAAAAAAADz/////3UAAAAAAAAAoP+PAPzaAL//Y2H/wAAAAAAAAAAy/9EAAAAAAAAAAAAAAAAAAAAAAAAA3/////+XAPbhAAAAAAAAAADp/////4kA//////9aZ//////5AAAAAAAAAADN/0J6//////EAoP+PAAAAAAAAAIr/////6AAAAAAAAAAA4fYAmf+XAPffALn/bgAAAAAAAAAAAAAAAAAAAAAAAIH/////7gAAAAAAAAAA2v////+fAPH/////eEH//////z4AAAAAAAAAvP9nW//////+AIr/////6AAAAAAAAAAA4fYAAAAAAAAAANH/MIH/////7QCl/w==";

export interface TranscriptLine {
  kind: "voice" | "noise";
  text: string;
}

// Voice layer only: the keyed tones are not transcribed
export const VOICE_TRANSCRIPT: TranscriptLine[] = [
  { kind: "noise", text: "[STATIC]" },
  { kind: "voice", text: "…repeat… signal integrity unstable…" },
  { kind: "voice", text: "…if anyone receives this…" },
  { kind: "noise", text: "[HEAVY INTERFERENCE]" },
  { kind: "voice", text: "…tower…" },
  { kind: "noise", text: "[DATA LOST]" },
];

export interface TowerLogEntry {
  day: number;
  event: string;
  tech: string;
}

export interface TowerRecord {
  name: string;
  registry: string;
  status: "PARTIAL" | "ONLINE" | "OFFLINE";
  lastMaintenance: string;
  technician: string;
  note: string;
  log: TowerLogEntry[];
}

export const TOWER_RECORDS: TowerRecord[] = [
  {
    name: "NORTH TOWER",
    registry: "NT-04",
    status: "PARTIAL",
    lastMaintenance: "DAY 211",
    technician: "R. VALE",
    note: "Carrier still keyed intermittently after the lock. Source of automated traffic unconfirmed.",
    log: [
      { day: 203, event: "SYSTEM CHECK", tech: "R. VALE" },
      { day: 205, event: "BEACON TEST", tech: "R. VALE" },
      { day: 208, event: "SIGNAL DRIFT", tech: "R. VALE" },
      { day: 210, event: "POWER CYCLE", tech: "R. VALE" },
      { day: 211, event: "SCHEDULED MAINTENANCE", tech: "R. VALE" },
      { day: 213, event: "UNAUTHORIZED ACCESS", tech: "UNKNOWN" },
      { day: 215, event: "CHANNEL RESET", tech: "UNKNOWN" },
      { day: 217, event: "MANUAL OVERRIDE", tech: "UNKNOWN" },
      { day: 218, event: "SYSTEM LOCK", tech: "UNKNOWN" },
      { day: 219, event: "OUTBOUND TRANSMISSION", tech: "AUTOMATED" },
    ],
  },
  {
    name: "EAST TOWER",
    registry: "ET-09",
    status: "ONLINE",
    lastMaintenance: "DAY 216",
    technician: "M. CROSS",
    note: "Nominal. Carries routine relay traffic only.",
    log: [
      { day: 202, event: "FIRMWARE PATCH", tech: "M. CROSS" },
      { day: 209, event: "ANTENNA ALIGNMENT", tech: "M. CROSS" },
      { day: 216, event: "LOAD TEST", tech: "M. CROSS" },
    ],
  },
  {
    name: "WEST TOWER",
    registry: "WT-12",
    status: "OFFLINE",
    lastMaintenance: "DAY 207",
    technician: "J. HALE",
    note: "Storm damage to the feed line. Decommissioning pending.",
    log: [
      { day: 201, event: "FEED LINE FAULT", tech: "J. HALE" },
      { day: 207, event: "SHUTDOWN", tech: "J. HALE" },
    ],
  },
  {
    name: "SOUTH TOWER",
    registry: "ST-03",
    status: "OFFLINE",
    lastMaintenance: "DAY 214",
    technician: "A. REED",
    note: "Generator failure. Repeated restart attempts logged.",
    log: [
      { day: 204, event: "GENERATOR FAULT", tech: "A. REED" },
      { day: 206, event: "RESTART ATTEMPT", tech: "A. REED" },
      { day: 212, event: "RESTART ATTEMPT", tech: "A. REED" },
      { day: 214, event: "FUEL DELIVERY", tech: "A. REED" },
      { day: 220, event: "STANDBY", tech: "A. REED" },
    ],
  },
];

export const OPERATOR_NOTE =
  "Recovered operator notes indicate the tower logs were indexed by day. Only the entries of the tower the recording names should be considered, in the order they were logged.";

// VA-07 channel buffer: the archive latched one character per day while the recording was held.
// Read by day number; it is not meant to be read straight through.
export const CHANNEL_BUFFER: { day: number; char: string }[] = [
  { day: 201, char: "E" },
  { day: 202, char: "S" },
  { day: 203, char: "N" },
  { day: 204, char: "C" },
  { day: 205, char: "O" },
  { day: 206, char: "A" },
  { day: 207, char: "W" },
  { day: 208, char: "R" },
  { day: 209, char: "E" },
  { day: 210, char: "T" },
  { day: 211, char: "H" },
  { day: 212, char: "M" },
  { day: 213, char: "L" },
  { day: 214, char: "D" },
  { day: 215, char: "I" },
  { day: 216, char: "B" },
  { day: 217, char: "G" },
  { day: 218, char: "H" },
  { day: 219, char: "T" },
  { day: 220, char: "V" },
];

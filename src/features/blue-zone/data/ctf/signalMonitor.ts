// CTF 04 — INTERCEPTED CARRIER (Signal Monitor) evidence. Standalone: nothing here refers to other
// stations' puzzles. All fictional in-game material.
//
// Every intercept is a keyed recording; which one matters is established by the transmission log,
// not by the files. The keyed digits are never written in the client: archive-index records are
// stored sealed (looked up by a salted hash of the reference, opened with a key derived from it),
// and so is the navigation data the accepted command recovers. The flag itself is held by
// services/localChallengeValidator.

// Supplied evidence audio (unchanged files, emitted as static assets; resolved on the client only)
const urls: Record<string, () => string> = {
  "SIG-01": () => new URL("../../assets/audio/signals/intercept-01.wav", import.meta.url).href,
  "SIG-02": () => new URL("../../assets/audio/signals/intercept-02.wav", import.meta.url).href,
  "SIG-03": () => new URL("../../assets/audio/signals/intercept-03.wav", import.meta.url).href,
  "SIG-04": () => new URL("../../assets/audio/signals/intercept-04.wav", import.meta.url).href,
  "SIG-05": () => new URL("../../assets/audio/signals/intercept-05.wav", import.meta.url).href,
};
export const signalUrl = (id: string): string => urls[id]();

export interface InterceptedSignal {
  id: string;
  carrier: string;
  status: "PARTIAL" | "DAMAGED" | "RECOVERED" | "CORRUPTED";
  source: string;
  captured: string;
  duration: string;
  envelope: string; // precomputed RMS envelope (240 bins, 0–255, base64)
  analysis: {
    bursts: number;
    burstMs: string;
    spacingMs: string;
  };
}

// Measured from the supplied files: 1.38 s, 6 keyed bursts each, ~180 ms tones, ~45 ms gaps
const KEYED = { bursts: 6, burstMs: "≈180 ms", spacingMs: "≈45 ms" };

export const SIGNALS: InterceptedSignal[] = [
  {
    id: "SIG-01",
    carrier: "142.85 MHz",
    status: "PARTIAL",
    source: "FIELD RELAY",
    captured: "DAY 214 21:52:10",
    duration: "00:01.4",
    analysis: KEYED,
    envelope:
      "8/Hv7u7v7+7t7e7v7+7u7/Hz8/Hv7u7u7+7t7e7v1SgAAAAAAAAAAPXw7PD06Pjk9+f64v/c/uL74v3d/uP56fTm9ury89YyAAAAAAAAAAD74+377+Lv++7i8/vp5vn14+z78OLv++7i8vvq5fjkNAAAAAAAAAAA5+P38+P38+T38uT38uT38uT38uX38eX38eX38eb36VAAAAAAAAAAALnu7/Dx8fHx8O/u7u7u7u7u7u/w8fHx8fDv7u7u7upnAAAAAAAAAADB8uzz6/Tq9On06vTq8+vy7fHv7/Du8uzz6/Tq9On0cwAAAAAAAAAA",
  },
  {
    id: "SIG-02",
    carrier: "156.30 MHz",
    status: "DAMAGED",
    source: "UNKNOWN",
    captured: "DAY 214 22:41:18",
    duration: "00:01.4",
    analysis: KEYED,
    envelope:
      "9PP28ffv+O757vnu+e747/fx9vP09PL28Pfv+e760SkAAAAAAAAAAP/08/Pz8vLx8vL09fb29vX19PTz8/Lx8fHy9PX29uAuAAAAAAAAAADw+/fs8v316/T89Ovv+vnt8Pz37PL79uvu+fru7vvpOQAAAAAAAAAA4f308Or7+vLp9P308Or8+fLp9f307+v8+fLo9vz051cAAAAAAAAAAMfu8vrv8vrv8vrv8vrv8vrv8vrv8vrv8vrv8vrv8vZgAAAAAAAAAADC9PP2+fj08vP08/Hx8fHx8vTz8vT4+fbz9Pf49fLxagAAAAAAAAAA",
  },
  {
    id: "SIG-03",
    carrier: "151.40 MHz",
    status: "PARTIAL",
    source: "UNRESOLVED",
    captured: "DAY 214 22:07:29",
    duration: "00:01.4",
    analysis: KEYED,
    envelope:
      "9PDu7/Hw7uzs7Ozs7e3t7vHz8e7v8/Xy7u7v7+3szR4AAAAAAAAAAPXx7u/w7fLr9On16Pbo9uj16fTr8+3w7+7x6/Pp9dY3AAAAAAAAAADt8PHx8fHw8O/v7u3s7O3u7/Dx8vHx8PDv7u3t7OzkSgAAAAAAAAAA5+P28+P38+P38uT38uT38uT38eX38eX38eX38eX36FAAAAAAAAAAAMTi8fvq5fj35Or78eLt++/i8Pvr5Pf45er78uLt++1ZAAAAAAAAAADH5vfm/d7/3vzj/N/+3/zn9uf25vbv7vPp8ev25vzfgwAAAAAAAAAA",
  },
  {
    id: "SIG-04",
    carrier: "168.95 MHz",
    status: "RECOVERED",
    source: "MAINTENANCE DEPOT",
    captured: "DAY 214 21:31:05",
    duration: "00:01.4",
    analysis: KEYED,
    envelope:
      "7vPn8ur15vze/OH64v3c/9/75fji+eT37e7t7e3u1SIAAAAAAAAAAPrm6/T25uvt+O/n6/T25uvu+O7o6vX15uvu+O3p6uIvAAAAAAAAAAD25fXx5fXx5fXx5fXx5PXx5PXx5Pbx5Pbx5Pbx5PbiOwAAAAAAAAAA5ub36PLr7fbk+Obx9eL65vLy5ffn9Ovs8+j45PPx41oAAAAAAAAAALnu7u/w8fHw7+7u7e3t7e3t7e7v8PHx8O/u7u3t7elmAAAAAAAAAAC67/Hy8e/u7u/v7+7t7e3t7e3t7/Hy8e/u7u7v7+7tdAAAAAAAAAAA",
  },
  {
    id: "SIG-05",
    carrier: "143.70 MHz",
    status: "CORRUPTED",
    source: "UNKNOWN",
    captured: "DAY 214 22:15:44",
    duration: "00:01.4",
    analysis: KEYED,
    envelope:
      "6/fh+Oru8ef25/Pq7fbj+Obx9eL55vLx5vbn9enu1CMAAAAAAAAAAPTu8+nu9Onu9Onu9Onu9Oju9Oju9Ojv9Ojv9Ofv9NQ1AAAAAAAAAADu9+7k7fX14+vw9+3l7fX04+zw9+zm7fb04+zx9+reSQAAAAAAAAAA4/Dq7+zy6fng+uH54/zc/9384/ng++D56fLr8Onx6FEAAAAAAAAAAL/z5+r18+jm8vbr6PT16Oj09Onm8Pbt5/L26ufy9eleAAAAAAAAAADH7e3t7e3t7e3u7u/w8PDv7u7t7e3t7e3t7e7v8PDwcAAAAAAAAAAA",
  },
];

export interface LogEntry {
  time: string;
  kind: "INTERCEPT" | "SYSTEM" | "CONTROLLER";
  text: string;
}

// Monitor + relay-controller log, chronological. Carriers and times are the cross-reference.
export const TRANSMISSION_LOG: LogEntry[] = [
  { time: "21:31:05", kind: "INTERCEPT", text: "Keyed intercept on 168.95 MHz. Scheduled pager test from the maintenance depot." },
  { time: "21:31:07", kind: "CONTROLLER", text: "DEPOT PAGER // acknowledged. No relay action. Event filed in the archive index." },
  { time: "21:40:00", kind: "SYSTEM", text: "GRID FAILURE. Mains lost district-wide; relay controllers fall back to battery." },
  { time: "21:40:02", kind: "SYSTEM", text: "Emergency repeater enters lockout. Remote commands to it will be refused." },
  { time: "21:52:10", kind: "INTERCEPT", text: "Keyed intercept on 142.85 MHz from a field relay. Field team dialling the clinic exchange." },
  { time: "21:52:12", kind: "CONTROLLER", text: "CLINIC EXCHANGE // no answer (line unpowered). Event filed in the archive index." },
  { time: "22:07:29", kind: "INTERCEPT", text: "Keyed intercept on 151.40 MHz. Origin could not be resolved." },
  { time: "22:07:31", kind: "CONTROLLER", text: "EAST ARRAY // remote keypad command ACCEPTED on 151.40 MHz. Event filed in the archive index under the reference keyed with the command." },
  { time: "22:15:44", kind: "INTERCEPT", text: "Keyed intercept on 143.70 MHz. Capture damaged on write." },
  { time: "22:15:46", kind: "CONTROLLER", text: "No controller responded. Nothing filed." },
  { time: "22:41:18", kind: "INTERCEPT", text: "Keyed intercept on 156.30 MHz, aimed at the emergency repeater." },
  { time: "22:41:20", kind: "CONTROLLER", text: "EMERGENCY REPEATER // command REJECTED (lockout). Event filed in the archive index." },
];

// Sealed ARCHIVE INDEX (see tools/seal-index-record.mjs). Keys are salted hashes of 6-digit references.
export interface ArchiveRecord {
  type: string;
  status: string;
  source: string;
  filed: string;
  lines: string[];
  // Present only on an executed remote command: the navigation data the relay recovered
  packet?: NavigationPacket;
}

export interface NavigationPacket {
  reference: string;
  lat: string;
  lon: string;
  note: string[];
}

export const ARCHIVE_INDEX: Record<string, string> = {
  "76b0ca5a8e9760d2b6a744645bc26090d6210a0cac78b9d12283e1caeed21e6d":
    "BBfEcQFcspSrpGdKMuiEy/j3HetdrMnxw0jgnffIrEHfQbKFLrM9WPGhDvuPyW7wkRiyWTTl1uCx35DwrQqabVSAW/JAk7uInxZoS9JaGtyeoI0FgKdiRjv+qSVc5vkuSmJMHIDMYl4sG4c8grsQ2AodX7LHv8CdLd70zbwTG5XRWL4LY8RMicjSWl7V5Uea5YmOkbgW7GiT3Tz9og8E3nvYB56x2mCBqlOH31RhK1Pj4eLIpmAg28ehU2DmGdwDYrznDER0PzDPGSGyQ1OkX4Ok2pZdmPcpwIrq9jDBZFhN8YN0uh5CK5nU87tpfm9wMThJk4o4StgCU4A2OzZw/CmFLXqyckdUxd2AfhelDMVuLs77nx1xgxlsztYrJu6kqkiOM9mQd7SDdY+EyNvIcALxZQQKfQApbsS6lGEWjvI1Qb2qEmrxdL4o5akXKR4OtTvUzT5rG3LJ6oBvd41K0wSDFUhqL8EOFdsXLa8Y3+qSrc3Bx67ZenAqQjd3bZeH2wJMS7tmwA==",
  "de473daa544d85d15505c7de656e610d6bbe139b035d8b309762ac9be2b06489":
    "CuQxw7N+SMUm+f0V4MQE38OepZEC2Vt9lxXe8VViHsElnQfrlddWPHvZV65nyhcO6n8mYyDumJi80Hr8wm+702KoHOhcc79iRgzuPxqaV1L78kVxWCXXOzTSQZ7lyxPGDiVI2Z8gitDeD1DFswWlXzrdhVdIRKiBxAKrIH02niBHGEVj00idpEypVvQmsGfyWGNipCRgHleZFJoVTFCNrjjcbZ8d2qeOGe/U+RLYU4G/9tIAKndgN+XVgSANAW/jTeZL+iZZQdJwPN6BEs0RAWgaSYPLHn2AOXQQO3EmHn87steqwg==",
  "357ae5bd929b5fcaa49cb851f6047346f98772cb53d92a2f453b9db5cd9dd1d1":
    "M0/fOs2Vo0f8g3MgvPvIFEAWEAEvKnIUUH6wVTHEqzjiD1y2vGdCCIsT4mDg0y2jNT399mEHCrW8d+PQDrXxY6II+hbU0FnGy6Wtqd9Pt0uEKnTJD6Eytgh6gBiedGTQO1SX6DR89i7EsXHDNPnKpsstwS3q35/jYGYG2CWD2Pe4RGtNP9wNklNSADB+3/9lpMRZehFhCSQNWSQDGmqlwSOE/LmDArY8yyFCN543TZEdmpsx3O8N7aBSYb1Ezj3MvkW5wQD4uT7a6Qi1UhBkxXhrFbvLdnj2igFk/nmkAZB3gXfJtlN5gW7uqVjE",
  "6bd923c4cd718f3f3e4ddffc4532952b3e34c3c157d075ac0f0ccbdc7e902199":
    "5WBH110p+0ylvRFmzI5LCYyOBXly3R3W57itf4afL1DaXgLVGJ6v+cpFgacpQbIP2SbCbUmXdomj4wigz1qftDMSfF4dCXaNN9sZu1Z9aemAt3LqXJMGazWU7jrHyWO5jHZz+JcIolYeMrPBJah+HV6M6VfRcHETmdl6xMTODWzS5FdZEhxnftQUTN+b7C3Jf1cYTvC9Tg7g1SWiYwCk7yN75ZFYWKcEO4QrHj9jhImm6E60avHvcYwb+tNyrRH/qB9cqy5R6hikQYRRDaHhHrygtGhzbskq5LpHBLzXqSDttVwltCwTDUB3oiCW2Lwzs9FihwHQlF1TOQ==",
};

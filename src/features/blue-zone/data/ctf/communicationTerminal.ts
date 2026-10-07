// CTF 01 — INTERCEPTED MESSAGE (Communication Terminal) evidence.
// Everything here is fictional in-game material: the profile, archive and handles do not exist
// anywhere outside Blue Zone. The evidence holds what a player needs to reason to the answer;
// the flag itself is not stored anywhere in the client (see services/localChallengeValidator).

import type { StaticImageData } from "next/image";
// Photographs carry no registry numbers or labels: the player has to read them
import postA from "../../assets/social/post-0214-2341-a.jpg";
import postB from "../../assets/social/post-0214-2341-b.jpg";

export interface TransmissionFragmentLine {
  seq: number; // 1-based position in the original transmission
  text: string; // "▒" marks damaged characters
}

export const TRANSMISSION_07 = {
  id: "TRANSMISSION_07",
  status: "CORRUPTED",
  source: "UNKNOWN",
  captured: "CYCLE 03 // DAY 215 // 02:47",
  band: "VHF EMERGENCY",
  carrier: "RLY-1▒",
  integrity: "61%",
  total: 5,
  // Display order as buffered (out of sequence)
  fragments: [
    {
      seq: 3,
      text: "the word is the one I tagged on my tower photo, the night every light in the district went out. not the other tower photo. that one doesn't count.",
    },
    {
      seq: 1,
      text: "if anyone is still on this band: this is the night operator. I won't say my name on air. you know where I post.",
    },
    {
      seq: 5,
      text: "relay holds until the batteries go. after that, call the node by name and number, never by frequency. ▒▒ end ▒▒  — ▒ch▒_▒ft▒rf▒ll",
    },
    {
      seq: 2,
      text: "they're scanning the open channels, so the route stays out of the clear. the node carries a word and a number. the word is mine. the number belongs to the tower.",
    },
    {
      seq: 4,
      text: "the survivor archive still lists every mast by registry number. find the one in my photo. it is NOT the mast by the rail br▒dge.",
    },
  ] as TransmissionFragmentLine[],
};

export interface ProfileComment {
  handle: string;
  text: string;
  isAuthor?: boolean;
}

export interface ProfilePost {
  id: string;
  timestamp: string;
  text: string;
  likes: number;
  image?: { src: StaticImageData; file: string; alt: string };
  comments: ProfileComment[];
}

export const ECHO_PROFILE = {
  handle: "echo_afterfall",
  displayName: "echo",
  bio: ["still here.", "notes from the quiet side."],
  quote: "signals fade, but people don't.",
  stats: { posts: 7, followers: 212, following: 31 },
  cacheNote: "SOCIAL CACHE // RECONSTRUCTED MIRROR OF A PLATFORM THAT WENT DARK ON DAY 214",
  // Newest first, as the platform showed them. The two DAY 214 23:41 posts are deliberately
  // identical in text: only the photographs tell them apart (cross-reference with the ARCHIVE).
  posts: [
    {
      id: "p7",
      timestamp: "DAY 216 · 03:12",
      likes: 19,
      text: "if you see a light still blinking on the far bank, don't call it in. let it blink.",
      comments: [{ handle: "dust.ward", text: "you okay? haven't heard you on air since the storm." }],
    },
    {
      id: "p6",
      timestamp: "DAY 214 · 23:41",
      likes: 38,
      image: {
        src: postA,
        file: "IMG_0214_2341_A.RAW",
        alt: "Night photo of a lattice communications tower with a red light at the top. A cylindrical water tank on legs stands in front of it, beside a fenced, lit hut.",
      },
      text: "lights are finally back. #blackout",
      comments: [
        { handle: "riverghost", text: "this place still standing?" },
        { handle: "nomadjay", text: "that red light never stops huh" },
        { handle: "echo_afterfall", isAuthor: true, text: "@nomadjay not tonight." },
      ],
    },
    {
      id: "p5",
      timestamp: "DAY 214 · 23:41",
      likes: 41,
      image: {
        src: postB,
        file: "IMG_0214_2341_B.RAW",
        alt: "Night photo of a lattice communications tower with a bright white light at the top. A spherical water tank on a steel frame stands beside it, behind a fenced gate.",
      },
      text: "lights are finally back. #blackout",
      comments: [
        { handle: "mara.v", text: "stay safe up there" },
        { handle: "dust.ward", text: "wait which one is this" },
        { handle: "kiln.radio", text: "thought that one went dark hours ago" },
      ],
    },
    {
      id: "p4",
      timestamp: "DAY 214 · 18:05",
      likes: 24,
      text: "storm warning on every channel. charging everything I own.",
      comments: [],
    },
    {
      id: "p3",
      timestamp: "DAY 201 · 22:30",
      likes: 17,
      text: "night watch from the rail bridge. that strobe never sleeps. #nightwatch",
      comments: [{ handle: "kiln.radio", text: "that strobe is blinding lol" }],
    },
    {
      id: "p2",
      timestamp: "DAY 188 · 16:47",
      likes: 12,
      text: "new antenna up. nine metres of bad decisions. #rooftop",
      comments: [],
    },
    {
      id: "p1",
      timestamp: "DAY 160 · 09:02",
      likes: 6,
      text: "first post. testing, testing.",
      comments: [],
    },
  ] as ProfilePost[],
};

export interface RelayRegistryEntry {
  registry: string;
  name: string;
  location: string;
  landmark: string;
  beacon: string;
  status: string;
  operator: string;
}

export const SURVIVOR_ARCHIVE = {
  title: "AFTERFALL SURVIVOR ARCHIVE",
  subtitle: "COMMUNITY MIRROR // LAST SYNC DAY 215 06:00",
  registry: [
    {
      registry: "RLY-01",
      name: "HILLTOP BROADCAST TOWER",
      location: "North ridge, above the reservoir",
      landmark: "Reservoir dam",
      beacon: "RED, steady",
      status: "OFFLINE since DAY 214 21:40",
      operator: "Municipal",
    },
    {
      registry: "RLY-04",
      name: "RAIL BRIDGE MAST",
      location: "West bank, beside the rail bridge",
      landmark: "Rail bridge",
      beacon: "WHITE strobe",
      status: "OFFLINE since DAY 214 21:40",
      operator: "Municipal",
    },
    {
      registry: "RLY-07",
      name: "HOSPITAL ROOF REPEATER",
      location: "Clinic district rooftop",
      landmark: "Clinic rooftop",
      beacon: "BLUE, steady",
      status: "DEGRADED (generator power)",
      operator: "Clinic services",
    },
    {
      registry: "RLY-12",
      name: "WATER TANK ARRAY // WEST",
      location: "West bank, in front of the water tank, facing the rail bridge",
      landmark: "SPHERICAL water tank on a steel frame",
      beacon: "WHITE strobe",
      status: "INTERMITTENT",
      operator: "Municipal",
    },
    {
      registry: "RLY-17",
      name: "WATER TANK ARRAY // EAST",
      location: "East bank, across the river, behind the water tank",
      landmark: "CYLINDRICAL water tank on legs",
      beacon: "RED, blinking",
      status: "INTERMITTENT (battery)",
      operator: "Volunteer. Registered to SANC-0003 (Radio Sector)",
    },
    {
      registry: "RLY-21",
      name: "FERRY TERMINAL MAST",
      location: "East bank, ferry pier",
      landmark: "Ferry pier",
      beacon: "RED, blinking",
      status: "OFFLINE since DAY 214 21:52",
      operator: "Harbour authority",
    },
  ] as RelayRegistryEntry[],
  incidents: [
    { time: "DAY 214 18:00", text: "Storm advisory issued on all public channels." },
    { time: "DAY 214 21:40", text: "GRID FAILURE: district-wide loss of mains power. Municipal relays drop together." },
    { time: "DAY 214 21:52", text: "Ferry terminal mast offline." },
    { time: "DAY 215 02:47", text: "Unregistered transmission captured on the emergency band (logged as TRANSMISSION_07)." },
  ],
};

export interface MetadataRecord {
  title: string;
  origin: string;
  fields: [string, string][];
}

export const EVIDENCE_METADATA: MetadataRecord[] = [
  {
    title: "TRANSMISSION_07 // CAPTURE HEADER",
    origin: "Terminal 01 intercept buffer",
    fields: [
      ["CAPTURED", "DAY 215 02:47"],
      ["BAND", "VHF EMERGENCY"],
      ["CARRIER ID", "RLY-1▒ (second registry digit lost)"],
      ["BEARING", "UNRESOLVED"],
      ["INTEGRITY", "61% (5 fragments, out of sequence)"],
      ["SIGNATURE", "▒ch▒_▒ft▒rf▒ll"],
    ],
  },
  {
    title: "IMG_0214_2341_A.RAW",
    origin: "Attached to a social cache post, DAY 214 23:41",
    fields: [
      ["CAPTURED", "DAY 214 23:38"],
      ["EXPOSURE", "8.0 s (long exposure)"],
      ["DEVICE", "Same handset as the account's earlier posts"],
      ["GPS", "[STRIPPED]"],
    ],
  },
  {
    title: "IMG_0214_2341_B.RAW",
    origin: "Attached to a social cache post, DAY 214 23:41",
    fields: [
      ["CAPTURED", "[NOT RECORDED]"],
      ["EXPOSURE", "[NOT RECORDED]"],
      ["DEVICE", "Unknown. The file was saved from another upload, not taken on this handset"],
      ["GPS", "[STRIPPED]"],
    ],
  },
];

// Offline helper (Node, not bundled): produces one sealed ARCHIVE INDEX entry for the Signal Monitor
// (data/ctf/signalMonitor.ts → ARCHIVE_INDEX). The reference number is not stored: the entry is
// found by a salted SHA-256 of the reference and opened with a keystream derived from it — the
// same scheme as tools/seal-challenge.mjs, with its own salt.
//
//   node src/features/blue-zone/tools/seal-index-record.mjs <reference> '<record JSON>'

import { createHash } from "node:crypto";

const [reference, recordJson] = process.argv.slice(2);
if (!reference || !recordJson) {
  console.error("usage: seal-index-record.mjs <reference> '<record JSON>'");
  process.exit(1);
}

const ref = reference.replace(/\s+/g, "");
const sha = (text) => createHash("sha256").update(Buffer.from(text, "utf8")).digest();
const data = Buffer.from(JSON.stringify(JSON.parse(recordJson)), "utf8");
const sealed = Buffer.alloc(data.length);
for (let i = 0, block = 0; i < data.length; i += 32, block++) {
  const keystream = sha(`bluezone:ctf04:record:${ref}:${block}`);
  for (let j = 0; j < 32 && i + j < data.length; j++) sealed[i + j] = data[i + j] ^ keystream[j];
}

console.log(JSON.stringify({ key: sha(`bluezone:ctf04:index:${ref}`).toString("hex"), record: sealed.toString("base64") }));

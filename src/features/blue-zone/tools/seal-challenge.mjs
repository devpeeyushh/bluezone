// Offline helper (Node, not bundled): produces the SEALED entry used by
// services/localChallengeValidator.ts for one challenge. Nothing secret is stored here — the flag
// and reward are passed on the command line.
//
//   node src/features/blue-zone/tools/seal-challenge.mjs <challengeId> "<FLAG>" '<reward JSON>'
//
// The flag is normalised exactly like services/challengeService.normalizeFlag (whitespace removed,
// upper-cased) before hashing, so the sealed entry matches what the validator receives.

import { createHash } from "node:crypto";

const [id, rawFlag, rewardJson] = process.argv.slice(2);
if (!id || !rawFlag || !rewardJson) {
  console.error('usage: seal-challenge.mjs <challengeId> "<FLAG>" \'<reward JSON>\'');
  process.exit(1);
}

const flag = rawFlag.replace(/\s+/g, "").toUpperCase();
const sha = (text) => createHash("sha256").update(Buffer.from(text, "utf8")).digest();

const data = Buffer.from(JSON.stringify(JSON.parse(rewardJson)), "utf8");
const sealed = Buffer.alloc(data.length);
for (let i = 0, block = 0; i < data.length; i += 32, block++) {
  const keystream = sha(`bluezone:${id}:seal:${flag}:${block}`);
  for (let j = 0; j < 32 && i + j < data.length; j++) sealed[i + j] = data[i + j] ^ keystream[j];
}

console.log(
  JSON.stringify(
    { [id]: { check: sha(`bluezone:${id}:verify:${flag}`).toString("hex"), reward: sealed.toString("base64") } },
    null,
    2
  )
);

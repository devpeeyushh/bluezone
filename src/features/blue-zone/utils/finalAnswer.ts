import { sha256, toHex, utf8 } from "./sha256";

// Emergency Broadcast final answer. The client holds only a salted hash of the answer and the
// dataset sealed with a key derived from it (tools/seal-broadcast.mjs), so the dataset cannot be
// opened, and is never offered, before the puzzle is solved. Sealed data is code-split and loaded
// on the first submission.

// Only letter case and surrounding spaces are ignored: the answer is one exact word
export function normalizeFinalAnswer(raw: string): string {
  return raw.trim().toUpperCase();
}

// Key for re-opening the dataset later in the same session (held in memory only)
let unlockedAnswer: string | null = null;

const loadSealed = () => import("../data/broadcast/sealedDataset");

export async function verifyFinalAnswer(raw: string): Promise<boolean> {
  const answer = normalizeFinalAnswer(raw);
  if (!answer) return false;
  const { FINAL_ANSWER_CHECK } = await loadSealed();
  const ok = toHex(sha256(utf8(`bluezone:emergency-broadcast:verify:${answer}`))) === FINAL_ANSWER_CHECK;
  if (ok) unlockedAnswer = answer;
  return ok;
}

export const isDatasetUnlocked = () => unlockedAnswer !== null;

export async function openDataset(): Promise<{ file: Blob; filename: string; bytes: number }> {
  if (!unlockedAnswer) throw new Error("DATASET SEALED");
  const { SEALED_DATASET, DATASET_FILENAME, DATASET_BYTES, DATASET_SHA256 } = await loadSealed();
  const binary = atob(SEALED_DATASET);
  const out = new Uint8Array(binary.length);
  for (let i = 0, block = 0; i < binary.length; i += 32, block++) {
    const keystream = sha256(utf8(`bluezone:emergency-broadcast:dataset:${unlockedAnswer}:${block}`));
    for (let j = 0; j < 32 && i + j < binary.length; j++) out[i + j] = binary.charCodeAt(i + j) ^ keystream[j];
  }
  // Integrity: the file handed over must be byte-identical to the supplied dataset
  if (out.length !== DATASET_BYTES || toHex(sha256(out)) !== DATASET_SHA256) throw new Error("DATASET INTEGRITY FAILURE");
  return { file: new Blob([out], { type: "text/csv" }), filename: DATASET_FILENAME, bytes: out.length };
}

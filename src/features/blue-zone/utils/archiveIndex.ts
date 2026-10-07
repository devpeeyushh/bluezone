import { ARCHIVE_INDEX, ArchiveRecord } from "../data/ctf/signalMonitor";
import { sha256, toHex, utf8 } from "./sha256";

// Signal Monitor ARCHIVE INDEX lookup. A record is found by a salted hash of its 6-digit reference
// and opened with a keystream derived from that reference (tools/seal-index-record.mjs), so the
// references themselves never appear in the client.

export const REFERENCE_SHAPE = /^\d{6}$/;

export function lookupArchiveRecord(rawReference: string): ArchiveRecord | null {
  const ref = rawReference.replace(/\s+/g, "");
  if (!REFERENCE_SHAPE.test(ref)) return null;
  const sealed = ARCHIVE_INDEX[toHex(sha256(utf8(`bluezone:ctf04:index:${ref}`)))];
  if (!sealed) return null;

  const binary = atob(sealed);
  const out = new Uint8Array(binary.length);
  let block = 0;
  for (let i = 0; i < binary.length; i += 32) {
    const keystream = sha256(utf8(`bluezone:ctf04:record:${ref}:${block++}`));
    for (let j = 0; j < 32 && i + j < binary.length; j++) out[i + j] = binary.charCodeAt(i + j) ^ keystream[j];
  }
  return JSON.parse(new TextDecoder().decode(out)) as ArchiveRecord;
}

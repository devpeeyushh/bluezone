// Signal workbench operations (Network Map). Generic, well-known transforms so CTF 02 is solvable
// fully offline. None of them know anything about the challenge: the player still has to pick
// the node, the layer order and the key.

export type WorkbenchOperation = "from-base64" | "from-hex" | "rot13" | "caesar" | "atbash" | "reverse" | "vigenere-decode";

export interface WorkbenchOperationInfo {
  id: WorkbenchOperation;
  label: string;
  param?: "key" | "shift";
}

export const WORKBENCH_OPERATIONS: WorkbenchOperationInfo[] = [
  { id: "from-base64", label: "FROM BASE64" },
  { id: "from-hex", label: "FROM HEX" },
  { id: "rot13", label: "ROT13" },
  { id: "caesar", label: "CAESAR // SHIFT BACK N", param: "shift" },
  { id: "atbash", label: "ATBASH" },
  { id: "reverse", label: "REVERSE" },
  { id: "vigenere-decode", label: "VIGENÈRE DECODE", param: "key" },
];

const shiftLetter = (ch: string, shift: number): string => {
  const code = ch.charCodeAt(0);
  const base = code >= 97 ? 97 : 65;
  return String.fromCharCode(((((code - base + shift) % 26) + 26) % 26) + base);
};

const LETTER = /[A-Za-z]/;

function caesar(input: string, shift: number): string {
  return input.replace(/[A-Za-z]/g, (ch) => shiftLetter(ch, shift));
}

function fromBase64(input: string): string {
  const clean = input.replace(/\s+/g, "");
  if (!clean || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) throw new Error("INPUT IS NOT VALID BASE64");
  const binary = atob(clean);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function fromHex(input: string): string {
  const clean = input.replace(/0x/gi, "").replace(/[\s:,-]+/g, "");
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) throw new Error("INPUT IS NOT VALID HEX");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder().decode(bytes);
}

// Standard Vigenère: the key advances only on letters; other characters pass through
function vigenereDecode(input: string, rawKey: string): string {
  const key = rawKey.toUpperCase().replace(/[^A-Z]/g, "");
  if (!key) throw new Error("A LETTER KEY IS REQUIRED");
  let j = 0;
  return Array.from(input, (ch) => {
    if (!LETTER.test(ch)) return ch;
    const k = key.charCodeAt(j++ % key.length) - 65;
    return shiftLetter(ch, -k);
  }).join("");
}

export function runWorkbenchOperation(op: WorkbenchOperation, input: string, param: string): string {
  switch (op) {
    case "from-base64":
      return fromBase64(input);
    case "from-hex":
      return fromHex(input);
    case "rot13":
      return caesar(input, 13);
    case "caesar": {
      const n = Number.parseInt(param, 10);
      if (!Number.isFinite(n)) throw new Error("A NUMERIC SHIFT IS REQUIRED");
      return caesar(input, -n);
    }
    case "atbash":
      return input.replace(/[A-Za-z]/g, (ch) => {
        const base = ch.charCodeAt(0) >= 97 ? 97 : 65;
        return String.fromCharCode(base + 25 - (ch.charCodeAt(0) - base));
      });
    case "reverse":
      return Array.from(input).reverse().join("");
    case "vigenere-decode":
      return vigenereDecode(input, param);
  }
}

import { BlueZoneChallengeId, ChallengeReward, ChallengeValidator } from "../types/challenge.types";
import { INCORRECT_FEEDBACK } from "../data/ctf/registry";
import { sha256, toHex, utf8 } from "../utils/sha256";

// Local (no-backend) validator. The bundle holds no plaintext flag: each challenge stores a salted
// SHA-256 check of the normalised flag, and its reward (the CTF 01 handoff, the CTF 02 route) is
// sealed with a keystream derived from the correct flag — it can only be opened by solving.
// A backend implementation of ChallengeValidator replaces this file without any UI change.

interface SealedChallenge {
  check: string; // sha256("bluezone:<id>:verify:<flag>")
  reward: string; // base64(JSON reward XOR sha256-keystream("bluezone:<id>:seal:<flag>:<n>"))
}

const SEALED: Record<BlueZoneChallengeId, SealedChallenge> = {
  "blue-zone-ctf-01": {
    check: "d389f67ee6538c778fa3e1805f6e76e57fcbc1e25debca75022822708eae7bf5",
    reward:
      "WLEFC/YkMcwa9O7ADKnRg2EoRzzULboke2HKCWPUrWQFIcxMcA2NMYy3q5668UXKOL4/L5jUc+Xq//pLj0SK5uTluV3VlZPbimZNsEhYX9g8LrDP928beQRXnBi+JyaCBpGLv4S+EOJZCg==",
  },
  "blue-zone-ctf-02": {
    check: "36099ab5367e6a816148960b11d73c7ba73bcae3513aadaebc0d47efe9d85593",
    reward:
      "UL/GpaS+KSjOfh9Px32dxeHUUy3t2/hO6JPcXxg92eCyh9CnQ7mNI/niszfYZan25h2oUM26dUxj36l9ACI3b4KSAoGz7rNQ01/t/j9zzS2WWVzwAnY=",
  },
  "blue-zone-ctf-03": {
    check: "a0b19f634251dc982479c7bce2763fb7f1190b175044ee4edd0c7da8fdb20f91",
    reward:
      "i9AoEbumkKHdYRrt5gQH0e8xfYjxJ3nnGFnaj0/rbFJsm8NzTH7WTJMYIAOt9VXApmvYihjtpleiNSzFh/A+hpdN+r6RcxYo+fHb2oDMzM6pUwtLFwrSV5Bt4nol5KkNLVB4Y/Yrpg==",
  },
  "blue-zone-ctf-04": {
    check: "050cba8767e7248966780f725c4c021f5652f923b1f99dcd113e9ea9d94d7497",
    reward:
      "tnAFMmA+xj05INCphuBhU0oXAMd2SWJA3pWiNNTF5S3WpBQHX2WhZudhqFBaNH4HY8JZ/pt9r3ymuCC1GujEF0KTk7RmRBn5CK7SAc2MYagCNpjYIjlGc1ylcvnR9rZQEBnYq2Qaz9UWfrNZHDJmlQkBdZtxzz4=",
  },
};

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function unseal(id: BlueZoneChallengeId, answer: string, sealed: string): ChallengeReward {
  const data = base64ToBytes(sealed);
  const out = new Uint8Array(data.length);
  let block = 0;
  for (let i = 0; i < data.length; i += 32) {
    const keystream = sha256(utf8(`bluezone:${id}:seal:${answer}:${block++}`));
    for (let j = 0; j < 32 && i + j < data.length; j++) out[i + j] = data[i + j] ^ keystream[j];
  }
  return JSON.parse(new TextDecoder().decode(out)) as ChallengeReward;
}

export const localChallengeValidator: ChallengeValidator = {
  async validate(challengeId, normalizedAnswer) {
    const sealed = SEALED[challengeId];
    const digest = toHex(sha256(utf8(`bluezone:${challengeId}:verify:${normalizedAnswer}`)));
    if (digest !== sealed.check) {
      return { correct: false, message: INCORRECT_FEEDBACK[challengeId] };
    }
    return {
      correct: true,
      message: "> FLAG VERIFIED",
      reward: unseal(challengeId, normalizedAnswer, sealed.reward),
    };
  },
};

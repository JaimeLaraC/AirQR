import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { RandomBytes } from "./random";
import { randomBytes } from "./random";
import { base64UrlToBytes, bytesToBase64Url, utf8 } from "./bytes";

export type KeyPair = {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
};

export function createKeyPair(rng: RandomBytes = randomBytes): KeyPair {
  const secretKey = rng(32);
  return {
    secretKey,
    publicKey: x25519.getPublicKey(secretKey),
  };
}

export function publicKeyToString(publicKey: Uint8Array): string {
  return bytesToBase64Url(publicKey);
}

export function publicKeyFromString(publicKey: string): Uint8Array {
  return base64UrlToBytes(publicKey);
}

export function deriveWrappingKey(params: {
  localSecretKey: Uint8Array;
  peerPublicKey: Uint8Array;
  sessionId: string;
  txPublicKey: Uint8Array;
  rxPublicKey: Uint8Array;
}): Uint8Array {
  const shared = x25519.getSharedSecret(params.localSecretKey, params.peerPublicKey);
  return hkdf(
    sha256,
    shared,
    utf8(`optical-transfer:${params.sessionId}`),
    utf8(`wrap:${bytesToBase64Url(params.txPublicKey)}:${bytesToBase64Url(params.rxPublicKey)}`),
    32,
  );
}

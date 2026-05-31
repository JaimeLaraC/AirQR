import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { sha256 } from "@noble/hashes/sha2.js";
import type { DataPacket, MetaPacket } from "../protocol/packets";
import { crc32Hex } from "../protocol/checksums";
import { base64UrlToBytes, bytesToBase64Url, concatBytes, utf8 } from "./bytes";
import type { RandomBytes } from "./random";
import { randomBytes } from "./random";

export type EncryptedFragment = {
  seq: number;
  nonce: string;
  crc: string;
  body: string;
};

export function createFileKey(rng: RandomBytes = randomBytes): Uint8Array {
  return rng(32);
}

export function createNonceSeed(rng: RandomBytes = randomBytes): Uint8Array {
  return rng(16);
}

export function deriveFragmentNonce(nonceSeed: Uint8Array, seq: number): Uint8Array {
  const seqBytes = new Uint8Array(4);
  new DataView(seqBytes.buffer).setUint32(0, seq, false);
  return sha256(concatBytes(nonceSeed, seqBytes)).slice(0, 24);
}

export function buildFragmentAad(params: {
  sid: string;
  seq: number;
  total: number;
  hash: string;
  crc: string;
}): Uint8Array {
  return utf8(`v=1&t=DATA&sid=${params.sid}&seq=${params.seq}&total=${params.total}&hash=${params.hash}&crc=${params.crc}`);
}

export function encryptFragment(params: {
  fileKey: Uint8Array;
  sid: string;
  seq: number;
  total: number;
  hash: string;
  plaintext: Uint8Array;
  nonceSeed: Uint8Array;
}): EncryptedFragment {
  const crc = crc32Hex(params.plaintext);
  const nonce = deriveFragmentNonce(params.nonceSeed, params.seq);
  const aad = buildFragmentAad({ sid: params.sid, seq: params.seq, total: params.total, hash: params.hash, crc });
  const body = xchacha20poly1305(params.fileKey, nonce, aad).encrypt(params.plaintext);

  return {
    seq: params.seq,
    nonce: bytesToBase64Url(nonce),
    crc,
    body: bytesToBase64Url(body),
  };
}

export function decryptDataPacket(params: {
  fileKey: Uint8Array;
  packet: DataPacket;
  hash: string;
}): Uint8Array {
  const nonce = base64UrlToBytes(params.packet.nonce);
  const body = base64UrlToBytes(params.packet.body);
  const aad = buildFragmentAad({
    sid: params.packet.sid,
    seq: params.packet.seq,
    total: params.packet.total,
    hash: params.hash,
    crc: params.packet.crc,
  });
  return xchacha20poly1305(params.fileKey, nonce, aad).decrypt(body);
}

export function wrapFileKey(params: {
  wrappingKey: Uint8Array;
  fileKey: Uint8Array;
  sid: string;
  hash: string;
  rng?: RandomBytes;
}): { wrapNonce: string; wrappedKey: string } {
  const nonce = (params.rng ?? randomBytes)(24);
  const aad = utf8(`v=1&t=META&sid=${params.sid}&hash=${params.hash}`);
  const wrapped = xchacha20poly1305(params.wrappingKey, nonce, aad).encrypt(params.fileKey);
  return {
    wrapNonce: bytesToBase64Url(nonce),
    wrappedKey: bytesToBase64Url(wrapped),
  };
}

export function unwrapFileKey(params: {
  wrappingKey: Uint8Array;
  meta: MetaPacket;
}): Uint8Array {
  const aad = utf8(`v=1&t=META&sid=${params.meta.sid}&hash=${params.meta.hash}`);
  return xchacha20poly1305(params.wrappingKey, base64UrlToBytes(params.meta.wrapNonce), aad).decrypt(
    base64UrlToBytes(params.meta.wrappedKey),
  );
}

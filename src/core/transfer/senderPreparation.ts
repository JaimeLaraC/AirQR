import { defaultTransferConfig, type CompressionProfileId } from "../config/transferConfig";
import { createFileKey, createNonceSeed, encryptFragment, wrapFileKey } from "../crypto/cryptoService";
import { createKeyPair, deriveWrappingKey, publicKeyFromString, publicKeyToString } from "../crypto/keyExchange";
import type { RandomBytes } from "../crypto/random";
import { randomBytes } from "../crypto/random";
import { bytesToBase64Url } from "../protocol/base64url";
import type { DataPacket, MetaPacket, StartPacket } from "../protocol/packets";
import { createSessionId } from "../protocol/session";
import { chunkBytes } from "./chunker";

export type PreparedTransfer = {
  sid: string;
  meta: MetaPacket;
  dataPackets: DataPacket[];
  startedAt: number;
  bytes: number;
};

export function prepareTransferPackets(params: {
  receiverStart: StartPacket;
  fileBytes: Uint8Array;
  fileName: string;
  mime: string;
  hash: string;
  profile: CompressionProfileId;
  chunkSize?: number;
  rng?: RandomBytes;
}): PreparedTransfer {
  const rng = params.rng ?? randomBytes;
  const sid = createSessionId();
  const tx = createKeyPair(rng);
  const rxPublicKey = publicKeyFromString(params.receiverStart.rxPub);
  const wrappingKey = deriveWrappingKey({
    localSecretKey: tx.secretKey,
    peerPublicKey: rxPublicKey,
    sessionId: sid,
    txPublicKey: tx.publicKey,
    rxPublicKey,
  });
  const fileKey = createFileKey(rng);
  const nonceSeed = createNonceSeed(rng);
  const chunkSize = params.chunkSize ?? defaultTransferConfig.chunkSize;
  const chunks = chunkBytes(params.fileBytes, chunkSize);
  const wrapped = wrapFileKey({ wrappingKey, fileKey, sid, hash: params.hash, rng });

  const meta: MetaPacket = {
    v: 1,
    t: "META",
    sid,
    total: chunks.length,
    fileName: params.fileName,
    mime: params.mime,
    size: params.fileBytes.length,
    hash: params.hash,
    chunkSize,
    profile: params.profile,
    txPub: publicKeyToString(tx.publicKey),
    nonceSeed: bytesToBase64Url(nonceSeed),
    ...wrapped,
  };

  const dataPackets: DataPacket[] = chunks.map((chunk) => {
    const encrypted = encryptFragment({
      fileKey,
      sid,
      seq: chunk.seq,
      total: chunks.length,
      hash: params.hash,
      plaintext: chunk.bytes,
      nonceSeed,
    });
    return {
      v: 1,
      t: "DATA",
      sid,
      seq: encrypted.seq,
      total: chunks.length,
      crc: encrypted.crc,
      nonce: encrypted.nonce,
      body: encrypted.body,
    };
  });

  tx.secretKey.fill(0);
  fileKey.fill(0);
  wrappingKey.fill(0);

  return {
    sid,
    meta,
    dataPackets,
    startedAt: Date.now(),
    bytes: params.fileBytes.length,
  };
}

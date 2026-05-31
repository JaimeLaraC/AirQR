import { base64UrlToBytes } from "../protocol/base64url";
import { verifyCrc32 } from "../protocol/checksums";
import type { DataPacket, MetaPacket, StatusPacket } from "../protocol/packets";
import { decryptDataPacket, unwrapFileKey } from "../crypto/cryptoService";
import { deriveWrappingKey, publicKeyFromString, type KeyPair } from "../crypto/keyExchange";
import { sha256Hex } from "../crypto/hashService";
import { reconstructChunks } from "./chunker";
import { getHighestContiguous, getMissingRanges } from "./repair";

export type ReceiverBufferSnapshot = {
  receivedCount: number;
  duplicateCount: number;
  corruptCount: number;
  highestContiguous: number;
  complete: boolean;
};

export class ReceiverBuffer {
  private chunks = new Map<number, Uint8Array>();
  private fileKey: Uint8Array | null = null;
  duplicateCount = 0;
  corruptCount = 0;

  constructor(
    readonly meta: MetaPacket,
    receiverKeyPair: KeyPair,
  ) {
    const txPublicKey = publicKeyFromString(meta.txPub);
    const wrappingKey = deriveWrappingKey({
      localSecretKey: receiverKeyPair.secretKey,
      peerPublicKey: txPublicKey,
      sessionId: meta.sid,
      txPublicKey,
      rxPublicKey: receiverKeyPair.publicKey,
    });
    this.fileKey = unwrapFileKey({ wrappingKey, meta });
    wrappingKey.fill(0);
  }

  addPacket(packet: DataPacket): "stored" | "duplicate" | "wrong_session" | "corrupt" {
    if (packet.sid !== this.meta.sid || packet.total !== this.meta.total) {
      return "wrong_session";
    }
    if (this.chunks.has(packet.seq)) {
      this.duplicateCount += 1;
      return "duplicate";
    }
    if (!this.fileKey) {
      return "corrupt";
    }

    try {
      const plain = decryptDataPacket({ fileKey: this.fileKey, packet, hash: this.meta.hash });
      if (!verifyCrc32(plain, packet.crc)) {
        this.corruptCount += 1;
        return "corrupt";
      }
      this.chunks.set(packet.seq, plain);
      return "stored";
    } catch {
      this.corruptCount += 1;
      return "corrupt";
    }
  }

  snapshot(): ReceiverBufferSnapshot {
    const received = new Set(this.chunks.keys());
    return {
      receivedCount: this.chunks.size,
      duplicateCount: this.duplicateCount,
      corruptCount: this.corruptCount,
      highestContiguous: getHighestContiguous(received, this.meta.total),
      complete: this.chunks.size === this.meta.total,
    };
  }

  createStatus(state: StatusPacket["state"], hashOk: boolean | null = null, message?: string): StatusPacket {
    const received = new Set(this.chunks.keys());
    return {
      v: 1,
      t: "STATUS",
      sid: this.meta.sid,
      total: this.meta.total,
      receivedCount: this.chunks.size,
      highestContiguous: getHighestContiguous(received, this.meta.total),
      missingRanges: getMissingRanges(received, this.meta.total),
      hashOk,
      state,
      message,
    };
  }

  reconstruct(): { bytes: Uint8Array; hash: string; hashOk: boolean } {
    const bytes = reconstructChunks(this.chunks, this.meta.total);
    const hash = sha256Hex(bytes);
    return {
      bytes,
      hash,
      hashOk: hash === this.meta.hash,
    };
  }

  destroy(): void {
    this.fileKey?.fill(0);
    this.fileKey = null;
    this.chunks.clear();
  }
}

export function estimateEncryptedPayloadBytes(packet: DataPacket): number {
  return base64UrlToBytes(packet.body).length;
}

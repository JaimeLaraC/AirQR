import type { CompressionProfileId } from "../config/transferConfig";
import { PROTOCOL_VERSION, type AckPacket, type MissingRange, type StatusPacket, type TransferPacket } from "./packets";

const packetTypes = new Set(["START", "META", "DATA", "ACK", "STATUS", "REPAIR", "DONE", "ERROR"]);

export type DecodeResult =
  | { ok: true; packet: TransferPacket }
  | { ok: false; error: string };

export function decodePacket(raw: string): DecodeResult {
  try {
    const parsed = JSON.parse(raw) as Partial<TransferPacket> | unknown[];
    if (Array.isArray(parsed)) {
      return decodeCompactPacket(parsed);
    }

    const packet = parsed;
    if (packet.v !== PROTOCOL_VERSION) {
      return { ok: false, error: "version" };
    }

    if (typeof packet.t !== "string" || !packetTypes.has(packet.t)) {
      return { ok: false, error: "type" };
    }

    return { ok: true, packet: packet as TransferPacket };
  } catch {
    return { ok: false, error: "json" };
  }
}

function decodeCompactPacket(packet: unknown[]): DecodeResult {
  if (packet[0] !== PROTOCOL_VERSION) {
    return { ok: false, error: "version" };
  }

  switch (packet[1]) {
    case "S":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "START",
          sidHint: stringAt(packet, 2),
          rxPub: stringAt(packet, 3),
        },
      };
    case "M":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "META",
          sid: stringAt(packet, 2),
          total: numberAt(packet, 3),
          fileName: stringAt(packet, 4),
          mime: stringAt(packet, 5),
          size: numberAt(packet, 6),
          hash: stringAt(packet, 7),
          chunkSize: numberAt(packet, 8),
          profile: stringAt(packet, 9) as CompressionProfileId,
          txPub: stringAt(packet, 10),
          wrapNonce: stringAt(packet, 11),
          wrappedKey: stringAt(packet, 12),
          nonceSeed: stringAt(packet, 13),
        },
      };
    case "D":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "DATA",
          sid: stringAt(packet, 2),
          seq: numberAt(packet, 3),
          total: numberAt(packet, 4),
          crc: stringAt(packet, 5),
          nonce: stringAt(packet, 6),
          body: stringAt(packet, 7),
        },
      };
    case "A":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "ACK",
          sid: stringAt(packet, 2),
          ack: decodeAckTarget(stringAt(packet, 3)),
          seq: packet[4] === null ? undefined : numberAt(packet, 4),
          receivedCount: numberAt(packet, 5),
          nextExpected: numberAt(packet, 6),
          hashOk: packet[7] === null ? undefined : Boolean(packet[7]),
        },
      };
    case "T":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "STATUS",
          sid: stringAt(packet, 2),
          total: numberAt(packet, 3),
          receivedCount: numberAt(packet, 4),
          highestContiguous: numberAt(packet, 5),
          missingRanges: decodeRanges(packet[6]),
          hashOk: packet[7] === null ? null : Boolean(packet[7]),
          state: stringAt(packet, 8) as StatusPacket["state"],
          message: packet[9] === null ? undefined : stringAt(packet, 9),
        },
      };
    case "R":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "REPAIR",
          sid: stringAt(packet, 2),
          round: numberAt(packet, 3),
          missingRanges: decodeRanges(packet[4]),
        },
      };
    case "Z":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "DONE",
          sid: stringAt(packet, 2),
          hashOk: true,
          hash: stringAt(packet, 3),
        },
      };
    case "E":
      return {
        ok: true,
        packet: {
          v: 1,
          t: "ERROR",
          sid: packet[2] === null ? undefined : stringAt(packet, 2),
          code: stringAt(packet, 3),
          message: stringAt(packet, 4),
        },
      };
    default:
      return { ok: false, error: "type" };
  }
}

function stringAt(packet: unknown[], index: number): string {
  const value = packet[index];
  return typeof value === "string" ? value : "";
}

function numberAt(packet: unknown[], index: number): number {
  const value = packet[index];
  return typeof value === "number" ? value : 0;
}

function decodeAckTarget(value: string): AckPacket["ack"] {
  if (value === "M") {
    return "META";
  }
  if (value === "D") {
    return "DATA";
  }
  return "DONE";
}

function decodeRanges(value: unknown): MissingRange[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is [number, number] => Array.isArray(item) && typeof item[0] === "number" && typeof item[1] === "number")
    .map(([from, to]) => ({ from, to }));
}

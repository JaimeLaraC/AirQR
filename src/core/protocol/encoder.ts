import type { TransferPacket } from "./packets";

export function encodePacket(packet: TransferPacket): string {
  switch (packet.t) {
    case "START":
      return JSON.stringify([1, "S", packet.sidHint, packet.rxPub]);
    case "META":
      return JSON.stringify([
        1,
        "M",
        packet.sid,
        packet.total,
        packet.fileName,
        packet.mime,
        packet.size,
        packet.hash,
        packet.chunkSize,
        packet.profile,
        packet.txPub,
        packet.wrapNonce,
        packet.wrappedKey,
        packet.nonceSeed,
      ]);
    case "DATA":
      return JSON.stringify([1, "D", packet.sid, packet.seq, packet.total, packet.crc, packet.nonce, packet.body]);
    case "ACK":
      return JSON.stringify([
        1,
        "A",
        packet.sid,
        encodeAckTarget(packet.ack),
        packet.seq ?? null,
        packet.receivedCount,
        packet.nextExpected,
        packet.hashOk ?? null,
      ]);
    case "STATUS":
      return JSON.stringify([
        1,
        "T",
        packet.sid,
        packet.total,
        packet.receivedCount,
        packet.highestContiguous,
        packet.missingRanges.map((range) => [range.from, range.to]),
        packet.hashOk,
        packet.state,
        packet.message ?? null,
      ]);
    case "REPAIR":
      return JSON.stringify([1, "R", packet.sid, packet.round, packet.missingRanges.map((range) => [range.from, range.to])]);
    case "DONE":
      return JSON.stringify([1, "Z", packet.sid, packet.hash]);
    case "ERROR":
      return JSON.stringify([1, "E", packet.sid ?? null, packet.code, packet.message]);
    default:
      return JSON.stringify(packet);
  }
}

function encodeAckTarget(target: "META" | "DATA" | "DONE"): "M" | "D" | "Z" {
  if (target === "META") {
    return "M";
  }
  if (target === "DATA") {
    return "D";
  }
  return "Z";
}

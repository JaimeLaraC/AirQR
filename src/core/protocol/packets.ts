import type { CompressionProfileId } from "../config/transferConfig";

export const PROTOCOL_VERSION = 1;

export type PacketType =
  | "START"
  | "META"
  | "DATA"
  | "ACK"
  | "STATUS"
  | "REPAIR"
  | "DONE"
  | "ERROR";

export type MissingRange = {
  from: number;
  to: number;
};

export type BasePacket = {
  v: 1;
  t: PacketType;
  sid?: string;
};

export type StartPacket = BasePacket & {
  t: "START";
  sidHint: string;
  rxPub: string;
};

export type MetaPacket = BasePacket & {
  t: "META";
  sid: string;
  total: number;
  fileName: string;
  mime: string;
  size: number;
  hash: string;
  chunkSize: number;
  profile: CompressionProfileId;
  txPub: string;
  wrapNonce: string;
  wrappedKey: string;
  nonceSeed: string;
};

export type DataPacket = BasePacket & {
  t: "DATA";
  sid: string;
  seq: number;
  total: number;
  crc: string;
  nonce: string;
  body: string;
};

export type AckPacket = BasePacket & {
  t: "ACK";
  sid: string;
  ack: "META" | "DATA" | "DONE";
  seq?: number;
  receivedCount: number;
  nextExpected: number;
  hashOk?: boolean;
};

export type StatusPacket = BasePacket & {
  t: "STATUS";
  sid: string;
  total: number;
  receivedCount: number;
  highestContiguous: number;
  missingRanges: MissingRange[];
  hashOk: boolean | null;
  state: "receiving" | "repair" | "validating" | "done" | "error";
  message?: string;
};

export type RepairPacket = BasePacket & {
  t: "REPAIR";
  sid: string;
  round: number;
  missingRanges: MissingRange[];
};

export type DonePacket = BasePacket & {
  t: "DONE";
  sid: string;
  hashOk: true;
  hash: string;
};

export type ErrorPacket = BasePacket & {
  t: "ERROR";
  sid?: string;
  code: string;
  message: string;
};

export type TransferPacket =
  | StartPacket
  | MetaPacket
  | DataPacket
  | AckPacket
  | StatusPacket
  | RepairPacket
  | DonePacket
  | ErrorPacket;

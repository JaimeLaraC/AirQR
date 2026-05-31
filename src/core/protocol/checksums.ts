import { buf } from "crc-32";

export function crc32Hex(bytes: Uint8Array): string {
  return (buf(bytes) >>> 0).toString(16).padStart(8, "0");
}

export function verifyCrc32(bytes: Uint8Array, expected: string): boolean {
  return crc32Hex(bytes).toLowerCase() === expected.toLowerCase();
}

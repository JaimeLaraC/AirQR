import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { base64UrlToBytes, bytesToBase64Url } from "../protocol/base64url";

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }
  return result;
}

export function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function fromUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export { base64UrlToBytes, bytesToBase64Url, bytesToHex, hexToBytes };

import { fromByteArray, toByteArray } from "base64-js";

export function bytesToBase64Url(bytes: Uint8Array): string {
  return fromByteArray(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return toByteArray(base64 + padding);
}

export function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

export function base64UrlToString(value: string): string {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

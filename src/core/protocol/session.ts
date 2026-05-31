import { randomBytes } from "../crypto/random";
import { bytesToBase64Url } from "./base64url";

export function createSessionId(bytes = 6): string {
  return bytesToBase64Url(randomBytes(bytes)).toUpperCase();
}

export function createSessionHint(): string {
  return createSessionId(4);
}

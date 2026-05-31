export type RandomBytes = (length: number) => Uint8Array;

declare const require: ((moduleName: string) => { getRandomBytes?: (length: number) => Uint8Array }) | undefined;

export const randomBytes: RandomBytes = (length) => {
  const bytes = new Uint8Array(length);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
    return bytes;
  }

  if (typeof require === "function") {
    const moduleName = "expo" + "-crypto";
    const loadModule = require;
    const expoCrypto = loadModule(moduleName);
    const expoBytes = expoCrypto.getRandomBytes?.(length);
    if (expoBytes) {
      return expoBytes;
    }
  }

  throw new Error("Secure random source is unavailable");
};

import type { CompressionProfile } from "../core/config/transferConfig";

export type DesktopImage = {
  bytes: Uint8Array;
  fileName: string;
  mime: string;
  originalSize: number;
  compressedSize: number;
  previewUrl: string;
};

export async function compressImageFile(file: File, profile: CompressionProfile): Promise<DesktopImage> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, profile.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * ratio));
  const height = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo crear contexto Canvas");
  }
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("No se pudo comprimir la imagen"));
        }
      },
      "image/jpeg",
      profile.quality,
    );
  });

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    fileName: file.name.replace(/\.[^.]+$/u, "") + ".jpg",
    mime: "image/jpeg",
    originalSize: file.size,
    compressedSize: blob.size,
    previewUrl: URL.createObjectURL(blob),
  };
}

export function bytesToObjectUrl(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
}

export function downloadBytes(bytes: Uint8Array, fileName: string, mime: string): void {
  const url = bytesToObjectUrl(bytes, mime);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

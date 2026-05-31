export type CompressionProfileId = "fast" | "normal" | "high";

export type CompressionProfile = {
  id: CompressionProfileId;
  label: string;
  maxDimension: number;
  quality: number;
  fps: number;
};

export const compressionProfiles: CompressionProfile[] = [
  { id: "fast", label: "Rapido", maxDimension: 640, quality: 0.45, fps: 4 },
  { id: "normal", label: "Normal", maxDimension: 1024, quality: 0.65, fps: 3 },
  { id: "high", label: "Alta", maxDimension: 1280, quality: 0.82, fps: 2 },
];

export const defaultTransferConfig = {
  protocolVersion: 1,
  chunkSize: 180,
  statusEveryFragments: 32,
  statusEveryMs: 1000,
  scannerDebounceMs: 90,
  maxMissingRanges: 80,
  statusTimeoutMs: 10000,
};

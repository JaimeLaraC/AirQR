export type Chunk = {
  seq: number;
  bytes: Uint8Array;
};

export function chunkBytes(bytes: Uint8Array, chunkSize: number): Chunk[] {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error("chunkSize must be a positive integer");
  }

  const chunks: Chunk[] = [];
  for (let offset = 0, seq = 0; offset < bytes.length; offset += chunkSize, seq += 1) {
    chunks.push({ seq, bytes: bytes.slice(offset, offset + chunkSize) });
  }
  return chunks;
}

export function reconstructChunks(chunks: Map<number, Uint8Array>, total: number): Uint8Array {
  const ordered: Uint8Array[] = [];
  for (let seq = 0; seq < total; seq += 1) {
    const chunk = chunks.get(seq);
    if (!chunk) {
      throw new Error(`Missing chunk ${seq}`);
    }
    ordered.push(chunk);
  }

  const size = ordered.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of ordered) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

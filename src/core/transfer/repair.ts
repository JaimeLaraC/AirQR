import { defaultTransferConfig } from "../config/transferConfig";
import type { MissingRange } from "../protocol/packets";

export function getHighestContiguous(received: Set<number>, total: number): number {
  let highest = -1;
  for (let seq = 0; seq < total; seq += 1) {
    if (!received.has(seq)) {
      break;
    }
    highest = seq;
  }
  return highest;
}

export function getMissingRanges(
  received: Set<number>,
  total: number,
  maxRanges = defaultTransferConfig.maxMissingRanges,
): MissingRange[] {
  const ranges: MissingRange[] = [];
  let current: MissingRange | null = null;

  for (let seq = 0; seq < total; seq += 1) {
    if (received.has(seq)) {
      if (current) {
        ranges.push(current);
        current = null;
        if (ranges.length >= maxRanges) {
          break;
        }
      }
      continue;
    }

    if (!current) {
      current = { from: seq, to: seq };
    } else {
      current.to = seq;
    }
  }

  if (current && ranges.length < maxRanges) {
    ranges.push(current);
  }

  return ranges;
}

export function expandMissingRanges(ranges: MissingRange[]): number[] {
  const seqs: number[] = [];
  for (const range of ranges) {
    for (let seq = range.from; seq <= range.to; seq += 1) {
      seqs.push(seq);
    }
  }
  return seqs;
}

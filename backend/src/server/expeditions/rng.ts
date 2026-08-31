import { createHmac } from 'node:crypto';

export function deterministicDigest(secret: string, ...parts: Array<string | number>) {
  return createHmac('sha256', secret).update(parts.join('|')).digest();
}

export function deterministicUnit(secret: string, ...parts: Array<string | number>): number {
  const digest = deterministicDigest(secret, ...parts);
  const value = digest.readUInt32BE(0);
  return value / 0x1_0000_0000;
}

export function deterministicInt(secret: string, min: number, maxInclusive: number, ...parts: Array<string | number>): number {
  if (!Number.isInteger(min) || !Number.isInteger(maxInclusive) || maxInclusive < min) throw new Error('invalid deterministicInt bounds');
  return min + Math.floor(deterministicUnit(secret, ...parts) * (maxInclusive - min + 1));
}

export function deterministicShuffle<T>(secret: string, values: readonly T[], ...parts: Array<string | number>): T[] {
  return values
    .map((value, index) => ({ value, key: deterministicDigest(secret, ...parts, index).toString('hex') }))
    .sort((a,b) => a.key.localeCompare(b.key))
    .map((x) => x.value);
}

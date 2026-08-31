declare module 'node:crypto' {
  export interface HashLike {
    update(data: string): HashLike;
    digest(): Uint8Array & { readUInt32BE(offset: number): number; toString(encoding?: string): string };
  }
  export function createHmac(algorithm: string, key: string): HashLike;
}

declare module 'node:assert' {
  export const strict: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
  };
}

declare module 'node:crypto' {
  export function createHash(algorithm: string): HashLike;
}

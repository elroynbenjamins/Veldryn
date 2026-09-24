declare module 'node:crypto' {
  export interface HashLike {
    update(data: string): HashLike;
    digest(): Uint8Array & { readUInt32BE(offset: number): number; toString(encoding?: string): string };
    digest(encoding: 'hex' | 'base64' | 'base64url'): string;
  }
  export function createHmac(algorithm: string, key: string): HashLike;
}

declare module 'node:assert' {
  export const strict: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    throws(block: () => unknown, expected?: RegExp, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
  };
}

declare module 'node:crypto' {
  export function createHash(algorithm: string): HashLike;
}

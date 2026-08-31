import { createHmac } from 'node:crypto';

export class CombatRng {
  private cursor = 0;
  constructor(private readonly seed: string) {}
  next(label: string): number {
    const payload = `${this.cursor++}:${label}`;
    const hex = createHmac('sha256', this.seed).update(payload).digest().toString('hex').slice(0, 13);
    return parseInt(hex, 16) / 0x1fffffffffffff;
  }
  pick<T>(values: T[], label: string): T {
    if (!values.length) throw new Error('cannot_pick_empty');
    return values[Math.min(values.length - 1, Math.floor(this.next(label) * values.length))];
  }
}

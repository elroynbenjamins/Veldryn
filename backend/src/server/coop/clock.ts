export interface Clock { nowMs(): number; }

export class SystemClock implements Clock {
  nowMs(): number { return Date.now(); }
}

export class FakeClock implements Clock {
  constructor(private valueMs: number) {}
  nowMs(): number { return this.valueMs; }
  advanceMs(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('invalid_clock_advance');
    this.valueMs += deltaMs;
  }
}

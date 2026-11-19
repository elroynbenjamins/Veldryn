"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeClock = exports.SystemClock = void 0;
class SystemClock {
    nowMs() { return Date.now(); }
}
exports.SystemClock = SystemClock;
class FakeClock {
    valueMs;
    constructor(valueMs) {
        this.valueMs = valueMs;
    }
    nowMs() { return this.valueMs; }
    advanceMs(deltaMs) {
        if (!Number.isFinite(deltaMs) || deltaMs < 0)
            throw new Error('invalid_clock_advance');
        this.valueMs += deltaMs;
    }
}
exports.FakeClock = FakeClock;

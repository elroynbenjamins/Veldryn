"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatGameNumber = formatGameNumber;
function formatGameNumber(value, mode) {
    if (mode === 'exact' || Math.abs(value) < 1_000)
        return Math.round(value).toLocaleString();
    const absolute = Math.abs(value);
    const [divisor, suffix] = absolute >= 1_000_000_000 ? [1_000_000_000, 'B'] : absolute >= 1_000_000 ? [1_000_000, 'M'] : [1_000, 'K'];
    const scaled = value / divisor;
    return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 2).replace(/\.0+$/, '').replace(/(\.[0-9])0$/, '$1')}${suffix}`;
}

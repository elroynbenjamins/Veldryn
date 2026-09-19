"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statBarValue = statBarValue;
/** Invalid or unavailable totals render an empty bar, never a NaN width. */
function statBarValue(current, max) {
    const total = Number.isFinite(max) ? Math.max(0, max) : 0;
    const value = Number.isFinite(current) ? Math.max(0, current) : 0;
    return { value, total, progress: total > 0 ? Math.min(1, value / total) : 0 };
}

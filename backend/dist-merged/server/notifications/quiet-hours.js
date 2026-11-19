"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isQuiet = isQuiet;
function mins(v) { const [h, m] = v.split(':').map(Number); return h * 60 + m; }
function isQuiet(localHHMM, start, end) { const n = mins(localHHMM), s = mins(start), e = mins(end); return s === e ? false : s < e ? n >= s && n < e : n >= s || n < e; }

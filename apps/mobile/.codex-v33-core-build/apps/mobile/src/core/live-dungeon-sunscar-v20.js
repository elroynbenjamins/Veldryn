"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatWait = formatWait;
exports.readyCount = readyCount;
exports.routeVoteLeader = routeVoteLeader;
exports.setBonusSummary = setBonusSummary;
function formatWait(seconds) { const s = Math.max(0, Math.floor(seconds)); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`; }
function readyCount(check) { return check.members.filter(m => m.ready).length; }
function routeVoteLeader(options) { return [...options].sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id))[0]?.id; }
function setBonusSummary(progress) { return progress.thresholds.filter(t => t.active).map(t => `${t.pieces}pc`).join(' + ') || 'No bonus active'; }

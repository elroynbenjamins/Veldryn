"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraction = fraction;
exports.formatCompact = formatCompact;
exports.bossAttemptsRemaining = bossAttemptsRemaining;
exports.crisisStatusLabel = crisisStatusLabel;
function fraction(current, total) { return total <= 0 ? 0 : Math.max(0, Math.min(1, current / total)); }
function formatCompact(value) { if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1)}B`; if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1)}M`; if (value >= 1000)
    return `${(value / 1000).toFixed(1)}K`; return String(Math.floor(value)); }
function bossAttemptsRemaining(boss) { return Math.max(0, boss.dailyAttemptCap - boss.attemptsToday); }
function crisisStatusLabel(crisis) { if (crisis.state === 'secured')
    return 'Region Secured'; if (crisis.state === 'failed')
    return 'Crisis Ended'; return crisis.currentStageName; }

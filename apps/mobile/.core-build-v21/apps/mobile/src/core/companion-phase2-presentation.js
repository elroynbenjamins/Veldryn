"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_TRIAL_TEAM_SLOTS = exports.COMPANION_SANCTUARY_SECTIONS = void 0;
exports.companionTrialResetCountdown = companionTrialResetCountdown;
exports.companionAssignmentStatusLabel = companionAssignmentStatusLabel;
exports.COMPANION_SANCTUARY_SECTIONS = ['Companions', 'Training', 'Bond', 'Techniques', 'Expeditions', 'Trials', 'Codex'];
exports.COMPANION_TRIAL_TEAM_SLOTS = ['Tank', 'Damage', 'Support'];
function companionTrialResetCountdown(projection) { const now = Date.parse(projection.serverNow), end = Date.parse(projection.endsAt); if (!Number.isFinite(now) || !Number.isFinite(end))
    return 'Reset time unavailable'; let ms = Math.max(0, end - now); const days = Math.floor(ms / 86400000); ms -= days * 86400000; const hours = Math.floor(ms / 3600000); ms -= hours * 3600000; const minutes = Math.floor(ms / 60000); return days > 0 ? `Resets in: ${days}d ${String(hours).padStart(2, '0')}h` : `Resets in: ${hours}h ${String(minutes).padStart(2, '0')}m`; }
function companionAssignmentStatusLabel(assignment, serverNowIso) { if (assignment.status === 'claimed')
    return 'Claimed'; if (assignment.status === 'cancelled')
    return 'Cancelled'; const now = Date.parse(serverNowIso), end = Date.parse(assignment.endsAt); if (Number.isFinite(now) && Number.isFinite(end) && now >= end)
    return 'Ready to claim'; return 'On Expedition'; }

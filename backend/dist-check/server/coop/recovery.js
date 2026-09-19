"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectMember = disconnectMember;
exports.reconnectMember = reconnectMember;
exports.enterSafeBoundary = enterSafeBoundary;
exports.resolveContinueOrEnd = resolveContinueOrEnd;
const config_1 = require("./config");
function disconnectMember(state, accountId, nowMs) { return { ...state, members: state.members.map(member => member.accountId === accountId ? { ...member, connected: false, disconnectedAtMs: nowMs } : member) }; }
function reconnectMember(state, accountId, nowMs) {
    const member = state.members.find(row => row.accountId === accountId);
    if (!member || member.voluntaryLeaver)
        throw new Error('reconnect_not_allowed');
    if (member.disconnectedAtMs !== undefined && nowMs - member.disconnectedAtMs > config_1.COOP_ROGUELITE_CONFIG.reconnectGraceMs)
        throw new Error('reconnect_grace_expired');
    return { ...state, phase: 'active', members: state.members.map(row => row.accountId === accountId ? { ...row, connected: true, disconnectedAtMs: undefined } : row) };
}
function enterSafeBoundary(state, nowMs) {
    const disconnected = state.members.filter(member => !member.connected && !member.voluntaryLeaver);
    if (!disconnected.length)
        return { ...state, phase: 'active' };
    const graceActive = disconnected.some(member => nowMs - (member.disconnectedAtMs ?? nowMs) < config_1.COOP_ROGUELITE_CONFIG.reconnectGraceMs);
    return { ...state, phase: graceActive ? 'paused_for_reconnect' : 'continue_or_end', members: state.members.map(member => !member.connected ? { ...member, absent: !graceActive } : member) };
}
function resolveContinueOrEnd(state, votes) {
    if (state.phase !== 'continue_or_end')
        throw new Error('no_disconnect_decision');
    const eligible = state.members.filter(member => member.connected && !member.voluntaryLeaver);
    const continues = eligible.filter(member => votes[member.accountId] === 'continue').length, ends = eligible.filter(member => votes[member.accountId] === 'end').length;
    return { ...state, phase: continues > ends ? 'active' : 'abandoned' };
}

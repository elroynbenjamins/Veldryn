"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitGuildApplication = submitGuildApplication;
exports.withdrawGuildApplication = withdrawGuildApplication;
exports.acceptGuildApplication = acceptGuildApplication;
exports.declineGuildApplication = declineGuildApplication;
function submitGuildApplication(state) { if (!state.character)
    throw new Error('Create a character first'); if (state.account.guildMember)
    throw new Error('Already in a guild'); if ((state.account.guildMinimumLevel ?? 10) > state.character.level)
    throw new Error(`Requires character level ${state.account.guildMinimumLevel ?? 10}`); if (state.account.guildJoinPolicy !== 'apply')
    throw new Error('This guild does not accept applications'); return { ...state, account: { ...state.account, guildApplicationStatus: 'pending' } }; }
function withdrawGuildApplication(state) { return { ...state, account: { ...state.account, guildApplicationStatus: 'none' } }; }
function acceptGuildApplication(state) { return { ...state, account: { ...state.account, guildApplicationStatus: 'accepted', guildMember: true } }; }
function declineGuildApplication(state) { return { ...state, account: { ...state.account, guildApplicationStatus: 'declined' } }; }

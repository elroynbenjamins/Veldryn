"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildJoinResult = guildJoinResult;
function guildJoinResult(state) {
    if (!state.character)
        return { allowed: false, action: 'level', message: 'Create a character first' };
    const minimum = state.account.guildMinimumLevel ?? 10;
    if (state.character.level < minimum)
        return { allowed: false, action: 'level', message: `Requires character level ${minimum}` };
    const policy = state.account.guildJoinPolicy ?? 'open';
    if (policy === 'open')
        return { allowed: true, action: 'join', message: 'Join guild immediately' };
    if (policy === 'apply')
        return { allowed: true, action: 'apply', message: 'Submit an application to join' };
    return { allowed: false, action: 'invite', message: 'Invite required to join' };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_BOSS_MAX_HP = exports.GUILD_PROJECT_TARGET = void 0;
exports.contributeToGuildProject = contributeToGuildProject;
exports.claimGuildProject = claimGuildProject;
exports.damageGuildBoss = damageGuildBoss;
const game_1 = require("./game");
exports.GUILD_PROJECT_TARGET = 1000;
exports.GUILD_BOSS_MAX_HP = 100000;
function contributeToGuildProject(state, points = 100) {
    if (!state.account.guildMember)
        throw new Error('Join a guild first');
    const value = Math.max(0, Math.floor(points));
    return { ...state, account: { ...state.account, guildContribution: (state.account.guildContribution ?? 0) + value, guildProjectProgress: Math.min(exports.GUILD_PROJECT_TARGET, (state.account.guildProjectProgress ?? 0) + value) } };
}
function claimGuildProject(state) {
    if ((state.account.guildProjectProgress ?? 0) < exports.GUILD_PROJECT_TARGET)
        throw new Error('Guild project is not complete');
    if (state.account.guildProjectClaimed)
        throw new Error('Guild project reward already claimed');
    const items = [{ itemId: 'OATHGLASS_SHARD', quantity: 2 }];
    return { ...state, character: state.character ? { ...state.character, gold: state.character.gold + 500 } : state.character, inventory: { ...state.inventory, stacks: (0, game_1.stackItems)(state.inventory.stacks, items) }, account: { ...state.account, guildProjectClaimed: true } };
}
function damageGuildBoss(state, damage = 5000) {
    if (!state.account.guildMember)
        throw new Error('Join a guild first');
    return { ...state, account: { ...state.account, guildContribution: (state.account.guildContribution ?? 0) + 50, guildBossHp: Math.max(0, (state.account.guildBossHp ?? exports.GUILD_BOSS_MAX_HP) - Math.max(0, Math.floor(damage))) } };
}

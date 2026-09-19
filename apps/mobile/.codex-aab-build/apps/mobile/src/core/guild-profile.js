"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localGuildProfile = localGuildProfile;
function localGuildProfile(state) {
    return { id: 'LOCAL_BLOOMWARDENS', name: 'The Bloomwardens', emblem: '✦', level: 3, language: 'English', description: 'A friendly expedition guild focused on steady PvE progress.', members: 5, capacity: 20, weeklyActivity: 68, pveProgress: state.account.guildProjectProgress ?? 0, bossHp: state.account.guildBossHp ?? 100000, joinPolicy: state.account.guildJoinPolicy ?? 'open', minimumLevel: state.account.guildMinimumLevel ?? 10 };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_ROLES = void 0;
exports.roleDefinition = roleDefinition;
exports.roleHasPermission = roleHasPermission;
exports.officerSlotCap = officerSlotCap;
exports.validateGuildBulletin = validateGuildBulletin;
const ALL = [
    'invite', 'kick', 'edit_message', 'start_project', 'manage_project', 'manage_vault', 'set_war_roster', 'set_defense',
    'start_guild_boss', 'edit_ranks', 'approve_applications', 'manage_crest', 'manage_description', 'pin_guild_chat', 'edit_bulletin', 'manage_decree'
];
exports.GUILD_ROLES = [
    { role: 'guild_master', label: 'Guild Master', hierarchy: 1, baseSlots: 1, permissions: ALL, canPromoteUpTo: 'co_leader' },
    { role: 'co_leader', label: 'Co-Leader', hierarchy: 2, baseSlots: 2, permissions: ALL, canPromoteUpTo: 'officer' },
    { role: 'officer', label: 'Officer', hierarchy: 3, baseSlots: 4, permissions: ['invite', 'kick', 'edit_message', 'start_project', 'manage_project', 'set_war_roster', 'set_defense', 'start_guild_boss', 'approve_applications', 'manage_description', 'pin_guild_chat', 'edit_bulletin', 'manage_decree'], canPromoteUpTo: 'veteran' },
    { role: 'quartermaster', label: 'Quartermaster', hierarchy: 4, baseSlots: 2, permissions: ['start_project', 'manage_project', 'manage_vault', 'edit_bulletin', 'manage_decree'] },
    { role: 'war_captain', label: 'War Captain', hierarchy: 4, baseSlots: 2, permissions: ['set_war_roster', 'set_defense', 'pin_guild_chat'] },
    { role: 'recruiter', label: 'Recruiter', hierarchy: 4, baseSlots: 3, permissions: ['invite', 'approve_applications'] },
    { role: 'veteran', label: 'Veteran', hierarchy: 5, baseSlots: 999, permissions: [] },
    { role: 'member', label: 'Member', hierarchy: 6, baseSlots: 999, permissions: [] },
    { role: 'recruit', label: 'Recruit', hierarchy: 7, baseSlots: 999, permissions: [] },
];
function roleDefinition(role) {
    const found = exports.GUILD_ROLES.find((row) => row.role === role);
    if (!found)
        throw new Error('unknown_guild_role');
    return found;
}
function roleHasPermission(role, permission) {
    return roleDefinition(role).permissions.includes(permission);
}
function officerSlotCap(officerCorpsRank) {
    return 4 + Math.max(0, Math.min(3, Math.floor(officerCorpsRank)));
}
function validateGuildBulletin(text) {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (normalized.length > 280)
        throw new Error('guild_bulletin_too_long');
    return normalized;
}

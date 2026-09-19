"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recruitment_1 = require("./recruitment");
function assert(value, message) { if (!value)
    throw new Error(message); }
const seeker = { kind: 'player_lfg', accountId: 'a', characterId: 'c', activityPreference: 'mixed', playStyle: 'balanced', goalTags: ['party_events'], activeEventTags: ['rift'], description: 'event party' };
const baseParty = { kind: 'party_lfm', partyId: 'p', ownerAccountId: 'o', activityPreference: 'mixed', playStyle: 'balanced', goalTags: ['party_events'], description: 'party', memberCount: 2, maxMembers: 4 };
const eventParty = { ...baseParty, activeEventTags: ['rift'] };
assert((0, recruitment_1.scorePartyCompatibility)(seeker, eventParty).score > (0, recruitment_1.scorePartyCompatibility)(seeker, baseParty).score, 'shared event is a soft bonus');
assert((0, recruitment_1.scorePartyCompatibility)(seeker, baseParty).score >= 70, 'exact event tag must not be required for a strong general match');
const guildSeeker = { kind: 'player_guild_lfg', accountId: 'a', characterId: 'c', desiredFocusTags: ['pve', 'events'], playStyle: 'balanced', description: 'guild', combatLevel: 80, totalLevel: 700, activeEventTags: ['rift'] };
const guild = { kind: 'guild_lfm', guildId: 'g', ownerAccountId: 'o', focusTags: ['pve', 'events'], playStyle: 'balanced', description: 'guild', memberCount: 20, memberCap: 30, activeEventTags: ['rift'], requirements: { minCombatLevel: 70, minTotalLevel: 600, applicationRequired: true } };
assert((0, recruitment_1.guildRequirementsMet)(guildSeeker, guild), 'qualified seeker should meet requirements');
assert((0, recruitment_1.scoreGuildCompatibility)(guildSeeker, guild).score >= 75, 'strong guild match should score highly');
assert(!(0, recruitment_1.guildRequirementsMet)({ ...guildSeeker, totalLevel: 500 }, guild), 'minimum total level should be enforced');
console.log('guild-recruitment-v17 ok');

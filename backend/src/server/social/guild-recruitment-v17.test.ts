import { guildRequirementsMet, scoreGuildCompatibility, scorePartyCompatibility, type GuildRecruitmentProfile, type PartyRecruitmentPost, type PlayerGuildSeekerPost, type PlayerPartySeekerPost } from './recruitment';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const seeker: PlayerPartySeekerPost = { kind:'player_lfg', accountId:'a', characterId:'c', activityPreference:'mixed', playStyle:'balanced', goalTags:['party_events'], activeEventTags:['rift'], description:'event party' };
const baseParty: PartyRecruitmentPost = { kind:'party_lfm', partyId:'p', ownerAccountId:'o', activityPreference:'mixed', playStyle:'balanced', goalTags:['party_events'], description:'party', memberCount:2, maxMembers:4 };
const eventParty = { ...baseParty, activeEventTags:['rift'] };
assert(scorePartyCompatibility(seeker, eventParty).score > scorePartyCompatibility(seeker, baseParty).score, 'shared event is a soft bonus');
assert(scorePartyCompatibility(seeker, baseParty).score >= 70, 'exact event tag must not be required for a strong general match');

const guildSeeker: PlayerGuildSeekerPost = { kind:'player_guild_lfg', accountId:'a', characterId:'c', desiredFocusTags:['pve','events'], playStyle:'balanced', description:'guild', combatLevel:80, totalLevel:700, activeEventTags:['rift'] };
const guild: GuildRecruitmentProfile = { kind:'guild_lfm', guildId:'g', ownerAccountId:'o', focusTags:['pve','events'], playStyle:'balanced', description:'guild', memberCount:20, memberCap:30, activeEventTags:['rift'], requirements:{minCombatLevel:70,minTotalLevel:600,applicationRequired:true} };
assert(guildRequirementsMet(guildSeeker, guild), 'qualified seeker should meet requirements');
assert(scoreGuildCompatibility(guildSeeker, guild).score >= 75, 'strong guild match should score highly');
assert(!guildRequirementsMet({ ...guildSeeker, totalLevel:500 }, guild), 'minimum total level should be enforced');

console.log('guild-recruitment-v17 ok');

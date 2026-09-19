import {
  normalizeGuildSeekerDescription,
  scoreGuildCompatibility,
  scorePartyCompatibility,
  sortPartyMatches,
  type GuildRecruitmentProfile,
  type PartyRecruitmentPost,
  type PlayerGuildSeekerPost,
  type PlayerPartySeekerPost,
} from './recruitment';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const seeker: PlayerPartySeekerPost = {
  kind: 'player_lfg',
  accountId: 'a',
  characterId: 'c',
  activityPreference: 'combat',
  playStyle: 'balanced',
  goalTags: ['weekly_contracts', 'bosses'],
  description: 'Looking for a steady party.',
};
const strong: PartyRecruitmentPost = {
  kind: 'party_lfm', partyId: 'p1', ownerAccountId: 'o1', activityPreference: 'combat', playStyle: 'balanced',
  goalTags: ['weekly_contracts', 'bosses'], description: 'Combat and weekly contracts.', memberCount: 3, maxMembers: 4,
};
const weak: PartyRecruitmentPost = {
  kind: 'party_lfm', partyId: 'p2', ownerAccountId: 'o2', activityPreference: 'skilling', playStyle: 'competitive',
  goalTags: ['crafting'], description: 'Crafting only.', memberCount: 2, maxMembers: 4,
};
assert(scorePartyCompatibility(seeker, strong).score > scorePartyCompatibility(seeker, weak).score, 'matching focus should rank higher');
assert(sortPartyMatches(seeker, [weak, strong])[0].partyId === 'p1', 'best party should sort first');

const guildSeeker: PlayerGuildSeekerPost = {
  kind: 'player_guild_lfg', accountId: 'a', characterId: 'c', desiredFocusTags: ['pve', 'progression'], playStyle: 'balanced', description: 'PVE guild wanted.',
};
const guild: GuildRecruitmentProfile = {
  kind: 'guild_lfm', guildId: 'g1', ownerAccountId: 'o', focusTags: ['pve', 'progression', 'events'], playStyle: 'balanced', description: 'PVE progression.', memberCount: 20, memberCap: 30,
};
assert(scoreGuildCompatibility(guildSeeker, guild).score >= 70, 'strong guild match should score well');
assert(normalizeGuildSeekerDescription('  hello   there  ') === 'hello there', 'description whitespace should normalize');

console.log('recruitment-v16 ok');

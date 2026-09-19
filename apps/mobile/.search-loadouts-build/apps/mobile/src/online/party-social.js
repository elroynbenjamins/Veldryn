"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPartyChat = exports.claimPartyContractReward = exports.partyRankings = exports.partySocialRepository = exports.partySocialSnapshot = exports.PARTY_SOCIAL_SERVER_AUTHORITY_NOTE = void 0;
exports.partyCommandKey = partyCommandKey;
exports.partySocialIdentity = partySocialIdentity;
exports.ownRecruitmentPosts = ownRecruitmentPosts;
exports.partyChatMessages = partyChatMessages;
const supabase_1 = require("./supabase");
/**
 * Production adapters must derive account identity from the authenticated session. Never send
 * accountId, contract points, reward amounts, verified kills/gathers/crafts, or ranking scores
 * from the client as authoritative values.
 */
exports.PARTY_SOCIAL_SERVER_AUTHORITY_NOTE = true;
function client() { if (!supabase_1.supabase)
    throw new Error('Online services are not configured.'); return supabase_1.supabase; }
async function rpc(name, args = {}) { const { data, error } = await client().rpc(name, args); if (error)
    throw new Error(error.message); return data; }
function partyCommandKey() { return `party-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`; }
const partySocialSnapshot = () => rpc('party_social_state_v16');
exports.partySocialSnapshot = partySocialSnapshot;
function card(row) { return { id: row.id, postType: row.post_type, ownerAccountId: row.owner_account_id, ownerName: row.owner_name ?? 'Your advert', partyId: row.party_id ?? undefined, guildId: row.guild_id ?? undefined, guildName: row.guild_name ?? undefined, title: row.title, body: row.body, roles: row.roles, focus: row.focus, activityTags: row.activity_tags, playstyleTags: row.playstyle_tags, availabilityTags: row.availability_tags, guildInterestTags: row.guild_interest_tags, activityLevel: row.activity_level ?? undefined, currentObjective: row.current_objective ?? undefined, openSpots: row.actual_open_spots ?? row.open_spots ?? undefined, language: row.language ?? undefined, region: row.region ?? undefined, minCombatLevel: row.min_combat_level ?? undefined, minTotalLevel: row.min_total_level ?? undefined, expiresAtMs: Date.parse(row.expires_at), status: row.status }; }
exports.partySocialRepository = {
    getMyParty: async () => (await (0, exports.partySocialSnapshot)()).party,
    createParty: async (input) => { await rpc('create_persistent_party_v16', { p_leader_character_id: input.characterId, p_role: input.role, p_focus: input.focus, p_idempotency_key: input.idempotencyKey }); const state = await (0, exports.partySocialSnapshot)(); if (!state.party)
        throw new Error('Party no longer active.'); return state.party; },
    joinParty: async (input) => { await rpc('join_persistent_party_v16', { p_party_id: input.partyId, p_character_id: input.characterId, p_role: input.role, p_idempotency_key: input.idempotencyKey }); const state = await (0, exports.partySocialSnapshot)(); if (!state.party)
        throw new Error('Party no longer active.'); return state.party; },
    leaveParty: async (input) => { await rpc('leave_persistent_party_v16', { p_party_id: input.partyId, p_idempotency_key: input.idempotencyKey }); },
    getPartyContracts: async (partyId) => { const state = await (0, exports.partySocialSnapshot)(); return state.party?.id === partyId ? state.contracts : []; },
    browseRecruitment: async (filters) => (await rpc('browse_recruitment_v16', { p_filters: filters })).map(card),
    publishRecruitment: async (input) => card(await rpc('publish_recruitment_post_v16', {
        p_post_type: input.postType, p_title: input.title, p_body: input.body, p_duration_days: input.durationDays ?? null, p_owner_character_id: input.ownerCharacterId ?? null, p_guild_id: input.guildId ?? null, p_party_id: input.partyId ?? null, p_roles: input.roles ?? [], p_focus: input.focus ?? 'any', p_activity_tags: input.activityTags ?? [], p_playstyle_tags: input.playstyleTags ?? [], p_availability_tags: input.availabilityTags ?? [], p_guild_interest_tags: input.guildInterestTags ?? [], p_activity_level: input.activityLevel ?? null, p_current_objective: input.currentObjective ?? null, p_open_spots: input.openSpots ?? null, p_language: input.language ?? null, p_region: input.region ?? null, p_min_combat_level: input.minCombatLevel ?? null, p_min_total_level: input.minTotalLevel ?? null
    })),
    refreshRecruitment: async (id, days) => card(await rpc('refresh_recruitment_post', { p_post_id: id, p_duration_days: days ?? null })),
    closeRecruitment: async (id) => { await rpc('close_recruitment_post_v16', { p_post_id: id }); },
};
async function partySocialIdentity() {
    const c = client();
    const { data: { user }, error } = await c.auth.getUser();
    if (error)
        throw error;
    if (!user)
        return null;
    const profile = await c.from('player_profiles').select('active_character_id').eq('account_id', user.id).maybeSingle();
    if (profile.error)
        throw profile.error;
    const characters = await c.from('characters').select('id').eq('account_id', user.id).order('created_at').limit(1);
    if (characters.error)
        throw characters.error;
    return { accountId: user.id, characterId: (profile.data?.active_character_id ?? characters.data?.[0]?.id ?? null) };
}
async function ownRecruitmentPosts() { const identity = await partySocialIdentity(); if (!identity)
    return []; const { data, error } = await client().from('recruitment_posts').select('*').eq('owner_account_id', identity.accountId).order('created_at', { ascending: false }).limit(20); if (error)
    throw error; return data.map(card); }
const partyRankings = () => rpc('party_rankings_board_v16');
exports.partyRankings = partyRankings;
const claimPartyContractReward = (id, characterId) => rpc('claim_party_contract_reward_v16', { p_entitlement_id: id, p_character_id: characterId });
exports.claimPartyContractReward = claimPartyContractReward;
const sendPartyChat = (id, body, key) => rpc('send_persistent_party_chat_v16', { p_party_id: id, p_body: body, p_idempotency_key: key });
exports.sendPartyChat = sendPartyChat;
async function partyChatMessages(id) { const { data, error } = await client().from('chat_messages').select('id,account_id,sender_name,body,created_at').eq('channel_type', 'party').eq('channel_id', id).order('created_at', { ascending: false }).limit(50); if (error)
    throw error; return (data ?? []).reverse(); }

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseGuildRepository = void 0;
;
function result(r) { if (r.error)
    throw new Error(`guild_persistence:${r.error.code ?? 'unknown'}:${r.error.message}`); if (!r.data)
    throw new Error('guild_empty_response'); return structuredClone(r.data); }
class SupabaseGuildRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async self(accountId) { const r = await this.client.rpc('guild_self_server_v1', { p_account_id: accountId }); if (r.error)
        throw new Error(r.error.message); return r.data ? structuredClone(r.data) : null; }
    async directory(accountId, limit) { return result(await this.client.rpc('guild_directory_server_v1', { p_account_id: accountId, p_limit: limit })); }
    async leaderboard(accountId, limit) { return result(await this.client.rpc('guild_leaderboard_server_v1', { p_account_id: accountId, p_limit: limit })); }
    async create(accountId, input, nowMs) { return result(await this.client.rpc('guild_create_server_v1', { p_account_id: accountId, p_character_id: input.characterId, p_name: input.name, p_description: input.description, p_language: input.language, p_crest_id: input.crestId, p_join_policy: input.joinPolicy, p_minimum_level: input.minimumLevel, p_request_id: input.requestId, p_now: new Date(nowMs).toISOString() })); }
    async updateProfile(accountId, input, nowMs) { return result(await this.client.rpc('guild_update_profile_server_v1', { p_account_id: accountId, ...input, p_request_id: input.requestId, p_now: new Date(nowMs).toISOString() })); }
    async allocateSkill(accountId, skillId, requestId, nowMs) { return result(await this.client.rpc('guild_allocate_skill_server_v1', { p_account_id: accountId, p_skill_id: skillId, p_request_id: requestId, p_now: new Date(nowMs).toISOString() })); }
    async contributeProject(accountId, characterId, optionId, requestId, nowMs) { return result(await this.client.rpc('guild_contribute_project_server_v1', { p_account_id: accountId, p_character_id: characterId, p_option_id: optionId, p_request_id: requestId, p_now: new Date(nowMs).toISOString() })); }
}
exports.SupabaseGuildRepository = SupabaseGuildRepository;

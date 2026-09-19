"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseProfileRepository = void 0;
function result(response) { if (response.error)
    throw new Error(`profile_persistence:${response.error.code ?? 'unknown'}:${response.error.message}`); if (!response.data)
    throw new Error('profile_empty_response'); return structuredClone(response.data); }
class SupabaseProfileRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async self(accountId) { return result(await this.client.rpc('profile_self_server_v1', { p_account_id: accountId })); }
    async publicProfile(viewerAccountId, targetAccountId) { return result(await this.client.rpc('profile_public_server_v1', { p_viewer_account_id: viewerAccountId, p_target_account_id: targetAccountId })); }
    async update(accountId, input, nowMs) { return result(await this.client.rpc('profile_update_server_v1', { p_account_id: accountId, p_request_id: input.requestId, p_display_name: input.displayName, p_active_character_id: input.activeCharacterId, p_title_id: input.titleId, p_background_id: input.backgroundId, p_border_id: input.borderId ?? null, p_pet_id: input.petId ?? null, p_visibility: input.visibility, p_now: new Date(nowMs).toISOString() })); }
}
exports.SupabaseProfileRepository = SupabaseProfileRepository;

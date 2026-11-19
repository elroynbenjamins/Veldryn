"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAchievementRepository = void 0;
function result(response) { if (response.error)
    throw new Error(`achievement_persistence:${response.error.code ?? 'unknown'}:${response.error.message}`); if (!response.data)
    throw new Error('achievement_empty_response'); return structuredClone(response.data); }
class SupabaseAchievementRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async snapshot(accountId) { return result(await this.client.rpc('achievement_snapshot_server_v1', { p_account_id: accountId })); }
    async claim(accountId, achievementId, requestId, nowMs) { return result(await this.client.rpc('achievement_claim_server_v1', { p_account_id: accountId, p_achievement_id: achievementId, p_request_id: requestId, p_now: new Date(nowMs).toISOString() })); }
    async setShowcase(accountId, achievementIds, requestId, nowMs) { return result(await this.client.rpc('achievement_showcase_update_server_v1', { p_account_id: accountId, p_achievement_ids: achievementIds, p_request_id: requestId, p_now: new Date(nowMs).toISOString() })); }
}
exports.SupabaseAchievementRepository = SupabaseAchievementRepository;

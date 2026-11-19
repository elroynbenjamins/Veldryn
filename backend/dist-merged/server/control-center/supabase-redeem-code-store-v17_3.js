"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseRedeemCodeRepository = void 0;
function fail(error, fallback) { throw new Error(error?.message || fallback); }
class SupabaseRedeemCodeRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async reserve(input) {
        const { data, error } = await this.db.rpc('reserve_ops_redeem_code_claim', { p_code_hash: input.codeHash, p_account_id: input.accountId });
        if (error)
            fail(error, 'redeem_reservation_failed');
        const row = Array.isArray(data) ? data[0] : null;
        if (!row)
            throw new Error('redeem_reservation_missing');
        return { claimId: row.claim_id, rewardBundleId: row.reward_bundle_id, idempotencyKey: row.idempotency_key };
    }
    async markGranted(claimId) { const { error } = await this.db.rpc('set_ops_redeem_claim_status', { p_claim_id: claimId, p_status: 'granted', p_error: null }); if (error)
        fail(error, 'redeem_mark_granted_failed'); }
    async markFailed(claimId, errorText) { const { error } = await this.db.rpc('set_ops_redeem_claim_status', { p_claim_id: claimId, p_status: 'failed', p_error: String(errorText).slice(0, 1000) }); if (error)
        fail(error, 'redeem_mark_failed_failed'); }
}
exports.SupabaseRedeemCodeRepository = SupabaseRedeemCodeRepository;

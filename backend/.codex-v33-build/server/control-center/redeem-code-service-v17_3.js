"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedeemCodeService = void 0;
exports.sha256RedeemCode = sha256RedeemCode;
exports.normalizeRedeemCode = normalizeRedeemCode;
async function sha256RedeemCode(normalizedCode) {
    const bytes = new TextEncoder().encode(normalizedCode);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function normalizeRedeemCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 48); }
class RedeemCodeService {
    repo;
    rewards;
    hash;
    constructor(repo, rewards, hash = sha256RedeemCode) {
        this.repo = repo;
        this.rewards = rewards;
        this.hash = hash;
    }
    async redeem(accountId, rawCode) {
        const normalized = normalizeRedeemCode(rawCode);
        if (normalized.length < 12 || normalized.length > 40)
            throw new Error('invalid_redeem_code');
        const codeHash = await this.hash(normalized);
        const reservation = await this.repo.reserve({ accountId, codeHash });
        try {
            await this.rewards.grantRewardBundle({ accountId, bundleId: reservation.rewardBundleId, idempotencyKey: reservation.idempotencyKey, source: 'redeem_code' });
            await this.repo.markGranted(reservation.claimId);
            return { ok: true, rewardBundleId: reservation.rewardBundleId };
        }
        catch (error) {
            // A retry MUST reuse the same reservation/idempotency key. If the reward-domain
            // grant succeeded before a process crash, its normal receipt/idempotency layer
            // prevents duplicate rewards when this claim is retried.
            await this.repo.markFailed(reservation.claimId, error instanceof Error ? error.message : String(error)).catch(() => { });
            throw error;
        }
    }
}
exports.RedeemCodeService = RedeemCodeService;

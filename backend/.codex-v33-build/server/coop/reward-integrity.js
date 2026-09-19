"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoopRewardService = exports.MemoryRewardIntegrityRepository = void 0;
const rewards_1 = require("../expeditions/rewards");
const reward_cadence_1 = require("./reward-cadence");
class MemoryRewardIntegrityRepository {
    entitlements = new Map();
    wallets = new Map();
    daily = new Map();
    weekly = new Map();
    receipts = new Map();
    purchases = new Map();
    enhancedCharges = new Map();
}
exports.MemoryRewardIntegrityRepository = MemoryRewardIntegrityRepository;
class CoopRewardService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    create(entitlement) { if (this.repository.entitlements.has(entitlement.id))
        throw new Error('duplicate_entitlement'); this.repository.entitlements.set(entitlement.id, structuredClone(entitlement)); }
    claim(accountId, entitlementId, requestId) {
        const receiptKey = `${accountId}:${requestId}`;
        const prior = this.repository.receipts.get(receiptKey);
        if (prior) {
            if (prior.entitlementId !== entitlementId)
                throw new Error('idempotency_conflict');
            return { marks: prior.marks, idempotentReplay: true };
        }
        const entitlement = this.repository.entitlements.get(entitlementId);
        if (!entitlement)
            throw new Error('entitlement_not_found');
        if (entitlement.recipientAccountId !== accountId)
            throw new Error('not_reward_recipient');
        if (entitlement.claimed) {
            const marks = entitlement.rewardMarks ?? 0;
            this.repository.receipts.set(receiptKey, { entitlementId, marks });
            return { marks, idempotentReplay: true };
        }
        const dailyKey = `${accountId}:${entitlement.periodDateKey}`, weeklyKey = `${accountId}:${entitlement.periodWeekKey}`;
        const daily = this.repository.daily.get(dailyKey) ?? { enhanced: 0, echo: 0 }, weekly = this.repository.weekly.get(weeklyKey) ?? { enhanced: 0, echo: 0 };
        let marks = 0;
        if (entitlement.kind === 'participant') {
            const charge = (0, reward_cadence_1.consumeEnhancedRewardCharge)(this.repository.enhancedCharges.get(accountId), entitlement.earnedAtMs, entitlement.periodWeekKey);
            this.repository.enhancedCharges.set(accountId, charge.state);
            marks = (0, rewards_1.marksForRun)(entitlement.mapBaseMarks, entitlement.tier, entitlement.state, 1, charge.enhanced);
            if (charge.enhanced) {
                daily.enhanced++;
                weekly.enhanced++;
            }
        }
        else {
            const eligible = (0, rewards_1.echoOwnerFullRewardEligible)(daily.echo, weekly.echo);
            marks = eligible ? Math.max(1, Math.round(entitlement.mapBaseMarks * .10)) : 0;
            if (eligible) {
                daily.echo++;
                weekly.echo++;
            }
        }
        entitlement.claimed = true;
        entitlement.rewardMarks = marks;
        this.repository.daily.set(dailyKey, daily);
        this.repository.weekly.set(weeklyKey, weekly);
        this.repository.wallets.set(accountId, (this.repository.wallets.get(accountId) ?? 0) + marks);
        this.repository.receipts.set(receiptKey, { entitlementId, marks });
        return { marks, idempotentReplay: false };
    }
    rewardBudget(accountId, nowMs, weekKey) { return (0, reward_cadence_1.refreshEnhancedRewardCharges)(this.repository.enhancedCharges.get(accountId), nowMs, weekKey); }
    purchasePersonal(input) {
        const prior = this.repository.purchases.get(input.requestId);
        if (prior) {
            if (prior.accountId !== input.accountId || prior.cost !== input.cost)
                throw new Error('idempotency_conflict');
            return;
        }
        if (input.memberKind !== 'human' || input.activeParticipantAccountId !== input.accountId)
            throw new Error('echo_wallet_forbidden');
        const balance = this.repository.wallets.get(input.accountId) ?? 0;
        if (input.cost < 0 || balance < input.cost)
            throw new Error('insufficient_funds');
        this.repository.wallets.set(input.accountId, balance - input.cost);
        this.repository.purchases.set(input.requestId, { accountId: input.accountId, cost: input.cost });
    }
}
exports.CoopRewardService = CoopRewardService;

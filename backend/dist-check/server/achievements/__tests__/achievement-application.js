"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const achievement_api_contracts_1 = require("../achievement-api-contracts");
const achievement_application_1 = require("../achievement-application");
const snapshot = { entries: [], score: 0, claimedCount: 0, showcaseIds: [] };
class Memory {
    async snapshot() { return snapshot; }
    async claim() { return { achievementId: 'first', payout: { gold: 10 }, creditedCharacterId: 'char', claimedAtMs: 1, idempotentReplay: false, snapshot }; }
    async setShowcase(_a, ids) { return { showcaseIds: ids, snapshot }; }
}
const expectThrow = (fn) => { let threw = false; try {
    fn();
}
catch {
    threw = true;
} node_assert_1.strict.equal(threw, true); };
const service = new achievement_application_1.AchievementApplicationService(new Memory());
node_assert_1.strict.equal((0, achievement_api_contracts_1.parseAchievementClaimBody)({ requestId: 'request-1' }).requestId, 'request-1');
node_assert_1.strict.equal((0, achievement_api_contracts_1.parseAchievementShowcaseBody)({ requestId: 'request-1', achievementIds: ['a', 'b'] }).achievementIds.length, 2);
expectThrow(() => (0, achievement_api_contracts_1.parseAchievementShowcaseBody)({ requestId: 'request-1', achievementIds: ['a', 'a'] }));
expectThrow(() => service.claim('', 'a', 'request-1', 1));
expectThrow(() => service.setShowcase('a', ['a', 'b', 'c', 'd'], 'request-1', 1));
void service.snapshot(' account-a ').then(value => { node_assert_1.strict.equal(value.score, 0); console.log('achievement application PASS'); });

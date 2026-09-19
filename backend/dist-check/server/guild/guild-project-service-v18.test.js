"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const guild_project_service_1 = require("./guild-project-service");
const guild_projects_1 = require("./guild-projects");
class Repo {
    states = new Map();
    receipts = new Set();
    bindings = new Map();
    claims = new Set();
    async loadContributionStateForUpdate(id, accountId, _dateKey) { const s = this.states.get(id); if (!s)
        return undefined; const row = s.memberProgress.find(x => x.accountId === accountId); return { ...s, accountProgress: row }; }
    async getCycleBinding(cycleKey, accountId) { const guildId = this.bindings.get(`${cycleKey}:${accountId}`); return guildId ? { guildId } : undefined; }
    async bindCycle(cycleKey, accountId, guildId, _pointsAtBind) { const k = `${cycleKey}:${accountId}`; const existing = this.bindings.get(k); if (existing)
        return { guildId: existing }; this.bindings.set(k, guildId); return { guildId }; }
    async hasContributionReceipt(projectInstanceId, accountId, sourceEventId) { return this.receipts.has(`${projectInstanceId}:${accountId}:${sourceEventId}`); }
    async applyContribution(input) { const s = this.states.get(input.projectInstanceId); this.receipts.add(`${input.projectInstanceId}:${input.accountId}:${input.sourceEventId}`); let row = s.memberProgress.find(x => x.accountId === input.accountId); if (!row) {
        row = { accountId: input.accountId, rawPoints: 0, completionPoints: 0, combatPoints: 0, skillingPoints: 0 };
        s.memberProgress.push(row);
    } row.rawPoints += input.creditedPoints; row.completionPoints += input.completionCreditedPoints; if (input.category === 'combat')
        row.combatPoints += input.completionCreditedPoints;
    else
        row.skillingPoints += input.completionCreditedPoints; s.instance.completionPoints += input.completionCreditedPoints; }
    async markCompleted(id, completedAtMs, _snapshot) { const s = this.states.get(id); s.instance.status = 'completed'; s.instance.completedAtMs = completedAtMs; }
    async loadMembershipSnapshot() { return { currentMember: true, wasMemberAtStart: true, projectStartedAtMs: 0, projectCompletedAtMs: 1 }; }
    async hasRewardClaim(id, accountId, rewardKey) { return this.claims.has(`${id}:${accountId}:${rewardKey}`); }
    async recordRewardClaim(id, accountId, rewardKey) { this.claims.add(`${id}:${accountId}:${rewardKey}`); }
}
function event(sourceEventId, accountId = 'account') { return { sourceEventId, accountId, occurredAtMs: Date.now(), dateKey: '2026-09-14', profile: { id: 'combat', category: 'combat', expectedSecondsPerUnit: 1200, challenge: 'routine' }, units: 1, activityKind: 'combat', contentId: 'mob' }; }
async function run() {
    const repo = new Repo();
    const def = guild_projects_1.GUILD_WEEKLY_PROJECT_POOL.find(x => x.focus === 'combat');
    const p1 = (0, guild_project_service_1.createWeeklyGuildProjectInstanceReference)({ id: 'p1', guildId: 'g1', definition: def, activeMemberSnapshot: 4, startsAtMs: 0, endsAtMs: 9999999999999 });
    p1.cycleKey = '2026-09-14';
    const p2 = (0, guild_project_service_1.createWeeklyGuildProjectInstanceReference)({ id: 'p2', guildId: 'g2', definition: def, activeMemberSnapshot: 4, startsAtMs: 0, endsAtMs: 9999999999999 });
    p2.cycleKey = '2026-09-14';
    repo.states.set('p1', { instance: p1, memberProgress: [], pointsCreditedToday: 0 });
    repo.states.set('p2', { instance: p2, memberProgress: [], pointsCreditedToday: 0 });
    const first = await (0, guild_project_service_1.recordGuildProjectContribution)(repo, 'p1', event('e1'), { guildIdAtSettlement: 'g1', guildProjectInstanceIds: ['p1'] });
    node_assert_1.strict.ok(first.creditedPoints > 0);
    node_assert_1.strict.equal(repo.bindings.get('2026-09-14:account'), 'g1');
    const hopped = await (0, guild_project_service_1.recordGuildProjectContribution)(repo, 'p2', event('e2'), { guildIdAtSettlement: 'g2', guildProjectInstanceIds: ['p2'] });
    node_assert_1.strict.equal(hopped.creditedPoints, 0, 'cycle binding must stop guild hopping from feeding a second weekly project');
    const duplicate = await (0, guild_project_service_1.recordGuildProjectContribution)(repo, 'p1', event('e1'), { guildIdAtSettlement: 'g1', guildProjectInstanceIds: ['p1'] });
    node_assert_1.strict.equal(duplicate.creditedPoints, 0, 'retry must be idempotent');
    console.log('v18 guild project service/binding tests passed');
}
run();

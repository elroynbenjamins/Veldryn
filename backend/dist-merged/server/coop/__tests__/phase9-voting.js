"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const decisions_1 = require("../decisions");
const accounts = ['a', 'b', 'c', 'd'], options = ['A', 'B', 'C'];
function setup(id) { const repository = new decisions_1.MemoryDecisionRepository(); const service = new decisions_1.LiveDecisionService(repository, 'vote-secret'); const decision = service.open({ id, revision: 1, optionIds: options, eligibleAccountIds: accounts, openedAtMs: 0, balancedFallbackOptionId: 'B', tieKey: `tie-${id}` }); return { service, decision }; }
let x = setup('unanimous');
let row = x.decision;
for (const accountId of accounts)
    row = x.service.vote({ decisionId: row.id, revision: 1, accountId, optionId: 'A', requestId: `r-${accountId}`, nowMs: 1 });
node_assert_1.strict.equal(row.status, 'resolved');
node_assert_1.strict.equal(row.selectedOptionId, 'A');
node_assert_1.strict.equal(row.resolutionReason, 'unanimous');
x = setup('three');
row = x.decision;
for (const accountId of accounts.slice(0, 3))
    row = x.service.vote({ decisionId: row.id, revision: 1, accountId, optionId: 'A', requestId: `r-${accountId}`, nowMs: 1 });
node_assert_1.strict.equal(row.status, 'open');
row = x.service.resolveDeadline(row.id, 8_000);
node_assert_1.strict.equal(row.selectedOptionId, 'A');
x = setup('split');
row = x.decision;
for (const [index, vote] of ['A', 'A', 'B', 'C'].entries())
    row = x.service.vote({ decisionId: row.id, revision: 1, accountId: accounts[index], optionId: vote, requestId: `r${index}`, nowMs: 1 });
node_assert_1.strict.equal(row.status, 'open');
row = x.service.resolveDeadline(row.id, 8_000);
node_assert_1.strict.equal(row.selectedOptionId, 'A');
x = setup('tie');
row = x.decision;
for (const [index, vote] of ['A', 'A', 'B', 'B'].entries())
    row = x.service.vote({ decisionId: row.id, revision: 1, accountId: accounts[index], optionId: vote, requestId: `r${index}`, nowMs: 1 });
row = x.service.resolveDeadline(row.id, 8_000);
node_assert_1.strict.ok(row.selectedOptionId === 'A' || row.selectedOptionId === 'B');
node_assert_1.strict.equal(row.resolutionReason, 'tie');
x = setup('abstain-tie');
row = x.decision;
for (const [index, vote] of ['A', 'B'].entries())
    row = x.service.vote({ decisionId: row.id, revision: 1, accountId: accounts[index], optionId: vote, requestId: `r${index}`, nowMs: 1 });
row = x.service.resolveDeadline(row.id, 8_000);
node_assert_1.strict.ok(row.selectedOptionId === 'A' || row.selectedOptionId === 'B');
x = setup('none');
row = x.service.resolveDeadline(x.decision.id, 8_000);
node_assert_1.strict.equal(row.selectedOptionId, 'B');
node_assert_1.strict.equal(row.resolutionReason, 'no_votes');
node_assert_1.strict.equal((0, decisions_1.progressionAfterDecision)(1, row).pause, true);
x = setup('change');
row = x.service.vote({ decisionId: x.decision.id, revision: 1, accountId: 'a', optionId: 'A', requestId: 'first', nowMs: 1 });
row = x.service.vote({ decisionId: row.id, revision: 1, accountId: 'a', optionId: 'B', requestId: 'second', nowMs: 2 });
node_assert_1.strict.equal(Object.keys(row.votes).length, 1);
node_assert_1.strict.equal(row.votes.a, 'B');
row = x.service.vote({ decisionId: row.id, revision: 1, accountId: 'a', optionId: 'B', requestId: 'second', nowMs: 3 });
node_assert_1.strict.equal(Object.keys(row.votes).length, 1);
let conflict = '';
try {
    x.service.vote({ decisionId: row.id, revision: 1, accountId: 'a', optionId: 'C', requestId: 'second', nowMs: 4 });
}
catch (error) {
    conflict = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(conflict, 'idempotency_conflict');
x = setup('late');
row = x.service.resolveDeadline(x.decision.id, 8_000);
let late = '';
try {
    x.service.vote({ decisionId: row.id, revision: 1, accountId: 'a', optionId: 'A', requestId: 'late', nowMs: 8_000 });
}
catch (error) {
    late = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(late, 'vote_closed');
node_assert_1.strict.equal(x.service.resolveDeadline(row.id, 8_001).selectedOptionId, row.selectedOptionId);
console.log('coop phase9 voting OK');

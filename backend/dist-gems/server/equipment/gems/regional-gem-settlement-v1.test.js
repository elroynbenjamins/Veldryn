"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const regional_gem_settlement_v1_1 = require("./regional-gem-settlement-v1");
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_006', 'enemy'), 'ZONE_006');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_007', 'elite'), 'ZONE_007');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_008', 'elite'), 'ZONE_008');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_009', 'elite'), 'ZONE_009');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_010', 'regional_boss'), 'ZONE_010');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_007', 'enemy'), undefined, 'Standard kills must not advance elite pity');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('ZONE_010', 'elite'), undefined, 'Elite kills must not advance regional-boss pity');
node_assert_1.strict.equal((0, regional_gem_settlement_v1_1.regionalGemSourceForEncounterV1)('COP_004', 'regional_boss'), undefined, 'Co-op pools use their entitlement settlement path');
const calls = [];
const rpc = {
    async rpc(name, args) {
        calls.push({ name, args });
        return { eligible: true, sourceId: String(args.p_source_id), gemItemId: 'raw_gem:effect_execution:g3', pityTriggered: true, regionalCatalysts: 1 };
    },
};
async function main() {
    const settled = await (0, regional_gem_settlement_v1_1.settleVerifiedRegionalGemEncounterV1)(rpc, { accountId: 'account-1', receiptKey: 'regional:boss:receipt-001', zoneId: 'ZONE_010', kind: 'regional_boss', victory: true });
    node_assert_1.strict.equal(settled.sourceId, 'ZONE_010');
    node_assert_1.strict.equal(calls.length, 1);
    node_assert_1.strict.equal(calls[0].name, 'settle_regional_gem_source_server_v1');
    node_assert_1.strict.deepEqual(calls[0].args, { p_account_id: 'account-1', p_source_id: 'ZONE_010', p_receipt_key: 'regional:boss:receipt-001' });
    const failed = await (0, regional_gem_settlement_v1_1.settleVerifiedRegionalGemEncounterV1)(rpc, { accountId: 'account-1', receiptKey: 'regional:boss:receipt-002', zoneId: 'ZONE_010', kind: 'regional_boss', victory: false });
    node_assert_1.strict.deepEqual(failed, { eligible: false });
    node_assert_1.strict.equal(calls.length, 1, 'Failed encounters must never call reward settlement');
    const wrongKind = await (0, regional_gem_settlement_v1_1.settleVerifiedRegionalGemEncounterV1)(rpc, { accountId: 'account-1', receiptKey: 'regional:normal:receipt-003', zoneId: 'ZONE_007', kind: 'enemy', victory: true });
    node_assert_1.strict.deepEqual(wrongKind, { eligible: false });
    node_assert_1.strict.equal(calls.length, 1, 'Normal kills must never consume elite pity');
    let invalid = false;
    try {
        await (0, regional_gem_settlement_v1_1.settleVerifiedRegionalGemEncounterV1)(rpc, { accountId: 'account-1', receiptKey: 'bad', zoneId: 'ZONE_010', kind: 'regional_boss', victory: true });
    }
    catch (error) {
        invalid = error instanceof Error && error.message === 'invalid_regional_gem_receipt';
    }
    node_assert_1.strict.ok(invalid, 'Regional settlement receipt keys must be validated before RPC execution');
    console.log('PASS: regional gem settlement boundary and source-kind isolation');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const application_1 = require("../application");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
let written;
let busyCompanionIds = [];
const repo = {
    async getCharacter(characterId) { return characterId === 'C1' ? { characterId: 'C1', accountId: 'A1', classId: 'WAYFINDER' } : null; },
    async listOwnedCompanionIds() { return ['UNIT_001', 'UNIT_002']; },
    async listBusyCompanionIds() { return busyCompanionIds; },
    async setEquippedCompanion(input) { written = input.companionId; },
};
const app = new application_1.CombatCompanionApplication(repo);
async function run() {
    let failed = false;
    try {
        await app.equip('A1', { characterId: 'C1', companionId: 'UNIT_001', requestId: 'R1' });
    }
    catch (error) {
        failed = error.message === 'same_role_restricted';
    }
    ok(failed, 'Same-role API request was not rejected');
    ok(written === undefined, 'Rejected request wrote a loadout');
    const result = await app.equip('A1', { characterId: 'C1', companionId: 'UNIT_002', requestId: 'R2' });
    ok(result.companionId === 'UNIT_002' && written === 'UNIT_002', 'Valid cross-role API request failed');
    busyCompanionIds = ['UNIT_002'];
    failed = false;
    try {
        await app.equip('A1', { characterId: 'C1', companionId: 'UNIT_002', requestId: 'R2B' });
    }
    catch (error) {
        failed = error.message === 'companion_busy';
    }
    ok(failed, 'Busy Companion Expedition unit was not rejected by character equip boundary');
    busyCompanionIds = [];
    failed = false;
    try {
        await app.equip('OTHER', { characterId: 'C1', companionId: 'UNIT_002', requestId: 'R3' });
    }
    catch (error) {
        failed = error.message === 'character_not_owned';
    }
    ok(failed, 'Cross-account loadout write was not rejected');
    console.log('companion-application: PASS');
}
void run();

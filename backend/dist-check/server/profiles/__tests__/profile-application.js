"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const profile_api_contracts_1 = require("../profile-api-contracts");
const profile_application_1 = require("../profile-application");
const sample = { displayName: 'Aster', visibility: 'public', revision: 1, character: { name: 'Aster', classId: 'warden', level: 12, bodyPresentation: 'female' }, title: { id: 'title.base', name: 'Adventurer' }, backgroundId: 'asterfall-night', characterCount: 1, ownedTitleIds: ['title.base'] };
class Memory {
    async self() { return sample; }
    async publicProfile() { return sample; }
    async update(_id, _input, nowMs) { return { profile: sample, idempotentReplay: nowMs === 1 }; }
}
const expectThrow = (fn) => { let threw = false; try {
    fn();
}
catch {
    threw = true;
} node_assert_1.strict.equal(threw, true); };
const service = new profile_application_1.ProfileApplicationService(new Memory());
const parsed = (0, profile_api_contracts_1.parseProfileUpdateRequest)({ requestId: 'request-1', displayName: 'Aster', activeCharacterId: 'LOCAL_CHAR_1', titleId: 'title.base', backgroundId: 'asterfall-night', visibility: 'private' });
node_assert_1.strict.equal(parsed.visibility, 'private');
expectThrow(() => (0, profile_api_contracts_1.parseProfileUpdateRequest)({ requestId: 'short', displayName: 'Aster', activeCharacterId: 'x', titleId: 't', backgroundId: 'b', visibility: 'public' }));
expectThrow(() => service.self(''));
expectThrow(() => service.update('a', parsed, Number.NaN));
void service.update(' account-a ', parsed, 1).then(result => { node_assert_1.strict.equal(result.idempotentReplay, true); console.log('profile application PASS'); });

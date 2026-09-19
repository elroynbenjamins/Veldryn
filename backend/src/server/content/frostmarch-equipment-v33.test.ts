import assert from 'node:assert/strict';
import {FROSTMARCH_EQUIPMENT_POLICY_V33,validateFrostmarchEquipmentPolicyV33} from './frostmarch-equipment-v33';
assert.deepEqual(validateFrostmarchEquipmentPolicyV33(),[]);
assert.equal(FROSTMARCH_EQUIPMENT_POLICY_V33.slotCount,10);
assert.deepEqual(FROSTMARCH_EQUIPMENT_POLICY_V33.thresholds,[2,4,6,8,10]);
assert.equal(FROSTMARCH_EQUIPMENT_POLICY_V33.skinCompletionPieces,10);
console.log('v33 Frostmarch equipment policy passed');

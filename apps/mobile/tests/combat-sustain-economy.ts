import {strict as assert} from 'node:assert';
import {dungeonConsumablePolicy} from '../../backend/src/server/coop/consumable-policy';
import {companionExpeditionProvisionPolicy} from '../src/core/companion-provisions';

for(let tier=1;tier<=5;tier++){
 const policy=dungeonConsumablePolicy(tier);
 assert.equal(policy.foodAllowed,false,'dungeon food must remain disabled');
 assert.ok(policy.potionCharges>=3&&policy.potionCharges<=5,'potion budget must stay limited');
}
assert.deepEqual([1,2,4,8,16,24].map(h=>companionExpeditionProvisionPolicy(h).foodUnits),[1,1,1,2,4,6]);
assert.ok(companionExpeditionProvisionPolicy(24).rewardBonusPercent<=5,'provisions must remain a small bonus, not mandatory power');
console.log('PASS dungeon consumables and companion provision policy');

import {assert} from './test-assert';
import {companionExpeditionProvisionPolicy,companionExpeditionStaminaCost} from '../src/core/companion-provisions';

const hours=[1,2,4,8,16,24];
assert.deepEqual(hours.map(companionExpeditionStaminaCost),[50,50,50,50,100,150]);
assert.deepEqual(hours.map(h=>companionExpeditionProvisionPolicy(h).healingHpEquivalent),[500,500,500,500,1000,1500]);
assert.ok(companionExpeditionProvisionPolicy(24).rewardBonusPercent<=5,'provisions must remain a small reward bonus rather than paid-style power');
console.log('PASS companion expedition Stamina provision policy');

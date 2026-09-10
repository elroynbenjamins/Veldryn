import { strict as assert } from 'node:assert';
import { COOP_ROGUELITE_CONFIG,coopRequiredLevel } from '../config';
import { hasExactCoopRoles, validateCoopRoster, validatePreBossNodeCount } from '../invariants';
import { canStartExpedition } from '../../social/party';

function expectError(fn: () => void, code: string): void {
  let message = '';
  try { fn(); } catch (error) { message = error instanceof Error ? error.message : String(error); }
  assert.equal(message, code);
}

assert.equal(COOP_ROGUELITE_CONFIG.featureFlag, 'coopRogueliteV1');
assert.equal(COOP_ROGUELITE_CONFIG.enabledByDefault, false);
assert.equal(hasExactCoopRoles(['tank', 'damage', 'damage', 'support']), true);
assert.equal(hasExactCoopRoles(['damage', 'damage', 'damage', 'damage']), false);
assert.equal(hasExactCoopRoles(['tank', 'tank', 'damage', 'support']), false);
expectError(() => validateCoopRoster([
  { accountId: 'a', characterId: '1', role: 'tank' },
  { accountId: 'a', characterId: '2', role: 'damage' },
  { accountId: 'c', characterId: '3', role: 'damage' },
  { accountId: 'd', characterId: '4', role: 'support' },
]), 'duplicate_coop_account');
validatePreBossNodeCount(5);
for (const count of [4, 6, 7]) expectError(() => validatePreBossNodeCount(count), 'invalid_coop_route_length');
assert.deepEqual([1,2,3,4,5].map(tier=>coopRequiredLevel(15,tier as 1|2|3|4|5)),[15,20,25,30,35]);
assert.equal(COOP_ROGUELITE_CONFIG.targetRunMinutesMin,6);
assert.equal(COOP_ROGUELITE_CONFIG.targetRunMinutesMax,8);

// The legacy party/squad boundary remains untouched by this feature module.
assert.equal(canStartExpedition([{ characterId: 'legacy', role: 'damage', power: 1, online: true }]), true);

console.log('coop phase1 invariants OK');

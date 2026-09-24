import {assert} from './test-assert';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {COMPANION_AFFINITIES,companionAffinity,companionAffinityDiversity} from '../src/core/companion-affinities';

const affinities=COMBAT_COMPANIONS.map(companionAffinity);
assert.ok(new Set(affinities).size>=5,'launch roster should span at least five affinities');
for(const affinity of affinities)assert.ok(COMPANION_AFFINITIES[affinity]);
const roles=new Set(COMBAT_COMPANIONS.map(x=>x.role));
assert.equal(roles.size,3);
assert.ok(companionAffinityDiversity(COMBAT_COMPANIONS)>=5);
for(const affinity of new Set(affinities)){const defs=COMBAT_COMPANIONS.filter(x=>companionAffinity(x)===affinity);assert.ok(new Set(defs.map(x=>x.role)).size>=1);}
console.log('PASS companion Affinity taxonomy and roster coverage');

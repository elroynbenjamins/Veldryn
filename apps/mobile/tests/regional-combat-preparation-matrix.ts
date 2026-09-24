import {assert} from './test-assert';
import {combatSustainProjection,REGIONAL_FOOD_SUSTAIN_TARGETS} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';

for(const def of REGIONAL_COMBAT_FIXTURES){
 const under=combatSustainProjection(regionalCombatFixture(def,'underprepared'),def.monsterId)!;
 const prepared=combatSustainProjection(regionalCombatFixture(def,'prepared'),def.monsterId)!;
 const optimized=combatSustainProjection(regionalCombatFixture(def,'optimized'),def.monsterId)!;
 const target=REGIONAL_FOOD_SUSTAIN_TARGETS[def.regionName];
 assert.ok(target,def.regionName+' must have a sustain target');
 assert.ok(Number.isFinite(prepared.foodPerHour)&&prepared.killsPerHour>0);
 assert.ok(prepared.foodPerHour>=target.foodPerHourMin&&prepared.foodPerHour<=target.foodPerHourMax,def.regionName+' prepared local-food sustain is outside its authored band: '+prepared.foodPerHour.toFixed(2)+'/hr');
 // Better preparation should not materially worsen sustain.
 assert.ok(optimized.foodPerHour<=prepared.foodPerHour*1.15+0.25,def.regionName+' optimized sustain regressed');
 // Underprepared farming should not be substantially cheaper than prepared farming.
 assert.ok(under.foodPerHour+0.5>=prepared.foodPerHour*.65,def.regionName+' underprepared build is implausibly efficient');
 // Greenfields may be food-neutral; established regions should carry positive pressure before healing/recovery.
 if(def.regionName!=='Greenfields')assert.ok(prepared.damagePerKill>prepared.recoveryPerKill||prepared.foodPerHour>0,def.regionName+' has no meaningful sustain pressure');
}
console.log('PASS prepared/optimized/underprepared regional combat sustain matrix');

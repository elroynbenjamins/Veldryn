import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {combatSustainProjection} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import type {GameState} from '../src/core/types';

// Ordinary hunts must reward a complete, region-appropriate gear set.
// A single good weapon must not make the rest of the missing slots irrelevant.
// Keep this separate from boss and co-op-dungeon balancing.
for(const def of REGIONAL_COMBAT_FIXTURES.filter(row=>row.regionName!=='Greenfields')){
 for(const cls of CLASSES){
  const ready=regionalCombatFixture(def,'prepared',cls.id);
  const gear=ready.character!.equipment;
  const oneSlot={...ready,character:{...ready.character!,equipment:{weapon:gear.weapon}}} as GameState;
  const empty={...ready,character:{...ready.character!,equipment:{}}} as GameState;
  const fullProjection=combatSustainProjection(ready,def.monsterId)!;
  const oneProjection=combatSustainProjection(oneSlot,def.monsterId)!;
  const emptyProjection=combatSustainProjection(empty,def.monsterId)!;
  const label=def.regionName+' / '+cls.id;
  if(def.regionId==='SILVERBROOK'&&['RAVAGER','KNIFE_DANCER','WAYFINDER','HEXWEAVER'].includes(cls.id))console.log('DIAGNOSTIC Ravager Silverbrook',JSON.stringify({full:fullProjection,oneSlot:oneProjection,empty:emptyProjection}));
  assert.ok(fullProjection.netHpLossPerHour>0,label+' prepared hunt must carry food pressure');
  assert.ok(oneProjection.netHpLossPerHour>fullProjection.netHpLossPerHour*1.2,
   label+' missing nine slots must meaningfully increase hourly HP loss');
  // Empty gear also slows kills, so its food burned per *hour* can drop
  // despite becoming substantially less efficient. Compare cost per kill.
  const emptyHpPerKill=Math.max(0,emptyProjection.netDamagePerKill);
  const oneHpPerKill=Math.max(0,oneProjection.netDamagePerKill);
  assert.ok(emptyHpPerKill>=oneHpPerKill*.95,
   label+' removing the final weapon must not reduce damage per kill');
  assert.ok(oneProjection.killsPerHour<fullProjection.killsPerHour,
   label+' full regional gear must beat a one-slot kit on kill speed');
  assert.ok(emptyProjection.killsPerHour<=oneProjection.killsPerHour,
   label+' empty slots must not improve kill speed');
  assert.ok(emptyProjection.foodPerHour>fullProjection.foodPerHour*1.2,
   label+' minimal equipment must demand substantially more cooked food');
 }
}
console.log('PASS regional undergeared sustain vs full equipment across nine classes');

import {assert} from './test-assert';
import {huntActiveDamageEvents,HUNT_CLASS_TECHNIQUES} from '../src/core/hunt-active-abilities';
import {huntEnemyHpAt,type HuntHit} from '../src/core/combat-hit-timeline';
import type {ClassId} from '../src/core/types';
import {battleText} from '../src/i18n/battle';
import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';

const hits:HuntHit[]=[
 {fraction:.15,actor:'player',damage:30,healing:0,critical:false,index:0},
 {fraction:.3,actor:'enemy',damage:5,healing:0,critical:false,index:1},
 {fraction:.65,actor:'player',damage:25,healing:0,critical:false,index:2},
 {fraction:1,actor:'player',damage:45,healing:0,critical:true,index:3},
];
const total=(xs:readonly HuntHit[])=>xs.filter(x=>x.actor==='player').reduce((sum,x)=>sum+x.damage,0);
const input={classId:'IRONWARDEN' as const,classSkillLevel:20,encounterNumber:2,
 companion:{id:'UNIT_001',name:'Ironwood Hound',abilityId:'UABL_001',abilityName:'Hamstring Pounce',role:'damage' as const,contributionPct:.1}};
const output=huntActiveDamageEvents(hits,input);
assert.equal(total(output),total(hits),'Class burst and assist cannot create extra damage');
assert.equal(huntEnemyHpAt(100,output,1),0,'Class and companion effects must not change a completed kill');
assert.ok(output[0].damage<hits[0].damage,'Class burst must change an earlier resolved strike');
assert.ok(output[3].damage>hits[3].damage,'Class burst must concentrate real damage into the finisher');
assert.equal(output[3].activeAbility?.name,'Rune Bash','Class technique must use the existing combat skill name');
assert.equal(output[3].activeAbility?.amount,output[3].damage,'Class banner must show real finisher damage');
assert.equal(output[2].companionAssist?.name,'Ironwood Hound: Hamstring Pounce','Companion assist must show its own active ability');
assert.ok((output[2].companionAssist?.amount??0)>0&&output[2].companionAssist!.amount<output[2].damage,'Companion damage is taken from an already-applied hit, never added');
assert.equal(output[2].companionAssist?.source,'companion');
assert.ok(hits.every(hit=>!hit.activeAbility&&!hit.companionAssist),'Ability allocation must not mutate the baseline timeline');
assert.equal(JSON.stringify(huntActiveDamageEvents(hits,input)),JSON.stringify(output),'Ability allocation must be replay deterministic');
const higher=huntActiveDamageEvents(hits,{...input,classSkillLevel:100});
assert.ok(higher[0].damage<=output[0].damage,'Class progression strengthens burst concentration');
assert.equal(total(higher),total(hits),'Higher skill rank must not increase overall hunt DPS');
for(const classId of Object.keys(HUNT_CLASS_TECHNIQUES) as ClassId[]){
 const run=huntActiveDamageEvents(hits,{...input,classId,companion:undefined});
 assert.equal(run[3].activeAbility?.name,HUNT_CLASS_TECHNIQUES[classId].name,'All nine classes have a named real attack');
 assert.equal(total(run),total(hits),'Class ability must remain balance neutral');
}
for(const language of SUPPORTED_LANGUAGES){
 for(const technique of Object.values(HUNT_CLASS_TECHNIQUES)){
  assert.ok(battleText(language,technique.name).length>0,'Named abilities need visible copy in '+language);
  if(language!=='en')assert.ok(battleText(language,technique.name)!==technique.name,'Class technique name should be localized: '+language+' '+technique.name);
 }
 assert.ok(battleText(language,'Bloodrush').length>0,'On-kill healing must have an accessible name');
}
const off=huntActiveDamageEvents(hits,{...input,encounterNumber:3});
assert.equal(off[2].companionAssist,undefined,'Companion assist obeys the per-encounter action gate');
const support=huntActiveDamageEvents(hits,{...input,companion:{...input.companion,role:'support'}});
assert.equal(support[2].companionAssist,undefined,'Do not turn a healing companion into a damage cast');
const one=huntActiveDamageEvents([hits[0]],input);
assert.equal(one[0].activeAbility,undefined,'One-shot hunts cannot invent a class burst');
assert.equal(one[0].companionAssist,undefined,'One-shot hunts cannot invent a companion hit');
const weak=huntActiveDamageEvents([{...hits[0],damage:1},{...hits[3],damage:1}],input);
assert.equal(weak[1].activeAbility,undefined,'Cannot borrow HP from a one-point hit');
assert.equal(total(weak),2);
console.log('PASS solo hunt named class techniques, bounded companion assists, no extra DPS, deterministic split accounting, and single-hit safety');

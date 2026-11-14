import {assert} from './test-assert';
import {huntActiveDamageEvents,huntTankGuardEvents,HUNT_CLASS_TECHNIQUES} from '../src/core/hunt-active-abilities';
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
const guardInput={combatStartedAtMs:100_000,encounterStartedAtMs:100_000,cycleSeconds:10,
 companion:{id:'UNIT_002',name:'Runebound Sentry',abilityId:'UABL_002',abilityName:'Rune Brace',role:'tank' as const,activeKind:'damage_reduction',cooldownSeconds:18,incomingDamageMultiplier:.94}};
const enemyHits:HuntHit[]=[
 {fraction:.3,actor:'enemy',damage:30,healing:0,critical:false,index:0},
 {fraction:.6,actor:'enemy',damage:20,healing:0,critical:false,index:1},
 {fraction:.999,actor:'fatigue',damage:3,healing:0,critical:false,index:2},
];
const guarded=huntTankGuardEvents(enemyHits,guardInput);
assert.equal(guarded[0].guardAbility?.name,'Runebound Sentry: Rune Brace','Tank guard must identify the real equipped ability');
assert.equal(guarded[0].guardAbility?.kind,'shield');
assert.ok((guarded[0].guardAbility?.amount??0)>0,'Guard needs real nonzero prevented damage');
assert.ok((guarded[0].guardAbility?.amount??0)<=enemyHits[0].damage*.025+1e-6,'Tank shield must stay below 2.5% of one incoming strike');
assert.ok(guarded[0].damage<enemyHits[0].damage,'The skill must mechanically prevent damage');
assert.equal(guarded[1].damage,enemyHits[1].damage,'Unprotected strikes must remain unchanged');
assert.equal(guarded[2].damage,enemyHits[2].damage,'A tank shield must not erase authored fatigue');
assert.ok(enemyHits.every(hit=>!hit.guardAbility),'Tank skill must not mutate source events');
assert.equal(JSON.stringify(guarded),JSON.stringify(huntTankGuardEvents(enemyHits,guardInput)),'Tank cooldown and mitigation must replay deterministically');
assert.ok(huntTankGuardEvents(enemyHits,{...guardInput,encounterStartedAtMs:110_000}).every(hit=>!hit.guardAbility),'No tank cast before the next cooldown pulse');
const lateGuard=huntTankGuardEvents(enemyHits,{...guardInput,encounterStartedAtMs:130_000});
assert.equal(lateGuard[0].guardAbility,undefined,'A shield cannot trigger before its scheduled pulse');
assert.ok(!!lateGuard[1].guardAbility,'The first enemy hit after a cooldown pulse must consume the tank shield');
assert.ok(huntTankGuardEvents(enemyHits,{...guardInput,companion:{...guardInput.companion,incomingDamageMultiplier:1}}).every(hit=>!hit.guardAbility),'No defensive effect may appear without a real defensive companion bonus');
assert.ok(huntTankGuardEvents(enemyHits,{...guardInput,companion:{...guardInput.companion,role:'support'}}).every(hit=>!hit.guardAbility),'Support companions must not gain tank skills');
assert.ok(huntTankGuardEvents(enemyHits,{...guardInput,companion:{...guardInput.companion,activeKind:'heal'}}).every(hit=>!hit.guardAbility),'Only real shield or damage reduction abilities can guard');
for(const language of SUPPORTED_LANGUAGES){
 const shield=battleText(language,'SHIELD · {amount}',{amount:12});
 assert.ok(shield.includes('12'),'Shield amount must remain localized without losing its numeric amount: '+language);
}

console.log('PASS solo hunt named class techniques, bounded companion assists, no extra DPS, deterministic split accounting, single-hit safety, and real cooldown-gated tank mitigation');

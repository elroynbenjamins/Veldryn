import {assert} from './test-assert';
import {huntActiveDamageEvents,huntSupportHealEvents,huntTankGuardEvents,huntCooldownPulseAt,HUNT_CLASS_TECHNIQUES} from '../src/core/hunt-active-abilities';
import {huntEnemyHpAt,huntHitsBetween,type HuntHit} from '../src/core/combat-hit-timeline';
import {huntClassSurvivalEvents,HUNT_CLASS_SURVIVAL_PROFILES} from '../src/core/hunt-class-identity';
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
const input={classId:'RAVAGER' as const,classSkillLevel:20,combatStartedAtMs:100_000,encounterStartedAtMs:100_000,cycleSeconds:10,
 companion:{id:'UNIT_001',name:'Ironwood Hound',abilityId:'UABL_001',abilityName:'Hamstring Pounce',role:'damage' as const,contributionPct:.1,cooldownSeconds:14}};
const output=huntActiveDamageEvents(hits,input);
assert.equal(total(output),total(hits),'Class burst and assist cannot create extra damage');
assert.equal(huntEnemyHpAt(100,output,1),0,'Class and companion effects must not change a completed kill');
assert.ok(output[0].damage<hits[0].damage,'Class burst must change an earlier resolved strike');
assert.ok(output[3].damage>hits[3].damage,'Class burst must concentrate real damage into the finisher');
assert.equal(output[3].activeAbility?.name,'Titan Swing','Class technique must use the existing combat skill name');
assert.equal(output[3].activeAbility?.amount,output[3].damage,'Class banner must show real finisher damage');
assert.equal(output[2].companionAssist?.name,'Ironwood Hound: Hamstring Pounce','Companion assist must show its own active ability');
assert.ok((output[2].companionAssist?.amount??0)>0&&output[2].companionAssist!.amount<output[2].damage,'Companion damage is taken from an already-applied hit, never added');
assert.equal(output[2].companionAssist?.source,'companion');
assert.ok(hits.every(hit=>!hit.activeAbility&&!hit.companionAssist),'Ability allocation must not mutate the baseline timeline');
assert.equal(JSON.stringify(huntActiveDamageEvents(hits,input)),JSON.stringify(output),'Ability allocation must be replay deterministic');
const higher=huntActiveDamageEvents(hits,{...input,classSkillLevel:100});
assert.ok(higher[0].damage<=output[0].damage,'Class progression strengthens burst concentration');
assert.equal(total(higher),total(hits),'Higher skill rank must not increase overall hunt DPS');
const damageClasses:ClassId[]=['WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER'];
for(const classId of Object.keys(HUNT_CLASS_TECHNIQUES) as ClassId[]){
 const run=huntActiveDamageEvents(hits,{...input,classId,companion:undefined});
 const active=run.filter(hit=>hit.activeAbility);
 assert.equal(active.length,damageClasses.includes(classId)?1:0,'Damage skills must not impersonate class guard/healing effects: '+classId);
 if(active.length)assert.equal(active[0].activeAbility?.name,HUNT_CLASS_TECHNIQUES[classId].name);
 assert.equal(total(run),total(hits),'Class ability must not change kill output: '+classId);
}
const wayfinder=huntActiveDamageEvents(hits,{...input,classId:'WAYFINDER'});
assert.ok(wayfinder[0].damage>hits[0].damage&&wayfinder[3].damage<hits[3].damage,'Windshot advances existing damage into an earlier shot');
const ravager=huntActiveDamageEvents(hits,{...input,classId:'RAVAGER'});
assert.ok(ravager[3].damage>hits[3].damage,'Titan Swing concentrates on a finishing blow');
const hexweaver=huntActiveDamageEvents(hits,{...input,classId:'HEXWEAVER'});
assert.ok(hexweaver[2].damage>hits[2].damage&&hexweaver[3].damage>hits[3].damage,'Black Thread carries real damage through linked strikes');
const dancer=huntActiveDamageEvents(hits,{...input,classId:'KNIFE_DANCER'});
assert.ok(dancer[2].damage>hits[2].damage&&dancer[3].damage<hits[3].damage,'Scarlet Loop brings the follow-up forward');
for(const language of SUPPORTED_LANGUAGES){
 for(const technique of Object.values(HUNT_CLASS_TECHNIQUES)){
  assert.ok(battleText(language,technique.name).length>0,'Named abilities need visible copy in '+language);
  if(language!=='en')assert.ok(battleText(language,technique.name)!==technique.name,'Class technique name should be localized: '+language+' '+technique.name);
 }
 assert.ok(battleText(language,'Bloodrush').length>0,'On-kill healing must have an accessible name');
}
const off=huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:101_000});
assert.equal(off[2].companionAssist,undefined,'Companion assist must not fire before its next 14-second cooldown pulse');
const support=huntActiveDamageEvents(hits,{...input,companion:{...input.companion,role:'support'}});
assert.equal(support[2].companionAssist,undefined,'Do not turn a healing companion into a damage cast');
const classOnCooldown=huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:101_000,cycleSeconds:3});
assert.ok(classOnCooldown.every(hit=>!hit.activeAbility),'Class skill cannot activate when no class cooldown pulse occurs inside the encounter');
const classReady=huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:106_000});
assert.ok(classReady.some(hit=>hit.activeAbility?.name==='Titan Swing'),'Class skill activates on next real cooldown pulse');
const companionReady=huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:114_000});
assert.ok(companionReady.some(hit=>hit.companionAssist?.name==='Ironwood Hound: Hamstring Pounce'),'Companion assist activates on its next real cooldown pulse');
const fullScheduled=huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:114_000});
const splitScheduled=[
 ...huntHitsBetween(huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:114_000}),0,.5),
 ...huntHitsBetween(huntActiveDamageEvents(hits,{...input,encounterStartedAtMs:114_000}),.5,1),
];
assert.equal(JSON.stringify(splitScheduled),JSON.stringify(fullScheduled),'Partial claim must preserve exactly the same cooldown-attributed strikes without duplicates');
assert.equal(total(fullScheduled),total(hits),'Cooldown changes must never add hunt damage or alter rewards');
const seconds=(start:number,cooldown:number)=>huntCooldownPulseAt({combatStartedAtMs:100_000,encounterStartedAtMs:start,cycleSeconds:3,cooldownSeconds:cooldown});
assert.equal(seconds(100_000,14),100_000,'First pulse is ready when a hunting session starts');
assert.equal(seconds(101_000,14),undefined,'Restarting a partial claim cannot refresh a cooldown');
assert.equal(seconds(112_000,14),114_000,'Cooldown pulses follow the original session clock');
assert.equal(seconds(114_000,14),114_000,'Adjacent encounters share one absolute cooldown timeline');
assert.equal(huntCooldownPulseAt({combatStartedAtMs:100_000,encounterStartedAtMs:100_000,cycleSeconds:0,cooldownSeconds:14}),undefined,'Invalid zero-length encounters cannot trigger abilities');
const baseHeal:HuntHit[]=[
 {fraction:.2,actor:'enemy',damage:4,healing:5,critical:false,index:0},
 {fraction:.7,actor:'fatigue',damage:6,healing:5,critical:false,index:1},
];
const supportInput={combatStartedAtMs:100_000,encounterStartedAtMs:100_000,cycleSeconds:10,
 companion:{id:'UNIT_003',name:'Silverbrook Sprite',abilityId:'UABL_003',abilityName:'Silver Current',role:'support' as const,activeKind:'heal',cooldownSeconds:20,healingPctPerHour:.08}};
const firstHeal=huntSupportHealEvents(baseHeal,supportInput);
assert.equal(firstHeal[0].supportAbility?.name,'Silverbrook Sprite: Silver Current','Real support heal is attributed to the first eligible healing tick');
assert.equal(firstHeal[0].healing,baseHeal[0].healing,'Support attribution cannot add extra health');
assert.equal(firstHeal[1].supportAbility,undefined,'Only one support cast per cooldown pulse');
assert.ok(huntSupportHealEvents(baseHeal,{...supportInput,encounterStartedAtMs:110_000}).every(hit=>!hit.supportAbility),'Support cannot cast until its next pulse');
const delayedHeal=huntSupportHealEvents(baseHeal,{...supportInput,encounterStartedAtMs:115_000});
assert.equal(delayedHeal[0].supportAbility,undefined,'Support skill cannot be credited to a heal before its cooldown');
assert.equal(delayedHeal[1].supportAbility?.id,'UABL_003','Support skill activates on the first genuine heal after the pulse');
const secondHeal=huntSupportHealEvents(baseHeal,{...supportInput,encounterStartedAtMs:120_000});
assert.equal(secondHeal[0].supportAbility?.id,'UABL_003','Support can cast again after cooldown');
assert.ok(huntSupportHealEvents(baseHeal,{...supportInput,companion:{...supportInput.companion,role:'tank'}}).every(hit=>!hit.supportAbility),'A tank must not be labeled as a healing support skill');
assert.ok(huntSupportHealEvents(baseHeal,{...supportInput,companion:{...supportInput.companion,healingPctPerHour:0}}).every(hit=>!hit.supportAbility),'No visible heal without an actual restorative companion effect');
assert.ok(baseHeal.every(hit=>!hit.supportAbility),'Pure cooldown attribution must not mutate source heals');

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
 for(const name of ['Rune Brace',"Page's Vow",'Hamstring Pounce','Silver Current']){
  const translated=battleText(language,name);
  assert.ok(translated.length>0,'Starter companion techniques need a visible name: '+language+' '+name);
  if(language!=='en')assert.ok(translated!==name,'Starter companion technique must be localized: '+language+' '+name);
 }
 const shield=battleText(language,'SHIELD · {amount}',{amount:12});
 assert.ok(shield.includes('12'),'Shield amount must remain localized without losing its numeric amount: '+language);
}


/** Class-specific survival effects share the same combat-session clock.
 * They cannot multiply XP or Gold, erase fatigue, or invent a shield/heal
 * when no eligible real strike exists. */
assert.equal(Object.keys(HUNT_CLASS_SURVIVAL_PROFILES).length,5,'All three tank and both support classes need authored identities');
const identityInput={combatStartedAtMs:100_000,encounterStartedAtMs:100_000,cycleSeconds:10,classSkillLevel:20};
for(const classId of Object.keys(HUNT_CLASS_SURVIVAL_PROFILES) as ClassId[]){
 const run=huntClassSurvivalEvents(enemyHits,{...identityInput,classId});
 const activation=run.filter(hit=>!!hit.classGuardAbility||!!hit.classHealAbility);
 assert.equal(activation.length,1,'Every survival class must activate only once per encounter: '+classId);
 assert.equal(activation[0].classGuardAbility?.name??activation[0].classHealAbility?.name,HUNT_CLASS_TECHNIQUES[classId].name);
 assert.equal(total(run),total(enemyHits),'Defensive class casts cannot change enemy HP or player damage: '+classId);
 assert.equal(run[2].damage,enemyHits[2].damage,'No class can remove mandatory fatigue: '+classId);
 assert.ok(run.every(hit=>hit.damage>=0&&hit.healing>=0),'Hunt events must never have negative HP deltas');
 assert.equal(JSON.stringify(run),JSON.stringify(huntClassSurvivalEvents(enemyHits,{...identityInput,classId})),'Class effects must replay deterministically');
 const noReady=huntClassSurvivalEvents(enemyHits,{...identityInput,classId,encounterStartedAtMs:101_000,cycleSeconds:.2});
 assert.ok(noReady.every(hit=>!hit.classGuardAbility&&!hit.classHealAbility),'A new claim cannot refresh class ability cooldowns: '+classId);
 const split=[...huntHitsBetween(run,0,.5),...huntHitsBetween(run,.5,1)];
 assert.equal(JSON.stringify(split),JSON.stringify(run),'Split offline claims must keep the same class effects: '+classId);
}
const iron=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'IRONWARDEN'});
assert.ok(iron[0].classGuardAbility!.amount>0&&iron[0].classGuardAbility!.amount<=enemyHits[0].damage*.09,'Rune Bash must really intercept a small enemy strike');
const bastion=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'BASTION'});
assert.ok(bastion[1].damage<enemyHits[1].damage,'Fortress Rebuff retains a weaker second layer of defense');
assert.ok(!bastion[1].classGuardAbility,'Second defensive layer must not fabricate an extra cast');
const dreadguard=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'DREADGUARD'});
assert.ok((dreadguard[0].classHealingBudget??0)>0,'Binding Chain converts a fraction of prevented damage into recovery');
const dawn=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'DAWNKEEPER'});
assert.ok(dawn[0].classHealAbility?.amount&&dawn[0].healing>enemyHits[0].healing,'Sun Smite gains real bounded restoration, not a free attack');
assert.equal(dawn[0].damage,enemyHits[0].damage,'Dawnkeeper must not secretly block a hit');
const stonecaller=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'STONECALLER'});
assert.ok(stonecaller[0].classGuardAbility?.amount&&stonecaller[0].classHealingBudget,'Thunder Totem blocks damage and restores a small portion');
const highLevel=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'IRONWARDEN',classSkillLevel:100});
assert.ok(highLevel[0].damage<=iron[0].damage,'Guard proficiency should improve mitigation within the cap');
assert.ok(enemyHits.every(hit=>!hit.classGuardAbility&&!hit.classHealAbility),'Class allocation must not modify the source encounter');
for(const classId of damageClasses){
 const untouched=huntClassSurvivalEvents(enemyHits,{...identityInput,classId});
 assert.ok(untouched.every(hit=>!hit.classGuardAbility&&!hit.classHealAbility),'Damage classes cannot acquire a defensive class skill: '+classId);
}
const noMonster=huntClassSurvivalEvents([enemyHits[2]],{...identityInput,classId:'BASTION'});
assert.ok(noMonster.every(hit=>!hit.classGuardAbility),'A fortress cast cannot trigger on fatigue alone');
const pending=huntClassSurvivalEvents(enemyHits,{...identityInput,classId:'DAWNKEEPER',encounterStartedAtMs:101_000,cycleSeconds:1});
assert.ok(!pending[0].classHealAbility,'Sunlight cannot heal before its next original-session cooldown pulse');
const absoluteBound=(rows:readonly HuntHit[])=>rows.reduce((sum,row)=>sum+row.damage,0);
for(const classId of ['IRONWARDEN','BASTION','DREADGUARD','STONECALLER'] as ClassId[]){
 const row=huntClassSurvivalEvents(enemyHits,{...identityInput,classId,classSkillLevel:100});
 const improvement=absoluteBound(enemyHits)-absoluteBound(row);
 assert.ok(improvement>=0&&improvement<=enemyHits[0].damage*.09+enemyHits[1].damage*.04+1e-6,'Class protection must remain bounded at rank 100: '+classId);
}

console.log('PASS nine class identities, damage, tank and support cooldowns, budget limits, deterministic effects, claim-safe schedules, and translations');

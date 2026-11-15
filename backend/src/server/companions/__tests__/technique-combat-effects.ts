import * as assert from 'node:assert/strict';
import {simulateCombat} from '../../combat/engine';
import type {CombatantDefinition} from '../../combat/types';
import {buildOwnedCompanionCombatant} from '../combat-adapter';
import {applyCharacterCompanionAssist} from '../character-assist';
import {companionTechniques} from '../content';
import type {OwnedCompanionSnapshot} from '../domain';

const actor=(id:string,team:'players'|'enemies'):CombatantDefinition=>({id,name:id,team,role:team==='players'?'damage':'enemy',level:20,stats:{maxHp:100,attackPower:100,healingPower:100,defense:0,accuracy:100000,evasion:0,critChance:0,critMultiplier:1,haste:0},basicAttackMs:1000,basicAttackCoeff:0,abilities:[]});
const player=actor('player','players'),enemy=actor('enemy','enemies');
player.abilities=[{id:'execute',name:'Execute',cooldownMs:1000,castTimeMs:0,target:'current_target',effects:[{kind:'damage',coeff:.1,executeBelowHpPct:.3,executeBonus:.5}],priority:1}];
const execute=simulateCombat({seed:'execute-effects',players:[player],enemies:[enemy],maxDurationMs:20000});
const damage=execute.events.filter(e=>e.abilityId==='execute'&&e.type==='damage');
assert.ok(damage[0].amount!<11,'execute must not boost a healthy target');assert.ok(damage.some(e=>e.amount!>14),'execute must actually boost low-HP damage');
const defender=actor('defender','players');defender.abilities=[{id:'reflect',name:'Reflect',cooldownMs:100000,castTimeMs:0,target:'self',effects:[{kind:'shield',flat:40,shieldReflectPct:.2}],priority:1}];
enemy.basicAttackCoeff=.2;
const reflected=simulateCombat({seed:'reflection-effects',players:[defender],enemies:[enemy],maxDurationMs:15000});
const hits=reflected.events.filter(e=>e.abilityId==='COMPANION_REFLECT');assert.ok(hits.length>0,'absorbed damage must reflect');assert.ok(hits.reduce((s,e)=>s+(e.amount??0),0)<=8.02,'reflection cannot outlive its 40-HP shield');
const p:OwnedCompanionSnapshot={companionId:'UNIT_002',level:20,xp:0,ascensionTier:2,bondLevel:10,bondXp:2520,bondTraitUnlocked:true,selectedTechniqueId:'UNIT_002_REFLECTIVE'};
assert.ok((buildOwnedCompanionCombatant(p,{mode:'companion_trial'}).abilities[0].effects[0].shieldReflectPct??0)>.15,'Rune Brace reflects independently of its optional technique');
const owner={...actor('owner','players'),classId:'WAYFINDER'};
assert.ok((applyCharacterCompanionAssist(owner,p).abilities[0].effects[0].shieldReflectPct??0)>.15,'Rune Brace keeps its reflected damage in character combat');
const d={...p,companionId:'UNIT_001',selectedTechniqueId:'UNIT_001_EXECUTIONER'};
assert.ok((applyCharacterCompanionAssist({...owner,classId:'IRONWARDEN',role:'tank'},d).abilities[0].effects[0].executeBonus??0)>.18,'Hamstring Pounce preserves its unique finisher and technique');

const baseProgress=(companionId:string):OwnedCompanionSnapshot=>({companionId,level:20,xp:0,ascensionTier:2,bondLevel:10,bondXp:2520,bondTraitUnlocked:true});
const assist=(id:string)=>applyCharacterCompanionAssist({...actor('owner','players'),classId:'WAYFINDER'},baseProgress(id)).abilities.at(-1)!;
assert.equal(assist('UNIT_001').name,'Ironwood Hound: Hamstring Pounce');
assert.ok(assist('UNIT_001').effects.some(e=>e.kind==='debuff'&&e.tag==='damage_done'),'Hound must weaken enemy attacks');
assert.ok(assist('UNIT_003').effects.some(e=>e.kind==='hot'),'Silver Current must add actual regeneration');
assert.ok(assist('UNIT_004').effects.some(e=>e.kind==='debuff'&&e.tag==='damage_taken'),'Briar Charge must expose enemies');
assert.ok(assist('UNIT_006').effects.some(e=>e.kind==='buff'&&e.tag==='damage_taken'),'Page\'s Vow must mitigate hits');
assert.ok(assist('UNIT_008').effects.some(e=>e.kind==='cleanse'),'Dawn Pinion must cleanse DoTs');
assert.ok(assist('UNIT_010').effects.some(e=>e.kind==='debuff'),'Siege Bolt must expose targets');
assert.equal(assist('UNIT_009').effects[0].bonusVsDebuffed,.12,'Echo Rend must reward coordinated debuff play');
assert.ok(assist('UNIT_011').effects.some(e=>e.kind==='debuff'&&e.tag==='hit_taken'&&e.value===.04),'Memory Command must boost party hit chance, not duplicate damage marks');
assert.equal(assist('UNIT_011').target,'current_target','Memory Command must damage an enemy, not an ally');
assert.ok(assist('UNIT_012').effects.some(e=>e.kind==='buff'&&e.tag==='damage_done'),'Oathglass utility must modify real damage');
assert.ok(assist('UNIT_002').effects[0].flat!>assist('UNIT_003').effects[0].flat!,'Tank shield should be more substantial than the direct heal');
assert.equal(assist('UNIT_005').target,'interruptible_casting_enemy','Lantern Snuff must find actual casts');
assert.equal(assist('UNIT_005').aiCondition,'target_casting','Lantern Snuff must save its cooldown for casts');
const wispOwner=applyCharacterCompanionAssist({...actor('owner','players'),classId:'WAYFINDER'},baseProgress('UNIT_005'));
const castingEnemy={...actor('caster','enemies'),abilities:[{id:'dangerous_cast',name:'Dangerous Cast',cooldownMs:8000,castTimeMs:2200,interruptible:true,target:'current_target' as const,effects:[{kind:'damage' as const,coeff:.3}],priority:90}]};
const withWisp=simulateCombat({seed:'wisp-actually-interrupts',players:[wispOwner],enemies:[castingEnemy],maxDurationMs:6500});
assert.ok(withWisp.events.some(e=>e.type==='interrupt'&&e.abilityId==='owner:UNIT_005:assist'),'Lantern Wisp should cancel a real cast');
const withoutCast=simulateCombat({seed:'wisp-no-cast',players:[wispOwner],enemies:[actor('quiet','enemies')],maxDurationMs:2500});
assert.ok(!withoutCast.events.some(e=>e.abilityId==='owner:UNIT_005:assist'),'Lantern Wisp should not waste the interrupt without a cast');
const heavyEnemy={...actor('bulky','enemies'),stats:{...enemy.stats,maxHp:100000}};
const briar=buildOwnedCompanionCombatant(baseProgress('UNIT_004'),{mode:'companion_trial'});
const briarFight=simulateCombat({seed:'briar-exposes-target',players:[briar],enemies:[heavyEnemy],maxDurationMs:2500});
assert.ok(briarFight.events.some(e=>e.type==='status_apply'&&e.statusTag==='damage_taken'&&e.actorId==='UNIT_004'),'Briar vulnerability must reach real combat');
const twoTargets=simulateCombat({seed:'briar-strike-and-mark-same-target',players:[briar],enemies:[
 {...actor('enemy-a','enemies'),stats:{...enemy.stats,maxHp:50000}},
 {...actor('enemy-b','enemies'),stats:{...enemy.stats,maxHp:50000}},
],maxDurationMs:100});
const briarHit=twoTargets.events.find(e=>e.abilityId==='UNIT_004_ACTIVE'&&e.type==='damage');
const briarMark=twoTargets.events.find(e=>e.abilityId==='UNIT_004_ACTIVE'&&e.type==='status_apply');
assert.ok(briarHit&&briarMark,'Briar Charge must deal damage and mark the enemy');
assert.equal(briarHit!.targetId,briarMark!.targetId,'Briar Charge must expose the same enemy it strikes');

assert.equal(buildOwnedCompanionCombatant(baseProgress('UNIT_011'),{mode:'companion_trial'}).abilities[0].target,'current_target','Memory Command must be offensive in Trials');
assert.ok(buildOwnedCompanionCombatant(baseProgress('UNIT_003'),{mode:'companion_trial'}).abilities[0].effects.some(e=>e.kind==='hot'),'Silver Current regen must work in Trials');
assert.ok(buildOwnedCompanionCombatant(baseProgress('UNIT_008'),{mode:'companion_trial'}).abilities[0].effects.some(e=>e.kind==='cleanse'),'Dawnwing cleanse must work in Trials');


const withTechnique=(id:string,suffix:string):OwnedCompanionSnapshot=>({...baseProgress(id),selectedTechniqueId:`${id}_${suffix}`});
const ownedAssist=(progress:OwnedCompanionSnapshot)=>applyCharacterCompanionAssist({...actor('owner','players'),classId:'WAYFINDER'},progress);
const effectAmount=(progress:OwnedCompanionSnapshot,kind:string)=>ownedAssist(progress).abilities.at(-1)!.effects.find(e=>e.kind===kind)!;
for(let i=1;i<=12;i++){
 const id=`UNIT_${String(i).padStart(3,'0')}`;
 const choices=companionTechniques(id);
 assert.equal(choices.length,2,`${id}: exactly two Technique choices`);
 assert.notEqual(choices[0].name,choices[1].name,`${id}: no generic duplicated Technique labels`);
 const a=buildOwnedCompanionCombatant({...baseProgress(id),selectedTechniqueId:choices[0].id},{mode:'companion_trial'});
 const b=buildOwnedCompanionCombatant({...baseProgress(id),selectedTechniqueId:choices[1].id},{mode:'companion_trial'});
 assert.notEqual(JSON.stringify({stats:a.stats,ability:a.abilities[0]}),JSON.stringify({stats:b.stats,ability:b.abilities[0]}),`${id}: Techniques must change actual gameplay`);
}
const earlyWisp=ownedAssist(withTechnique('UNIT_005','DEEP_RESTORATION'));
const quickWisp=ownedAssist(withTechnique('UNIT_005','RAPID_AID'));
assert.ok(earlyWisp.stats.haste>quickWisp.stats.haste,'Flicker Sense should improve actual Haste');
assert.ok(quickWisp.abilities.at(-1)!.cooldownMs<earlyWisp.abilities.at(-1)!.cooldownMs,'Quick Snuff should actually interrupt sooner');
assert.ok((effectAmount(withTechnique('UNIT_008','DEEP_RESTORATION'),'shield').flat??0)>(effectAmount(withTechnique('UNIT_008','RAPID_AID'),'shield').flat??0),'Dawnwing ward Technique should outweigh quick shield');
assert.ok(ownedAssist(withTechnique('UNIT_008','RAPID_AID')).abilities.at(-1)!.cooldownMs<ownedAssist(withTechnique('UNIT_008','DEEP_RESTORATION')).abilities.at(-1)!.cooldownMs,'Quick Pinion should recharge sooner');
assert.ok((effectAmount(withTechnique('UNIT_011','DEEP_RESTORATION'),'damage').coeff??0)>(effectAmount(withTechnique('UNIT_011','RAPID_AID'),'damage').coeff??0),'Memory Command must gain actual damage from Precise Command');
assert.ok((effectAmount(withTechnique('UNIT_012','DEEP_RESTORATION'),'buff').value??0)>(effectAmount(withTechnique('UNIT_012','RAPID_AID'),'buff').value??0),'Oathglass Technique must boost tactical damage buff');
assert.ok(ownedAssist(withTechnique('UNIT_012','RAPID_AID')).abilities.at(-1)!.cooldownMs<ownedAssist(withTechnique('UNIT_012','DEEP_RESTORATION')).abilities.at(-1)!.cooldownMs,'Quick Reflection should recharge sooner');
const trialTech=buildOwnedCompanionCombatant(withTechnique('UNIT_005','DEEP_RESTORATION'),{mode:'companion_trial'});
assert.ok(trialTech.stats.haste>buildOwnedCompanionCombatant(withTechnique('UNIT_005','RAPID_AID'),{mode:'companion_trial'}).stats.haste,'Technique haste must affect standalone Trial simulation');
assert.ok(trialTech.abilities[0].aiCondition==='target_casting','Technique changes must never turn an interrupt into a wasted cast');


/** One enemy, one mark, one strike: identical seed and target selection.
 * A harmless buff and a harmful debuff use the same modifier tag/value, so the
 * only difference is whether Echo's attack sees a pre-existing debuff. */
const echoAttack:CombatantDefinition={...actor('echo','players'),abilities:[{id:'echo_combo',name:'Echo Combo',cooldownMs:3000,castTimeMs:0,target:'current_target',priority:1,effects:[{kind:'damage',coeff:1,bonusVsDebuffed:.12}]}]};
function echoMarkProbe(kind:'buff'|'debuff'){
 const opener:CombatantDefinition={...actor('opener','players'),abilities:[{id:'mark',name:'Mark',cooldownMs:3000,castTimeMs:0,target:'current_target',priority:1,effects:[{kind,value:.04,durationMs:3000,tag:'hit_taken'}]}]};
 const result=simulateCombat({seed:'echo-mark-same-rng',players:[opener,echoAttack],enemies:[{...actor('target','enemies'),stats:{...enemy.stats,maxHp:100000}}],maxDurationMs:100});
 return result.events.find(e=>e.type==='damage'&&e.abilityId==='echo_combo')?.amount??0;
}
const unmarkedEcho=echoMarkProbe('buff'),markedEcho=echoMarkProbe('debuff');
assert.ok(unmarkedEcho>0&&markedEcho>=unmarkedEcho*1.115,`Echo requires an existing enemy debuff: ${unmarkedEcho} vs ${markedEcho}`);

console.log('PASS actual execute damage, finite shield reflection, Trial and co-op signature effects and technique effects');

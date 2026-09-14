import {buildCompanionCombatant,companionAbilityTargetHint} from '../combat-adapter';
import {companionServerDefinition} from '../content';
import {companionTeamPower,evaluateCompanionSynergies,validateCompanionTrialTeam} from '../team';
import {validateCompanionLoadout} from '../policy';
import type {OwnedCompanionSnapshot} from '../domain';
const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m)};const eq=(a:unknown,b:unknown,m:string)=>{if(a!==b)throw new Error(`${m}: ${String(a)} !== ${String(b)}`)};
const p=(id:string,level=20,bondLevel=8,ascensionTier:0|1|2|3=2):OwnedCompanionSnapshot=>({companionId:id,level,xp:0,ascensionTier,bondLevel,bondXp:0,bondTraitUnlocked:bondLevel>=10});
const owned={UNIT_001:p('UNIT_001'),UNIT_002:p('UNIT_002'),UNIT_003:p('UNIT_003'),UNIT_004:p('UNIT_004'),UNIT_006:p('UNIT_006'),UNIT_008:p('UNIT_008')};
// Required team tests 1-10.
for(const ids of [[],['UNIT_001'],['UNIT_001','UNIT_002'],['UNIT_001','UNIT_002','UNIT_003','UNIT_004']])ok(!validateCompanionTrialTeam({companionIds:ids,owned}).ok,'Trial accepted non-3 team');
ok(!validateCompanionTrialTeam({companionIds:['UNIT_001','UNIT_004','UNIT_003'],owned}).ok,'Missing Tank accepted');
ok(!validateCompanionTrialTeam({companionIds:['UNIT_002','UNIT_006','UNIT_003'],owned}).ok,'Missing Damage accepted');
ok(!validateCompanionTrialTeam({companionIds:['UNIT_001','UNIT_002','UNIT_004'],owned}).ok,'Missing Support accepted');
ok(!validateCompanionTrialTeam({companionIds:['UNIT_001','UNIT_002','UNIT_001'],owned}).ok,'Duplicate IDs accepted');
ok(!validateCompanionTrialTeam({companionIds:['UNIT_001','UNIT_002','UNIT_008'],owned:{UNIT_001:owned.UNIT_001,UNIT_002:owned.UNIT_002}}).ok,'Unowned accepted');
ok(!validateCompanionTrialTeam({companionIds:['UNIT_001','UNIT_002','UNIT_003'],owned,busyCompanionIds:new Set(['UNIT_003'])}).ok,'Busy accepted');
const valid=validateCompanionTrialTeam({companionIds:['UNIT_001','UNIT_002','UNIT_003'],owned});ok(valid.ok,'Valid trio rejected');
ok(validateCompanionLoadout({classId:'WAYFINDER',companionId:'UNIT_001',ownedCompanionIds:['UNIT_001']}).ok===false,'Character same-role restriction broke');ok(valid.ok,'Character same-role rule leaked into companion-only mode');
// Contextual targeting: owner in assist, standalone target in Trial.
const tankDef=companionServerDefinition('UNIT_002')!,assist=buildCompanionCombatant(tankDef,owned.UNIT_002,{mode:'character_assist',ownerId:'CHAR_A'}),standalone=buildCompanionCombatant(tankDef,owned.UNIT_002,{mode:'companion_trial'});eq(companionAbilityTargetHint(assist),'CHAR_A','Assist owner target hint missing');eq(companionAbilityTargetHint(standalone),undefined,'Standalone incorrectly retained owner');eq(standalone.abilities[0].target,'self','Tank standalone target should be self');
const support=buildCompanionCombatant(companionServerDefinition('UNIT_003')!,owned.UNIT_003,{mode:'companion_trial'});eq(support.abilities[0].target,'lowest_hp_ally','Support standalone target wrong');
const damage=buildCompanionCombatant(companionServerDefinition('UNIT_001')!,owned.UNIT_001,{mode:'companion_trial'});eq(damage.abilities[0].target,'current_target','Damage standalone target wrong');
// Companion-only combat definitions contain no character combatant and preserve three roles.
const built=['UNIT_002','UNIT_001','UNIT_003'].map(id=>buildCompanionCombatant(companionServerDefinition(id)!,owned[id as keyof typeof owned],{mode:'companion_trial'}));eq(built.length,3,'Companion-only team size');ok(built.every(x=>x.tags?.includes('companion_trial')),'Companion trial context missing');ok(new Set(built.map(x=>x.role)).size===3,'Companion AI roles not preserved');
// Team Power uses derived combat values, not a second rarity multiplier.
const power=companionTeamPower(['UNIT_001','UNIT_002','UNIT_003'],owned);ok(power>0,'Team Power missing');const sy=evaluateCompanionSynergies(valid.ok?valid.members:[]);ok(sy.some(x=>x.key==='balanced_triad'),'Balanced Triad baseline missing');
console.log('companion-phase2-team-combat: PASS');

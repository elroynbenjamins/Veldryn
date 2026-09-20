import {buildOwnedCompanionCombatant} from '../combat-adapter';
import {COMPANION_TECHNIQUE_SWITCH_COST} from '../content';
import {selectCompanionTechnique,techniqueUnlocked} from '../progression-v2';
import type {CompanionEconomyState,OwnedCompanionSnapshot} from '../domain';
const ok=(v:unknown,m:string)=>{if(!v)throw new Error(m)};const eq=(a:unknown,b:unknown,m:string)=>{if(a!==b)throw new Error(`${m}: expected ${String(b)}, got ${String(a)}`)};const throws=(f:()=>unknown,m:string)=>{let did=false;try{f()}catch{did=true}if(!did)throw new Error(m)};
const p=(ascensionTier:0|1|2|3,bondLevel:number,selectedTechniqueId?:string):OwnedCompanionSnapshot=>({companionId:'UNIT_015',level:25,xp:0,ascensionTier,bondLevel,bondXp:0,bondTraitUnlocked:bondLevel>=10,selectedTechniqueId});const economy:CompanionEconomyState={gold:10000,companionEssence:1000,bondstones:2,materials:{}};
// 19 Either progression route unlocks Techniques; neither route alone below threshold does.
ok(!techniqueUnlocked(p(1,6),'UNIT_015_FORTIFIED'),'Technique unlocked below both thresholds');ok(techniqueUnlocked(p(2,6),'UNIT_015_FORTIFIED'),'Ascension II did not unlock Technique');ok(techniqueUnlocked(p(1,7),'UNIT_015_FORTIFIED'),'Bond 7 did not unlock Technique');
// 20 a valid single-route unlock works; 21 first selection free.
const ready=p(2,6),first=selectCompanionTechnique(ready,'UNIT_015_FORTIFIED',economy);eq(first.progress.selectedTechniqueId,'UNIT_015_FORTIFIED','Valid Technique did not select');eq(first.cost.gold,0,'First Technique cost Gold');eq(first.cost.companionEssence,0,'First Technique cost Essence');
// 22 only one active; 23 switching costs; 24 old removed; 25 new applied.
const before=buildOwnedCompanionCombatant(first.progress,{mode:'companion_trial'}),switched=selectCompanionTechnique(first.progress,'UNIT_015_REFLECTIVE',first.economy),after=buildOwnedCompanionCombatant(switched.progress,{mode:'companion_trial'});eq(switched.progress.selectedTechniqueId,'UNIT_015_REFLECTIVE','Technique switch did not replace selection');eq(switched.cost.gold,COMPANION_TECHNIQUE_SWITCH_COST.gold,'Switch Gold cost wrong');eq(switched.cost.companionEssence,COMPANION_TECHNIQUE_SWITCH_COST.companionEssence,'Switch Essence cost wrong');ok(before.abilities[0].tags?.some(x=>x.includes('shield_strength:0.18')),'Solar Shell Technique missing before switch');ok(!after.abilities[0].tags?.some(x=>x.includes('shield_strength:0.18')),'Old Technique effect survived switch');ok(after.abilities[0].tags?.some(x=>x.includes('reflect:0.15')),'Sun Mirror Technique effect missing');
// 26 failed switch deducts nothing.
const poor={...economy,gold:0,companionEssence:0},snap=JSON.stringify(poor);throws(()=>selectCompanionTechnique(first.progress,'UNIT_015_REFLECTIVE',poor),'Technique switch succeeded without resources');eq(JSON.stringify(poor),snap,'Failed Technique switch mutated resources');
// 27 selection persists through save/load snapshot.
const loaded=JSON.parse(JSON.stringify(switched.progress)) as OwnedCompanionSnapshot;eq(loaded.selectedTechniqueId,'UNIT_015_REFLECTIVE','Technique did not persist');
// 28 character-assist and 29 Trial combat both consume the selected Technique.
const assist=buildOwnedCompanionCombatant(loaded,{mode:'character_assist',ownerId:'CHAR_1'}),trial=buildOwnedCompanionCombatant(loaded,{mode:'companion_trial'});ok(assist.abilities[0].tags?.some(x=>x.includes('reflect:0.15')),'Technique missing in assist combat');ok(trial.abilities[0].tags?.some(x=>x.includes('reflect:0.15')),'Technique missing in Trial combat');
console.log('companion-phase3-techniques: PASS');

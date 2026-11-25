import {createCharacter,newGame} from '../src/core/game';
import {ALL_COMBAT_COMPANIONS,COMBAT_COMPANIONS,combatCompanionDef} from '../src/content/combat-companions';
import {CLASS_SKILLS} from '../src/content/class-skills';
import {EVENT_COMPANIONS} from '../src/content/event-companions-v2';
import {GUILD_COMBAT_COMPANIONS} from '../src/content/guild-companions-v1';
import {MONSTERS} from '../src/content/monsters';
import {monsterMasteryKillsForRank} from '../src/core/monster-mastery';
import {companionUnlockRequirementMet,reconcileCombatCompanionUnlocks,companionCanRecruitFromRequirements,recruitEligibleCombatCompanion,starterCombatCompanionChoices,starterCombatCompanionChoicePending,chooseStarterCombatCompanion} from '../src/core/combat-companions';
import {validateGameCommand} from '../src/core/game-commands';
import {companionRequirementProgress} from '../src/core/companion-presentation';
import {totalXpAtLevel} from '../src/core/progression';
import {COMPANION_SERVER_DEFINITIONS,COMPANION_SPECIAL_CHALLENGES} from '../../../backend/src/server/companions/content';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const ids=ALL_COMBAT_COMPANIONS.map(def=>def.id);
ok(ids.length===40&&new Set(ids).size===ids.length,'All 40 authored companions must have unique IDs');
ok(EVENT_COMPANIONS.length===13&&GUILD_COMBAT_COMPANIONS.length===3,'Frostfall brings 13 authored event companions while three guild companions remain stable');
const serverIds=new Set(COMPANION_SERVER_DEFINITIONS.map(def=>def.id));
ok(serverIds.size===ids.length&&ids.every(id=>serverIds.has(id)),'Client and server companion catalogs must be aligned');
const specialById=new Map(COMPANION_SPECIAL_CHALLENGES.map(challenge=>[challenge.id,challenge]));
const classSkillIds=new Set(Object.values(CLASS_SKILLS).flatMap(skills=>skills.map(skill=>skill.id)));
const classIds=Object.keys(CLASS_SKILLS) as (keyof typeof CLASS_SKILLS)[];
for(const def of ALL_COMBAT_COMPANIONS){
 ok(def.unlockRequirements.length>0,def.id+' needs at least one acquisition path');
 ok(!!combatCompanionDef(def.id),def.id+' needs a catalog lookup');
 ok(!!COMPANION_SERVER_DEFINITIONS.find(server=>server.id===def.id&&server.role===def.role),def.id+' has mismatched server role');
 for(const req of def.unlockRequirements){
  const target=req.target??'';
  ok(!!target,def.id+' is missing its requirement target');
  // Companion acquisition must work regardless of the selected class.
  ok(!classIds.some(id=>target.includes(id)||req.description.toUpperCase().includes(id.replaceAll('_',' '))),def.id+' has a class-exclusive unlock');
  ok(!(req.type==='skill_level'&&classSkillIds.has(target)),def.id+' requires a class-exclusive discipline');
  if(req.type==='monster_mastery')ok(MONSTERS.some(monster=>monster.id===target&&!monster.boss),def.id+' references an invalid monster: '+target);
  else if(req.type==='boss_kills')ok(target==='FALLEN_KNIGHT',def.id+' must count an existing boss-clear source');
  else if(req.type==='quest')ok(/^QST_\d+$/.test(target),def.id+' references an invalid story quest');
  else if(req.type==='skill_level')ok(['fishing','faith','smithing'].includes(target),def.id+' references a skill without a matching unlock rule');
  else if(req.type==='collection')ok(target==='SILVERBROOK_NODES',def.id+' has an unsupported collection requirement');
  else if(req.type==='achievement')ok(target==='OLD_MINES_KILLS'||target==='EQUIPMENT_CRAFTS'||/^COMPANION_(MISSIONS|S_GRADE):REG_/.test(target),def.id+' has an untracked achievement: '+target);
  else if(req.type==='meta')ok(target.startsWith('COMPANION_BOND:')&&!!combatCompanionDef(target.split(':')[1])||target.startsWith('guild_shop:')&&def.origin.id==='GUILD_TOKEN_SHOP',def.id+' has a missing account-wide dependency');
  else if(req.type==='event_challenge'){
   if(target.startsWith('CHALLENGE_'))ok(specialById.get(target)?.rewardCompanionId===def.id,def.id+' references a mismatched special challenge');
   else ok(def.origin.type==='event'&&target.length>0,def.id+' has a non-event reward source');
  } else throw new Error(def.id+' has unknown requirement type '+req.type);
 }
}
ok(COMBAT_COMPANIONS.every(def=>ids.includes(def.id)),'All visible companions must exist in the authored catalog');

// Account-bound companions must not become locked simply because their
// qualifying character is not the active one.
let main=createCharacter(newGame(0),'IRONWARDEN','Roster Main');
const alt=createCharacter(newGame(0),'DAWNKEEPER','Roster Alt');
const boostedAlt={...alt.character!,monsterMasteryPoints:{FOREST_TROLL:monsterMasteryKillsForRank(20),GLOAM_MITE:monsterMasteryKillsForRank(20)}};
main={...main,otherCharacters:[{character:boostedAlt,skills:alt.skills.map(s=>s.skillId==='smithing'?{...s,level:30,xp:totalXpAtLevel(30)}:s),quests:alt.quests,inventory:alt.inventory,overflow:alt.overflow,activity:null,currentRegionId:alt.currentRegionId}]};
const shadeRequirement=combatCompanionDef('UNIT_007')!.unlockRequirements[0];
const trollRequirement=combatCompanionDef('UNIT_004')!.unlockRequirements[0];
const automatonSkillRequirement=combatCompanionDef('UNIT_010')!.unlockRequirements[1];
for(const [req,label] of [[shadeRequirement,'Gloam Mite Mastery'],[trollRequirement,'Forest Troll Mastery'],[automatonSkillRequirement,'Smithing 30']] as const){
 ok(companionUnlockRequirementMet(main,req),'Inactive character should satisfy '+label);
 ok(companionRequirementProgress(main,req).complete,'Index should show completed '+label);
}
// Every class can earn Gloamknife Shade through Gloam Mite mastery alone.
for(const classId of classIds){
 const state=createCharacter(newGame(0),classId,'Neutral recruit');
 ok(!companionUnlockRequirementMet(state,shadeRequirement),classId+' must not unlock Gloamknife Shade before mastery');
 const eligible={...state,character:{...state.character!,monsterMasteryPoints:{GLOAM_MITE:monsterMasteryKillsForRank(20)}}};
 ok(companionUnlockRequirementMet(eligible,shadeRequirement),classId+' must unlock Gloamknife Shade with mastery');
 ok(companionRequirementProgress(eligible,shadeRequirement).complete,classId+' must display completed mastery');
}
// Previously acquired account-wide companions stay owned after the rule change.
const legacyOwner=createCharacter(newGame(0),'IRONWARDEN','Legacy Hero');
const legacyOwned={...legacyOwner,account:{...legacyOwner.account,unlockedCombatCompanionIds:['UNIT_007']}};
ok(reconcileCombatCompanionUnlocks(legacyOwned,1000).account.unlockedCombatCompanionIds?.includes('UNIT_007'),'Previously acquired Gloamknife Shade must remain owned');

// The manual recovery action must re-evaluate authoritative progress, not
// accept the client Index's percentage or an arbitrary companion ID.
ok(validateGameCommand({type:'companion_recruit',args:{id:'UNIT_004'}}).type==='companion_recruit','Recruit command must be accepted by the command validator');
ok(companionCanRecruitFromRequirements(combatCompanionDef('UNIT_004')!),'Normal progression companion should be recruitable');
const recruited=recruitEligibleCombatCompanion(main,'UNIT_004',1000);
ok(recruited.account.unlockedCombatCompanionIds?.includes('UNIT_004'),'Completed requirements must grant permanent ownership');
ok(recruitEligibleCombatCompanion(recruited,'UNIT_004',1001).account.unlockedCombatCompanionIds?.filter(id=>id==='UNIT_004').length===1,'Recruit retry must not duplicate an owned companion');
const reject=(state:typeof main,id:string)=>{try{recruitEligibleCombatCompanion(state,id,1000);return false;}catch{return true;}};
ok(reject(createCharacter(newGame(0),'IRONWARDEN','Not Ready'),'UNIT_004'),'Ineligible companion must not be granted');
ok(reject(main,'UNIT_001'),'Starter choice cannot bypass the initial recruitment choice');
ok(reject(main,GUILD_COMBAT_COMPANIONS[0].id),'Guild shop rewards cannot be granted via recruitment');
ok(reject(main,EVENT_COMPANIONS[0].id),'Event rewards cannot be granted via recruitment');

// Account-wide starter entitlement must be honoured when the story milestone
// belongs to an inactive character after a roster switch.
const questProof={questId:'QST_005',status:'claimed' as const};
const rosterReady={...main,quests:main.quests.filter(q=>q.questId!=='QST_005'),otherCharacters:(main.otherCharacters??[]).map(row=>({...row,quests:[...row.quests.filter(q=>q.questId!=='QST_005'),questProof]}))};
ok(starterCombatCompanionChoicePending(rosterReady),'Completed quest on the inactive character must offer starter selection');
ok(starterCombatCompanionChoices(rosterReady).map(row=>row.id).join(',')==='UNIT_001,UNIT_002,UNIT_003','All three starter roles must be selectable by every class');
const starter=chooseStarterCombatCompanion(rosterReady,'UNIT_002',1000);
ok(starter.account.starterCombatCompanionId==='UNIT_002'&&starter.account.unlockedCombatCompanionIds?.includes('UNIT_002'),'Same-role starter choice must work using inactive character quest proof');

main=reconcileCombatCompanionUnlocks(main,1000);
ok(main.account.unlockedCombatCompanionIds?.includes('UNIT_007'),'Gloamknife Shade should recruit from the account roster');
ok(main.account.unlockedCombatCompanionIds?.includes('UNIT_004'),'Briarhorn Cub should recruit from the account roster');
console.log('PASS: companion definitions, roster-wide proof, eligible recruit retry, and reward-source gates');

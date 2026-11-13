import {createCharacter,newGame} from '../src/core/game';
import {ALL_COMBAT_COMPANIONS,COMBAT_COMPANIONS,combatCompanionDef} from '../src/content/combat-companions';
import {EVENT_COMPANIONS} from '../src/content/event-companions-v2';
import {GUILD_COMBAT_COMPANIONS} from '../src/content/guild-companions-v1';
import {MONSTERS} from '../src/content/monsters';
import {companionUnlockRequirementMet,reconcileCombatCompanionUnlocks} from '../src/core/combat-companions';
import {companionRequirementProgress} from '../src/core/companion-presentation';
import {classCombatSkillTotalXpAtLevel,totalXpAtLevel} from '../src/core/progression';
import {COMPANION_SERVER_DEFINITIONS,COMPANION_SPECIAL_CHALLENGES} from '../../../backend/src/server/companions/content';

const ok=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const ids=ALL_COMBAT_COMPANIONS.map(def=>def.id);
ok(ids.length===38&&new Set(ids).size===ids.length,'All 38 authored companions must have unique IDs');
ok(EVENT_COMPANIONS.length===11&&GUILD_COMBAT_COMPANIONS.length===3,'Event and guild catalog sizes must remain intentional');
const serverIds=new Set(COMPANION_SERVER_DEFINITIONS.map(def=>def.id));
ok(serverIds.size===ids.length&&ids.every(id=>serverIds.has(id)),'Client and server companion catalogs must be aligned');
const specialById=new Map(COMPANION_SPECIAL_CHALLENGES.map(challenge=>[challenge.id,challenge]));
for(const def of ALL_COMBAT_COMPANIONS){
 ok(def.unlockRequirements.length>0,def.id+' needs at least one acquisition path');
 ok(!!combatCompanionDef(def.id),def.id+' needs a catalog lookup');
 ok(!!COMPANION_SERVER_DEFINITIONS.find(server=>server.id===def.id&&server.role===def.role),def.id+' has mismatched server role');
 for(const req of def.unlockRequirements){
  const target=req.target??'';
  ok(!!target,def.id+' is missing its requirement target');
  if(req.type==='monster_mastery')ok(MONSTERS.some(monster=>monster.id===target&&!monster.boss),def.id+' references an invalid monster: '+target);
  else if(req.type==='boss_kills')ok(target==='FALLEN_KNIGHT',def.id+' must count an existing boss-clear source');
  else if(req.type==='quest')ok(/^QST_\d+$/.test(target),def.id+' references an invalid story quest');
  else if(req.type==='skill_level')ok(['fishing','faith','smithing'].includes(target),def.id+' references a skill without a matching unlock rule');
  else if(req.type==='collection')ok(target==='SILVERBROOK_NODES',def.id+' has an unsupported collection requirement');
  else if(req.type==='achievement')ok(target==='OLD_MINES_KILLS'||target==='EQUIPMENT_CRAFTS'||target==='KNIFE_DANCER_SKILL_TOTAL'||/^COMPANION_(MISSIONS|S_GRADE):REG_/.test(target),def.id+' has an untracked achievement: '+target);
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
const alt=createCharacter(newGame(0),'KNIFE_DANCER','Roster Alt');
const boostedAlt={...alt.character!,classSkills:(alt.character?.classSkills??[]).map(row=>({...row,xp:classCombatSkillTotalXpAtLevel(45),level:45})),monsterMasteryPoints:{FOREST_TROLL:500}};
main={...main,otherCharacters:[{character:boostedAlt,skills:alt.skills.map(s=>s.skillId==='smithing'?{...s,level:30,xp:totalXpAtLevel(30)}:s),quests:alt.quests,inventory:alt.inventory,overflow:alt.overflow,activity:null,currentRegionId:alt.currentRegionId}]};
const knifeRequirement=combatCompanionDef('UNIT_007')!.unlockRequirements[0];
const trollRequirement=combatCompanionDef('UNIT_004')!.unlockRequirements[0];
const automatonSkillRequirement=combatCompanionDef('UNIT_010')!.unlockRequirements[1];
for(const [req,label] of [[knifeRequirement,'Knife Dancer skill total'],[trollRequirement,'Forest Troll Mastery'],[automatonSkillRequirement,'Smithing 30']] as const){
 ok(companionUnlockRequirementMet(main,req),'Inactive character should satisfy '+label);
 ok(companionRequirementProgress(main,req).complete,'Index should show completed '+label);
}
main=reconcileCombatCompanionUnlocks(main,1000);
ok(main.account.unlockedCombatCompanionIds?.includes('UNIT_007'),'Gloamknife Shade should recruit from the account roster');
ok(main.account.unlockedCombatCompanionIds?.includes('UNIT_004'),'Briarhorn Cub should recruit from the account roster');
console.log('PASS: all 38 companion definitions have valid unlock sources and inactive character progress is honored');

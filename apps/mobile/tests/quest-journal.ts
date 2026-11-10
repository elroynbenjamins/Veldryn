import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../src/core/progression';
import {createCharacter,newGame,claimQuest,refreshQuests} from '../src/core/game';
import {journalEntries,questDestination} from '../src/core/quest-journal';
import {QUESTS,QUEST_ACTS} from '../src/content/quests';
import {itemDef} from '../src/content/items';
import {equipmentPouch} from '../src/core/equipment-pouch';
import {JOURNAL_SKILL_LESSONS,journalSkillLessonProgress,journalSkillLessonSummary} from '../src/core/journal-skill-lessons';
import {EQUIPMENT_CRAFT_SKILL_BY_CLASS} from '../src/content/equipment-recipes-v33';
import {questPresentationMeta,questPresentationTier} from '../src/core/quest-presentation';
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const state=createCharacter(newGame(1000),'IRONWARDEN');
ok(journalEntries(state,'current','').length===1,'One current chapter initially');
ok(journalEntries(state,'locked','').length===14,'Remaining chapters locked');
ok(journalEntries(state,'all',' MOSS ').length===1,'Search descriptions, trim and ignore case');
ok(journalEntries(state,'all',' oathgate ').length===2,'Search includes authored quest locations');
ok(journalEntries(state,'all',' ferrymen ').length===1,'Search includes authored story text');
ok(journalEntries(state,'claimed','').length===0,'Empty completed filter');
ok(questDestination(QUESTS[0]).zoneId==='GREENFIELDS','Rat quest navigates to region');
ok(questDestination(QUESTS[2]).tab==='World'&&questDestination(QUESTS[2]).zoneId==='IRONWOOD','Hound trail teaches travel to Ironwood before exploration');
ok(questDestination(QUESTS[3]).tab==='Inventory','Equip quest destination');
ok(questDestination(QUESTS[6]).tab==='Skills','Gatherable item destination');
ok(questDestination(QUESTS[13]).zoneId==='KINGS_ROAD','Boss destination');
for(const def of QUESTS)ok(!!questDestination(def).label&&!!questDestination(def).hint,'Every quest has guidance');
for(const def of QUESTS)ok(def.act>=1&&def.act<=3&&!!def.location.trim()&&def.story.trim().length>=40,'Every quest has an act, location and substantive story beat');
ok(QUESTS.slice(0,5).every(def=>def.act===1)&&QUESTS.slice(5,10).every(def=>def.act===2)&&QUESTS.slice(10).every(def=>def.act===3),'Asterfall acts remain ordered 5 / 5 / 5');
ok(QUEST_ACTS[1].name==='Whispers in the Green'&&QUEST_ACTS[3].name==='The Broken Oath','Campaign act identity remains authored');
ok(questPresentationTier(QUESTS[0])==='standard'&&questPresentationTier(QUESTS[4])==='rare','Act I tier curve should build from standard to rare');
ok(questPresentationTier(QUESTS[9])==='epic'&&questPresentationTier(QUESTS[13])==='legendary'&&questPresentationTier(QUESTS[14])==='epic','Major campaign beats keep stronger presentation tiers');
ok(QUESTS.filter(def=>questPresentationTier(def)==='legendary').every(def=>def.kind==='boss'),'Legendary campaign presentation is reserved for boss-scale chapters');
const themeFixtures=[{accent:'#gold',accentSurface:'#gold-bg',special:'#violet',specialSurface:'#violet-bg',info:'#blue',infoSurface:'#blue-bg',good:'#green',goodSurface:'#green-bg',muted:'#muted',panel2:'#panel'} as any,{accent:'#bronze',accentSurface:'#cream',special:'#purple',specialSurface:'#lilac',info:'#navy',infoSurface:'#ice',good:'#forest',goodSurface:'#mint',muted:'#slate',panel2:'#ivory'} as any];
for(const theme of themeFixtures){for(const def of QUESTS){const meta=questPresentationMeta(def,theme);ok(!!meta.color&&!!meta.surface&&!!meta.label,'Every quest tier resolves theme-safe presentation metadata')}}
const completed=refreshQuests(state,'MOSS_RAT',5);
ok(journalEntries(completed,'current','')[0].remaining===0,'Ready quest has no remainder');
const claimed=claimQuest(completed,'QST_001');
ok(journalEntries(claimed,'claimed','').length===1,'Claimed chapter archived');
ok(journalEntries(claimed,'current','')[0].def.id==='QST_002','Claim advances journal');
ok(journalEntries(claimed,'locked','')[0].previous===QUESTS[1].name,'Locked prerequisite uses source order');
const secondReady={...claimed,character:{...claimed.character!,level:2},quests:claimed.quests.map(row=>row.questId==='QST_002'?{...row,status:'complete' as const}:row)};
const trailLocked=claimQuest(secondReady,'QST_002');
ok(trailLocked.quests.find(row=>row.questId==='QST_003')?.status==='locked','Hound trail stays locked until its character-level requirement');
ok(journalEntries(trailLocked,'current','')[0]?.lockedHint?.includes(`level ${rebaseLevel(7)} through Combat`)===true,'Locked trail explains the combat level requirement');
const trailReady=refreshQuests({...trailLocked,character:{...trailLocked.character!,level:rebaseLevel(7)}});
ok(trailReady.quests.find(row=>row.questId==='QST_003')?.status==='active','Hound trail activates at the rebased character-level requirement');
// Regression: the Act III story finale must never save an unregistered item
// (which used to crash the reward receipt and subsequent Inventory renders).
for(const def of QUESTS){if(def.rewardItemId)ok(!!itemDef(def.rewardItemId),`Quest ${def.id} grants a catalogued reward`)}
const finale=QUESTS.find(def=>def.id==='QST_015')!;
const cape=itemDef(finale.rewardItemId!);
ok(cape.type==='gear'&&cape.slot==='cape'&&cape.requiredLevel===finale.required,'The Oathglass Cape is equippable at the finale level');
const finaleReady={...state,character:{...state.character!,level:finale.required,gold:100},quests:state.quests.map(q=>({...q,status:q.questId===finale.id?'complete' as const:'claimed' as const}))};
const finaleClaimed=claimQuest(finaleReady,finale.id,1000);
ok(finaleClaimed.quests.find(q=>q.questId===finale.id)?.status==='claimed','The final chapter is claimed exactly once');
ok(finaleClaimed.character!.gold===finaleReady.character!.gold+finale.rewardGold,'Finale gold is credited exactly once');
ok(equipmentPouch(finaleClaimed).stacks.some(row=>row.itemId==='OATHGLASS_CAPE'),'The finale cape arrives in the Equipment Pouch');
ok(!finaleClaimed.inventory.stacks.some(row=>row.itemId==='OATHGLASS_CAPE'),'The finale cape avoids occupying ordinary Inventory when the pouch has space');
let duplicateFinaleBlocked=false;try{claimQuest(finaleClaimed,finale.id,1001)}catch{duplicateFinaleBlocked=true}
ok(duplicateFinaleBlocked,'A retry after a confirmed finale claim cannot grant gold or another cape');
const pouchFull={...finaleReady,character:{...finaleReady.character!,equipmentPouch:{capacity:30,stacks:Array.from({length:30},()=>({itemId:'basic_sword',quantity:1}))}}};
const finaleFallback=claimQuest(pouchFull,finale.id,1001);
ok(finaleFallback.inventory.stacks.some(row=>row.itemId==='OATHGLASS_CAPE'),'A full Equipment Pouch routes finale gear safely to Inventory');
const finished={...state,quests:state.quests.map(q=>({...q,status:'claimed' as const}))};
ok(journalEntries(finished,'current','').length===0,'Completed campaign has no current quests');
ok(journalEntries(finished,'claimed','').length===15,'All chapters remain browsable');
// New tutorial paths must be non-invasive for existing campaign saves.
ok(JOURNAL_SKILL_LESSONS.length===11,'The training journal covers every profession');
ok(EQUIPMENT_CRAFT_SKILL_BY_CLASS.IRONWARDEN==='smithing'&&EQUIPMENT_CRAFT_SKILL_BY_CLASS.BASTION==='smithing'&&EQUIPMENT_CRAFT_SKILL_BY_CLASS.DREADGUARD==='smithing','Tank classes use Smithing for their equipment path');
ok(new Set(JOURNAL_SKILL_LESSONS.map(row=>row.skillId)).size===11,'Training lessons have unique skill IDs');
ok(JOURNAL_SKILL_LESSONS.every(row=>state.skills.some(skill=>skill.skillId===row.skillId)),'Every lesson maps to an existing profession');
const noviceLessons=journalSkillLessonProgress(state);
ok(noviceLessons.filter(row=>row.introduced).length===3,'First session introduces only the three basic gathering lessons');
ok(noviceLessons.every(row=>row.level===1&&!row.practiceComplete),'A new character receives no unearned training completion');
const beginner={...state,skills:state.skills.map(skill=>skill.skillId==='mining'?{...skill,level:2}:skill)};
ok(journalSkillLessonProgress(beginner).find(row=>row.lesson.skillId==='mining')?.status==='practice','Mining level 2 finishes its first milestone');
const trained={...state,skills:state.skills.map(skill=>skill.skillId==='mining'?{...skill,level:5}:skill)};
ok(journalSkillLessonProgress(trained).find(row=>row.lesson.skillId==='mining')?.status==='complete','Level 5 completes an existing training track retroactively');
ok(journalSkillLessonSummary(trained).practiced===1,'Training summary follows actual levels');
const learned={...state,quests:state.quests.map(row=>row.questId==='QST_002'?{...row,status:'claimed' as const}:row)};
ok(journalSkillLessonProgress(learned).find(row=>row.lesson.skillId==='cooking')?.introduced===true,'Crafting becomes introduced after the second story reward');
ok(journalSkillLessonProgress(state).find(row=>row.lesson.skillId==='enchanting')?.status==='preview','Advanced skills can be previewed without progression gates changing');
ok(QUESTS.length===15,'Optional lessons must not insert or reorder campaign chapters');

console.log('PASS: quest story acts, filters, search, destinations, claim advancement and finished campaign');

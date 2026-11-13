import {rebasedCombatLevelFromLegacyLevel as rebaseLevel} from '../src/core/progression';
import {createCharacter,newGame,claimQuest,refreshQuests} from '../src/core/game';
import {journalEntries,questDestination} from '../src/core/quest-journal';
import {QUESTS,QUEST_ACTS} from '../src/content/quests';
import {STORY_DISCOVERIES,recoveredStoryDiscoveries,storyActProgress,storyDiscoveryText} from '../src/core/story-chronicle';
import {itemDef} from '../src/content/items';
import {JOURNAL_TITLES_V42} from '../src/core/adventurers-journal-v42';
import {migrateRetiredStoryRewards} from '../src/core/retired-story-rewards';
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
// Act III completion pays usable resources and an account-wide title, never
// a missing item ID or an unplanned piece of equipment.
for(const def of QUESTS){if(def.rewardItemId)ok(!!itemDef(def.rewardItemId),`Quest ${def.id} grants a catalogued reward`)}
const finale=QUESTS.find(def=>def.id==='QST_015')!;
ok(finale.rewardItemId==='OATHGLASS_SHARD'&&finale.rewardItemQty===8,'Act III rewards eight usable Oathglass Shards instead of a cape');
ok(finale.rewardTitleId==='oathbreaker'&&JOURNAL_TITLES_V42.some(row=>row.id===finale.rewardTitleId&&row.name==='Oathbreaker'),'Act III awards the registered Oathbreaker title');
const finaleReady={...state,character:{...state.character!,level:finale.required,gold:100},quests:state.quests.map(q=>({...q,status:q.questId===finale.id?'complete' as const:'claimed' as const}))};
const finaleClaimed=claimQuest(finaleReady,finale.id,1000);
ok(finaleClaimed.quests.find(q=>q.questId===finale.id)?.status==='claimed','The final chapter is claimed exactly once');
ok(finaleClaimed.character!.gold===finaleReady.character!.gold+finale.rewardGold,'Finale gold is credited exactly once');
ok(finaleClaimed.inventory.stacks.some(row=>row.itemId==='OATHGLASS_SHARD'&&row.quantity===8),'Claiming the finale grants the resource reward');
ok(finaleClaimed.account.journalState?.unlockedTitles.oathbreaker===1000,'The account Journal records permanent title ownership');
ok(!finaleClaimed.inventory.stacks.some(row=>row.itemId==='OATHGLASS_CAPE'),'No cape is granted by the finale');
let duplicateFinaleBlocked=false;try{claimQuest(finaleClaimed,finale.id,1001)}catch{duplicateFinaleBlocked=true}
ok(duplicateFinaleBlocked,'A repeated claim cannot grant more resources, gold or title unlocks');
// Already-owned obsolete cape copies are retired, compensated and not
// transferable back into the game. Repeat loads are intentionally no-ops.
const historical={...finaleReady,
 character:{...finaleReady.character!,equipment:{...finaleReady.character!.equipment,cape:'OATHGLASS_CAPE'},equipmentPouch:{capacity:30,stacks:[{itemId:'OATHGLASS_CAPE',quantity:1}]}},
 inventory:{...finaleReady.inventory,stacks:[...finaleReady.inventory.stacks,{itemId:'OATHGLASS_CAPE',quantity:1}]},
 quests:finaleReady.quests.map(q=>({...q,status:'claimed' as const}))};
const retired=migrateRetiredStoryRewards(historical,3000);
ok(retired.character?.equipment.cape!== 'OATHGLASS_CAPE','Historical equipped capes are removed');
ok(!retired.character?.equipmentPouch?.stacks.some(s=>s.itemId==='OATHGLASS_CAPE'),'Historical pouch capes are removed');
ok(!retired.inventory.stacks.some(s=>s.itemId==='OATHGLASS_CAPE'),'Historical inventory capes are removed');
ok(retired.inventory.stacks.some(s=>s.itemId==='OATHGLASS_SHARD'&&s.quantity===24),'Three legacy capes convert into 24 Oathglass Shards');
ok(retired.account.journalState?.unlockedTitles.oathbreaker===3000,'Previously completed Act III receives Oathbreaker retroactively');
ok(migrateRetiredStoryRewards(retired,3001)===retired,'Retired quest reward migration is exactly once');
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
// Chronicle discoveries are localized presentation only and never grant progress or spoil future chapters.
ok(STORY_DISCOVERIES.length===6,'Six meaningful revelations are authored across the existing Asterfall campaign');
ok(new Set(STORY_DISCOVERIES.map(entry=>entry.questId)).size===STORY_DISCOVERIES.length,'Discovery quest identifiers are unique');
ok(STORY_DISCOVERIES.every(entry=>QUESTS.some(q=>q.id===entry.questId)),'Every discovery maps to a current main-story quest');
const chronicleLanguages=['en','de','es','nl','it','fr','ru','tr'] as const;
for(const discovery of STORY_DISCOVERIES)for(const language of chronicleLanguages){
 const copy=storyDiscoveryText(language,discovery.questId);
 ok(!!copy&&copy.trim().length>45,discovery.questId+' has authored '+language+' lore');
}
ok(storyDiscoveryText('en','UNKNOWN')===undefined,'Unknown quests never synthesize lore');
ok(recoveredStoryDiscoveries(state,'en').length===0,'Unclaimed story pages are never revealed');
const prematureClue={...state,quests:state.quests.map(row=>row.questId==='QST_003'?{...row,status:'complete' as const}:row)};
ok(recoveredStoryDiscoveries(prematureClue,'en').length===0,'Objective complete is not an authoritative story claim');
const earnedClue={...state,quests:state.quests.map(row=>row.questId==='QST_003'?{...row,status:'claimed' as const}:row)};
const foundClues=recoveredStoryDiscoveries(earnedClue,'nl');
ok(foundClues.length===1&&foundClues[0].questId==='QST_003'&&foundClues[0].chapter===3,'Claimed clue is readable in the selected language');
ok(foundClues[0].text===storyDiscoveryText('nl','QST_003'),'Discovery uses the Dutch lore copy');
ok(storyActProgress(state).every(row=>row.completed===0&&row.total===5),'New characters have three empty acts');
ok(storyActProgress(finished).every(row=>row.finished&&row.completed===5),'Finished accounts retain every completed act without migration');
ok(recoveredStoryDiscoveries(finished,'en').length===6,'Completed accounts retroactively recover every past clue');


console.log('PASS: quest story acts, filters, search, destinations, claim advancement and finished campaign');

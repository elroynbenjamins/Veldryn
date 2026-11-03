import type {GameState,SkillId} from './types';

/**
 * Read-only profession learning paths. They never alter story quest state,
 * grant items, or claim rewards; milestones follow authoritative skill XP.
 */
export type JournalSkillGroup='gather'|'create'|'specialize';
export interface JournalSkillLesson{
 skillId:SkillId;
 title:string;
 group:JournalSkillGroup;
 introduction:string;
 practice:string;
 connection:string;
 afterQuest?:string;
 characterLevel?:number;
 unlockHint?:string;
}
export const JOURNAL_SKILL_LESSONS:readonly JournalSkillLesson[]=[
 {skillId:'mining',title:'Ore from the earth',group:'gather',introduction:'Mine Copper Ore and collect the activity rewards to earn Mining XP.',practice:'Train toward Mining level 5. Keep the ore: Smithing can turn it into useful ingots.',connection:'Mining → Smithing → equipment'},
 {skillId:'woodcutting',title:'Wood for every workshop',group:'gather',introduction:'Chop Greenwood and collect the logs when the activity finishes.',practice:'Reach Woodcutting level 5 and save some logs for workshop fuel.',connection:'Woodcutting → Cooking and Smelting'},
 {skillId:'fishing',title:'A catch worth keeping',group:'gather',introduction:'Catch an early fish and collect the rewards to gain Fishing XP.',practice:'Reach Fishing level 5, then bring the catch to Cooking.',connection:'Fishing → Cooking → combat food'},
 {skillId:'herbalism',title:'The healer’s harvest',group:'gather',afterQuest:'QST_001',unlockHint:'Claim A Name in the Ledger.',introduction:'Gather herbs in an available region and collect your Herbalism XP.',practice:'Reach Herbalism level 5 and review how herbs supply Alchemy.',connection:'Herbalism → Alchemy → consumables'},
 {skillId:'exploration',title:'Find paths before enemies',group:'gather',afterQuest:'QST_002',unlockHint:'Claim First Blood, First Skill.',introduction:'Scout an Exploration route and collect its completed rewards.',practice:'Reach Exploration level 5. New discoveries can reveal encounters and regions.',connection:'Exploration → discoveries → new hunts'},
 {skillId:'smithing',title:'Ore into equipment',group:'create',afterQuest:'QST_002',unlockHint:'Claim First Blood, First Skill.',introduction:'Review Copper Ingot smelting: you need ore and wood for fuel.',practice:'Train Smithing to level 5 and inspect a suitable equipment recipe.',connection:'Mining + Woodcutting → Smithing → gear'},
 {skillId:'cooking',title:'Prepare for longer fights',group:'create',afterQuest:'QST_002',unlockHint:'Claim First Blood, First Skill.',introduction:'Open Cooking and review a fish recipe and its fuel cost.',practice:'Train Cooking to level 5, then take prepared food into a hunt.',connection:'Fishing + Woodcutting → Cooking → sustain'},
 {skillId:'tailoring',title:'Protection from gathered goods',group:'create',afterQuest:'QST_002',unlockHint:'Claim First Blood, First Skill.',introduction:'Open Tailoring and inspect a class-appropriate equipment recipe.',practice:'Train Tailoring to level 5, learning which materials the recipe needs.',connection:'Gathered materials → Tailoring → armor'},
 {skillId:'alchemy',title:'Ingredients into brews',group:'create',afterQuest:'QST_004',unlockHint:'Claim Tools of the Trade.',introduction:'Review Alchemy recipes and trace their Herbalism ingredients.',practice:'Train Alchemy to level 5 and learn when to use consumables.',connection:'Herbalism → Alchemy → useful buffs'},
 {skillId:'faith',title:'A blessing to travel with',group:'specialize',characterLevel:5,unlockHint:'Reach character level 5.',introduction:'Open Faith, inspect Holy Water costs and choose a practice.',practice:'Train Faith to level 5 and review the active blessing choices.',connection:'Faith practice → a selected blessing'},
 {skillId:'enchanting',title:'Refine what you already own',group:'specialize',afterQuest:'QST_005',unlockHint:'Claim Into Ironwood.',introduction:'Explore Enchanting and inspect its materials and gear requirements.',practice:'Train Enchanting to level 5 when eligible, and learn how equipment can be improved.',connection:'Gems and materials → Enchanting → improved gear'},
];
export interface JournalSkillLessonProgress{
 lesson:JournalSkillLesson;
 level:number;
 introduced:boolean;
 starterComplete:boolean;
 practiceComplete:boolean;
 status:'preview'|'begin'|'practice'|'complete';
}
export function journalSkillLessonProgress(state:Pick<GameState,'quests'|'skills'|'character'>):JournalSkillLessonProgress[]{
 const claimed=new Set(state.quests.filter(row=>row.status==='claimed').map(row=>row.questId));
 return JOURNAL_SKILL_LESSONS.map(lesson=>{
  const level=state.skills.find(row=>row.skillId===lesson.skillId)?.level??1;
  const introduced=(!lesson.afterQuest||claimed.has(lesson.afterQuest))&&(!lesson.characterLevel||(state.character?.level??0)>=lesson.characterLevel);
  const starterComplete=level>=2,practiceComplete=level>=5;
  return {lesson,level,introduced:introduced||starterComplete,starterComplete,practiceComplete,
   status:practiceComplete?'complete':!introduced&&!starterComplete?'preview':starterComplete?'practice':'begin'};
 });
}
export function journalSkillLessonSummary(state:Pick<GameState,'quests'|'skills'|'character'>){
 const rows=journalSkillLessonProgress(state);
 return {total:rows.length,practiced:rows.filter(row=>row.practiceComplete).length,
  started:rows.filter(row=>row.starterComplete).length,introduced:rows.filter(row=>row.introduced).length};
}

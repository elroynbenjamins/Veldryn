import type {PersonalRecordEntry} from './personal-records-v43';

export type JournalAchievementTier='novice'|'adventurer'|'veteran'|'master'|'grandmaster';
export type JournalAchievementCategory='combat'|'skills'|'professions'|'exploration'|'dungeons'|'companions'|'collections'|'account';
export interface JournalAchievementDefinition{id:string;category:JournalAchievementCategory;tier:JournalAchievementTier;title:string;description:string;metricKey:string;target:number;rewardTitleId?:string}
export interface JournalTitleDefinition{id:string;name:string;description:string;sourceAchievementId:string}
export interface JournalProgressSnapshot{metrics:Record<string,number>}
export interface JournalState{schemaVersion:42;accountId:string;revision:number;unlockedAchievements:Record<string,number>;unlockedTitles:Record<string,number>;selectedTitleByCharacter:Record<string,string|undefined>;records:Record<string,PersonalRecordEntry>}
const TIERS:JournalAchievementTier[]=['novice','adventurer','veteran','master','grandmaster'];
const ladder=(category:JournalAchievementCategory,key:string,name:string,metricKey:string,targets:number[],descriptions:string[],title?:JournalTitleDefinition)=>targets.map((target,index):JournalAchievementDefinition=>({id:`${key}_${TIERS[index]}`,category,tier:TIERS[index],title:`${name} — ${TIERS[index][0].toUpperCase()}${TIERS[index].slice(1)}`,description:descriptions[index],metricKey,target,...(index===4&&title?{rewardTitleId:title.id}:{})}));

export const JOURNAL_TITLES_V42:JournalTitleDefinition[]=[
 {id:'the_unbroken',name:'The Unbroken',description:'A title earned through exceptional lifetime combat experience.',sourceAchievementId:'combatant_grandmaster'},
 {id:'master_of_many',name:'Master of Many',description:'For accounts that grow across many skills and characters.',sourceAchievementId:'well_rounded_grandmaster'},
 {id:'grandmaster_artisan',name:'Grandmaster Artisan',description:'A title for enduring mastery of Veldryn’s professions.',sourceAchievementId:'artisan_grandmaster'},
 {id:'explorer_of_veldryn',name:'Explorer of Veldryn',description:'Awarded for extraordinary regional completion.',sourceAchievementId:'pathfinder_grandmaster'},
 {id:'deep_delver',name:'Deep Delver',description:'A title for relentless dungeon exploration.',sourceAchievementId:'delver_grandmaster'},
 {id:'companion_sage',name:'Companion Sage',description:'A title earned through an exceptional companion collection.',sourceAchievementId:'keeper_grandmaster'},
 {id:'beast_scholar',name:'Beast Scholar',description:'A title for deep knowledge of Veldryn’s creatures.',sourceAchievementId:'beast_scholar_grandmaster'},
 {id:'orderbound',name:'Orderbound',description:'A title for long-term consistency on Weekly Orders.',sourceAchievementId:'orderbound_grandmaster'},
 {id:'masterwork_savant',name:'Masterwork Savant',description:'A title for an account that has mastered many distinct profession actions.',sourceAchievementId:'mastery_hall_grandmaster'},
];
const title=(id:string)=>JOURNAL_TITLES_V42.find(row=>row.id===id)!;
export const JOURNAL_ACHIEVEMENTS_V42:JournalAchievementDefinition[]=[
 ...ladder('combat','combatant','Combatant','combat.total_kills',[100,1000,5000,25000,100000],['Defeat 100 enemies.','Defeat 1,000 enemies.','Defeat 5,000 enemies.','Defeat 25,000 enemies.','Defeat 100,000 enemies.'],title('the_unbroken')),
 ...ladder('skills','well_rounded','Well-Rounded','account.combined_skill_levels',[250,500,950,1600,2500],['Reach 250 combined account skill levels.','Reach 500 combined account skill levels.','Reach 950 combined account skill levels.','Reach 1,600 combined account skill levels.','Reach 2,500 combined account skill levels.'],title('master_of_many')),
 ...ladder('professions','artisan','Artisan','profession.actions_completed',[250,2500,15000,75000,250000],['Complete 250 profession actions.','Complete 2,500 profession actions.','Complete 15,000 profession actions.','Complete 75,000 profession actions.','Complete 250,000 profession actions.'],title('grandmaster_artisan')),
 ...ladder('professions','mastery_hall','Mastery Hall','profession.mastered_actions',[1,3,6,12,20],['Master one profession activity or recipe at Rank 50.','Master three distinct profession activities or recipes.','Master six distinct profession activities or recipes.','Master twelve distinct profession activities or recipes.','Master twenty distinct profession activities or recipes.'],title('masterwork_savant')),
 ...ladder('exploration','pathfinder','Pathfinder','regions.overall_completion_percent',[10,25,50,75,100],['Reach 10% overall Region Completion.','Reach 25% overall Region Completion.','Reach 50% overall Region Completion.','Reach 75% overall Region Completion.','Reach 100% overall Region Completion.'],title('explorer_of_veldryn')),
 ...ladder('dungeons','delver','Delver','dungeons.clears',[5,25,100,500,2000],['Clear five dungeons.','Clear 25 dungeons.','Clear 100 dungeons.','Clear 500 dungeons.','Clear 2,000 dungeons.'],title('deep_delver')),
 ...ladder('companions','keeper','Companion Keeper','companions.collection_percent',[10,25,50,75,100],['Reach 10% Companion Collection completion.','Reach 25% Companion Collection completion.','Reach 50% Companion Collection completion.','Reach 75% Companion Collection completion.','Reach 100% Companion Collection completion.'],title('companion_sage')),
 ...ladder('collections','beast_scholar','Beast Scholar','bestiary.completion_percent',[10,25,50,75,100],['Reach 10% Bestiary completion.','Reach 25% Bestiary completion.','Reach 50% Bestiary completion.','Reach 75% Bestiary completion.','Reach 100% Bestiary completion.'],title('beast_scholar')),
 ...ladder('account','orderbound','Orderbound','weekly_orders.completed',[4,20,100,300,750],['Complete four Weekly Orders.','Complete 20 Weekly Orders.','Complete 100 Weekly Orders.','Complete 300 Weekly Orders.','Complete 750 Weekly Orders.'],title('orderbound')),
];

export function newJournalState(accountId:string):JournalState{if(!accountId)throw new Error('account_required');return {schemaVersion:42,accountId,revision:0,unlockedAchievements:{},unlockedTitles:{},selectedTitleByCharacter:{},records:{}}}
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export function journalAchievementProgress(state:JournalState,snapshot:JournalProgressSnapshot){
 return JOURNAL_ACHIEVEMENTS_V42.map(definition=>{const current=Math.max(0,snapshot.metrics[definition.metricKey]??0);return {definition,current,target:definition.target,progress:clamp(definition.target?current/definition.target:1),complete:current>=definition.target,unlockedAtMs:state.unlockedAchievements[definition.id]}});
}
export function applyJournalSnapshot(state:JournalState,snapshot:JournalProgressSnapshot,nowMs:number){
 const newlyUnlockedAchievementIds:string[]=[],newlyUnlockedTitleIds:string[]=[];
 for(const row of journalAchievementProgress(state,snapshot)){if(!row.complete||state.unlockedAchievements[row.definition.id]!==undefined)continue;state.unlockedAchievements[row.definition.id]=nowMs;newlyUnlockedAchievementIds.push(row.definition.id);if(row.definition.rewardTitleId&&state.unlockedTitles[row.definition.rewardTitleId]===undefined){state.unlockedTitles[row.definition.rewardTitleId]=nowMs;newlyUnlockedTitleIds.push(row.definition.rewardTitleId)}}
 return {newlyUnlockedAchievementIds,newlyUnlockedTitleIds};
}
export function selectJournalTitle(state:JournalState,characterId:string,titleId?:string){if(!characterId)throw new Error('character_required');if(titleId&&state.unlockedTitles[titleId]===undefined)throw new Error('title_locked');state.selectedTitleByCharacter[characterId]=titleId}
export function journalCompletionPercent(state:JournalState,snapshot:JournalProgressSnapshot){const rows=journalAchievementProgress(state,snapshot),done=rows.filter(row=>row.complete||row.unlockedAtMs!==undefined).length;return rows.length?Math.round(done/rows.length*1000)/10:100}

import type {GameState} from './types';
import {professionMasteryRank} from './profession-mastery-v40';

export type EarlyFeatureId='dailySupplies'|'pets'|'accountBonuses'|'events'|'companions'|'contracts'|'classChallenges'|'masteryHall'|'dungeons'|'guild';

type QuestUnlockRule={kind:'quest';questId:string;title:string;requirement:string;description:string;order:number};
type MasteryUnlockRule={kind:'mastery';rank:number;title:string;requirement:string;description:string;order:number};
type CharacterLevelUnlockRule={kind:'character_level';level:number;title:string;requirement:string;description:string;order:number};
export type EarlyFeatureUnlockRule=QuestUnlockRule|MasteryUnlockRule|CharacterLevelUnlockRule;

export const EARLY_FEATURE_UNLOCKS:Record<EarlyFeatureId,EarlyFeatureUnlockRule>={
 dailySupplies:{kind:'quest',questId:'QST_002',title:'Daily Supplies',requirement:'Complete First Blood, First Skill',description:'Daily Supplies appear after you have completed your first guided skill milestone.',order:2},
 pets:{kind:'quest',questId:'QST_003',title:'Pets',requirement:'Complete A Hound\'s Trail',description:'Pets unlock after you have learned the basics of combat, gathering and early regional progression.',order:3},
 accountBonuses:{kind:'quest',questId:'QST_003',title:'Account Bonuses',requirement:'Complete A Hound\'s Trail',description:'The bonus overview becomes useful once your first collection systems begin to unlock.',order:3},
 events:{kind:'quest',questId:'QST_004',title:'Live Events',requirement:'Complete Tools of the Trade',description:'Live Events unlock after you have learned the basic equipment loop.',order:4},
 companions:{kind:'quest',questId:'QST_005',title:'Companions',requirement:'Complete Into Ironwood',description:'The Companion Sanctuary unlocks after reaching Level 10 and entering deeper Ironwood progression.',order:5},
 contracts:{kind:'quest',questId:'QST_006',title:'Contract Board',requirement:'Complete Thorn Beneath',description:'Weekly Contracts unlock after the core campaign, combat and Companion introductions are established.',order:6},
 classChallenges:{kind:'quest',questId:'QST_007',title:'Class Challenges',requirement:'Complete Silver on the Water',description:'Personal daily, weekly and monthly Class Challenges arrive after the first regional gathering loop.',order:7},
 masteryHall:{kind:'mastery',rank:10,title:'Mastery Hall',requirement:'Reach Rank 10 in any profession activity',description:'The Mastery Hall appears once you have a profession record worth comparing and pursuing.',order:8},
 dungeons:{kind:'character_level',level:15,title:'Dungeons',requirement:'Reach character level 15',description:'Co-op Dungeons unlock once your character is ready for the first Asterfall dungeon tier and role-based group combat.',order:9},
 guild:{kind:'quest',questId:'QST_011',title:'Guilds',requirement:'Complete Place Among Guilds',description:'Guilds unlock at the campaign milestone where Asterfall formally recognizes your adventurer.',order:11},
};

export const EARLY_FEATURE_UNLOCK_ORDER=(Object.keys(EARLY_FEATURE_UNLOCKS) as EarlyFeatureId[]).sort((a,b)=>EARLY_FEATURE_UNLOCKS[a].order-EARLY_FEATURE_UNLOCKS[b].order);

function questClaimed(state:GameState,questId:string){return state.quests.some(row=>row.questId===questId&&row.status==='claimed');}
function bestProfessionMasteryRank(state:GameState){return Math.max(0,...Object.values(state.account.professionMasteryByAction??{}).map(row=>professionMasteryRank(row.points)));}

export function earlyFeatureUnlocked(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id];
 if(rule.kind==='quest')return questClaimed(state,rule.questId);
 if(rule.kind==='mastery')return bestProfessionMasteryRank(state)>=rule.rank;
 return (state.character?.level??0)>=rule.level;
}
export function earlyFeatureUnlockProgress(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id];
 if(rule.kind==='quest'){
  const quest=state.quests.find(row=>row.questId===rule.questId);
  return {id,unlocked:earlyFeatureUnlocked(state,id),questId:rule.questId,title:rule.title,requirement:rule.requirement,description:rule.description,status:quest?.status??'locked',progress:quest?.progress??0,order:rule.order};
 }
 if(rule.kind==='mastery'){const rank=bestProfessionMasteryRank(state);return {id,unlocked:rank>=rule.rank,questId:undefined,title:rule.title,requirement:rule.requirement,description:rule.description,status:rank>=rule.rank?'claimed':'active',progress:rank,order:rule.order};}
 const level=state.character?.level??0;return {id,unlocked:level>=rule.level,questId:undefined,title:rule.title,requirement:rule.requirement,description:rule.description,status:level>=rule.level?'claimed':'active',progress:level,order:rule.order};
}

export interface EarlyFeatureUnlockMoment{
 id:'pets'|'companions';
 title:string;
 eyebrow:string;
 description:string;
 bullets:string[];
 actionLabel:string;
 destination:'Collections'|'Companions';
}
export function newlyUnlockedEarlyFeatures(before:GameState|null|undefined,after:GameState|null|undefined):EarlyFeatureUnlockMoment[]{
 if(!before||!after)return [];
 const out:EarlyFeatureUnlockMoment[]=[];
 if(!earlyFeatureUnlocked(before,'pets')&&earlyFeatureUnlocked(after,'pets'))out.push({
  id:'pets',eyebrow:'NEW SYSTEM',title:'Pets Unlocked',
  description:'Rare pets can now appear from eligible combat, gathering and exploration activities.',
  bullets:['Owned pets add small account-wide passive bonuses.','Choose one owned pet for its stronger active bonus.','Pet drops begin now; nothing was silently missed while the system was locked.'],
  actionLabel:'Open Pet Collection',destination:'Collections',
 });
 if(!earlyFeatureUnlocked(before,'companions')&&earlyFeatureUnlocked(after,'companions'))out.push({
  id:'companions',eyebrow:'NEW SYSTEM',title:'Companion Sanctuary Unlocked',
  description:'Build a broader roster for combat assistance, Expeditions and the global monthly Companion Trial.',
  bullets:['Companions use Tank, Damage or Support roles plus an Affinity.','Train, raise Bond and improve Housing to unlock higher level caps.','Expeditions consume food-based Stamina; Trials rotate globally every month.'],
  actionLabel:'Open Companion Sanctuary',destination:'Companions',
 });
 return out;
}

import type {GameState} from './types';

export type EarlyFeatureId='workingToward'|'dailySupplies'|'events'|'pets'|'accountBonuses'|'friends'|'companions'|'social'|'contracts'|'masteryHall'|'guild'|'rankings';
export const EARLY_FEATURE_DESTINATION_ORDER=['Progression','DailySupplies','Events','AccountBonuses','Friends','Companions','Social','MasteryHall','Guild','Rankings'] as const;

export const EARLY_FEATURE_UNLOCKS={
 workingToward:{questId:'QST_002',title:'Working Toward',requirement:'Complete First Blood, First Skill',description:'Goal planning appears after the player has completed the first guided skill milestone.'},
 dailySupplies:{questId:'QST_002',title:'Daily Supplies',requirement:'Complete First Blood, First Skill',description:'The daily reward track appears after the player understands basic skilling.'},
 events:{questId:'QST_002',title:'Events',requirement:'Complete First Blood, First Skill',description:'Live events appear early enough that new players do not miss limited-time content.'},
 pets:{questId:'QST_003',title:'Pets',requirement:'Complete A Hound\'s Trail',description:'Pets unlock after you have learned the basics of combat, gathering and early regional progression.'},
 accountBonuses:{questId:'QST_003',title:'Account Bonuses',requirement:'Complete A Hound\'s Trail',description:'Account-wide bonus summaries appear alongside the first collectible system.'},
 friends:{questId:'QST_003',title:'Friends',requirement:'Complete A Hound\'s Trail',description:'Friends unlock once the first regional combat loop has been completed.'},
 companions:{questId:'QST_005',title:'Companions',requirement:'Complete Into Ironwood',description:'The Companion Sanctuary unlocks after reaching Level 10 and entering deeper Ironwood progression.'},
 social:{questId:'QST_005',title:'Social & Parties',requirement:'Complete Into Ironwood',description:'Party recruitment and cooperative social systems unlock after the core solo loop is understood.'},
 contracts:{questId:'QST_005',title:'Contract Board',requirement:'Complete Into Ironwood',description:'Weekly and cooperative contract planning unlocks with deeper regional progression.'},
 masteryHall:{questId:'QST_005',title:'Mastery Hall',requirement:'Complete Into Ironwood',description:'Long-term profession mastery records appear once the player has enough skill actions to make the system meaningful.'},
 guild:{questId:'QST_005',title:'Guilds',requirement:'Reach Level 10 and complete Into Ironwood',description:'Guilds unlock at Level 10, once the core solo loop is established and social progression becomes useful.'},
 rankings:{questId:'QST_011',title:'Rankings',requirement:'Reach Level 20 and complete Place Among Guilds',description:'Prestige rankings unlock later at Level 20, after the player has had time to establish their character and social identity.'},
} as const;

export function earlyFeatureUnlocked(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id];
 return state.quests.some(row=>row.questId===rule.questId&&row.status==='claimed');
}
export function earlyFeatureUnlockProgress(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id],quest=state.quests.find(row=>row.questId===rule.questId);
 return {id,unlocked:earlyFeatureUnlocked(state,id),questId:rule.questId,title:rule.title,requirement:rule.requirement,description:rule.description,status:quest?.status??'locked',progress:quest?.progress??0};
}

export interface EarlyFeatureUnlockMoment{
 id:EarlyFeatureId;
 title:string;
 eyebrow:string;
 description:string;
 bullets:string[];
 actionLabel:string;
 destination:'Collections'|'Companions'|'Guild';
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
 if(!earlyFeatureUnlocked(before,'guild')&&earlyFeatureUnlocked(after,'guild'))out.push({
  id:'guild',eyebrow:'NEW SOCIAL SYSTEM',title:'Guilds Unlocked',
  description:'You can now join other adventurers, browse recruiting guilds, or create a guild when you are ready.',
  bullets:['Browse guilds and find one that matches how you play.','Guild Projects are asynchronous, so you do not need to be online at fixed times.','Guild chat, progression and cooperative PvE grow alongside your character.'],
  actionLabel:'Browse Guilds',destination:'Guild',
 });
 return out;
}

export function earlyFeatureForDestination(destination:string):EarlyFeatureId|undefined{
 const map:Record<string,EarlyFeatureId>={
  Progression:'workingToward',DailySupplies:'dailySupplies',AccountBonuses:'accountBonuses',
  Companions:'companions',Events:'events',Friends:'friends',Social:'social',MasteryHall:'masteryHall',
  Guild:'guild',Rankings:'rankings',
 };
 return map[destination];
}

export function earlyFeatureLockReason(state:GameState,destination:string){
 const id=earlyFeatureForDestination(destination);if(!id||earlyFeatureUnlocked(state,id))return '';
 return EARLY_FEATURE_UNLOCKS[id].requirement+'.';
}

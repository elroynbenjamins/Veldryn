import type {GameState} from './types';

export type EarlyFeatureId='workingToward'|'dailySupplies'|'events'|'pets'|'accountBonuses'|'friends'|'companions'|'social'|'contracts'|'masteryHall'|'guild'|'rankings';

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
 guild:{questId:'QST_011',title:'Guilds',requirement:'Complete Place Among Guilds',description:'Guild membership unlocks when the campaign explicitly recognizes the player among Asterfall guilds.'},
 rankings:{questId:'QST_011',title:'Rankings',requirement:'Complete Place Among Guilds',description:'Prestige rankings unlock alongside Guild recognition at Level 20.'},
} as const;

export function earlyFeatureUnlocked(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id];
 return state.quests.some(row=>row.questId===rule.questId&&row.status==='claimed');
}
export function earlyFeatureUnlockProgress(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id],quest=state.quests.find(row=>row.questId===rule.questId);
 return {id,unlocked:earlyFeatureUnlocked(state,id),questId:rule.questId,title:rule.title,requirement:rule.requirement,description:rule.description,status:quest?.status??'locked',progress:quest?.progress??0};
}

export type EarlyFeatureUnlockMomentId=EarlyFeatureId|'dungeons';
export interface EarlyFeatureUnlockMoment{
 id:EarlyFeatureUnlockMomentId;
 title:string;
 eyebrow:string;
 description:string;
 bullets:string[];
 actionLabel:string;
 destination:'Progression'|'Collections'|'Companions'|'Coop'|'Guild';
}
export function newlyUnlockedEarlyFeatures(before:GameState|null|undefined,after:GameState|null|undefined):EarlyFeatureUnlockMoment[]{
 if(!before||!after)return [];
 const out:EarlyFeatureUnlockMoment[]=[];
 if(!earlyFeatureUnlocked(before,'workingToward')&&earlyFeatureUnlocked(after,'workingToward'))out.push({
  id:'workingToward',eyebrow:'NEW SYSTEMS',title:'Planning & Daily Systems Unlocked',
  description:'The first guided skill milestone opens a few supporting systems without changing your core combat and skilling loop.',
  bullets:['Working Toward can pin personal goals and show concrete next steps.','Daily Supplies adds the account-wide claim track and temporary activity boost.','Live Events are now visible when seasonal content is active.'],
  actionLabel:'Open Working Toward',destination:'Progression',
 });
 if(!earlyFeatureUnlocked(before,'pets')&&earlyFeatureUnlocked(after,'pets'))out.push({
  id:'pets',eyebrow:'NEW SYSTEM',title:'Pets Unlocked',
  description:'Rare pets can now appear from eligible combat, gathering and exploration activities.',
  bullets:['Owned pets add small account-wide passive bonuses; choose one owned pet for its stronger active bonus.','Account Bonuses is now available so you can review permanent and temporary modifiers.','Friends is now available, and Pet drops begin only from this point onward.'],
  actionLabel:'Open Pet Collection',destination:'Collections',
 });
 if(!earlyFeatureUnlocked(before,'companions')&&earlyFeatureUnlocked(after,'companions'))out.push({
  id:'companions',eyebrow:'NEW SYSTEM',title:'Companion Sanctuary Unlocked',
  description:'Build a broader roster for combat assistance, Expeditions and the global monthly Companion Trial.',
  bullets:['Companions use Tank, Damage or Support roles plus an Affinity; Housing raises their level caps.','Expeditions consume food-based Stamina, while the same monthly Trial rotation is shared globally.','Social & Parties, the Contract Board and Mastery Hall are now available from the Account hub.'],
  actionLabel:'Open Companion Sanctuary',destination:'Companions',
 });
 if(!dungeonFeatureUnlocked(before)&&dungeonFeatureUnlocked(after))out.push({
  id:'dungeons',eyebrow:'NEW MODE',title:'Co-op Dungeons Unlocked',
  description:'Live co-op dungeons are now available for characters at Level 15 and above.',
  bullets:['Dungeon groups use 1 Tank, 2 Damage and 1 Support.','Runs branch across several nodes before the final boss.','Ready checks and route votes keep live groups moving without requiring identical quest progress.'],
  actionLabel:'Open Dungeons',destination:'Coop',
 });
 if(!earlyFeatureUnlocked(before,'guild')&&earlyFeatureUnlocked(after,'guild'))out.push({
  id:'guild',eyebrow:'NEW SOCIAL SYSTEM',title:'Guilds & Rankings Unlocked',
  description:'The campaign now recognizes you among Asterfall Guilds.',
  bullets:['Join or create a Guild for chat, Projects and asynchronous PvE.','Guild identity includes a unique tag, emblem, border and configurable colors.','Prestige Rankings are now available alongside Guild recognition.'],
  actionLabel:'Open Guilds',destination:'Guild',
 });
 return out;
}

export function earlyFeatureForDestination(destination:string):EarlyFeatureId|undefined{
 const map:Record<string,EarlyFeatureId>={
  Progression:'workingToward',DailySupplies:'dailySupplies',AccountBonuses:'accountBonuses',
  Companions:'companions',Events:'events',Friends:'friends',Social:'social',Party:'social',MasteryHall:'masteryHall',
  Guild:'guild',Rankings:'rankings',
 };
 return map[destination];
}

export const DUNGEON_UNLOCK_LEVEL=15;
export function dungeonFeatureUnlocked(state:GameState){
 return Math.max(0,Math.floor(Number(state.character?.level)||0))>=DUNGEON_UNLOCK_LEVEL;
}

export function earlyFeatureLockReason(state:GameState,destination:string){
 if(destination==='Dungeon'||destination==='Coop')return dungeonFeatureUnlocked(state)?'':`Reach character level ${DUNGEON_UNLOCK_LEVEL} to unlock Dungeons.`;
 const id=earlyFeatureForDestination(destination);if(!id||earlyFeatureUnlocked(state,id))return '';
 return EARLY_FEATURE_UNLOCKS[id].requirement+'.';
}

import type {GameState} from './types';

export type EarlyFeatureId='dailySupplies'|'events'|'pets'|'accountBonuses'|'friends'|'companions'|'social'|'contracts'|'masteryHall'|'guild'|'party'|'rankings';
export const GUILD_UNLOCK_LEVEL=7;
export const PARTY_UNLOCK_LEVEL=20;
export const EARLY_FEATURE_DESTINATION_ORDER=['DailySupplies','Events','AccountBonuses','Friends','Companions','Social','MasteryHall','Guild','Rankings'] as const;

export const EARLY_FEATURE_UNLOCKS={
 dailySupplies:{questId:'QST_002',title:'Daily Supplies',requirement:'Complete First Blood, First Skill',description:'The daily reward track appears after the player understands basic skilling.'},
 events:{questId:'',title:'Events',requirement:'Available from the start',description:'All players can enter live events and earn their general rewards from level 1. Individual event activities may have their own requirements.'},
 pets:{questId:'QST_003',title:'Pets',requirement:'Complete A Hound\'s Trail',description:'Pets unlock after you have learned the basics of combat, gathering and early regional progression.'},
 accountBonuses:{questId:'QST_003',title:'Account Bonuses',requirement:'Complete A Hound\'s Trail',description:'Account-wide bonus summaries appear alongside the first collectible system.'},
 friends:{questId:'QST_003',title:'Friends',requirement:'Complete A Hound\'s Trail',description:'Friends unlock once the first regional combat loop has been completed.'},
 companions:{questId:'QST_005',title:'Companions',requirement:'Complete Into Ironwood',description:'The Companion Sanctuary unlocks after reaching Level 10 and entering deeper Ironwood progression.'},
 social:{questId:'QST_005',title:'Social & Parties',requirement:'Complete Into Ironwood',description:'Party recruitment and cooperative social systems unlock after the core solo loop is understood.'},
 contracts:{questId:'QST_005',title:'Contract Board',requirement:'Complete Into Ironwood',description:'Weekly and cooperative contract planning unlocks with deeper regional progression.'},
 masteryHall:{questId:'QST_005',title:'Mastery Hall',requirement:'Complete Into Ironwood',description:'Long-term profession mastery records appear once the player has enough skill actions to make the system meaningful.'},
 guild:{questId:'QST_005',title:'Guilds',requirement:`Reach Level ${GUILD_UNLOCK_LEVEL}`,description:`Guilds unlock at Level ${GUILD_UNLOCK_LEVEL}, so you can find a group before deeper regional progression.`},
 party:{questId:'QST_011',title:'Parties',requirement:`Reach Level ${PARTY_UNLOCK_LEVEL}`,description:`Persistent parties unlock at Level ${PARTY_UNLOCK_LEVEL}, after the player has had time to learn the solo loop and pick a role.`},
 rankings:{questId:'QST_011',title:'Rankings',requirement:'Reach Level 20 and complete Place Among Guilds',description:'Prestige rankings unlock later at Level 20, after the player has had time to establish their character and social identity.'},
} as const;

/** Convert internal gameplay permission failures into actionable player feedback. */
export function playerFacingGameplayError(message:string){
 return message==='events_locked'?'Events are temporarily unavailable. Please try again.':message==='contract_board_locked'?EARLY_FEATURE_UNLOCKS.contracts.requirement+' and claim its quest reward to unlock the Contract Board.':message;
}

export interface FeatureUnlockHost{character?:{level?:number}|null;quests?:readonly {questId:string;status:string}[];otherCharacters?:readonly {level?:number;quests:readonly {questId:string;status:string}[]}[];account:{guildMember?:boolean};}
export function accountQuestClaimed(state:FeatureUnlockHost,questId:string){
 if(state.quests?.some(row=>row.questId===questId&&row.status==='claimed'))return true;
 return (state.otherCharacters??[]).some(entry=>entry.quests.some(row=>row.questId===questId&&row.status==='claimed'));
}
function accountReachedLevel(state:FeatureUnlockHost,level:number){
 if((state.character?.level??0)>=level)return true;
 return (state.otherCharacters??[]).some(entry=>{
  const anyEntry=entry as any;
  const otherLevel=(typeof anyEntry.level==='number'?anyEntry.level:anyEntry.character?.level)??0;
  return otherLevel>=level;
 });
}
export function earlyFeatureUnlocked(state:FeatureUnlockHost,id:EarlyFeatureId){
 // Live Events and their general rewards are available to every character from level 1.
 // Activity-specific restrictions (e.g. expeditions and guild bosses) are enforced separately.
 if(id==='events')return true;
 const rule=EARLY_FEATURE_UNLOCKS[id];
 // Onboarding is learned once per account. New characters should not re-hide
 // Daily Supplies, social systems, Pets/Companions or Guilds after the player
 // has already reached the relevant milestone on another character.
 if(id==='guild'){
  if(state.account.guildMember)return true;
  if(accountReachedLevel(state,GUILD_UNLOCK_LEVEL))return true;
  // Legacy accounts whose quest ladder claimed QST_005 before this threshold change
  // keep the unlock they already had.
  return accountQuestClaimed(state,rule.questId);
 }
 if(id==='party'){
  return accountReachedLevel(state,PARTY_UNLOCK_LEVEL);
 }
 return accountQuestClaimed(state,rule.questId);
}
export function earlyFeatureUnlockProgress(state:GameState,id:EarlyFeatureId){
 const rule=EARLY_FEATURE_UNLOCKS[id],quest=state.quests.find(row=>row.questId===rule.questId),unlocked=earlyFeatureUnlocked(state,id);
 return {id,unlocked,questId:rule.questId,title:rule.title,requirement:rule.requirement,description:rule.description,status:id==='events'?'claimed':quest?.status??'locked',progress:id==='events'?1:quest?.progress??0};
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
  DailySupplies:'dailySupplies',AccountBonuses:'accountBonuses',
  Companions:'companions',Friends:'friends',Social:'social',MasteryHall:'masteryHall',
  Guild:'guild',Rankings:'rankings',
 };
 return map[destination];
}

export function earlyFeatureLockReason(state:GameState,destination:string){
 const id=earlyFeatureForDestination(destination);if(!id||earlyFeatureUnlocked(state,id))return '';
 return EARLY_FEATURE_UNLOCKS[id].requirement+'.';
}

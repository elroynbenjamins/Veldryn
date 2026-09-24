import type {GameState} from './types';

export type EarlyFeatureId='pets'|'companions';

export const EARLY_FEATURE_UNLOCKS={
 pets:{questId:'QST_003',title:'Pets',requirement:'Complete A Hound\'s Trail',description:'Pets unlock after you have learned the basics of combat, gathering and early regional progression.'},
 companions:{questId:'QST_005',title:'Companions',requirement:'Complete Into Ironwood',description:'The Companion Sanctuary unlocks after reaching Level 10 and entering deeper Ironwood progression.'},
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

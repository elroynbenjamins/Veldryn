import type {GameState,QuestState} from './types';

export type EarlyFeatureId='pets'|'companions';

export const EARLY_FEATURE_GATES={
 pets:{
  id:'pets' as const,
  questId:'QST_002',
  label:'Pets',
  requirement:'Complete “First Blood, First Skill”',
  detail:'Learn the first combat and gathering loops before Pet collecting and bonuses open.',
 },
 companions:{
  id:'companions' as const,
  questId:'QST_005',
  label:'Companions',
  requirement:'Complete “Into Ironwood”',
  detail:'Reach Level 10 and enter deeper Ironwood before the Companion Sanctuary opens.',
 },
} as const;

function allQuestSets(state:GameState):QuestState[][]{
 return [state.quests,...(state.otherCharacters??[]).map(entry=>entry.quests)];
}
function questClaimedAnywhere(state:GameState,questId:string){
 return allQuestSets(state).some(quests=>quests.some(quest=>quest.questId===questId&&quest.status==='claimed'));
}
function legacyOwnershipUnlock(state:GameState,id:EarlyFeatureId){
 if(id==='pets')return (state.account.unlockedCosmeticPetIds?.length??0)>0||(state.character?.ownedPetIds?.length??0)>0||(state.otherCharacters??[]).some(entry=>(entry.character.ownedPetIds?.length??0)>0);
 return (state.account.unlockedCombatCompanionIds?.length??0)>0;
}
export function earlyFeatureUnlocked(state:GameState,id:EarlyFeatureId){
 const gate=EARLY_FEATURE_GATES[id];
 return legacyOwnershipUnlock(state,id)||questClaimedAnywhere(state,gate.questId);
}
export function earlyFeatureGate(state:GameState,id:EarlyFeatureId){
 const gate=EARLY_FEATURE_GATES[id],unlocked=earlyFeatureUnlocked(state,id);
 const activeQuest=state.quests.find(quest=>quest.questId===gate.questId);
 return {...gate,unlocked,activeQuestStatus:activeQuest?.status??'locked'};
}

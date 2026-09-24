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

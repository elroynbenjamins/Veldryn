import type { RegionalCrisisDefinition } from './regional-crises';

export interface CrisisBossUnlock {crisisInstanceId:string;worldBossTemplateId:string;unlockStageId:string;}
export function bossUnlockForReachedStages(crisisInstanceId:string,definition:RegionalCrisisDefinition,reachedStageIds:readonly string[]):CrisisBossUnlock|undefined{
  const reached=new Set(reachedStageIds);
  for(const stage of definition.stages){
    if(stage.unlockWorldBossTemplateId&&reached.has(stage.id)) return {crisisInstanceId,worldBossTemplateId:stage.unlockWorldBossTemplateId,unlockStageId:stage.id};
  }
  return undefined;
}

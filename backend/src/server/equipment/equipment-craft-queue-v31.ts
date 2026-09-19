import {buildCraftPlanV31,CraftPlanStepV31,CraftPlannerStateV31} from './equipment-crafting-plan-v31';

export interface CraftQueueStepV31 extends CraftPlanStepV31 {position:number;state:'pending'|'running'|'done'|'blocked'|'cancelled';}
export interface CraftQueueV31 {id:string;characterId:string;pieceId:string;createdAt:string;state:'planned'|'running'|'blocked'|'completed'|'cancelled';steps:readonly CraftQueueStepV31[];blockerKeys:readonly string[];}
export interface CraftQueueRepoV31 {findByIdempotency(characterId:string,key:string):Promise<CraftQueueV31|undefined>;insertQueue(queue:CraftQueueV31,idempotencyKey:string):Promise<void>;}

/** Persists only craft/process work. Gathering/combat/dungeon work remains a blocker, never an automated queue step. */
export async function createCraftQueueV31(repo:CraftQueueRepoV31,input:{id:string;characterId:string;pieceId:string;state:CraftPlannerStateV31;now:Date;idempotencyKey:string}):Promise<CraftQueueV31>{
  const existing=await repo.findByIdempotency(input.characterId,input.idempotencyKey);if(existing)return existing;
  const plan=buildCraftPlanV31(input.pieceId,input.state);
  const steps=plan.steps.filter(s=>s.kind!=='final'||plan.canFinishNow).map((s,i)=>({...s,position:i,state:s.status==='blocked'?'blocked':'pending'} as CraftQueueStepV31));
  const queue:CraftQueueV31={id:input.id,characterId:input.characterId,pieceId:input.pieceId,createdAt:input.now.toISOString(),state:steps.some(s=>s.state==='blocked')||plan.blockers.length?'blocked':'planned',steps,blockerKeys:plan.blockers.map(b=>`${b.kind}:${b.key}`)};
  await repo.insertQueue(queue,input.idempotencyKey);return queue;
}

export function nextRunnableStepV31(queue:CraftQueueV31):CraftQueueStepV31|undefined{
  const done=new Set(queue.steps.filter(s=>s.state==='done').map(s=>s.id));
  return queue.steps.find(s=>s.state==='pending'&&s.dependsOn.every(d=>done.has(d)));
}

export function queueProgressV31(queue:CraftQueueV31){const total=queue.steps.length;const done=queue.steps.filter(s=>s.state==='done').length;return {done,total,ratio:total?done/total:1,label:`${done}/${total}`};}

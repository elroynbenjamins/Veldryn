import type {GameState} from './types';

export type VerifiedCraftOutcome='queued'|'completed';

/** Read the authoritative post-command state, never infer a Forge job from a successful HTTP response. */
export function verifyCraftCommandOutcome(
  before:GameState,after:GameState,
  options:{recipeId:string;outputItemId?:string;requestedCount:number;timed:boolean;tool:boolean},
):VerifiedCraftOutcome{
  if(!options.timed)return 'completed';
  const oldIds=new Set((before.account.equipmentCraftingQueue??[]).map(job=>job.id));
  const queued=(after.account.equipmentCraftingQueue??[])
    .filter(job=>job.recipeId===options.recipeId&&!oldIds.has(job.id)).length;
  if(queued>=options.requestedCount)return 'queued';

  // Backward compatibility: the pre-timed-tool production backend crafted
  // and minted physical tool copies immediately, without a Forge job.
  if(options.tool&&options.outputItemId){
    const countCopies=(state:GameState)=>(state.account.craftedGatheringToolInstances??[])
      .filter(copy=>copy.itemId===options.outputItemId).length;
    if(countCopies(after)-countCopies(before)>=options.requestedCount)return 'completed';
  }
  // The server may already have committed. Do not encourage a blind retry,
  // which can consume materials again.
  throw new Error('The server saved this craft, but the job or result cannot be verified. Refresh before doing anything else; do not retry this craft.');
}

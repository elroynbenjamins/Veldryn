import type {ItemStack} from './types';

/** Paid ingredients/gold held outside spendable inventory until brewing or cancellation. */
export interface AlchemyBatchState {
  version:1;
  recipeId:string;
  totalBatches:number;
  remainingBatches:number;
  inputsPerBatch:ItemStack[];
  goldPerBatch:number;
  outputPerBatch:ItemStack;
  cycleSeconds:number;
  /** Includes the XP multiplier at reservation time. Frozen for this finite order. */
  xpPerBatch:number;
}
export interface ActivePreparation {itemId:string;remainingEncounters:number;}

import {startAlchemyBatch} from '../src/core/alchemy';
import {startProcessingBatch} from '../src/core/processing';
import type {GameState,ItemStack} from '../src/core/types';

/** Model an already-paid reservation from before single-craft starts were introduced. */
export function legacyCraftingReservation(state:GameState,kind:'alchemy'|'processing',id:string,count:number,now:number):GameState{
 const next=kind==='alchemy'?startAlchemyBatch(state,id,1,now):startProcessingBatch(state,id,1,now);
 const batch=next.activity!.brew??next.activity!.processing!;
 let inventory=next.inventory.stacks,bank=next.bank.stacks;
 for(const input of batch.inputsPerBatch){
  let remaining=input.quantity*(count-1);
  const take=(stacks:ItemStack[])=>stacks.map(stack=>{
   const used=stack.itemId===input.itemId?Math.min(remaining,stack.quantity):0;
   remaining-=used;return {...stack,quantity:stack.quantity-used};
  }).filter(stack=>stack.quantity>0);
  inventory=take(inventory);bank=take(bank);
  if(remaining)throw new Error('Legacy fixture has insufficient ingredients');
 }
 const gold=next.character!.gold-batch.goldPerBatch*(count-1);
 if(gold<0)throw new Error('Legacy fixture has insufficient Gold');
 return {...next,character:{...next.character!,gold},inventory:{...next.inventory,stacks:inventory},bank:{...next.bank,stacks:bank},
  activity:{...next.activity!,...(kind==='alchemy'
   ?{brew:{...next.activity!.brew!,totalBatches:count,remainingBatches:count}}
   :{processing:{...next.activity!.processing!,totalBatches:count,remainingBatches:count}})}};
}

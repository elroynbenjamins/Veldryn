import type {GameState} from './types';
import type {CoopRunView} from './coop-presentation';
import {potionDef} from '../content/alchemy';

export interface DungeonHealingPotionView{
  name?:string;
  healPercent:number;
  carried:number;
  capacity:number;
  remaining:number;
  currentHp:number;
  maximumHp:number;
  canUse:boolean;
}

/** The UI is advisory; the transaction validates authoritative HP, potion choice
 * and inventory again. Never trust a client-side charge counter for settlement. */
export function dungeonHealingPotionView(run:CoopRunView,state:GameState):DungeonHealingPotionView|undefined{
 const actorId=state.character?.id;
 if(!actorId)return undefined;
 const self=run.roleSlots.find(member=>member.memberId===actorId);
 if(!self)return undefined;
 const selected=state.character?.equippedHealingPotionId,potion=potionDef(selected);
 const effect=potion?.effect.kind==='healing'?potion.effect:undefined;
 const valid=!!effect;
 const carried=valid?state.inventory.stacks.filter(row=>row.itemId===selected).reduce((sum,row)=>sum+Math.max(0,row.quantity),0):0;
 const capacity=run.potionChargeCapacity??({1:3,2:3,3:4,4:4,5:5} as const)[run.tier??1];
 const used=Math.max(0,Math.floor(run.healingPotionUsesByActor?.[actorId]??0));
 const remaining=Math.max(0,capacity-used);
 const currentHp=self.currentHp??0,maximumHp=self.maximumHp??0;
 return {
  name:valid?potion?.name:undefined,
  healPercent:effect?Math.round(effect.maxHpFraction*100):0,
  carried,capacity,remaining,currentHp,maximumHp,
  canUse:Boolean(valid&&carried>0&&remaining>0&&currentHp>0&&currentHp<maximumHp&&self.ready!==false&&run.phase==='awaiting_choice'),
 };
}

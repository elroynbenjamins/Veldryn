import type {GameState} from './types';
import type {CoopRunView} from './coop-presentation';
import {POTIONS} from '../content/alchemy';

export interface DungeonTonicOption {
 id:string;
 name:string;
 effect:string;
 owned:number;
 tier:number;
}
export interface DungeonTonicView {
 open:boolean;
 preparedName?:string;
 options:DungeonTonicOption[];
}

/** Only pre-run tonics are shown. Authoritative ownership and the first-room
 * restriction are independently enforced by the co-op transaction. */
export function dungeonTonicView(run:CoopRunView,state:GameState):DungeonTonicView|undefined {
 const actor=state.character?.id;
 if(!actor||!run.roleSlots.some(row=>row.memberId===actor))return undefined;
 const selectedId=run.preparedAlchemyPotionIdsByActor?.[actor];
 const open=run.potionPreparationOpen===true&&run.phase==='awaiting_choice'&&!run.pendingCombat&&!selectedId;
 if(!open&&!selectedId)return undefined;
 const options=POTIONS.filter(potion=>potion.effect.kind==='preparation').map(potion=>{
  const e=potion.effect;
  if(e.kind!=='preparation')throw new Error('invalid_potion_definition');
  const components:string[]=[];
  if(e.damageDealtFraction>0)components.push('+'+Math.round(e.damageDealtFraction*100)+'% damage');
  if(e.damageReductionFraction>0)components.push('−'+Math.round(e.damageReductionFraction*100)+'% damage taken');
  if(e.healingStrengthFraction>0)components.push('+'+Math.round(e.healingStrengthFraction*100)+'% healing/shields');
  return {id:potion.id,name:potion.name,effect:components.join(' · '),tier:potion.tier,
   owned:state.inventory.stacks.filter(row=>row.itemId===potion.id).reduce((n,row)=>n+Math.max(0,row.quantity),0)};
 }).filter(row=>row.owned>0).sort((a,b)=>a.tier-b.tier||a.name.localeCompare(b.name));
 return {open,preparedName:POTIONS.find(row=>row.id===selectedId)?.name,options:open?options:[]};
}

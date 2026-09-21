import {itemDef} from '../content/items';
import {itemRarity,ItemRarity} from './item-rarity';
import {GameState,GearEnhancementState,GemEffect,GemStat,ItemStack} from './types';

export const MAX_UPGRADE_RANK=10;
export const UPGRADE_STAT_PER_RANK=.03;
export const EFFECT_GEM_BONUS_CAP=.15;
const SUCCESS_BY_TARGET=[0,1,.95,.85,.70,.55,.40,.28,.18,.10,.05];
const DUST_BY_TARGET=[0,4,8,15,24,36,52,72,96,125,160];
const CORE_BY_TARGET=[0,0,0,0,1,2,3,5,7,10,14];
const RARITY_COST:Record<ItemRarity,number>={common:1,uncommon:1.2,rare:1.6,epic:2.2,legendary:3.2,mythic:4.5};
const SOCKETS:Record<ItemRarity,{stat:boolean;effect:boolean}>={
 common:{stat:false,effect:false},
 uncommon:{stat:true,effect:false},
 rare:{stat:true,effect:true},
 epic:{stat:true,effect:true},
 legendary:{stat:true,effect:true},
 mythic:{stat:true,effect:true},
};

export type GemSocketKind='stat'|'effect';
export interface GemSocketPlacement{kind:GemSocketKind;unlocked:boolean;gemId?:string;index?:number}
export interface LegacyGemPlacement{gemId:string;index:number;kind?:GemSocketKind}

export function gearEnhancement(state:GameState,itemId:string):GearEnhancementState{
  const raw=state.character?.gearEnhancements?.[itemId];
  return {rank:Math.max(0,Math.min(MAX_UPGRADE_RANK,Math.floor(raw?.rank??0))),failures:Math.max(0,Math.floor(raw?.failures??0)),gemIds:Array.isArray(raw?.gemIds)?raw!.gemIds.slice(0,3):[]};
}
export function hasEnhancement(state:GameState,itemId:string){const enhancement=gearEnhancement(state,itemId);return enhancement.rank>0||enhancement.gemIds.length>0;}
export function gemSocketAvailability(itemId:string){
 const item=itemDef(itemId);return item.type==='gear'?SOCKETS[itemRarity(item)]:{stat:false,effect:false};
}
export function gemSocketCapacity(itemId:string){const slots=gemSocketAvailability(itemId);return Number(slots.stat)+Number(slots.effect);}
export function gemSocketKind(gemId:string):GemSocketKind|undefined{
 const gem=itemDef(gemId);if(gem.type!=='gem')return undefined;
 if(gem.gemStat)return 'stat';if(gem.gemEffect)return 'effect';return undefined;
}
export function gemSocketLayout(state:GameState,itemId:string){
 const enhancement=gearEnhancement(state,itemId),availability=gemSocketAvailability(itemId);
 let stat:GemSocketPlacement={kind:'stat',unlocked:availability.stat},effect:GemSocketPlacement={kind:'effect',unlocked:availability.effect};
 const legacyExtras:LegacyGemPlacement[]=[];
 enhancement.gemIds.forEach((gemId,index)=>{
  const kind=gemSocketKind(gemId);
  if(kind==='stat'&&stat.gemId===undefined)stat={...stat,gemId,index};
  else if(kind==='effect'&&effect.gemId===undefined)effect={...effect,gemId,index};
  else legacyExtras.push({gemId,index,kind});
 });
 return {stat,effect,legacyExtras,filled:Number(Boolean(stat.gemId))+Number(Boolean(effect.gemId)),capacity:gemSocketCapacity(itemId)};
}
export function upgradeQuote(state:GameState,itemId:string){
  const item=itemDef(itemId);if(item.type!=='gear')throw new Error('Only equipment can be upgraded');
  const current=gearEnhancement(state,itemId),targetRank=current.rank+1;
  if(targetRank>MAX_UPGRADE_RANK)return {currentRank:current.rank,targetRank,successChance:0,dust:0,cores:0,gold:0,maxed:true};
  const rarity=itemRarity(item),pity=Math.min(.10,current.failures*.02);
  return {currentRank:current.rank,targetRank,successChance:Math.min(1,SUCCESS_BY_TARGET[targetRank]+pity),dust:DUST_BY_TARGET[targetRank],cores:CORE_BY_TARGET[targetRank],gold:Math.ceil(150*targetRank*targetRank*RARITY_COST[rarity]/10)*10,maxed:false};
}
function qty(stacks:ItemStack[],id:string){return stacks.find(s=>s.itemId===id)?.quantity??0;}
export function combinedQuantity(state:GameState,id:string){return qty(state.inventory.stacks,id)+qty(state.bank.stacks,id);}
function consume(stacks:ItemStack[],id:string,amount:number){let left=amount;return stacks.map(stack=>{if(stack.itemId!==id||left<=0)return stack;const used=Math.min(left,stack.quantity);left-=used;return {...stack,quantity:stack.quantity-used};}).filter(stack=>stack.quantity>0);}
function consumeAcross(state:GameState,id:string,amount:number){if(combinedQuantity(state,id)<amount)throw new Error(`Need ${amount} ${itemDef(id).name}`);const inventory=consume(state.inventory.stacks,id,amount),used=qty(state.inventory.stacks,id)-qty(inventory,id);return {...state,inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:consume(state.bank.stacks,id,amount-used)}};}
function setEnhancement(state:GameState,itemId:string,value:GearEnhancementState){return {...state,character:{...state.character!,gearEnhancements:{...(state.character!.gearEnhancements??{}),[itemId]:value}}};}
function requireEquipped(state:GameState,itemId:string){if(!state.character||!Object.values(state.character.equipment).includes(itemId))throw new Error('Equip this item first');}
export function attemptEquipmentUpgrade(state:GameState,itemId:string,roll=Math.random()){
  requireEquipped(state,itemId);if(roll<0||roll>=1)throw new Error('Invalid upgrade roll');
  const quote=upgradeQuote(state,itemId);if(quote.maxed)throw new Error('This item is already +10');
  if(state.character!.gold<quote.gold)throw new Error(`Need ${quote.gold} gold`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-quote.gold}};
  next=consumeAcross(next,'TEMPERING_DUST',quote.dust);if(quote.cores)next=consumeAcross(next,'TEMPERING_CORE',quote.cores);
  const prior=gearEnhancement(state,itemId),success=roll<quote.successChance;
  // Failed attempts are already a severe material sink; items are never destroyed or downgraded.
  const rank=success?quote.targetRank:prior.rank;
  next=setEnhancement(next,itemId,{...prior,rank,failures:success?0:prior.failures+1});
  return {state:next,result:{success,oldRank:prior.rank,newRank:rank,successChance:quote.successChance,downgraded:!success&&rank<prior.rank}};
}
export function socketGem(state:GameState,itemId:string,gemId:string){
  requireEquipped(state,itemId);const gem=itemDef(gemId),kind=gemSocketKind(gemId);if(gem.type!=='gem'||!kind)throw new Error('That item is not a supported gem');
  const layout=gemSocketLayout(state,itemId),slot=layout[kind];if(!slot.unlocked)throw new Error(kind==='effect'?'Effect sockets require Rare or better equipment':'Stat sockets require Uncommon or better equipment');
  if(slot.gemId)throw new Error(`The ${kind} gem socket is already filled`);
  const enhancement=gearEnhancement(state,itemId);
  let next=consumeAcross(state,gemId,1);next=setEnhancement(next,itemId,{...enhancement,gemIds:[...enhancement.gemIds,gemId]});return next;
}
function addInventory(state:GameState,itemId:string){const existing=state.inventory.stacks.find(s=>s.itemId===itemId);if(!existing&&state.inventory.stacks.length>=state.inventory.capacity)throw new Error('Inventory is full');const stacks=existing?state.inventory.stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity+1}:s):[...state.inventory.stacks,{itemId,quantity:1}];return {...state,inventory:{...state.inventory,stacks}};}
export function unsocketGem(state:GameState,itemId:string,index:number){
  requireEquipped(state,itemId);const enhancement=gearEnhancement(state,itemId),gemId=enhancement.gemIds[index];if(!gemId)throw new Error('That socket is empty');const fee=(itemDef(gemId).gemTier??1)*500;if(state.character!.gold<fee)throw new Error(`Need ${fee} gold to safely extract this gem`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-fee}};next=addInventory(next,gemId);next=setEnhancement(next,itemId,{...enhancement,gemIds:enhancement.gemIds.filter((_,i)=>i!==index)});return next;
}
export function gearStatsAtRank(itemId:string,rank:number){const item=itemDef(itemId),m=1+Math.max(0,Math.min(MAX_UPGRADE_RANK,rank))*UPGRADE_STAT_PER_RANK,scale=(value:number)=>value>0?Math.ceil(value*m):Math.round(value*m);return {hp:scale(item.hp??0),attack:scale(item.attack??0),defense:scale(item.defense??0)};}
export function enhancedGearStats(state:GameState,itemId:string){return gearStatsAtRank(itemId,gearEnhancement(state,itemId).rank);}
export function equippedGemBonuses(state:GameState):Record<GemStat,number>{
 const result={attack:0,defense:0,hp:0};if(!state.character)return result;
 // Grandfathered duplicate stat gems remain effective until extracted so old saves are never silently nerfed.
 for(const itemId of Object.values(state.character.equipment)){if(!itemId)continue;for(const gemId of gearEnhancement(state,itemId).gemIds){const gem=itemDef(gemId);if(gem.type==='gem'&&gem.gemStat)result[gem.gemStat]+=gem.gemPercent??0;}}
 return result;
}
export function equippedGemEffects(state:GameState):Record<GemEffect,number>{
 const result={critChance:0,haste:0,evasion:0};if(!state.character)return result;
 for(const itemId of Object.values(state.character.equipment)){if(!itemId)continue;for(const gemId of gearEnhancement(state,itemId).gemIds){const gem=itemDef(gemId);if(gem.type==='gem'&&gem.gemEffect)result[gem.gemEffect]+=gem.gemEffectValue??0;}}
 return result;
}

import {itemDef} from '../content/items';
import {itemRarity,ItemRarity} from './item-rarity';
import {EffectGemEffectId,GameState,GearEnhancementState,GemKind,GemStat,ItemStack} from './types';

export const MAX_UPGRADE_RANK=10;
export const UPGRADE_STAT_PER_RANK=.03;
const SUCCESS_BY_TARGET=[0,1,.95,.85,.70,.55,.40,.28,.18,.10,.05];
const DUST_BY_TARGET=[0,4,8,15,24,36,52,72,96,125,160];
const CORE_BY_TARGET=[0,0,0,0,1,2,3,5,7,10,14];
const RARITY_COST:Record<ItemRarity,number>={common:1,uncommon:1.2,rare:1.6,epic:2.2,legendary:3.2,mythic:4.5};
const EFFECT_CAP:Record<EffectGemEffectId,number>={momentum:.08,bulwark:.08,renewal:.20,fortune:.10};

export interface GemSocketLayout{statUnlocked:boolean;effectUnlocked:boolean;capacity:0|1|2}
export interface EquippedEffectGemBonuses{
  momentum:number;
  bulwark:number;
  renewal:number;
  fortune:number;
  combatSpeedMultiplier:number;
  incomingDamageMultiplier:number;
  recoveryMultiplier:number;
  combatGoldMultiplier:number;
}

function gemKindById(gemId:string):GemKind|undefined{
  try{
    const gem=itemDef(gemId);
    if(gem.type!=='gem')return undefined;
    if(gem.gemKind==='effect'||gem.gemEffectId)return 'effect';
    if(gem.gemStat)return 'stat';
    return undefined;
  }catch{return undefined}
}
function validGemId(value:unknown){return typeof value==='string'&&!!gemKindById(value)?value:undefined}
function flattenedGems(value:{statGemId?:string;effectGemId?:string;legacyGemIds?:readonly string[]}){return [value.statGemId,value.effectGemId,...(value.legacyGemIds??[])].filter((id):id is string=>!!id)}

export function gemSocketLayout(itemId:string):GemSocketLayout{
  const item=itemDef(itemId);
  if(item.type!=='gear')return {statUnlocked:false,effectUnlocked:false,capacity:0};
  const rarity=itemRarity(item);
  const statUnlocked=rarity!=='common';
  const effectUnlocked=!['common','uncommon'].includes(rarity);
  return {statUnlocked,effectUnlocked,capacity:(effectUnlocked?2:statUnlocked?1:0) as 0|1|2};
}
export function gemSocketCapacity(itemId:string){return gemSocketLayout(itemId).capacity;}

export function normalizeGearEnhancementState(itemId:string,raw:unknown):GearEnhancementState{
  const value=(raw&&typeof raw==='object'?raw:{}) as Partial<GearEnhancementState>;
  const layout=gemSocketLayout(itemId);
  let statGemId=validGemId(value.statGemId),effectGemId=validGemId(value.effectGemId);
  if(statGemId&&gemKindById(statGemId)!=='stat'){effectGemId=effectGemId??statGemId;statGemId=undefined}
  if(effectGemId&&gemKindById(effectGemId)!=='effect'){statGemId=statGemId??effectGemId;effectGemId=undefined}
  const legacy:string[]=[];
  if(statGemId&&!layout.statUnlocked){legacy.push(statGemId);statGemId=undefined}
  if(effectGemId&&!layout.effectUnlocked){legacy.push(effectGemId);effectGemId=undefined}
  const rawIds=[
    ...(Array.isArray((value as any).gemIds)?(value as any).gemIds:[]),
    ...(Array.isArray(value.legacyGemIds)?value.legacyGemIds:[]),
  ];
  for(const candidate of rawIds){
    const id=validGemId(candidate);if(!id||id===statGemId||id===effectGemId||legacy.includes(id))continue;
    const kind=gemKindById(id);
    if(kind==='stat'&&layout.statUnlocked&&!statGemId){statGemId=id;continue}
    if(kind==='effect'&&layout.effectUnlocked&&!effectGemId){effectGemId=id;continue}
    legacy.push(id);
  }
  const normalized={statGemId,effectGemId,legacyGemIds:legacy};
  return {
    rank:Math.max(0,Math.min(MAX_UPGRADE_RANK,Math.floor(Number(value.rank)||0))),
    failures:Math.max(0,Math.floor(Number(value.failures)||0)),
    ...normalized,
    gemIds:flattenedGems(normalized),
  };
}
export function gearEnhancement(state:GameState,itemId:string):GearEnhancementState{
  return normalizeGearEnhancementState(itemId,state.character?.gearEnhancements?.[itemId]);
}
export function activeSocketedGemIds(state:GameState,itemId:string){const e=gearEnhancement(state,itemId);return [e.statGemId,e.effectGemId].filter((id):id is string=>!!id)}
export function legacySocketedGemIds(state:GameState,itemId:string){return gearEnhancement(state,itemId).legacyGemIds??[]}
export function hasEnhancement(state:GameState,itemId:string){const enhancement=gearEnhancement(state,itemId);return enhancement.rank>0||enhancement.gemIds.length>0;}
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
function setEnhancement(state:GameState,itemId:string,value:GearEnhancementState){
  const normalized=normalizeGearEnhancementState(itemId,value);
  return {...state,character:{...state.character!,gearEnhancements:{...(state.character!.gearEnhancements??{}),[itemId]:normalized}}};
}
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
  requireEquipped(state,itemId);
  const gem=itemDef(gemId),kind=gemKindById(gemId),layout=gemSocketLayout(itemId);
  if(gem.type!=='gem'||!kind)throw new Error('That item is not a supported gem');
  const enhancement=gearEnhancement(state,itemId);
  if(kind==='stat'){
    if(!layout.statUnlocked)throw new Error('Stat Gem socket unlocks on Uncommon or better equipment');
    if(enhancement.statGemId)throw new Error('The Stat Gem socket is already filled');
    let next=consumeAcross(state,gemId,1);next=setEnhancement(next,itemId,{...enhancement,statGemId:gemId});return next;
  }
  if(!layout.effectUnlocked)throw new Error('Effect Gem socket unlocks on Rare or better equipment');
  if(enhancement.effectGemId)throw new Error('The Effect Gem socket is already filled');
  let next=consumeAcross(state,gemId,1);next=setEnhancement(next,itemId,{...enhancement,effectGemId:gemId});return next;
}
function addInventory(state:GameState,itemId:string){const existing=state.inventory.stacks.find(s=>s.itemId===itemId);if(!existing&&state.inventory.stacks.length>=state.inventory.capacity)throw new Error('Inventory is full');const stacks=existing?state.inventory.stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity+1}:s):[...state.inventory.stacks,{itemId,quantity:1}];return {...state,inventory:{...state.inventory,stacks}};}
export function unsocketGem(state:GameState,itemId:string,index:number){
  requireEquipped(state,itemId);
  const enhancement=gearEnhancement(state,itemId),legacy=enhancement.legacyGemIds??[];
  const gemId=index===0?enhancement.statGemId:index===1?enhancement.effectGemId:legacy[index-2];
  if(!gemId)throw new Error('That socket is empty');
  const fee=(itemDef(gemId).gemTier??1)*500;if(state.character!.gold<fee)throw new Error(`Need ${fee} gold to safely extract this gem`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-fee}};next=addInventory(next,gemId);
  const updated=index===0?{...enhancement,statGemId:undefined}:index===1?{...enhancement,effectGemId:undefined}:{...enhancement,legacyGemIds:legacy.filter((_,i)=>i!==index-2)};
  return setEnhancement(next,itemId,updated);
}
export function gearStatsAtRank(itemId:string,rank:number){const item=itemDef(itemId),m=1+Math.max(0,Math.min(MAX_UPGRADE_RANK,rank))*UPGRADE_STAT_PER_RANK,scale=(value:number)=>value>0?Math.ceil(value*m):Math.round(value*m);return {hp:scale(item.hp??0),attack:scale(item.attack??0),defense:scale(item.defense??0)};}
export function enhancedGearStats(state:GameState,itemId:string){return gearStatsAtRank(itemId,gearEnhancement(state,itemId).rank);}
export function equippedGemBonuses(state:GameState):Record<GemStat,number>{
  const result={attack:0,defense:0,hp:0};if(!state.character)return result;
  for(const itemId of Object.values(state.character.equipment)){if(!itemId)continue;const gemId=gearEnhancement(state,itemId).statGemId;if(!gemId)continue;const gem=itemDef(gemId);if(gem.type==='gem'&&gem.gemStat)result[gem.gemStat]+=gem.gemPercent??0;}
  return result;
}
export function equippedEffectGemBonuses(state:GameState):EquippedEffectGemBonuses{
  const totals:Record<EffectGemEffectId,number>={momentum:0,bulwark:0,renewal:0,fortune:0};
  if(state.character)for(const itemId of Object.values(state.character.equipment)){
    if(!itemId)continue;const gemId=gearEnhancement(state,itemId).effectGemId;if(!gemId)continue;const gem=itemDef(gemId);
    if(gem.type==='gem'&&gem.gemEffectId)totals[gem.gemEffectId]+=Math.max(0,gem.gemEffectValue??0);
  }
  for(const key of Object.keys(totals) as EffectGemEffectId[])totals[key]=Math.min(EFFECT_CAP[key],totals[key]);
  return {...totals,combatSpeedMultiplier:1+totals.momentum,incomingDamageMultiplier:1-totals.bulwark,recoveryMultiplier:1+totals.renewal,combatGoldMultiplier:1+totals.fortune};
}
export function effectGemDescription(gemId:string){
  const gem=itemDef(gemId);if(gem.type!=='gem'||gem.gemKind!=='effect'||!gem.gemEffectId)return '';
  const value=Math.round((gem.gemEffectValue??0)*1000)/10;
  switch(gem.gemEffectId){
    case'momentum':return `+${value}% combat action speed`;
    case'bulwark':return `-${value}% incoming combat damage`;
    case'renewal':return `+${value}% post-kill recovery`;
    case'fortune':return `+${value}% combat Gold`;
  }
}

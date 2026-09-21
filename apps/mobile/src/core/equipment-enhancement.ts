import {itemDef} from '../content/items';
import {itemRarity,ItemRarity} from './item-rarity';
import {GameState,GearEnhancementState,GemEffectId,GemSocketKind,GemStat,ItemStack} from './types';

export const MAX_UPGRADE_RANK=10;
export const UPGRADE_STAT_PER_RANK=.03;
export const EQUIPMENT_GEM_SOCKET_COUNT=2;
export const GEM_EFFECT_CAPS:Record<GemEffectId,number>={combat_speed:.10,boss_power:.15,damage_reduction:.10,recovery:.50};
const SUCCESS_BY_TARGET=[0,1,.95,.85,.70,.55,.40,.28,.18,.10,.05];
const DUST_BY_TARGET=[0,4,8,15,24,36,52,72,96,125,160];
const CORE_BY_TARGET=[0,0,0,0,1,2,3,5,7,10,14];
const RARITY_COST:Record<ItemRarity,number>={common:1,uncommon:1.2,rare:1.6,epic:2.2,legendary:3.2,mythic:4.5};

function safeGem(id:unknown){
  if(typeof id!=='string'||!id)return undefined;
  try{const item=itemDef(id);return item.type==='gem'?item:undefined}catch{return undefined}
}
export function gemSocketKind(gemId:string):GemSocketKind{
  const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');
  return gem.gemKind==='effect'||gem.gemEffect?'effect':'stat';
}
export function normalizeEnhancementGemSlots(raw:Partial<GearEnhancementState>|undefined){
  let statGemId:string|undefined,effectGemId:string|undefined;
  const namedStat=safeGem(raw?.statGemId);
  if(namedStat&&gemSocketKind(namedStat.id)==='stat')statGemId=namedStat.id;
  const namedEffect=safeGem(raw?.effectGemId);
  if(namedEffect&&gemSocketKind(namedEffect.id)==='effect')effectGemId=namedEffect.id;
  for(const id of Array.isArray(raw?.gemIds)?raw!.gemIds:[]){
    const gem=safeGem(id);if(!gem)continue;
    const kind=gemSocketKind(gem.id);
    if(kind==='stat'&&!statGemId)statGemId=gem.id;
    if(kind==='effect'&&!effectGemId)effectGemId=gem.id;
  }
  const gemIds=[statGemId,effectGemId].filter((id):id is string=>Boolean(id));
  return {statGemId,effectGemId,gemIds};
}

export function gearEnhancement(state:GameState,itemId:string):GearEnhancementState{
  const raw=state.character?.gearEnhancements?.[itemId],slots=normalizeEnhancementGemSlots(raw);
  return {rank:Math.max(0,Math.min(MAX_UPGRADE_RANK,Math.floor(raw?.rank??0))),failures:Math.max(0,Math.floor(raw?.failures??0)),...slots};
}
export function hasEnhancement(state:GameState,itemId:string){const enhancement=gearEnhancement(state,itemId);return enhancement.rank>0||enhancement.gemIds.length>0;}
export function gemSocketCapacity(itemId:string){const item=itemDef(itemId);return item.type==='gear'?EQUIPMENT_GEM_SOCKET_COUNT:0;}
export function gemSocketState(state:GameState,itemId:string){const enhancement=gearEnhancement(state,itemId);return {statGemId:enhancement.statGemId,effectGemId:enhancement.effectGemId,filled:Number(Boolean(enhancement.statGemId))+Number(Boolean(enhancement.effectGemId)),capacity:gemSocketCapacity(itemId)};}
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
function setEnhancement(state:GameState,itemId:string,value:GearEnhancementState){const slots=normalizeEnhancementGemSlots(value);return {...state,character:{...state.character!,gearEnhancements:{...(state.character!.gearEnhancements??{}),[itemId]:{...value,...slots}}}};}
function requireEquipped(state:GameState,itemId:string){if(!state.character||!Object.values(state.character.equipment).includes(itemId))throw new Error('Equip this item first');}
export function attemptEquipmentUpgrade(state:GameState,itemId:string,roll=Math.random()){
  requireEquipped(state,itemId);if(roll<0||roll>=1)throw new Error('Invalid upgrade roll');
  const quote=upgradeQuote(state,itemId);if(quote.maxed)throw new Error('This item is already +10');
  if(state.character!.gold<quote.gold)throw new Error(`Need ${quote.gold} gold`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-quote.gold}};
  next=consumeAcross(next,'TEMPERING_DUST',quote.dust);if(quote.cores)next=consumeAcross(next,'TEMPERING_CORE',quote.cores);
  const prior=gearEnhancement(state,itemId),success=roll<quote.successChance;
  const rank=success?quote.targetRank:prior.rank;
  next=setEnhancement(next,itemId,{...prior,rank,failures:success?0:prior.failures+1});
  return {state:next,result:{success,oldRank:prior.rank,newRank:rank,successChance:quote.successChance,downgraded:!success&&rank<prior.rank}};
}
export function socketGem(state:GameState,itemId:string,gemId:string){
  requireEquipped(state,itemId);const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');
  const kind=gemSocketKind(gemId),enhancement=gearEnhancement(state,itemId);
  if(kind==='stat'&&!gem.gemStat)throw new Error('Stat Gems require a primary stat bonus');
  if(kind==='effect'&&!gem.gemEffect)throw new Error('Effect Gems require a combat effect');
  if(kind==='stat'&&enhancement.statGemId)throw new Error('The Stat Gem socket is already filled');
  if(kind==='effect'&&enhancement.effectGemId)throw new Error('The Effect Gem socket is already filled');
  let next=consumeAcross(state,gemId,1);
  next=setEnhancement(next,itemId,{...enhancement,statGemId:kind==='stat'?gemId:enhancement.statGemId,effectGemId:kind==='effect'?gemId:enhancement.effectGemId,gemIds:[]});
  return next;
}
function addRecoveredGem(state:GameState,itemId:string,now:number){
 const inventoryExisting=state.inventory.stacks.find(s=>s.itemId===itemId);
 if(inventoryExisting)return {...state,inventory:{...state.inventory,stacks:state.inventory.stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity+1}:s)}};
 if(state.inventory.stacks.length<state.inventory.capacity)return {...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,{itemId,quantity:1}]}};
 const bankExisting=state.bank.stacks.find(s=>s.itemId===itemId);
 if(bankExisting)return {...state,bank:{...state.bank,stacks:state.bank.stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity+1}:s)}};
 if(state.bank.stacks.length<state.bank.capacity)return {...state,bank:{...state.bank,stacks:[...state.bank.stacks,{itemId,quantity:1}]}};
 const overflowExisting=state.overflow.stacks.find(s=>s.itemId===itemId);
 const stacks=overflowExisting?state.overflow.stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity+1}:s):[...state.overflow.stacks,{itemId,quantity:1}];
 return {...state,overflow:{stacks,expiresAtMs:Math.max(state.overflow.expiresAtMs??0,now+72*60*60*1000)}};
}
export function gemExtractionFee(gemId:string){const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');return (gem.gemTier??1)*500;}
export function unsocketGem(state:GameState,itemId:string,index:number,now=Date.now()){
  requireEquipped(state,itemId);if(index!==0&&index!==1)throw new Error('Unknown gem socket');
  const enhancement=gearEnhancement(state,itemId),gemId=index===0?enhancement.statGemId:enhancement.effectGemId;
  if(!gemId)throw new Error(index===0?'The Stat Gem socket is empty':'The Effect Gem socket is empty');
  const fee=gemExtractionFee(gemId);if(state.character!.gold<fee)throw new Error(`Need ${fee} gold to safely extract this gem`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-fee}};next=addRecoveredGem(next,gemId,now);
  next=setEnhancement(next,itemId,{...enhancement,statGemId:index===0?undefined:enhancement.statGemId,effectGemId:index===1?undefined:enhancement.effectGemId,gemIds:[]});
  return next;
}
export function replaceGem(state:GameState,itemId:string,gemId:string,now=Date.now()){
 requireEquipped(state,itemId);const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');
 const kind=gemSocketKind(gemId),enhancement=gearEnhancement(state,itemId),currentId=kind==='stat'?enhancement.statGemId:enhancement.effectGemId;
 if(!currentId)return socketGem(state,itemId,gemId);
 if(currentId===gemId)throw new Error('That gem is already socketed');
 if(kind==='stat'&&!gem.gemStat)throw new Error('Stat Gems require a primary stat bonus');
 if(kind==='effect'&&!gem.gemEffect)throw new Error('Effect Gems require a combat effect');
 const fee=gemExtractionFee(currentId);if(state.character!.gold<fee)throw new Error(`Need ${fee} gold to safely replace this gem`);
 let next=consumeAcross(state,gemId,1);
 next={...next,character:{...next.character!,gold:next.character!.gold-fee}};
 next=addRecoveredGem(next,currentId,now);
 next=setEnhancement(next,itemId,{...enhancement,statGemId:kind==='stat'?gemId:enhancement.statGemId,effectGemId:kind==='effect'?gemId:enhancement.effectGemId,gemIds:[]});
 return next;
}
export function gearStatsAtRank(itemId:string,rank:number){const item=itemDef(itemId),m=1+Math.max(0,Math.min(MAX_UPGRADE_RANK,rank))*UPGRADE_STAT_PER_RANK,scale=(value:number)=>value>0?Math.ceil(value*m):Math.round(value*m);return {hp:scale(item.hp??0),attack:scale(item.attack??0),defense:scale(item.defense??0)};}
export function enhancedGearStats(state:GameState,itemId:string){return gearStatsAtRank(itemId,gearEnhancement(state,itemId).rank);}
export function equippedGemBonuses(state:GameState):Record<GemStat,number>{const result={attack:0,defense:0,hp:0};if(!state.character)return result;for(const itemId of Object.values(state.character.equipment)){if(!itemId)continue;const gemId=gearEnhancement(state,itemId).statGemId;if(!gemId)continue;const gem=itemDef(gemId);if(gem.type==='gem'&&gem.gemStat)result[gem.gemStat]+=gem.gemPercent??0;}return result;}

export type EquippedEffectGemBonuses=Record<GemEffectId,number>;
export function equippedEffectGemBonuses(state:GameState):EquippedEffectGemBonuses{
  const result:EquippedEffectGemBonuses={combat_speed:0,boss_power:0,damage_reduction:0,recovery:0};
  if(!state.character)return result;
  for(const itemId of Object.values(state.character.equipment)){
    if(!itemId)continue;
    const gemId=gearEnhancement(state,itemId).effectGemId;if(!gemId)continue;
    const gem=itemDef(gemId);
    if(gem.type==='gem'&&gem.gemEffect)result[gem.gemEffect]+=Math.max(0,gem.gemEffectValue??0);
  }
  result.combat_speed=Math.min(GEM_EFFECT_CAPS.combat_speed,result.combat_speed);
  result.boss_power=Math.min(GEM_EFFECT_CAPS.boss_power,result.boss_power);
  result.damage_reduction=Math.min(GEM_EFFECT_CAPS.damage_reduction,result.damage_reduction);
  result.recovery=Math.min(GEM_EFFECT_CAPS.recovery,result.recovery);
  return result;
}
export function gemEffectDescription(gemId:string){
  const gem=itemDef(gemId);if(gem.type!=='gem'||!gem.gemEffect)return '';
  const pct=Math.round((gem.gemEffectValue??0)*100);
  switch(gem.gemEffect){
    case 'combat_speed':return `+${pct}% combat speed`;
    case 'boss_power':return `+${pct}% combat power against bosses`;
    case 'damage_reduction':return `-${pct}% incoming combat damage`;
    case 'recovery':return `+${pct}% between-kill recovery`;
  }
}

export function gemEffectCapDescription(effect:GemEffectId){return `Max ${Math.round(GEM_EFFECT_CAPS[effect]*100)}% equipped bonus`;}

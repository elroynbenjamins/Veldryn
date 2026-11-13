import {itemDef} from '../content/items';
import {itemRarity,ItemRarity} from './item-rarity';
import {effectiveOwnedGearRarity,craftedGearInstances,craftedGearQualityMultiplier} from './crafted-gear-instances';
import {craftedRarityStatMultiplier} from './crafted-gear-rarity';
import {GameState,GearEnhancementState,GemEffectId,GemSocketKind,GemStat,ItemStack} from './types';
import {gemRollPercentFromUnitV1,gemRolledValueV1,mobileGemFamilyV1,normalizeGemRollPercentV1} from '../content/gems-v1';
import {v33EquipmentRecipeForItem} from '../content/equipment-recipes-v33';
import {ASTERFALL_MINERAL_ESSENCE_ID} from '../content/mining-essence';
import {assertEffectGemEquipAllowedV1,canonicalGemMetaV1,gemUnsocketCostForStateV1} from './gem-progression-v1';
import {consumeGemFromStorage,gemStorageQuantity,isGemPouchItemId,storePouchGem} from './gem-pouch';

/** Each regional kit has four optional improvements.  A full set gains 16%,
 * still below the base-stat jump to the next equipment tier. */
export const MAX_UPGRADE_RANK=4;
export const UPGRADE_STAT_PER_RANK=.04;
export const EQUIPMENT_GEM_SOCKET_COUNT=2;
const SUCCESS_BY_TARGET=[0,.95,.82,.67,.52];
const DUST_BY_TARGET=[0,6,14,28,48];
const CORE_BY_TARGET=[0,0,1,2,4];
const RARITY_COST:Record<ItemRarity,number>={common:1,uncommon:1.2,rare:1.6,epic:2.2,legendary:3.2,mythic:4.5};
/** Regional equipment tiers scale Gold only; material costs, success and pity are unchanged. */
export const UPGRADE_TIER_GOLD_MULTIPLIER:Readonly<Record<string,number>>=Object.freeze({
  T1:1,T2:1.25,T3:1.5,T4:1.85,T5:2.25,T6:2.75,T7:3.3,T8:4,T9:5,
});
/** +1 gains exactly 200 extra Gold, regardless of tier or rarity. */
export const FIRST_ENCHANT_GOLD_SURCHARGE=200;
export function upgradeGoldCost(itemId:string,targetRank:number,rarity:ItemRarity):number{
  if(!Number.isInteger(targetRank)||targetRank<1||targetRank>MAX_UPGRADE_RANK)return 0;
  const tier=v33EquipmentRecipeForItem(itemId)?.v33EquipmentTier??'T1';
  const tierMultiplier=UPGRADE_TIER_GOLD_MULTIPLIER[tier]??1;
  const rarityBase=Math.ceil(150*targetRank*targetRank*RARITY_COST[rarity]/10)*10;
  return Math.ceil(rarityBase*tierMultiplier/10)*10+(targetRank===1?FIRST_ENCHANT_GOLD_SURCHARGE:0);
}

function safeGem(id:unknown){
  if(typeof id!=='string'||!id)return undefined;
  try{const item=itemDef(id);return item.type==='gem'?item:undefined}catch{return undefined}
}
export function gemSocketKind(gemId:string):GemSocketKind{
  const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');
  return gem.gemKind??(gem.gemEffect?'effect':'stat');
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
  return {statGemId,effectGemId,gemIds,
    statGemRollPercent:statGemId&&raw?.statGemId===statGemId?normalizeGemRollPercentV1(raw?.statGemRollPercent):undefined,
    effectGemRollPercent:effectGemId&&raw?.effectGemId===effectGemId?normalizeGemRollPercentV1(raw?.effectGemRollPercent):undefined};
}

export function equippedCraftedInstance(state:GameState,itemId:string){
  const slot=Object.entries(state.character?.equipment??{}).find(([,value])=>value===itemId)?.[0] as import('./types').GearSlot|undefined;
  const instanceId=slot?state.character?.equipmentInstanceIds?.[slot]:undefined;
  return instanceId?craftedGearInstances(state).find(row=>row.id===instanceId&&row.itemId===itemId):undefined;
}
export function gearEnhancement(state:GameState,itemId:string):GearEnhancementState{
  const raw=equippedCraftedInstance(state,itemId)?.enhancement??state.character?.gearEnhancements?.[itemId],slots=normalizeEnhancementGemSlots(raw);
  return {rank:Math.max(0,Math.min(MAX_UPGRADE_RANK,Math.floor(raw?.rank??0))),failures:Math.max(0,Math.floor(raw?.failures??0)),...slots};
}
export function hasEnhancement(state:GameState,itemId:string){const enhancement=gearEnhancement(state,itemId);return enhancement.rank>0||enhancement.gemIds.length>0;}
/**
 * Legacy equipment has no per-copy marker: upgrades were saved under itemId.
 * Reserve a physical copy when disposing untagged spares, but never count an
 * upgraded, currently equipped weapon as though it were still in Inventory.
 *
 * This only authorizes untagged stacks: unique Forge instances must use their
 * exact instanceId disposal command and retain independent protection checks.
 * When the legacy owner is unequipped we retain at least one unmarked copy
 * across the active character's Inventory, Bank and Overflow.
 */
export function canDisposeLegacyEquipment(state:GameState,itemId:string,location:'inventory'|'bank'|'equipment_pouch',quantity:number):boolean{
  if(!Number.isSafeInteger(quantity)||quantity<=0)return false;
  const unmarked=(stacks:readonly ItemStack[])=>stacks.reduce((sum,row)=>
    sum+(row.itemId===itemId&&row.instanceId===undefined&&Number.isSafeInteger(row.quantity)&&row.quantity>0?row.quantity:0),0);
  if(unmarked(location==='equipment_pouch'?state.character?.equipmentPouch?.stacks??[]:state[location].stacks)<quantity)return false;
  const allCharacters=[state.character,...(state.otherCharacters??[]).map(entry=>entry.character)].filter(
    (character):character is NonNullable<GameState['character']>=>!!character);
  // A legacy enchantment belongs to a character and definition, not to all
  // matching items across the account. Never discard the last physical copy
  // needed by a different character's unequipped, upgraded legacy item.
  const reserved=allCharacters.filter(character=>{
    const enhancement=character.gearEnhancements?.[itemId];
    const protectedUpgrade=!!enhancement&&(enhancement.rank>0||enhancement.failures>0
      ||!!enhancement.statGemId||!!enhancement.effectGemId||(enhancement.gemIds?.length??0)>0);
    return protectedUpgrade&&!Object.values(character.equipment??{}).includes(itemId);
  }).length;
  if(!reserved)return true;
  const stored=unmarked(state.inventory.stacks)+unmarked(state.bank.stacks)+unmarked(state.overflow.stacks)+unmarked(state.character?.equipmentPouch?.stacks??[])
    +(state.otherCharacters??[]).reduce((count,entry)=>count+unmarked(entry.inventory.stacks)+unmarked(entry.overflow.stacks)+unmarked(entry.character.equipmentPouch?.stacks??[]),0);
  return stored-quantity>=reserved;
}

export function gemSocketCapacity(itemId:string){const item=itemDef(itemId);return item.type==='gear'?EQUIPMENT_GEM_SOCKET_COUNT:0;}
export function gemSocketState(state:GameState,itemId:string){const enhancement=gearEnhancement(state,itemId);return {statGemId:enhancement.statGemId,effectGemId:enhancement.effectGemId,statGemRollPercent:enhancement.statGemRollPercent,effectGemRollPercent:enhancement.effectGemRollPercent,filled:Number(Boolean(enhancement.statGemId))+Number(Boolean(enhancement.effectGemId)),capacity:gemSocketCapacity(itemId)};}
export type UpgradeMaterialCost={itemId:string;quantity:number};
/** Forging uses each tier's own resin; T1/T2 enchanting uses rare Mining Essence instead of consuming either binding resin. */
export function upgradeMaterialCosts(itemId:string,targetRank:number):UpgradeMaterialCost[]{
  const recipe=v33EquipmentRecipeForItem(itemId);if(!recipe)return [];
  const ratio=targetRank===1?.12:targetRank===2?.18:targetRank===3?.27:targetRank===4?.38:0;
  return recipe.inputs.map(input=>({itemId:(input.itemId==='VERDANT_BINDING_RESIN'||input.itemId==='IRONWOOD_BINDING_RESIN')?ASTERFALL_MINERAL_ESSENCE_ID:input.itemId,quantity:Math.max(1,Math.ceil(input.quantity*ratio))}));
}
export function upgradeQuote(state:GameState,itemId:string,instanceId?:string|null){
  const item=itemDef(itemId);if(item.type!=='gear')throw new Error('Only equipment can be upgraded');
  const instance=instanceId
    ?craftedGearInstances(state).find(row=>row.id===instanceId&&row.itemId===itemId)
    :equippedCraftedInstance(state,itemId);
  if(instanceId&&!instance)throw new Error('Unknown equipment copy');
  const current=instance
    ?{...normalizeEnhancementGemSlots(instance.enhancement),rank:Math.max(0,Math.min(MAX_UPGRADE_RANK,instance.enhancement.rank)),failures:instance.enhancement.failures}
    :gearEnhancement(state,itemId);
  const targetRank=current.rank+1;
  if(targetRank>MAX_UPGRADE_RANK)return {currentRank:current.rank,targetRank,successChance:0,dust:0,cores:0,gold:0,materials:[] as UpgradeMaterialCost[],maxed:true};
  const rarity=instance?.rarity??effectiveOwnedGearRarity(state,itemId),pity=Math.min(.10,current.failures*.02);
  return {currentRank:current.rank,targetRank,successChance:Math.min(1,SUCCESS_BY_TARGET[targetRank]+pity),dust:DUST_BY_TARGET[targetRank],cores:CORE_BY_TARGET[targetRank],gold:upgradeGoldCost(itemId,targetRank,rarity),materials:upgradeMaterialCosts(itemId,targetRank),maxed:false};
}
function qty(stacks:ItemStack[],id:string){return stacks.find(s=>s.itemId===id)?.quantity??0;}
export function combinedQuantity(state:GameState,id:string){return gemStorageQuantity(state,id);}
function consume(stacks:ItemStack[],id:string,amount:number){let left=amount;return stacks.map(stack=>{if(stack.itemId!==id||left<=0)return stack;const used=Math.min(left,stack.quantity);left-=used;return {...stack,quantity:stack.quantity-used};}).filter(stack=>stack.quantity>0);}
function consumeAcross(state:GameState,id:string,amount:number){if(isGemPouchItemId(id))return consumeGemFromStorage(state,id,amount);if(combinedQuantity(state,id)<amount)throw new Error(`Need ${amount} ${itemDef(id).name}`);const inventory=consume(state.inventory.stacks,id,amount),used=qty(state.inventory.stacks,id)-qty(inventory,id);return {...state,inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:consume(state.bank.stacks,id,amount-used)}};}
function setEnhancement(state:GameState,itemId:string,value:GearEnhancementState){
  const slots=normalizeEnhancementGemSlots(value),instance=equippedCraftedInstance(state,itemId);
  if(instance)return {...state,account:{...state.account,craftedGearInstances:craftedGearInstances(state).map(row=>row.id===instance.id?{...row,enhancement:{...value,...slots}}:row)}};
  return {...state,character:{...state.character!,gearEnhancements:{...(state.character!.gearEnhancements??{}),[itemId]:{...value,...slots}}}};
}
function requireEquipped(state:GameState,itemId:string){if(!state.character||!Object.values(state.character.equipment).includes(itemId))throw new Error('Equip this item first');}
export function attemptEquipmentUpgrade(state:GameState,itemId:string,roll=Math.random()){
  requireEquipped(state,itemId);if(roll<0||roll>=1)throw new Error('Invalid upgrade roll');
  const quote=upgradeQuote(state,itemId);if(quote.maxed)throw new Error('This item already has all four regional improvements');
  if(state.character!.gold<quote.gold)throw new Error(`Need ${quote.gold} gold`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-quote.gold}};
  next=consumeAcross(next,'TEMPERING_DUST',quote.dust);if(quote.cores)next=consumeAcross(next,'TEMPERING_CORE',quote.cores);
  for(const material of quote.materials)next=consumeAcross(next,material.itemId,material.quantity);
  const prior=gearEnhancement(state,itemId),success=roll<quote.successChance;
  const rank=success?quote.targetRank:prior.rank;
  next=setEnhancement(next,itemId,{...prior,rank,failures:success?0:prior.failures+1});
  return {state:next,result:{success,oldRank:prior.rank,newRank:rank,successChance:quote.successChance,downgraded:!success&&rank<prior.rank}};
}
export function socketGem(state:GameState,itemId:string,gemId:string,randomRoll=Math.random()){
  requireEquipped(state,itemId);const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');
  const kind=gemSocketKind(gemId),enhancement=gearEnhancement(state,itemId);
  if(kind==='stat'&&!gem.gemStat&&!canonicalGemMetaV1(gemId))throw new Error('Stat Gems require a primary stat bonus');
  if(kind==='effect'&&!gem.gemEffect&&!canonicalGemMetaV1(gemId))throw new Error('Effect Gems require a combat effect');
  if(kind==='effect')assertEffectGemEquipAllowedV1(state,itemId,gemId);
  if(kind==='stat'&&enhancement.statGemId)throw new Error('The Stat Gem socket is already filled');
  if(kind==='effect'&&enhancement.effectGemId)throw new Error('The Effect Gem socket is already filled');
  const rollPercent=canonicalGemMetaV1(gemId)?gemRollPercentFromUnitV1(randomRoll):undefined;
  let next=consumeAcross(state,gemId,1);
  next=setEnhancement(next,itemId,{...enhancement,statGemId:kind==='stat'?gemId:enhancement.statGemId,effectGemId:kind==='effect'?gemId:enhancement.effectGemId,
    statGemRollPercent:kind==='stat'?rollPercent:enhancement.statGemRollPercent,effectGemRollPercent:kind==='effect'?rollPercent:enhancement.effectGemRollPercent,gemIds:[]});
  return next;
}
function addInventory(state:GameState,itemId:string){if(isGemPouchItemId(itemId))return storePouchGem(state,itemId);const existing=state.inventory.stacks.find(s=>s.itemId===itemId);if(!existing&&state.inventory.stacks.length>=state.inventory.capacity)throw new Error('Inventory is full');const stacks=existing?state.inventory.stacks.map(s=>s.itemId===itemId?{...s,quantity:s.quantity+1}:s):[...state.inventory.stacks,{itemId,quantity:1}];return {...state,inventory:{...state.inventory,stacks}};}
export function unsocketGem(state:GameState,itemId:string,index:number){
  requireEquipped(state,itemId);if(index!==0&&index!==1)throw new Error('Unknown gem socket');
  const enhancement=gearEnhancement(state,itemId),gemId=index===0?enhancement.statGemId:enhancement.effectGemId;
  if(!gemId)throw new Error(index===0?'The Stat Gem socket is empty':'The Effect Gem socket is empty');
  const fee=gemUnsocketCostForStateV1(state,gemId);if(state.character!.gold<fee.gold)throw new Error(`Need ${fee.gold} gold to safely extract this gem`);
  if(fee.dust&&combinedQuantity(state,'GEM_DUST')<fee.dust)throw new Error(`Need ${fee.dust} Gem Dust to safely extract this gem`);
  let next:GameState={...state,character:{...state.character!,gold:state.character!.gold-fee.gold}};
  if(fee.dust)next=consumeAcross(next,'GEM_DUST',fee.dust);
  next=addInventory(next,gemId);
  next=setEnhancement(next,itemId,{...enhancement,statGemId:index===0?undefined:enhancement.statGemId,effectGemId:index===1?undefined:enhancement.effectGemId,
    statGemRollPercent:index===0?undefined:enhancement.statGemRollPercent,effectGemRollPercent:index===1?undefined:enhancement.effectGemRollPercent,gemIds:[]});
  return next;
}
export function replaceGem(state:GameState,itemId:string,gemId:string,randomRoll=Math.random()){
  requireEquipped(state,itemId);const gem=safeGem(gemId);if(!gem)throw new Error('That item is not a gem');
  const kind=gemSocketKind(gemId),enhancement=gearEnhancement(state,itemId),currentId=kind==='stat'?enhancement.statGemId:enhancement.effectGemId;
  if(!currentId)return socketGem(state,itemId,gemId,randomRoll);
  // A second identical gem acts as a grindstone reroll. The consumable is
  // spent even on a lower roll, but the equipped bonus never decreases.
  if(currentId===gemId){
    const meta=canonicalGemMetaV1(gemId);
    if(!meta)throw new Error('Only graded gems can be rerolled');
    const candidate=gemRollPercentFromUnitV1(randomRoll);
    const previous=kind==='stat'?enhancement.statGemRollPercent:enhancement.effectGemRollPercent;
    // Protect a fully perfected socket: spending another gem cannot improve it.
    if((previous??100)>=120)throw new Error('This gem already has its maximum roll');
    const best=Math.max(previous??100,candidate);
    const next=consumeAcross(state,gemId,1);
    return setEnhancement(next,itemId,{...enhancement,
      statGemRollPercent:kind==='stat'?best:enhancement.statGemRollPercent,
      effectGemRollPercent:kind==='effect'?best:enhancement.effectGemRollPercent});
  }
  if(kind==='effect')assertEffectGemEquipAllowedV1(state,itemId,gemId);
  if(combinedQuantity(state,gemId)<1)throw new Error('You do not own this gem');
  const fee=gemUnsocketCostForStateV1(state,currentId);
  if(state.character!.gold<fee.gold)throw new Error(`Need ${fee.gold} gold to replace this gem`);
  if(fee.dust&&combinedQuantity(state,'GEM_DUST')<fee.dust)throw new Error(`Need ${fee.dust} Gem Dust to replace this gem`);
  const rollPercent=canonicalGemMetaV1(gemId)?gemRollPercentFromUnitV1(randomRoll):undefined;
  let next=consumeAcross(state,gemId,1);
  next={...next,character:{...next.character!,gold:next.character!.gold-fee.gold}};
  if(fee.dust)next=consumeAcross(next,'GEM_DUST',fee.dust);
  next=addInventory(next,currentId);
  next=setEnhancement(next,itemId,{...enhancement,statGemId:kind==='stat'?gemId:enhancement.statGemId,effectGemId:kind==='effect'?gemId:enhancement.effectGemId,
    statGemRollPercent:kind==='stat'?rollPercent:enhancement.statGemRollPercent,effectGemRollPercent:kind==='effect'?rollPercent:enhancement.effectGemRollPercent,gemIds:[]});
  return next;
}
/** Keep equipment values fractional until all equipped pieces are combined in
 * effectiveStats. Rounding each low-stat item separately turns a stated 4%
 * improvement into an accidental 25–100% jump. */
export function gearStatsAtRank(itemId:string,rank:number){const item=itemDef(itemId),m=1+Math.max(0,Math.min(MAX_UPGRADE_RANK,rank))*UPGRADE_STAT_PER_RANK,scale=(value:number)=>value*m;return {hp:scale(item.hp??0),attack:scale(item.attack??0),defense:scale(item.defense??0)};}
/** Preview any enhancement rank using the same rarity and quality scaling as equipped gear. */
export function enhancedGearStatsAtRank(state:GameState,itemId:string,rank:number,instanceId?:string|null){
  // Inspectors must never borrow the rarity/quality of another owned copy.
  // Omitting instanceId preserves legacy item-ID and equipped-item behavior.
  const instance=instanceId
    ?craftedGearInstances(state).find(row=>row.id===instanceId&&row.itemId===itemId)
    :equippedCraftedInstance(state,itemId);
  if(instanceId&&!instance)throw new Error('Unknown equipment copy');
  const stats=gearStatsAtRank(itemId,rank);
  const rarity=instance?.rarity??effectiveOwnedGearRarity(state,itemId);
  const quality=instance?.quality===undefined?1:craftedGearQualityMultiplier(instance.quality);
  const m=craftedRarityStatMultiplier(itemId,rarity)*quality,scale=(value:number)=>value*m;
  return {hp:scale(stats.hp),attack:scale(stats.attack),defense:scale(stats.defense)};
}
export function enhancedGearStats(state:GameState,itemId:string){
  return enhancedGearStatsAtRank(state,itemId,gearEnhancement(state,itemId).rank);
}
/**
 * Canonical Stat Gems use the same 12 keys, percent/percentage-point units
 * and per-grade values as the server gem catalog. Their effects are distinct
 * from the three legacy Stat Gem types handled by equippedGemBonuses.
 */
export const CANONICAL_STAT_GEM_KEYS_V1={
  stat_might:'power',stat_vitality:'maxHp',stat_iron:'armor',stat_ward:'ward',
  stat_precision:'accuracy',stat_keen:'critRate',stat_savage:'critDamage',
  stat_piercing:'penetration',stat_swift:'haste',stat_potent:'potency',
  stat_elusive:'evasion',stat_resolute:'tenacity',
} as const;
export type CanonicalStatGemKeyV1=typeof CANONICAL_STAT_GEM_KEYS_V1[keyof typeof CANONICAL_STAT_GEM_KEYS_V1];
export function equippedCanonicalStatGemBonusesV1(state:GameState){
  const statPercent:Partial<Record<CanonicalStatGemKeyV1,number>>={};
  const statPercentagePoints:Partial<Record<CanonicalStatGemKeyV1,number>>={};
  if(!state.character)return {statPercent,statPercentagePoints};
  for(const itemId of Object.values(state.character.equipment)){
    if(!itemId)continue;
    const enhancement=gearEnhancement(state,itemId),gemId=enhancement.statGemId;
    if(!gemId)continue;
    const meta=canonicalGemMetaV1(gemId);
    if(!meta||meta.kind!=='stat')continue;
    const family=mobileGemFamilyV1(meta.familyId);
    const key=CANONICAL_STAT_GEM_KEYS_V1[meta.familyId as keyof typeof CANONICAL_STAT_GEM_KEYS_V1];
    if(!key||!family||family.kind!=='stat')continue;
    const target=family.unit==='percentage_point'?statPercentagePoints:statPercent;
    target[key]=(target[key]??0)+gemRolledValueV1(meta.familyId,meta.grade,enhancement.statGemRollPercent);
  }
  return {statPercent,statPercentagePoints};
}

/** Older gems continue to affect their original Attack/Defense/HP stats.
 * Canonical gems are excluded so no bonus can be applied twice.
 */
export function equippedGemBonuses(state:GameState):Record<GemStat,number>{const result={attack:0,defense:0,hp:0};if(!state.character)return result;for(const itemId of Object.values(state.character.equipment)){if(!itemId)continue;const gemId=gearEnhancement(state,itemId).statGemId;if(!gemId)continue;if(canonicalGemMetaV1(gemId))continue;const gem=itemDef(gemId);if(gem.type==='gem'&&gem.gemStat)result[gem.gemStat]+=gem.gemPercent??0;}return result;}

export type EquippedEffectGemBonuses=Record<GemEffectId,number>;
export function equippedEffectGemBonuses(state:GameState):EquippedEffectGemBonuses{
  const result:EquippedEffectGemBonuses={combat_speed:0,boss_power:0,damage_reduction:0,recovery:0};
  if(!state.character)return result;
  for(const itemId of Object.values(state.character.equipment)){
    if(!itemId)continue;
    const enhancement=gearEnhancement(state,itemId),gemId=enhancement.effectGemId;if(!gemId)continue;
    const gem=itemDef(gemId),meta=canonicalGemMetaV1(gemId);
    if(gem.type==='gem'&&gem.gemEffect)result[gem.gemEffect]+=Math.max(0,meta?gemRolledValueV1(meta.familyId,meta.grade,enhancement.effectGemRollPercent):gem.gemEffectValue??0);
  }
  result.combat_speed=Math.min(.10,result.combat_speed);
  result.boss_power=Math.min(.15,result.boss_power);
  result.damage_reduction=Math.min(.10,result.damage_reduction);
  result.recovery=Math.min(.50,result.recovery);
  return result;
}
export function gemEffectDescription(gemId:string){
  const gem=itemDef(gemId);if(gem.type!=='gem')return '';
  if(gem.gemFamilyId){const family=mobileGemFamilyV1(gem.gemFamilyId);if(family?.kind==='effect')return family.description;}
  if(!gem.gemEffect)return gem.passive??'';
  const pct=Number(((gem.gemEffectValue??0)*100).toFixed(3));
  switch(gem.gemEffect){
    case 'combat_speed':return `+${pct}% combat speed`;
    case 'boss_power':return `+${pct}% combat power against bosses`;
    case 'damage_reduction':return `-${pct}% incoming combat damage`;
    case 'recovery':return `+${pct}% out-of-combat recovery`;
  }
}

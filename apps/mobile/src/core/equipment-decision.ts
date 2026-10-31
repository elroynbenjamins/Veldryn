import {itemDef} from '../content/items';
import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {combinedQuantity,enhancedGearStats,gearEnhancement,gemSocketCapacity,gemSocketState,upgradeQuote} from './equipment-enhancement';
import {type ItemRarity} from './item-rarity';
import {effectiveOwnedGearRarity,equippedCraftedGearRarity} from './crafted-gear-instances';
import type {GameState} from './types';

export interface EquipmentDecisionModel{
  itemId:string;
  name:string;
  rarity:ItemRarity;
  rank:number;
  stats:{attack:number;defense:number;hp:number};
  sockets:{filled:number;capacity:number;statFilled:boolean;effectFilled:boolean};
  set?:{
    id:string;
    name:string;
    tier:string;
    equippedPieces:number;
    totalPieces:number;
    requiredLevel:number;
    source:string;
  };
  upgrade:{
    maxed:boolean;
    targetRank:number;
    successChance:number;
    gold:{owned:number;needed:number;missing:number};
    dust:{owned:number;needed:number;missing:number};
    cores:{owned:number;needed:number;missing:number};
    materials:{itemId:string;owned:number;needed:number;missing:number}[];
    canAfford:boolean;
    failures:number;
  };
}

export function equipmentDecisionModel(state:GameState,itemId:string):EquipmentDecisionModel{
  if(!state.character)throw new Error('Equipment requires a character');
  const item=itemDef(itemId);
  if(item.type!=='gear')throw new Error('Equipment decision requires gear');
  const enhancement=gearEnhancement(state,itemId);
  const quote=upgradeQuote(state,itemId);
  const set=item.equipmentSetId?equipmentSetDef(item.equipmentSetId):undefined;
  const goldOwned=Math.max(0,state.character.gold);
  const dustOwned=combinedQuantity(state,'TEMPERING_DUST');
  const coresOwned=combinedQuantity(state,'TEMPERING_CORE');
  const missing=(owned:number,needed:number)=>Math.max(0,needed-owned);
  return {
    itemId,
    name:item.name,
    rarity:item.slot&&state.character.equipment[item.slot]===itemId?(equippedCraftedGearRarity(state,item.slot)??effectiveOwnedGearRarity(state,itemId)):effectiveOwnedGearRarity(state,itemId),
    rank:enhancement.rank,
    stats:enhancedGearStats(state,itemId),
    sockets:{filled:gemSocketState(state,itemId).filled,capacity:gemSocketCapacity(itemId),statFilled:Boolean(gemSocketState(state,itemId).statGemId),effectFilled:Boolean(gemSocketState(state,itemId).effectGemId)},
    set:set?{
      id:set.id,
      name:set.name,
      tier:set.tier,
      equippedPieces:equippedSetPieceCount(state.character.equipment,set),
      totalPieces:set.itemIds.length,
      requiredLevel:set.requiredLevel,
      source:set.source,
    }:undefined,
    upgrade:{
      maxed:quote.maxed,
      targetRank:quote.targetRank,
      successChance:quote.successChance,
      gold:{owned:goldOwned,needed:quote.gold,missing:missing(goldOwned,quote.gold)},
      dust:{owned:dustOwned,needed:quote.dust,missing:missing(dustOwned,quote.dust)},
      cores:{owned:coresOwned,needed:quote.cores,missing:missing(coresOwned,quote.cores)},
      materials:quote.materials.map(material=>{const owned=combinedQuantity(state,material.itemId);return {itemId:material.itemId,needed:material.quantity,owned,missing:missing(owned,material.quantity)}}),
      canAfford:!quote.maxed&&goldOwned>=quote.gold&&dustOwned>=quote.dust&&coresOwned>=quote.cores&&quote.materials.every(material=>combinedQuantity(state,material.itemId)>=material.quantity),
      failures:enhancement.failures,
    },
  };
}

export function equipmentUpgradeSummary(model:EquipmentDecisionModel){
  if(model.upgrade.maxed)return 'All regional improvements complete';
  const chance=Math.round(model.upgrade.successChance*100);
  const missing:string[]=[];
  if(model.upgrade.gold.missing)missing.push(model.upgrade.gold.missing.toLocaleString()+' gold');
  if(model.upgrade.dust.missing)missing.push(model.upgrade.dust.missing+' Dust');
  if(model.upgrade.cores.missing)missing.push(model.upgrade.cores.missing+' Cores');
  for(const material of model.upgrade.materials)if(material.missing)missing.push(material.missing+' '+itemDef(material.itemId).name);
  return missing.length
    ? 'Next +'+model.upgrade.targetRank+' · '+chance+'% · Missing '+missing.join(', ')
    : 'Next +'+model.upgrade.targetRank+' · '+chance+'% · Materials ready';
}

// A single priority order drives Character's next useful equipment action.
// Readiness is computed from the same server-synchronized equipment quote as
// the enhancement sheet, so the focus hint never promises an unaffordable step.
export function equipmentFocusModel(model:EquipmentDecisionModel|null){
 if(!model)return {tool:'compare' as const,description:'Choose a piece of equipment to review your loadout.'};
 if(!model.upgrade.maxed&&model.upgrade.canAfford)
  return {tool:'enhance' as const,description:'Enhancement materials ready.'};
 if(model.sockets.capacity>model.sockets.filled)
  return {tool:'gems' as const,description:'A gem socket is available.'};
 if(model.set&&model.set.equippedPieces<model.set.totalPieces)
  return {tool:'sets' as const,description:'Your equipment set has more pieces to collect.'};
 return {tool:'compare' as const,description:model.upgrade.maxed?'Compare equipment or improve your loadout.':'Gather materials or compare another item.'};
}

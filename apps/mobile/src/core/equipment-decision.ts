import {itemDef} from '../content/items';
import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {combinedQuantity,enhancedGearStats,gearEnhancement,gemSocketCapacity,upgradeQuote} from './equipment-enhancement';
import {itemRarity,type ItemRarity} from './item-rarity';
import type {GameState} from './types';

export interface EquipmentDecisionModel{
  itemId:string;
  name:string;
  rarity:ItemRarity;
  rank:number;
  stats:{attack:number;defense:number;hp:number};
  sockets:{filled:number;capacity:number};
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
    rarity:itemRarity(item),
    rank:enhancement.rank,
    stats:enhancedGearStats(state,itemId),
    sockets:{filled:enhancement.gemIds.length,capacity:gemSocketCapacity(itemId)},
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
      canAfford:!quote.maxed&&goldOwned>=quote.gold&&dustOwned>=quote.dust&&coresOwned>=quote.cores,
      failures:enhancement.failures,
    },
  };
}

export function equipmentUpgradeSummary(model:EquipmentDecisionModel){
  if(model.upgrade.maxed)return 'Maximum rank +10';
  const chance=Math.round(model.upgrade.successChance*100);
  const missing:string[]=[];
  if(model.upgrade.gold.missing)missing.push(model.upgrade.gold.missing.toLocaleString()+' gold');
  if(model.upgrade.dust.missing)missing.push(model.upgrade.dust.missing+' Dust');
  if(model.upgrade.cores.missing)missing.push(model.upgrade.cores.missing+' Cores');
  return missing.length
    ? 'Next +'+model.upgrade.targetRank+' · '+chance+'% · Missing '+missing.join(', ')
    : 'Next +'+model.upgrade.targetRank+' · '+chance+'% · Materials ready';
}

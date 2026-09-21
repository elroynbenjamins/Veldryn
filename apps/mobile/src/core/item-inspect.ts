import {itemDef} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {GameState,SkillId} from './types';
import {workingTowardDestinationAvailability,type WorkingTowardDestination,type WorkingTowardDestinationAvailability} from './working-toward';
import {enhancedGearStats,gearEnhancement,gemEffectDescription,gemSocketCapacity,gemSocketKind,gemSocketState,gearStatsAtRank,MAX_UPGRADE_RANK,upgradeQuote} from './equipment-enhancement';
import {effectiveStats} from './game';
import {previewEquipment} from './equipment-preview';
import {itemRarity,rarityMeta} from './item-rarity';

export type ItemInspectSourceKind='gathering'|'crafting'|'combat'|'starting';
export interface ItemInspectSource{kind:ItemInspectSourceKind;title:string;detail:string;navigation?:WorkingTowardDestination;availability?:WorkingTowardDestinationAvailability;}
export interface ItemRecipeUse{name:string;skill:string;level:number;quantity:number;navigation:WorkingTowardDestination;availability:WorkingTowardDestinationAvailability;}
export interface ItemGearDecision{
 compatible:boolean;alreadyEquipped:boolean;replaces?:{itemId:string;name:string;rank:number};
 loadoutBefore:{attack:number;defense:number;hp:number;power:number};loadoutAfter:{attack:number;defense:number;hp:number;power:number};loadoutDelta:{attack:number;defense:number;hp:number;power:number};
 maxRank:number;maxItemStats:{attack:number;defense:number;hp:number};maxLoadoutGain:{attack:number;defense:number;hp:number;power:number};
 gems:Array<{id:string;name:string;kind:'stat'|'effect';detail:string;stat?:string;percent?:number}>;
 set?:{name:string;currentPieces:number;previewPieces:number;required:number;reached?:{pieces:number;bonus:string};next?:{pieces:number;bonus:string};active:readonly {pieces:number;bonus:string;runtime:'live'|'trigger-hook-pending'}[]};
}
const title=(value:string)=>value.toLowerCase().split('_').map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(' ');
const pct=(value:number)=>value>=.1?`${Math.round(value*100)}%`:`${(value*100).toFixed(value<.01?2:1)}%`;

export function itemInspectModel(state:GameState,itemId:string){
  const item=itemDef(itemId),rarityId=itemRarity(item),rarity=rarityMeta(rarityId);
  const sources:ItemInspectSource[]=[];

  for(const node of [...GATHERING,...HERB_NODES]){
    if(node.itemId!==itemId)continue;
    sources.push({kind:'gathering',title:node.name,detail:`${title(node.skillId)} Lv ${node.unlockLevel} · ${title(node.zoneId)}`,navigation:{kind:'skills',skillId:node.skillId as SkillId,mode:'gathering',actionId:node.id,regionId:node.zoneId,button:'Open source',detail:`Open ${node.name} in ${title(node.zoneId)}.`}});
  }
  for(const recipe of RECIPES){
    if(recipe.output.itemId!==itemId)continue;
    sources.push({kind:'crafting',title:recipe.name,detail:`${title(recipe.skillId)} Lv ${recipe.level} · ${recipe.gold} gold`,navigation:{kind:'skills',skillId:recipe.skillId,mode:'crafting',recipeId:recipe.id,button:'Open recipe',detail:`Open ${recipe.name}.`}});
  }
  for(const monster of MONSTERS){
    for(const drop of monster.drops){
      if(drop.itemId!==itemId)continue;
      const regionId=WORLD_ZONES.find(zone=>zone.name===monster.zone)?.id;
      sources.push({kind:'combat',title:monster.name,detail:`${monster.zone} · Lv ${monster.level} · ${pct(drop.chance)} drop`,navigation:{kind:'combat',monsterId:monster.id,zoneName:monster.zone,regionId,button:'Open hunt',detail:`Open ${monster.name} in ${monster.zone}.`}});
    }
  }
  if(item.id.startsWith('START_')||item.id.startsWith('basic_'))sources.unshift({kind:'starting',title:'Starting equipment',detail:'Granted by a matching class loadout.'});

  const usedIn:Omit<ItemRecipeUse,'availability'>[]=RECIPES.flatMap(recipe=>recipe.inputs.filter(input=>input.itemId===itemId).map(input=>({
    name:recipe.name,skill:title(recipe.skillId),level:recipe.level,quantity:input.quantity,
    navigation:{kind:'skills',skillId:recipe.skillId,mode:'crafting',recipeId:recipe.id,button:'Open recipe',detail:`Open ${recipe.name}.`} as WorkingTowardDestination,
  })));

  const inventoryQuantity=state.inventory.stacks.find(stack=>stack.itemId===itemId)?.quantity??0;
  const bankQuantity=state.bank.stacks.find(stack=>stack.itemId===itemId)?.quantity??0;
  const effectLines:string[]=[];
  let upgrade:undefined|{rank:number;nextRank:number;successChance:number;dust:number;cores:number;gold:number;maxed:boolean;failures:number;equipped:boolean};
  let sockets:undefined|{filled:number;capacity:number;statGemName?:string;effectGemName?:string};
  let stats:undefined|{attack:number;defense:number;hp:number};
  let gearDecision:ItemGearDecision|undefined;

  if(item.type==='gear'){
    const enhancement=gearEnhancement(state,itemId),quote=upgradeQuote(state,itemId),enhanced=enhancedGearStats(state,itemId);
    stats=enhanced;
    upgrade={rank:enhancement.rank,nextRank:quote.targetRank,successChance:quote.successChance,dust:quote.dust,cores:quote.cores,gold:quote.gold,maxed:quote.maxed,failures:enhancement.failures,equipped:!!state.character&&Object.values(state.character.equipment).includes(itemId)};
    const capacity=gemSocketCapacity(itemId),slotState=gemSocketState(state,itemId);
    sockets={filled:slotState.filled,capacity,statGemName:slotState.statGemId?itemDef(slotState.statGemId).name:undefined,effectGemName:slotState.effectGemId?itemDef(slotState.effectGemId).name:undefined};
    if(state.character&&item.slot){
      const compatible=!item.classRestriction||item.classRestriction===state.character.classId;
      const before=effectiveStats(state),currentId=state.character.equipment[item.slot],currentItem=currentId?itemDef(currentId):undefined,currentRank=currentId?gearEnhancement(state,currentId).rank:0;
      const gems=enhancement.gemIds.map(id=>{const gem=itemDef(id),kind=gemSocketKind(id);return {id,name:gem.name,kind,detail:kind==='stat'?`+${Math.round((gem.gemPercent??0)*100)}% ${title(gem.gemStat??'stat')}`:gemEffectDescription(id),stat:kind==='stat'?title(gem.gemStat??'stat'):'Effect',percent:kind==='stat'?(gem.gemPercent??0):(gem.gemEffectValue??0)};});
      let after=before,maxAfter=before,previewState=state;
      if(compatible){try{previewState=previewEquipment(state,itemId);after=effectiveStats(previewState);const maxState:GameState={...state,character:{...state.character,gearEnhancements:{...(state.character.gearEnhancements??{}),[itemId]:{...enhancement,rank:MAX_UPGRADE_RANK}}}};maxAfter=effectiveStats(previewEquipment(maxState,itemId));}catch{}}
      const set=equipmentSetDef(item.equipmentSetId);
      let setDecision:ItemGearDecision['set'];
      if(set){
        const currentPieces=equippedSetPieceCount(state.character.equipment,set),previewPieces=compatible?equippedSetPieceCount(previewState.character!.equipment,set):currentPieces;
        const milestones=[{pieces:2,bonus:set.twoPiece},{pieces:4,bonus:set.fourPiece},{pieces:6,bonus:set.sixPiece},{pieces:8,bonus:set.eightPiece},{pieces:10,bonus:set.tenPiece}];
        setDecision={name:set.name,currentPieces,previewPieces,required:10,reached:[...milestones].reverse().find(row=>row.pieces<=previewPieces),next:milestones.find(row=>row.pieces>previewPieces),active:milestones.filter(row=>row.pieces<=previewPieces).map(row=>({...row,runtime:row.pieces===6?'trigger-hook-pending':'live'} as const))};
      }
      gearDecision={compatible,alreadyEquipped:currentId===itemId,replaces:currentItem?{itemId:currentItem.id,name:currentItem.name,rank:currentRank}:undefined,
        loadoutBefore:{attack:before.attack,defense:before.defense,hp:before.hp,power:before.power},loadoutAfter:{attack:after.attack,defense:after.defense,hp:after.hp,power:after.power},
        loadoutDelta:{attack:after.attack-before.attack,defense:after.defense-before.defense,hp:after.hp-before.hp,power:after.power-before.power},maxRank:MAX_UPGRADE_RANK,maxItemStats:gearStatsAtRank(itemId,MAX_UPGRADE_RANK),
        maxLoadoutGain:{attack:maxAfter.attack-after.attack,defense:maxAfter.defense-after.defense,hp:maxAfter.hp-after.hp,power:maxAfter.power-after.power},gems,set:setDecision};
    }
    if(item.readiness)effectLines.push(`Readiness +${item.readiness}`);
    if(item.passive)effectLines.push(item.passive);
  }else if(item.type==='food'){
    effectLines.push(`Restores ${item.heal??0} HP`);
    if(item.readiness)effectLines.push(`Readiness +${item.readiness}`);
  }else if(item.type==='tool'){
    effectLines.push(`${title(item.toolSkillId??'gathering')} tool · Tier ${item.toolTier??1}`);
    const speed=Math.round((1-(item.actionTimeMultiplier??1))*100);
    effectLines.push(speed>0?`${speed}% shorter base action time`:'Baseline action time');
  }else if(item.type==='gem'){
    const kind=gemSocketKind(item.id);effectLines.push(kind==='stat'?`Stat Gem · +${Math.round((item.gemPercent??0)*100)}% ${title(item.gemStat??'stat')} when socketed`:`Effect Gem · ${gemEffectDescription(item.id)}`);
  }else if(item.passive){
    effectLines.push(item.passive);
  }
  if(item.salvage)effectLines.push(`Salvage: ${item.salvage.quantity}× ${itemDef(item.salvage.itemId).name}`);

  const actionableSources=sources.map(source=>source.navigation?{...source,availability:workingTowardDestinationAvailability(state,source.navigation)}:source);
  const actionableUses=usedIn.map(recipe=>({...recipe,availability:workingTowardDestinationAvailability(state,recipe.navigation)}));
  return {item,rarityId,rarity,inventoryQuantity,bankQuantity,totalQuantity:inventoryQuantity+bankQuantity,effectLines,stats,upgrade,sockets,gearDecision,sources:actionableSources,usedIn:actionableUses};
}

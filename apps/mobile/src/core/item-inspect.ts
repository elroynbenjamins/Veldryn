import {itemDef} from '../content/items';
import {GATHERING,RECIPES} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {GameState} from './types';
import {enhancedGearStats,gearEnhancement,gemSocketCapacity,upgradeQuote} from './equipment-enhancement';
import {itemRarity,rarityMeta} from './item-rarity';

export type ItemInspectSourceKind='gathering'|'crafting'|'combat'|'starting';
export interface ItemInspectSource{kind:ItemInspectSourceKind;title:string;detail:string;}
export interface ItemRecipeUse{name:string;skill:string;level:number;quantity:number;}
const title=(value:string)=>value.toLowerCase().split('_').map(part=>part?part[0].toUpperCase()+part.slice(1):part).join(' ');
const pct=(value:number)=>value>=.1?`${Math.round(value*100)}%`:`${(value*100).toFixed(value<.01?2:1)}%`;

export function itemInspectModel(state:GameState,itemId:string){
  const item=itemDef(itemId),rarityId=itemRarity(item),rarity=rarityMeta(rarityId);
  const sources:ItemInspectSource[]=[];

  for(const node of [...GATHERING,...HERB_NODES]){
    if(node.itemId!==itemId)continue;
    sources.push({kind:'gathering',title:node.name,detail:`${title(node.skillId)} Lv ${node.unlockLevel} · ${title(node.zoneId)}`});
  }
  for(const recipe of RECIPES){
    if(recipe.output.itemId!==itemId)continue;
    sources.push({kind:'crafting',title:recipe.name,detail:`${title(recipe.skillId)} Lv ${recipe.level} · ${recipe.gold} gold`});
  }
  for(const monster of MONSTERS){
    for(const drop of monster.drops){
      if(drop.itemId!==itemId)continue;
      sources.push({kind:'combat',title:monster.name,detail:`${monster.zone} · Lv ${monster.level} · ${pct(drop.chance)} drop`});
    }
  }
  if(item.id.startsWith('START_')||item.id.startsWith('basic_'))sources.unshift({kind:'starting',title:'Starting equipment',detail:'Granted by a matching class loadout.'});

  const usedIn:ItemRecipeUse[]=RECIPES.flatMap(recipe=>recipe.inputs.filter(input=>input.itemId===itemId).map(input=>({
    name:recipe.name,skill:title(recipe.skillId),level:recipe.level,quantity:input.quantity,
  })));

  const inventoryQuantity=state.inventory.stacks.find(stack=>stack.itemId===itemId)?.quantity??0;
  const bankQuantity=state.bank.stacks.find(stack=>stack.itemId===itemId)?.quantity??0;
  const effectLines:string[]=[];
  let upgrade:undefined|{rank:number;nextRank:number;successChance:number;dust:number;cores:number;gold:number;maxed:boolean;failures:number;equipped:boolean};
  let sockets:undefined|{filled:number;capacity:number;gemNames:string[]};
  let stats:undefined|{attack:number;defense:number;hp:number};

  if(item.type==='gear'){
    const enhancement=gearEnhancement(state,itemId),quote=upgradeQuote(state,itemId),enhanced=enhancedGearStats(state,itemId);
    stats=enhanced;
    upgrade={rank:enhancement.rank,nextRank:quote.targetRank,successChance:quote.successChance,dust:quote.dust,cores:quote.cores,gold:quote.gold,maxed:quote.maxed,failures:enhancement.failures,equipped:!!state.character&&Object.values(state.character.equipment).includes(itemId)};
    const capacity=gemSocketCapacity(itemId);
    sockets={filled:enhancement.gemIds.length,capacity,gemNames:enhancement.gemIds.map(id=>itemDef(id).name)};
    if(item.readiness)effectLines.push(`Readiness +${item.readiness}`);
    if(item.passive)effectLines.push(item.passive);
  }else if(item.type==='food'){
    effectLines.push(`Restores ${item.heal??0} HP`);
    if(item.readiness)effectLines.push(`Readiness +${item.readiness}`);
  }else if(item.type==='tool'){
    effectLines.push(`${title(item.toolSkillId??'gathering')} tool · Tier ${item.toolTier??1}`);
    const speed=Math.round((1-(item.actionTimeMultiplier??1))*100);
    effectLines.push(speed>0?`${speed}% shorter base action time`:'Baseline action time');
  }else if(item.type==='gem'&&item.gemStat){
    effectLines.push(`+${Math.round((item.gemPercent??0)*100)}% ${title(item.gemStat)} when socketed`);
  }else if(item.passive){
    effectLines.push(item.passive);
  }
  if(item.salvage)effectLines.push(`Salvage: ${item.salvage.quantity}× ${itemDef(item.salvage.itemId).name}`);

  return {item,rarityId,rarity,inventoryQuantity,bankQuantity,totalQuantity:inventoryQuantity+bankQuantity,effectLines,stats,upgrade,sockets,sources,usedIn};
}

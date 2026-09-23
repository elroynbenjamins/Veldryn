import {equipmentLoadoutGuidesFor} from '../content/loadouts';
import {itemDef} from '../content/items';
import {effectiveStats,regionalReadiness} from './game';
import type {GameState,GearSlot} from './types';
import {enhancedGearStats,gearEnhancement,gemSocketCapacity,gemSocketState} from './equipment-enhancement';
import {equipmentDecisionModel,equipmentUpgradeSummary} from './equipment-decision';

// V33 display order is authoritative. The local state keeps the historical
// `offhand` key, so only the presentation order changes here.
export const EQUIPMENT_SLOT_ORDER:GearSlot[]=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
export const EQUIPMENT_SLOT_LABELS:Record<GearSlot,string>={helmet:'Helmet',amulet:'Amulet',chest:'Chest',ring:'Ring',gloves:'Gloves',weapon:'Weapon',legs:'Legs',offhand:'Off-hand',boots:'Boots',cape:'Cape'};

export function equipmentScreenModel(state:GameState){
  if(!state.character)throw new Error('Equipment requires a character');
  const stats=effectiveStats(state),readiness=regionalReadiness(state);
  const slots=EQUIPMENT_SLOT_ORDER.map(slot=>{const itemId=state.character!.equipment[slot],enhancement=itemId?gearEnhancement(state,itemId):undefined,sockets=itemId?gemSocketState(state,itemId):undefined;return {slot,label:EQUIPMENT_SLOT_LABELS[slot],itemId,item:itemId?itemDef(itemId):undefined,enhancement,enhancedStats:itemId?enhancedGearStats(state,itemId):undefined,socketCapacity:itemId?gemSocketCapacity(itemId):0,statGemFilled:Boolean(sockets?.statGemId),effectGemFilled:Boolean(sockets?.effectGemId)};});
  return {slots,equippedCount:slots.filter(slot=>slot.item).length,stats:{...stats,maxHp:stats.hp,currentHp:state.character.currentHp,readiness:readiness.total},loadouts:equipmentLoadoutGuidesFor(state.character.classId)};
}


export type EquipmentFocusAction='inventory'|'enhance'|'crafting';
export type EquipmentFocusKind='fill-slots'|'enhance-ready'|'socket-open'|'prepare-upgrade'|'optimize';

export interface EquipmentFocusModel{
  equippedCount:number;
  emptySlots:number;
  upgradesReady:number;
  openSockets:number;
  totalSockets:number;
  next:{
    kind:EquipmentFocusKind;
    action:EquipmentFocusAction;
    title:string;
    detail:string;
    button:string;
    slot?:GearSlot;
    itemId?:string;
  };
}

export function equipmentFocusModel(state:GameState,preferredSlot?:GearSlot):EquipmentFocusModel{
  const model=equipmentScreenModel(state);
  const equipped=model.slots.filter(slot=>slot.item);
  const empty=model.slots.filter(slot=>!slot.item);
  const decisions=equipped.map(slot=>({slot,decision:equipmentDecisionModel(state,slot.itemId!)}));
  const ready=decisions.filter(entry=>entry.decision.upgrade.canAfford);
  const socketRows=equipped.map(slot=>{
    const filled=Number(slot.statGemFilled)+Number(slot.effectGemFilled);
    return {...slot,filled,open:Math.max(0,slot.socketCapacity-filled)};
  });
  const openSockets=socketRows.reduce((sum,slot)=>sum+slot.open,0);
  const totalSockets=socketRows.reduce((sum,slot)=>sum+slot.socketCapacity,0);
  const preferredDecision=preferredSlot?decisions.find(entry=>entry.slot.slot===preferredSlot):undefined;
  const preferredSocket=preferredSlot?socketRows.find(slot=>slot.slot===preferredSlot&&slot.open>0):undefined;

  let next:EquipmentFocusModel['next'];
  if(empty.length){
    const target=(preferredSlot?empty.find(slot=>slot.slot===preferredSlot):undefined)??empty[0];
    next={
      kind:'fill-slots',
      action:'inventory',
      title:`Fill ${empty.length} empty equipment slot${empty.length===1?'':'s'}`,
      detail:`${target.label} is empty. Equip a useful piece first; complete coverage is the fastest way to improve baseline readiness.`,
      button:'Find gear',
      slot:target.slot,
    };
  }else if(preferredDecision?.decision.upgrade.canAfford){
    next={
      kind:'enhance-ready',
      action:'enhance',
      title:`Enhance ${preferredDecision.decision.name}`,
      detail:`${equipmentUpgradeSummary(preferredDecision.decision)}. Your selected item is ready now.`,
      button:`Enhance ${preferredDecision.slot.label}`,
      slot:preferredDecision.slot.slot,
      itemId:preferredDecision.decision.itemId,
    };
  }else if(ready.length){
    const target=ready[0];
    next={
      kind:'enhance-ready',
      action:'enhance',
      title:`A ${target.slot.label.toLowerCase()} upgrade is ready`,
      detail:`${equipmentUpgradeSummary(target.decision)}. Spend prepared materials now instead of leaving power idle.`,
      button:`Enhance ${target.slot.label}`,
      slot:target.slot.slot,
      itemId:target.decision.itemId,
    };
  }else if(preferredSocket||openSockets>0){
    const target=preferredSocket??socketRows.find(slot=>slot.open>0)!;
    next={
      kind:'socket-open',
      action:'enhance',
      title:`Open socket${target.open===1?'':'s'} on ${target.label}`,
      detail:`${target.open} of ${target.socketCapacity} socket${target.socketCapacity===1?'':'s'} remain open on this piece. Add a Stat or Effect Gem before chasing smaller upgrades.`,
      button:'Manage sockets',
      slot:target.slot,
      itemId:target.itemId,
    };
  }else{
    const unmaxed=decisions.filter(entry=>!entry.decision.upgrade.maxed);
    const target=(preferredDecision&&!preferredDecision.decision.upgrade.maxed?preferredDecision:undefined)??unmaxed[0];
    next=target?{
      kind:'prepare-upgrade',
      action:'crafting',
      title:`Prepare the next ${target.slot.label.toLowerCase()} enhancement`,
      detail:`${equipmentUpgradeSummary(target.decision)}. Prepare the missing enhancement resources, then return to this loadout.`,
      button:'Prepare materials',
      slot:target.slot.slot,
      itemId:target.decision.itemId,
    }:{
      kind:'optimize',
      action:'inventory',
      title:'Optimize a completed loadout',
      detail:'All equipped pieces are fully enhanced and socketed. Compare new drops, improve rarity, or pursue set milestones rather than spending resources blindly.',
      button:'Compare gear',
    };
  }

  return {
    equippedCount:model.equippedCount,
    emptySlots:empty.length,
    upgradesReady:ready.length,
    openSockets,
    totalSockets,
    next,
  };
}

import {BodyPresentation,ClassId,GameState,GearSlot} from './types';
import {itemDef} from '../content/items';

export type CharacterView='front'|'back';
export type VisualSlot=Exclude<GearSlot,'ring'|'amulet'>;
export const VISUAL_SLOTS:VisualSlot[]=['cape','legs','boots','chest','gloves','helmet','weapon','offhand'];
export interface LayerAsset {
  id:string;classId:ClassId|'shared';body:BodyPresentation;slot:VisualSlot|'body'|'hair';
  itemId?:string;front:string;back:string;width:number;height:number;approved:boolean;hidesHair?:boolean;
}
export interface LayerRegistry {layers:readonly LayerAsset[];availableSources:readonly string[];}
const frontOrder:Record<LayerAsset['slot'],number>={cape:10,body:20,legs:30,boots:40,chest:50,gloves:60,hair:80,helmet:90,weapon:110,offhand:120};
const backOrder:Record<LayerAsset['slot'],number>={body:10,legs:20,boots:30,chest:40,gloves:50,cape:70,hair:75,helmet:80,weapon:90,offhand:100};
export function layerRegistryErrors(registry:LayerRegistry):string[]{
  const errors:string[]=[],ids=new Set<string>(),bindings=new Set<string>();
  for(const layer of registry.layers){
    if(ids.has(layer.id))errors.push(`Duplicate layer ID: ${layer.id}`);ids.add(layer.id);
    const binding=`${layer.classId}:${layer.body}:${layer.slot}:${layer.itemId??''}`;
    if(bindings.has(binding))errors.push(`Duplicate layer binding: ${binding}`);bindings.add(binding);
    if(layer.width!==128||layer.height!==160)errors.push(`Canvas must be 128×160: ${layer.id}`);
    if(!layer.approved)errors.push(`Unapproved layer: ${layer.id}`);
    if(!registry.availableSources.includes(layer.front)||!registry.availableSources.includes(layer.back))errors.push(`Missing front/back image: ${layer.id}`);
    if(layer.slot!=='body'&&layer.slot!=='hair'){
      if(layer.classId==='shared')errors.push(`Only body/hair can be shared across classes: ${layer.id}`);
      try{const item=itemDef(layer.itemId??'');if(item.slot!==layer.slot)errors.push(`Item slot mismatch: ${layer.id}`);if(item.classRestriction&&item.classRestriction!==layer.classId)errors.push(`Class mismatch: ${layer.id}`)}catch{errors.push(`Unknown item: ${layer.id}`)}
    }else if(layer.itemId)errors.push(`Body/hair cannot bind an item: ${layer.id}`);
    if(layer.hidesHair&&layer.slot!=='helmet')errors.push(`Only helmets can hide hair: ${layer.id}`);
  }
  return errors;
}
export function resolveEquipmentLayers(state:GameState,registry:LayerRegistry,view:CharacterView){
  const character=state.character;
  const errors=layerRegistryErrors(registry);
  if(!character)return {ready:false,layers:[] as {id:string;source:string;slot:LayerAsset['slot']}[],missing:['No character']};
  // Shared anatomy/hair is reused by every class; equipment stays class-bound.
  const candidates=registry.layers.filter(layer=>(layer.classId===character.classId||layer.classId==='shared')&&layer.body===(character.bodyPresentation??'male'));
  const selected:LayerAsset[]=[],missing=[...errors];
  const base=candidates.find(layer=>layer.slot==='body'&&layer.classId===character.classId)??candidates.find(layer=>layer.slot==='body'&&layer.classId==='shared');
  if(base)selected.push(base);else missing.push('Neutral body layer');
  for(const slot of VISUAL_SLOTS){
    const id=character.equipment[slot];if(!id)continue;
    const layer=candidates.find(layer=>layer.slot===slot&&layer.itemId===id);
    if(layer)selected.push(layer);else missing.push(`${slot}: ${itemDef(id).name}`);
  }
  const hair=candidates.find(layer=>layer.slot==='hair'&&layer.classId===character.classId)??candidates.find(layer=>layer.slot==='hair'&&layer.classId==='shared');
  if(!selected.some(layer=>layer.hidesHair)){if(hair)selected.push(hair);else missing.push('Default hair layer')}
  const order=view==='front'?frontOrder:backOrder;
  selected.sort((a,b)=>order[a.slot]-order[b.slot]||a.id.localeCompare(b.id));
  return {ready:missing.length===0,missing,layers:missing.length?[]:selected.map(layer=>({id:layer.id,source:layer[view],slot:layer.slot}))};
}
/** Preview only: does not consume, grant or equip an item in the original save. */
export function previewEquipment(state:GameState,id:string):GameState{
  if(!state.character)throw new Error('No character');
  const item=itemDef(id);
  if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==state.character.classId)throw new Error('This equipment belongs to another class');
  return {...state,character:{...state.character,equipment:{...state.character.equipment,[item.slot]:id}}};
}

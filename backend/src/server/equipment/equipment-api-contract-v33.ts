import {craftingScreenPayloadV33,equipmentLoadoutPayloadV33,equipmentSetDetailPayloadV33} from './equipment-mobile-api-v33';
import type {EquippedPieceV33} from './equipment-types-v33';
import {EQUIPMENT_PIECES_V33} from './equipment-catalog-v33';

export const EQUIPMENT_API_NAMES_V33=['get_equipment_set_detail_v33','get_equipment_crafting_detail_v33','get_equipment_loadout_summary_v33'] as const;
export type EquipmentApiNameV33=typeof EQUIPMENT_API_NAMES_V33[number];
export type EquipmentApiRequestV33=
  | {name:'get_equipment_set_detail_v33';setId:string;craftedPieceIds:readonly string[]}
  | {name:'get_equipment_crafting_detail_v33';pieceId:string}
  | {name:'get_equipment_loadout_summary_v33';equipped:readonly EquippedPieceV33[]};

function assertText(value:unknown,label:string):asserts value is string{
  if(typeof value!=='string'||!value.trim())throw new Error(`invalid_${label}`);
}

function validateEquipped(equipped:readonly EquippedPieceV33[]):void{
  const slots=new Set<string>();
  const pieces=new Map(EQUIPMENT_PIECES_V33.map(piece=>[piece.id,piece] as const));
  for(const entry of equipped){
    assertText(entry.pieceId,'piece_id');assertText(entry.setId,'set_id');assertText(entry.slot,'slot');
    if(slots.has(entry.slot))throw new Error(`duplicate_equipped_slot:${entry.slot}`);
    const piece=pieces.get(entry.pieceId);
    if(!piece||piece.setId!==entry.setId||piece.slot!==entry.slot)throw new Error(`invalid_equipped_piece:${entry.pieceId}`);
    slots.add(entry.slot);
  }
}

function validateCraftedPieceIds(setId:string,ids:readonly string[]):void{
  const setPieceIds=new Set(EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===setId).map(piece=>piece.id));
  const seen=new Set<string>();
  for(const id of ids){assertText(id,'crafted_piece_id');if(seen.has(id))throw new Error(`duplicate_crafted_piece:${id}`);if(!setPieceIds.has(id))throw new Error(`invalid_crafted_piece:${id}`);seen.add(id);}
}

export function dispatchEquipmentApiV33(request:Extract<EquipmentApiRequestV33,{name:'get_equipment_set_detail_v33'}>):ReturnType<typeof equipmentSetDetailPayloadV33>;
export function dispatchEquipmentApiV33(request:Extract<EquipmentApiRequestV33,{name:'get_equipment_crafting_detail_v33'}>):ReturnType<typeof craftingScreenPayloadV33>;
export function dispatchEquipmentApiV33(request:Extract<EquipmentApiRequestV33,{name:'get_equipment_loadout_summary_v33'}>):ReturnType<typeof equipmentLoadoutPayloadV33>;
export function dispatchEquipmentApiV33(request:EquipmentApiRequestV33):ReturnType<typeof equipmentSetDetailPayloadV33>|ReturnType<typeof craftingScreenPayloadV33>|ReturnType<typeof equipmentLoadoutPayloadV33>;
export function dispatchEquipmentApiV33(request:EquipmentApiRequestV33){
  if(!request||typeof request!=='object')throw new Error('invalid_equipment_request');
  switch(request.name){
    case 'get_equipment_set_detail_v33':assertText(request.setId,'set_id');if(!Array.isArray(request.craftedPieceIds))throw new Error('invalid_crafted_piece_ids');validateCraftedPieceIds(request.setId,request.craftedPieceIds);return equipmentSetDetailPayloadV33(request.setId,request.craftedPieceIds);
    case 'get_equipment_crafting_detail_v33':assertText(request.pieceId,'piece_id');return craftingScreenPayloadV33(request.pieceId);
    case 'get_equipment_loadout_summary_v33':if(!Array.isArray(request.equipped))throw new Error('invalid_equipped');validateEquipped(request.equipped);return equipmentLoadoutPayloadV33(request.equipped);
    default:throw new Error('unknown_equipment_api');
  }
}

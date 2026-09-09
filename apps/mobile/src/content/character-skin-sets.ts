import type {ClassId} from '../core/types';
import {EQUIPMENT_SETS} from './equipment-sets';
import {NOVICE_SETS,noviceItemId} from './novice-sets';

export interface CharacterSkinSetDef {
  id:string;
  classId:ClassId;
  name:string;
  appearanceId:string;
  itemIds:string[];
}

const noviceSkinSets:CharacterSkinSetDef[]=NOVICE_SETS.map(set=>({
  id:set.id,
  classId:set.classId,
  name:set.name,
  appearanceId:set.appearanceId,
  itemIds:set.slots.map(slot=>noviceItemId(set.classId,slot)),
}));

const progressionSkinSets:CharacterSkinSetDef[]=EQUIPMENT_SETS.flatMap(set=>set.appearanceId?[{
  id:set.id,
  classId:set.classId,
  name:set.name,
  appearanceId:set.appearanceId,
  itemIds:set.itemIds,
}]:[]);

const acceptedStandaloneSkinSets:CharacterSkinSetDef[]=[{
  id:'aster_iron',
  classId:'IRONWARDEN',
  name:'Aster Iron',
  appearanceId:'accepted-front-aster-iron',
  itemIds:[
    'ASTER_IRON_HELM',
    'ASTER_IRON_CHEST',
    'ASTER_IRON_GLOVES',
    'ASTER_IRON_LEGS',
    'ASTER_IRON_BOOTS',
    'ASTER_IRON_BLADE',
    'ASTER_IRON_OFFHAND',
    'ASTER_IRON_CAPE',
    'ASTER_IRON_AMULET',
    'ASTER_IRON_RING',
  ],
}];

export const CHARACTER_SKIN_SETS:CharacterSkinSetDef[]=[...noviceSkinSets,...acceptedStandaloneSkinSets,...progressionSkinSets];

export function characterSkinSetsFor(classId:ClassId){
  return CHARACTER_SKIN_SETS.filter(set=>set.classId===classId);
}

import type {ClassId} from '../core/types';
import {EQUIPMENT_SETS} from './equipment-sets';
import {NOVICE_SETS,noviceItemId} from './novice-sets';

export interface CharacterSkinSetDef {
  id:string;
  classId:ClassId;
  name:string;
  appearanceId:string;
  itemIds:string[];
  unlockEventSkinId?:string;
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

const harvestwakeSkinSets:CharacterSkinSetDef[]=[
  ['harvestwake-harvest-defender','IRONWARDEN','Harvest Defender'],
  ['harvestwake-granary-bastion','BASTION','Granary Bastion'],
  ['harvestwake-autumn-warden','DREADGUARD','Autumn Warden'],
  ['harvestwake-hearthkeeper','DAWNKEEPER','Hearthkeeper'],
  ['harvestwake-field-ranger','WAYFINDER','Field Ranger'],
  ['harvestwake-reapers-guard','RAVAGER',"Reaper's Guard"],
  ['harvestwake-amber-brewer','HEXWEAVER','Amber Brewer'],
  ['harvestwake-harvest-blade','KNIFE_DANCER','Harvest Blade'],
  ['harvestwake-granary-keeper','STONECALLER','Granary Keeper'],
].map(([id,classId,name])=>({id,classId:classId as ClassId,name,appearanceId:`event-front-${id}`,itemIds:[],unlockEventSkinId:`skin_harvestwake_${classId.toLowerCase()}`}));

export const CHARACTER_SKIN_SETS:CharacterSkinSetDef[]=[...noviceSkinSets,...acceptedStandaloneSkinSets,...progressionSkinSets,...harvestwakeSkinSets];

export function characterSkinSetsFor(classId:ClassId){
  return CHARACTER_SKIN_SETS.filter(set=>set.classId===classId);
}

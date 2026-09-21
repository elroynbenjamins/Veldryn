import type {ClassId,GearSlot} from '../core/types';
import type {ItemDef} from './items';
import catalog from './equipment_catalog_t1_t9_v33.json';

const classIdByName:Record<string,ClassId>={Ironwarden:'IRONWARDEN',Bastion:'BASTION',Dreadguard:'DREADGUARD',Dawnkeeper:'DAWNKEEPER',Wayfinder:'WAYFINDER',Ravager:'RAVAGER',Hexweaver:'HEXWEAVER','Knife Dancer':'KNIFE_DANCER',Stonecaller:'STONECALLER'};
const slotByName:Record<string,GearSlot>={Helmet:'helmet',Chest:'chest',Gloves:'gloves',Legs:'legs',Boots:'boots',Weapon:'weapon','Off-hand':'offhand',Cape:'cape',Amulet:'amulet',Ring:'ring'};
const rarityByTier:Record<string,ItemDef['rarity']>={T1:'common',T2:'common',T3:'common',T4:'common',T5:'common',T6:'common',T7:'common',T8:'common',T9:'common'};
const slotWeight:Record<GearSlot,{attack:number;defense:number;hp:number}>={
  helmet:{attack:0,defense:4,hp:8},chest:{attack:0,defense:7,hp:16},gloves:{attack:1,defense:3,hp:6},legs:{attack:0,defense:5,hp:12},boots:{attack:1,defense:3,hp:7},
  weapon:{attack:9,defense:0,hp:0},offhand:{attack:3,defense:6,hp:4},cape:{attack:1,defense:3,hp:9},amulet:{attack:3,defense:1,hp:8},ring:{attack:3,defense:1,hp:6},
};

/** Runtime item definitions for the authoritative v33 catalog. */
export const EQUIPMENT_ITEMS_V33:ItemDef[]=(catalog.pieces as Array<Record<string,string|number>>).map(piece=>{
  const tier=String(piece.Tier),slot=slotByName[String(piece.Slot)],level=Math.max(1,Number(piece['Req Level']));
  const weight=slotWeight[slot],scale=Number(tier.slice(1));
  return {
    id:String(piece['Piece ID']),name:String(piece['Item Name']),type:'gear',slot,
    attack:weight.attack*scale,defense:weight.defense*scale,hp:weight.hp*scale,
    readiness:Math.max(1,Math.ceil(level/4)),value:Math.max(10,level*scale*12),
    rarity:rarityByTier[tier]??'common',classRestriction:classIdByName[String(piece.Class)],equipmentSetId:String(piece['Set ID']),
  };
});

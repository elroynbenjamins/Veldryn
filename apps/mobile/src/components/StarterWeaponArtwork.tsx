import {Image,StyleSheet,View} from 'react-native';

const STARTER_WEAPON_SHEET=require('../../assets/starter-weapons-v1.png');
const SHEET_SIZE=1274;
const CELL_SIZE=SHEET_SIZE/3;
const CELL_BY_ITEM_ID:Record<string,{column:number;row:number}>={
  basic_sword:{column:0,row:0},basic_tower_shield:{column:1,row:0},basic_chained_weapon:{column:2,row:0},
  basic_bow:{column:0,row:1},basic_two_handed_weapon:{column:1,row:1},basic_wand:{column:2,row:1},
  basic_main_hand_blade:{column:0,row:2},basic_mace:{column:1,row:2},basic_staff:{column:2,row:2},
};

export function hasStarterWeaponArtwork(itemId:string){return !!CELL_BY_ITEM_ID[itemId];}

export function StarterWeaponArtwork({itemId,size=58}:{itemId:string;size?:number}){
  const cell=CELL_BY_ITEM_ID[itemId];
  if(!cell)return null;
  const scale=size/CELL_SIZE;
  return <View accessible={false} style={[s.frame,{width:size,height:size}]}><Image source={STARTER_WEAPON_SHEET} resizeMode="stretch" style={{position:'absolute',width:SHEET_SIZE*scale,height:SHEET_SIZE*scale,left:-cell.column*size,top:-cell.row*size}}/></View>;
}

const s=StyleSheet.create({frame:{overflow:'hidden'}});

import {Image,StyleSheet,View} from 'react-native';
import {STARTER_WEAPON_CELLS,starterWeaponArtworkLayout} from '../core/starter-weapon-artwork-layout';

const STARTER_WEAPON_SHEET=require('../../assets/starter-weapons-v1.webp');

export function hasStarterWeaponArtwork(itemId:string){
  return Object.prototype.hasOwnProperty.call(STARTER_WEAPON_CELLS,itemId);
}

export function StarterWeaponArtwork({itemId,size=58}:{itemId:string;size?:number}){
  const crop=starterWeaponArtworkLayout(itemId,size);
  if(!crop)return null;
  // Only the selected atlas cell appears through this clipped frame.
  return <View accessible={false} style={[s.frame,{width:size,height:size}]}><Image source={STARTER_WEAPON_SHEET} resizeMode="stretch" style={{position:'absolute',width:crop.sheetSize,height:crop.sheetSize,left:crop.left,top:crop.top}}/></View>;
}

const s=StyleSheet.create({frame:{overflow:'hidden'}});

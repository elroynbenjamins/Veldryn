import {Image,StyleSheet,Text,View} from 'react-native';
import {ItemDef} from '../content/items';
import {C,radii} from '../theme/theme';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {equipmentArtworkSetByItemId,equipmentSheetBySet} from '../theme/equipment-assets';

const slots=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'] as const;
const cellAspect=(1774/5)/(887/2);

export function hasEquipmentArtwork(item:ItemDef){
  const setId=equipmentArtworkSetByItemId[item.id];
  return Boolean(setId&&equipmentSheetBySet[setId]&&item.slot&&slots.includes(item.slot as typeof slots[number]));
}

export function EquipmentArtwork({item,compact=false,framed=true}:{item:ItemDef;compact?:boolean;framed?:boolean}){
  const meta=rarityMeta(itemRarity(item)),size=compact?48:64;
  const setId=equipmentArtworkSetByItemId[item.id],sheet=setId?equipmentSheetBySet[setId]:undefined;
  const slotIndex=item.slot?slots.indexOf(item.slot as typeof slots[number]):-1;
  const frameStyle={width:size,height:size,borderColor:meta.color,borderWidth:framed?meta.borderWidth:0,backgroundColor:framed?meta.surface:'transparent'};
  if(sheet&&slotIndex>=0){
    const cellWidth=size*cellAspect;
    return <View accessibilityLabel={`${item.name} equipment artwork`} style={[s.frame,frameStyle]}><View style={{width:cellWidth,height:size,overflow:'hidden'}}><Image source={sheet} resizeMode="stretch" style={{position:'absolute',width:cellWidth*5,height:size*2,left:-(slotIndex%5)*cellWidth,top:-Math.floor(slotIndex/5)*size}}/></View></View>;
  }
  return <View accessibilityLabel={`${item.name} equipment marker`} style={[s.frame,frameStyle]}><Text style={[s.marker,{color:meta.color}]}>◇</Text></View>;
}

const s=StyleSheet.create({frame:{overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:C.bg,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},marker:{fontSize:28,lineHeight:32,fontWeight:'700'}});

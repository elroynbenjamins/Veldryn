import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {visualText} from '../i18n/visuals';
import {Image,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import {ItemDef} from '../content/items';
import {C,radii} from '../theme/theme';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {equipmentArtworkSetByItemId,equipmentSheetBySet} from '../theme/equipment-assets';
import {hasStarterWeaponArtwork,StarterWeaponArtwork} from './StarterWeaponArtwork';

const slots=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'] as const;
// Replacement atlases use one shared 5 × 2 grid: 960 × 384, or square cells.
const fallbackCellAspect=1;

export function equipmentSheetCellAspect(sheet:ImageSourcePropType){
  // React Native Web does not expose resolveAssetSource; fall back to the
  // authored sprite-sheet ratio when running the Expo web preview.
  const resolved=Image.resolveAssetSource?.(sheet);
  return resolved?.width>0&&resolved?.height>0?(resolved.width/5)/(resolved.height/2):fallbackCellAspect;
}

export function hasEquipmentArtwork(item:ItemDef){
  const setId=equipmentArtworkSetByItemId[item.id];
  return hasStarterWeaponArtwork(item.id)||Boolean(setId&&equipmentSheetBySet[setId]&&item.slot&&slots.includes(item.slot as typeof slots[number]));
}

export function EquipmentArtwork({item,compact=false,framed=true,size:requestedSize}:{item:ItemDef;compact?:boolean;framed?:boolean;size?:number}){
 const language=useGameLanguage(),tr=(source:string,params?:Record<string,string|number>)=>visualText(language,source,params);
  const meta=rarityMeta(itemRarity(item)),size=requestedSize??(compact?48:64);
  const setId=equipmentArtworkSetByItemId[item.id],sheet=setId?equipmentSheetBySet[setId]:undefined;
  const slotIndex=item.slot?slots.indexOf(item.slot as typeof slots[number]):-1;
  const frameStyle={width:size,height:size,borderColor:meta.color,borderWidth:framed?meta.borderWidth:0,backgroundColor:framed?meta.surface:'transparent'};
  if(hasStarterWeaponArtwork(item.id))return <View accessibilityLabel={tr('{name} equipment artwork',{name:item.name})} style={[s.frame,frameStyle]}><StarterWeaponArtwork itemId={item.id} size={size}/></View>;
  if(sheet&&slotIndex>=0){
    const aspect=equipmentSheetCellAspect(sheet);
    const cellWidth=aspect>=1?size:size*aspect;
    const cellHeight=aspect>=1?size/aspect:size;
    const inset=.06,displayWidth=cellWidth*(1-inset*2),displayHeight=cellHeight*(1-inset*2);
    return <View accessibilityLabel={tr('{name} equipment artwork',{name:item.name})} style={[s.frame,frameStyle]}><View style={{width:cellWidth,height:cellHeight,overflow:'hidden'}}><Image source={sheet} resizeMode="stretch" style={{position:'absolute',width:displayWidth*5,height:displayHeight*2,left:cellWidth*inset-(slotIndex%5)*displayWidth,top:cellHeight*inset-Math.floor(slotIndex/5)*displayHeight}}/></View></View>;
  }
  return <View accessibilityLabel={tr('{name} equipment marker',{name:item.name})} style={[s.frame,frameStyle]}><Text style={[s.marker,{color:meta.color}]}>◇</Text></View>;
}

const s=StyleSheet.create({frame:{width:64,height:64,flexShrink:0,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:C.bg,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},marker:{fontSize:28,lineHeight:32,fontWeight:'700'}});

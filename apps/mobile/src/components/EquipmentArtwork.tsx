import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {visualText} from '../i18n/visuals';
import {Image,StyleSheet,Text,View,type ImageSourcePropType} from 'react-native';
import {ItemDef} from '../content/items';
import {C,radii} from '../theme/theme';
import {itemRarity,rarityMeta,type ItemRarity} from '../core/item-rarity';
import {equipmentArtworkScaleBySet,equipmentArtworkSetByItemId,equipmentSheetBySet} from '../theme/equipment-assets';
import {hasStarterWeaponArtwork,StarterWeaponArtwork} from './StarterWeaponArtwork';
import {EQUIPMENT_ATLAS_COLUMNS,EQUIPMENT_ATLAS_ROWS,equipmentArtworkLayout} from '../core/equipment-artwork-layout';

const slots=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'] as const;
// Replacement atlases use one shared 5 × 2 grid: 960 × 384, or square cells.
const fallbackCellAspect=1;

export function equipmentSheetCellAspect(sheet:ImageSourcePropType){
  // React Native Web does not expose resolveAssetSource; fall back to the
  // authored sprite-sheet ratio when running the Expo web preview.
  const resolved=Image.resolveAssetSource?.(sheet);
  return resolved&&(resolved.width??0)>0&&(resolved.height??0)>0
    ?(resolved.width!/EQUIPMENT_ATLAS_COLUMNS)/(resolved.height!/EQUIPMENT_ATLAS_ROWS)
    :fallbackCellAspect;
}

export function hasEquipmentArtwork(item:ItemDef){
  const setId=equipmentArtworkSetByItemId[item.id];
  return hasStarterWeaponArtwork(item.id)||Boolean(setId&&equipmentSheetBySet[setId]&&item.slot&&slots.includes(item.slot as typeof slots[number]));
}

export function EquipmentArtwork({item,rarity,compact=false,framed=true,size:requestedSize}:{item:ItemDef;rarity?:ItemRarity;compact?:boolean;framed?:boolean;size?:number}){
 const language=useGameLanguage(),tr=(source:string,params?:Record<string,string|number>)=>visualText(language,source,params);
  const meta=rarityMeta(rarity??itemRarity(item)),size=requestedSize??(compact?48:64);
  const setId=equipmentArtworkSetByItemId[item.id],sheet=setId?equipmentSheetBySet[setId]:undefined;
  const slotIndex=item.slot?slots.indexOf(item.slot as typeof slots[number]):-1;
  const frameStyle={width:size,height:size,borderColor:meta.color,borderWidth:framed?meta.borderWidth:0,backgroundColor:framed?meta.surface:'transparent'};
  if(hasStarterWeaponArtwork(item.id))return <View accessibilityLabel={tr('{name} equipment artwork',{name:item.name})} style={[s.frame,frameStyle]}><StarterWeaponArtwork itemId={item.id} size={size}/></View>;
  const crop=sheet?equipmentArtworkLayout(slotIndex,size,equipmentSheetCellAspect(sheet),setId?equipmentArtworkScaleBySet[setId]:undefined):null;
  if(sheet&&crop){
    // Crop within each source cell rather than simply nudging the atlas. The
    // latter can reveal a neighbouring icon at the top/left edge of a tile.
    return <View accessibilityLabel={tr('{name} equipment artwork',{name:item.name})} style={[s.frame,frameStyle]}><View style={{width:crop.artWidth,height:crop.artHeight,overflow:'hidden'}}><Image source={sheet} resizeMode="stretch" style={{position:'absolute',width:crop.sheetWidth,height:crop.sheetHeight,left:crop.left,top:crop.top}}/></View></View>;
  }
  return <View accessibilityLabel={tr('{name} equipment marker',{name:item.name})} style={[s.frame,frameStyle]}><Text style={[s.marker,{color:meta.color}]}>◇</Text></View>;
}

const s=StyleSheet.create({frame:{width:64,height:64,flexShrink:0,overflow:'hidden',alignItems:'center',justifyContent:'center',backgroundColor:C.bg,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},marker:{fontSize:28,lineHeight:32,fontWeight:'700'}});

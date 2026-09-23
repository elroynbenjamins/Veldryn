import {Image,StyleSheet,View} from 'react-native';
import {resourceIconSource} from '../theme/resource-assets';
import {CONSUMABLE_ART_CELL,CONSUMABLE_ART_SHEET_SIZE,consumableArtworkCell,consumableArtworkSheet} from '../theme/consumable-assets';
import {MISC_ITEM_CELL,MISC_ITEM_SHEET_HEIGHT,MISC_ITEM_SHEET_WIDTH,miscItemCell,miscItemSheet} from '../theme/misc-item-assets';
import {ASTERFALL_INGREDIENT_CELL,ASTERFALL_INGREDIENT_SHEET_SIZE,asterfallIngredientCell,asterfallIngredientSheet} from '../theme/asterfall-ingredient-assets';
import {ASTERFALL_ORE_CELL,ASTERFALL_ORE_SHEET_HEIGHT,ASTERFALL_ORE_SHEET_WIDTH,asterfallOreCell,asterfallOreSheet} from '../theme/asterfall-ore-assets';
import {ASTERFALL_GATHERING_CELL,ASTERFALL_GATHERING_SHEET_HEIGHT,ASTERFALL_GATHERING_SHEET_WIDTH,asterfallGatheringCell,asterfallGatheringSheet} from '../theme/asterfall-gathering-assets';
import {ASTERFALL_CRAFTED_CELL,ASTERFALL_CRAFTED_SHEET_HEIGHT,ASTERFALL_CRAFTED_SHEET_WIDTH,asterfallCraftedCell,asterfallCraftedSheet} from '../theme/asterfall-crafted-assets';
import {ARCANE_MATERIAL_CELL,ARCANE_MATERIAL_SHEET_HEIGHT,ARCANE_MATERIAL_SHEET_WIDTH,arcaneMaterialCell,arcaneMaterialSheet} from '../theme/arcane-material-assets';
import {
  REGIONAL_RESOURCE_CELL,
  REGIONAL_RESOURCE_SHEET_HEIGHT,
  REGIONAL_RESOURCE_SHEET_WIDTH,
  regionalResourceCell,
  regionalResourceSheet,
} from '../theme/regional-resource-assets';
import {
  RUNTIME_ITEM_CELL,
  RUNTIME_ITEM_SHEET_HEIGHT,
  RUNTIME_ITEM_SHEET_WIDTH,
  runtimeItemCell,
  runtimeItemSheet,
} from '../theme/runtime-item-assets';
import {C,radii} from '../theme/theme';

function AtlasCell({source,column,row,cell,sheetWidth,sheetHeight,size}:{source:any;column:number;row:number;cell:number;sheetWidth:number;sheetHeight:number;size:number}){
  const scale=size/cell;
  return <View style={{width:size,height:size,overflow:'hidden'}}>
    <Image
      source={source}
      resizeMode="stretch"
      fadeDuration={0}
      style={{
        position:'absolute',
        width:sheetWidth*scale,
        height:sheetHeight*scale,
        left:-column*size,
        top:-row*size,
      }}
    />
  </View>;
}

export function ResourceArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const consumable=consumableArtworkCell(itemId);
  if(consumable)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={consumableArtworkSheet(consumable.sheet)} column={consumable.column} row={consumable.row} cell={CONSUMABLE_ART_CELL} sheetWidth={CONSUMABLE_ART_SHEET_SIZE} sheetHeight={CONSUMABLE_ART_SHEET_SIZE} size={size}/></View>;

  const misc=miscItemCell(itemId);
  if(misc)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={miscItemSheet} column={misc.column} row={misc.row} cell={MISC_ITEM_CELL} sheetWidth={MISC_ITEM_SHEET_WIDTH} sheetHeight={MISC_ITEM_SHEET_HEIGHT} size={size}/></View>;

  const asterfallIngredient=asterfallIngredientCell(itemId);
  if(asterfallIngredient)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={asterfallIngredientSheet} column={asterfallIngredient.column} row={asterfallIngredient.row} cell={ASTERFALL_INGREDIENT_CELL} sheetWidth={ASTERFALL_INGREDIENT_SHEET_SIZE} sheetHeight={ASTERFALL_INGREDIENT_SHEET_SIZE} size={size}/></View>;

  const runtime=runtimeItemCell(itemId);
  if(runtime)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={runtimeItemSheet} column={runtime.column} row={runtime.row} cell={RUNTIME_ITEM_CELL} sheetWidth={RUNTIME_ITEM_SHEET_WIDTH} sheetHeight={RUNTIME_ITEM_SHEET_HEIGHT} size={size}/></View>;

  const regional=regionalResourceCell(itemId);
  if(regional)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={regionalResourceSheet} column={regional.column} row={regional.row} cell={REGIONAL_RESOURCE_CELL} sheetWidth={REGIONAL_RESOURCE_SHEET_WIDTH} sheetHeight={REGIONAL_RESOURCE_SHEET_HEIGHT} size={size}/></View>;

  const asterfallOre=asterfallOreCell(itemId);
  if(asterfallOre)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={asterfallOreSheet} column={asterfallOre.column} row={asterfallOre.row} cell={ASTERFALL_ORE_CELL} sheetWidth={ASTERFALL_ORE_SHEET_WIDTH} sheetHeight={ASTERFALL_ORE_SHEET_HEIGHT} size={size}/></View>;

  const asterfallGathering=asterfallGatheringCell(itemId);
  if(asterfallGathering)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={asterfallGatheringSheet} column={asterfallGathering.column} row={asterfallGathering.row} cell={ASTERFALL_GATHERING_CELL} sheetWidth={ASTERFALL_GATHERING_SHEET_WIDTH} sheetHeight={ASTERFALL_GATHERING_SHEET_HEIGHT} size={size}/></View>;

  const asterfallCrafted=asterfallCraftedCell(itemId);
  if(asterfallCrafted)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={asterfallCraftedSheet} column={asterfallCrafted.column} row={asterfallCrafted.row} cell={ASTERFALL_CRAFTED_CELL} sheetWidth={ASTERFALL_CRAFTED_SHEET_WIDTH} sheetHeight={ASTERFALL_CRAFTED_SHEET_HEIGHT} size={size}/></View>;

  const arcaneMaterial=arcaneMaterialCell(itemId);
  if(arcaneMaterial)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={arcaneMaterialSheet} column={arcaneMaterial.column} row={arcaneMaterial.row} cell={ARCANE_MATERIAL_CELL} sheetWidth={ARCANE_MATERIAL_SHEET_WIDTH} sheetHeight={ARCANE_MATERIAL_SHEET_HEIGHT} size={size}/></View>;

  const source=resourceIconSource(itemId);if(!source)return null;
  return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></View>;
}

const s=StyleSheet.create({
  art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
  image:{width:'100%',height:'100%'},
});

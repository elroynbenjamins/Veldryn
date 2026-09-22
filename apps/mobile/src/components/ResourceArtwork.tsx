import {Image,StyleSheet,View} from 'react-native';
import {resourceIconSource} from '../theme/resource-assets';
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
  const runtime=runtimeItemCell(itemId);
  if(runtime)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={runtimeItemSheet} column={runtime.column} row={runtime.row} cell={RUNTIME_ITEM_CELL} sheetWidth={RUNTIME_ITEM_SHEET_WIDTH} sheetHeight={RUNTIME_ITEM_SHEET_HEIGHT} size={size}/></View>;

  const regional=regionalResourceCell(itemId);
  if(regional)return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><AtlasCell source={regionalResourceSheet} column={regional.column} row={regional.row} cell={REGIONAL_RESOURCE_CELL} sheetWidth={REGIONAL_RESOURCE_SHEET_WIDTH} sheetHeight={REGIONAL_RESOURCE_SHEET_HEIGHT} size={size}/></View>;

  const source=resourceIconSource(itemId);if(!source)return null;
  return <View style={[s.art,{width:size,height:size},framed&&s.frame]}><Image source={source} resizeMode="contain" fadeDuration={0} style={s.image}/></View>;
}

const s=StyleSheet.create({
  art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
  image:{width:'100%',height:'100%'},
});

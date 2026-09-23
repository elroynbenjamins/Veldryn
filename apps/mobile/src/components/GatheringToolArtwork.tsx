import {Image,StyleSheet,View} from 'react-native';
import {
  GATHERING_TOOL_CELL,
  GATHERING_TOOL_SHEET_HEIGHT,
  GATHERING_TOOL_SHEET_WIDTH,
  gatheringToolAtlas,
  gatheringToolCells,
} from '../theme/gathering-tool-assets';
import {C,radii} from '../theme/theme';

export function GatheringToolArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const cell=gatheringToolCells[itemId];if(!cell)return null;
  const scale=size/GATHERING_TOOL_CELL;
  const atlasWidth=GATHERING_TOOL_SHEET_WIDTH*scale;
  const atlasHeight=GATHERING_TOOL_SHEET_HEIGHT*scale;
  return <View style={[s.crop,{width:size,height:size},framed&&s.frame]}><Image source={gatheringToolAtlas} resizeMode="stretch" style={{position:'absolute',width:atlasWidth,height:atlasHeight,left:-cell.column*size,top:-cell.row*size}}/></View>;
}
const s=StyleSheet.create({crop:{overflow:'hidden',alignItems:'center',justifyContent:'center'},frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'}});

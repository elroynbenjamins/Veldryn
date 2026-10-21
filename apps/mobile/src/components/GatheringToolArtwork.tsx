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
 // Crop inside the source cell. Offsetting a scaled atlas leaves a sliver of
 // the preceding tool visible along a tile's top or left edge.
 const inset=.06,inner=1-inset*2,scale=size/(GATHERING_TOOL_CELL*inner);
  const atlasWidth=GATHERING_TOOL_SHEET_WIDTH*scale;
  const atlasHeight=GATHERING_TOOL_SHEET_HEIGHT*scale;
 return <View style={[s.crop,{width:size,height:size},framed&&s.frame]}><Image source={gatheringToolAtlas} resizeMode="stretch" style={{position:'absolute',width:atlasWidth,height:atlasHeight,left:-(cell.column+inset)*GATHERING_TOOL_CELL*scale,top:-(cell.row+inset)*GATHERING_TOOL_CELL*scale}}/></View>;
}
const s=StyleSheet.create({crop:{overflow:'hidden',alignItems:'center',justifyContent:'center'},frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'}});

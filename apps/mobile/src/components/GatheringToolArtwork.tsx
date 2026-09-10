import {Image,StyleSheet,View} from 'react-native';
import {gatheringToolAtlas,gatheringToolCells} from '../theme/gathering-tool-assets';
import {C,radii} from '../theme/theme';

const ATLAS_ASPECT=1268/1241;
export function GatheringToolArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const cell=gatheringToolCells[itemId];if(!cell)return null;
  const atlasWidth=size*4,atlasHeight=atlasWidth*ATLAS_ASPECT,cellHeight=atlasHeight/4;
  return <View style={[s.crop,{width:size,height:size},framed&&s.frame]}><Image source={gatheringToolAtlas} resizeMode="stretch" style={{position:'absolute',width:atlasWidth,height:atlasHeight,left:-cell.column*size,top:-cell.row*cellHeight}}/></View>;
}
const s=StyleSheet.create({crop:{overflow:'hidden',alignItems:'center',justifyContent:'center'},frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'}});

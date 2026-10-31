import {Image,StyleSheet,View} from 'react-native';
import {gatheringToolAtlas,gatheringToolCells} from '../theme/gathering-tool-assets';
import {gatheringToolArtworkLayout} from '../core/gathering-tool-artwork-layout';
import {C,radii} from '../theme/theme';

export function GatheringToolArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const cell=gatheringToolCells[itemId];
  if(!cell)return null;
  const layout=gatheringToolArtworkLayout(cell.column,cell.row,size);
  if(!layout)return null;

  // Isolate the source tile before scaling it into the icon frame. The inset
  // guards against atlas filtering bleed; the outer margin leaves long tool
  // handles and rod tips visible instead of cutting 6% off every tile edge.
  return <View style={[s.crop,{width:size,height:size},framed&&s.frame]}>
    <View style={{width:layout.viewportSize,height:layout.viewportSize,overflow:'hidden'}}>
      <Image source={gatheringToolAtlas} resizeMode="stretch" fadeDuration={0} style={{
        position:'absolute',
        width:layout.atlasWidth,
        height:layout.atlasHeight,
        left:layout.left,
        top:layout.top,
      }}/>
    </View>
  </View>;
}
const s=StyleSheet.create({
  crop:{overflow:'hidden',alignItems:'center',justifyContent:'center'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
});

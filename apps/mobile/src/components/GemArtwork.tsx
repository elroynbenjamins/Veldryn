import {Image,StyleSheet,View} from 'react-native';
import {C,radii} from '../theme/theme';
import {
  GEM_SPRITE_V1_CELL,
  GEM_SPRITE_V1_SIZE,
  gemArtworkCellV1,
  gemSpriteSourceV1,
} from '../theme/gem-assets';

export function GemArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
  const cell=gemArtworkCellV1(itemId);
  if(!cell)return null;
  const scale=size/GEM_SPRITE_V1_CELL;
  const sheetSize=GEM_SPRITE_V1_SIZE*scale;
  return <View accessibilityLabel="Gem artwork" style={[s.art,{width:size,height:size},framed&&s.frame]}>
    <View style={{width:size,height:size,overflow:'hidden'}}>
      <Image
        source={gemSpriteSourceV1}
        resizeMode="stretch"
        fadeDuration={0}
        style={{
          position:'absolute',
          width:sheetSize,
          height:sheetSize,
          left:-cell.column*size,
          top:-cell.row*size,
        }}
      />
    </View>
  </View>;
}

const s=StyleSheet.create({
  art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
});

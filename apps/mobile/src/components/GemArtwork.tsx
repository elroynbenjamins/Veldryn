import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {visualText} from '../i18n/visuals';
import {Image,StyleSheet,View} from 'react-native';
import {C,radii} from '../theme/theme';
import {
  GEM_SPRITE_V1_CELL,
  GEM_SPRITE_V1_SIZE,
  gemArtworkCellV1,
  gemSpriteSourceV1,
} from '../theme/gem-assets';

export function GemArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
 const language=useGameLanguage(),tr=(source:string,params?:Record<string,string|number>)=>visualText(language,source,params);
  const cell=gemArtworkCellV1(itemId);
  if(!cell)return null;
  const inset=.06,displaySize=size*(1-inset*2),scale=displaySize/GEM_SPRITE_V1_CELL,offset=size*inset;
  const sheetSize=GEM_SPRITE_V1_SIZE*scale;
  return <View accessibilityLabel={tr('Gem artwork')} style={[s.art,{width:size,height:size},framed&&s.frame]}>
    <View style={{width:size,height:size,overflow:'hidden'}}>
      <Image
        source={gemSpriteSourceV1}
        resizeMode="stretch"
        fadeDuration={0}
        style={{
          position:'absolute',
          width:sheetSize,
          height:sheetSize,
          left:offset-cell.column*displaySize,
          top:offset-cell.row*displaySize,
        }}
      />
    </View>
  </View>;
}

const s=StyleSheet.create({
  art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
});

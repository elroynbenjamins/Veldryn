import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {visualText} from '../i18n/visuals';
import {Image,StyleSheet,Text,View} from 'react-native';
import {C,radii} from '../theme/theme';
import {GEM_GRADE_RARITY_V1} from '../content/gems-v1';
import {rarityMeta} from '../core/item-rarity';
import {
  GEM_SPRITE_V1_CELL,
  GEM_SPRITE_V1_SIZE,
  gemArtworkCellV1,
  gemVisualIdentityV1,
  gemSpriteSourceV1,
  rawGemSpriteSourceV1,
} from '../theme/gem-assets';

export function GemArtwork({itemId,size=58,framed=true}:{itemId:string;size?:number;framed?:boolean}){
 const language=useGameLanguage(),tr=(source:string,params?:Record<string,string|number>)=>visualText(language,source,params);
  const identity=gemVisualIdentityV1(itemId);
  const cell=gemArtworkCellV1(identity?.artworkId??itemId);
  if(!cell)return null;
  const inset=.06,displaySize=size*(1-inset*2),scale=displaySize/GEM_SPRITE_V1_CELL,offset=size*inset;
  const sheetSize=GEM_SPRITE_V1_SIZE*scale;
  const gradeColor=identity?rarityMeta(GEM_GRADE_RARITY_V1[identity.grade]).color:undefined;
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
      {identity?.raw?<Image source={rawGemSpriteSourceV1} resizeMode="contain" fadeDuration={0}
        style={{position:'absolute',left:0,bottom:0,width:size*.35,height:size*.35}}/>:null}
      {identity?.raw?<View pointerEvents="none" style={[s.rawFlag,{bottom:Math.max(0,size*.02),left:1}]}>
        <Text style={[s.rawText,{fontSize:size>=60?10:7}]}>RAW</Text>
      </View>:null}
      {identity?<View pointerEvents="none" style={[s.gradeBadge,{top:1,right:1,borderColor:gradeColor,minWidth:Math.max(17,size*.34),height:Math.max(15,size*.25)}]}>
        <Text style={[s.gradeText,{color:gradeColor,fontSize:size>=60?12:9}]}>G{identity.grade}</Text>
      </View>:null}
    </View>
  </View>;
}

const s=StyleSheet.create({
  art:{alignItems:'center',justifyContent:'center',overflow:'hidden'},
  frame:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:'#09121a'},
  gradeBadge:{position:'absolute',paddingHorizontal:2,alignItems:'center',justifyContent:'center',borderRadius:4,borderWidth:1,backgroundColor:'#091019E8'},
  gradeText:{fontWeight:'900',includeFontPadding:false,textAlign:'center'},
  rawFlag:{position:'absolute',backgroundColor:'#091019DD',paddingHorizontal:2,borderRadius:2},
  rawText:{color:'#E5DBCF',fontWeight:'900',includeFontPadding:false,letterSpacing:.2},
});

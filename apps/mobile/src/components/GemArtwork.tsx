import {useMemo} from 'react';
import {Image,StyleSheet,Text,View} from 'react-native';
import {radii,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {rarityMeta} from '../core/item-rarity';
import {GEM_GRADE_LABEL_V1,GEM_GRADE_RARITY_V1} from '../content/gems-v1';
import {
  GEM_SPRITE_V1_CELL,
  GEM_SPRITE_V1_SIZE,
  gemArtworkCellV1,
  gemArtworkGradeV1,
  gemSpriteSourceV1,
} from '../theme/gem-assets';

const GRADE_ROMAN={1:'I',2:'II',3:'III',4:'IV',5:'V'} as const;

export function GemArtwork({itemId,size=58,framed=true,showGradeBadge=true}:{itemId:string;size?:number;framed?:boolean;showGradeBadge?:boolean}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const cell=gemArtworkCellV1(itemId),grade=gemArtworkGradeV1(itemId);
  if(!cell)return null;
  const scale=size/GEM_SPRITE_V1_CELL,sheetSize=GEM_SPRITE_V1_SIZE*scale;
  const meta=grade?rarityMeta(GEM_GRADE_RARITY_V1[grade]):undefined,badgeSize=Math.max(14,Math.min(20,Math.round(size*.32)));
  const accessibilityLabel=grade?`${GEM_GRADE_LABEL_V1[grade]} grade ${GRADE_ROMAN[grade]} gem artwork`:'Gem crafting material artwork';
  return <View accessibilityLabel={accessibilityLabel} style={[s.art,{width:size,height:size},framed&&[s.frame,{borderColor:meta?.color??C.line,backgroundColor:meta?.surface??C.panel2}],meta&&{shadowColor:meta.color,shadowOpacity:Math.max(.05,meta.glowOpacity*.75),shadowRadius:5,shadowOffset:{width:0,height:0},elevation:grade>=3?1:0}]}>
    <View style={{width:size,height:size,overflow:'hidden',borderRadius:framed?radii.sm:0}}>
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
    {showGradeBadge&&grade?<View pointerEvents="none" style={[s.gradeBadge,{width:badgeSize,height:badgeSize,borderColor:meta!.color,backgroundColor:C.panelRaised}]}><Text style={[s.gradeText,{color:meta!.color,fontSize:badgeSize<=15?7:8}]}>{GRADE_ROMAN[grade]}</Text></View>:null}
  </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
  art:{position:'relative',alignItems:'center',justifyContent:'center'},
  frame:{borderWidth:1,borderRadius:radii.sm},
  gradeBadge:{position:'absolute',right:-1,bottom:-1,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:99},
  gradeText:{fontWeight:'900',lineHeight:10},
});}

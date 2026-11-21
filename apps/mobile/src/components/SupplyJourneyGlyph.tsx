import {Image,View,type ImageSourcePropType} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {DailySupplyBoostType} from '../core/daily-supplies';

export type SupplyGlyphKind=DailySupplyBoostType|'milestone';

// Locally bundled transparent pixel art, independent of device fonts and platform emoji.
const BOOST_ART:Record<DailySupplyBoostType,ImageSourcePropType>={
 gathering_speed:require('../assets/daily-supplies/gathering_speed.png'),
 crafting_speed:require('../assets/daily-supplies/crafting_speed.png'),
 skill_xp:require('../assets/daily-supplies/skill_xp.png'),
 combat_xp:require('../assets/daily-supplies/combat_xp.png'),
 combat_speed:require('../assets/daily-supplies/combat_speed.png'),
};
const MILESTONE_PATTERN=[
 '..........','..oooooo..','.oaaaaaao.','.oaaaaaao.','oaooooaaoo',
 'oabbbbaaoo','oabbbbaaoo','.oaaaaaao.','..oooooo..','..........',
] as const;

export function SupplyJourneyGlyph({kind,size=44}:{kind:SupplyGlyphKind;size?:number}){
 const C=useGameTheme();
 if(kind!=='milestone')return <Image accessible={false} source={BOOST_ART[kind]} style={{width:size,height:size}} resizeMode="contain" fadeDuration={0}/>;
 const pixel=Math.max(1,Math.floor(size/10));
 const palette:Record<string,string>={'.':'transparent',o:C.text,a:C.special,b:C.info};
 return <View accessible={false} style={{width:pixel*10,height:pixel*10,alignSelf:'center',overflow:'hidden'}}>
  {MILESTONE_PATTERN.map((row,y)=><View key={y} style={{flexDirection:'row',height:pixel}}>
   {row.split('').map((entry,x)=><View key={x} style={{width:pixel,height:pixel,backgroundColor:palette[entry]??'transparent'}}/>)}
  </View>)}
 </View>;
}

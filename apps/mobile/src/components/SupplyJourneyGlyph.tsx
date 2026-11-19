import {useMemo} from 'react';
import {View,StyleSheet} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {DailySupplyBoostType} from '../core/daily-supplies';

export type SupplyGlyphKind=DailySupplyBoostType|'milestone';

/** Ten-pixel authored glyphs: a crisp in-app asset with no platform emoji or font dependence.
 * 'o' is the outline, 'a' the accent, 'b' the secondary fill, '.' is transparent. */
const patterns:Record<SupplyGlyphKind,readonly string[]>={
 gathering_speed:[
  '..........','....oooo..','...oaaaao.','..oaaaao..','..oaooo...','..ooo.....',
  '..ob......','.obo......','obo.......','oo........',
 ],
 crafting_speed:[
  '..........','...oooo...','..oaaaao..','..oaaaao..','...obbo...','..oobboo..',
  '.obbbbbo..','oobbbbbboo','oooooooooo','..........',
 ],
 skill_xp:[
  '....oo....','....aa....','...oaao...','...oaao...','oaaaaaaaao',
  'oaabbbbaao','..oaabo...','..oaabo...','....aa....','....oo....',
 ],
 combat_xp:[
  'oo......oo','oao....oao','.oao..oao.','..oaaoao..','...oaaao..',
  '...oaaao..','..oaooao..','.oao..oao.','oo......oo','..........',
 ],
 combat_speed:[
  '......oo..','.....oao..','....oao...','...oaao...','..oaaaao..',
  '.....oao..','....oao...','...oao....','..oo......','..........',
 ],
 milestone:[
  '..........','..oooooo..','.oaaaaaao.','.oaaaaaao.','oaooooaaoo',
  'oabbbbaaoo','oabbbbaaoo','.oaaaaaao.','..oooooo..','..........',
 ],
};
export function SupplyJourneyGlyph({kind,size=44}:{kind:SupplyGlyphKind;size?:number}){
 const C=useGameTheme();
 const pixel=Math.max(2,Math.floor(size/10));
 const palette=useMemo(()=>({
  '.':'transparent',o:C.text,a:kind==='milestone'?C.special:kind==='combat_speed'?C.warning:C.accent,
  b:kind==='gathering_speed'?C.good:kind==='combat_xp'?C.bad:C.info,
 }),[C,kind]);
 return <View accessible={false} style={[styles.grid,{width:pixel*10,height:pixel*10}]}>
  {patterns[kind].map((row,y)=><View key={y} style={styles.row}>{row.split('').map((entry,x)=>
   <View key={x} style={{width:pixel,height:pixel,backgroundColor:palette[entry as keyof typeof palette]??'transparent'}}/>
  )}</View>)}
 </View>;
}
const styles=StyleSheet.create({grid:{overflow:'hidden',alignSelf:'center'},row:{flexDirection:'row',height:'10%'}});

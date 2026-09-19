import {StyleSheet,Text,View} from 'react-native';
import {Panel} from './Panel';
import type {GameState} from '../core/types';
import {regionCompletionFromGameState} from '../core/region-completion-v40';
import {C,spacing,typography} from '../theme/theme';

export function RegionCompletionPanel({state,regionId}:{state:GameState;regionId:string}){
 const view=regionCompletionFromGameState(state,regionId);
 return <Panel>
  <View style={s.header}><View style={s.flex}><Text style={s.eyebrow}>REGION COMPLETION</Text><Text style={s.title}>{view.name}</Text></View><Text style={s.percent}>{view.percent}%</Text></View>
  <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:view.percent}} style={s.track}><View style={[s.fill,{width:(Math.max(2,view.percent)+'%') as any}]}/></View>
  {view.categories.filter(row=>row.total>0).map(row=><View key={row.key} style={s.row}><View style={s.flex}><Text style={s.name}>{row.label}</Text><Text style={s.meta}>{row.done}/{row.total}</Text></View><Text style={s.value}>{Math.round(row.percent*100)}%</Text></View>)}
  <Text style={s.note}>{view.nextMilestone?'Next completion milestone: '+view.nextMilestone+'%':'All currently authored completion categories are complete.'}</Text>
 </Panel>;
}
const s=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',gap:spacing.sm},flex:{flex:1,minWidth:0},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},percent:{fontSize:24,fontWeight:'900',color:C.accent},track:{height:9,borderRadius:5,overflow:'hidden',backgroundColor:C.bg,marginVertical:6},fill:{height:'100%',backgroundColor:C.accent},row:{minHeight:42,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,borderTopColor:C.line},name:{...typography.bodyStrong,color:C.text},meta:{...typography.caption,color:C.muted},value:{color:C.info,fontWeight:'900'},note:{...typography.caption,color:C.muted,marginTop:4}});
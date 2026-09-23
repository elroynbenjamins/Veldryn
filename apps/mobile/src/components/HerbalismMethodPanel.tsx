import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {HERBALISM_HARVEST_METHODS,herbalismHarvestMethodForActivity,herbalismLevel,herbalismMethodSummary,selectedHerbalismHarvestMethod} from '../core/herbalism';
import {Panel} from './Panel';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

export function HerbalismMethodPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),level=herbalismLevel(state),selected=selectedHerbalismHarvestMethod(state),session=state.activity?.kind==='herbalism'?herbalismHarvestMethodForActivity(state):undefined;
 return <Panel accentColor={C.good}>
  <View style={s.head}><View style={s.flex}><Text style={s.kicker}>HERBALISM · HARVEST METHOD</Text><Text style={s.title}>{selected.name}</Text><Text style={s.copy}>Choose how future Herbalism sessions trade speed, herb yield, XP and rare Wild Essence finds. No gathering tool is required.</Text></View><Text style={s.level}>Lv {level}</Text></View>
  {session?<Text style={s.session}>Current session · {session.name}{session.id!==selected.id?' · your new selection starts next session':''}</Text>:null}
  <View style={s.methods}>{HERBALISM_HARVEST_METHODS.map(method=>{
   const unlocked=level>=method.unlockLevel,on=selected.id===method.id;
   return <Pressable key={method.id} accessibilityRole="button" accessibilityState={{selected:on,disabled:!unlocked}} disabled={!unlocked||on} onPress={()=>void onCommand({type:'herbalism_method',args:{id:method.id}})} style={({pressed})=>[s.method,on&&s.methodOn,!unlocked&&s.methodLocked,pressed&&s.pressed]}>
    <View style={s.methodHead}><Text style={[s.methodName,on&&s.methodNameOn]}>{method.name}</Text><Text style={unlocked?s.unlock:on?s.unlock:s.lock}>{on?'SELECTED':unlocked?'AVAILABLE':'LV '+method.unlockLevel}</Text></View>
    <Text style={s.methodDesc}>{method.description}</Text><Text style={s.methodMeta}>{herbalismMethodSummary(method)}</Text>
   </Pressable>;
  })}</View>
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},kicker:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted},level:{...typography.bodyStrong,color:C.good,paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.good,borderRadius:8},session:{...typography.caption,color:C.info,fontWeight:'800'},methods:{gap:6},method:{gap:2,padding:8,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},methodOn:{borderColor:C.good,backgroundColor:C.goodSurface},methodLocked:{opacity:.58},methodHead:{flexDirection:'row',alignItems:'center',gap:8},methodName:{...typography.bodyStrong,color:C.text,flex:1},methodNameOn:{color:C.good},methodDesc:{...typography.caption,color:C.muted},methodMeta:{fontSize:9.5,lineHeight:13,color:C.info,fontWeight:'800'},unlock:{fontSize:8.5,color:C.good,fontWeight:'900'},lock:{fontSize:8.5,color:C.warning,fontWeight:'900'},pressed:{opacity:.72}
});}

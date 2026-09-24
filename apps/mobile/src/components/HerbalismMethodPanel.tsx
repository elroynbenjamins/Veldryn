import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {HERBALISM_ESSENCE_BY_ZONE,HERBALISM_METHODS,herbalismMethod} from '../content/herbalism';
import {itemDef} from '../content/items';
import {Panel} from './Panel';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function HerbalismMethodPanel({state,onCommand}:{state:GameState;onCommand:(command:GameCommand)=>Promise<void>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),level=state.skills.find(row=>row.skillId==='herbalism')?.level??1;
 const selected=herbalismMethod(state.character?.herbalismMethodId,level),active=state.activity?.kind==='herbalism',session=active?herbalismMethod(state.activity?.herbalismMethodId??state.character?.herbalismMethodId,level):undefined;
 const essence=HERBALISM_ESSENCE_BY_ZONE[state.currentRegionId];
 return <Panel>
  <View style={s.head}><View style={s.flex}><Text style={s.eyebrow}>HERBALISM · HARVEST METHOD</Text><Text style={s.title}>{selected.name}</Text><Text style={s.copy}>{selected.description}</Text></View><Text style={s.level}>Lv {level}</Text></View>
  <View style={s.methods}>{HERBALISM_METHODS.map(method=>{
   const unlocked=level>=method.unlockLevel,chosen=method.id===selected.id;
   return <Pressable key={method.id} accessibilityRole="button" accessibilityState={{selected:chosen,disabled:!unlocked}} disabled={!unlocked||chosen} onPress={()=>void onCommand({type:'herbalism_method',args:{method:method.id}})} style={({pressed})=>[s.method,chosen&&s.methodOn,!unlocked&&s.methodLocked,pressed&&s.pressed]}>
    <View style={s.methodTop}><Text style={[s.methodName,chosen&&s.methodNameOn]}>{method.name}</Text><Text style={unlocked?s.meta:s.locked}>{unlocked?(chosen?'ACTIVE':'AVAILABLE'):'LV '+method.unlockLevel}</Text></View>
    <Text style={s.copy}>{method.id==='quick'?'-15% action time · -10% yield · -25% rare finds':method.id==='careful'?'+18% action time · +5% XP · +50% rare finds':method.id==='bountiful'?'+12% action time · +20% yield · -10% XP':'Standard pace, yield, XP and rare finds'}</Text>
   </Pressable>;
  })}</View>
  {session?<Text style={s.notice}>Current session · {session.name}{session.id!==selected.id?' · '+selected.name+' starts next session':''}</Text>:null}
  {essence?<View style={s.essence}><Text style={s.essenceLabel}>RARE FIND</Text><Text style={s.essenceName}>{itemDef(essence.itemId).name}</Text><Text style={s.meta}>{(essence.baseChance*100).toFixed(essence.baseChance<.015?1:2)}% base/action</Text></View>:null}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},head:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.good,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},copy:{...typography.caption,color:C.muted},level:{...typography.bodyStrong,color:C.good,paddingHorizontal:8,paddingVertical:4,borderWidth:1,borderColor:C.good,borderRadius:8},
 methods:{gap:6},method:{gap:3,padding:8,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},methodOn:{borderColor:C.good,backgroundColor:C.goodSurface},methodLocked:{opacity:.55},methodTop:{flexDirection:'row',alignItems:'center',gap:8},methodName:{...typography.bodyStrong,color:C.text,flex:1},methodNameOn:{color:C.good},meta:{...typography.caption,color:C.muted,fontWeight:'800'},locked:{...typography.caption,color:C.warning,fontWeight:'900'},pressed:{opacity:.74},notice:{...typography.caption,color:C.info,padding:7,borderWidth:1,borderColor:C.info,borderRadius:8,backgroundColor:C.infoSurface},
 essence:{gap:3,paddingTop:7,borderTopWidth:1,borderTopColor:C.line},essenceLabel:{fontSize:8,color:C.special,fontWeight:'900',letterSpacing:.7},essenceName:{...typography.caption,color:C.text,fontWeight:'900'}
});}

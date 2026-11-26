import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {equipmentDisposalExplanation} from '../core/equipment-disposal-guidance';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

/** Shared action status for Inventory previews, unique copies and Gear details.
 * Displays the precise reason instead of leaving a disabled button unexplained. */
export function EquipmentDisposalStatus({sellAllowed,salvageAllowed,sellReason,salvageReason,compact=false}:{
 sellAllowed:boolean;salvageAllowed:boolean;sellReason?:string;salvageReason?:string;compact?:boolean;
}){
 const {gl}=useGameplayText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const blocked=[!sellAllowed?sellReason:undefined,!salvageAllowed?salvageReason:undefined]
   .filter((reason):reason is string=>Boolean(reason));
 const reasons=[...new Set(blocked)];
 // Compact item sheets already have Sell/Salvage buttons. Avoid repeating
 // two status boxes and a lengthy generic warning beside those controls.
 if(compact)return reasons.length?<View style={s.compactContainer} accessibilityRole="summary">
  {reasons.map(reason=><Text key={reason} style={s.compactReason}>{gl(equipmentDisposalExplanation(reason).title)} · {gl(reason)}</Text>)}
 </View>:null;
 return <View style={s.container} accessibilityRole="summary">
  <Text style={s.heading}>{gl('ITEM ACTIONS')}</Text>
  <View style={s.statuses}>
   <View style={s.status}><Text style={s.label}>{gl('SELL')}</Text><Text style={[s.value,{color:sellAllowed?C.good:C.warning}]}>{gl(sellAllowed?'READY':'PROTECTED')}</Text></View>
   <View style={s.status}><Text style={s.label}>{gl('SALVAGE')}</Text><Text style={[s.value,{color:salvageAllowed?C.good:C.warning}]}>{gl(salvageAllowed?'READY':'PROTECTED')}</Text></View>
  </View>
  {reasons.map(reason=>{
   const info=equipmentDisposalExplanation(reason);
   return <View key={reason} style={s.reason}>
    <Text style={s.reasonTitle}>{gl(info.title)} · {gl(reason)}</Text>
    <Text style={s.reasonNext}>{gl(info.nextStep)}</Text>
   </View>;
  })}
  {!reasons.length?<Text style={s.readyNote}>{gl('This copy can be sold or salvaged. Installed gems and upgrades will be permanently lost.')}</Text>:null}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 container:{gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2},
 compactContainer:{paddingHorizontal:8,paddingVertical:6,borderLeftWidth:2,borderLeftColor:C.warning,backgroundColor:C.warningSurface,borderRadius:6},
 compactReason:{...typography.caption,color:C.warning,lineHeight:17},
 heading:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.65},
 statuses:{flexDirection:'row',gap:8},
 status:{flex:1,minWidth:0,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:5,padding:7,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},
 label:{...typography.caption,color:C.muted,fontWeight:'800',fontSize:10},
 value:{...typography.caption,fontWeight:'900',fontSize:10},
 reason:{borderTopWidth:1,borderTopColor:C.line,paddingTop:7,gap:4},
 reasonTitle:{...typography.caption,color:C.warning,fontWeight:'800'},
 reasonNext:{...typography.caption,color:C.text,lineHeight:18},
 readyNote:{...typography.caption,color:C.muted,lineHeight:16},
});}

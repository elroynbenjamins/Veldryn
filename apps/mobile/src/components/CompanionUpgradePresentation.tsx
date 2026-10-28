import {useState,type PropsWithChildren} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTranslator} from '../i18n/companions';
import {UiIcon} from './UiIcon';
import type {UiIconName} from '../theme/ui-icons';

export function CompanionFacility({title,description,level,maxLevel,ready,icon='home',compact=false,children}:PropsWithChildren<{title:string;description:string;level:number;maxLevel:number;ready:boolean;icon?:UiIconName;compact?:boolean}>){
 const C=useGameTheme(),t=companionTranslator(useGameLanguage());
 const [expanded,setExpanded]=useState(false);
 const levelLabel=t('Level {value0} / {value1}',{value0:level,value1:maxLevel});
 const statusLabel=t(level>=maxLevel?'Maximum level':ready?'Upgrade ready':'Materials required');
 if(compact)return <View style={[s.compactCard,{borderColor:expanded&&ready?C.accent:C.line,backgroundColor:C.panel}]}>
  <Pressable accessibilityRole="button" accessibilityLabel={title+' · '+levelLabel+' · '+statusLabel} accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={s.compactToggle}>
   <View style={[s.compactEmblem,{backgroundColor:C.selection,borderColor:C.line}]}><UiIcon name={icon} size={26}/></View>
   <View style={s.flex}><Text style={[s.title,{color:C.text}]}>{title}</Text><Text style={[s.label,{color:ready?C.good:C.muted}]}>{levelLabel} · {statusLabel}</Text></View>
   <Text style={[s.expandMark,{color:C.accent}]}>{expanded?'−':'+'}</Text>
  </Pressable>
  <View style={s.compactPips}>{Array.from({length:maxLevel},(_,i)=><View key={i} style={[s.pip,{backgroundColor:i<level?C.accent:C.bg,borderColor:C.line}]}/>)}</View>
  {expanded?<View style={[s.compactDetail,{borderTopColor:C.line}]}><Text style={[s.copy,{color:C.muted}]}>{description}</Text>{children}</View>:null}
 </View>;
 return <View style={[s.card,{borderColor:ready?C.accent:C.line,backgroundColor:C.panel}]}>
  <View style={s.row}><View style={[s.emblem,{backgroundColor:C.selection,borderColor:C.line}]}><UiIcon name={icon} size={32}/></View><View style={s.flex}><Text style={[s.title,{color:C.text}]}>{title}</Text><Text style={[s.label,{color:ready?C.good:C.muted}]}>{t('Level {value0} / {value1}',{value0:level,value1:maxLevel})} · {t(level>=maxLevel?'Maximum level':ready?'Upgrade ready':'Materials required')}</Text></View></View>
  <View style={s.pips}>{Array.from({length:maxLevel},(_,i)=><View key={i} style={[s.pip,{backgroundColor:i<level?C.accent:C.bg,borderColor:C.line}]}/>)}</View>
  <Text style={[s.copy,{color:C.muted}]}>{description}</Text>{children}
 </View>;
}

export function CompanionCostBreakdown({rows}:{rows:Array<{label:string;owned:number;required:number}>}){
 const C=useGameTheme(),language=useGameLanguage(),t=companionTranslator(language);
 return <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel2}]}><Text style={[s.label,{color:C.muted}]}>{t('UPGRADE COST · OWNED / REQUIRED')}</Text>{rows.filter(row=>row.required>0).map(row=><View key={row.label} style={s.row}><Text style={[s.copy,s.flex,{color:C.text}]}>{row.label}</Text><Text style={[s.cost,{color:row.owned>=row.required?C.good:C.warning}]}>{row.owned>=row.required?'✓':'○'} {row.owned.toLocaleString(language)} / {row.required.toLocaleString(language)}</Text></View>)}</View>;
}

export function CompanionBondMilestone({level,claimed,ready,reward,children}:PropsWithChildren<{level:number;claimed:boolean;ready:boolean;reward:string}>){
 const C=useGameTheme(),t=companionTranslator(useGameLanguage()),tone=claimed?C.good:ready?C.accent:C.muted;
 return <View style={[s.milestone,{borderColor:ready?C.accent:C.line,backgroundColor:ready?C.selection:C.panel}]}><View style={[s.marker,{borderColor:tone,backgroundColor:C.bg}]}><Text style={[s.markerText,{color:tone}]}>{claimed?'✓':level}</Text></View><View style={s.flex}><Text style={[s.title,{color:C.text}]}>{t('Bond {value0}',{value0:level})}</Text><Text style={[s.copy,{color:C.muted}]}>{reward}</Text><Text style={[s.label,{color:tone}]}>{t(claimed?'Claimed':ready?'Reward ready':'Locked')}</Text>{!claimed&&children}</View></View>;
}
const s=StyleSheet.create({compactCard:{padding:11,borderWidth:1,borderRadius:12,gap:9},compactToggle:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10},compactEmblem:{width:42,height:42,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},compactPips:{flexDirection:'row',gap:4},compactDetail:{paddingTop:10,borderTopWidth:1,gap:10},expandMark:{fontSize:22,fontWeight:'800',minWidth:20,textAlign:'center'},card:{padding:16,borderWidth:1,borderRadius:16,gap:12},row:{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},flex:{flex:1,minWidth:0,gap:6},emblem:{width:58,height:58,borderWidth:1,borderRadius:16,alignItems:'center',justifyContent:'center'},title:{fontSize:16,lineHeight:22,fontWeight:'700'},label:{fontSize:11,lineHeight:17,fontWeight:'700'},copy:{fontSize:13,lineHeight:20},pips:{flexDirection:'row',gap:5},pip:{height:6,flex:1,borderRadius:3,borderWidth:1},cost:{fontSize:13,fontWeight:'700'},milestone:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:14,borderWidth:1,borderRadius:14},marker:{width:42,height:42,borderRadius:21,borderWidth:2,alignItems:'center',justifyContent:'center'},markerText:{fontSize:18,fontWeight:'800'}});

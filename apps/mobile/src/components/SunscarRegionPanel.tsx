import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {SunscarZoneSummaryV20} from '../core/live-dungeon-sunscar-v20';
export function SunscarRegionPanel({zones,onZone}:{zones:readonly SunscarZoneSummaryV20[];onZone?:(id:string)=>void}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 const firstLocked=zones.findIndex(zone=>zone.locked);
 const visible=firstLocked<0?zones:zones.slice(0,Math.max(1,firstLocked+1));
 const hiddenCount=zones.length-visible.length;
 return <View style={s.wrap}>
  <View style={s.header}><View style={{flex:1}}><Text style={s.eyebrow}>{t("REGION II · LEVEL 25–45")}</Text><Text style={s.title}>Sunscar Areas</Text></View><Text style={s.headerCount}>{visible.length}/{zones.length}</Text></View>
  {visible.map(z=><Pressable disabled={z.locked||!onZone} onPress={()=>onZone?.(z.id)} key={z.id} style={[s.zone,z.locked&&s.locked]}>
   <View style={{flex:1}}><Text style={s.zoneTitle}>{z.name}</Text><Text style={s.level}>{z.levelRange}</Text><Text numberOfLines={1} style={s.identity}>{z.identity}</Text><Text numberOfLines={1} style={s.activities}>{z.activities.slice(0,2).join(' · ')}</Text></View>
   <Text style={s.arrow}>{z.locked?t("LOCKED"):onZone?'›':''}</Text>
  </Pressable>)}
  {hiddenCount>0?<Text style={s.more}>{hiddenCount} more {hiddenCount===1?'area':'areas'} unlock as you progress.</Text>:null}
 </View>;
}
const s=StyleSheet.create({
 wrap:{padding:11,gap:7,borderWidth:1,borderRadius:11,borderColor:'#65513b',backgroundColor:'#141719'},
 header:{flexDirection:'row',alignItems:'center',gap:10,paddingBottom:4},
 eyebrow:{fontSize:9,fontWeight:'900',color:'#d1a05a',letterSpacing:.7},
 title:{fontSize:18,fontWeight:'900',color:'#f0d397',marginTop:3},
 headerCount:{fontSize:11,fontWeight:'900',color:'#ba9b6d'},
 zone:{flexDirection:'row',alignItems:'center',padding:10,borderRadius:9,borderWidth:1,borderColor:'#65513b',backgroundColor:'#1a1c1c'},
 locked:{opacity:.5},
 zoneTitle:{fontSize:14,fontWeight:'900',color:'#f0ddba'},
 level:{fontSize:9,fontWeight:'900',color:'#cf9e58',marginTop:1},
 identity:{fontSize:10,lineHeight:14,color:'#aeb0a7',marginTop:3},
 activities:{fontSize:9,color:'#8b9a9e',marginTop:4},
 arrow:{fontSize:13,fontWeight:'900',color:'#d0a05c'},
 more:{fontSize:10,lineHeight:15,color:'#aeb0a7',paddingTop:2}
});

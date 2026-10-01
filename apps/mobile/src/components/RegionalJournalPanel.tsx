import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {RegionProgressV21} from '../core/region-content-v21';
import {completionPercentV21,nextRegionalGoalV21} from '../core/region-content-v21';
export function RegionalJournalPanel({name,progress}:{name:string;progress:RegionProgressV21}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
const rows=[[t("Story"),progress.storyCompleted,progress.storyTotal],[t("Side quests"),progress.sideQuestsCompleted,progress.sideQuestsTotal],['Echoes',progress.echoesCompleted,progress.echoesTotal],[t("Co-op"),progress.dungeonsCompleted,progress.dungeonsTotal],[t("Collection"),progress.collectionEntries,progress.collectionTotal],[t("Boss mastery"),progress.bossMasteryTier,progress.bossMasteryMax]] as const;return <View style={s.wrap}><Text style={s.title}>{name}  {t("Journal ·")} {completionPercentV21(progress)}%</Text><Text style={s.goal}>{nextRegionalGoalV21(progress)}</Text>{rows.map(([label,value,total])=><View key={label} style={s.row}><Text style={s.label}>{label}</Text><Text style={s.value}>{value} / {total}</Text></View>)}</View>}
const s=StyleSheet.create({wrap:{padding:12,borderRadius:10,borderWidth:1,borderColor:'#46515b',backgroundColor:'#171b20'},title:{fontSize:15,fontWeight:'900',color:'#edf3f7'},goal:{fontSize:9,color:'#9dacb8',marginTop:3,marginBottom:8},row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:6,borderTopWidth:1,borderTopColor:'#282f35'},label:{fontSize:10,color:'#b9c4cb'},value:{fontSize:10,fontWeight:'900',color:'#e5edf2'}});

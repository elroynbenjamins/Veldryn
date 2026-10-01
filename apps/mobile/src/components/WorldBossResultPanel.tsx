import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {formatCompact} from '../core/shared-world-v19';
export function WorldBossResultPanel({impact,appliedDamage,breakdown,echoOnly=false}:{impact:number;appliedDamage:number;breakdown:{direct:number;mitigation:number;healing:number;utility:number;survival:number};echoOnly?:boolean}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

 return <View style={s.wrap}><Text style={s.eyebrow}>{echoOnly?t("ECHO ENCOUNTER COMPLETE"):t("WORLD BOSS ATTEMPT COMPLETE")}</Text><Text style={s.impact}>{formatCompact(impact)}  {t("Raid Impact")}</Text><Text style={s.damage}>{echoOnly?t("Participation recorded"):t("{count} shared HP damage applied",{count:formatCompact(appliedDamage)})}</Text><View style={s.grid}>{Object.entries(breakdown).map(([k,v])=><View key={k} style={s.stat}><Text style={s.label}>{p(k.toUpperCase())}</Text><Text style={s.value}>{formatCompact(v)}</Text></View>)}</View><Text style={s.note}>{t("Raid Impact is role-aware. Tank mitigation and Support healing/utility can contribute alongside direct damage.")}</Text></View>
}
const s=StyleSheet.create({wrap:{backgroundColor:'#101923',borderWidth:1,borderColor:'#3d4f5e',borderRadius:10,padding:12,gap:6},eyebrow:{color:'#9dafbb',fontSize:9,fontWeight:'900',letterSpacing:.7},impact:{color:'#efd68b',fontSize:21,fontWeight:'900'},damage:{color:'#d8e1e5',fontSize:11},grid:{flexDirection:'row',gap:5,flexWrap:'wrap'},stat:{minWidth:'30%',flexGrow:1,backgroundColor:'#16242e',borderRadius:7,padding:7},label:{color:'#7f95a3',fontSize:7,fontWeight:'900'},value:{color:'#edf1f3',fontSize:12,fontWeight:'900'},note:{color:'#90a5b2',fontSize:10,lineHeight:14,marginTop:3}});

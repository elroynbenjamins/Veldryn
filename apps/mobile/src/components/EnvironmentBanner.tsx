import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionEnvironmentText,type ProgressionKey} from '../i18n/progression';
import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {ActivityKind} from '../core/types';
import {environmentSummary,WorldEnvironment} from '../core/world-weather';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EnvironmentArtwork} from './EnvironmentArtwork';

function remaining(changesAtMs:number,nowMs:number,t:(key:ProgressionKey,params?:Record<string,string|number>)=>string){
  const minutes=Math.max(0,Math.ceil((changesAtMs-nowMs)/60000));
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return hours?t("{hours}h {minutes}m",{hours,minutes:rest}):t("{minutes}m",{minutes:rest});
}
export function EnvironmentBanner({environment,kind,nowMs=Date.now(),compact=false,locked=false}:{environment:WorldEnvironment;kind?:ActivityKind;nowMs?:number;compact?:boolean;locked?:boolean}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  return <View style={[s.root,{borderColor:environment.weatherColor},compact&&s.compact]}>
    <View style={s.symbols}><EnvironmentArtwork type="season" id={environment.seasonId} size={compact?28:34}/><EnvironmentArtwork type="weather" id={environment.weatherId} size={compact?30:38}/></View>
    <View style={s.flex}><Text style={s.title}>{progressionEnvironmentText(language,environment.seasonName)} · {progressionEnvironmentText(language,environment.weatherName)}</Text><Text style={s.detail}>{environment.zoneName}{kind?` · ${progressionEnvironmentText(language,environmentSummary(kind,environment))}`:''}</Text>{!compact&&<Text style={s.timer}>{locked?t("Weather locked until this activity ends"):t("Regional weather changes in {time}",{time:remaining(environment.changesAtMs,nowMs,t)})}</Text>}</View>
  </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderRadius:radii.lg,padding:10},compact:{padding:spacing.sm},symbols:{flexDirection:'row',gap:spacing.xs},flex:{flex:1},title:{...typography.bodyStrong,color:C.text},detail:{...typography.caption,color:C.info},timer:{...typography.caption,color:C.muted}});}

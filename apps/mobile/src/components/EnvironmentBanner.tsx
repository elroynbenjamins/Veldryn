import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {ActivityKind} from '../core/types';
import {environmentSummary,WorldEnvironment} from '../core/world-weather';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EnvironmentArtwork} from './EnvironmentArtwork';

function remaining(changesAtMs:number,nowMs:number){
  const minutes=Math.max(0,Math.ceil((changesAtMs-nowMs)/60000));
  const hours=Math.floor(minutes/60),rest=minutes%60;
  return hours?`${hours}h ${rest}m`:`${rest}m`;
}
export function EnvironmentBanner({environment,kind,nowMs=Date.now(),compact=false,locked=false}:{environment:WorldEnvironment;kind?:ActivityKind;nowMs?:number;compact?:boolean;locked?:boolean}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  return <View style={[s.root,{borderColor:environment.weatherColor},compact&&s.compact]}>
    <View style={s.symbols}><EnvironmentArtwork type="season" id={environment.seasonId} size={compact?28:34}/><EnvironmentArtwork type="weather" id={environment.weatherId} size={compact?30:38}/></View>
    <View style={s.flex}><Text style={s.title}>{environment.seasonName} · {environment.weatherName}</Text><Text style={s.detail}>{environment.zoneName}{kind?` · ${environmentSummary(kind,environment)}`:''}</Text>{!compact&&<Text style={s.timer}>{locked?'Weather locked until this activity ends':`Regional weather changes in ${remaining(environment.changesAtMs,nowMs)}`}</Text>}</View>
  </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{flexDirection:'row',alignItems:'center',gap:spacing.md,backgroundColor:C.panel,borderWidth:1,borderRadius:radii.lg,padding:10},compact:{padding:spacing.sm},symbols:{flexDirection:'row',gap:spacing.xs},flex:{flex:1},title:{...typography.bodyStrong,color:C.text},detail:{...typography.caption,color:C.info},timer:{...typography.caption,color:C.muted}});}

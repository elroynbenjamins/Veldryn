import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {SunscarZoneSummaryV20} from '../core/live-dungeon-sunscar-v20';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

export function SunscarRegionPanel({zones,onZone}:{zones:readonly SunscarZoneSummaryV20[];onZone?:(id:string)=>void}){
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const firstLocked=zones.findIndex(zone=>zone.locked);
  const visible=firstLocked<0?zones:zones.slice(0,Math.max(1,firstLocked+1));
  const hiddenCount=zones.length-visible.length;
  const available=zones.filter(zone=>!zone.locked).length;
  return <View style={s.wrap}>
    <View style={s.header}>
      <View style={s.flex}><Text style={s.eyebrow}>{t('REGION II · LEVEL 26–45')}</Text><Text style={s.title}>{t('Sunscar Areas')}</Text></View>
      <Text style={s.headerCount}>{available}/{zones.length}</Text>
    </View>
    {visible.map(zone=><Pressable accessibilityRole="button" accessibilityState={{disabled:zone.locked}} disabled={zone.locked||!onZone} onPress={()=>onZone?.(zone.id)} key={zone.id} style={[s.zone,zone.locked&&s.locked]}>
      <View style={s.flex}>
        <View style={s.zoneHead}><Text style={s.zoneTitle}>{zone.name}</Text><Text style={s.level}>{zone.levelRange}</Text></View>
        <Text numberOfLines={2} style={s.identity}>{zone.identity}</Text>
        <Text numberOfLines={1} style={s.activities}>{zone.activities.slice(0,2).join(' · ')}</Text>
      </View>
      <Text style={s.arrow}>{zone.locked?t('LOCKED'):onZone?'›':''}</Text>
    </Pressable>)}
    {hiddenCount>0?<Text style={s.more}>{t('{count} more areas unlock as you progress.',{count:hiddenCount})}</Text>:null}
  </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
  wrap:{padding:12,gap:9,borderWidth:1,borderRadius:12,borderColor:C.line,backgroundColor:C.panel},
  header:{flexDirection:'row',alignItems:'center',gap:10,paddingBottom:4},flex:{flex:1,minWidth:0},
  eyebrow:{fontSize:9,fontWeight:'800',color:C.accent,letterSpacing:.7},
  title:{fontSize:18,fontWeight:'800',color:C.text,marginTop:2},
  headerCount:{fontSize:12,fontWeight:'800',color:C.info,fontVariant:['tabular-nums']},
  zone:{minHeight:70,flexDirection:'row',alignItems:'center',gap:8,padding:11,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
  locked:{opacity:.55},zoneHead:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},
  zoneTitle:{fontSize:14,fontWeight:'800',color:C.text},level:{fontSize:10,fontWeight:'700',color:C.info},
  identity:{fontSize:11,lineHeight:16,color:C.muted,marginTop:3},
  activities:{fontSize:10,lineHeight:14,color:C.muted,marginTop:4},
  arrow:{fontSize:12,fontWeight:'900',color:C.accent},
  more:{fontSize:11,lineHeight:16,color:C.muted,paddingTop:2},
});}

import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {SunscarZoneSummaryV20} from '../core/live-dungeon-sunscar-v20';
import {regionalAreaActivityCounts} from '../core/region-area-activities';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** Four real regional lanes. Both actions filter the same shared content data. */
export function SunscarRegionPanel({zones,onZone,onGather}:{zones:readonly SunscarZoneSummaryV20[];onZone?:(id:string)=>void;onGather?:(id:string)=>void}){
  const language=useGameLanguage();
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const available=zones.filter(zone=>!zone.locked).length;
  return <View style={s.wrap}>
    <View style={s.header}>
      <View style={s.flex}><Text style={s.eyebrow}>{t('REGION II · LEVEL 26–45')}</Text><Text style={s.title}>{t('Sunscar Areas')}</Text></View>
      <Text style={s.headerCount}>{available}/{zones.length}</Text>
    </View>
    {zones.map(zone=>{
      const counts=regionalAreaActivityCounts('SUNSCAR',zone.id);
      return <View key={zone.id} style={[s.zone,zone.locked&&s.locked]}>
        <Pressable accessibilityRole="button" accessibilityLabel={p(zone.name)+' · '+t('Combat')} accessibilityState={{disabled:zone.locked}}
          disabled={zone.locked||!onZone} onPress={()=>onZone?.(zone.id)} style={s.mainAction}>
          <View style={s.zoneHead}><Text style={s.zoneTitle}>{p(zone.name)}</Text><Text style={s.level}>{zone.levelRange}</Text></View>
          <Text numberOfLines={2} style={s.identity}>{p(zone.identity)}</Text>
          <Text style={s.activities}>{counts.enemies} {p('enemies')} · {counts.gathering} {p('gathering')}</Text>
        </Pressable>
        {zone.locked?<Text style={s.lockedText}>{t('LOCKED')}</Text>:<View style={s.buttons}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Combat')+' · '+p(zone.name)} onPress={()=>onZone?.(zone.id)}
            style={s.button}><Text style={s.buttonText}>{t('Combat')}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={p('Gathering')+' · '+p(zone.name)} onPress={()=>onGather?.(zone.id)}
            style={[s.button,s.gatherButton]}><Text style={s.buttonText}>{p('Gather')}</Text></Pressable>
        </View>}
      </View>;
    })}
  </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
  wrap:{padding:12,gap:8,borderWidth:1,borderRadius:12,borderColor:C.line,backgroundColor:C.panel},
  header:{flexDirection:'row',alignItems:'center',gap:10,paddingBottom:4},flex:{flex:1,minWidth:0},
  eyebrow:{fontSize:9,fontWeight:'800',color:C.accent,letterSpacing:.7},
  title:{fontSize:18,fontWeight:'800',color:C.text,marginTop:2},
  headerCount:{fontSize:12,fontWeight:'800',color:C.info,fontVariant:['tabular-nums']},
  zone:{padding:10,gap:8,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
  locked:{opacity:.58},zoneHead:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},
  mainAction:{minHeight:53,justifyContent:'center'},
  zoneTitle:{fontSize:14,fontWeight:'800',color:C.text},level:{fontSize:10,fontWeight:'700',color:C.info},
  identity:{fontSize:11,lineHeight:16,color:C.muted,marginTop:3},
  activities:{fontSize:10,lineHeight:14,color:C.muted,marginTop:4},
  buttons:{flexDirection:'row',gap:8},
  button:{flex:1,minHeight:36,alignItems:'center',justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel},
  gatherButton:{borderColor:C.info},
  buttonText:{fontSize:11,fontWeight:'800',color:C.text},
  lockedText:{fontSize:10,fontWeight:'900',color:C.muted,alignSelf:'flex-end'}
});}

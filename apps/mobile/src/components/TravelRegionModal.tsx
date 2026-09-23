import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {worldZoneInDevelopment,type WorldZoneDef} from '../content/world-map';
import {regionActivitySummary} from '../core/world-navigation';
import {environmentForZone} from '../core/world-weather';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';

export function TravelRegionModal({visible,state,zone,onClose,onTravel}:{visible:boolean;state:GameState;zone?:WorldZoneDef;onClose:()=>void;onTravel:(regionId:string)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  if(!zone)return null;
  const summary=regionActivitySummary(state,zone.id),environment=environmentForZone(zone.id);
  const inDevelopment=worldZoneInDevelopment(zone),unlocked=!inDevelopment&&(state.character?.level??1)>=zone.minLevel;
  const combat=`${summary.combatReady}/${summary.combatTotal} hunts`;
  const gathering=`${summary.gatheringReady}/${summary.gatheringTotal} gather`;
  const bosses=summary.bossesTotal?`${summary.bossesReady}/${summary.bossesTotal} bosses`:undefined;
  return <GameModalSurface visible={visible} presentation="sheet" onClose={onClose} backdropLabel="Close travel destination">
    <GameModalHeader eyebrow={inDevelopment?"REGION PREVIEW":unlocked?"TRAVEL DESTINATION":"LOCKED REGION PREVIEW"} title={zone.name} onClose={onClose}/>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={[s.hero,{borderColor:zone.accent}]}>
        <ZoneSceneArtwork regionId={zone.id} muted={inDevelopment} blurRadius={2}/>
        <View style={s.heroFade}/>
        <View style={s.heroCopy}>
          <View style={s.heroStatusRow}><Text style={s.level}>LEVELS {zone.minLevel}–{zone.maxLevel}</Text><Text style={[s.statusBadge,inDevelopment?s.developmentBadge:unlocked?s.availableBadge:s.lockedBadge]}>{inDevelopment?"IN DEVELOPMENT":unlocked?"AVAILABLE":`LOCKED · LV ${zone.minLevel}`}</Text></View>
          <Text style={s.heroTitle}>{zone.name}</Text>
          <Text style={s.heroSub}>{zone.subtitle}</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaCard}><Text style={s.metaLabel}>{inDevelopment?'STATUS':'CONDITIONS'}</Text><Text style={s.metaValue}>{inDevelopment?'Preview only':`${environment.weatherSymbol} ${environment.weatherName}`}</Text></View>
        <View style={s.metaCard}><Text style={s.metaLabel}>CONTENT</Text><Text style={s.metaValue}>{inDevelopment?'Planned content':([combat,gathering,bosses].filter(Boolean).join(' · ')||'Region activities')}</Text></View>
      </View>

      {inDevelopment?<View style={[s.info,s.developmentInfo]}><Text style={[s.infoLabel,s.developmentInfoLabel]}>IN DEVELOPMENT</Text><Text style={s.infoValue}>{zone.developmentNote??'This region is planned but is not yet available for travel.'}</Text></View>:summary.gatheringSkills.length?<View style={s.info}><Text style={s.infoLabel}>GATHERING</Text><Text style={s.infoValue}>{summary.gatheringSkills.join(' · ')}</Text></View>:null}
      <Text style={s.hint}>{inDevelopment?'You can preview this region now. Travel will unlock when the region is released.':unlocked?`Travelling changes your active region immediately. Travel is instant; hunts, gathering nodes and regional activities switch to ${zone.name}.`:`You can preview ${zone.name} now. Travel unlocks at level ${zone.minLevel}.`}</Text>
    </ScrollView>
    <View style={s.actions}><View style={s.flex}><GameButton title={unlocked?"Cancel":"Close"} tone="secondary" onPress={onClose}/></View><View style={s.flex}><GameButton title={inDevelopment?"In Development":unlocked?"Travel":"Locked"} disabled={!unlocked} onPress={()=>unlocked&&onTravel(zone.id)}/></View></View>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  content:{gap:spacing.sm,paddingBottom:spacing.sm},
  hero:{height:184,overflow:'hidden',justifyContent:'flex-end',borderWidth:1,borderRadius:radii.lg,backgroundColor:C.panel},
  heroFade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(4,10,18,.50)':'rgba(255,255,255,.54)'},
  heroCopy:{gap:3,padding:spacing.md,paddingTop:58},heroStatusRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},statusBadge:{fontSize:8.5,fontWeight:'900',letterSpacing:.7,paddingHorizontal:7,paddingVertical:4,borderRadius:99,overflow:'hidden'},availableBadge:{color:C.good,backgroundColor:C.goodSurface},lockedBadge:{color:C.muted,backgroundColor:C.panel2},developmentBadge:{color:C.warning,backgroundColor:C.warningSurface},
  level:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
  heroTitle:{...typography.hero,color:C.text,fontSize:27},
  heroSub:{...typography.body,color:C.text,maxWidth:520},
  metaRow:{flexDirection:'row',gap:spacing.sm},
  metaCard:{flex:1,minWidth:0,gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},
  metaLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},
  metaValue:{...typography.caption,color:C.text,fontWeight:'800'},
  info:{gap:3,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},developmentInfo:{borderLeftColor:C.warning,backgroundColor:C.warningSurface},developmentInfoLabel:{color:C.warning},
  infoLabel:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.7},
  infoValue:{...typography.bodyStrong,color:C.text},
  hint:{...typography.caption,color:C.muted,lineHeight:18},
  actions:{flexDirection:'row',gap:spacing.sm,paddingTop:spacing.xs,paddingBottom:spacing.sm,flexShrink:0},
  flex:{flex:1,minWidth:0},
});}

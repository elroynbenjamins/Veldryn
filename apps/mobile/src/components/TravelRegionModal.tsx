import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {WorldZoneDef} from '../content/world-map';
import {regionActivitySummary,regionTravelAvailability,regionTravelPreview} from '../core/world-navigation';
import {environmentForZone} from '../core/world-weather';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';
import {ItemArtwork} from './ItemArtwork';

export function TravelRegionModal({visible,state,zone,onClose,onTravel}:{visible:boolean;state:GameState;zone?:WorldZoneDef;onClose:()=>void;onTravel:(regionId:string)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  if(!zone)return null;
  const summary=regionActivitySummary(state,zone.id),environment=environmentForZone(zone.id),availability=regionTravelAvailability(state,zone),preview=regionTravelPreview(state,zone.id);
  const development=availability==='inDevelopment',locked=availability==='locked',available=availability==='available';
  const combat=`${summary.combatReady}/${summary.combatTotal} hunts`;
  const gathering=`${summary.gatheringReady}/${summary.gatheringTotal} gather`;
  const bosses=summary.bossesTotal?`${summary.bossesReady}/${summary.bossesTotal} bosses`:undefined;
  return <GameModalSurface visible={visible} presentation="sheet" onClose={onClose} backdropLabel="Close travel destination">
    <GameModalHeader eyebrow="TRAVEL DESTINATION" title={zone.name} onClose={onClose}/>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={[s.hero,{borderColor:zone.accent}]}>
        <ZoneSceneArtwork regionId={zone.id} blurRadius={1} muted={development}/>
        <View style={s.heroFade}/>
        <View style={s.heroCopy}>
          <Text style={s.level}>{development?'IN DEVELOPMENT':locked?`UNLOCKS AT LEVEL ${zone.minLevel}`:`LEVELS ${zone.minLevel}–${zone.maxLevel}`}</Text>
          <Text style={s.heroTitle}>{zone.name}</Text>
          <Text style={s.heroSub}>{zone.subtitle}</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaCard}><Text style={s.metaLabel}>CONDITIONS</Text><Text style={s.metaValue}>{environment.weatherSymbol} {environment.weatherName}</Text></View>
        <View style={s.metaCard}><Text style={s.metaLabel}>CONTENT</Text><Text style={s.metaValue}>{[combat,gathering,bosses].filter(Boolean).join(' · ')}</Text></View>
      </View>

      {development?<View style={s.developmentNotice}><Text style={s.developmentTitle}>IN DEVELOPMENT</Text><Text style={s.hint}>{zone.developmentNote??'This region is planned but not yet available. You can preview its identity here, but travel remains disabled until the content is released.'}</Text></View>:locked?<View style={s.lockNotice}><Text style={s.lockTitle}>LOCKED</Text><Text style={s.hint}>Reach level {zone.minLevel} to travel here. You can still preview the region, enemies and notable drops.</Text></View>:null}

      <View style={s.previewGrid}>
        <View style={s.previewCard}><Text style={s.previewLabel}>ACTIVITIES</Text><Text style={s.previewValue}>{preview.activities.slice(0,4).join(' · ')||'Regional content'}</Text></View>
        <View style={s.previewCard}><Text style={s.previewLabel}>COMMON ENEMIES</Text><Text style={s.previewValue}>{preview.enemies.map(enemy=>enemy.name).join(' · ')||'To be revealed'}</Text></View>
      </View>

      {preview.drops.length?<View style={s.dropBlock}><Text style={s.previewLabel}>NOTABLE DROPS</Text><View style={s.dropRow}>{preview.drops.slice(0,6).map(drop=><View key={drop.itemId} style={s.dropItem}><ItemArtwork itemId={drop.itemId} size={34}/><Text numberOfLines={1} style={s.dropName}>{drop.name}</Text></View>)}</View></View>:null}
      {summary.gatheringSkills.length?<View style={s.info}><Text style={s.infoLabel}>GATHERING</Text><Text style={s.infoValue}>{summary.gatheringSkills.join(' · ')}</Text></View>:null}
      <Text style={s.hint}>{available?`Travel is instant. Your active region, hunts, gathering nodes and regional activities update to ${zone.name} immediately.`:development?'Preview only — this destination cannot be entered yet.':`Preview only until level ${zone.minLevel}.`}</Text>
    </ScrollView>
    <View style={s.actions}><View style={s.flex}><GameButton title={available?"Cancel":"Close"} tone="secondary" onPress={onClose}/></View><View style={s.flex}><GameButton title={development?"In Development":locked?"Locked":"Travel"} disabled={!available} onPress={()=>available&&onTravel(zone.id)}/></View></View>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  content:{gap:spacing.sm,paddingBottom:spacing.sm},
  hero:{height:184,overflow:'hidden',justifyContent:'flex-end',borderWidth:1,borderRadius:radii.lg,backgroundColor:C.panel},
  heroFade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(4,10,18,.50)':'rgba(255,255,255,.54)'},
  heroCopy:{gap:3,padding:spacing.md,paddingTop:58},
  level:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
  heroTitle:{...typography.hero,color:C.text,fontSize:27},
  heroSub:{...typography.body,color:C.text,maxWidth:520},
  metaRow:{flexDirection:'row',gap:spacing.sm},
  metaCard:{flex:1,minWidth:0,gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},
  metaLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},
  metaValue:{...typography.caption,color:C.text,fontWeight:'800'},
  info:{gap:3,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},developmentNotice:{gap:4,padding:spacing.sm,borderWidth:1,borderStyle:'dashed',borderColor:C.muted,borderRadius:radii.md,backgroundColor:C.panel2},developmentTitle:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},lockNotice:{gap:4,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.warning,backgroundColor:C.warningSurface},lockTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},previewGrid:{flexDirection:'row',gap:spacing.sm},previewCard:{flex:1,minWidth:0,gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},previewLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},previewValue:{...typography.caption,color:C.text,lineHeight:17},dropBlock:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},dropRow:{flexDirection:'row',flexWrap:'wrap',gap:6},dropItem:{width:74,alignItems:'center',gap:3},dropName:{...typography.caption,color:C.text,textAlign:'center',maxWidth:72},
  infoLabel:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.7},
  infoValue:{...typography.bodyStrong,color:C.text},
  hint:{...typography.caption,color:C.muted,lineHeight:18},
  actions:{flexDirection:'row',gap:spacing.sm,paddingTop:spacing.xs,paddingBottom:spacing.sm,flexShrink:0},
  flex:{flex:1,minWidth:0},
});}

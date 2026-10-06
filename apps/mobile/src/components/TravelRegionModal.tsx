import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import type {WorldZoneDef} from '../content/world-map';
import {MONSTERS} from '../content/monsters';
import {regionActivitySummary,regionTravelAvailability,regionTravelPreview} from '../core/world-navigation';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';
import {ItemArtwork} from './ItemArtwork';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';

export function TravelRegionModal({visible,state,zone,onClose,onTravel}:{visible:boolean;state:GameState;zone?:WorldZoneDef;onClose:()=>void;onTravel:(regionId:string)=>void}){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackLayout=width<360||fontScale>=1.25;
  if(!zone)return null;
  const summary=regionActivitySummary(state,zone.id),availability=regionTravelAvailability(state,zone),preview=regionTravelPreview(state,zone.id);
  const inDevelopment=availability==='inDevelopment',locked=availability==='locked',unlocked=availability==='available';
  const combat=`${summary.combatReady}/${summary.combatTotal} hunts`;
  const gathering=`${summary.gatheringReady}/${summary.gatheringTotal} gather`;
  const bosses=summary.bossesTotal?`${summary.bossesReady}/${summary.bossesTotal} bosses`:undefined;
  const contentSummary=[combat,gathering,bosses].filter(Boolean).join(' · ');
  return <GameModalSurface visible={visible} presentation="sheet" reduceMotion={state.settings.reduceMotion} onClose={onClose} backdropLabel={t("Close travel destination")}>
    <GameModalHeader eyebrow={inDevelopment?t("REGION PREVIEW"):locked?t("LOCKED REGION PREVIEW"):t("TRAVEL DESTINATION")} title={zone.name} onClose={onClose}/>
    <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content} showsHorizontalScrollIndicator={false}>
      <View style={[s.hero,{borderColor:zone.accent}]}>
        <ZoneSceneArtwork regionId={zone.id} muted={inDevelopment} blurRadius={2}/>
        <View style={s.heroFade}/>
        <View style={s.heroCopy}>
          <Text style={s.level}>{inDevelopment?t("IN DEVELOPMENT"):locked?`UNLOCKS AT LEVEL ${zone.minLevel}`:`LEVELS ${zone.minLevel}–${zone.maxLevel}`}</Text>
          <Text style={s.heroTitle}>{zone.name}</Text>
          <Text style={s.heroSub}>{p(zone.subtitle)}</Text>
        </View>
      </View>

      <View style={[s.metaRow,stackLayout&&s.metaRowStack]}>
        <View style={s.metaCard}><Text style={s.metaLabel}>{inDevelopment?t("PLANNED CONTENT"):t("CONTENT")}</Text><Text style={s.metaValue}>{inDevelopment?(preview.activities.slice(0,2).join(' · ')||t("Coming later")):(contentSummary||t("Region activities"))}</Text></View>
      </View>

      {inDevelopment?<View style={s.developmentNotice}><Text style={s.developmentTitle}>{t("IN DEVELOPMENT")}</Text><Text style={s.hint}>{zone.developmentNote??t("This region is planned but not yet available. You can preview its identity here, but travel remains disabled until the content is released.")}</Text></View>:locked?<View style={s.lockNotice}><Text style={s.lockTitle}>{t("LOCKED")}</Text><Text style={s.hint}>{t("Reach level {level} to travel here. You can still preview the region, enemies and notable drops.",{level:zone.minLevel})}</Text></View>:null}

      <View style={s.previewCard}><Text style={s.previewLabel}>{inDevelopment?t("PLANNED ACTIVITIES"):t("ACTIVITIES")}</Text><Text style={s.previewValue}>{preview.activities.slice(0,4).join(' · ')||t("Regional content")}</Text></View>

      {!inDevelopment&&preview.enemies.length?<View style={s.enemyBlock}><Text style={s.previewLabel}>{t("COMMON ENEMIES")}</Text><View style={s.enemyRow}>{preview.enemies.map(entry=>{const monster=MONSTERS.find(candidate=>candidate.id===entry.id);return monster?<View key={entry.id} style={s.enemyItem}><MonsterPortraitFrame monster={monster} size={52} framed={false} reduceMotion={state.settings.reduceMotion}/><Text numberOfLines={1} style={s.enemyName}>{entry.name}</Text></View>:null;})}</View></View>:inDevelopment?<View style={s.previewCard}><Text style={s.previewLabel}>{t("PLANNED ENEMIES")}</Text><Text style={s.previewValue}>{t("Enemy roster will be revealed as the region moves closer to release.")}</Text></View>:null}

      {preview.drops.length?<View style={s.dropBlock}><Text style={s.previewLabel}>{t("NOTABLE DROPS")}</Text><View style={s.dropRow}>{preview.drops.slice(0,6).map(drop=><View key={drop.itemId} style={s.dropItem}><ItemArtwork itemId={drop.itemId} size={34}/><Text numberOfLines={1} style={s.dropName}>{drop.name}</Text></View>)}</View></View>:null}
      {!inDevelopment&&summary.gatheringSkills.length?<View style={s.info}><Text style={s.infoLabel}>{t("GATHERING")}</Text><Text style={s.infoValue}>{summary.gatheringSkills.join(' · ')}</Text></View>:null}
      <Text style={s.hint}>{unlocked?`Travel is instant. Your active region, hunts, gathering nodes and regional activities update to ${zone.name} immediately.`:inDevelopment?t("Preview only — this destination cannot be entered yet."):`Preview only until level ${zone.minLevel}.`}</Text>
    </ScrollView>
    <View style={[s.actions,stackLayout&&s.actionsStack]}><View style={[s.flex,stackLayout&&s.actionStack]}><GameButton title={unlocked?t("Cancel"):t("Close")} tone="secondary" onPress={onClose}/></View><View style={[s.flex,stackLayout&&s.actionStack]}><GameButton title={inDevelopment?t("In Development"):locked?t("Locked"):t("Travel")} disabled={!unlocked} onPress={()=>unlocked&&onTravel(zone.id)}/></View></View>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  content:{gap:spacing.sm,paddingBottom:spacing.sm},
  hero:{height:184,overflow:'hidden',justifyContent:'flex-end',borderWidth:1,borderRadius:radii.lg,backgroundColor:C.panel},
  heroFade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(4,10,18,.50)':'rgba(255,255,255,.54)'},
  heroCopy:{gap:3,padding:spacing.md,paddingTop:58},
  level:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
  heroTitle:{...typography.hero,color:C.text,fontSize:27},
  heroSub:{...typography.body,color:C.text,maxWidth:520},
  metaRow:{flexDirection:'row',gap:spacing.sm},metaRowStack:{flexDirection:'column'},
  metaCard:{flex:1,minWidth:0,gap:3,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:equipmentColors.panel},
  metaLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},
  metaValue:{...typography.caption,color:C.text,fontWeight:'800'},
  info:{gap:3,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},developmentNotice:{gap:4,padding:spacing.sm,borderWidth:1,borderStyle:'dashed',borderColor:C.muted,borderRadius:radii.md,backgroundColor:C.panel2},developmentTitle:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},lockNotice:{gap:4,padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.warning,backgroundColor:C.warningSurface},lockTitle:{...typography.caption,color:C.warning,fontWeight:'900',letterSpacing:.8},previewGrid:{flexDirection:'row',gap:spacing.sm},previewCard:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},previewLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.7},previewValue:{...typography.caption,color:C.text,lineHeight:17},enemyBlock:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},enemyRow:{flexDirection:'row',flexWrap:'wrap',gap:8},enemyItem:{width:66,alignItems:'center',gap:3},enemyName:{fontSize:9,lineHeight:11,color:C.text,textAlign:'center',maxWidth:64},dropBlock:{gap:6,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},dropRow:{flexDirection:'row',flexWrap:'wrap',gap:6},dropItem:{width:74,alignItems:'center',gap:3},dropName:{...typography.caption,color:C.text,textAlign:'center',maxWidth:72},
  infoLabel:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.7},
  infoValue:{...typography.bodyStrong,color:C.text},
  hint:{...typography.caption,color:C.muted,lineHeight:18},
  actions:{flexDirection:'row',gap:spacing.sm,paddingTop:spacing.xs,paddingBottom:spacing.sm,flexShrink:0},actionsStack:{flexDirection:'column'},
  flex:{flex:1,minWidth:0},actionStack:{flex:0,width:'100%'},
});}

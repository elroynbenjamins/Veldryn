import {useMemo,type ReactNode} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {WORLD_ZONES,type WorldZoneDef} from '../content/world-map';
import {WORLD_CHAPTER_GROUPS,worldChapterForRegionId,type WorldChapterGroup} from '../content/world-chapters';
import {regionAreas} from '../content/regional-areas';
import {regionActivitySummary,regionTravelAvailability,regionTravelLockReason} from '../core/world-navigation';
import {regionalAreaActivityCounts} from '../core/region-area-activities';
import {progressionT,progressionText,progressionTravelReason,type ProgressionKey} from '../i18n/progression';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameTheme} from '../theme/ThemeContext';
import {equipmentTheme,type ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';
import {ZoneSceneArtwork} from './ZoneSceneArtwork';
import {TutorialBeacon} from './TutorialBeacon';

type Props={
  children?:ReactNode;
  state:GameState;
  currentRegionId:string;
  goalRegionId?:string;
  onTravel:(regionId:string)=>void;
  onOpenCombat:(areaId?:string)=>void;
  onOpenSkills:(areaId?:string)=>void;
};

/** A single row inside a chapter's zone list. */
type ZoneRow={
  id:string;
  name:string;
  minLevel:number;
  maxLevel:number;
  /** When set, this zone is itself a travelable region (Chapter I's siblings). */
  region?:WorldZoneDef;
  /** When set, this zone is a combat area inside the chapter's region (Sunscar/Frostmarch). */
  areaRegionId?:string;
  areaId?:string;
};

function zonesForChapter(chapter:WorldChapterGroup):ZoneRow[]{
  if(chapter.regionIds.length>1){
    return chapter.regionIds.map(id=>{
      const region=WORLD_ZONES.find(zone=>zone.id===id)!;
      return {id:region.id,name:region.name,minLevel:region.minLevel,maxLevel:region.maxLevel,region};
    });
  }
  const region=WORLD_ZONES.find(zone=>zone.id===chapter.regionIds[0]);
  if(!region)return [];
  const areas=regionAreas(region.id);
  return areas.length?areas.map(area=>({
    id:area.id,name:area.name,minLevel:area.minLevel,maxLevel:area.maxLevel,
    areaRegionId:region.id,areaId:area.id,
  })):[{id:region.id,name:region.name,minLevel:region.minLevel,maxLevel:region.maxLevel,region}];
}
function chapterLevelRange(chapter:WorldChapterGroup){
  const rows=zonesForChapter(chapter);
  return {min:Math.min(...rows.map(row=>row.minLevel)),max:Math.max(...rows.map(row=>row.maxLevel))};
}
function chapterTravelTarget(chapter:WorldChapterGroup,state:GameState){
  const regions=chapter.regionIds.map(id=>WORLD_ZONES.find(zone=>zone.id===id)).filter((zone):zone is WorldZoneDef=>!!zone);
  return regions.find(zone=>regionTravelAvailability(state,zone)==='available')??regions[0];
}
function chapterAvailability(chapter:WorldChapterGroup,state:GameState){
  const regions=chapter.regionIds.map(id=>WORLD_ZONES.find(zone=>zone.id===id)).filter((zone):zone is WorldZoneDef=>!!zone);
  if(regions.every(zone=>regionTravelAvailability(state,zone)==='inDevelopment'))return 'inDevelopment' as const;
  return regions.some(zone=>regionTravelAvailability(state,zone)==='available')?'available' as const:'locked' as const;
}

/**
 * Chapter-level navigation. The current chapter shows its zones always expanded;
 * other chapters are one compact row each.
 */
export function WorldChapterNavigator({state,currentRegionId,goalRegionId,onTravel,onOpenCombat,onOpenSkills,children}:Props){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const level=state.character?.level??1;
  const current=WORLD_ZONES.find(zone=>zone.id===currentRegionId)??WORLD_ZONES[0];
  const currentChapter=worldChapterForRegionId(current.id)??WORLD_CHAPTER_GROUPS[0];
  const currentZones=zonesForChapter(currentChapter);
  const summary=regionActivitySummary(state,current.id);
  const otherChapters=WORLD_CHAPTER_GROUPS.filter(chapter=>chapter.id!==currentChapter.id);
  const goalChapter=goalRegionId?worldChapterForRegionId(goalRegionId):undefined;
  const orderedChapters=otherChapters.sort((a,b)=>{
    const goal=Number(b.id===goalChapter?.id)-Number(a.id===goalChapter?.id);if(goal)return goal;
    const availability={available:0,locked:1,inDevelopment:2};
    const stateA=chapterAvailability(a,state),stateB=chapterAvailability(b,state);
    if(stateA!==stateB)return availability[stateA]-availability[stateB];
    return chapterLevelRange(a).min-chapterLevelRange(b).min;
  });
  const next=WORLD_ZONES.filter(zone=>zone.id!==current.id&&regionTravelAvailability(state,zone)==='locked')
    .sort((a,b)=>a.minLevel-b.minLevel)[0];
  const nextReason=next?regionTravelLockReason(state,next):undefined;
  const nextProgress=next?Math.min(100,Math.max(0,Math.round(level/Math.max(1,next.minLevel)*100))):100;

  return <View style={s.root}>
    <View style={[s.current,{borderColor:current.accent}]}>
      <View style={s.currentHero}>
        <View style={s.currentArtwork}><ZoneSceneArtwork regionId={current.id}/></View>
        <View style={s.flex}>
          <Text style={s.eyebrow}>{p('CURRENT REGION')} · {p('Chapter')} {currentChapter.numeral}</Text>
          <Text numberOfLines={1} style={s.currentTitle}>{p(currentChapter.name)}</Text>
          <Text numberOfLines={2} style={s.meta}>{p(current.name)} · {t('Hunts {ready}/{total} · Gather {gatherReady}/{gatherTotal}',{
            ready:summary.combatReady,total:summary.combatTotal,gatherReady:summary.gatheringReady,gatherTotal:summary.gatheringTotal,
          })}</Text>
        </View>
      </View>
      <View style={s.zoneList}>
        {currentZones.map(zone=>{
          const artId=zone.areaId??zone.region?.id??zone.id;
          const siblingRegion=zone.region;
          // The character travels between regions, not sub-areas. A regional chapter
          // must not show every sub-area as HERE (including level-locked ones).
          // Keep its area rows compact with their level gates and action states.
          const here=!!siblingRegion&&siblingRegion.id===current.id;
          let access:boolean,subtitle:string;
          if(siblingRegion){
            const availability=regionTravelAvailability(state,siblingRegion);
            access=availability==='available';
            const lockReason=availability==='locked'?regionTravelLockReason(state,siblingRegion):undefined;
            subtitle=availability==='inDevelopment'?p('In Development')
              :access?p(siblingRegion.subtitle)
              :(lockReason?progressionTravelReason(language,lockReason):t('Unlocks at level {level}',{level:zone.minLevel}));
          }else{
            const regionAvailable=zone.areaRegionId?regionTravelAvailability(state,WORLD_ZONES.find(wz=>wz.id===zone.areaRegionId)!)==='available':false;
            access=regionAvailable&&level>=zone.minLevel;
            const counts=zone.areaId?regionalAreaActivityCounts(zone.areaRegionId!,zone.areaId):{enemies:0,gathering:0};
            subtitle=access
              ?counts.enemies+' '+p('enemies')+' · '+counts.gathering+' '+p('gathering')
              :t('Unlocks at level {level}',{level:zone.minLevel});
          }
          if(here)return <View key={zone.id} style={s.zoneHereCard}>
            <View style={s.zoneHereArtwork}><ZoneSceneArtwork regionId={artId}/></View>
            <View style={s.zoneHereShade}/>
            <View style={s.zoneHereBody}>
              <Text style={s.zoneHereKicker}>{p('HERE')} · {t('Levels {min}–{max}',{min:zone.minLevel,max:zone.maxLevel})}</Text>
              <Text numberOfLines={1} style={s.zoneHereName}>{p(zone.name)}</Text>
              <Text numberOfLines={2} style={s.zoneHereSubtitle}>{subtitle}</Text>
              <View style={s.zoneHereActions}>
                <View style={s.flex}><GameButton compact title={t('Combat')} onPress={()=>siblingRegion?onOpenCombat():onOpenCombat(zone.areaId)}/></View>
                <View style={s.flex}><GameButton compact tone="secondary" title={p('Gathering')} onPress={()=>siblingRegion?onOpenSkills():onOpenSkills(zone.areaId)}/></View>
              </View>
            </View>
          </View>;
          return <View key={zone.id} style={[s.zone,!access&&s.zoneLocked]}>
            <View style={s.zoneArtwork}><ZoneSceneArtwork regionId={artId} muted={!access}/></View>
            <View style={s.flex}>
              <Text numberOfLines={1} style={s.zoneName}>{p(zone.name)}</Text>
              <Text style={s.zoneMeta}>{t('Levels {min}–{max}',{min:zone.minLevel,max:zone.maxLevel})}</Text>
              <Text numberOfLines={2} style={[s.zoneSubtitle,!access&&s.zoneSubtitleLocked]}>{subtitle}</Text>
            </View>
            <View style={s.zoneActions}>
              {siblingRegion
                ?<GameButton compact title={t('Travel')} disabled={!access} onPress={()=>onTravel(zone.id)}/>
                :<>
                  <GameButton compact title={t('Combat')} disabled={!access} onPress={()=>onOpenCombat(zone.areaId)}/>
                  <GameButton compact tone="secondary" title={p('Gather')} disabled={!access} onPress={()=>onOpenSkills(zone.areaId)}/>
                </>}
            </View>
          </View>;
        })}
      </View>
    </View>

    {children}
    {goalChapter&&goalChapter.id!==currentChapter.id?<View style={s.goalNotice}>
      <Text style={s.goalText}>{t('OBJECTIVE ROUTE')} · {p(goalChapter.name)}</Text>
    </View>:null}

    <View style={s.divider}>
      <View style={s.dividerRule}/>
      <Text style={s.dividerLabel}>{p('OTHER REGIONS')} · {orderedChapters.length}</Text>
      <View style={s.dividerRule}/>
    </View>

    <TutorialBeacon id="world-travel" reduceMotion={state.settings.reduceMotion}>
      <View style={s.list}>
        {next?<View style={s.nextUnlock}>
          <View style={s.flex}>
            <Text style={s.nextLabel}>{t('NEXT REGION UNLOCK')}</Text>
            <Text style={s.nextName}>{p(next.name)}</Text>
            <Text numberOfLines={2} style={s.nextHint}>{nextReason?progressionTravelReason(language,nextReason):p('Continue exploring')}</Text>
            {level<next.minLevel?<View style={s.track}><View style={[s.fill,{width:(nextProgress+'%') as any}]}/></View>:null}
          </View>
          <Text style={s.nextLevel}>{level<next.minLevel?t('Level {level}',{level:next.minLevel}):t('SCOUT')}</Text>
        </View>:null}

        {orderedChapters.map(chapter=>{
          const availability=chapterAvailability(chapter,state);
          const development=availability==='inDevelopment';
          const access=availability==='available';
          const target=chapterTravelTarget(chapter,state);
          const range=chapterLevelRange(chapter);
          const zones=zonesForChapter(chapter);
          const goal=chapter.id===goalChapter?.id;
          return <View key={chapter.id} style={[s.dest,goal&&s.destGoal,development&&s.destDev]}>
            <View style={s.destThumb}><ZoneSceneArtwork regionId={chapter.artRegionId} muted={!access}/>
              {!access&&!development?<View style={s.lockedTag}><Text style={s.lockedText}>{level>=range.min?t('SCOUT'):t('Level {level}',{level:range.min})}</Text></View>:null}
            </View>
            <View style={s.flex}>
              <View style={s.destHeadRow}>
                <Text numberOfLines={1} style={[s.destName,development&&s.destNameDev]}>{p('Chapter')} {chapter.numeral} · {p(chapter.name)}</Text>
                {goal?<Text style={s.goalBadge}>{t('GOAL')}</Text>:null}
              </View>
              <Text style={[s.destMeta,!access&&s.destMetaLocked]}>{development?t('In Development'):t('Levels {min}–{max}',{min:range.min,max:range.max})}</Text>
              <Text numberOfLines={1} style={[s.destCounts,!access&&s.destCountsLocked]}>{zones.length+' '+(zones.length===1?p('zone inside'):p('zones inside'))}</Text>
              <Text numberOfLines={2} style={s.destSub}>{p(chapter.description)}</Text>
            </View>
            {access&&target?<View style={s.destBtn}><GameButton compact title={t('Travel')} tone="secondary" onPress={()=>onTravel(target.id)}/></View>:null}
          </View>;
        })}
      </View>
    </TutorialBeacon>
  </View>;
}
function styles(C:ThemeColors){
  const equipmentColors=equipmentTheme(C);
  return StyleSheet.create({
    root:{gap:9},flex:{flex:1,minWidth:0},

    /* Current chapter: hero header + always-visible zone list, in one bordered card. */
    current:{borderWidth:1,borderRadius:13,backgroundColor:C.panel,overflow:'hidden'},
    currentHero:{flexDirection:'row',alignItems:'center',gap:10,padding:10,minHeight:92},
    currentArtwork:{width:82,height:76,borderRadius:9,overflow:'hidden',backgroundColor:C.panel2},
    eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:.9,color:equipmentColors.goldSoft},
    currentTitle:{fontSize:17,fontWeight:'900',color:C.text,marginTop:2},
    meta:{fontSize:11,color:C.muted,marginTop:3},

    /* Zone list inside the current chapter card. */
    zoneList:{gap:7,padding:8,borderTopWidth:1,borderTopColor:C.line,backgroundColor:C.bg},

    /* The HERE zone is a scenic hero card so the player instantly sees where they are. */
    zoneHereCard:{borderRadius:11,overflow:'hidden',borderWidth:1,borderColor:C.info,backgroundColor:C.panel,minHeight:170,position:'relative'},
    zoneHereArtwork:{...StyleSheet.absoluteFill,backgroundColor:C.panel2},
    zoneHereShade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(5,12,20,.62)':'rgba(255,255,255,.60)'},
    zoneHereBody:{padding:12,gap:4,justifyContent:'flex-end',flex:1,minHeight:170},
    zoneHereKicker:{fontSize:9,fontWeight:'900',letterSpacing:1,color:C.info},
    zoneHereName:{fontSize:20,fontWeight:'900',color:C.text,marginTop:2},
    zoneHereSubtitle:{fontSize:11,lineHeight:15,color:C.muted,marginTop:2},
    zoneHereActions:{flexDirection:'row',gap:8,marginTop:9},

    /* Sibling zones stay compact one-row entries. */
    zone:{flexDirection:'row',alignItems:'center',gap:8,padding:7,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
    zoneLocked:{opacity:.72},
    zoneArtwork:{width:58,height:54,borderRadius:7,overflow:'hidden',backgroundColor:C.panel2},
    zoneName:{fontSize:12.5,fontWeight:'800',color:C.text},
    zoneMeta:{fontSize:10,color:C.muted,marginTop:1},
    zoneSubtitle:{fontSize:10,lineHeight:14,color:C.info,fontWeight:'700',marginTop:2},
    zoneSubtitleLocked:{color:C.muted,fontWeight:'600'},
    zoneActions:{flexDirection:'column',gap:5,alignItems:'stretch',minWidth:92},

    goalNotice:{borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,padding:9,borderRadius:6},
    goalText:{fontSize:11,fontWeight:'800',color:C.info},

    divider:{flexDirection:'row',alignItems:'center',gap:10,marginTop:4},
    dividerRule:{flex:1,height:1,backgroundColor:C.line},
    dividerLabel:{fontSize:10,fontWeight:'900',letterSpacing:1.2,color:equipmentColors.goldSoft},
    sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
    sectionTitle:{fontSize:10,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},
    sectionHint:{fontSize:10,color:C.muted},

    list:{gap:7},
    nextUnlock:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:10,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},
    nextLabel:{fontSize:9,fontWeight:'800',letterSpacing:.7,color:equipmentColors.goldSoft},
    nextName:{fontSize:12,fontWeight:'800',color:C.text,marginTop:3},
    nextHint:{fontSize:10,lineHeight:14,color:C.muted,marginTop:3},
    nextLevel:{fontSize:10,fontWeight:'800',color:C.info},
    track:{height:4,borderRadius:3,backgroundColor:C.bg,overflow:'hidden',marginTop:7},
    fill:{height:4,backgroundColor:C.accent,borderRadius:3},

    /* Other chapter rows: compact one-row-per-chapter. */
    dest:{minHeight:92,flexDirection:'row',alignItems:'center',gap:9,padding:8,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:11},
    destGoal:{borderColor:C.info,borderWidth:2},
    destDev:{opacity:.72,borderStyle:'dashed'},
    destThumb:{width:66,height:76,borderRadius:9,overflow:'hidden',backgroundColor:C.panel2},
    lockedTag:{position:'absolute',bottom:0,left:0,right:0,padding:3,backgroundColor:C.dark?'rgba(8,17,29,.80)':'rgba(255,255,255,.90)'},
    lockedText:{color:C.muted,textAlign:'center',fontSize:10,fontWeight:'800',letterSpacing:.3},
    destHeadRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
    destName:{fontSize:13.5,fontWeight:'900',color:C.text},
    destNameDev:{color:C.muted},
    goalBadge:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.8},
    destMeta:{fontSize:11,color:C.info,fontWeight:'700',marginTop:1},
    destMetaLocked:{color:C.muted,fontWeight:'600'},
    destCounts:{fontSize:10,color:C.text,fontWeight:'800',marginTop:1},
    destCountsLocked:{color:C.muted,fontWeight:'600'},
    description:{fontSize:11,lineHeight:16,color:C.muted},
    activityCount:{fontSize:10,color:C.info,fontWeight:'700'},
    destSub:{fontSize:11,lineHeight:15,color:C.muted,marginTop:1},
    destBtn:{alignSelf:'center',minWidth:88},
  });
}

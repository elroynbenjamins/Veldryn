import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {WORLD_ZONES,type WorldZoneDef} from '../content/world-map';
import {WORLD_CHAPTER_GROUPS,worldChapterForRegionId} from '../content/world-chapters';
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
type LocationRow={
  id:string;
  region:WorldZoneDef;
  name:string;
  minLevel:number;
  maxLevel:number;
  description:string;
  areaId?:string;
};
function rowsForRegion(region:WorldZoneDef):LocationRow[]{
  const areas=regionAreas(region.id);
  return areas.length?areas.map(area=>({
    id:area.id,region,name:area.name,minLevel:area.minLevel,maxLevel:area.maxLevel,
    description:area.identity,areaId:area.id,
  })):[{
    id:region.id,region,name:region.name,minLevel:region.minLevel,
    maxLevel:region.maxLevel,description:region.subtitle,
  }];
}
const CHAPTER_ROWS=WORLD_CHAPTER_GROUPS.map(chapter=>({
  chapter,
  rows:chapter.regionIds.flatMap(id=>{
    const region=WORLD_ZONES.find(zone=>zone.id===id);
    return region?rowsForRegion(region):[];
  }),
}));
/** All grouping lives in this component; travel remains region-based. */
export function WorldChapterNavigator({state,currentRegionId,goalRegionId,onTravel,onOpenCombat,onOpenSkills,children}:Props){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
  const level=state.character?.level??1;
  const current=WORLD_ZONES.find(zone=>zone.id===currentRegionId)??WORLD_ZONES[0];
  const currentChapter=worldChapterForRegionId(current.id)??WORLD_CHAPTER_GROUPS[0];
  const defaultRow=useMemo(()=>{
    const rows=CHAPTER_ROWS.find(group=>group.chapter.id===currentChapter.id)?.rows.filter(row=>row.region.id===current.id)??[];
    return [...rows].reverse().find(row=>level>=row.minLevel)?.id??rows[0]?.id??current.id;
  },[current.id,currentChapter.id,level]);
  const [openChapter,setOpenChapter]=useState(currentChapter.id);
  const [openRow,setOpenRow]=useState<string|null>(defaultRow);
  useEffect(()=>{
    setOpenChapter(currentChapter.id);
    setOpenRow(defaultRow);
  },[current.id,currentChapter.id]); // Preserve user selection while levels change.
  const summary=regionActivitySummary(state,current.id);
  const next=WORLD_ZONES.filter(zone=>zone.id!==current.id&&regionTravelAvailability(state,zone)==='locked')
    .sort((a,b)=>a.minLevel-b.minLevel)[0];
  const nextReason=next?regionTravelLockReason(state,next):undefined;
  const nextProgress=next?Math.min(100,Math.max(0,Math.round(level/Math.max(1,next.minLevel)*100))):100;
  const currentGoal=goalRegionId&&goalRegionId!==current.id?WORLD_ZONES.find(zone=>zone.id===goalRegionId):undefined;

  return <View style={s.root}>
    <View style={[s.current,{borderColor:current.accent}]}>
      <View style={s.currentArtwork}><ZoneSceneArtwork regionId={current.id}/></View>
      <View style={s.flex}>
        <Text style={s.eyebrow}>{p('CURRENT LOCATION')}</Text>
        <Text numberOfLines={1} style={s.currentTitle}>{p(current.name)}</Text>
        <Text numberOfLines={1} style={s.meta}>{p(currentChapter.name)} · {t('Level {level}',{level})}</Text>
        <Text numberOfLines={1} style={s.count}>{t('Hunts {ready}/{total} · Gather {gatherReady}/{gatherTotal}',{
          ready:summary.combatReady,total:summary.combatTotal,gatherReady:summary.gatheringReady,gatherTotal:summary.gatheringTotal,
        })}</Text>
      </View>
    </View>
    <View style={s.currentActions}>
      <View style={s.flex}><GameButton compact title={t('Combat')} onPress={()=>onOpenCombat()}/></View>
      <View style={s.flex}><GameButton compact tone="secondary" title={p('Gathering')} onPress={()=>onOpenSkills()}/></View>
    </View>

    {children}
    {currentGoal?<View style={s.goalNotice}>
      <Text style={s.goalText}>{t('OBJECTIVE ROUTE')} · {p(currentGoal.name)}</Text>
    </View>:null}

    <View style={s.sectionHead}>
      <Text style={s.sectionTitle}>{p('EXPLORE REGIONS')}</Text>
      <Text style={s.sectionHint}>{p('Select a chapter')}</Text>
    </View>
    <TutorialBeacon id="world-travel" reduceMotion={state.settings.reduceMotion}>
      <View style={s.groups}>
        {CHAPTER_ROWS.map(({chapter,rows})=>{
          const expanded=openChapter===chapter.id;
          const released=rows.some(row=>regionTravelAvailability(state,row.region)!=='inDevelopment');
          const available=rows.filter(row=>regionTravelAvailability(state,row.region)==='available'&&level>=row.minLevel).length;
          const currentHere=chapter.id===currentChapter.id;
          const chapterGoal=rows.some(row=>row.region.id===goalRegionId)&&!currentHere;
          const low=Math.min(...rows.map(row=>row.minLevel)),high=Math.max(...rows.map(row=>row.maxLevel));
          return <View key={chapter.id} style={[s.chapter,currentHere&&s.chapterActive,chapterGoal&&s.goalChapter]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={p(chapter.name)}
              accessibilityHint={expanded?p('Collapse locations'):p('Expand locations')}
              accessibilityState={{expanded}}
              onPress={()=>{setOpenChapter(expanded?'':chapter.id);if(!expanded){setOpenRow(null);}}}
              style={({pressed})=>[s.chapterHeader,pressed&&s.pressed]}>
              <View style={s.chapterArtwork}><ZoneSceneArtwork regionId={chapter.artRegionId} muted={!released}/></View>
              <View style={s.flex}>
                <Text numberOfLines={1} style={s.chapterName}>{p(chapter.name)} {chapterGoal?'· '+t('GOAL'):''}</Text>
                <Text numberOfLines={1} style={s.chapterMeta}>
                  {p('Chapter')} {chapter.numeral} · {t('Levels {min}–{max}',{min:low,max:high})}
                </Text>
                <Text style={s.chapterCount}>{released?available+'/'+rows.length+' '+p('available'):t('In Development')}</Text>
              </View>
              <Text style={s.chevron}>{expanded?'⌃':'⌄'}</Text>
            </Pressable>
            {expanded?<View style={s.locationList}>
              {rows.map(row=>{
                const availability=regionTravelAvailability(state,row.region);
                const development=availability==='inDevelopment';
                const sameRegion=row.region.id===current.id;
                const access=availability==='available'&&level>=row.minLevel;
                const selected=openRow===row.id;
                const label=development?t('In Development'):!access?t('Locked'):sameRegion&&!row.areaId?p('HERE'):p('Available');
                const status=development?'development':access?'available':'locked';
                const counts=row.areaId?regionalAreaActivityCounts(row.region.id,row.areaId):null;
                const regionCounts=row.areaId?null:regionActivitySummary(state,row.region.id);
                const lockReason=availability==='locked'?regionTravelLockReason(state,row.region):undefined;
                const detail=development?p(row.region.developmentNote??row.description):
                  lockReason?progressionTravelReason(language,lockReason):
                  level<row.minLevel?t('Unlocks at level {level}',{level:row.minLevel}):p(row.description);
                return <View key={row.id} style={[s.location,selected&&s.locationSelected]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={p(row.name)+' · '+t('Levels {min}–{max}',{min:row.minLevel,max:row.maxLevel})}
                    accessibilityState={{expanded:selected}}
                    onPress={()=>setOpenRow(selected?null:row.id)}
                    style={({pressed})=>[s.locationHeader,pressed&&s.pressed]}>
                    <View style={[s.dot,status==='locked'&&s.dotLocked,status==='development'&&s.dotComing]}/>
                    <View style={s.flex}>
                      <Text numberOfLines={1} style={s.locationName}>{p(row.name)}</Text>
                      <Text style={s.locationMeta}>{t('Levels {min}–{max}',{min:row.minLevel,max:row.maxLevel})}</Text>
                    </View>
                    <Text style={[s.status,!access&&s.statusMuted,development&&s.statusComing]}>{label}</Text>
                    <Text style={s.smallChevron}>{selected?'⌃':'⌄'}</Text>
                  </Pressable>
                  {selected?<View style={s.locationDetail}>
                    <Text style={s.description}>{detail}</Text>
                    {!development?<Text style={s.activityCount}>
                      {row.areaId?counts?.enemies+' '+p('enemies')+' · '+counts?.gathering+' '+p('gathering'):
                        t('Hunts {ready}/{total} · Gather {gatherReady}/{gatherTotal}',{
                          ready:regionCounts?.combatReady??0,total:regionCounts?.combatTotal??0,
                          gatherReady:regionCounts?.gatheringReady??0,gatherTotal:regionCounts?.gatheringTotal??0,
                        })}
                    </Text>:null}
                    {access?<View style={s.inlineActions}>
                      {sameRegion?<>
                        <View style={s.flex}><GameButton compact title={t('Combat')} onPress={()=>onOpenCombat(row.areaId)}/></View>
                        <View style={s.flex}><GameButton compact title={p('Gathering')} tone="secondary" onPress={()=>onOpenSkills(row.areaId)}/></View>
                      </>:<View style={s.flex}><GameButton compact title={t('Travel')} onPress={()=>onTravel(row.region.id)}/></View>}
                    </View>:null}
                  </View>:null}
                </View>;
              })}
            </View>:null}
          </View>;
        })}
      </View>
    </TutorialBeacon>
    {next?<View style={s.nextUnlock}>
      <View style={s.flex}>
        <Text style={s.nextLabel}>{t('NEXT REGION UNLOCK')}</Text>
        <Text style={s.nextName}>{p(next.name)}</Text>
        <Text numberOfLines={2} style={s.nextHint}>{nextReason?progressionTravelReason(language,nextReason):p('Continue exploring')}</Text>
        {level<next.minLevel?<View style={s.track}><View style={[s.fill,{width:(nextProgress+'%') as any}]}/></View>:null}
      </View>
      <Text style={s.nextLevel}>{level<next.minLevel?t('Level {level}',{level:next.minLevel}):t('SCOUT')}</Text>
    </View>:null}
  </View>;
}
function styles(C:ThemeColors){
  const equipmentColors=equipmentTheme(C);
  return StyleSheet.create({
    root:{gap:9},flex:{flex:1,minWidth:0},
    current:{flexDirection:'row',alignItems:'center',gap:10,padding:9,backgroundColor:C.panel,borderWidth:1,borderRadius:12,minHeight:94},
    currentArtwork:{width:72,height:74,borderRadius:8,overflow:'hidden',backgroundColor:C.panel2},
    eyebrow:{fontSize:9,fontWeight:'800',letterSpacing:.9,color:equipmentColors.goldSoft},
    currentTitle:{fontSize:17,fontWeight:'900',color:C.text,marginTop:2},
    meta:{fontSize:11,color:C.muted,marginTop:1},
    count:{fontSize:10,color:C.muted,marginTop:4},
    currentActions:{flexDirection:'row',gap:8},
    goalNotice:{borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface,padding:9,borderRadius:6},
    goalText:{fontSize:11,fontWeight:'800',color:C.info},
    sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:4},
    sectionTitle:{fontSize:10,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},
    sectionHint:{fontSize:10,color:C.muted},
    groups:{gap:7},
    chapter:{borderWidth:1,borderColor:C.line,borderRadius:11,overflow:'hidden',backgroundColor:C.panel},
    chapterActive:{borderColor:C.selectionLine},goalChapter:{borderColor:C.info},
    chapterHeader:{flexDirection:'row',alignItems:'center',gap:9,padding:9,minHeight:64},
    chapterArtwork:{width:43,height:45,borderRadius:7,overflow:'hidden',backgroundColor:C.panel2},
    chapterName:{fontSize:14,fontWeight:'900',color:C.text},
    chapterMeta:{fontSize:10,color:C.muted,marginTop:2},
    chapterCount:{fontSize:10,color:C.info,marginTop:3,fontWeight:'700'},
    chevron:{fontSize:18,color:C.muted,paddingHorizontal:5},
    locationList:{borderTopWidth:1,borderTopColor:C.line,padding:7,gap:3,backgroundColor:C.bg},
    location:{borderRadius:8,overflow:'hidden',borderWidth:1,borderColor:'transparent'},
    locationSelected:{borderColor:C.selectionLine,backgroundColor:C.panel},
    locationHeader:{flexDirection:'row',alignItems:'center',gap:8,minHeight:45,paddingHorizontal:8,paddingVertical:5},
    dot:{width:8,height:8,borderRadius:4,backgroundColor:C.good},
    dotLocked:{backgroundColor:C.muted,opacity:.5},
    dotComing:{backgroundColor:C.warning,opacity:.65},
    locationName:{fontSize:12,fontWeight:'800',color:C.text},
    locationMeta:{fontSize:10,color:C.muted,marginTop:2},
    status:{fontSize:9,fontWeight:'900',color:C.good},
    statusMuted:{color:C.muted},statusComing:{color:C.warning},
    smallChevron:{fontSize:13,color:C.muted,width:13,textAlign:'center'},
    locationDetail:{paddingLeft:23,paddingRight:9,paddingBottom:10,borderTopWidth:1,borderTopColor:C.line,paddingTop:8,gap:5},
    description:{fontSize:11,lineHeight:16,color:C.muted},
    activityCount:{fontSize:10,color:C.info,fontWeight:'700'},
    inlineActions:{flexDirection:'row',gap:7,marginTop:3},
    pressed:{opacity:.76},
    nextUnlock:{flexDirection:'row',alignItems:'flex-start',gap:10,padding:10,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},
    nextLabel:{fontSize:9,fontWeight:'800',letterSpacing:.7,color:equipmentColors.goldSoft},
    nextName:{fontSize:12,fontWeight:'800',color:C.text,marginTop:3},
    nextHint:{fontSize:10,lineHeight:14,color:C.muted,marginTop:3},
    nextLevel:{fontSize:10,fontWeight:'800',color:C.info},
    track:{height:4,borderRadius:3,backgroundColor:C.bg,overflow:'hidden',marginTop:7},
    fill:{height:4,backgroundColor:C.accent,borderRadius:3},
  });
}

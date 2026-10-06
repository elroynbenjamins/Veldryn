import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,progressionTravelReason,type ProgressionKey} from '../i18n/progression';
import {useEffect,useState,useMemo,type ReactNode} from 'react';
import {ZoneSceneArtwork} from '../components/ZoneSceneArtwork';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {WORLD_ZONES} from '../content/world-map';
import {currentRegionId} from '../core/combat-region';
import {orderedTravelRegions,regionActivitySummary,regionTravelAvailability,regionTravelLockReason} from '../core/world-navigation';
import {GameButton} from '../components/GameButton';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {FrostmarchRegionPanel} from '../components/FrostmarchRegionPanel';
import {SunscarRegionPanel} from '../components/SunscarRegionPanel';
import {RegionalCombatPanel} from '../components/RegionalCombatPanel';
import {RegionalJournalPanel} from '../components/RegionalJournalPanel';
import {RegionalStoryLeadsPanel} from '../components/RegionalStoryLeadsPanel';
import type {WeeklyOrder} from '../core/weekly-orders-v41';
import {frostmarchCardsV21,frostmarchProgressFromState,type RegionProgressV21} from '../core/region-content-v21';
import {loadActiveFrostmarchContentVersionV21,loadFrostmarchProgressV21} from '../online/regional-content-v21';

type Props={
  state:GameState;
  onTravel:(regionId:string)=>void;
  onOpenCombat:(zoneId?:string)=>void;
  onOpenSkills:()=>void;
  onCoop?:(dungeonId?:string)=>void;
  dungeonContent?:ReactNode;
  onRegionalRewardsChanged?:()=>Promise<void>|void;
  onOpenWeeklyOrder?:(order:WeeklyOrder)=>void;
  onOpenContracts?:(order?:WeeklyOrder)=>void;
  goalRegionId?:string;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onCoop,dungeonContent,onRegionalRewardsChanged,onOpenWeeklyOrder,onOpenContracts,goalRegionId}:Props){
  const contextLanguage=useGameLanguage(),language=state.settings.language??contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const level=state.character!.level,currentId=currentRegionId(state);
  const current=WORLD_ZONES.find(zone=>zone.id===currentId)??WORLD_ZONES[0];
  const storyRegion=currentId==='SUNSCAR'||currentId==='FROSTMARCH'||currentId==='ASHLANDS'?currentId:undefined;
  const currentSummary=regionActivitySummary(state,current.id),travelRegions=orderedTravelRegions(state,current.id,goalRegionId);
  const next=WORLD_ZONES.filter(zone=>zone.id!==current.id&&regionTravelAvailability(state,zone)==='locked').sort((a,b)=>a.minLevel-b.minLevel)[0],nextLevelMet=!!next&&level>=next.minLevel,nextLockReason=next?regionTravelLockReason(state,next):undefined;
  const nextUnlockProgress=next&&!nextLevelMet?Math.max(3,Math.min(100,level/Math.max(1,next.minLevel)*100)):100;

  const sunscar=current.id==='SUNSCAR',frostmarch=current.id==='FROSTMARCH';
  const [serverFrostmarchProgress,setServerFrostmarchProgress]=useState<RegionProgressV21|null>(null);
  const [activeFrostmarchVersion,setActiveFrostmarchVersion]=useState<string|null>(null);
  const [topTab,setTopTab]=useState<'region'|'dungeon'>('region');
  useEffect(()=>{
    let mounted=true;
    if(!frostmarch){setServerFrostmarchProgress(null);setActiveFrostmarchVersion(null);return ()=>{mounted=false;};}
    void Promise.all([loadFrostmarchProgressV21(),loadActiveFrostmarchContentVersionV21()]).then(([progress,version])=>{if(mounted){setServerFrostmarchProgress(version?.startsWith('frostmarch-v21.')?progress:null);setActiveFrostmarchVersion(version);}}).catch(()=>{if(mounted){setServerFrostmarchProgress(null);setActiveFrostmarchVersion(null);}});
    return ()=>{mounted=false;};
  },[frostmarch]);
  const sunscarZones=[
    {id:'ZONE_006',name:'Saffron Gate',levelRange:'Lv 25–29',locked:level<25,identity:t("Caravan gate, spice roads and the first desert settlements."),activities:[t("Patrol combat"),'Dunewood',t("regional contracts")]},
    {id:'ZONE_007',name:'Scorchwind Flats',levelRange:'Lv 30–35',locked:level<30,identity:t("Open glass-sand flats where exposure and heat alter fights."),activities:['Sunspine Elite','Sunstone Ore','Charbark']},
    {id:'ZONE_008',name:'Mirage Basin',levelRange:'Lv 32–38',locked:level<32,identity:t("Oasis basin where false targets and reflected memories distort combat."),activities:['Mirage Elite',t("Fishing"),t("Herbalism")]},
    {id:'ZONE_009',name:'Buried Observatory',levelRange:'Lv 37–43',locked:level<37,identity:t("Ancient star machinery beneath the desert, rich in lenses and astral script."),activities:['Observatory Elite','Astral Survey','Amberglass']},
    {id:'ZONE_010',name:"Tyrant's Crown",levelRange:'Lv 42–45',locked:level<42,identity:t("Royal ruins and sand-pillars surrounding the Sand Tyrant."),activities:['Sand Tyrant','Royal Chitin',t("regional mastery")]},
  ] as const;
  const frostmarchCards=frostmarchCardsV21(level),frostmarchZones=frostmarchCards.zones,frostmarchDungeons=frostmarchCards.dungeons;
  const frostmarchProgress=serverFrostmarchProgress??frostmarchProgressFromState(state);
  return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text style={s.kicker}>{t("TRAVEL")}</Text>
    <Text accessibilityRole="header" style={s.h}>{t("World Regions")}</Text>
    <Text style={s.sub}>{t("Your location controls which enemies and gathering activities are available.")}</Text>

    <View accessibilityRole="tablist" style={s.topTabs}>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:topTab==='region'}} style={[s.topTab,topTab==='region'&&s.topTabActive]} onPress={()=>setTopTab('region')}><Text style={[s.topTabText,topTab==='region'&&s.topTabTextActive]}>{t("Current Region")}</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{selected:topTab==='dungeon'}} style={[s.topTab,topTab==='dungeon'&&s.topTabActive]} onPress={()=>setTopTab('dungeon')}><Text style={[s.topTabText,topTab==='dungeon'&&s.topTabTextActive]}>{t("Dungeon")}</Text></Pressable>
    </View>

    {topTab==='dungeon'?<View style={s.dungeonContent}>{dungeonContent??<View style={s.dungeonCard}>
      <Text style={s.overline}>{t("DUNGEONS")}</Text><Text style={s.currentName}>{t("Expedition staging")}</Text><Text style={s.sub}>{t("Build a party with Echoes and run online Q-Mode expeditions from the current region.")}</Text>
      <View style={s.dungeonAction}><GameButton title={t("Open Dungeons")} tone="primary" disabled={!onCoop} onPress={()=>onCoop?.()}/></View>
      {!onCoop?<Text style={s.dungeonNote}>{t("Dungeons are available when online play is configured.")}</Text>:null}
    </View>}</View>:<>
    <View style={[s.currentCard,{borderColor:current.accent}]}><ZoneSceneArtwork regionId={current.id}/><View style={s.heroShade}/>

      <View style={s.flex}><Text style={s.overline}>{t("CURRENT REGION")}</Text><Text style={s.currentName}>{current.name}</Text><Text style={s.sub}>{p(current.subtitle)}</Text></View>
    </View>
    <View style={s.currentActions}><View style={s.currentAction}><GameButton title={t("Combat")} onPress={()=>onOpenCombat()}/></View><View style={s.currentAction}><GameButton title={p("Gathering")} tone="secondary" onPress={onOpenSkills}/></View></View>
    <Text style={s.currentAvailability}>{t("Hunts {ready}/{total} · Gather {gatherReady}/{gatherTotal}",{ready:currentSummary.combatReady,total:currentSummary.combatTotal,gatherReady:currentSummary.gatheringReady,gatherTotal:currentSummary.gatheringTotal})}</Text>

    {goalRegionId&&goalRegionId!==current.id?<View style={s.goalRoute}><Text style={s.goalRouteLabel}>{t("OBJECTIVE ROUTE")}</Text><Text style={s.sub}>{t("Your current objective continues in {region}. That region is promoted to the top of Travel Elsewhere below.",{region:WORLD_ZONES.find(zone=>zone.id===goalRegionId)?.name??goalRegionId})}</Text></View>:null}

    {storyRegion&&<RegionalStoryLeadsPanel state={state} regionId={storyRegion} onOpenCombat={()=>onOpenCombat()}/>}
    {sunscar&&<><SunscarRegionPanel zones={sunscarZones}/>{onRegionalRewardsChanged?<RegionalCombatPanel state={state} onRewardsChanged={onRegionalRewardsChanged}/>:null}</>}
    {frostmarch&&<>
      <FrostmarchRegionPanel zones={frostmarchZones} progress={frostmarchProgress} contentVersion={activeFrostmarchVersion??undefined} dungeons={frostmarchDungeons} onZone={zoneId=>onOpenCombat(zoneId)} onDungeon={onCoop}/>
      <RegionalJournalPanel name="Frostmarch" progress={frostmarchProgress}/>
    </>}
    </>}

    {topTab==='region'?<><Text style={s.section}>{t("TRAVEL ELSEWHERE")}</Text>
    <View style={s.unlockCard}><View style={s.unlockHead}><View style={s.flex}><Text style={s.unlockLabel}>{next?t("NEXT REGION UNLOCK"):t("REGION PROGRESSION")}</Text><Text style={s.unlockTitle}>{next?next.name:t("All authored regions unlocked")}</Text></View>{next?<Text style={s.unlockLevel}>{nextLevelMet?t("SCOUT"):t("Level {level}",{level:level+'/'+next.minLevel})}</Text>:<Text style={s.unlockDone}>{t("COMPLETE")}</Text>}</View>{next&&!nextLevelMet?<><View style={s.unlockTrack}><View style={[s.unlockFill,{width:(nextUnlockProgress+'%') as any}]}/></View><Text style={s.unlockMeta}>{t("Levels until the scouting gate: {count}.",{count:Math.max(0,next.minLevel-level)})}</Text></>:next?<Text style={s.unlockMeta}>{nextLockReason?progressionTravelReason(language,nextLockReason):t("Complete the required scouting route to continue.")}</Text>:<Text style={s.unlockMeta}>{t("Every currently authored region can be travelled to.")}</Text>}</View>
    {travelRegions.map(zone=>{
      const availability=regionTravelAvailability(state,zone),unlocked=availability==='available',inDevelopment=availability==='inDevelopment',summary=regionActivitySummary(state,zone.id),goalTarget=goalRegionId===zone.id,lockReason=regionTravelLockReason(state,zone),levelMet=level>=zone.minLevel;
      const content=inDevelopment?t("Preview planned regional content"):unlocked?t("Hunts {ready}/{total} · Gather {gatherReady}/{gatherTotal}",{ready:summary.combatReady,total:summary.combatTotal,gatherReady:summary.gatheringReady,gatherTotal:summary.gatheringTotal})+(summary.bossesTotal?' · '+t("Boss {ready}/{total}",{ready:summary.bossesReady,total:summary.bossesTotal}):''):(t("{hunts} hunts · {gathering} gathering",{hunts:summary.combatTotal,gathering:summary.gatheringTotal})+(summary.bossesTotal?' · '+t("Bosses: {count}",{count:summary.bossesTotal}):''));
      return <View key={zone.id} style={[s.destination,goalTarget&&s.goalDestination,inDevelopment&&s.developmentDestination]}>
        <View style={s.thumbnail}><ZoneSceneArtwork regionId={zone.id} muted={!unlocked}/>{!unlocked&&!inDevelopment&&<View style={s.lockedTag}><Text style={s.lockedText}>{levelMet?t("SCOUT"):t("Level {level}",{level:zone.minLevel})}</Text></View>}</View>
        <View style={s.flex}>
          <View style={s.destinationHead}><Text style={[s.destinationName,inDevelopment&&s.developmentText]}>{zone.name}</Text>{goalTarget?<Text style={s.goalBadge}>{t("GOAL")}</Text>:null}</View>
          <Text style={s.destinationMeta}>{inDevelopment?t("In Development"):unlocked?t("Levels {min}–{max}",{min:zone.minLevel,max:zone.maxLevel}):levelMet?t("Route not discovered yet"):t("Unlocks at level {level}",{level:zone.minLevel})}</Text>
          {!unlocked&&!inDevelopment&&levelMet&&lockReason?<Text numberOfLines={2} style={s.destinationContent}>{progressionTravelReason(language,lockReason)}</Text>:null}
          <Text numberOfLines={1} style={s.destinationContent}>{content}</Text>
          <Text numberOfLines={2} style={s.destinationSub}>{p(zone.subtitle)}</Text>
        </View>
        <View style={s.travelButton}><GameButton compact title={unlocked?t("Travel"):inDevelopment?t("In development"):t("Locked")} tone="secondary" disabled={!unlocked} onPress={()=>onTravel(zone.id)}/></View>
      </View>;
    })}</>:null}
  </ScrollView>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  root:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},
  kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'700',letterSpacing:1.2},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  flex:{flex:1,minWidth:0},
  currentScene:{...StyleSheet.absoluteFill,opacity:.34},regionTint:{...StyleSheet.absoluteFill,opacity:.2},heroShade:{...StyleSheet.absoluteFill,backgroundColor:C.dark?'rgba(5,12,20,.64)':'rgba(255,255,255,.68)'},thumbnail:{width:68,height:76,borderRadius:12,overflow:'hidden'},lockedTag:{position:'absolute',bottom:0,left:0,right:0,padding:4,backgroundColor:C.dark?'rgba(8,17,29,.80)':'rgba(255,255,255,.90)'},lockedText:{color:C.muted,textAlign:'center',fontSize:11},currentCard:{minHeight:184,overflow:'hidden',flexDirection:'row',alignItems:'flex-end',gap:spacing.md,padding:spacing.lg,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.lg},
  regionSymbol:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:32,backgroundColor:equipmentColors.stage},
  symbol:{fontSize:31,fontWeight:'700'},
  overline:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  topTabs:{flexDirection:'row',gap:0,borderWidth:1,borderColor:C.line,borderRadius:radii.md,overflow:'hidden',backgroundColor:C.panel},topTab:{flex:1,minHeight:42,alignItems:'center',justifyContent:'center',paddingHorizontal:spacing.sm},topTabActive:{backgroundColor:C.accent},topTabText:{...typography.bodyStrong,color:C.muted,textAlign:'center'},topTabTextActive:{color:C.dark?C.bg:C.panel},
  dungeonContent:{flex:1,minHeight:320},dungeonCard:{gap:spacing.sm,padding:spacing.lg,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,backgroundColor:equipmentColors.panel},dungeonAction:{marginTop:spacing.xs},dungeonNote:{...typography.caption,color:C.muted},
  currentName:{...typography.title,color:C.text,fontSize:22},
  actions:{flexDirection:'row',gap:spacing.sm,marginTop:6},
  currentActions:{flexDirection:'row',gap:spacing.sm},currentAction:{flex:1,minWidth:0},currentAvailability:{...typography.caption,color:C.muted},
  section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  unlockCard:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},unlockHead:{flexDirection:'row',alignItems:'center',gap:8},unlockLabel:{fontSize:8.5,color:C.muted,fontWeight:'900',letterSpacing:.7},unlockTitle:{...typography.bodyStrong,color:C.text},unlockLevel:{...typography.bodyStrong,color:C.info,fontWeight:'900'},unlockDone:{fontSize:9,color:C.good,fontWeight:'900'},unlockTrack:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:C.bg},unlockFill:{height:'100%',borderRadius:3,backgroundColor:C.accent},unlockMeta:{...typography.caption,color:C.muted},
  destination:{minHeight:92,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},developmentDestination:{opacity:.72,borderStyle:'dashed'},developmentTag:{backgroundColor:C.dark?'rgba(65,69,76,.90)':'rgba(220,223,228,.94)'},developmentText:{color:C.muted},
  smallSymbol:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:22,backgroundColor:equipmentColors.stage},
  smallSymbolText:{fontSize:21,fontWeight:'700'},
  destinationHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  destinationName:{...typography.bodyStrong,color:C.text},
  goalDestination:{borderColor:C.info,borderWidth:2},
  goalBadge:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.8},
  goalRoute:{padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},
  goalRouteLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},
  destinationMeta:{...typography.caption,color:C.info,fontWeight:'600'},
  destinationContent:{fontSize:10,lineHeight:14,color:C.text,fontWeight:'800'},
  destinationSub:{fontSize:12,lineHeight:17,color:C.muted},
  travelButton:{alignSelf:'center',minWidth:88},
  progress:{...typography.caption,color:C.muted,textAlign:'center'},
});}

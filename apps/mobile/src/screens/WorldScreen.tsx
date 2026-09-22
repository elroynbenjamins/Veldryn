import {useEffect,useState,useMemo} from 'react';
import {RegionArtwork} from '../components/RegionArtwork';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {WORLD_ZONES} from '../content/world-map';
import {currentRegionId} from '../core/combat-region';
import {nextRegionUnlock,orderedTravelRegions,regionActivitySummary} from '../core/world-navigation';
import {environmentForZone} from '../core/world-weather';
import {EnvironmentBanner} from '../components/EnvironmentBanner';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {FrostmarchRegionPanel} from '../components/FrostmarchRegionPanel';
import {SunscarRegionPanel} from '../components/SunscarRegionPanel';
import {RegionalCombatPanel} from '../components/RegionalCombatPanel';
import {RegionalJournalPanel} from '../components/RegionalJournalPanel';
import {RegionalStoryLeadsPanel} from '../components/RegionalStoryLeadsPanel';
import {frostmarchCardsV21,frostmarchProgressFromState,type RegionProgressV21} from '../core/region-content-v21';
import {loadActiveFrostmarchContentVersionV21,loadFrostmarchProgressV21} from '../online/regional-content-v21';

type Props={
  state:GameState;
  onTravel:(regionId:string)=>void;
  onOpenCombat:(zoneId?:string)=>void;
  onOpenSkills:()=>void;
  onCoop?:(dungeonId?:string)=>void;
  onRegionalRewardsChanged?:()=>Promise<void>|void;
  goalRegionId?:string;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onCoop,onRegionalRewardsChanged,goalRegionId}:Props){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const level=state.character!.level,currentId=currentRegionId(state);
  const current=WORLD_ZONES.find(zone=>zone.id===currentId)??WORLD_ZONES[0];
  const environment=environmentForZone(current.id);
  const next=nextRegionUnlock(level);
  const storyRegion=currentId==='SUNSCAR'||currentId==='FROSTMARCH'||currentId==='ASHLANDS'?currentId:undefined;
  const currentSummary=regionActivitySummary(state,current.id),travelRegions=orderedTravelRegions(state,current.id,goalRegionId);
  const nextUnlockProgress=next?Math.max(3,Math.min(100,level/Math.max(1,next.minLevel)*100)):100;

  const sunscar=current.id==='SUNSCAR',frostmarch=current.id==='FROSTMARCH';
  const [serverFrostmarchProgress,setServerFrostmarchProgress]=useState<RegionProgressV21|null>(null);
  const [activeFrostmarchVersion,setActiveFrostmarchVersion]=useState<string|null>(null);
  useEffect(()=>{
    let mounted=true;
    if(!frostmarch){setServerFrostmarchProgress(null);setActiveFrostmarchVersion(null);return ()=>{mounted=false;};}
    void Promise.all([loadFrostmarchProgressV21(),loadActiveFrostmarchContentVersionV21()]).then(([progress,version])=>{if(mounted){setServerFrostmarchProgress(version?.startsWith('frostmarch-v21.')?progress:null);setActiveFrostmarchVersion(version);}}).catch(()=>{if(mounted){setServerFrostmarchProgress(null);setActiveFrostmarchVersion(null);}});
    return ()=>{mounted=false;};
  },[frostmarch]);
  const sunscarZones=[
    {id:'ZONE_006',name:'Saffron Gate',levelRange:'Lv 25–29',locked:level<25,identity:'Caravan gate, spice roads and the first desert settlements.',activities:['Patrol combat','Dunewood','regional contracts']},
    {id:'ZONE_007',name:'Scorchwind Flats',levelRange:'Lv 30–35',locked:level<30,identity:'Open glass-sand flats where exposure and heat alter fights.',activities:['Sunspine Elite','Sunstone Ore','Charbark']},
    {id:'ZONE_008',name:'Mirage Basin',levelRange:'Lv 32–38',locked:level<32,identity:'Oasis basin where false targets and reflected memories distort combat.',activities:['Mirage Elite','Fishing','Herbalism']},
    {id:'ZONE_009',name:'Buried Observatory',levelRange:'Lv 37–43',locked:level<37,identity:'Ancient star machinery beneath the desert, rich in lenses and astral script.',activities:['Observatory Elite','Astral Survey','Amberglass']},
    {id:'ZONE_010',name:"Tyrant's Crown",levelRange:'Lv 42–45',locked:level<42,identity:'Royal ruins and sand-pillars surrounding the Sand Tyrant.',activities:['Sand Tyrant','Royal Chitin','regional mastery']},
  ] as const;
  const frostmarchCards=frostmarchCardsV21(level),frostmarchZones=frostmarchCards.zones,frostmarchDungeons=frostmarchCards.dungeons;
  const frostmarchProgress=serverFrostmarchProgress??frostmarchProgressFromState(state);
  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>TRAVEL</Text>
    <Text accessibilityRole="header" style={s.h}>Asterfall Regions</Text>
    <Text style={s.sub}>Your location controls which enemies and gathering activities are available.</Text>

    <View style={[s.currentCard,{borderColor:current.accent}]}><RegionArtwork regionId={current.id}/><View style={s.heroShade}/>

      <View style={s.flex}><Text style={s.overline}>CURRENT REGION</Text><Text style={s.currentName}>{current.name}</Text><Text style={s.sub}>{current.subtitle}</Text></View>
    </View>
    <EnvironmentBanner environment={environmentForZone(current.id)}/>

    <Panel accentColor={current.accent}>
      <View style={s.regionHubHead}><View style={s.flex}><Text style={s.section}>CURRENT REGION CONTENT</Text><Text style={s.title}>What can I do in {current.name}?</Text></View><Text style={s.regionLevel}>Lv {current.minLevel}–{current.maxLevel}</Text></View>
      <View style={s.regionStats}>
        <RegionStat label="HUNTS" value={currentSummary.combatReady+'/'+currentSummary.combatTotal}/>
        <RegionStat label="GATHER" value={currentSummary.gatheringReady+'/'+currentSummary.gatheringTotal}/>
        <RegionStat label="BOSSES" value={currentSummary.bossesReady+'/'+currentSummary.bossesTotal}/>
      </View>
      <Text style={s.sub}>{currentSummary.gatheringSkills.length?'Gathering: '+currentSummary.gatheringSkills.join(', '):'No gathering nodes in this region yet.'}</Text>
      <View style={s.actions}><View style={s.flex}><GameButton compact title="Combat" onPress={onOpenCombat}/></View><View style={s.flex}><GameButton compact title="Skills" tone="secondary" onPress={onOpenSkills}/></View>{onCoop?<View style={s.flex}><GameButton compact title="Co-op" tone="secondary" onPress={onCoop}/></View>:null}</View>
    </Panel>

    {goalRegionId&&goalRegionId!==current.id?<View style={s.goalRoute}><Text style={s.goalRouteLabel}>WORKING TOWARD ROUTE</Text><Text style={s.sub}>Your pinned goal continues in {WORLD_ZONES.find(zone=>zone.id===goalRegionId)?.name??goalRegionId}. It is promoted to the top of Travel Elsewhere below.</Text></View>:null}

    {storyRegion&&<RegionalStoryLeadsPanel state={state} regionId={storyRegion} onOpenCombat={()=>onOpenCombat()}/>}
    {sunscar&&<><SunscarRegionPanel zones={sunscarZones}/>{onRegionalRewardsChanged?<RegionalCombatPanel state={state} onRewardsChanged={onRegionalRewardsChanged}/>:null}</>}
    {frostmarch&&<>
      <FrostmarchRegionPanel zones={frostmarchZones} progress={frostmarchProgress} contentVersion={activeFrostmarchVersion??undefined} weather={{name:environment.weatherName,endsInSeconds:Math.max(0,Math.floor((environment.changesAtMs-Date.now())/1000)),summary:environment.weatherName+' remains readable through the server-backed Season/Weather system.'}} dungeons={frostmarchDungeons} onZone={zoneId=>onOpenCombat(zoneId)} onDungeon={onCoop}/>
      <RegionalJournalPanel name="Frostmarch" progress={frostmarchProgress}/>
    </>}

    <Text style={s.section}>TRAVEL ELSEWHERE</Text>
    <View style={s.unlockCard}><View style={s.unlockHead}><View style={s.flex}><Text style={s.unlockLabel}>{next?'NEXT REGION UNLOCK':'REGION PROGRESSION'}</Text><Text style={s.unlockTitle}>{next?next.name:'All authored regions unlocked'}</Text></View>{next?<Text style={s.unlockLevel}>Lv {level}/{next.minLevel}</Text>:<Text style={s.unlockDone}>COMPLETE</Text>}</View>{next?<><View style={s.unlockTrack}><View style={[s.unlockFill,{width:(nextUnlockProgress+'%') as any}]}/></View><Text style={s.unlockMeta}>{Math.max(0,next.minLevel-level)} level{next.minLevel-level===1?'':'s'} until travel unlock.</Text></>:<Text style={s.unlockMeta}>Every currently authored region can be travelled to.</Text>}</View>
    {travelRegions.map(zone=>{
      const unlocked=level>=zone.minLevel,environment=environmentForZone(zone.id),summary=regionActivitySummary(state,zone.id),goalTarget=goalRegionId===zone.id;
      const content=unlocked?'Hunts '+summary.combatReady+'/'+summary.combatTotal+' · Gather '+summary.gatheringReady+'/'+summary.gatheringTotal+(summary.bossesTotal?' · Boss '+summary.bossesReady+'/'+summary.bossesTotal:''):(summary.combatTotal+' hunts · '+summary.gatheringTotal+' gathering'+(summary.bossesTotal?' · '+summary.bossesTotal+' boss':''));
      return <View key={zone.id} style={[s.destination,goalTarget&&s.goalDestination]}>
        <View style={s.thumbnail}><RegionArtwork regionId={zone.id} muted={!unlocked}/>{!unlocked&&<View style={s.lockedTag}><Text style={s.lockedText}>Lv. {zone.minLevel}</Text></View>}</View>
        <View style={s.flex}>
          <View style={s.destinationHead}><Text style={s.destinationName}>{zone.name}</Text>{goalTarget?<Text style={s.goalBadge}>GOAL</Text>:null}</View>
          <Text style={s.destinationMeta}>{unlocked?`Levels ${zone.minLevel}–${zone.maxLevel} · ${environment.weatherSymbol} ${environment.weatherName}`:`Unlocks at level ${zone.minLevel}`}</Text>
          <Text numberOfLines={1} style={s.destinationContent}>{content}</Text>
          {unlocked&&<Text numberOfLines={2} style={s.destinationSub}>{zone.subtitle}</Text>}
          <View style={s.travelButton}><GameButton compact title={unlocked?'Travel':`Lv. ${zone.minLevel}`} disabled={!unlocked} tone="secondary" onPress={()=>onTravel(zone.id)}/></View>
        </View>
      </View>;
    })}
  </ScrollView>;
}

function RegionStat({label,value}:{label:string;value:string}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.regionStat}><Text style={s.regionStatLabel}>{label}</Text><Text style={s.regionStatValue}>{value}</Text></View>}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  root:{padding:spacing.md,gap:10,paddingBottom:spacing.xl},
  kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'700',letterSpacing:1.2},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  flex:{flex:1,minWidth:0},
  heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:C.dark?'rgba(5,12,20,.64)':'rgba(255,255,255,.68)'},thumbnail:{width:68,height:76,borderRadius:12,overflow:'hidden'},lockedTag:{position:'absolute',bottom:0,left:0,right:0,padding:4,backgroundColor:C.dark?'rgba(8,17,29,.80)':'rgba(255,255,255,.90)'},lockedText:{color:C.muted,textAlign:'center',fontSize:11},currentCard:{minHeight:150,overflow:'hidden',flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.lg},
  regionSymbol:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:32,backgroundColor:equipmentColors.stage},
  symbol:{fontSize:31,fontWeight:'700'},
  overline:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  currentName:{...typography.title,color:C.text,fontSize:22},
  actions:{flexDirection:'row',gap:spacing.sm,marginTop:6},
  section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  regionHubHead:{flexDirection:'row',alignItems:'center',gap:8},regionLevel:{...typography.caption,color:C.info,fontWeight:'900'},regionStats:{flexDirection:'row',gap:6},regionStat:{flex:1,minWidth:0,padding:7,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},regionStatLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.55},regionStatValue:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  unlockCard:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},unlockHead:{flexDirection:'row',alignItems:'center',gap:8},unlockLabel:{fontSize:8.5,color:C.muted,fontWeight:'900',letterSpacing:.7},unlockTitle:{...typography.bodyStrong,color:C.text},unlockLevel:{...typography.bodyStrong,color:C.info,fontWeight:'900'},unlockDone:{fontSize:9,color:C.good,fontWeight:'900'},unlockTrack:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:C.bg},unlockFill:{height:'100%',borderRadius:3,backgroundColor:C.accent},unlockMeta:{...typography.caption,color:C.muted},
  destination:{minHeight:92,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},
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
  travelButton:{alignSelf:'flex-start',minWidth:88,marginTop:5},
  progress:{...typography.caption,color:C.muted,textAlign:'center'},
});}

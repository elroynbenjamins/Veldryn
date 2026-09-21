import {useEffect,useState,useMemo} from 'react';
import {RegionArtwork} from '../components/RegionArtwork';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {WORLD_ZONES} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {HERB_NODES} from '../content/herbalism';
import {MONSTERS} from '../content/monsters';
import {currentRegionId} from '../core/combat-region';
import {nextRegionUnlock} from '../core/world-navigation';
import {environmentForZone} from '../core/world-weather';
import {EnvironmentBanner} from '../components/EnvironmentBanner';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {FrostmarchRegionPanel} from '../components/FrostmarchRegionPanel';
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
  goalRegionId?:string;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onCoop,goalRegionId}:Props){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const level=state.character!.level,currentId=currentRegionId(state);
  const current=WORLD_ZONES.find(zone=>zone.id===currentId)??WORLD_ZONES[0];
  const environment=environmentForZone(current.id);
  const next=nextRegionUnlock(level);
  const combatCount=MONSTERS.filter(monster=>monster.zone===current.name&&!monster.boss).length;
  const gathering=[...GATHERING,...HERB_NODES].filter(activity=>activity.zoneId===current.id);
  const storyRegion=currentId==='SUNSCAR'||currentId==='FROSTMARCH'||currentId==='ASHLANDS'?currentId:undefined;

  const frostmarch=current.id==='FROSTMARCH';
  const [serverFrostmarchProgress,setServerFrostmarchProgress]=useState<RegionProgressV21|null>(null);
  const [activeFrostmarchVersion,setActiveFrostmarchVersion]=useState<string|null>(null);
  useEffect(()=>{
    let mounted=true;
    if(!frostmarch){setServerFrostmarchProgress(null);setActiveFrostmarchVersion(null);return ()=>{mounted=false;};}
    void Promise.all([loadFrostmarchProgressV21(),loadActiveFrostmarchContentVersionV21()]).then(([progress,version])=>{if(mounted){setServerFrostmarchProgress(version?.startsWith('frostmarch-v21.')?progress:null);setActiveFrostmarchVersion(version);}}).catch(()=>{if(mounted){setServerFrostmarchProgress(null);setActiveFrostmarchVersion(null);}});
    return ()=>{mounted=false;};
  },[frostmarch]);
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
      <Text style={s.title}>Activities in {current.name}</Text>
      <Text style={s.sub}>{combatCount} combat encounter{combatCount===1?'':'s'} · {gathering.length?gathering.map(entry=>entry.skillId).filter((value,index,list)=>list.indexOf(value)===index).join(', '):'no gathering nodes'}</Text>
      <View style={s.actions}><View style={s.flex}><GameButton title="Open Combat" onPress={onOpenCombat}/></View><View style={s.flex}><GameButton title="Open Skills" tone="secondary" onPress={onOpenSkills}/></View></View>
    </Panel>

    {storyRegion&&<RegionalStoryLeadsPanel state={state} regionId={storyRegion} onOpenCombat={()=>onOpenCombat()}/>}

    {goalRegionId&&goalRegionId!==current.id?<View style={s.goalRoute}><Text style={s.goalRouteLabel}>WORKING TOWARD ROUTE</Text><Text style={s.sub}>Travel to {WORLD_ZONES.find(zone=>zone.id===goalRegionId)?.name??goalRegionId} to continue your pinned goal.</Text></View>:null}
    <Text style={s.section}>CHOOSE A DESTINATION</Text>
    {WORLD_ZONES.filter(zone=>zone.id!==current.id).map(zone=>{
      const unlocked=level>=zone.minLevel,active=zone.id===current.id,environment=environmentForZone(zone.id);
      const goalTarget=goalRegionId===zone.id;return <View key={zone.id} style={[s.destination,active&&{borderColor:zone.accent},goalTarget&&s.goalDestination]}>
        <View style={s.thumbnail}><RegionArtwork regionId={zone.id} muted={!unlocked}/>{!unlocked&&<View style={s.lockedTag}><Text style={s.lockedText}>Lv. {zone.minLevel}</Text></View>}</View>
        <View style={s.flex}>
          <View style={s.destinationHead}><Text style={s.destinationName}>{zone.name}</Text>{goalTarget?<Text style={s.goalBadge}>GOAL</Text>:null}</View>
          <Text style={s.destinationMeta}>{unlocked?`Levels ${zone.minLevel}–${zone.maxLevel} · ${environment.weatherSymbol} ${environment.weatherName}`:`Unlocks at level ${zone.minLevel}`}</Text>
          {unlocked&&<Text style={s.destinationSub}>{zone.subtitle}</Text>}
        <View style={s.travelButton}><GameButton title={active?'Here':unlocked?'Travel':`Lv. ${zone.minLevel}`} disabled={active||!unlocked} tone={active?'primary':'secondary'} onPress={()=>onTravel(zone.id)}/></View></View>
      </View>;
    })}

    {onCoop&&<Panel><Text style={s.title}>Co-op Expeditions</Text><Text style={s.sub}>Group expeditions are entered separately from regional solo activities.</Text><GameButton title="Open Co-op Expeditions" tone="secondary" onPress={onCoop}/></Panel>}
    <Text style={s.progress}>{next?`Next region: ${next.name} at character level ${next.minLevel}.`:'All authored regions are unlocked.'}</Text>
    {frostmarch&&<>
      <FrostmarchRegionPanel zones={frostmarchZones} progress={frostmarchProgress} contentVersion={activeFrostmarchVersion??undefined} weather={{name:environment.weatherName,endsInSeconds:Math.max(0,Math.floor((environment.changesAtMs-Date.now())/1000)),summary:environment.weatherName+' remains readable through the server-backed Season/Weather system.'}} dungeons={frostmarchDungeons} onZone={zoneId=>onOpenCombat(zoneId)} onDungeon={onCoop}/>
      <RegionalJournalPanel name="Frostmarch" progress={frostmarchProgress}/>
    </>}
  </ScrollView>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  root:{padding:spacing.lg,gap:spacing.md,paddingBottom:spacing.xl},
  kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'700',letterSpacing:1.2},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  flex:{flex:1,minWidth:0},
  heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,20,.6)'},thumbnail:{width:76,height:84,borderRadius:12,overflow:'hidden'},lockedTag:{position:'absolute',bottom:0,left:0,right:0,padding:4,backgroundColor:'#08111dcc'},lockedText:{color:C.muted,textAlign:'center',fontSize:11},currentCard:{minHeight:172,overflow:'hidden',flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.lg},
  regionSymbol:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:32,backgroundColor:equipmentColors.stage},
  symbol:{fontSize:31,fontWeight:'700'},
  overline:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  currentName:{...typography.title,color:C.text,fontSize:22},
  actions:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.sm},
  section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  destination:{minHeight:104,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},
  smallSymbol:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:22,backgroundColor:equipmentColors.stage},
  smallSymbolText:{fontSize:21,fontWeight:'700'},
  destinationHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  destinationName:{...typography.bodyStrong,color:C.text},
  goalDestination:{borderColor:C.info,borderWidth:2},
  goalBadge:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.8},
  goalRoute:{padding:spacing.sm,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.infoSurface},
  goalRouteLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.8},
  destinationMeta:{...typography.caption,color:C.info,fontWeight:'600'},
  destinationSub:{fontSize:12,lineHeight:17,color:C.muted},
  travelButton:{alignSelf:'flex-start',minWidth:88,marginTop:8},
  progress:{...typography.caption,color:C.muted,textAlign:'center'},
});}

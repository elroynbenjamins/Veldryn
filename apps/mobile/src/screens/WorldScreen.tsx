import {useEffect,useMemo,useState} from 'react';
import {RegionArtwork} from '../components/RegionArtwork';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
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
import {SearchField} from '../components/SearchField';
import {GameButton} from '../components/GameButton';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {FrostmarchRegionPanel} from '../components/FrostmarchRegionPanel';
import {RegionalJournalPanel} from '../components/RegionalJournalPanel';
import {RegionCompletionPanel} from '../components/RegionCompletionPanel';
import {frostmarchProgressFromState,type RegionProgressV21} from '../core/region-content-v21';
import {loadFrostmarchProgressV21} from '../online/regional-content-v21';

type Props={
  state:GameState;
  onTravel:(regionId:string)=>void;
  onOpenCombat:(zoneId?:string)=>void;
  onOpenSkills:()=>void;
  onCoop?:(dungeonId?:string)=>void;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onCoop}:Props){
  const level=state.character!.level,currentId=currentRegionId(state);
  const [regionQuery,setRegionQuery]=useState(''),[regionFilterOpen,setRegionFilterOpen]=useState(false),[regionStatus,setRegionStatus]=useState<'all'|'open'|'locked'>('all'),[regionSort,setRegionSort]=useState<'level'|'name'>('level');
  const current=WORLD_ZONES.find(zone=>zone.id===currentId)??WORLD_ZONES[0];
  const environment=environmentForZone(current.id);
  const next=nextRegionUnlock(level);
  const combatCount=MONSTERS.filter(monster=>monster.zone===current.name&&!monster.boss).length;
  const gathering=[...GATHERING,...HERB_NODES].filter(activity=>activity.zoneId===current.id);
  const destinationRows=useMemo(()=>WORLD_ZONES.filter(zone=>zone.id!==current.id).filter(zone=>{const unlocked=level>=zone.minLevel;if(regionStatus==='open'&&!unlocked)return false;if(regionStatus==='locked'&&unlocked)return false;const term=regionQuery.trim().toLowerCase();return !term||(zone.name+' '+zone.subtitle).toLowerCase().includes(term)}).sort((a,b)=>regionSort==='name'?a.name.localeCompare(b.name):a.minLevel-b.minLevel||a.name.localeCompare(b.name)),[current.id,level,regionQuery,regionStatus,regionSort]);
  const activeRegionFilters=regionStatus==='all'?0:1;

  const frostmarch=current.id==='FROSTMARCH';
  const [serverFrostmarchProgress,setServerFrostmarchProgress]=useState<RegionProgressV21|null>(null);
  useEffect(()=>{
    let mounted=true;
    if(!frostmarch){setServerFrostmarchProgress(null);return ()=>{mounted=false;};}
    void loadFrostmarchProgressV21().then(progress=>{if(mounted)setServerFrostmarchProgress(progress);}).catch(()=>{if(mounted)setServerFrostmarchProgress(null);});
    return ()=>{mounted=false;};
  },[frostmarch]);
  const frostmarchZones=[
    {id:'ZONE_011',name:'Thawgate',levelRange:'Lv 45–50',locked:level<45,identity:'Fortified northern gate and last dependable shelter.',activities:['Frostiron'],hazards:['black ice']},
    {id:'ZONE_012',name:'Whitepine Reach',levelRange:'Lv 48–56',locked:level<48,identity:'Snow forest of false trails and frozen treants.',activities:['Whitepine Log','Rime Resin'],hazards:['whiteout trails']},
    {id:'ZONE_013',name:'Shiverlake',levelRange:'Lv 52–60',locked:level<52,identity:'Frozen lake with under-ice ruins and resonant fish.',activities:['Icefin','Bellfin Scale'],hazards:['thin ice']},
    {id:'ZONE_014',name:'Choir Caverns',levelRange:'Lv 57–67',locked:level<57,identity:'Singing ice caves where casts must be interrupted in order.',activities:['Rimeglass','Choir Bloom'],hazards:['resonance stacks']},
    {id:'ZONE_015',name:'Wyrmspine',levelRange:'Lv 62–70',locked:level<62,identity:'High mountain lair of the Frost Wyrm.',activities:['Wyrm Scale','Frozen Heart'],hazards:['breath lines','ice prison']},
  ] as const;
  const frostmarchProgress=serverFrostmarchProgress??frostmarchProgressFromState(state);
  const frostmarchDungeons=[
    {id:'COP_007',name:'Whitepine Hunt',minLevel:52,locked:level<52,modeAvailability:'live_and_q' as const},
    {id:'COP_008',name:'Shiverlake Descent',minLevel:58,locked:level<58,modeAvailability:'live_and_q' as const},
    {id:'COP_009',name:'Choir Caverns',minLevel:64,locked:level<64,modeAvailability:'live_and_q' as const},
  ] as const;
  return <><ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>TRAVEL</Text>
    <Text accessibilityRole="header" style={s.h}>Asterfall Regions</Text>
    <Text style={s.sub}>Your location controls which enemies and gathering activities are available.</Text>

    <View style={[s.currentCard,{borderColor:current.accent}]}><RegionArtwork regionId={current.id}/><View style={s.heroShade}/>

      <View style={s.flex}><Text style={s.overline}>CURRENT REGION</Text><Text style={s.currentName}>{current.name}</Text><Text style={s.sub}>{current.subtitle}</Text></View>
    </View>
    <EnvironmentBanner environment={environmentForZone(current.id)}/>
    <RegionCompletionPanel state={state} regionId={current.id}/>

    <Panel accentColor={current.accent}>
      <Text style={s.title}>Activities in {current.name}</Text>
      <Text style={s.sub}>{combatCount} combat encounter{combatCount===1?'':'s'} · {gathering.length?gathering.map(entry=>entry.skillId).filter((value,index,list)=>list.indexOf(value)===index).join(', '):'no gathering nodes'}</Text>
      <View style={s.actions}><View style={s.flex}><GameButton title="Open Combat" onPress={onOpenCombat}/></View><View style={s.flex}><GameButton title="Open Skills" tone="secondary" onPress={onOpenSkills}/></View></View>
    </Panel>

    <Text style={s.section}>CHOOSE A DESTINATION</Text>
    <SearchField value={regionQuery} onChangeText={setRegionQuery} placeholder="Search regions…" placeholderTextColor={C.muted}/>
    <View style={s.filterToolbar}><View style={s.flex}><GameButton title={`Filters${activeRegionFilters?` · ${activeRegionFilters}`:''} ▾`} tone={activeRegionFilters?'primary':'secondary'} onPress={()=>setRegionFilterOpen(true)}/></View><View style={s.flex}><GameButton title={`Sort: ${regionSort==='level'?'Recommended level':'Name'} ▾`} tone="secondary" onPress={()=>setRegionFilterOpen(true)}/></View></View>
    {destinationRows.map(zone=>{
      const unlocked=level>=zone.minLevel,active=zone.id===current.id,environment=environmentForZone(zone.id);
      return <View key={zone.id} style={[s.destination,active&&{borderColor:zone.accent}]}>
        <View style={s.thumbnail}><RegionArtwork regionId={zone.id} muted={!unlocked}/>{!unlocked&&<View style={s.lockedTag}><Text style={s.lockedText}>Lv. {zone.minLevel}</Text></View>}</View>
        <View style={s.flex}>
          <Text style={s.destinationName}>{zone.name}</Text>
          <Text style={s.destinationMeta}>{unlocked?`Levels ${zone.minLevel}–${zone.maxLevel} · ${environment.weatherSymbol} ${environment.weatherName}`:`Unlocks at level ${zone.minLevel}`}</Text>
          {unlocked&&<Text style={s.destinationSub}>{zone.subtitle}</Text>}
        <View style={s.travelButton}><GameButton title={active?'Here':unlocked?'Travel':`Lv. ${zone.minLevel}`} disabled={active||!unlocked} tone={active?'primary':'secondary'} onPress={()=>onTravel(zone.id)}/></View></View>
      </View>;
    })}

    {onCoop&&<Panel><Text style={s.title}>Co-op Expeditions</Text><Text style={s.sub}>Group expeditions are entered separately from regional solo activities.</Text><GameButton title="Open Co-op Expeditions" tone="secondary" onPress={onCoop}/></Panel>}
    <Text style={s.progress}>{next?`Next region: ${next.name} at character level ${next.minLevel}.`:'All authored regions are unlocked.'}</Text>
    {frostmarch&&<>
      <FrostmarchRegionPanel zones={frostmarchZones} progress={frostmarchProgress} weather={{name:environment.weatherName,endsInSeconds:Math.max(0,Math.floor((environment.changesAtMs-Date.now())/1000)),summary:environment.weatherName+' remains readable through the server-backed Season/Weather system.'}} dungeons={frostmarchDungeons} onZone={zoneId=>onOpenCombat(zoneId)} onDungeon={onCoop}/>
      <RegionalJournalPanel name="Frostmarch" progress={frostmarchProgress}/>
    </>}
  </ScrollView><Modal visible={regionFilterOpen} transparent animationType="slide" onRequestClose={()=>setRegionFilterOpen(false)}><View style={s.filterBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setRegionFilterOpen(false)}/><View style={s.filterSheet}><Text style={s.title}>World Filters</Text><Text style={s.filterLabel}>Region state</Text>{(['all','open','locked'] as const).map(value=><Pressable key={value} onPress={()=>setRegionStatus(value)} style={[s.filterOption,regionStatus===value&&s.filterOptionActive]}><Text style={s.filterOptionText}>{regionStatus===value?'✓ ':''}{value==='all'?'Any region':value==='open'?'Unlocked':'Locked'}</Text></Pressable>)}<Text style={s.filterLabel}>Sort by</Text>{(['level','name'] as const).map(value=><Pressable key={value} onPress={()=>setRegionSort(value)} style={[s.filterOption,regionSort===value&&s.filterOptionActive]}><Text style={s.filterOptionText}>{regionSort===value?'✓ ':''}{value==='level'?'Recommended level':'Name'}</Text></Pressable>)}<View style={s.filterToolbar}><View style={s.flex}><GameButton title="Reset" tone="secondary" onPress={()=>{setRegionStatus('all');setRegionSort('level')}}/></View><View style={s.flex}><GameButton title="Apply Filters" onPress={()=>setRegionFilterOpen(false)}/></View></View></View></View></Modal></>;
}

const s=StyleSheet.create({
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
  actions:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.sm},filterToolbar:{flexDirection:'row',gap:spacing.sm,alignItems:'center'},filterBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},filterSheet:{backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,padding:spacing.lg,gap:8},filterLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8,marginTop:8},filterOption:{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},filterOptionActive:{borderColor:C.accent,backgroundColor:C.panel2},filterOptionText:{color:C.text,fontWeight:'800'},
  section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'700',letterSpacing:1},
  destination:{minHeight:104,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},
  smallSymbol:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:22,backgroundColor:equipmentColors.stage},
  smallSymbolText:{fontSize:21,fontWeight:'700'},
  destinationName:{...typography.bodyStrong,color:C.text},
  destinationMeta:{...typography.caption,color:C.info,fontWeight:'600'},
  destinationSub:{fontSize:12,lineHeight:17,color:C.muted},
  travelButton:{alignSelf:'flex-start',minWidth:88,marginTop:8},
  progress:{...typography.caption,color:C.muted,textAlign:'center'},
});

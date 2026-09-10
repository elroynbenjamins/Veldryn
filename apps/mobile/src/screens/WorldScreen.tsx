import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {WORLD_ZONES} from '../content/world-map';
import {GATHERING} from '../content/skills';
import {MONSTERS} from '../content/monsters';
import {currentRegionId} from '../core/combat-region';
import {nextRegionUnlock} from '../core/world-navigation';
import {environmentForZone} from '../core/world-weather';
import {EnvironmentBanner} from '../components/EnvironmentBanner';
import {Panel} from '../components/Panel';
import {GameButton} from '../components/GameButton';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

type Props={
  state:GameState;
  onTravel:(regionId:string)=>void;
  onOpenCombat:()=>void;
  onOpenSkills:()=>void;
  onCoop?:()=>void;
};

export function WorldScreen({state,onTravel,onOpenCombat,onOpenSkills,onCoop}:Props){
  const level=state.character!.level,currentId=currentRegionId(state);
  const current=WORLD_ZONES.find(zone=>zone.id===currentId)??WORLD_ZONES[0];
  const next=nextRegionUnlock(level);
  const combatCount=MONSTERS.filter(monster=>monster.zone===current.name&&!monster.boss).length;
  const gathering=GATHERING.filter(activity=>activity.zoneId===current.id);

  return <ScrollView contentContainerStyle={s.root}>
    <Text style={s.kicker}>TRAVEL</Text>
    <Text accessibilityRole="header" style={s.h}>Asterfall Regions</Text>
    <Text style={s.sub}>Your location controls which enemies and gathering activities are available.</Text>

    <View style={[s.currentCard,{borderColor:current.accent}]}>
      <View style={[s.regionSymbol,{borderColor:current.accent}]}><Text style={[s.symbol,{color:current.accent}]}>{current.symbol}</Text></View>
      <View style={s.flex}><Text style={s.overline}>CURRENT REGION</Text><Text style={s.currentName}>{current.name}</Text><Text style={s.sub}>{current.subtitle}</Text></View>
    </View>
    <EnvironmentBanner environment={environmentForZone(current.id)}/>

    <Panel accentColor={current.accent}>
      <Text style={s.title}>Activities in {current.name}</Text>
      <Text style={s.sub}>{combatCount} combat encounter{combatCount===1?'':'s'} · {gathering.length?gathering.map(entry=>entry.skillId).filter((value,index,list)=>list.indexOf(value)===index).join(', '):'no gathering nodes'}</Text>
      <View style={s.actions}><View style={s.flex}><GameButton title="Open Combat" onPress={onOpenCombat}/></View><View style={s.flex}><GameButton title="Open Skills" tone="secondary" onPress={onOpenSkills}/></View></View>
    </Panel>

    <Text style={s.section}>CHOOSE A DESTINATION</Text>
    {WORLD_ZONES.filter(zone=>zone.id!==current.id).map(zone=>{
      const unlocked=level>=zone.minLevel,active=zone.id===current.id,environment=environmentForZone(zone.id);
      return <View key={zone.id} style={[s.destination,active&&{borderColor:zone.accent}]}>
        <View style={[s.smallSymbol,{borderColor:unlocked?zone.accent:C.disabled}]}><Text style={[s.smallSymbolText,{color:unlocked?zone.accent:C.disabled}]}>{zone.symbol}</Text></View>
        <View style={s.flex}>
          <Text style={s.destinationName}>{zone.name}</Text>
          <Text style={s.destinationMeta}>{unlocked?`Levels ${zone.minLevel}–${zone.maxLevel} · ${environment.weatherSymbol} ${environment.weatherName}`:`Unlocks at level ${zone.minLevel}`}</Text>
          {unlocked&&<Text numberOfLines={1} style={s.destinationSub}>{zone.subtitle}</Text>}
        </View>
        <View style={s.travelButton}><GameButton title={active?'Here':unlocked?'Travel':`Lv. ${zone.minLevel}`} disabled={active||!unlocked} tone={active?'primary':'secondary'} onPress={()=>onTravel(zone.id)}/></View>
      </View>;
    })}

    {onCoop&&<Panel><Text style={s.title}>Co-op Expeditions</Text><Text style={s.sub}>Group expeditions are entered separately from regional solo activities.</Text><GameButton title="Open Co-op Expeditions" tone="secondary" onPress={onCoop}/></Panel>}
    <Text style={s.progress}>{next?`Next region: ${next.name} at character level ${next.minLevel}.`:'All current Asterfall regions are unlocked.'}</Text>
  </ScrollView>;
}

const s=StyleSheet.create({
  root:{padding:spacing.lg,gap:spacing.md,paddingBottom:spacing.xl},
  kicker:{...typography.caption,color:equipmentColors.gold,fontWeight:'900',letterSpacing:1.2},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  flex:{flex:1,minWidth:0},
  currentCard:{minHeight:112,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,backgroundColor:equipmentColors.panel,borderWidth:1,borderRadius:radii.lg},
  regionSymbol:{width:64,height:64,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:32,backgroundColor:equipmentColors.stage},
  symbol:{fontSize:31,fontWeight:'900'},
  overline:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
  currentName:{...typography.title,color:C.text,fontSize:22},
  actions:{flexDirection:'row',gap:spacing.sm,marginTop:spacing.sm},
  section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},
  destination:{minHeight:104,flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg},
  smallSymbol:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:22,backgroundColor:equipmentColors.stage},
  smallSymbolText:{fontSize:21,fontWeight:'900'},
  destinationName:{...typography.bodyStrong,color:C.text},
  destinationMeta:{...typography.caption,color:C.info,fontWeight:'800'},
  destinationSub:{fontSize:11,lineHeight:15,color:C.muted},
  travelButton:{width:88},
  progress:{...typography.caption,color:C.muted,textAlign:'center'},
});

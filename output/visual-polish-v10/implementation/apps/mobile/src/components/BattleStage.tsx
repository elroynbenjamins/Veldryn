import {StyleSheet,Text,View} from 'react-native';
import {MonsterDef} from '../content/monsters';
import {WORLD_ZONES} from '../content/world-map';
import {combatPresentation} from '../core/combat-presentation';
import {effectiveStats} from '../core/game';
import {GameState} from '../core/types';
import {C,radii,typography} from '../theme/theme';
import {CharacterPortrait} from './CharacterVisual';
import {MonsterPortraitFrame} from './MonsterPortraitFrame';
import {RegionArtwork} from './RegionArtwork';
import {StatBar} from './StatBar';

export function BattleStage({state,monster,elapsedSeconds,cycleSeconds}:{state:GameState;monster:MonsterDef;elapsedSeconds:number;cycleSeconds:number}){
 const view=combatPresentation(state,monster,elapsedSeconds,cycleSeconds),stats=effectiveStats(state);
 const region=WORLD_ZONES.find(zone=>zone.name===monster.zone);
 return <View style={s.stage}>
  <View style={s.header}><Text accessibilityRole="header" style={s.title}>Encounter preview</Text><Text style={[s.safety,{color:view.safety==='safe'?C.good:view.safety==='dangerous'?C.warning:C.info}]}>{view.safety}</Text></View>
  <View style={s.arena}><RegionArtwork regionId={region?.id??'GREENFIELDS'}/><View style={s.shade}/>
   <View style={s.combatants}><View style={s.side}><View style={s.portrait}><CharacterPortrait state={state} style={{width:96,height:120}}/></View><Text style={s.name}>{state.character!.name}</Text><Text style={s.hit}>≈ {view.playerHit} damage</Text></View>
    <View style={s.versus}><Text style={s.vs}>VS</Text></View>
    <View style={s.side}><View style={s.portrait}><MonsterPortraitFrame monster={monster} size={112} framed={false}/></View><Text style={s.name}>{monster.name}</Text><Text style={s.hit}>≈ {view.enemyHit} damage</Text></View>
   </View>
  </View>
  <View style={s.details}><Text style={s.ability}>{view.style.name}</Text><Text style={s.sub}>{view.style.description}</Text>
   <StatBar label="Current health" current={state.character!.currentHp} max={stats.hp} reduceMotion={state.settings.reduceMotion}/>
   <StatBar label="Estimated enemy health" current={view.enemyHp} max={view.enemyMaxHp} reduceMotion={state.settings.reduceMotion}/>
   <Text style={s.note}>Illustrative encounter timing. Collect rewards to settle completed actions and health changes.</Text>
  </View>
 </View>;
}
const s=StyleSheet.create({stage:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,overflow:'hidden'},header:{padding:12,flexDirection:'row',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:8},title:{...typography.title,color:C.text},safety:{...typography.caption,textTransform:'capitalize',fontWeight:'600'},arena:{minHeight:218,overflow:'hidden',justifyContent:'center'},shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,12,20,.58)'},combatants:{flexDirection:'row',alignItems:'flex-start',padding:10,gap:4},side:{flex:1,minWidth:0,alignItems:'center',gap:4},portrait:{width:'100%',maxWidth:128,height:128,alignItems:'center',justifyContent:'flex-end',backgroundColor:'rgba(5,12,20,.6)',borderRadius:36,overflow:'hidden'},name:{...typography.bodyStrong,color:C.text,textAlign:'center'},hit:{...typography.caption,color:'#d5e0ec',textAlign:'center'},versus:{width:24,paddingTop:60,alignItems:'center'},vs:{...typography.caption,color:C.accent,fontWeight:'600'},details:{padding:12,gap:10},ability:{...typography.bodyStrong,color:C.accent},sub:{...typography.body,color:C.muted},note:{...typography.caption,color:C.muted}});

import {useMemo} from 'react';
import React,{useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {monsterMasteryGuidance,masterySummary,MONSTER_MASTERY_MILESTONES} from '../core/monster-mastery-presentation';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {StatBar} from './StatBar';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';

export function MonsterMasteryPanel({state}:{state:GameState}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);
 const [open,setOpen]=useState(false);
 const available=MONSTERS.filter(m=>!m.boss&&(state.unlockedMonsterIds.includes(m.id)||(state.character?.monsterMasteryPoints?.[m.id]??0)>0));
 const summary=masterySummary(state,available.map(monster=>monster.id));
 return <Panel>
  <Text style={s.title}>Monster mastery</Text>
  <Text style={s.body}>Each kill gives one species mastery point. Mastery now gates Challenge Hunts as well as combat bonuses, drop knowledge and badges.</Text>
  <View style={s.summary}><Summary label="TRACKED" value={summary.species}/><Summary label="RANKS" value={summary.totalRanks}/><Summary label="CLEARS" value={summary.challengeClears}/><Summary label="CONQUERED" value={summary.conqueredSpecies}/></View>
  <GameButton title={open?'Hide mastery':'View species mastery'} onPress={()=>setOpen(!open)}/>
  {open&&<><View style={s.ladder}><Text style={s.ladderTitle}>MASTERY LADDER</Text>{MONSTER_MASTERY_MILESTONES.map(row=><Text key={row.rank+row.label} style={s.ladderRow}>Rank {row.rank} · {row.label}</Text>)}</View>
   {available.map(m=>{const p=monsterMasteryGuidance(state,m.id),rankProgress=p.rank>=30?25:p.points%25;return <View key={m.id} style={s.entry}>
    <View style={s.head}><View style={s.flex}><Text style={s.name}>{p.badgeUnlocked?'◆ ':''}{m.name}</Text><Text style={s.rank}>Rank {p.rank}/30 · {p.points} mastery points</Text></View>{p.clearSummary.conquered?<Text style={s.conquered}>CONQUERED</Text>:p.rank>=30?<Text style={s.max}>MAX</Text>:null}</View>
    <StatBar reduceMotion={state.settings.reduceMotion} label={p.rank>=30?'Mastery complete':`${p.killsToNextRank} kills to Rank ${p.rank+1}`} current={rankProgress} max={25}/>
    <Text style={s.body}>+{Math.round(p.damageBonus*100)}% damage · +{Math.round(p.materialBonus*100)}% normal materials</Text>
    <View style={s.challengeRow}>{p.challengeUnlocks.map(challenge=><View key={challenge.id} style={[s.challenge,challenge.cleared?s.challengeCleared:challenge.unlocked?s.challengeOn:s.challengeOff]}><Text style={[s.challengeText,challenge.cleared?s.challengeTextCleared:challenge.unlocked?s.challengeTextOn:s.challengeTextOff]}>{challenge.cleared?'✓':challenge.unlocked?'◇':'○'} {challenge.def.shortName} · {challenge.cleared?'CLEAR':challenge.unlocked?'READY':`R${challenge.def.masteryRank}`}</Text></View>)}</View><Text style={p.clearSummary.conquered?s.complete:s.body}>Challenge Conquest · {p.clearSummary.cleared}/{p.clearSummary.total}{p.clearSummary.conquered?' · All four tiers defeated':''}</Text>
    {p.next?<View style={s.next}><Text style={s.nextLabel}>NEXT MILESTONE · RANK {p.next.rank}</Text><Text style={s.nextTitle}>{p.next.label}</Text><Text style={s.body}>{p.next.detail}</Text><Text style={s.nextKills}>{p.killsToNextMilestone} kills remaining</Text></View>:<Text style={s.complete}>All species mastery milestones unlocked.</Text>}
    {p.dropKnowledge?<><Text style={s.dropTitle}>KNOWN DROPS</Text>{m.drops.map(d=><Text key={d.itemId} style={s.drop}>{itemDef(d.itemId).name} · {(d.chance*100).toFixed(2)}% · {d.min}–{d.max}</Text>)}</>:<Text style={s.locked}>Reach Rank 10 to reveal the full base drop table.</Text>}
   </View>})}
  </>}
 </Panel>;
}
function Summary({label,value}:{label:string;value:number}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);return <View style={s.summaryCell}><Text style={s.summaryLabel}>{label}</Text><Text style={s.summaryValue}>{value}</Text></View>}
const createStyles=(C:any,equipmentColors:any)=>StyleSheet.create({
 title:{...typography.title,color:C.text},name:{...typography.bodyStrong,color:C.text,fontSize:15},rank:{...typography.caption,color:C.muted},body:{...typography.body,color:C.muted,lineHeight:19},
 entry:{gap:8,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line},head:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},max:{...typography.caption,color:C.good,fontWeight:'900'},conquered:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.6},
 summary:{flexDirection:'row',gap:6,flexWrap:'wrap'},summaryCell:{minWidth:68,flexGrow:1,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},summaryLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.6},summaryValue:{fontSize:16,color:C.text,fontWeight:'900'},
 ladder:{gap:4,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},ladderTitle:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:.8},ladderRow:{...typography.caption,color:C.muted},
 challengeRow:{flexDirection:'row',flexWrap:'wrap',gap:5},challenge:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderRadius:99},challengeCleared:{borderColor:equipmentColors.goldSoft,backgroundColor:'#2b2417'},challengeOn:{borderColor:C.info,backgroundColor:'#132333'},challengeOff:{borderColor:C.line,backgroundColor:C.bg},challengeText:{fontSize:9,fontWeight:'900'},challengeTextCleared:{color:equipmentColors.goldSoft},challengeTextOn:{color:C.info},challengeTextOff:{color:C.muted},
 next:{gap:3,padding:9,borderLeftWidth:3,borderLeftColor:C.info,backgroundColor:C.panel2,borderRadius:6},nextLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:.5},nextTitle:{...typography.bodyStrong,color:C.text},nextKills:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},
 complete:{...typography.bodyStrong,color:C.good},dropTitle:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900'},drop:{...typography.caption,color:C.text},locked:{...typography.caption,color:C.muted},
});

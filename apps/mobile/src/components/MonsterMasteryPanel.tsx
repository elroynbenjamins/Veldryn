import React,{useState} from 'react';
import {Text,View,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import {MONSTERS} from '../content/monsters';
import {itemDef} from '../content/items';
import {monsterMastery} from '../core/monster-mastery';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,typography} from '../theme/theme';
export function MonsterMasteryPanel({state}:{state:GameState}){
 const [open,setOpen]=useState(false);
 const available=MONSTERS.filter(m=>!m.boss&&(state.unlockedMonsterIds.includes(m.id)||monsterMastery(state,m.id).points>0));
 return <Panel><Text style={s.title}>Monster mastery</Text><Text style={s.body}>Each defeated monster grants one point toward its own mastery. Every 25 points earns a rank, up to rank 30.</Text><GameButton title={open?'Hide mastery':'View species mastery'} onPress={()=>setOpen(!open)}/>
 {open&&available.map(m=>{const p=monsterMastery(state,m.id);return <View key={m.id} style={s.entry}><Text style={s.name}>{p.badgeUnlocked?'◆ ':''}{m.name} · Rank {p.rank}/30</Text><Text style={s.body}>{p.points}/{p.nextRankPoints} points · +{Math.round(p.damageBonus*100)}% damage · +{Math.round(p.materialBonus*100)}% normal materials</Text><Text style={s.body}>Rank 5: damage · Rank 10: drop knowledge · Rank 15: materials · Rank 25: mastery badge · Rank 30: maximum bonuses</Text>
 {m.id==='FOREST_TROLL'&&<Text style={s.body}>Rank 20 unlocks Briarhorn Cub.</Text>}
 {p.dropKnowledge?<><Text style={s.name}>Base drop table</Text>{m.drops.map(d=><Text key={d.itemId} style={s.body}>{itemDef(d.itemId).name} · {(d.chance*100).toFixed(2)}% · {d.min}–{d.max}</Text>)}</>:<Text style={s.body}>Drop knowledge unlocks at rank 10.</Text>}</View>})}</Panel>;
}
const s=StyleSheet.create({title:{...typography.title,color:C.text},name:{...typography.bodyStrong,color:C.text},body:{...typography.body,color:C.muted},entry:{gap:6,paddingVertical:12,borderBottomWidth:1,borderBottomColor:C.line}});

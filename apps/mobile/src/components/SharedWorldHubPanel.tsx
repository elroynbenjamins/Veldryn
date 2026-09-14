import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CrisisSummary,WorldBossSummary} from '../core/shared-world-v19';
import {formatCompact,fraction} from '../core/shared-world-v19';

export function SharedWorldHubPanel({crises,bosses,onOpenCrisis,onOpenBoss}:{crises:CrisisSummary[];bosses:WorldBossSummary[];onOpenCrisis?:(id:string)=>void;onOpenBoss?:(id:string)=>void}){
 if(!crises.length&&!bosses.length)return null;
 return <View style={s.wrap}><Text style={s.heading}>SHARED WORLD</Text>
  {crises.map(c=><Pressable key={c.instanceId} style={s.card} onPress={()=>onOpenCrisis?.(c.instanceId)}><View style={{flex:1}}><Text style={s.type}>REGIONAL CRISIS · {c.regionId.toUpperCase()}</Text><Text style={s.title}>{c.name}</Text><Text style={s.copy}>{c.currentStageName} · {Math.round(fraction(c.creditedPoints,c.targetPoints)*100)}% secured</Text></View><Text style={s.number}>{formatCompact(c.yourPoints)}</Text></Pressable>)}
  {bosses.map(b=><Pressable key={b.instanceId} style={[s.card,s.boss]} onPress={()=>onOpenBoss?.(b.instanceId)}><View style={{flex:1}}><Text style={s.type}>WORLD BOSS · {b.regionId.toUpperCase()}</Text><Text style={s.title}>{b.name}</Text><Text style={s.copy}>{b.phaseName} · {Math.round(fraction(b.remainingHp,b.maxHp)*100)}% HP remaining</Text></View><Text style={s.number}>{Math.max(0,b.dailyAttemptCap-b.attemptsToday)} fights</Text></Pressable>)}
 </View>
}
const s=StyleSheet.create({wrap:{gap:7},heading:{color:'#c9b574',fontWeight:'900',fontSize:10,letterSpacing:.8},card:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#13212b',borderWidth:1,borderColor:'#354b5c',borderRadius:9,padding:10},boss:{borderColor:'#5f4740',backgroundColor:'#211b1b'},type:{color:'#879eac',fontSize:8,fontWeight:'900'},title:{color:'#edf0f2',fontSize:13,fontWeight:'900'},copy:{color:'#9caeba',fontSize:10,marginTop:2},number:{color:'#e1c57b',fontSize:10,fontWeight:'900'}});

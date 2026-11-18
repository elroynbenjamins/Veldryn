import {useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionText} from '../i18n/progression';
import {sharedWorldAuthoredText} from '../i18n/shared-world-authored-de';
import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {CrisisSummary,WorldBossSummary} from '../core/shared-world-v19';
import {bossAttemptsRemaining,crisisStatusLabel,formatCompact,formatPercent,progressPercent,remainingPercent} from '../core/shared-world-v19';

export function SharedWorldHubPanel({crises,bosses,onOpenCrisis,onOpenBoss}:{crises:CrisisSummary[];bosses:WorldBossSummary[];onOpenCrisis?:(id:string)=>void;onOpenBoss?:(id:string)=>void}){
 const st=useSocialText(),language=useGameLanguage();
 const p=(text:string)=>progressionText(language,text);
 const authored=(text:string)=>sharedWorldAuthoredText(language,text);
 if(!crises.length&&!bosses.length)return null;
 return <View style={s.wrap}><Text style={s.heading}>{st("SHARED WORLD")}</Text>
  {crises.map(c=><Pressable key={c.instanceId} accessibilityRole="button" disabled={!onOpenCrisis} style={s.card} onPress={()=>onOpenCrisis?.(c.instanceId)}><View style={{flex:1}}><Text style={s.type}>{p('REGIONAL CRISIS ·')} {c.regionId.toUpperCase()}</Text><Text style={s.title}>{authored(c.name)}</Text><Text style={s.copy}>{authored(crisisStatusLabel(c))} · {formatPercent(language,progressPercent(c.creditedPoints,c.targetPoints))} {authored('secured')}</Text></View><Text style={s.number}>{formatCompact(c.yourPoints)}</Text></Pressable>)}
  {bosses.map(b=>{const remaining=bossAttemptsRemaining(b);return <Pressable key={b.instanceId} accessibilityRole="button" disabled={!onOpenBoss} style={[s.card,s.boss]} onPress={()=>onOpenBoss?.(b.instanceId)}><View style={{flex:1}}><Text style={s.type}>{p('WORLD BOSS ·')} {b.regionId.toUpperCase()}</Text><Text style={s.title}>{authored(b.name)}</Text><Text style={s.copy}>{authored(b.phaseName)} · {formatPercent(language,remainingPercent(b.remainingHp,b.maxHp))} {authored('HP remaining')}</Text></View>{b.state==='active'?<Text style={s.number}>{remaining} {authored(remaining===1?'fight':'fights')}</Text>:null}</Pressable>})}
 </View>
}
const s=StyleSheet.create({wrap:{gap:7},heading:{color:'#c9b574',fontWeight:'900',fontSize:10,letterSpacing:.8},card:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#13212b',borderWidth:1,borderColor:'#354b5c',borderRadius:9,padding:10},boss:{borderColor:'#5f4740',backgroundColor:'#211b1b'},type:{color:'#879eac',fontSize:8,fontWeight:'900'},title:{color:'#edf0f2',fontSize:13,fontWeight:'900'},copy:{color:'#9caeba',fontSize:10,marginTop:2},number:{color:'#e1c57b',fontSize:10,fontWeight:'900'}});

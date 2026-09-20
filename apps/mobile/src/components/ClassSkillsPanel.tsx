import {useMemo} from 'react';
import React,{useRef,useState} from 'react';
import {View,Text,StyleSheet} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {classSkillsFor} from '../content/class-skills';
import {characterClassSkills,normalizeTrainingFocus,type TrainingFocus} from '../core/class-skills';
import {progressWithinLevel} from '../core/progression';
import {offlineCapSeconds} from '../core/game';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {C,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
export function ClassSkillsPanel({state,now,onCommand}:{state:GameState;now:number;onCommand:(command:GameCommand)=>Promise<void>}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false),c=state.character;if(!c)return null;
 const skills=characterClassSkills(c),definitions=classSkillsFor(c.classId),focus=normalizeTrainingFocus(c.trainingFocus),drill=c.classTraining;
 const run=async(command:GameCommand)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await onCommand(command);}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{lock.current=false;setBusy(false);}};
 const act=(title:string,command:GameCommand,disabled=false)=><GameButton title={title} disabled={busy||disabled} onPress={()=>void run(command)}/>;
 const available=drill?Math.floor((Math.min(offlineCapSeconds(state)*1000,Math.max(0,now-drill.lastClaimAtMs))+drill.progressMs)/60000):0;
 return <Panel><Text style={s.title}>Class skills</Text><Text style={s.body}>Completed fights train both class skills. Their levels improve your combat stats and count toward companion requirements.</Text>
 {skills.map((skill,i)=>{const p=progressWithinLevel(skill.xp,skill.level);return <View key={skill.skillId} style={s.group}><Text style={s.name}>{definitions[i].name} · Level {skill.level}/100</Text><Text style={s.body}>{definitions[i].theme} · {skill.level===100?'Maximum level':`${p.current.toLocaleString()} / ${p.need.toLocaleString()} XP`}</Text></View>})}
 <Text style={s.name}>Training focus</Text>{(['balanced','primary','secondary'] as TrainingFocus[]).map(f=><View key={f}>{act(f==='balanced'?'Balanced · 50% / 50%':`${f==='primary'?definitions[0].name:definitions[1].name} · 75% / 25%`,{type:'class_focus',args:{focus:f}},focus===f)}</View>)}
 <Text style={s.body}>Changing focus preserves the split for a drill or fight already started. Both skills retain their full combat benefits.</Text>
 <Text style={s.name}>Safe training</Text><Text style={s.body}>One drill per minute, sharing 8 base class XP. Uses your {offlineCapSeconds(state)/3600}-hour offline cap. No character XP, Gold, drops, food use, or healing.</Text>
 {drill?<><Text style={s.body}>{available} completed drills ready to claim.</Text>{act('Claim training XP',{type:'claim'})}{act('Stop and claim',{type:'stop'})}</>:act('Start drills · replaces current activity',{type:'class_training'},skills.every(s=>s.level===100))}
 {error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>:null}</Panel>;
}
const createStyles=(C:any,equipmentColors:any)=>StyleSheet.create({title:{...typography.title,color:C.text},name:{...typography.bodyStrong,color:C.text},body:{...typography.body,color:C.muted},group:{gap:5,paddingVertical:8},error:{...typography.body,color:C.info}});

import React,{useMemo,useRef,useState} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {classSkillsFor} from '../content/class-skills';
import {characterClassSkills,normalizeTrainingFocus,type TrainingFocus} from '../core/class-skills';
import {progressWithinLevel} from '../core/progression';
import {offlineCapSeconds} from '../core/game';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

export function ClassSkillsPanel({state,now,onCommand,highlightedSkillId}:{state:GameState;now:number;onCommand:(command:GameCommand)=>Promise<void>;highlightedSkillId?:string}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const lock=useRef(false),c=state.character;if(!c)return null;
 const skills=characterClassSkills(c),definitions=classSkillsFor(c.classId),focus=normalizeTrainingFocus(c.trainingFocus),drill=c.classTraining;
 const run=async(command:GameCommand)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await onCommand(command);}catch(e){setError(e instanceof Error?e.message:'Action failed.');}finally{lock.current=false;setBusy(false);}};
 const act=(title:string,command:GameCommand,disabled=false,tone:'primary'|'secondary'='primary')=><GameButton title={title} compact disabled={busy||disabled} tone={tone} onPress={()=>void run(command)}/>;
 const available=drill?Math.floor((Math.min(offlineCapSeconds(state)*1000,Math.max(0,now-drill.lastClaimAtMs))+drill.progressMs)/60000):0;
 const rows=skills.map((skill,i)=>({skill,definition:definitions[i],index:i})).sort((a,b)=>Number(b.skill.skillId===highlightedSkillId)-Number(a.skill.skillId===highlightedSkillId));
 const stackFocus=width<370||fontScale>=1.2;
 return <Panel>
  <View style={s.heading}><View style={s.flex}><Text style={s.eyebrow}>CLASS TRAINING</Text><Text style={s.title}>Class skills</Text><Text style={s.body}>Fights train both specializations. Their levels improve combat stats and count toward companion requirements.</Text></View><View style={s.levelBadge}><Text style={s.levelBadgeText}>{skills.reduce((sum,row)=>sum+row.level,0)}</Text><Text style={s.levelBadgeLabel}>TOTAL</Text></View></View>
  {rows.map(({skill,definition,index})=>{const p=progressWithinLevel(skill.xp,skill.level),ratio=skill.level>=100?1:Math.min(1,p.current/Math.max(1,p.need)),highlighted=skill.skillId===highlightedSkillId;return <View key={skill.skillId} style={[s.skillCard,highlighted&&s.skillCardHighlighted]}>
    <View style={s.skillTop}><View style={s.flex}><Text style={s.skillRole}>{index===0?'PRIMARY':'SECONDARY'}</Text><Text style={s.name}>{definition.name}</Text><Text style={s.theme}>{definition.theme}</Text></View><Text style={s.level}>Lv {skill.level}</Text></View>
    <View style={s.progressMeta}><Text style={s.progressText}>{skill.level===100?'Mastered':`${p.current.toLocaleString()} / ${p.need.toLocaleString()} XP`}</Text><Text style={s.progressText}>{Math.round(ratio*100)}%</Text></View>
    <View style={s.track}><View style={[s.fill,{width:`${Math.max(skill.level===100?100:3,ratio*100)}%`}]}/></View>
  </View>})}
  <View style={s.section}><Text style={s.sectionLabel}>TRAINING FOCUS</Text><Text style={s.body}>Choose how new class XP is split. Existing drills and fights keep the split they started with.</Text>
   <View style={[s.focusRow,stackFocus&&s.focusStack]}>
    {(['balanced','primary','secondary'] as TrainingFocus[]).map(f=><View key={f} style={[s.focusButton,stackFocus&&s.focusButtonStack]}>{act(f==='balanced'?'Balanced · 50 / 50':`${f==='primary'?definitions[0].name:definitions[1].name} · 75 / 25`,{type:'class_focus',args:{focus:f}},focus===f,focus===f?'primary':'secondary')}</View>)}
   </View>
  </View>
  <View style={s.section}><View style={s.between}><View style={s.flex}><Text style={s.sectionLabel}>SAFE TRAINING</Text><Text style={s.body}>One drill per minute · 8 base class XP · uses your {offlineCapSeconds(state)/3600}h offline cap. No Gold, drops, food, healing or character XP.</Text></View>{drill?<View style={s.readyBadge}><Text style={s.readyNumber}>{available}</Text><Text style={s.readyLabel}>READY</Text></View>:null}</View>
   {drill?<View style={s.actionRow}><View style={s.flex}>{act('Claim training XP',{type:'claim'})}</View><View style={s.flex}>{act('Stop & claim',{type:'stop'},false,'secondary')}</View></View>:act('Start safe training',{type:'class_training'},skills.every(row=>row.level===100))}
  </View>
  {error?<Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>:null}
 </Panel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},heading:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},eyebrow:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1},title:{...typography.title,color:C.text},body:{...typography.body,color:C.muted},levelBadge:{minWidth:54,alignItems:'center',paddingHorizontal:8,paddingVertical:6,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.accentSurface},levelBadgeText:{...typography.title,color:C.accent},levelBadgeLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},
 skillCard:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},skillCardHighlighted:{borderColor:C.selectionLine,backgroundColor:C.selection},skillTop:{flexDirection:'row',alignItems:'flex-start',gap:8},skillRole:{fontSize:9,color:C.info,fontWeight:'900',letterSpacing:.8},name:{...typography.bodyStrong,color:C.text},theme:{...typography.caption,color:C.muted},level:{...typography.bodyStrong,color:C.accent},progressMeta:{flexDirection:'row',justifyContent:'space-between',gap:8},progressText:{...typography.caption,color:C.muted},track:{height:7,borderRadius:5,backgroundColor:C.bg,overflow:'hidden'},fill:{height:'100%',borderRadius:5,backgroundColor:C.good},
 section:{gap:spacing.sm,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line},sectionLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.9},focusRow:{flexDirection:'row',gap:6},focusStack:{flexDirection:'column'},focusButton:{flex:1,minWidth:0},focusButtonStack:{width:'100%'},between:{flexDirection:'row',alignItems:'center',gap:spacing.sm},readyBadge:{minWidth:54,alignItems:'center',padding:6,borderWidth:1,borderColor:C.good,borderRadius:10,backgroundColor:C.goodSurface},readyNumber:{...typography.title,color:C.good},readyLabel:{fontSize:9,color:C.good,fontWeight:'900',letterSpacing:.8},actionRow:{flexDirection:'row',gap:8},error:{...typography.body,color:C.bad}
});}

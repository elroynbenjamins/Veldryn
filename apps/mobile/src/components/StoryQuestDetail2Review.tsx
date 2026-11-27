/** Unmounted, theme-aware detail sheet. All actions are delegated to the review host. */
import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,View,Pressable} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {GameButton} from './GameButton';
type Objective={id:string;label:string;progress:number;required:number;complete:boolean};
type Reward={label:string;quantity?:number};
export type QuestDetailReviewModel={id:string;title:string;zoneName:string;status:'active'|'available'|'ready'|'locked'|'claimed';objectives:Objective[];summary?:string;lore?:string;requirement?:string;rewards?:Reward[];primaryLabel:string};
type Props={model:QuestDetailReviewModel;onClose:()=>void;onPrimary:(id:string)=>void;onPin:(id:string)=>void;pinned:boolean;reduceMotion?:boolean;t:(s:string)=>string};
export function StoryQuestDetail2Review({model,onClose,onPrimary,onPin,pinned,reduceMotion,t}:Props){
 const C=useGameTheme(),[expanded,setExpanded]=useState(false);
 const canPin=['active','ready','available'].includes(model.status);
 return <GameModalSurface visible onClose={onClose} reduceMotion={reduceMotion} presentation="sheet">
  <GameModalHeader eyebrow={model.zoneName} title={model.title} onClose={onClose}/>
  <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
   {model.summary?<Text style={{color:C.text,fontSize:14}}>{model.summary}</Text>:null}
   {model.objectives.map(o=><View key={o.id} style={[styles.objective,{backgroundColor:C.panel2,borderColor:C.line}]}>
    <View style={styles.row}><Text style={[styles.grow,{color:o.complete?C.good:C.text}]}>{o.complete?'✓ ':''}{o.label}</Text><Text style={{color:C.muted}}>{o.progress}/{o.required}</Text></View>
    <View accessibilityRole="progressbar" accessibilityLabel={o.label} accessibilityValue={{min:0,max:o.required,now:Math.min(o.progress,o.required)}} style={[styles.track,{backgroundColor:C.line}]}><View style={[styles.fill,{backgroundColor:o.complete?C.good:C.accent,width:(Math.max(0,Math.min(100,100*o.progress/Math.max(1,o.required)))+'%') as `${number}%`}]}/></View>
   </View>)}
   {model.requirement?<Text style={{color:C.warning,fontSize:13}}>{model.requirement}</Text>:null}
   {model.rewards?.length?<View style={[styles.objective,{backgroundColor:C.panel,borderColor:C.line}]}><Text style={{color:C.text,fontWeight:'700'}}>{t('Proposed rewards')}</Text>{model.rewards.map((r,i)=><View key={i} style={styles.row}><Text style={[styles.grow,{color:C.text}]}>{r.label}</Text>{r.quantity!==undefined?<Text style={{color:C.muted}}>×{r.quantity}</Text>:null}</View>)}</View>:null}
   {model.lore?<><Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setExpanded(v=>!v)} style={styles.lore}><Text style={{color:C.accent}}>{t(expanded?'Hide story':'Read story')} {expanded?'⌃':'⌄'}</Text></Pressable>{expanded?<Text style={{color:C.muted,fontSize:14,lineHeight:20}}>{model.lore}</Text>:null}</>:null}
  </ScrollView>
  <View style={styles.footer}><GameButton title={t(model.primaryLabel)} onPress={()=>onPrimary(model.id)}/>{canPin?<GameButton compact tone="secondary" title={t(pinned?'Unpin quest':'Pin quest')} onPress={()=>onPin(model.id)}/>:null}</View>
 </GameModalSurface>;
}
const styles=StyleSheet.create({body:{gap:10,paddingVertical:8},objective:{padding:10,gap:8,borderRadius:8,borderWidth:1},row:{flexDirection:'row',alignItems:'center',gap:8},grow:{flex:1,minWidth:0,fontSize:14},track:{height:5,borderRadius:3,overflow:'hidden'},fill:{height:5},lore:{minHeight:44,justifyContent:'center'},footer:{gap:6,paddingTop:8}});

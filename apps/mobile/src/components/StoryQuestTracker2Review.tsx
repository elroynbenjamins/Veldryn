/** Unmounted Journal 2.0 tracker preview. Navigation only; no automatic claims. */
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
type Objective={id:string;progress:number;required:number};
type Props={model:{status:'visible';questId:string;title:string;objective:Objective|null;label:string}|{status:'hidden'};objectiveLabel:(o:Objective)=>string;t:(s:string)=>string;onOpen:(questId:string)=>void};
export function StoryQuestTracker2Review({model,objectiveLabel,t,onOpen}:Props){
 const styles=makeStyles(useGameTheme());
 if(model.status==='hidden')return null;
 const objective=model.objective;
 const progress=objective&&objective.required>0?Math.max(0,Math.min(100,100*objective.progress/objective.required)):0;
 return <Pressable accessibilityRole="button" accessibilityLabel={model.title+', '+(objective?objectiveLabel(objective)+', '+objective.progress+'/'+objective.required:t('Reward ready'))} onPress={()=>onOpen(model.questId)} style={styles.card}>
  <View style={styles.textBlock}>
   <Text numberOfLines={1} style={styles.title}>{model.title}</Text>
   {objective?<><View style={styles.row}><Text style={styles.label} numberOfLines={1}>{objectiveLabel(objective)}</Text><Text style={styles.count}>{objective.progress}/{objective.required}</Text></View><View style={styles.track}><View style={[styles.fill,{width:(progress+'%') as `${number}%`}]}/></View></>:<Text style={styles.ready}>{t('Reward ready')}</Text>}
  </View><Text accessible={false} style={styles.chevron}>›</Text>
 </Pressable>;
}
const makeStyles=(C:ThemeColors)=>StyleSheet.create({card:{minHeight:48,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:8,borderRadius:8,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panelRaised},textBlock:{flex:1,minWidth:0,gap:4},title:{color:C.text,fontSize:13,fontWeight:'700'},row:{flexDirection:'row',alignItems:'center',gap:6},label:{flex:1,color:C.muted,fontSize:12},count:{color:C.text,fontSize:12},track:{height:4,backgroundColor:C.line,borderRadius:3,overflow:'hidden'},fill:{height:4,backgroundColor:C.accent},ready:{fontSize:12,color:C.good},chevron:{color:C.accent,fontSize:22}});

/** Unmounted Journal panels. Existing challenge and Exploration owners retain all claim actions. */
import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
type Period='daily'|'weekly'|'monthly';
type Challenge={id:string;title:string;status:'active'|'ready'|'claimed';progress:number;required:number};
type Month={key:string;points:number;claimed:number[];claimUntilMs:number};
export type ChallengePanelModel={status:'review';period:Period;summary:{period:Period;ready:number;total:number}[];rows:Challenge[];monthlyMilestones:Month[]}|{status:'unavailable'};
type Region={regionId:string;count:number;total:number;entitlementId:string;claimed:boolean;complete:boolean};
export type RecordsPanelModel={status:'review';regions:Region[];realm:{count:number;total:number;claimed:boolean};lore?:{id:string;title:string;text:string}[]}|{status:'unavailable'};
const periods:Record<Period,string>={daily:'Daily',weekly:'Weekly',monthly:'Monthly'};
const status={active:'In progress',ready:'Ready',claimed:'Completed'};
type Translate=(s:string)=>string;
function Progress({value,total,t}:{value:number;total:number;t:Translate}){
 const max=Math.max(1,total),now=Math.max(0,Math.min(value,max));
 return <View accessibilityRole="progressbar" accessibilityLabel={t('Progress')} accessibilityValue={{min:0,max,now}} style={styles.track}><View style={[styles.fill,{width:(100*now/max+'%') as `${number}%`}]}/></View>;
}
export function StoryChallengePanel2Review({model,t,onPeriod,onChallenge,onMilestones}:{model?:ChallengePanelModel;t:Translate;onPeriod:(period:Period)=>void;onChallenge:(id:string,period:Period)=>void;onMilestones:()=>void}){
 if(model?.status!=='review')return <Text style={styles.muted}>{t('Challenges unavailable. Refresh to continue.')}</Text>;
 const rows=[...model.rows].sort((a,b)=>['ready','active','claimed'].indexOf(a.status)-['ready','active','claimed'].indexOf(b.status));
 return <View style={styles.panel}>
  <View style={styles.wrap}>{model.summary.map(p=><Pressable key={p.period} accessibilityRole="button" accessibilityState={{selected:p.period===model.period}} onPress={()=>onPeriod(p.period)} style={[styles.chip,p.period===model.period&&styles.selected]}><Text style={styles.text}>{t(periods[p.period])}{p.ready?' · '+p.ready:''}</Text></Pressable>)}</View>
  {rows.map(q=><Pressable key={q.id} accessibilityRole="button" accessibilityLabel={q.title+', '+t(status[q.status])+', '+q.progress+'/'+q.required} onPress={()=>onChallenge(q.id,model.period)} style={styles.card}>
    <View style={styles.row}><Text style={styles.title}>{q.title}</Text><Text style={q.status==='ready'?styles.ready:styles.muted}>{t(status[q.status])}</Text></View>
    <View style={styles.row}><View style={styles.flex}><Progress value={q.progress} total={q.required} t={t}/></View><Text style={styles.muted}>{q.progress}/{q.required} ›</Text></View>
  </Pressable>)}
  {!rows.length?<Text style={styles.muted}>{t('No challenges in this period.')}</Text>:null}
  {model.monthlyMilestones.map(m=><Pressable key={m.key} accessibilityRole="button" accessibilityLabel={t('Monthly milestones')+', '+m.key+', '+m.points} onPress={onMilestones} style={styles.card}>
   <View style={styles.row}><Text style={styles.title}>{t('Monthly milestones')}</Text><Text style={styles.muted}>{m.key} ›</Text></View>
   <View style={styles.row}><Text style={styles.muted}>{t('Quest points')}</Text><Text style={styles.text}>{m.points}/100</Text></View><Progress value={m.points} total={100} t={t}/>
   <View style={styles.wrap}>{[30,60,100].map(n=><Text key={n} style={m.claimed.includes(n)?styles.ready:styles.muted}>{m.claimed.includes(n)?'✓ ':m.points>=n?'● ':'○ '}{n}</Text>)}</View>
  </Pressable>)}
 </View>;
}
export function StoryRecordsPanel2Review({model,t,regionName,onDiscoveries,onLore,onExistingRecords}:{model?:RecordsPanelModel;t:Translate;regionName:(id:string)=>string;onDiscoveries:()=>void;onLore:(id:string)=>void;onExistingRecords:()=>void}){
 return <View style={styles.panel}>
  <Pressable accessibilityRole="button" onPress={onExistingRecords} style={styles.card}><View style={styles.row}><Text style={styles.title}>{t('Achievements & titles')}</Text><Text style={styles.muted}>›</Text></View></Pressable>
  {model?.status==='review'?<>
   <Pressable accessibilityRole="button" onPress={onDiscoveries} style={styles.card}>
    <View style={styles.row}><Text style={styles.title}>{t('Exploration discoveries')}</Text><Text style={styles.muted}>{model.regions.reduce((n,r)=>n+r.count,0)}/{model.regions.reduce((n,r)=>n+r.total,0)} ›</Text></View>
    {model.regions.map(r=><View key={r.regionId} style={styles.row}><Text style={styles.growText}>{regionName(r.regionId)}</Text><Text style={r.complete?styles.ready:styles.muted}>{r.count}/{r.total}{r.claimed?' ✓':''}</Text></View>)}
   </Pressable>
   {model.lore?.length?<Text style={styles.title}>{t('Discovered lore')}</Text>:null}
   {model.lore?.map(l=><Pressable key={l.id} accessibilityRole="button" onPress={()=>onLore(l.id)} style={styles.card}><View style={styles.row}><Text style={styles.growText}>{l.title}</Text><Text style={styles.muted}>›</Text></View></Pressable>)}
  </>:<Text style={styles.muted}>{t('Discoveries unavailable. Refresh to continue.')}</Text>}
 </View>;
}
const styles=StyleSheet.create({panel:{gap:8},wrap:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:6,backgroundColor:'#242a32'},selected:{borderWidth:1,borderColor:'#d1b278',backgroundColor:'#3b3428'},card:{minHeight:44,padding:10,gap:8,borderRadius:8,borderWidth:1,borderColor:'#3c4650',backgroundColor:'#222931'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'},title:{flexShrink:1,fontSize:14,fontWeight:'700',color:'#f0e2c9'},text:{fontSize:13,color:'#e6e9ed'},muted:{fontSize:12,color:'#b9c3cf',flexShrink:1},ready:{fontSize:12,color:'#abd29c'},growText:{flex:1,minWidth:0,fontSize:13,color:'#e6e9ed'},flex:{flex:1,minWidth:60},track:{height:5,borderRadius:3,backgroundColor:'#3a434c',overflow:'hidden'},fill:{height:5,backgroundColor:'#c6a46a'}});

/** Unmounted Journal 2.0 presentation review. No gameplay commands or live routing.
 * Host supplies reviewed rows and handles navigation/detail selection only.
 */
import React,{useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
type Tab='story'|'quests'|'challenges'|'records';
type Status='ready'|'active'|'available'|'locked'|'claimed';
type Objective={id:string;kind:string;targetId:string;progress:number;required:number;complete:boolean};
type Row={id:string;title:string;zoneId:string;status:Status;tab:Tab;completeCount:number;objectiveCount:number;objectives:Objective[];primary:{label:string;detail:string}};
type Model={tab:Tab;featured?:Row;pinned?:Row;visible:Row[];storyComplete:number;storyTotal:number;readyCount:number;filter:string;query?:string;zoneId?:string;zones?:string[]};
type Props={model:Model;onTab:(tab:Tab)=>void;onDetail:(id:string)=>void;onPrimary:(id:string)=>void;onFilter:(filter:string)=>void;onSearch:(query:string)=>void;onZone:(zoneId?:string)=>void;onPin:(id:string)=>void;zoneName:(id:string)=>string;objectiveName:(objective:Objective)=>string;t:(copy:string)=>string};
const tabs:Tab[]=['story','quests','challenges','records'];
const labels:Record<Tab,string>={story:'Story',quests:'Quests',challenges:'Challenges',records:'Records'};
const statusLabels:Record<Status,string>={ready:'Ready',active:'In progress',available:'Available',locked:'Locked',claimed:'Completed'};
const filters=[['current','Current'],['all','All'],['completed','Completed'],['locked','Locked']];
export function StoryJournal2Review({model,onTab,onDetail,onPrimary,onFilter,onSearch,onZone,onPin,zoneName,objectiveName,t}:Props){
 const {width,fontScale}=useWindowDimensions(),stack=width<355||fontScale>=1.3;
 const [showFilters,setShowFilters]=useState(false);
 const hasFilters=!!model.query?.trim()||!!model.zoneId||model.filter!=='current';
 const featured=!model.query?.trim()&&!model.zoneId&&['current','all'].includes(model.filter)?(model.tab==='story'?model.featured:model.tab==='quests'&&model.pinned?.tab==='quests'?model.pinned:undefined):undefined;
 const progress=model.storyTotal?Math.round(model.storyComplete/model.storyTotal*100):0;
 const row=(item:Row,expanded=false)=><View key={item.id} style={styles.card}>
  <Pressable accessibilityRole="button" accessibilityLabel={item.title+', '+t(statusLabels[item.status])} onPress={()=>onDetail(item.id)} style={styles.header}>
   <View style={styles.grow}><Text style={styles.title}>{item.title}</Text><Text style={styles.muted}>{zoneName(item.zoneId)} · {t(statusLabels[item.status])}</Text></View>
   <Text style={styles.muted}>{item.status==='claimed'?'✓':item.completeCount+'/'+item.objectiveCount}</Text>
  </Pressable>
  {expanded&&item.status!=='claimed'?item.objectives.map(o=><View key={o.id} style={styles.objective}><Text style={styles.growText}>{objectiveName(o)}</Text><Text style={styles.muted}>{o.progress}/{o.required}</Text></View>):null}
  {expanded&&['View requirements','View prerequisite','View scouting','View report','Choose scout','Choose gathering spot'].includes(item.primary.label)?<Text style={styles.muted}>{t(item.primary.detail)}</Text>:null}
  {expanded?<View style={[styles.actions,stack&&styles.stack]}><Pressable accessibilityRole="button" onPress={()=>onPrimary(item.id)} style={styles.primary}><Text style={styles.primaryText}>{t(item.primary.label)}</Text></Pressable>{['active','available','ready'].includes(item.status)?<Pressable accessibilityRole="button" accessibilityLabel={t(model.pinned?.id===item.id?'Unpin quest':'Pin quest')} onPress={()=>onPin(item.id)} style={styles.secondary}><Text style={styles.muted}>{t(model.pinned?.id===item.id?'Unpin':'Pin')}</Text></Pressable>:null}</View>:null}
 </View>;
 return <ScrollView contentContainerStyle={styles.container}>
  <Text style={styles.heading}>{t("Adventurer's Journal")}</Text>
  <View accessibilityRole="tablist" style={[styles.tabs,stack&&styles.wrap]}>{tabs.map(tab=><Pressable key={tab} accessibilityRole="tab" accessibilityState={{selected:model.tab===tab}} onPress={()=>onTab(tab)} style={[styles.tab,stack&&styles.tabHalf,model.tab===tab&&styles.selected]}><Text style={styles.tabText}>{t(labels[tab])}</Text></Pressable>)}</View>
  {model.tab==='story'?<View style={styles.card}><View style={styles.header}><Text style={styles.title}>{t('Campaign progress')}</Text><Text style={styles.muted}>{model.storyComplete}/{model.storyTotal}</Text></View><View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:progress}} style={styles.track}><View style={[styles.fill,{width:(progress+'%') as `${number}%`}]}/></View></View>:null}
  {featured?row(featured,true):null}
  {model.tab==='story'||model.tab==='quests'?<><Pressable accessibilityRole="button" accessibilityState={{expanded:showFilters||hasFilters}} onPress={()=>setShowFilters(v=>!v)} style={styles.filter}><Text style={styles.muted}>{t(showFilters||hasFilters?'Quest filters':'Search & filters')}{hasFilters?' · '+t('Active'):''}</Text></Pressable>{showFilters||hasFilters?<><TextInput accessibilityLabel={t('Search quests')} placeholder={t('Search quests')} placeholderTextColor='#a9b5c3' value={model.query??''} onChangeText={onSearch} maxLength={120} style={styles.search}/><View style={styles.wrap}>{filters.map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:model.filter===id}} onPress={()=>onFilter(id)} style={[styles.filter,model.filter===id&&styles.selected]}><Text style={styles.muted}>{t(label)}</Text></Pressable>)}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneRail}>{[undefined,...(model.zones??[])].map(zone=><Pressable key={zone??'all'} accessibilityRole="button" accessibilityState={{selected:model.zoneId===zone}} onPress={()=>onZone(zone)} style={[styles.filter,model.zoneId===zone&&styles.selected]}><Text style={styles.muted}>{zone?zoneName(zone):t('All zones')}</Text></Pressable>)}</ScrollView></>:null}{model.visible.filter(q=>q.id!==featured?.id).map(q=>row(q))}{!model.visible.length&&!featured?<Text style={styles.muted}>{t('No matching quests.')}</Text>:null}</>:<Text style={styles.muted}>{t('Existing challenge and record panels will be integrated here.')}</Text>}
 </ScrollView>;
}
const styles=StyleSheet.create({
 container:{padding:12,gap:10,backgroundColor:'#171c23'},heading:{fontSize:18,fontWeight:'700',color:'#f1e4ce'},tabs:{flexDirection:'row',gap:4},wrap:{flexDirection:'row',flexWrap:'wrap',gap:4},tab:{flex:1,minHeight:44,justifyContent:'center',alignItems:'center',borderRadius:7,backgroundColor:'#242a32',paddingHorizontal:4},tabHalf:{flexBasis:'46%'},selected:{borderWidth:1,borderColor:'#d1b278',backgroundColor:'#3b3428'},tabText:{fontSize:12,color:'#e6d2af',textAlign:'center'},card:{gap:8,padding:10,borderWidth:1,borderColor:'#3c4650',borderRadius:9,backgroundColor:'#222931'},header:{flexDirection:'row',alignItems:'center',gap:8,minHeight:44},grow:{flex:1,minWidth:0},title:{fontSize:14,fontWeight:'700',color:'#f0e2c9',flexShrink:1},muted:{fontSize:12,color:'#b9c3cf',flexShrink:1},objective:{flexDirection:'row',alignItems:'center',gap:8},growText:{flex:1,color:'#e6e9ed',fontSize:13},actions:{flexDirection:'row',gap:6},stack:{flexDirection:'column'},primary:{flex:1,minHeight:44,justifyContent:'center',alignItems:'center',padding:8,borderRadius:6,backgroundColor:'#40563d'},primaryText:{color:'#e4f0db',fontWeight:'700',fontSize:13,textAlign:'center'},secondary:{minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:14,borderRadius:6,borderWidth:1,borderColor:'#53606d'},zoneRail:{flexDirection:'row',gap:4},search:{minHeight:44,paddingHorizontal:10,color:'#e6e9ed',backgroundColor:'#242a32',borderRadius:6,borderWidth:1,borderColor:'#53606d'},filter:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderRadius:6,backgroundColor:'#242a32'},track:{height:6,borderRadius:4,backgroundColor:'#3a434c',overflow:'hidden'},fill:{height:6,backgroundColor:'#c6a46a'}
});

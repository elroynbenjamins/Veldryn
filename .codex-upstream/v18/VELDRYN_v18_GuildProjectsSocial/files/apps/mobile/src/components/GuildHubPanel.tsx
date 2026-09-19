import React,{useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GuildHubView} from '../core/guild-projects-v18';
import {GuildProjectsPanel} from './GuildProjectsPanel';
import {GuildMemberRosterPanel} from './GuildMemberRosterPanel';
import {GuildActivityFeedPanel} from './GuildActivityFeedPanel';
import {GuildDecreePanel} from './GuildDecreePanel';

type Tab='overview'|'projects'|'members'|'activity'|'decrees';
export function GuildHubPanel({guild,callbacks={}}:{guild:GuildHubView;callbacks?:Record<string,(...args:any[])=>void>}){
 const [tab,setTab]=useState<Tab>('overview');
 return <View style={s.wrap}>
  <View style={s.header}><View style={{flex:1}}><Text style={s.eyebrow}>GUILD · LEVEL {guild.level}</Text><Text style={s.title}>{guild.name}</Text><Text style={s.meta}>{guild.memberCount}/{guild.memberCap} members · {guild.projectSlots} project slot{guild.projectSlots===1?'':'s'}</Text></View><View style={s.level}><Text style={s.levelText}>{guild.level}</Text></View></View>
  <View style={s.bulletin}><Text style={s.bulletinLabel}>GUILD BULLETIN</Text><Text style={s.bulletinBody}>{guild.bulletin||'No bulletin posted.'}</Text></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{(['overview','projects','members','activity','decrees'] as Tab[]).map(x=><Pressable key={x} onPress={()=>setTab(x)} style={[s.tab,tab===x&&s.active]}><Text style={s.tabText}>{x}</Text></Pressable>)}</ScrollView>
  {tab==='overview'&&<View style={s.panel}><Text style={s.section}>CURRENT PRIORITIES</Text>{guild.activeProjects.length===0?<Text style={s.copy}>No active Guild Projects. Open Projects to choose the next shared goal.</Text>:guild.activeProjects.slice(0,3).map(p=><Pressable key={p.id} onPress={()=>{setTab('projects');callbacks.onOpenProject?.(p.id)}} style={s.card}><Text style={s.cardTitle}>{p.name}</Text><Text style={s.copy}>{p.kind==='development'?'Development project':`${p.completionPoints.toLocaleString()} / ${p.targetPoints.toLocaleString()} effort points`}</Text></Pressable>)}<Text style={s.section}>YOUR ROLE</Text><Text style={s.role}>{guild.myRole.replace(/_/g,' ')}</Text></View>}
  {tab==='projects'&&<GuildProjectsPanel guild={guild} onVote={callbacks.onVoteProject} onStart={callbacks.onStartProject} onOpenProject={callbacks.onOpenProject} onClaim={callbacks.onClaimProject}/>} 
  {tab==='members'&&<GuildMemberRosterPanel members={guild.members} onOpenMember={callbacks.onOpenMember} onManageRole={callbacks.onManageRole}/>} 
  {tab==='activity'&&<GuildActivityFeedPanel entries={guild.activity}/>} 
  {tab==='decrees'&&<GuildDecreePanel decrees={guild.decrees} onVote={callbacks.onVoteDecree}/>} 
 </View>
}
const s=StyleSheet.create({wrap:{gap:10},header:{flexDirection:'row',gap:10,backgroundColor:'#0f1822',borderWidth:1,borderColor:'#394d5f',borderRadius:12,padding:13},eyebrow:{color:'#88a8bd',fontSize:10,fontWeight:'900',letterSpacing:1},title:{color:'#f1dfa8',fontSize:22,fontWeight:'900'},meta:{color:'#95a8b5',fontSize:11},level:{width:50,height:50,borderRadius:10,borderWidth:1,borderColor:'#9d7e3f',backgroundColor:'#27241b',alignItems:'center',justifyContent:'center'},levelText:{color:'#f0d58d',fontSize:20,fontWeight:'900'},bulletin:{backgroundColor:'#15232e',borderWidth:1,borderColor:'#304656',borderRadius:9,padding:10},bulletinLabel:{color:'#8ea7b7',fontSize:9,fontWeight:'900'},bulletinBody:{color:'#d7e0e5',fontSize:12,lineHeight:17},tabs:{gap:5},tab:{paddingVertical:8,paddingHorizontal:12,borderWidth:1,borderColor:'#304656',borderRadius:7,backgroundColor:'#16242f'},active:{backgroundColor:'#2a261d',borderColor:'#bd9648'},tabText:{color:'#c7d2d9',fontSize:10,fontWeight:'900',textTransform:'capitalize'},panel:{backgroundColor:'#0f1822',borderWidth:1,borderColor:'#394d5f',borderRadius:12,padding:12,gap:8},section:{color:'#c9b574',fontSize:10,fontWeight:'900',letterSpacing:.7},copy:{color:'#9caeba',fontSize:11,lineHeight:15},card:{backgroundColor:'#162530',borderWidth:1,borderColor:'#31495a',borderRadius:8,padding:9},cardTitle:{color:'#e8edf0',fontWeight:'900'},role:{color:'#e8d397',fontWeight:'900',textTransform:'capitalize'}})

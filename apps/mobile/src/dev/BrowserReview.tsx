/** Explicit web export for an isolated, memory-only tour of production screens. */
import {useEffect,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import NativeVisualReview from './NativeVisualReview';
import CompanionScreenReview from './CompanionScreenReview';
import StoreCaptureReview from './StoreCaptureReview';
import BoardExperienceReview from './BoardExperienceReview';
import GuildPveReview from './GuildPveReview';

type Route={id:string;label:string;group:string;screen?:string;storeScreen?:string};
const routes:Route[]=[
 {id:'game',label:'Main screens',group:'Game'},
 {id:'world',label:'World',group:'Game',screen:'world'},
 {id:'character',label:'Character',group:'Game',storeScreen:'hero'},
 {id:'combat',label:'Combat',group:'Game',storeScreen:'combat'},
 {id:'pets',label:'Pet collection',group:'Game',storeScreen:'pets'},
 {id:'companions',label:'Companions',group:'Game'},
 {id:'dungeon',label:'Dungeon details',group:'Dungeon',storeScreen:'dungeon'},
 {id:'queue',label:'Match queue',group:'Dungeon',storeScreen:'queue'},
 {id:'ready',label:'Ready check',group:'Dungeon',storeScreen:'matchmaking'},
 {id:'dungeon-fight',label:'Dungeon fight',group:'Dungeon',storeScreen:'dungeon-combat'},
 {id:'guild-home',label:'Guild home',group:'Guild',screen:'guild-home'},
 {id:'guild-projects',label:'Projects',group:'Guild',screen:'guild'},
 {id:'guild-skills',label:'Skills',group:'Guild',screen:'skills'},
 {id:'guild-hall',label:'Hall',group:'Guild',screen:'hall'},
 {id:'guild-shop',label:'Shop',group:'Guild',screen:'shop'},
 {id:'guild-boss',label:'Guild boss fight',group:'Guild'},
 {id:'events',label:'Events',group:'Game',screen:'event'},
];
const groups=['Game','Dungeon','Guild'] as const;
const initial=()=>{
 const id=typeof window==='undefined'?'game':new URLSearchParams(window.location.search).get('view');
 return routes.find(route=>route.id===id)??routes[0];
};
export default function BrowserReview(){
 const [route,setRoute]=useState<Route>(initial);
 useEffect(()=>{const back=()=>setRoute(initial());window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back)},[]);
 const open=(next:Route)=>{
  const params=new URLSearchParams();params.set('view',next.id);
  if(next.screen)params.set('screen',next.screen);
  if(next.id==='guild-projects')params.set('activity','Projects');
  if(next.storeScreen)params.set('storeScreen',next.storeScreen);
  window.history.pushState(null,'',`?${params.toString()}`);setRoute(next);
 };
 const content=route.id==='game'?<NativeVisualReview/>:
  route.id==='world'||route.id==='companions'?<CompanionScreenReview/>:
  route.id==='guild-boss'?<GuildPveReview/>:
  route.group==='Guild'||route.id==='events'?<BoardExperienceReview/>:
  <StoreCaptureReview/>;
 return <View style={s.root}>
  <View style={s.header}>
   <Text style={s.title}>VELDRYN · Browser Review</Text>
   <Text style={s.note}>Interactive sample data · No account, matchmaking, or live rewards</Text>
   {groups.map(group=><View key={group} style={s.group}><Text style={s.groupName}>{group}</Text><ScrollView horizontal showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.links}>{routes.filter(item=>item.group===group).map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:item.id===route.id}} onPress={()=>open(item)} style={[s.link,item.id===route.id&&s.linkActive]}><Text style={[s.linkText,item.id===route.id&&s.linkTextActive]}>{item.label}</Text></Pressable>)}</ScrollView></View>)}
  </View>
  <View key={route.id} style={s.content}>{content}</View>
 </View>;
}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#101724'},header:{padding:10,gap:5,backgroundColor:'#172337',borderBottomWidth:1,borderBottomColor:'#41516a'},title:{fontSize:16,fontWeight:'800',color:'#f4e7c9'},note:{fontSize:11,color:'#b6c8d8'},group:{flexDirection:'row',alignItems:'center',gap:8,minHeight:36},groupName:{width:58,color:'#d2ac67',fontSize:11,fontWeight:'800'},links:{gap:6,alignItems:'center'},link:{paddingHorizontal:9,paddingVertical:6,borderRadius:7,borderWidth:1,borderColor:'#35445b'},linkActive:{borderColor:'#d2ac67',backgroundColor:'#34435d'},linkText:{fontSize:11,color:'#cbd5e1'},linkTextActive:{color:'#fff4d9',fontWeight:'800'},content:{flex:1,minHeight:0}});

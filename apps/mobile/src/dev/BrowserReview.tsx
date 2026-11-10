/** Opt-in browser tour of real production components with synthetic, memory-only state.
 * The review entry does NOT mount auth, production saves, chat, network transports or billing.
 * A route may illustrate an unreleased feature; it never unlocks it for players. */
import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import NativeVisualReview,{type Section as NativeSection} from './NativeVisualReview';
import CompanionScreenReview from './CompanionScreenReview';
import StoreCaptureReview from './StoreCaptureReview';
import BoardExperienceReview from './BoardExperienceReview';
import GuildPveReview from './GuildPveReview';
import AdditionalScreensReview,{type AdditionalReviewScreen} from './AdditionalScreensReview';

type Group='Game'|'Equipment'|'Dungeon'|'Guild'|'Social'|'Account'|'QA';
type Route={
 id:string;label:string;group:Group;
 kind:'native'|'store'|'board'|'companion'|'pve'|'extra';
 native?:NativeSection;storeScreen?:string;screen?:string;extra?:AdditionalReviewScreen;
 note?:string;
};
const routes:readonly Route[]=[
 {id:'home',label:'Home / Activity',group:'Game',kind:'native',native:'Home'},
 {id:'world',label:'World map',group:'Game',kind:'store',storeScreen:'world'},
 {id:'combat',label:'Combat screen',group:'Game',kind:'store',storeScreen:'combat'},
 {id:'battle',label:'Live combat artwork',group:'Game',kind:'store',storeScreen:'battle'},
 {id:'skills',label:'Skills / Mining',group:'Game',kind:'store',storeScreen:'skills'},
 {id:'skill-grid',label:'Skill selection grid',group:'Game',kind:'store',storeScreen:'skill-grid'},
 {id:'crafting',label:'Smithing / Crafting',group:'Game',kind:'store',storeScreen:'crafting'},
 {id:'quests',label:'Quest journal',group:'Game',kind:'native',native:'Journal'},
 {id:'contracts',label:'Contracts',group:'Game',kind:'native',native:'Contracts'},
 {id:'challenges',label:'Challenges',group:'Game',kind:'native',native:'Challenges'},
 {id:'events',label:'Events',group:'Game',kind:'board',screen:'event'},
 {id:'events-live',label:'Active event preview',group:'Game',kind:'native',native:'EventsLive'},
 {id:'bestiary',label:'Bestiary',group:'Game',kind:'extra',extra:'bestiary'},
 {id:'journal',label:'Adventurer’s Journal',group:'Game',kind:'extra',extra:'journal'},
 {id:'mastery',label:'Mastery Hall',group:'Game',kind:'extra',extra:'mastery'},
 {id:'resources',label:'Resource Codex',group:'Game',kind:'extra',extra:'resources'},
 {id:'character',label:'Character / Equipment',group:'Equipment',kind:'store',storeScreen:'hero'},
 {id:'character-native',label:'Character visual review',group:'Equipment',kind:'native',native:'Character'},
 {id:'inventory',label:'Inventory',group:'Equipment',kind:'native',native:'Inventory'},
 {id:'ingredients',label:'Crafting materials',group:'Equipment',kind:'native',native:'Ingredients'},
 {id:'collections',label:'Collections',group:'Equipment',kind:'extra',extra:'collections'},
 {id:'pets',label:'Pets',group:'Equipment',kind:'store',storeScreen:'pets'},
 {id:'companions',label:'Companions / Sanctuary',group:'Equipment',kind:'companion'},
 {id:'companion-gear',label:'Companion equipment preview',group:'Equipment',kind:'store',storeScreen:'companions'},
 {id:'dungeon',label:'Dungeon details',group:'Dungeon',kind:'store',storeScreen:'dungeon'},
 {id:'queue',label:'Match queue',group:'Dungeon',kind:'store',storeScreen:'queue'},
 {id:'ready',label:'Ready check',group:'Dungeon',kind:'store',storeScreen:'matchmaking'},
 {id:'dungeon-fight',label:'Dungeon fight',group:'Dungeon',kind:'store',storeScreen:'dungeon-combat'},
 {id:'guild-home',label:'Guild dashboard',group:'Guild',kind:'board',screen:'guild-home'},
 {id:'guild-quests',label:'Guild quests',group:'Guild',kind:'board',screen:'guild'},
 {id:'guild-projects',label:'Guild projects',group:'Guild',kind:'board',screen:'guild'},
 {id:'guild-skills',label:'Guild skills',group:'Guild',kind:'board',screen:'skills'},
 {id:'guild-hall',label:'Guild hall',group:'Guild',kind:'board',screen:'hall'},
 {id:'guild-shop',label:'Guild shop',group:'Guild',kind:'board',screen:'shop'},
 {id:'guild-boss',label:'Guild PvE boss',group:'Guild',kind:'pve'},
 {id:'guild-identity',label:'Guild identity',group:'Guild',kind:'store',storeScreen:'guild-identity'},
 {id:'guild-recruit',label:'Guild recruitment',group:'Guild',kind:'native',native:'Guild'},
 {id:'party',label:'Party / Recruitment',group:'Social',kind:'native',native:'Social'},
 {id:'social',label:'Social preview',group:'Social',kind:'store',storeScreen:'social'},
 {id:'profile',label:'Profile customization',group:'Social',kind:'native',native:'Profile'},
 {id:'profile-identity',label:'Profile identity',group:'Social',kind:'store',storeScreen:'profile-identity'},
 {id:'account',label:'Account overview',group:'Account',kind:'extra',extra:'account'},
 {id:'characters',label:'Character roster',group:'Account',kind:'extra',extra:'characters'},
 {id:'bonuses',label:'Account bonuses',group:'Account',kind:'extra',extra:'bonuses'},
 {id:'daily',label:'Daily supplies',group:'Account',kind:'extra',extra:'daily'},
 {id:'inbox',label:'Rewards inbox',group:'Account',kind:'extra',extra:'inbox'},
 {id:'unlocks',label:'New unlocks',group:'Account',kind:'extra',extra:'unlocks'},
 {id:'login',label:'Sign-in view',group:'Account',kind:'native',native:'Login'},
 {id:'settings',label:'Settings',group:'Account',kind:'native',native:'Settings'},
 {id:'qa-admin',label:'Sandbox QA console',group:'QA',kind:'extra',extra:'admin'},
 {id:'qa-arena',label:'Arena (unreleased)',group:'QA',kind:'extra',extra:'arena'},
];
const groups:readonly Group[]=['Game','Equipment','Dungeon','Guild','Social','Account','QA'];
const findRoute=(id:string|null)=>routes.find(row=>row.id===id)??routes[0];
const initialRoute=()=>typeof window==='undefined'?routes[0]:findRoute(new URLSearchParams(window.location.search).get('view'));
function updateUrl(route:Route){
 if(typeof window==='undefined')return;
 const params=new URLSearchParams(window.location.search);
 for(const key of ['view','screen','activity','storeScreen'])params.delete(key);
 params.set('view',route.id);
 if(route.screen)params.set('screen',route.screen);
 if(route.id==='guild-projects')params.set('activity','Projects');
 if(route.storeScreen)params.set('storeScreen',route.storeScreen);
 window.history.pushState(null,'','?'+params.toString());
}
export default function BrowserReview(){
 const {width}=useWindowDimensions(),desktop=width>=900;
 const [route,setRoute]=useState<Route>(initialRoute);
 const [query,setQuery]=useState(''),[navVisible,setNavVisible]=useState(true);
 const [group,setGroup]=useState<Group>(route.group);
 useEffect(()=>{if(typeof window==='undefined')return;
  const back=()=>{const next=initialRoute();setRoute(next);setGroup(next.group)};
  window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);
 },[]);
 const open=(next:Route)=>{updateUrl(next);setRoute(next);setGroup(next.group);if(!desktop)setNavVisible(false)};
 const filtered=useMemo(()=>routes.filter(row=>!query.trim()||[row.label,row.group].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[query]);
 const nav=<View style={desktop?s.navDesktop:s.navMobile}>
  <View style={s.searchRow}>
   <TextInput accessibilityLabel="Search review screens" value={query} onChangeText={setQuery} placeholder="Search screens…" placeholderTextColor="#9aadc5" style={s.search}/>
   <Text style={s.count}>{filtered.length} / {routes.length}</Text>
  </View>
  <ScrollView contentContainerStyle={s.menu} showsVerticalScrollIndicator={false}>
   {groups.map(g=>{
    const items=filtered.filter(item=>item.group===g);
    if(!items.length)return null;
    return <View key={g} style={s.group}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:group===g||desktop||Boolean(query)}} onPress={()=>setGroup(g)} style={s.groupTop}>
      <Text style={s.groupTitle}>{g}</Text><Text style={s.groupCount}>{items.length}</Text>
     </Pressable>
     {(desktop||group===g||Boolean(query))?items.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityState={{selected:route.id===item.id}} onPress={()=>open(item)} style={[s.link,route.id===item.id&&s.linkActive]}>
      <Text style={[s.linkText,route.id===item.id&&s.linkActiveText]}>{item.label}</Text>
      {route.id===item.id?<Text style={s.marker}>●</Text>:null}
     </Pressable>):null}
    </View>;
   })}
  </ScrollView>
 </View>;
 let content;
 switch(route.kind){
  case 'native':content=<NativeVisualReview initialSection={route.native}/>;break;
  case 'companion':content=<CompanionScreenReview/>;break;
  case 'board':content=<BoardExperienceReview/>;break;
  case 'pve':content=<GuildPveReview/>;break;
  case 'extra':content=<AdditionalScreensReview screen={route.extra!}/>;break;
  default:content=<StoreCaptureReview/>;
 }
 return <View style={s.root}>
  <View style={s.header}>
   <View style={s.headerText}>
    <Text style={s.title}>VELDRYN · Screen Review</Text>
    <Text style={s.note}>Synthetic characters · All local changes reset on refresh · No production gameplay</Text>
   </View>
   {!desktop?<Pressable accessibilityRole="button" onPress={()=>setNavVisible(value=>!value)} style={s.menuToggle}><Text style={s.menuToggleText}>{navVisible?'Hide screens':'Browse screens'} · {routes.length}</Text></Pressable>:null}
  </View>
  <View style={[s.workspace,desktop&&s.workspaceWide]}>
   {(desktop||navVisible)?nav:null}
   <View style={[s.preview,desktop&&s.previewDesktop]}>
    <View style={s.previewHeader}><Text numberOfLines={1} style={s.previewTitle}>{route.group} / {route.label}</Text><Text style={s.fixture}>DEMO · NO LIVE DATA</Text></View>
    <View key={route.id} style={s.content}>{content}</View>
   </View>
  </View>
 </View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:'#0c1420'},header:{paddingHorizontal:16,paddingVertical:10,backgroundColor:'#152236',borderBottomWidth:1,borderBottomColor:'#34465f',flexDirection:'row',alignItems:'center',gap:10},
 headerText:{flex:1},title:{fontSize:16,fontWeight:'900',color:'#f1d49a',letterSpacing:.3},note:{fontSize:11,color:'#b4c5d7',marginTop:2},
 menuToggle:{paddingHorizontal:10,paddingVertical:8,borderRadius:8,backgroundColor:'#2d3e55',borderWidth:1,borderColor:'#55708f'},
 menuToggleText:{fontSize:11,color:'#f4f6fb',fontWeight:'800'},workspace:{flex:1,minHeight:0},workspaceWide:{flexDirection:'row'},
 navDesktop:{width:262,borderRightWidth:1,borderRightColor:'#33465f',backgroundColor:'#131f30'},
 navMobile:{height:220,borderBottomWidth:1,borderBottomColor:'#33465f',backgroundColor:'#131f30'},
 searchRow:{flexDirection:'row',alignItems:'center',padding:9,gap:8},search:{flex:1,minHeight:38,paddingHorizontal:10,borderRadius:7,borderWidth:1,borderColor:'#3c526e',backgroundColor:'#1d2b3e',color:'#eff4fc',fontSize:12},
 count:{fontSize:10,color:'#a9bbd2'},menu:{paddingHorizontal:9,paddingBottom:20,gap:9},group:{gap:3},groupTop:{minHeight:30,paddingHorizontal:6,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 groupTitle:{color:'#e6c382',fontSize:12,fontWeight:'900',letterSpacing:.5},groupCount:{color:'#849bb7',fontSize:10},
 link:{minHeight:35,paddingVertical:6,paddingHorizontal:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderWidth:1,borderColor:'transparent',borderRadius:6},
 linkActive:{borderColor:'#bc9656',backgroundColor:'#31425a'},linkText:{color:'#c2d0e2',fontSize:12},linkActiveText:{color:'#ffe8af',fontWeight:'800'},marker:{color:'#f1cf85',fontSize:9},
 preview:{flex:1,minHeight:0,width:'100%',maxWidth:560,alignSelf:'center',backgroundColor:'#101724',borderLeftWidth:1,borderRightWidth:1,borderColor:'#2e3d55'},
 previewDesktop:{marginVertical:14,marginHorizontal:20,borderWidth:1,borderRadius:12,overflow:'hidden'},
 previewHeader:{minHeight:34,paddingHorizontal:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,backgroundColor:'#1b2b40',borderBottomWidth:1,borderBottomColor:'#41516b'},
 previewTitle:{flex:1,fontSize:12,color:'#f1d49a',fontWeight:'800'},fixture:{fontSize:9,color:'#95abbf',fontWeight:'800'},content:{flex:1,minHeight:0},
});

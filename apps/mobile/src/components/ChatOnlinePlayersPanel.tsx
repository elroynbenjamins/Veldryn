import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,FlatList,Keyboard,Pressable,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {useAuthSession} from '../online/AuthSessionProvider';
import type {OnlinePlayer} from '../online/online-player-roster';
import {useSocialText} from '../i18n/social';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ChatPlayerSheet,type ChatPlayerIdentity} from './ChatPlayerSheet';

type Filter='all'|'friends'|'guild';
type Props={
 count:number|null;players:OnlinePlayer[];loading:boolean;error:string;
 onRefresh:()=>void;onClose:()=>void;reduceMotion?:boolean;
};
const classLabel=(id:string)=>id? id.replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()):'Adventurer';

export function ChatOnlinePlayersPanel({count,players,loading,error,onRefresh,onClose,reduceMotion=false}:Props){
 const st=useSocialText(),C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {session}=useAuthSession(),{width,fontScale}=useWindowDimensions();
 const [filter,setFilter]=useState<Filter>('all'),[search,setSearch]=useState('');
 const [selected,setSelected]=useState<ChatPlayerIdentity|null>(null);
 const [blocked,setBlocked]=useState<string[]>([]);
 useEffect(()=>{setBlocked([]);},[session?.user.id]);
 const available=useMemo(()=>players.filter(p=>!blocked.includes(p.account_id)),[players,blocked]);
 const counts={all:count===null?available.length:count,friends:available.filter(p=>p.is_friend).length,guild:available.filter(p=>p.is_guildmate).length};
 const displayed=useMemo(()=>{
  const query=search.trim().toLocaleLowerCase();
  return available.filter(p=>(filter==='all'||(filter==='friends'?p.is_friend:p.is_guildmate))&&(!query||p.sender_name.toLocaleLowerCase().includes(query)));
 },[available,filter,search]);
 const compact=width<370||fontScale>=1.25;
 return <View style={s.root} accessibilityViewIsModal onAccessibilityEscape={onClose}>
   <View style={s.heading}>
    <View style={s.headingText}>
     <Text style={s.eyebrow}>{st('VELDRYN COMMUNITY')}</Text>
     <Text accessibilityRole="header" numberOfLines={1} style={s.title}>{st('Online players')}</Text>
    </View>
    <View style={s.totalPill}><View style={s.dot}/><Text style={s.totalText}>{count===null?'—':count}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={st('Close online players')} onPress={onClose} style={({pressed})=>[s.close,pressed&&s.pressed]}><Text style={s.closeText}>×</Text></Pressable>
   </View>
   <View style={s.controls}>
    <View style={s.searchWrap}>
     <TextInput accessibilityLabel={st('Search online players')} style={s.search} value={search} onChangeText={setSearch} placeholder={st('Search players...')} placeholderTextColor={C.muted} autoCorrect={false} autoCapitalize="none" returnKeyType="search" maxLength={50}/>
     {search.length>0&&<Pressable accessibilityRole="button" accessibilityLabel={st('Clear search')} onPress={()=>setSearch('')} style={s.clear}><Text style={s.clearText}>×</Text></Pressable>}
    </View>
    <View style={s.filters}>
     {([['all',st('All')],['friends',st('Friends')],['guild',st('Guild')]] as const).map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:filter===id}} onPress={()=>{Keyboard.dismiss();setFilter(id);}} style={({pressed})=>[s.filter,filter===id&&s.filterActive,pressed&&s.pressed]}>
      <Text numberOfLines={1} style={[s.filterText,filter===id&&s.filterTextActive,compact&&s.filterTextCompact]}>{label}</Text>
      <Text style={[s.filterCount,filter===id&&s.filterTextActive]}>{id==='all'&&count===null?'…':counts[id]}</Text>
     </Pressable>)}
    </View>
    <View style={s.meta}><Text style={s.note}>{st('Active within the last few minutes')}</Text>{loading&&<ActivityIndicator size="small" color={C.info}/>}</View>
   </View>
   {error&&<View style={s.warning}><Text style={s.warningText}>{st('Unable to refresh online players.')}</Text><Pressable accessibilityRole="button" onPress={onRefresh} style={s.retry}><Text style={s.retryText}>{st('Retry')}</Text></Pressable></View>}
   <FlatList
    data={displayed}
    keyExtractor={item=>item.account_id}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    contentContainerStyle={displayed.length===0?s.emptyList:s.list}
    renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={item.sender_name+', level '+item.level} accessibilityHint={st('View player profile and social actions')} onPress={()=>{Keyboard.dismiss();setSelected({account_id:item.account_id,sender_name:item.sender_name});}} style={({pressed})=>[s.player,pressed&&s.pressed]}>
     <View style={s.statusDot}/>
     <View style={s.identity}><Text numberOfLines={1} style={s.playerName}>{item.sender_name}{item.account_id===session?.user.id?st(' (You)'):''}</Text><Text numberOfLines={1} style={s.playerMeta}>{st('Lv.')} {item.level} · {classLabel(item.class_id)}</Text></View>
     {item.is_friend?<Text style={s.relationship}>{st('Friend')}</Text>:item.is_guildmate?<Text style={s.relationship}>{st('Guild')}</Text>:null}
     <Text style={s.chevron}>›</Text>
    </Pressable>}
    ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTitle}>{loading&&count===null?st('Loading players...'):error&&count===null?st('Online list unavailable'):search.trim()||filter!=='all'?st('No matching players'):st('No players online')}</Text><Text style={s.emptyDetail}>{search.trim()||filter!=='all'?st('Try another search or filter.'):st('Players appear here when they are active in Veldryn.')}</Text></View>}
    ListFooterComponent={filter==='all'&&!search.trim()&&count!==null&&count>available.length?<Text style={s.footer}>{st('Showing the first {count} players.',{count:available.length})}</Text>:undefined}
   />
   <ChatPlayerSheet message={selected} reduceMotion={reduceMotion} onClose={()=>setSelected(null)} onBlocked={accountId=>{setBlocked(current=>current.includes(accountId)?current:[...current,accountId]);onRefresh();}}/>
  </View>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{position:'absolute',top:56,left:0,right:0,bottom:0,zIndex:40,elevation:14,backgroundColor:C.panel},
 pressed:{opacity:.75},
 heading:{minHeight:60,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.panel2},
 headingText:{flex:1,minWidth:0,gap:2},
 eyebrow:{fontSize:9,letterSpacing:1.2,fontWeight:'900',color:C.accent},
 title:{fontSize:17,fontWeight:'900',color:C.text},
 totalPill:{flexDirection:'row',alignItems:'center',gap:6,borderRadius:16,borderWidth:1,borderColor:C.line,paddingVertical:6,paddingHorizontal:10,backgroundColor:C.panelRaised},
 dot:{width:7,height:7,borderRadius:4,backgroundColor:C.good},
 totalText:{fontSize:12,color:C.good,fontWeight:'900'},
 close:{width:44,height:44,alignItems:'center',justifyContent:'center',backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.line,borderRadius:10},
 closeText:{fontSize:23,lineHeight:27,color:C.text},
 controls:{paddingHorizontal:12,paddingVertical:10,gap:8,borderBottomWidth:1,borderBottomColor:C.line},
 searchWrap:{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panelRaised,minHeight:44},
 search:{flex:1,paddingHorizontal:12,paddingVertical:8,color:C.text,fontSize:13,minWidth:0},
 clear:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},
 clearText:{fontSize:21,color:C.muted},
 filters:{flexDirection:'row',gap:6},
 filter:{flex:1,minWidth:0,minHeight:44,borderWidth:1,borderRadius:9,borderColor:C.line,backgroundColor:C.panelRaised,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:4},
 filterActive:{borderColor:C.accent,backgroundColor:C.selection},
 filterText:{fontSize:12,fontWeight:'800',color:C.muted,flexShrink:1},
 filterTextCompact:{fontSize:11},
 filterTextActive:{color:C.text},
 filterCount:{fontSize:10,fontWeight:'800',color:C.muted},
 meta:{height:21,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 note:{fontSize:10,color:C.muted},
 warning:{marginHorizontal:12,marginTop:8,paddingHorizontal:10,minHeight:42,borderColor:C.warning,borderWidth:1,borderRadius:9,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,backgroundColor:C.panel2},
 warningText:{color:C.warning,fontSize:11,flexShrink:1},
 retry:{minHeight:40,justifyContent:'center',paddingHorizontal:8},
 retryText:{color:C.info,fontSize:12,fontWeight:'800'},
 list:{paddingHorizontal:12,paddingBottom:24},
 emptyList:{flexGrow:1,paddingHorizontal:12},
 player:{minHeight:60,flexDirection:'row',alignItems:'center',gap:10,borderBottomColor:C.line,borderBottomWidth:StyleSheet.hairlineWidth,paddingHorizontal:3,paddingVertical:8},
 statusDot:{width:7,height:7,borderRadius:4,backgroundColor:C.good},
 identity:{flex:1,minWidth:0,gap:3},
 playerName:{color:C.text,fontSize:14,fontWeight:'800'},
 playerMeta:{color:C.muted,fontSize:11},
 relationship:{fontSize:10,color:C.info,fontWeight:'800'},
 chevron:{color:C.muted,fontSize:24,marginHorizontal:3},
 empty:{flex:1,minHeight:150,alignItems:'center',justifyContent:'center',paddingHorizontal:14,gap:8},
 emptyTitle:{fontSize:14,fontWeight:'900',color:C.text,textAlign:'center'},
 emptyDetail:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center'},
 footer:{fontSize:11,color:C.muted,textAlign:'center',paddingVertical:16},
});}

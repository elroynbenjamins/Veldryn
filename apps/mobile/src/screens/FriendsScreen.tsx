import {IdentityArtwork} from '../components/SocialIdentity';
import {SearchField} from '../components/SearchField';
import {useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {onlineConfigured,supabase} from '../online/supabase';
import {blockedPlayers,cancelFriendRequest,friendRequests,friends,removeFriend,respondFriendRequest,searchPlayers,sendFriendRequest,setPlayerBlocked,type BlockedPlayer,type FriendEntry,type FriendRequest,type FriendSearchResult} from '../online/social';
import {C,equipmentColors,radii,spacing,typography} from '../theme/theme';

export function FriendsScreen(){
  const [section,setSection]=useState<'Friends'|'Requests'|'Find'>('Friends');
  const [signedIn,setSignedIn]=useState<boolean|null>(null);
  const [friendRows,setFriendRows]=useState<FriendEntry[]>([]),[requestRows,setRequestRows]=useState<FriendRequest[]>([]),[blockedRows,setBlockedRows]=useState<BlockedPlayer[]>([]);
  const [query,setQuery]=useState(''),[results,setResults]=useState<FriendSearchResult[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [initialLoading,setInitialLoading]=useState(true),[searchedQuery,setSearchedQuery]=useState<string|null>(null);
  const searchRevision=useRef(0);
  function changeQuery(value:string){searchRevision.current+=1;setQuery(value);setResults([]);setSearchedQuery(null);}
  async function refresh(){
    if(!onlineConfigured){setSignedIn(false);return;}
    const {data}=await supabase!.auth.getSession();
    if(!data.session){setSignedIn(false);return;}
    setSignedIn(true);
    const [nextFriends,nextRequests,nextBlocked]=await Promise.all([friends(),friendRequests(),blockedPlayers()]);
    setFriendRows(nextFriends);setRequestRows(nextRequests);setBlockedRows(nextBlocked);
  }
  useEffect(()=>{refresh().catch(reason=>setError(reason instanceof Error?reason.message:'Friends could not be loaded.')).finally(()=>setInitialLoading(false))},[]);
  async function run(action:()=>Promise<void>){setBusy(true);setError('');try{await action();await refresh()}catch(reason){setError(reason instanceof Error?reason.message:'Please try again.')}finally{setBusy(false)}}
  async function search(){
    const term=query.trim();
    if(busy||term.length<2)return;
    const revision=++searchRevision.current;
    setSearchedQuery(null);setResults([]);
    await run(async()=>{const next=await searchPlayers(term);if(revision===searchRevision.current){setResults(next);setSearchedQuery(term);}});
  }
  const incoming=requestRows.filter(row=>row.direction==='incoming'),outgoing=requestRows.filter(row=>row.direction==='outgoing');
  if(!onlineConfigured)return <ScrollView contentContainerStyle={s.root}><Text style={s.heading}>Friends</Text><Panel><Text style={s.title}>Online services are off</Text><Text style={s.sub}>Online friends are unavailable in this build.</Text></Panel></ScrollView>;
  if(initialLoading)return <View style={s.root}><Text style={s.heading}>Friends</Text><ActivityIndicator accessibilityLabel="Loading friends" color={C.accent}/></View>;
  if(signedIn===false)return <ScrollView contentContainerStyle={s.root}><Text style={s.heading}>Friends</Text><Panel><Text style={s.title}>Sign in first</Text><Text style={s.sub}>Open Settings → Account and use a guest or official account. Friends stay attached when a guest account is upgraded.</Text></Panel></ScrollView>;
  return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <View style={s.header}><View style={s.flex}><Text style={s.heading}>Friends</Text><Text style={s.sub}>{friendRows.length} friends · {incoming.length} incoming</Text></View><GameButton title="Refresh" tone="secondary" disabled={busy} onPress={()=>void run(refresh)}/></View>
    <View style={s.sectionTabs}>{(['Friends','Requests','Find'] as const).map(value=><TabChip key={value} label={value==='Friends'?`Friends · ${friendRows.length}`:value==='Requests'?`Requests · ${incoming.length+outgoing.length}`:'Find players'} selected={section===value} onPress={()=>setSection(value)}/>)}</View>
    {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>FRIENDS UNAVAILABLE</Text><Text style={s.error}>{error}</Text></View>}
    {section==='Find'&&<Panel><Text style={s.title}>Find players</Text><Text style={s.sub}>Search by the beginning of a player’s display name.</Text><View style={s.searchRow}><SearchField accessibilityLabel="Player name" value={query} onChangeText={changeQuery} onSubmitEditing={()=>void search()} maxLength={20} autoCapitalize="none" placeholder="Player name" placeholderTextColor={C.muted} style={s.flex}/><GameButton title="Search" disabled={busy||query.trim().length<2} onPress={()=>void search()}/></View>
      {results.map(player=><View key={player.account_id} style={s.row}><IdentityArtwork name={player.display_name} className={player.class_id}/><View style={s.flex}><Text style={s.name}>{player.display_name}</Text><Text style={s.sub}>{player.character_name?`${player.character_name} · ${player.class_id?.replace('_',' ')} · Lv. ${player.level}`:'No synced character'}</Text></View>{player.relationship==='none'?<GameButton title="Add" disabled={busy} onPress={()=>void run(async()=>{const result=await sendFriendRequest(player.account_id);Alert.alert('Friend request',result==='sent'?`Request sent to ${player.display_name}.`:'No new request was needed.');setResults(rows=>rows.map(row=>row.account_id===player.account_id?{...row,relationship:'outgoing_pending'}:row))})}/>:<Text style={s.status}>{relationshipLabel(player.relationship)}</Text>}</View>)}
      {searchedQuery===query.trim()&&!busy&&!error&&results.length===0?<Text style={s.empty}>No players found. Try another display name.</Text>:null}
    </Panel>}
    {section==='Requests'&&<Panel><Text style={s.title}>Requests {incoming.length?`· ${incoming.length} incoming`:''}</Text>{incoming.map(request=><View key={request.request_id} style={s.row}><IdentityArtwork name={request.display_name}/><View style={s.flex}><Text style={s.name}>{request.display_name}</Text><Text style={s.sub}>Wants to be friends</Text></View><View style={s.miniActions}><GameButton title="Accept" disabled={busy} onPress={()=>void run(()=>respondFriendRequest(request.request_id,true).then(()=>{}))}/><GameButton title="Decline" tone="secondary" disabled={busy} onPress={()=>void run(()=>respondFriendRequest(request.request_id,false).then(()=>{}))}/></View></View>)}{outgoing.map(request=><View key={request.request_id} style={s.row}><IdentityArtwork name={request.display_name}/><View style={s.flex}><Text style={s.name}>{request.display_name}</Text><Text style={s.sub}>Request pending</Text></View><GameButton title="Cancel" tone="secondary" disabled={busy} onPress={()=>void run(()=>cancelFriendRequest(request.request_id))}/></View>)}{!requestRows.length?<Text style={s.empty}>No pending requests.</Text>:null}</Panel>}
    {section==='Friends'&&<><Panel><Text style={s.title}>Friends · {friendRows.length}</Text>{friendRows.map(friend=><View key={friend.account_id} style={s.row}><IdentityArtwork name={friend.display_name}/><View style={s.flex}><Text style={s.name}>{friend.display_name}</Text><Text style={s.sub}>{friend.character_name?`${friend.character_name} · ${friend.class_id?.replace('_',' ')} · Lv. ${friend.level}`:'No synced character'}</Text>{friend.profile_title?<Text style={s.titleText}>{friend.profile_title}</Text>:null}</View><Pressable accessibilityRole="button" accessibilityLabel={`Manage friendship with ${friend.display_name}`} onPress={()=>Alert.alert(friend.display_name,'Manage this friendship.',[{text:'Cancel'},{text:'Remove friend',style:'destructive',onPress:()=>void run(()=>removeFriend(friend.account_id))},{text:'Block',style:'destructive',onPress:()=>void run(()=>setPlayerBlocked(friend.account_id,true))}])} style={s.manage}><Text style={s.manageText}>•••</Text></Pressable></View>)}{!friendRows.length?<Text style={s.empty}>Your friends will appear here.</Text>:null}</Panel>{blockedRows.length?<Panel><Text style={s.title}>Blocked players · {blockedRows.length}</Text>{blockedRows.map(player=><View key={player.account_id} style={s.row}><IdentityArtwork name={player.display_name}/><View style={s.flex}><Text style={s.name}>{player.display_name}</Text><Text style={s.sub}>Hidden from search and requests</Text></View><GameButton title="Unblock" tone="secondary" disabled={busy} onPress={()=>void run(()=>setPlayerBlocked(player.account_id,false))}/></View>)}</Panel>:null}</>}
  </ScrollView>;
}

function Avatar({name}:{name:string}){return <View style={s.avatar}><Text style={s.avatarText}>{name.trim().slice(0,1).toUpperCase()||'?'}</Text></View>}
function relationshipLabel(value:FriendSearchResult['relationship']){return value==='friend'?'Friends':value==='incoming_pending'?'Respond in requests':'Request sent'}
function TabChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.tabChip,selected&&s.tabChipSelected,pressed&&s.pressed]}><Text style={[s.tabText,selected&&s.tabTextSelected]}>{label}</Text></Pressable>}

const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},header:{flexDirection:'row',alignItems:'center',gap:spacing.md},sectionTabs:{flexDirection:'row',flexWrap:'wrap',gap:6},tabChip:{minHeight:40,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},tabChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},tabText:{fontSize:12,fontWeight:'700',color:C.muted},tabTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76},heading:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},errorCard:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.bad,borderRadius:radii.md,backgroundColor:'#2a1b20'},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{...typography.body,color:C.text},searchRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginTop:spacing.sm},input:{flex:1,minHeight:48,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,color:C.text,paddingHorizontal:spacing.md,fontSize:16},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,borderTopWidth:1,borderTopColor:C.line,paddingVertical:spacing.sm},avatar:{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:C.accent,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},avatarText:{...typography.title,color:C.accent},flex:{flex:1,minWidth:0},name:{...typography.bodyStrong,color:C.text},status:{...typography.caption,color:C.accent,maxWidth:88,textAlign:'right'},empty:{...typography.body,color:C.muted,paddingVertical:spacing.md,textAlign:'center'},miniActions:{gap:spacing.xs},titleText:{...typography.caption,color:C.accent},manage:{width:48,height:48,alignItems:'center',justifyContent:'center'},manageText:{fontSize:22,color:C.accent,fontWeight:'900'}});

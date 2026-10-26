import {useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {GuildCrest} from './SocialIdentity';
import {ThemedIcon} from './ThemedNavigationIcon';
import {GUILD_NAME_MAX_LENGTH,guildNameError,normalizeGuildName} from '../core/identity-names';
import {guildTagAvailabilityMessage,normalizeGuildTag,type GuildTagAvailability} from '../core/guild-tags';
import {
 createOnlineGuild,guildTagAvailability,requestGuildMembership,respondGuildInvitation,
 searchOnlineGuilds,socialInvitations,type GuildInvitationView,type OnlineGuild,
} from '../online/social';

type Page='welcome'|'find'|'details'|'create';
type DirectoryFilter='recruiting'|'open'|'apply'|'all';

/** Only mounted for signed-in players without a Guild.
 * Membership checks stay in GuildScreen; no member-only actions are mounted here. */
export function GuildDiscoveryFlow({onJoined}:{onJoined:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [page,setPage]=useState<Page>('welcome');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState<DirectoryFilter>('recruiting');
 const [guilds,setGuilds]=useState<OnlineGuild[]>([]),[selected,setSelected]=useState<OnlineGuild|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [invites,setInvites]=useState<GuildInvitationView[]>([]);
 const [requested,setRequested]=useState<string[]>([]);
 const [name,setName]=useState(''),[tag,setTag]=useState(''),[tagStatus,setTagStatus]=useState<GuildTagAvailability|null>(null);
 const [policy,setPolicy]=useState<'open'|'apply'>('open');
 useEffect(()=>{let alive=true;void socialInvitations().then(data=>{if(alive)setInvites(data.guild??[])}).catch(()=>{});return()=>{alive=false}},[]);
 useEffect(()=>{
  if(page!=='find')return;
  let alive=true;
  const timer=setTimeout(()=>{
   setLoading(true);setError('');
   void searchOnlineGuilds(search,filter).then(rows=>{if(alive)setGuilds(rows)}).catch(reason=>{if(alive)setError(messageOf(reason))}).finally(()=>{if(alive)setLoading(false)});
  },search?300:0);
  return()=>{alive=false;clearTimeout(timer)};
 },[page,search,filter]);
 const openFind=()=>{setError('');setPage('find')};
 const apply=async(guild:OnlineGuild)=>{
  if(busy||requested.includes(guild.id))return;
  setBusy(true);setError('');
  try{
   const response=await requestGuildMembership(guild.id);
   if(response==='joined'){onJoined();return;}
   setRequested(current=>[...current,guild.id]);
   setPage('details');
  }catch(reason){setError(messageOf(reason))}
  finally{setBusy(false)}
 };
 const respondInvite=async(id:string,accept:boolean)=>{
  if(busy)return;setBusy(true);setError('');
  try{await respondGuildInvitation(id,accept);setInvites(current=>current.filter(row=>row.id!==id));if(accept)onJoined()}
  catch(reason){setError(messageOf(reason))}
  finally{setBusy(false)}
 };
 const checkTag=async()=>{
  setBusy(true);setError('');
  try{const status=await guildTagAvailability(tag);setTagStatus(status);return status}
  catch(reason){setError(messageOf(reason));return null}
  finally{setBusy(false)}
 };
 const create=async()=>{
  if(busy)return;
  const problem=guildNameError(name);
  if(problem){setError(problem);return}
  setBusy(true);setError('');
  try{
   const status=tagStatus?.normalizedTag===normalizeGuildTag(tag)?tagStatus:await guildTagAvailability(tag);
   setTagStatus(status);
   if(!status.available)throw new Error(guildTagAvailabilityMessage(status));
   await createOnlineGuild(normalizeGuildName(name),status.normalizedTag!,policy,1);
   onJoined();
  }catch(reason){setError(messageOf(reason))}
  finally{setBusy(false)}
 };
 const back=()=>{setError('');setPage(page==='details'?'find':'welcome')};
 const nameProblem=name?guildNameError(name):'';
 return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
  {page==='welcome'?<>
   <Panel><View style={s.hero}><View style={s.heroIcon}><ThemedIcon name="guild" size={42}/></View><Text accessibilityRole="header" style={s.h1}>Find your Guild</Text><Text style={s.subtitle}>Adventure together, tackle Guild Projects, and earn shared rewards.</Text></View>
    <GameButton title="Find a Guild" onPress={openFind}/>
    <View style={s.space}/>
    <GameButton title="Create a Guild" tone="secondary" onPress={()=>setPage('create')}/>
   </Panel>
   {invites.length?<Panel><Text style={s.heading}>Your Guild invitations</Text>
    {invites.map(invite=><View key={invite.id} style={s.invite}><View style={s.flex}><Text style={s.guildName}>{invite.guildName}{invite.guildTag?' ['+invite.guildTag+']':''}</Text><Text style={s.muted}>Invited by {invite.inviterName} · Min Lv. {invite.minimumLevel}</Text></View><View style={s.actions}><GameButton compact title="Accept" disabled={busy} onPress={()=>void respondInvite(invite.id,true)}/><GameButton compact title="Decline" tone="secondary" disabled={busy} onPress={()=>void respondInvite(invite.id,false)}/></View></View>)}
   </Panel>:null}
   <View style={s.info}><ThemedIcon name="guild" size={21}/><Text style={s.muted}>Already have an invitation? You can accept it here. Guild features appear once you join.</Text></View>
  </>:null}

  {page!=='welcome'?<View style={s.top}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={s.back}><Text style={s.backText}>‹</Text></Pressable><Text accessibilityRole="header" style={s.h2}>{page==='find'?'Find a Guild':page==='create'?'Create a Guild':'Guild Details'}</Text></View>:null}

  {page==='find'?<>
   <Panel><GameTextInput accessibilityLabel="Search Guild name or TAG" placeholder="Search name or TAG…" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} autoCapitalize="none" style={s.input}/>
    <View style={s.filters}>{([['recruiting','Recruiting'],['open','Open'],['apply','Applications'],['all','All']] as const).map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:filter===id}} onPress={()=>setFilter(id)} style={[s.chip,filter===id&&s.chipActive]}><Text style={[s.chipText,filter===id&&s.chipTextActive]}>{label}</Text></Pressable>)}</View>
    <View style={s.sectionHead}><Text style={s.heading}>{filter==='recruiting'?'Recruiting Guilds':'Guild Directory'}</Text><Text style={s.muted}>{loading?'Loading…':guilds.length+' found'}</Text></View>
    {loading?<ActivityIndicator color={C.accent}/>:null}
    {!loading&&guilds.length===0?<Text style={s.empty}>{search?'No matching Guilds. Try another name or TAG.':'No Guilds found for this filter. You can create your own.'}</Text>:null}
    {!loading&&guilds.map(guild=><Pressable key={guild.id} accessibilityRole="button" accessibilityLabel={'View '+guild.name} onPress={()=>{setSelected(guild);setError('');setPage('details')}} style={s.guildRow}>
      <GuildCrest size={40} bannerId={guild.banner_id} frameId={guild.profile_frame_id}/>
      <View style={s.flex}><Text style={s.guildName}>{guild.name} {guild.tag?'['+guild.tag+']':''}</Text><Text style={s.muted}>Lv. {guild.level} · Capacity {guild.member_cap} · Min Lv. {guild.minimum_level}</Text><Text style={s.guildHint}>{guild.join_policy==='open'?'Open · instant join':guild.join_policy==='apply'?'Recruiting · applications':'Invite only'}{guild.motto?' · '+guild.motto:''}</Text></View><Text style={s.arrow}>›</Text>
     </Pressable>)}
   </Panel>
   <GameButton title="Create a Guild instead" tone="secondary" onPress={()=>setPage('create')}/>
  </>:null}

  {page==='details'&&selected?<Panel>
   <View style={s.detailHead}><GuildCrest size={62} bannerId={selected.banner_id} frameId={selected.profile_frame_id}/><View style={s.flex}><Text style={s.h2}>{selected.name}</Text><Text style={s.muted}>{selected.tag?'['+selected.tag+'] · ':''}Guild Level {selected.level}</Text><Text style={s.muted}>Capacity {selected.member_cap} · Minimum Level {selected.minimum_level}</Text></View></View>
   <Text style={s.heading}>About the Guild</Text><Text style={s.description}>{selected.motto||'This Guild has not added a description yet.'}</Text>
   <Text style={s.muted}>{selected.join_policy==='open'?'Open recruitment: join immediately.':selected.join_policy==='apply'?'Applications: a Guild officer must accept you.':'This Guild accepts invitations only.'}</Text>
   {requested.includes(selected.id)?<Text style={s.positive}>Application sent. An officer can review your request.</Text>:null}
   <GameButton title={requested.includes(selected.id)?'Application pending':selected.join_policy==='open'?'Join Guild':selected.join_policy==='apply'?'Apply to Join':'Invite only'} disabled={busy||selected.join_policy==='invite'||requested.includes(selected.id)} onPress={()=>void apply(selected)}/>
  </Panel>:null}

  {page==='create'?<Panel>
   <Text style={s.heading}>Found your own Guild</Text>
   <Text style={s.muted}>Choose a unique name and permanent three-letter TAG.</Text>
   <Text style={s.label}>Guild name</Text>
   <GameTextInput accessibilityLabel="New Guild name" placeholder="Guild name" placeholderTextColor={C.muted} value={name} maxLength={GUILD_NAME_MAX_LENGTH} onChangeText={setName} style={s.input}/>
   {nameProblem?<Text style={s.error}>{nameProblem}</Text>:null}
   <Text style={s.label}>Guild TAG</Text>
   <View style={s.tagRow}><GameTextInput accessibilityLabel="Guild TAG" placeholder="TAG" placeholderTextColor={C.muted} autoCapitalize="characters" value={tag} onChangeText={value=>{setTag(normalizeGuildTag(value).slice(0,3));setTagStatus(null)}} maxLength={3} style={[s.input,s.flex]}/><View style={s.tagCheck}><GameButton compact title="Check TAG" disabled={busy||tag.length!==3} onPress={()=>void checkTag()}/></View></View>
   <Text style={tagStatus?.available?s.positive:tagStatus?s.error:s.muted}>{tagStatus?guildTagAvailabilityMessage(tagStatus):'Exactly 3 letters. Guild TAGs cannot be reused.'}</Text>
   <Text style={s.label}>Recruitment</Text>
   <View style={s.filters}><Pressable onPress={()=>setPolicy('open')} accessibilityRole="button" accessibilityState={{selected:policy==='open'}} style={[s.chip,policy==='open'&&s.chipActive]}><Text style={s.chipText}>Open · instant join</Text></Pressable><Pressable onPress={()=>setPolicy('apply')} accessibilityRole="button" accessibilityState={{selected:policy==='apply'}} style={[s.chip,policy==='apply'&&s.chipActive]}><Text style={s.chipText}>Application required</Text></Pressable></View>
   <GameButton title="Create Guild" disabled={busy||!!nameProblem||normalizeGuildName(name).length<3||!tagStatus?.available||tagStatus.normalizedTag!==normalizeGuildTag(tag)} onPress={()=>void create()}/>
  </Panel>:null}

  {error?<Panel><Text accessibilityRole="alert" style={s.error}>{error}</Text><GameButton compact title="Retry" tone="secondary" onPress={()=>{if(page==='find'){setSearch(value=>value+' ');setSearch(value=>value.trim())}else setError('')}}/></Panel>:null}
 </ScrollView>;
}

function messageOf(reason:unknown){return reason instanceof Error?reason.message:'Could not load Guild information. Please try again.'}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{padding:14,gap:12,paddingBottom:34},hero:{alignItems:'center',paddingVertical:24,gap:10},heroIcon:{padding:14,borderWidth:1,borderColor:C.lineStrong,borderRadius:20,backgroundColor:C.panelRaised},h1:{fontSize:26,color:C.text,fontWeight:'800',textAlign:'center'},h2:{fontSize:20,color:C.text,fontWeight:'800',flexShrink:1},
 subtitle:{fontSize:14,lineHeight:20,color:C.muted,textAlign:'center',maxWidth:300},heading:{fontSize:15,fontWeight:'800',color:C.text},muted:{fontSize:12,lineHeight:17,color:C.muted},info:{flexDirection:'row',gap:12,paddingHorizontal:8,alignItems:'center'},space:{height:8},
 top:{flexDirection:'row',gap:12,alignItems:'center'},back:{width:42,height:40,borderRadius:12,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center'},backText:{fontSize:30,color:C.text,lineHeight:32},
 input:{minHeight:44,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.inputBg,color:C.text,paddingHorizontal:12,marginTop:8},filters:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10,marginBottom:10},
 chip:{borderRadius:18,paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panelRaised},chipActive:{backgroundColor:C.selection,borderColor:C.selectionLine},chipText:{color:C.muted,fontSize:12,fontWeight:'700'},chipTextActive:{color:C.text},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:9,paddingBottom:5},
 empty:{color:C.muted,fontSize:13,textAlign:'center',padding:18},guildRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:12,borderTopWidth:1,borderColor:C.line},
 guildName:{color:C.text,fontSize:14,fontWeight:'700'},guildHint:{color:C.info,fontSize:11,lineHeight:15,marginTop:3},flex:{flex:1,minWidth:0},arrow:{fontSize:26,color:C.muted},
 detailHead:{flexDirection:'row',alignItems:'center',gap:14,paddingBottom:18},description:{color:C.text,fontSize:13,lineHeight:20,marginVertical:8},
 positive:{fontSize:12,lineHeight:18,color:C.good},label:{color:C.text,fontWeight:'700',fontSize:12,marginTop:12},
 tagRow:{flexDirection:'row',alignItems:'center',gap:8},tagCheck:{minWidth:105},error:{color:C.bad,fontSize:12,lineHeight:19},invite:{paddingVertical:12,borderTopWidth:1,borderColor:C.line,gap:6},actions:{flexDirection:'row',gap:7},
 });}

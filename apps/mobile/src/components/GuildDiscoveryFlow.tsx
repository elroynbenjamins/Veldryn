import {useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,touchTargetMin,type ThemeColors} from '../theme/theme';
import {GameButton} from './GameButton';
import {GameTextInput} from './GameTextInput';
import {Panel} from './Panel';
import {GuildCrest} from './SocialIdentity';
import {GuildBoardHero} from './GuildBoardHero';
import {ThemedIcon} from './ThemedNavigationIcon';
import {StatusPill} from './StatusPill';
import {GUILD_NAME_MAX_LENGTH,guildNameError,normalizeGuildName} from '../core/identity-names';
import {guildTagAvailabilityMessage,normalizeGuildTag,type GuildTagAvailability} from '../core/guild-tags';
import {
 createOnlineGuild,guildDetails,guildTagAvailability,pendingGuildApplications,requestGuildMembership,respondGuildInvitation,
 searchOnlineGuilds,socialInvitations,type GuildInvitationView,type OnlineGuild,
} from '../online/social';

type Page='welcome'|'find'|'details'|'create';
type DirectoryFilter='recruiting'|'open'|'apply'|'all';
type PendingApplication={guildId:string;name:string};
const filters:readonly {id:DirectoryFilter;label:string}[]=[
 {id:'recruiting',label:'Recruiting'},{id:'open',label:'Open'},{id:'apply',label:'Applications'},{id:'all',label:'All'},
];
const failureText=(reason:unknown)=>reason instanceof Error?reason.message:'Guild service unavailable. Please retry.';
const guildPolicy=(guild:OnlineGuild)=>typeof guild.member_count==='number'&&guild.member_count>=guild.member_cap?'FULL':guild.join_policy==='open'?'OPEN':guild.join_policy==='apply'?'APPLICATION':'INVITE ONLY';

/** The Guild destination for accounts with no membership. No Guild Hall or member actions mount here. */
export function GuildDiscoveryFlow({onJoined}:{onJoined:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const scrollRef=useRef<ScrollView>(null);
 const [page,setPage]=useState<Page>('welcome');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState<DirectoryFilter>('recruiting');
 const [guilds,setGuilds]=useState<OnlineGuild[]>([]),[selected,setSelected]=useState<OnlineGuild|null>(null);
 const [loaded,setLoaded]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [reloadIndex,setReloadIndex]=useState(0);
 const [invites,setInvites]=useState<GuildInvitationView[]>([]);
 const [requested,setRequested]=useState<string[]>([]);
 const [pending,setPending]=useState<PendingApplication[]>([]);
 const [name,setName]=useState(''),[tag,setTag]=useState(''),[tagStatus,setTagStatus]=useState<GuildTagAvailability|null>(null);
 const [policy,setPolicy]=useState<'open'|'apply'>('open');

 useEffect(()=>{
  let active=true;
  void socialInvitations().then(data=>{if(active)setInvites(data.guild??[])}).catch(()=>{});
  void pendingGuildApplications().then(async rows=>{
   const detail=await Promise.all(rows.map(async row=>{
    const guild=await guildDetails(row.guild_id).catch(()=>null);
    return {guildId:row.guild_id,name:guild?.name??'Guild'};
   }));
   if(active){setPending(detail);setRequested(rows.map(row=>row.guild_id))}
  }).catch(()=>{});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(page!=='find')return;
  let active=true;
  setLoading(true);setError('');
  const timer=setTimeout(()=>{
   void searchOnlineGuilds(search,filter)
    .then(rows=>{if(active){setGuilds(rows);setLoaded(true)}})
    .catch(reason=>{if(active){setGuilds([]);setError(failureText(reason))}})
    .finally(()=>{if(active)setLoading(false)});
  },search?300:0);
  return()=>{active=false;clearTimeout(timer)};
 },[page,search,filter,reloadIndex]);
 useEffect(()=>{scrollRef.current?.scrollTo({y:0,animated:false})},[page]);

 const navigate=(next:Page)=>{
  if(busy)return;
  setError('');
  setPage(next);
 };
 const back=()=>navigate(page==='details'?'find':'welcome');
 const openDetails=(guild:OnlineGuild)=>{setSelected(guild);navigate('details')};
 const apply=async(guild:OnlineGuild)=>{
  if(busy||requested.includes(guild.id)||guild.join_policy==='invite'||(typeof guild.member_count==='number'&&guild.member_count>=guild.member_cap))return;
  setBusy(true);setError('');
  try{
   const outcome=await requestGuildMembership(guild.id);
   if(outcome==='joined'){onJoined();return}
   setRequested(current=>current.includes(guild.id)?current:[...current,guild.id]);
   setPending(current=>current.some(row=>row.guildId===guild.id)?current:[...current,{guildId:guild.id,name:guild.name}]);
  }catch(reason){setError(failureText(reason))}
  finally{setBusy(false)}
 };
 const respondInvite=async(id:string,accept:boolean)=>{
  if(busy)return;
  setBusy(true);setError('');
  try{
   await respondGuildInvitation(id,accept);
   setInvites(current=>current.filter(row=>row.id!==id));
   if(accept)onJoined();
  }catch(reason){setError(failureText(reason))}
  finally{setBusy(false)}
 };
 const tagMatches=tagStatus?.normalizedTag===normalizeGuildTag(tag);
 const checkTag=async()=>{
  if(busy||tag.length!==3)return;
  setBusy(true);setError('');
  try{
   const result=await guildTagAvailability(tag);
   setTagStatus(result);
  }catch(reason){setError(failureText(reason))}
  finally{setBusy(false)}
 };
 const nameIssue=name?guildNameError(name):'';
 const create=async()=>{
  if(busy||nameIssue||normalizeGuildName(name).length<3||tag.length!==3)return;
  setBusy(true);setError('');
  try{
   const checked=tagMatches?tagStatus:await guildTagAvailability(tag);
   setTagStatus(checked??null);
   if(!checked?.available)throw new Error(checked?guildTagAvailabilityMessage(checked):'Check the Guild TAG first.');
   await createOnlineGuild(normalizeGuildName(name),checked.normalizedTag!,policy,1);
   onJoined();
  }catch(reason){setError(failureText(reason))}
  finally{setBusy(false)}
 };

 return <ScrollView ref={scrollRef} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  {page==='welcome'?<>
   <GuildBoardHero title="Find your people" subtitle="Forge alliances, take on Guild challenges, and grow together."/>
   <Panel style={s.entryPanel}>
    <View style={s.center}>
     <Text style={s.eyebrow}>WELCOME TO GUILDS</Text>
     <Text accessibilityRole="header" style={s.title}>Your next adventure starts here</Text>
     <Text style={s.centerText}>Discover a Guild that fits your playstyle, or build your own.</Text>
    </View>
    <GameButton title="Find a Guild" onPress={()=>navigate('find')}/>
    <GameButton title="Create a Guild" tone="secondary" onPress={()=>navigate('create')}/>
    <View style={s.benefits}>
     <Benefit icon="friends" label="Play alongside other adventurers" C={C}/>
     <Benefit icon="quests" label="Work toward shared Guild rewards" C={C}/>
     <Benefit icon="guild" label="Build a lasting Guild identity" C={C}/>
    </View>
   </Panel>
   {invites.length?<Panel>
    <View style={s.sectionRow}><Text style={s.section}>INVITATIONS</Text><StatusPill label={String(invites.length)+' PENDING'} tone="info"/></View>
    {invites.map(invite=><View key={invite.id} style={s.invite}>
     <View style={s.flex}><Text style={s.guildName}>{invite.guildName}{invite.guildTag?' ['+invite.guildTag+']':''}</Text><Text style={s.muted}>Invited by {invite.inviterName} · {invite.memberCount}/{invite.memberCap} members</Text></View>
     <View style={s.inviteActions}><GameButton compact title="Accept" disabled={busy} onPress={()=>void respondInvite(invite.id,true)}/><GameButton compact tone="secondary" title="Decline" disabled={busy} onPress={()=>void respondInvite(invite.id,false)}/></View>
    </View>)}
   </Panel>:null}
   {pending.length?<Panel>
    <View style={s.sectionRow}><Text style={s.section}>YOUR APPLICATIONS</Text><StatusPill label="AWAITING REVIEW" tone="warning"/></View>
    {pending.map(row=><View key={row.guildId} style={s.pendingLine}><Text style={s.guildName}>{row.name}</Text><Text style={s.muted}>An officer will review your request.</Text></View>)}
   </Panel>:null}
  </>:null}

  {page!=='welcome'?<View style={s.headingRow}>
   <Pressable accessibilityRole="button" accessibilityLabel="Back to previous Guild screen" onPress={back} style={s.back}><Text style={s.backSymbol}>‹</Text></Pressable>
   <View style={s.flex}><Text style={s.eyebrow}>GUILD NETWORK</Text><Text accessibilityRole="header" style={s.pageTitle}>{page==='find'?'Find a Guild':page==='create'?'Create a Guild':'Guild Details'}</Text></View>
  </View>:null}

  {page==='find'?<>
   <Panel>
    <Text style={s.label}>SEARCH GUILDS</Text>
    <GameTextInput accessibilityLabel="Search Guild name or TAG" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} placeholder="Search guild name or TAG…" placeholderTextColor={C.muted} style={s.input}/>
    <View style={s.filters}>{filters.map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected:filter===option.id}} onPress={()=>setFilter(option.id)} style={[s.filter,filter===option.id&&s.filterSelected]}><Text style={[s.filterText,filter===option.id&&s.filterTextSelected]}>{option.label}</Text></Pressable>)}</View>
   </Panel>
   <View style={s.sectionRow}><View style={s.flex}><Text style={s.section}>{filter==='recruiting'?'RECRUITING GUILDS':'GUILD DIRECTORY'}</Text><Text style={s.muted}>Browse a Guild's identity before joining.</Text></View><Text style={s.count}>{loading?'Searching…':String(guilds.length)+(guilds.length===50?'+':'')+' shown'}</Text></View>
   {loading?<Panel><ActivityIndicator color={C.accent}/><Text style={s.mutedCenter}>Finding Guilds…</Text></Panel>:null}
   {!loading&&!error&&loaded&&!guilds.length?<Panel><Text style={s.emptyTitle}>No Guilds found</Text><Text style={s.centerText}>Try another name, TAG, or recruitment filter.</Text><GameButton title="Create a Guild" tone="secondary" onPress={()=>navigate('create')}/></Panel>:null}
   {!loading&&guilds.map(guild=><Pressable key={guild.id} accessibilityRole="button" accessibilityLabel={'View '+guild.name+' Guild details'} onPress={()=>openDetails(guild)} style={({pressed})=>[s.guildCard,pressed&&s.pressed]}>
    <GuildCrest size={56} bannerId={guild.banner_id} frameId={guild.profile_frame_id}/>
    <View style={s.flex}>
     <Text numberOfLines={1} style={s.guildName}>{guild.name} {guild.tag?'['+guild.tag+']':''}</Text>
     <View style={s.metaRow}><StatusPill label={guildPolicy(guild)} tone={guildPolicy(guild)==='FULL'?'warning':guild.join_policy==='open'?'good':guild.join_policy==='apply'?'info':'muted'}/><Text style={s.stat}>LV. {guild.level}</Text><Text style={s.stat}>{typeof guild.member_count==='number'?guild.member_count+'/'+guild.member_cap+' MEMBERS':'MAX '+guild.member_cap}</Text></View>
     {guild.motto?<Text numberOfLines={2} style={s.motto}>{guild.motto}</Text>:<Text style={s.muted}>Minimum player level {guild.minimum_level}</Text>}
    </View>
    <Text style={s.chevron}>›</Text>
   </Pressable>)}
   <GameButton title="Create your own Guild" tone="secondary" onPress={()=>navigate('create')}/>
  </>:null}

  {page==='details'&&selected?<>
   <GuildBoardHero title={selected.name} subtitle={(selected.tag?'['+selected.tag+'] · ':'')+'Guild Level '+selected.level}/>
   <Panel>
    <View style={s.detailHeader}>
     <GuildCrest size={70} bannerId={selected.banner_id} frameId={selected.profile_frame_id}/>
     <View style={s.flex}><Text style={s.guildTitle}>{selected.name}</Text><Text style={s.muted}>{selected.tag?'['+selected.tag+'] · ':''}Guild Level {selected.level}</Text><StatusPill label={guildPolicy(selected)} tone={guildPolicy(selected)==='FULL'?'warning':selected.join_policy==='open'?'good':selected.join_policy==='apply'?'info':'muted'}/></View>
    </View>
    <View style={s.statRow}><InfoStat title={'LV. '+selected.level} label="Guild Level" C={C}/><InfoStat title={typeof selected.member_count==='number'?selected.member_count+'/'+selected.member_cap:String(selected.member_cap)} label="Members" C={C}/><InfoStat title={'LV. '+selected.minimum_level} label="To Join" C={C}/></View>
    <Text style={s.section}>ABOUT THIS GUILD</Text>
    <Text style={s.description}>{selected.motto||'This Guild has not written a motto yet.'}</Text>
    <View style={s.detailNote}><Text style={s.muted}>{guildPolicy(selected)==='FULL'?'This Guild is currently full. You can browse other recruiting Guilds.':selected.join_policy==='open'?'Open recruitment: eligible players can join immediately.':selected.join_policy==='apply'?'Applications: a Guild officer decides whether to accept you.':'This Guild currently accepts invitations only.'}</Text></View>
   </Panel>
   {requested.includes(selected.id)?<Panel accentColor={C.info} accentSurface={C.infoSurface}><Text style={s.guildName}>Application sent</Text><Text style={s.muted}>Your request is waiting for Guild officer review. You can keep browsing other Guilds.</Text></Panel>:null}
   <GameButton title={requested.includes(selected.id)?'Application pending':guildPolicy(selected)==='FULL'?'Guild Full':selected.join_policy==='open'?'Join Guild':selected.join_policy==='apply'?'Apply to Join':'Invite only'} loading={busy} disabled={busy||selected.join_policy==='invite'||requested.includes(selected.id)||guildPolicy(selected)==='FULL'} onPress={()=>void apply(selected)}/>
   <GameButton title="Back to Guilds" tone="secondary" onPress={()=>navigate('find')}/>
  </>:null}

  {page==='create'?<>
   <GuildBoardHero title="Found a new Guild" subtitle="Choose a name and a permanent identity your members can be proud of." compact/>
   <Panel>
    <Text style={s.section}>GUILD PREVIEW</Text>
    <View style={s.preview}><GuildCrest size={68}/><View style={s.flex}><Text numberOfLines={2} style={s.guildTitle}>{normalizeGuildName(name)||'Your Guild Name'}</Text><Text style={s.muted}>{tag?'['+tag+']':'[TAG]'} · Founder</Text></View></View>
    <Text style={s.label}>Guild name</Text>
    <GameTextInput accessibilityLabel="New Guild name" placeholder="Enter your Guild name" placeholderTextColor={C.muted} value={name} onChangeText={setName} maxLength={GUILD_NAME_MAX_LENGTH} style={s.input}/>
    <View style={s.sectionRow}><Text style={[s.helper,nameIssue&&s.invalid]}>{nameIssue||'Choose a clear, memorable name.'}</Text><Text style={s.helper}>{name.length}/{GUILD_NAME_MAX_LENGTH}</Text></View>
    <Text style={s.label}>Guild TAG</Text>
    <View style={s.tagRow}><GameTextInput accessibilityLabel="Guild TAG" autoCapitalize="characters" autoCorrect={false} placeholder="ABC" placeholderTextColor={C.muted} maxLength={3} value={tag} onChangeText={value=>{setTag(normalizeGuildTag(value).slice(0,3));setTagStatus(null)}} style={[s.input,s.tagInput]}/><View style={s.check}><GameButton title="Check TAG" compact tone="secondary" loading={busy} disabled={busy||tag.length!==3} onPress={()=>void checkTag()}/></View></View>
    <Text style={[s.helper,tagMatches&&tagStatus?.available&&s.available,tagMatches&&tagStatus&&!tagStatus.available&&s.invalid]}>{tagMatches&&tagStatus?guildTagAvailabilityMessage(tagStatus):'Three letters. TAGs are permanently reserved and cannot be reused.'}</Text>
    <Text style={s.label}>How will players join?</Text>
    <View style={s.policyList}>{([['open','Open Guild','Players join immediately when eligible.'],['apply','Applications','Guild officers approve each request.']] as const).map(([id,title,detail])=><Pressable key={id} accessibilityRole="radio" accessibilityState={{checked:policy===id}} onPress={()=>setPolicy(id)} style={[s.policyCard,policy===id&&s.policySelected]}><View style={[s.radio,policy===id&&s.radioSelected]}/><View style={s.flex}><Text style={s.guildName}>{title}</Text><Text style={s.muted}>{detail}</Text></View></Pressable>)}</View>
    <Text style={s.helper}>Minimum level starts at 1. Guild leaders can manage recruitment settings later.</Text>
   </Panel>
   <GameButton title="Create Guild" loading={busy} disabled={busy||!!nameIssue||normalizeGuildName(name).length<3||tag.length!==3||!tagMatches||!tagStatus?.available} onPress={()=>void create()}/>
  </>:null}

  {error?<Panel accentColor={C.bad} accentSurface={C.badSurface}>
    <Text accessibilityRole="alert" style={s.invalid}>{error}</Text>
    {page==='find'?<GameButton title="Retry search" compact tone="secondary" onPress={()=>{setError('');setReloadIndex(n=>n+1)}}/>:null}
   </Panel>:null}
 </ScrollView>;
}

function Benefit({icon,label,C}:{icon:'friends'|'quests'|'guild';label:string;C:ThemeColors}){
 return <View style={{flexDirection:'row',alignItems:'center',gap:11,minHeight:33}}>
  <View style={{width:29,alignItems:'center'}}><ThemedIcon name={icon} size={23}/></View>
  <Text style={{color:C.muted,fontSize:12,lineHeight:18,flex:1}}>{label}</Text>
 </View>;
}
function InfoStat({title,label,C}:{title:string;label:string;C:ThemeColors}){
 return <View style={{flex:1,minWidth:0,alignItems:'center',paddingVertical:9,borderRadius:9,backgroundColor:C.panel2}}>
  <Text style={{color:C.text,fontSize:15,fontWeight:'800'}}>{title}</Text>
  <Text style={{color:C.muted,fontSize:10,lineHeight:15}}>{label}</Text>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:12,paddingBottom:92},flex:{flex:1,minWidth:0},entryPanel:{gap:10},center:{alignItems:'center',gap:7,paddingVertical:13,paddingHorizontal:8},centerText:{color:C.muted,textAlign:'center',fontSize:13,lineHeight:19},
 eyebrow:{fontSize:10,lineHeight:14,fontWeight:'900',letterSpacing:1.1,color:C.accent},title:{...typography.title,color:C.text,fontSize:21,lineHeight:27,textAlign:'center'},pageTitle:{...typography.title,color:C.text},section:{color:C.accent,fontSize:10,fontWeight:'900',letterSpacing:1},
 benefits:{borderTopWidth:1,borderColor:C.line,paddingTop:12,marginTop:5,gap:6},sectionRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:7},muted:{color:C.muted,fontSize:12,lineHeight:17},mutedCenter:{color:C.muted,fontSize:12,textAlign:'center'},stat:{color:C.muted,fontSize:10,fontWeight:'700'},count:{color:C.muted,fontSize:11,fontWeight:'700'},
 guildName:{color:C.text,fontSize:14,lineHeight:19,fontWeight:'800'},guildTitle:{color:C.text,fontSize:20,lineHeight:26,fontWeight:'800'},guildCard:{minHeight:102,flexDirection:'row',alignItems:'center',gap:10,borderRadius:12,padding:12,backgroundColor:C.panel,borderColor:C.line,borderWidth:1},pressed:{opacity:.76},
 metaRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6,marginTop:5},motto:{color:C.muted,fontSize:11,lineHeight:16,fontStyle:'italic',marginTop:5},chevron:{color:C.accent,fontSize:25,lineHeight:30},
 invite:{gap:8,paddingTop:10,borderTopWidth:1,borderColor:C.line},inviteActions:{flexDirection:'row',flexWrap:'wrap',gap:8},pendingLine:{paddingVertical:6,gap:3},
 headingRow:{flexDirection:'row',alignItems:'center',gap:10},back:{minWidth:touchTargetMin,minHeight:touchTargetMin,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel},backSymbol:{fontSize:30,lineHeight:34,color:C.text},
 label:{color:C.text,fontSize:12,lineHeight:18,fontWeight:'800',marginTop:8},input:{minHeight:48,paddingHorizontal:12,marginTop:6,color:C.text,backgroundColor:C.inputBg,borderWidth:1,borderColor:C.lineStrong,borderRadius:9},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:10},filter:{minHeight:touchTargetMin,paddingHorizontal:12,borderRadius:9,alignItems:'center',justifyContent:'center',borderColor:C.line,borderWidth:1,backgroundColor:C.panel2},
 filterSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},filterText:{color:C.muted,fontSize:12,fontWeight:'700'},filterTextSelected:{color:C.text},
 emptyTitle:{color:C.text,fontSize:16,fontWeight:'800',textAlign:'center'},detailHeader:{flexDirection:'row',gap:13,alignItems:'center'},statRow:{flexDirection:'row',gap:8,marginTop:10,marginBottom:12},description:{color:C.text,fontSize:13,lineHeight:20},detailNote:{backgroundColor:C.panel2,borderRadius:10,padding:11},
 preview:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:10,padding:9},
 helper:{fontSize:11,lineHeight:16,color:C.muted,flexShrink:1},invalid:{color:C.bad,fontSize:12,lineHeight:18},available:{color:C.good},
 tagRow:{flexDirection:'row',alignItems:'center',gap:8},tagInput:{flex:1,minWidth:0,letterSpacing:3,fontWeight:'800'},check:{minWidth:112,marginTop:6},
 policyList:{gap:8,marginTop:5},policyCard:{minHeight:64,flexDirection:'row',alignItems:'center',gap:12,padding:11,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},policySelected:{borderColor:C.selectionLine,backgroundColor:C.selection},radio:{width:18,height:18,borderRadius:9,borderWidth:2,borderColor:C.muted},radioSelected:{borderColor:C.accent,backgroundColor:C.accentSurface},
 });}

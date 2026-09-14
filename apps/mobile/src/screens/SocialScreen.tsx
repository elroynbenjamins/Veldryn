import {useCallback,useEffect,useRef,useState} from 'react';
import {Alert,ScrollView,StyleSheet,Text,View} from 'react-native';
import {PartyHubPanel} from '../components/PartyHubPanel';
import {PartyEventHubPanel} from '../components/PartyEventHubPanel';
import {SocialHubPanel,type SocialHubTab} from '../components/SocialHubPanel';
import {GuildSeekerPanel} from '../components/GuildSeekerPanel';
import {RecruitmentComposer} from '../components/RecruitmentComposer';
import {RecruitmentFiltersPanel} from '../components/RecruitmentFiltersPanel';
import {OnlinePartyChat} from '../components/OnlinePartyChat';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {usePartySocial} from '../online/PartySocialProvider';
import {partySocialRepository as repository,ownRecruitmentPosts,partyRankings,partyCommandKey,claimPartyContractReward,activePartyEvent,type PublishRecruitmentInput,type PartyRanking} from '../online/party-social';
import {myGuild,requestGuildMembership,sendFriendRequest} from '../online/social';
import {EMPTY_RECRUITMENT_FILTERS,PARTY_SOCIAL_TUTORIAL_STEPS,recruitmentTimeLabel,type PartyFocus,type PartyRole,type RecruitmentCardView,type RecruitmentPostType} from '../core/party-social';
import {C,spacing} from '../theme/theme';
export function SocialScreen({onGuild,onFriends,onAccount}:{onGuild:()=>void;onFriends:()=>void;onAccount:()=>void}){
 const social=usePartySocial();const [tab,setTab]=useState<SocialHubTab>('party');const [filters,setFilters]=useState({...EMPTY_RECRUITMENT_FILTERS});
 const [cards,setCards]=useState<RecruitmentCardView[]>([]),[own,setOwn]=useState<RecruitmentCardView[]>([]),[rankings,setRankings]=useState<PartyRanking[]>([]),[liveEvent,setLiveEvent]=useState<import('../core/party-social').PartyEventView|null>(null);
 const [draft,setDraft]=useState<PublishRecruitmentInput|null>(null),[selected,setSelected]=useState<RecruitmentCardView|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [focus,setFocus]=useState<PartyFocus>('mixed'),[role,setRole]=useState<PartyRole>('damage'),[help,setHelp]=useState(false),[now,setNow]=useState(Date.now());
 const requestGeneration=useRef(0);const command=useRef<{signature:string;key:string}|null>(null);
 const key=(signature:string)=>{if(command.current?.signature!==signature)command.current={signature,key:partyCommandKey()};return command.current.key;};
 const load=useCallback(async()=>{const generation=++requestGeneration.current;if(!social.accountId){setCards([]);setOwn([]);setRankings([]);return;}
  try{const browse=tab==='guild'?{...filters,postTypes:['looking_for_guild'] as RecruitmentPostType[]}:filters;const [next,mine,board]=await Promise.all([repository.browseRecruitment(browse),ownRecruitmentPosts(),partyRankings()]);if(generation===requestGeneration.current){setCards(next);setOwn(mine);setRankings(board);setError('');}}
  catch(e){if(generation===requestGeneration.current){setCards([]);setError(e instanceof Error?e.message:'Social service unavailable.');}}
 },[filters,tab,social.accountId]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),250);return()=>{clearTimeout(timer);requestGeneration.current++;};},[load,social.party?.id]);
 useEffect(()=>{const timer=setInterval(()=>{setNow(Date.now());void load();},30000);return()=>clearInterval(timer);},[load]);
 useEffect(()=>{if(tab!=='events'||!social.accountId)return;void activePartyEvent().then(setLiveEvent).catch(e=>setError(e instanceof Error?e.message:'Live event unavailable.'));},[tab,social.accountId,social.party?.id]);
 const run=async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError('');try{await action();command.current=null;await social.refresh();await load();}catch(e){setError(e instanceof Error?e.message:'Please try again.');await social.refresh();}finally{setBusy(false);}};
 const character=()=>{if(!social.characterId)throw new Error('Sync your character in Account settings first.');return social.characterId;};
 const post=(postType:RecruitmentPostType)=>void run(async()=>{const guild=postType==='guild_recruiting'?await myGuild():null;setDraft({postType,title:'',body:'',focus,roles:[role],ownerCharacterId:character(),durationDays:postType.includes('guild')?3:1,...(postType==='party_recruiting'?{partyId:social.party?.id,openSpots:Math.max(0,4-(social.party?.members.length??0))}:{}),...(guild?{guildId:guild.guild_id}:{})});});
 // Local countdown advances between snapshots; expiry is also enforced by the database query.
 const clock=useRef({server:now,local:now});useEffect(()=>{if(social.serverTime)clock.current={server:Date.parse(social.serverTime),local:Date.now()};},[social.serverTime]);
 const at=clock.current.server+(now-clock.current.local);
 return <SocialHubPanel active={tab} onChange={next=>{setTab(next);setSelected(null);setDraft(null);}}><ScrollView contentContainerStyle={s.content}>
  <View style={s.row}><GameButton title="Friends" tone="secondary" onPress={onFriends}/><GameButton title="Social help" tone="secondary" onPress={()=>setHelp(!help)}/><GameButton title={busy?'Working…':'Refresh'} tone="secondary" disabled={busy} onPress={()=>void run(async()=>{})}/></View>
  {help&&<Panel>{PARTY_SOCIAL_TUTORIAL_STEPS.map(step=><Text key={step} style={s.text}>{step}</Text>)}</Panel>}
  {!!(error||social.error)&&<Text accessibilityRole="alert" style={s.error}>{error||social.error}</Text>}
  {!social.accountId?<Panel><Text style={s.text}>{social.loading?'Loading account…':'Sign in and sync a character to use Parties and Recruitment.'}</Text><GameButton title="Account settings" onPress={onAccount}/></Panel>:<>
   <View style={s.row}>{(['damage','tank','support'] as const).map(value=><GameButton key={value} title={`${role===value?'✓ ':''}${value}`} tone="secondary" onPress={()=>setRole(value)}/>)}</View>
   {!social.party&&<View style={s.row}>{(['combat','skilling','mixed'] as const).map(value=><GameButton key={value} title={`${focus===value?'✓ ':''}${value}`} tone="secondary" onPress={()=>setFocus(value)}/>)}</View>}
   {draft&&<RecruitmentComposer key={draft.postType} initial={draft} busy={busy} onCancel={()=>setDraft(null)} onPublish={input=>void run(async()=>{await repository.publishRecruitment(input);setDraft(null);})}/>}
   {selected&&<Panel><Text style={s.title}>{selected.title}</Text><Text style={s.text}>{selected.body}</Text><Text style={s.text}>{recruitmentTimeLabel(selected.expiresAtMs,at).text}</Text>
    {selected.partyId&&!social.party&&<GameButton title="Join Party" disabled={busy||selected.expiresAtMs<=at} onPress={()=>void run(async()=>{await repository.joinParty({partyId:selected.partyId!,characterId:character(),role,idempotencyKey:key(`join:${selected.partyId}`)});setSelected(null);})}/>}
    {selected.guildId&&<GameButton title="Join / apply to Guild" disabled={busy} onPress={()=>void run(async()=>{const result=await requestGuildMembership(selected.guildId!);Alert.alert('Guild',result);})}/>}
    {selected.ownerAccountId&&selected.ownerAccountId!==social.accountId&&<GameButton title="Send friend request" disabled={busy} onPress={()=>void run(()=>sendFriendRequest(selected.ownerAccountId!))}/>}
    <GameButton title="Close details" tone="secondary" onPress={()=>setSelected(null)}/></Panel>}
   {tab==='party'&&<PartyHubPanel accountId={social.accountId} party={social.party} contracts={social.contracts} recruitment={cards} nowMs={at} filters={filters} onFiltersChange={setFilters}
    onCreateParty={busy?undefined:()=>void run(()=>repository.createParty({characterId:character(),role,focus,idempotencyKey:key(`create:${focus}:${role}`)}))}
    onLeaveParty={busy?undefined:()=>void run(async()=>{await repository.leaveParty({partyId:social.party!.id,idempotencyKey:key(`leave:${social.party!.id}`)});await social.refresh();})}
    onOpenPartyChat={()=>setTab('chat')} onOpenRecruitmentPost={id=>setSelected(cards.find(card=>card.id===id)??null)} onCreateRecruitmentPost={post}
    onClaimReward={busy?undefined:id=>void run(()=>claimPartyContractReward(id,character()))}/>}
   {tab==='events'&&<PartyEventHubPanel event={liveEvent} onFindParty={()=>setTab('party')} />}
   {tab==='guild'&&<><GameButton title="Open Guild directory and management" onPress={onGuild}/><GameButton title="Post Guild recruiting advert" tone="secondary" disabled={busy} onPress={()=>post('guild_recruiting')}/><RecruitmentFiltersPanel value={filters} onChange={setFilters}/><GuildSeekerPanel seekers={cards} nowMs={at} onOpen={id=>setSelected(cards.find(card=>card.id===id)??null)} onPostMyAd={()=>post('looking_for_guild')}/></>}
   {tab==='chat'&&(social.party?<OnlinePartyChat/>:<Text style={s.text}>Join a Party to use Party Chat. World and Guild chat remain available in the chat overlay.</Text>)}
   {tab==='rankings'&&<Panel><Text style={s.title}>Ranked Party events</Text><Text style={s.text}>Normalized points, then completion time. Ties use a stable Party ID order.</Text>{rankings.map(row=><Text style={s.text} key={`${row.event_key}:${row.party_id}`}>#{row.rank} · {row.name} · {row.party_id.slice(0,8)} · {row.normalized_points} pts</Text>)}{!rankings.length&&<Text style={s.text}>No ranked contributions yet.</Text>}</Panel>}
   {(tab==='party'||tab==='guild')&&<Panel><Text style={s.title}>Your adverts</Text>{own.map(item=><View style={s.ad} key={item.id}><Text style={s.text}>{item.title} · {item.status==='closed'?'Closed':recruitmentTimeLabel(item.expiresAtMs,at).text}</Text>{item.status!=='closed'&&<View style={s.row}><GameButton title="Refresh" tone="secondary" disabled={busy} onPress={()=>void run(()=>repository.refreshRecruitment(item.id))}/><GameButton title="Close advert" tone="secondary" disabled={busy} onPress={()=>void run(()=>repository.closeRecruitment(item.id))}/></View>}</View>)}{!own.length&&<Text style={s.text}>No adverts published yet.</Text>}</Panel>}
  </>}
 </ScrollView></SocialHubPanel>;
}
const s=StyleSheet.create({content:{padding:spacing.md,gap:spacing.md,paddingBottom:32},row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},title:{color:C.accent,fontSize:18,fontWeight:'800'},text:{color:C.text,lineHeight:21},error:{color:C.bad},ad:{gap:spacing.sm,paddingVertical:spacing.sm}});

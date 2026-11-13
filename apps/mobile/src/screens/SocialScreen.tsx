import {gameAlert} from '../core/game-alerts';
import {canManageGuild,guildRecruitmentVisible} from '../core/social-management';
import {useSocialText} from '../i18n/social';
import {useGameplayText} from '../i18n/gameplay';
import {usePartyProgressUiText} from '../i18n/party-progress-ui';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {socialLabel,socialExpiry} from '../i18n/social';
import {useCallback,useEffect,useRef,useState,useMemo} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {PartyHubPanel,PartyLockedNotice} from '../components/PartyHubPanel';
import {PartyEventHubPanel} from '../components/PartyEventHubPanel';
import {SocialHubPanel,type SocialHubTab} from '../components/SocialHubPanel';
import {RecruitmentBoardPanel} from '../components/RecruitmentBoardPanel';
import {PartyCreateSheet} from '../components/PartyCreateSheet';
import {PartyFriendInviteSheet} from '../components/PartyFriendInviteSheet';
import {GameModalSurface,GameModalHeader} from '../components/GameModalSurface';
import {GuildSeekerPanel} from '../components/GuildSeekerPanel';
import {RecruitmentComposer} from '../components/RecruitmentComposer';
import {PartyRecruitmentComposer} from '../components/PartyRecruitmentComposer';
import {RecruitmentFiltersPanel} from '../components/RecruitmentFiltersPanel';
import {RecruitmentListing} from '../components/RecruitmentListing';
import {SocialInvitationCard} from '../components/SocialInvitationCard';
import {OnlinePartyChat} from '../components/OnlinePartyChat';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {ChatPlayerSheet,type ChatPlayerIdentity} from '../components/ChatPlayerSheet';
import {usePartySocial} from '../online/PartySocialProvider';
import {partySocialRepository as repository,ownRecruitmentPosts,partyRankings,partyCommandKey,claimPartyContractReward,activePartyEvent,transferPartyLeadership,removePartyMember,cancelPartyInvitation,disbandParty,recruitmentMatchAlerts,ackRecruitmentMatchAlerts,type PublishRecruitmentInput,type PartyRanking,type RecruitmentMatchAlert} from '../online/party-social';
import {myGuild,requestGuildMembership,respondPartyInvitation,sendPartyInvitation,socialInvitations,socialOutgoingInvitations,type OutgoingInvitationView,type PartyInvitationView} from '../online/social';
import {EMPTY_RECRUITMENT_FILTERS,partyContractClaimableRewardIds,shouldShowPartyChat,recruitmentPostTypePresentation,recruitmentTimeLabel,normalizedPartyPreferences,partyActivityLabel,recruitmentPaceForParty,type PartyActivityLevel,type PartyLanguage,type RecruitmentCardView,type RecruitmentPostType} from '../core/party-social';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {PARTY_UNLOCK_LEVEL} from '../core/feature-unlocks';
type SocialBoard={cards:RecruitmentCardView[];own:RecruitmentCardView[]};
const EMPTY_BOARD:SocialBoard={cards:[],own:[]};
export function SocialScreen({mode='legacy',initialTab='party',characterLevel=0,onGuild,onAccount,onInvitationsChanged,partyUnlocked,onTabChange,onRecruitment,onParty}:{mode?:'party'|'recruitment'|'legacy';initialTab?:SocialHubTab;characterLevel?:number;partyUnlocked?:boolean;onGuild:()=>void;onAccount:()=>void;onInvitationsChanged?:()=>void;onTabChange?:(tab:SocialHubTab)=>void;onRecruitment?:(area:'party'|'guild')=>void;onParty?:()=>void}){
 const st=useSocialText(),pt=usePartyProgressUiText(),{gl}=useGameplayText();
  const language=useGameLanguage();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const social=usePartySocial();const [tab,setTab]=useState<SocialHubTab>(mode==='party'?'party':initialTab==='guild'?'guild':'party');const [filters,setFilters]=useState({...EMPTY_RECRUITMENT_FILTERS});
 const [partyView,setPartyView]=useState<'Overview'|'Contracts'|'Chat'>('Overview');
 const [showPartyCreate,setShowPartyCreate]=useState(false),[showFriendInvites,setShowFriendInvites]=useState(false);
 useEffect(()=>{setTab(mode==='party'?'party':initialTab==='guild'?'guild':'party');setSelected(null);setDraft(null)},[initialTab,mode]);
 useEffect(()=>{setShowFriendInvites(false)},[social.accountId,social.party?.id]);
  useEffect(()=>{onTabChange?.(tab)},[tab,onTabChange]);
 const [guildContext,setGuildContext]=useState<{accountId:string;membership:Awaited<ReturnType<typeof myGuild>>|undefined}|null>(null);
 const guildMembership=guildContext?.accountId===social.accountId?guildContext.membership:undefined;
 const canRecruit=canManageGuild(guildMembership?.role);
 const [boardCache,setBoardCache]=useState<{accountId:string;party:SocialBoard;guild:SocialBoard}>({accountId:'',party:EMPTY_BOARD,guild:EMPTY_BOARD});
 const activeBoard=boardCache.accountId===social.accountId?(tab==='guild'?boardCache.guild:boardCache.party):EMPTY_BOARD;
 const {cards,own}=activeBoard;
 const [rankings,setRankings]=useState<PartyRanking[]>([]),[partyInvites,setPartyInvites]=useState<PartyInvitationView[]>([]),[outgoingPartyInvites,setOutgoingPartyInvites]=useState<OutgoingInvitationView[]>([]),[liveEvent,setLiveEvent]=useState<import('../core/party-social').PartyEventView|null>(null);
 const [draft,setDraft]=useState<PublishRecruitmentInput|null>(null),[selected,setSelected]=useState<RecruitmentCardView|null>(null),[selectedProfile,setSelectedProfile]=useState<ChatPlayerIdentity|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[matchAlerts,setMatchAlerts]=useState<RecruitmentMatchAlert[]>([]);
 const [activityLevel,setActivityLevel]=useState<PartyActivityLevel>('active'),[partyLanguage,setPartyLanguage]=useState<PartyLanguage>('any'),[minimumLevel,setMinimumLevel]=useState(0);
 const [showPartyPrefsEdit,setShowPartyPrefsEdit]=useState(false),[showPartyCreated,setShowPartyCreated]=useState(false),[now,setNow]=useState(Date.now()),[showMatches,setShowMatches]=useState(false),[showPartyEvents,setShowPartyEvents]=useState(false);
 const requestGeneration=useRef(0);const accountIdRef=useRef(social.accountId);accountIdRef.current=social.accountId;
 const command=useRef<{signature:string;key:string}|null>(null);
 const [updating,setUpdating]=useState(false),[showUpdating,setShowUpdating]=useState(false),[backgroundError,setBackgroundError]=useState('');
 const key=(signature:string)=>{if(command.current?.signature!==signature)command.current={signature,key:partyCommandKey()};return command.current.key;};
 const load=useCallback(async()=>{
  const generation=++requestGeneration.current;
  if(!social.accountId||tab==='chat'||accountIdRef.current!==social.accountId){setUpdating(false);return;}
  const accountId=social.accountId;
  const context: 'party'|'guild'=tab==='guild'?'guild':'party';
  const browse={...filters,postTypes:(context==='guild'?['looking_for_guild','guild_recruiting']:['looking_for_party','party_recruiting']) as RecruitmentPostType[]};
  setUpdating(true);
  try{
   // Run independent requests in parallel. Guild browsing still waits for the
   // player's membership so that its existing access restrictions are respected.
   const membershipRequest=mode==='party'?Promise.resolve(null):myGuild().catch(()=>undefined);
   const browseRequest=mode==='party'?Promise.resolve([] as RecruitmentCardView[]):context==='guild'
     ?membershipRequest.then(membership=>membership===undefined?[] as RecruitmentCardView[]:repository.browseRecruitment(browse))
     :repository.browseRecruitment(browse);
   const [membership,next,mine,board,invites,outgoing,alerts]=await Promise.all([
    membershipRequest,browseRequest,mode==='party'?Promise.resolve([] as RecruitmentCardView[]):ownRecruitmentPosts(),mode==='recruitment'?Promise.resolve([] as PartyRanking[]):partyRankings(),
    mode==='recruitment'?Promise.resolve({party:[] as PartyInvitationView[],guild:[],serverTime:''}):socialInvitations().catch(()=>({party:[],guild:[],serverTime:''})),
    mode==='recruitment'?Promise.resolve({party:[] as OutgoingInvitationView[],guild:[],serverTime:''}):socialOutgoingInvitations().catch(()=>({party:[],guild:[],serverTime:''})),
    mode==='party'?Promise.resolve([] as RecruitmentMatchAlert[]):recruitmentMatchAlerts().catch(()=>[])
   ]);
   if(generation!==requestGeneration.current||accountIdRef.current!==accountId)return;
   // If the guild status request failed, keep the last confirmed membership
   // and existing recruitment cards rather than blanking the entire screen.
   if(membership!==undefined){
    const visible=next.filter(card=>guildRecruitmentVisible(card,membership,context));
    const owned=mine.filter(card=>guildRecruitmentVisible(card,membership,context));
    setGuildContext({accountId,membership});
    setBoardCache(previous=>{
     const base=previous.accountId===accountId?previous:{accountId,party:EMPTY_BOARD,guild:EMPTY_BOARD};
     return {...base,[context]:{cards:visible,own:owned}};
    });
    setMatchAlerts(membership!==null?alerts.filter(alert=>visible.some(card=>card.id===alert.id)):alerts);
    setBackgroundError('');
   }else{
    setBackgroundError('refresh_failed');
   }
   setRankings(board);
   setPartyInvites(invites.party);
   setOutgoingPartyInvites(outgoing.party);
  }catch(e){
   if(generation===requestGeneration.current&&accountIdRef.current===accountId)
    setBackgroundError('refresh_failed');
   // A failed background request must never erase the last good snapshot.
  }finally{
   if(generation===requestGeneration.current&&accountIdRef.current===accountId)setUpdating(false);
  }
 },[filters,tab,social.accountId,mode]);
 useEffect(()=>{
  requestGeneration.current++;
  setBoardCache({accountId:social.accountId,party:EMPTY_BOARD,guild:EMPTY_BOARD});
  setGuildContext(null);
  setRankings([]);setPartyInvites([]);setOutgoingPartyInvites([]);setMatchAlerts([]);
  setLiveEvent(null);setUpdating(false);setBackgroundError('');
 },[social.accountId]);
 useEffect(()=>{
  if(!updating){setShowUpdating(false);return;}
  const timer=setTimeout(()=>setShowUpdating(true),1200);
  return()=>clearTimeout(timer);
 },[updating]);
 useEffect(()=>{setSelected(null);setDraft(null)},[guildMembership?.guild_id,guildMembership?.role]);
 useEffect(()=>{if(tab==='chat'){setUpdating(false);return;}const timer=setTimeout(()=>void load(),250);return()=>{clearTimeout(timer);requestGeneration.current++;};},[load,tab,social.party?.id]);
 useEffect(()=>{const timer=setInterval(()=>{setNow(Date.now());if(tab!=='chat')void load();},30000);return()=>clearInterval(timer);},[load,tab]);
 useEffect(()=>{if(tab!=='party'||!social.accountId)return;let cancelled=false;void activePartyEvent().then(event=>{if(!cancelled)setLiveEvent(event);}).catch(()=>{if(!cancelled)setLiveEvent(null);});return()=>{cancelled=true;};},[tab,social.accountId,social.party?.id]);
 const run=async(action:()=>Promise<unknown>)=>{if(busy)return;setBusy(true);setError('');try{
  await action();command.current=null;
  // Update the authoritative Party snapshot before re-enabling membership
  // actions, but let the slower recruitment refresh finish independently.
  await social.refresh();
  void load();
 }catch(e){
  setError(e instanceof Error?e.message:st("Please try again."));
  void social.refresh();
 }finally{setBusy(false);}};
 const character=()=>{if(!social.characterId)throw new Error(st("Sync your character in Account settings first."));return social.characterId;};
 const post=(postType:RecruitmentPostType)=>void run(async()=>{const membership=postType.includes('guild')?await myGuild():null;if(postType==='looking_for_guild'&&membership)throw new Error(st('You are already in a Guild.'));if(postType==='guild_recruiting'&&!canManageGuild(membership?.role))throw new Error(st('Guild recruiting requires Leader or Officer access.'));const guild=postType==='guild_recruiting'?membership:null;const prefs=normalizedPartyPreferences(social.party);setDraft({postType,title:'',body:'',focus:'mixed',roles:[],ownerCharacterId:character(),durationDays:postType.includes('guild')?3:1,...(postType==='party_recruiting'?{partyId:social.party?.id,openSpots:Math.max(0,4-(social.party?.members.length??0)),activityLevel:recruitmentPaceForParty(prefs.activityLevel),language:prefs.language==='any'?undefined:prefs.language,minCombatLevel:prefs.minimumLevel||undefined}:postType==='looking_for_party'?{activityLevel:'active' as const}:{}),...(guild?{guildId:guild.guild_id}:{})});});
 const beginCreate=()=>{setActivityLevel('active');setPartyLanguage('any');setMinimumLevel(0);setShowPartyPrefsEdit(false);setShowPartyCreate(true);setError('');};
 const beginEditPreferences=()=>{const prefs=normalizedPartyPreferences(social.party);setActivityLevel(prefs.activityLevel);setPartyLanguage(prefs.language);setMinimumLevel(prefs.minimumLevel);setShowPartyPrefsEdit(true);setShowPartyCreate(true);setError('');};
 const savePartyPreferences=()=>void run(async()=>{
  if(showPartyPrefsEdit){if(!social.party)throw new Error('Party no longer active.');await repository.updatePartyPreferences(social.party.id,{activityLevel,language:partyLanguage,minimumLevel});setShowPartyPrefsEdit(false);}
  else{await repository.createParty({characterId:character(),activityLevel,language:partyLanguage,minimumLevel,idempotencyKey:key('create:'+activityLevel+':'+partyLanguage+':'+minimumLevel)});setShowPartyCreated(true);}
  setShowPartyCreate(false);
 });
 // Local countdown advances between snapshots; expiry is also enforced by the database query.
 const clock=useRef({server:now,local:now});useEffect(()=>{if(social.serverTime)clock.current={server:Date.parse(social.serverTime),local:Date.now()};},[social.serverTime]);
 const at=clock.current.server+(now-clock.current.local);
 // A player can unlock Parties on one character and keep the unlock on another.
 const partyAvailable=partyUnlocked??(characterLevel>=PARTY_UNLOCK_LEVEL);
 const partyLocked=!partyAvailable&&!social.party;
 const canUsePartyChat=shouldShowPartyChat(social.party,social.accountId);
 // If the party is disbanded while Chat is selected, return to the Party tab.
 useEffect(()=>{if(tab==='chat'&&!canUsePartyChat&&!social.loading){setTab('party');setSelected(null);setDraft(null);}},[tab,canUsePartyChat,social.loading]);
 useEffect(()=>{if(mode==='party'&&partyView==='Chat'&&!canUsePartyChat&&!social.loading)setPartyView('Overview');},[mode,partyView,canUsePartyChat,social.loading]);

 const recruitmentPreferences=null; // No class or role selection for persistent Parties.
 const ownedAdverts=own.length>0?(<Panel><View style={s.sectionHead}><Text style={s.title}>{st("Your adverts")}</Text><Text style={s.sectionMeta}>{st('{count} active / saved',{count:own.length})}</Text></View>{own.map(item=><View style={s.ad} key={item.id}><RecruitmentListing card={item} nowMs={at} onPress={()=>setSelected(item)}/>{item.status!=='closed'?<View style={s.adActions}><View style={s.flex}><GameButton compact title={st("Refresh")} tone="secondary" disabled={busy} onPress={()=>run(()=>repository.refreshRecruitment(item.id))}/></View><View style={s.flex}><GameButton compact title={st("Close advert")} tone="secondary" disabled={busy} onPress={()=>run(()=>repository.closeRecruitment(item.id))}/></View></View>:<Text style={s.closedLabel}>{st("CLOSED")}</Text>}</View>)}</Panel>):null;
 const partyInvitations=<>
   {partyInvites.length>0?<Panel><View style={s.sectionHead}><Text style={s.selectedLabel}>{st("PARTY INVITES")}</Text><Text style={s.sectionMeta}>{st('{count} pending',{count:partyInvites.length})}</Text></View>{partyInvites.map(invite=>{const expiry=socialExpiry(language,Date.parse(invite.expiresAt),at),warning=social.party?'Leave your current Party before accepting another invitation.':invite.openSpots<1?'This Party is currently full.':undefined;return <SocialInvitationCard key={invite.id} accountId={invite.inviterAccountId} name={invite.inviterName} status={st("PARTY INVITE")} statusTone="info" detail={st('{focus} Party · {members}/4 members · {open} open',{focus:socialLabel(language,invite.focus),members:invite.memberCount,open:invite.openSpots})} expiry={expiry.text} warning={warning} actions={<><GameButton compact title={st("Accept")} disabled={busy||!!social.party||invite.openSpots<1||!social.characterId} onPress={()=>run(async()=>{await respondPartyInvitation(invite.id,true,character());onInvitationsChanged?.()})}/><GameButton compact title={st("Decline")} tone="secondary" disabled={busy} onPress={()=>run(async()=>{await respondPartyInvitation(invite.id,false);onInvitationsChanged?.()})}/></>}/>} )}</Panel>:null}
   {outgoingPartyInvites.length>0?<Panel><View style={s.sectionHead}><Text style={s.selectedLabel}>{st("OUTGOING PARTY INVITES")}</Text><Text style={s.sectionMeta}>{st('{count} pending',{count:outgoingPartyInvites.length})}</Text></View>{outgoingPartyInvites.map(invite=>{const expiry=socialExpiry(language,Date.parse(invite.expiresAt),at);return <SocialInvitationCard key={invite.id} accountId={invite.recipientAccountId} name={invite.recipientName} status={st("INVITE SENT")} statusTone="muted" detail={st("Waiting for this player to respond.")} expiry={expiry.text} actions={<GameButton compact title={st("Cancel invite")} tone="secondary" disabled={busy} onPress={()=>run(async()=>{await cancelPartyInvitation(invite.id);onInvitationsChanged?.()})}/>}/>})}</Panel>:null}
 </>;
 const recruitmentDetails=<>
  {mode==='legacy'&&tab==='party'&&matchAlerts.length>0?<><Pressable accessibilityRole="button" accessibilityState={{expanded:showMatches}} onPress={()=>setShowMatches(value=>!value)} style={s.prefsHeader}><Text style={s.prefsHeaderLabel}>{st("MATCHES FOUND")} · {matchAlerts.length}</Text><Text style={s.chevron}>{showMatches?'−':'+'}</Text></Pressable>{showMatches?<Panel>{matchAlerts.slice(0,5).map(alert=><Pressable key={alert.id} onPress={()=>{const card=cards.find(item=>item.id===alert.id);if(card)setSelected(card);}}><Text style={s.text}>{alert.title} · {alert.focus.toUpperCase()} · {alert.owner_name??st("Adventurer")}</Text></Pressable>)}<GameButton compact title={st("Dismiss matches")} tone="secondary" onPress={()=>run(async()=>{await ackRecruitmentMatchAlerts();setMatchAlerts([]);})}/></Panel>:null}</>:null}
   {draft&&(draft.postType==='party_recruiting'||draft.postType==='looking_for_party'?<PartyRecruitmentComposer key={draft.postType} initial={draft} party={social.party} busy={busy} onCancel={()=>setDraft(null)} onPublish={input=>run(async()=>{await repository.publishRecruitment(input);setDraft(null);})}/>:<RecruitmentComposer key={draft.postType} initial={draft} busy={busy} onCancel={()=>setDraft(null)} onPublish={input=>run(async()=>{await repository.publishRecruitment(input);setDraft(null);})}/>)}
   {selected&&(()=>{const presentation=recruitmentPostTypePresentation(selected.postType),context=[...(selected.activityLevel?[socialLabel(language,selected.activityLevel.charAt(0).toUpperCase()+selected.activityLevel.slice(1))]:[]),...(selected.language?[selected.language]:[]),...(selected.region?[selected.region.toUpperCase()]:[]),...(selected.minCombatLevel!==undefined?[st('Combat {level}+',{level:Math.max(0,Math.floor(selected.minCombatLevel))})]:[]),...(selected.minTotalLevel!==undefined?[st('Total {level}+',{level:Math.max(0,Math.floor(selected.minTotalLevel))})]:[])],expiry=socialExpiry(language,selected.expiresAtMs,at);return <Panel accentColor={C.info} accentSurface={C.infoSurface}>
    <View style={s.selectedHead}><View style={s.flex}><Text style={s.selectedLabel}>{socialLabel(language,presentation.shortLabel)} · {socialLabel(language,selected.focus).toLocaleUpperCase()}</Text><Text style={s.title}>{selected.title}</Text></View><Text style={[s.expiry,expiry.urgency==='soon'&&s.expirySoon]}>{expiry.text}</Text></View>
    <Text style={s.text}>{selected.body}</Text>
    {(context.length||selected.currentObjective)?<View style={s.detailMeta}>{context.map(item=><View key={item} style={s.detailPill}><Text style={s.detailPillText}>{item}</Text></View>)}{selected.currentObjective?<View style={[s.detailPill,s.objectivePill]}><Text style={s.objectivePillText}>{st('Current · {objective}',{objective:selected.currentObjective})}</Text></View>:null}</View>:null}
    <View style={s.detailActions}>
     {selected.partyId&&!social.party?<View style={s.flex}><GameButton title={st("Join Party")} disabled={busy||selected.expiresAtMs<=at} onPress={()=>run(async()=>{await repository.joinParty({partyId:selected.partyId!,characterId:character(),idempotencyKey:key(`join:${selected.partyId}`)});setSelected(null);})}/></View>:null}
     {selected.postType==='looking_for_party'&&selected.ownerAccountId&&selected.ownerAccountId!==social.accountId&&social.party?.members.some(member=>member.accountId===social.accountId&&member.isLeader)&&social.party.members.length<4?<View style={s.flex}><GameButton title={st("Invite to Party")} disabled={busy||selected.expiresAtMs<=at} onPress={()=>run(async()=>{await sendPartyInvitation(selected.ownerAccountId!);setSelected(null);})}/></View>:null}
     {selected.guildId&&guildMembership===null?<View style={s.flex}><GameButton title={st("Join / apply to Guild")} disabled={busy} onPress={()=>run(async()=>{const result=await requestGuildMembership(selected.guildId!);gameAlert.alert(st("Guild"),result);})}/></View>:null}
     {selected.ownerAccountId&&selected.ownerAccountId!==social.accountId?<View style={s.flex}><GameButton title={st("Player Profile")} tone="secondary" disabled={busy} onPress={()=>setSelectedProfile({account_id:selected.ownerAccountId!,sender_name:selected.ownerName,guild_tag:selected.guildTag,guild_tag_color_id:selected.guildTagColorId})}/></View>:null}
    </View>
    <GameButton compact title={st("Close details")} tone="secondary" onPress={()=>setSelected(null)}/>
   </Panel>})()}
 </>;
 const partyExtras=social.party?<>
   {(liveEvent||rankings.length>0)?<>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showPartyEvents}} onPress={()=>setShowPartyEvents(value=>!value)} style={s.prefsHeader}><Text style={s.prefsHeaderLabel}>{gl("Party events")}</Text><Text style={s.chevron}>{showPartyEvents?'−':'+'}</Text></Pressable>
    {showPartyEvents?<>
   {tab==='party'&&liveEvent?<PartyEventHubPanel event={liveEvent}/>:null}
   {tab==='party'&&rankings.length>0?<Panel><View style={s.sectionHead}><Text style={s.title}>{st("Ranked Party events")}</Text><Text style={s.sectionMeta}>{Math.min(rankings.length,3)} {gl(rankings.length===1?'entry':'entries')}</Text></View>{rankings.slice(0,3).map(row=><Text style={s.text} key={`${row.event_key}:${row.party_id}`}>#{row.rank} · {row.name} · {st('{count} pts',{count:row.normalized_points})}</Text>)}</Panel>:null}
    </>:null}
   </>:null}
 </>:null;
 const friendInviteSheet=<PartyFriendInviteSheet key={social.accountId+':'+(social.party?.id??'none')} visible={showFriendInvites&&!!social.party} partyId={social.party?.id} openSpots={Math.max(0,4-(social.party?.members.length??0))} pendingAccountIds={outgoingPartyInvites.map(invite=>invite.recipientAccountId)} onClose={()=>setShowFriendInvites(false)} onInvited={()=>{void load();onInvitationsChanged?.();}}/>;
 if(mode!=='legacy'){
  const recruitment=mode==='recruitment',leader=!!social.party?.members.some(member=>member.accountId===social.accountId&&member.isLeader),openSpots=Math.max(0,4-(social.party?.members.length??0));
  const claimReadyCount=social.party?partyContractClaimableRewardIds(social.contracts).length:0;
  const switchParty=(view:'Overview'|'Contracts'|'Chat')=>{setPartyView(view);setTab(view==='Chat'?'chat':'party')};
  return <View style={s.page}>
   {!recruitment&&!partyLocked?<View accessibilityRole="tablist" style={s.pageTabs}>{(['Overview','Contracts','Chat'] as const).map(view=><Pressable key={view} accessibilityRole="tab" accessibilityState={{selected:partyView===view,disabled:view==='Chat'&&!canUsePartyChat}} disabled={view==='Chat'&&!canUsePartyChat} onPress={()=>switchParty(view)} style={({pressed})=>[s.pageTab,partyView===view&&s.pageTabSelected,view==='Chat'&&!canUsePartyChat&&s.pageTabDisabled,pressed&&s.pressed]}><Text style={[s.pageTabLabel,partyView===view&&s.pageTabLabelSelected]}>{view==='Contracts'&&claimReadyCount>0?gl(view)+' · '+claimReadyCount:gl(view)}</Text></Pressable>)}</View>:null}
   {!recruitment&&partyView==='Overview'&&claimReadyCount>0?<Pressable accessibilityRole="button" onPress={()=>switchParty('Contracts')} style={s.syncRow}><Text style={{color:C.good,fontWeight:'800'}}>{pt('Party rewards ready to claim')+' · '+claimReadyCount+' ›'}</Text></Pressable>:null}
   {!recruitment&&partyView==='Chat'&&canUsePartyChat?<View style={s.chatContent}><Text accessibilityRole="header" style={s.title}>{gl("Party Chat")}</Text><OnlinePartyChat expanded/></View>:<ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     {social.accountId&&(backgroundError||social.error||showUpdating)?<View style={s.syncRow}>{backgroundError||social.error?<><Text style={s.syncError}>{gl('Could not refresh')} {gl(recruitment?'Recruitment':'Party')}</Text><GameButton compact title={gl('Retry')} tone="secondary" onPress={()=>{void social.refresh();void load()}}/></>:<><ActivityIndicator color={C.muted} size="small"/><Text style={s.syncText}>{gl("Updating…")}</Text></>}</View>:null}
     {!!error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
     {!social.accountId?<Panel><Text style={s.text}>{gl(social.loading?'Connecting…':'Sign in and sync a character to use Parties and Recruitment.')}</Text><GameButton title={gl('Account settings')} onPress={onAccount}/></Panel>:recruitment?<RecruitmentBoardPanel area={tab==='guild'?'guild':'party'} onAreaChange={area=>{setTab(area);setFilters({...EMPTY_RECRUITMENT_FILTERS});setSelected(null);setDraft(null)}} cards={cards} own={own} filters={filters} onFiltersChange={setFilters} nowMs={at} busy={busy} canRecruitGuild={canRecruit} guildMembershipKnown={guildMembership!==undefined} inGuild={!!guildMembership} partyUnlocked={partyAvailable} inParty={!!social.party} partyLeader={leader} partyOpenSpots={openSpots} onPost={post} onOpen={setSelected} onRefresh={id=>void run(()=>repository.refreshRecruitment(id))} onClose={id=>gameAlert.alert(gl('Close recruitment advert?'),gl('This advert will no longer appear on the board.'),[{text:'Cancel',style:'cancel'},{text:gl('Close advert'),style:'destructive',onPress:()=>void run(()=>repository.closeRecruitment(id))}])} onOpenParty={()=>onParty?.()} onOpenGuild={onGuild} onInviteFriends={()=>setShowFriendInvites(true)} loading={social.loading||updating&&guildContext===null} matches={tab==='party'?cards.filter(card=>matchAlerts.some(alert=>alert.id===card.id)):[]} onDismissMatches={()=>void run(async()=>{await ackRecruitmentMatchAlerts();setMatchAlerts([])})}/>:<>
      {partyLocked?<PartyLockedNotice level={PARTY_UNLOCK_LEVEL}/>:<>
      {!social.party?partyInvitations:null}
      {social.loading&&!social.party?<Text style={s.syncText}>{gl("Checking your Party…")}</Text>:null}
      {(!social.loading||!!social.party)?<PartyHubPanel dedicated activeView={partyView==='Contracts'?'Contracts':'Overview'} onOpenRecruitment={()=>onRecruitment?.('party')} onInviteFriends={()=>setShowFriendInvites(true)} accountId={social.accountId} party={social.party} contracts={social.contracts} recruitment={[]} nowMs={at} partyUnlocked={partyAvailable} partyUnlockLevel={PARTY_UNLOCK_LEVEL} onCreateParty={busy||!partyAvailable?undefined:beginCreate} onEditPreferences={leader?beginEditPreferences:undefined} onLeaveParty={busy?undefined:()=>{const party=social.party!;const self=party.members.find(member=>member.accountId===social.accountId),successor=party.members.find(member=>member.accountId!==social.accountId);gameAlert.alert(self?.isLeader?(successor?st("Leave Party and hand over leadership?"):st("Leave and disband Party?")):st("Leave Party?"),self?.isLeader?(successor?st('Leadership will pass to {name}, the oldest remaining Party member.',{name:successor.characterName}):st("You are the only Party member, so leaving will disband it.")):st("You will leave this persistent Party."),[{text:st("Cancel"),style:'cancel'},{text:st("Leave"),style:'destructive',onPress:()=>void run(async()=>{await repository.leaveParty({partyId:party.id,idempotencyKey:key(`leave:${party.id}`)});await social.refresh();})}])}} onDisbandParty={busy?undefined:()=>gameAlert.alert(gl('Disband Party?'),gl('Remove every member and cancel invitations?'), [{text:'Cancel',style:'cancel'},{text:'Disband',style:'destructive',onPress:()=>void run(()=>disbandParty(social.party!.id))}])} onOpenMemberProfile={member=>setSelectedProfile({account_id:member.accountId,sender_name:member.characterName})} onTransferLeadership={member=>gameAlert.alert('Transfer leadership?',member.characterName+' becomes the Party leader.',[{text:'Cancel',style:'cancel'},{text:'Transfer',onPress:()=>void run(()=>transferPartyLeadership(social.party!.id,member.accountId))}])} onRemoveMember={member=>gameAlert.alert('Remove '+member.characterName+'?','They will leave the Party immediately.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void run(()=>removePartyMember(social.party!.id,member.accountId))}])} onClaimReward={busy?undefined:id=>void run(()=>claimPartyContractReward(id,character()))} partyExtras={partyExtras} partyInvitations={partyInvitations} invitationCount={partyInvites.length+outgoingPartyInvites.length}/>:null}
     </>}</>}</ScrollView>}
     <PartyCreateSheet visible={!recruitment&&showPartyCreate} busy={busy} activityLevel={activityLevel} language={partyLanguage} minimumLevel={minimumLevel} editing={showPartyPrefsEdit} error={error} onActivityLevel={setActivityLevel} onLanguage={setPartyLanguage} onMinimumLevel={setMinimumLevel} onClose={()=>{setShowPartyCreate(false);setShowPartyPrefsEdit(false)}} onCreate={savePartyPreferences}/>
     {!recruitment?<GameModalSurface visible={showPartyCreated} presentation="dialog" onClose={()=>setShowPartyCreated(false)}>
      <GameModalHeader eyebrow={gl('PARTY CREATED')} title={gl('Your Party is ready')} onClose={()=>setShowPartyCreated(false)}/>
      <View style={s.createdBody}><Text style={s.text}>{gl('Your Party has been created. All classes are welcome.')} ({gl(partyActivityLabel(activityLevel))})</Text>
       <GameButton title={gl('Find members')} disabled={busy} onPress={()=>{setShowPartyCreated(false);post('party_recruiting')}}/>
       <GameButton title={gl('Later')} tone="secondary" onPress={()=>setShowPartyCreated(false)}/>
      </View>
     </GameModalSurface>:null}
     {!recruitment&&draft?<GameModalSurface visible presentation="sheet" onClose={()=>{if(!busy)setDraft(null)}} dismissOnBackdrop={!busy}><GameModalHeader eyebrow={gl('RECRUITMENT')} title={gl('Find members')} onClose={()=>{if(!busy)setDraft(null)}} closeDisabled={busy}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalContent}>{recruitmentDetails}</ScrollView></GameModalSurface>:null}
     {recruitment?<GameModalSurface visible={!!(draft||selected)} presentation="sheet" onClose={()=>{if(!busy){setDraft(null);setSelected(null)}}} dismissOnBackdrop={!busy}><GameModalHeader eyebrow={gl('RECRUITMENT')} title={gl(draft?'Create advert':'Advert details')} closeDisabled={busy} onClose={()=>{if(!busy){setDraft(null);setSelected(null)}}}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalContent}>{recruitmentDetails}</ScrollView></GameModalSurface>:null}
     {friendInviteSheet}
     {selectedProfile?<ChatPlayerSheet message={selectedProfile} onClose={()=>setSelectedProfile(null)} onBlocked={()=>setSelectedProfile(null)}/>:null}
   </View>;
 }
 const headerGuide=tab==='guild'?{
  scope:social.accountId,area:'social',section:'Guild',
  translate:(value:string)=>socialLabel(language,value),
  guide:{title:'Guild',body:'Open your Guild here, or browse recruiting guilds before joining.',detail:'Guild Chat and activities are inside Guild and remain independent of Party unlocks.'},
 }:tab==='chat'&&canUsePartyChat?{
  scope:social.accountId,area:'social',section:'Chat',
  translate:(value:string)=>socialLabel(language,value),
  guide:{title:'Party Chat',body:'Message your current Party here. Other social controls stay in their own tabs.',detail:'The Chat tab disappears when you leave or disband your Party.'},
 }:undefined;
 return <SocialHubPanel headerGuide={headerGuide} active={tab} hasParty={canUsePartyChat} badges={{party:partyInvites.length}} onChange={next=>{setTab(next);setSelected(null);setDraft(null);setError('');setBackgroundError('');}}>
 {tab==='chat'?(canUsePartyChat?<View style={s.chatContent}><OnlinePartyChat expanded/></View>:social.loading?<View style={s.chatContent}><Text style={s.syncText}>{st("Opening Party Chat…")}</Text></View>:null):
 <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  {tab==='party'&&partyLocked?<PartyLockedNotice level={PARTY_UNLOCK_LEVEL}/>:<>
  {(social.accountId&&(backgroundError||social.error||showUpdating))?<View style={s.syncRow}>{backgroundError||social.error?<><Text style={s.syncError}>{st("Could not update Social.")}</Text><GameButton compact title={st("Retry")} tone="secondary" onPress={()=>{void social.refresh();void load();}}/></>:<><ActivityIndicator color={C.muted} size="small"/><Text style={s.syncText}>{st("Updating…")}</Text></>}</View>:null}
  {!!error&&<View accessibilityRole="alert" style={s.errorCard}><Text style={s.errorLabel}>{st("SOCIAL UNAVAILABLE")}</Text><Text style={s.error}>{error}</Text></View>}
  {!social.accountId?<Panel>{social.loading?<Text style={s.syncText}>{st("Connecting…")}</Text>:<Text style={s.text}>{st("Sign in and sync a character to use Parties and Recruitment.")}</Text>}<GameButton title={st("Account settings")} onPress={onAccount}/></Panel>:<>
   {tab==='guild'?recruitmentDetails:null}
   {tab==='party'&&!social.party?partyInvitations:null}
   {tab==='party'&&!!social.accountId&&social.loading&&!social.party?<Text style={s.syncText}>{st("Checking your Party…")}</Text>:null}
   {tab==='party'&&(!social.loading||!!social.party)&&<PartyHubPanel accountId={social.accountId} party={social.party} contracts={social.contracts} recruitment={cards} nowMs={at} filters={filters} onFiltersChange={setFilters} partyUnlocked={partyAvailable} partyUnlockLevel={PARTY_UNLOCK_LEVEL}
    onCreateParty={busy||!partyAvailable?undefined:beginCreate} onEditPreferences={social.party?.members.some(member=>member.accountId===social.accountId&&member.isLeader)?beginEditPreferences:undefined}
    onLeaveParty={busy?undefined:()=>{const party=social.party!;const self=party.members.find(member=>member.accountId===social.accountId),successor=party.members.find(member=>member.accountId!==social.accountId);gameAlert.alert(self?.isLeader?(successor?st("Leave Party and hand over leadership?"):st("Leave and disband Party?")):st("Leave Party?"),self?.isLeader?(successor?st('Leadership will pass to {name}, the oldest remaining Party member.',{name:successor.characterName}):st("You are the only Party member, so leaving will disband it.")):st("You will leave this persistent Party."),[{text:st("Cancel"),style:'cancel'},{text:st("Leave"),style:'destructive',onPress:()=>void run(async()=>{await repository.leaveParty({partyId:party.id,idempotencyKey:key(`leave:${party.id}`)});await social.refresh();})}])}}
    onDisbandParty={busy?undefined:()=>{const party=social.party!;gameAlert.alert(st("Disband Party?"),st("This removes every member and cancels all pending Party invitations."),[{text:st("Cancel"),style:'cancel'},{text:st("Disband"),style:'destructive',onPress:()=>void run(()=>disbandParty(party.id))}])}}
    onOpenMemberProfile={member=>setSelectedProfile({account_id:member.accountId,sender_name:member.characterName})}
    onTransferLeadership={member=>gameAlert.alert(st("Transfer Party leadership?"),st('{name} will become Party leader.',{name:member.characterName}),[{text:st("Cancel"),style:'cancel'},{text:st("Transfer"),onPress:()=>void run(()=>transferPartyLeadership(social.party!.id,member.accountId))}])}
    onRemoveMember={member=>gameAlert.alert(st('Remove {name}?',{name:member.characterName}),st("They will leave the Party immediately."),[{text:st("Cancel"),style:'cancel'},{text:st("Remove"),style:'destructive',onPress:()=>void run(()=>removePartyMember(social.party!.id,member.accountId))}])}
    onOpenRecruitmentPost={id=>setSelected(cards.find(card=>card.id===id)??null)} onCreateRecruitmentPost={post}
    onClaimReward={busy?undefined:id=>void run(()=>claimPartyContractReward(id,character()))} recruitmentPreferences={recruitmentPreferences} ownedAdverts={ownedAdverts} recruitmentDetails={recruitmentDetails} partyExtras={partyExtras} partyInvitations={partyInvitations} invitationCount={partyInvites.length+outgoingPartyInvites.length}/>}
   {tab==='guild'&&(guildMembership===undefined?<><GameButton title={st("Open Guilds")} onPress={onGuild}/>{!backgroundError&&!showUpdating?<Text style={s.syncText}>{st("Checking Guild membership…")}</Text>:null}</>:guildMembership?<><GameButton title={st("Open my Guild")} onPress={onGuild}/>{canRecruit?<><GameButton title={st("Post Guild recruiting advert")} tone="secondary" disabled={busy} onPress={()=>post('guild_recruiting')}/><RecruitmentFiltersPanel value={filters} onChange={setFilters}/><GuildSeekerPanel seekers={cards} nowMs={at} onOpen={id=>setSelected(cards.find(card=>card.id===id)??null)}/></>:null}</>:<><GameButton title={st("Open Guild directory and management")} onPress={onGuild}/><RecruitmentFiltersPanel value={filters} onChange={setFilters}/><GuildSeekerPanel seekers={cards} nowMs={at} onOpen={id=>setSelected(cards.find(card=>card.id===id)??null)} onPostMyAd={()=>post('looking_for_guild')}/></>)}
   {tab==='guild'&&(guildMembership===null||canRecruit)?ownedAdverts:null}
  </>}
   {selectedProfile?<ChatPlayerSheet message={selectedProfile} onClose={()=>setSelectedProfile(null)} onBlocked={()=>setSelectedProfile(null)}/>:null}
  </>}
 </ScrollView>}
 <PartyCreateSheet visible={showPartyCreate} busy={busy} activityLevel={activityLevel} language={partyLanguage} minimumLevel={minimumLevel} editing={showPartyPrefsEdit} error={error} onActivityLevel={setActivityLevel} onLanguage={setPartyLanguage} onMinimumLevel={setMinimumLevel} onClose={()=>{setShowPartyCreate(false);setShowPartyPrefsEdit(false)}} onCreate={savePartyPreferences}/>
 <GameModalSurface visible={showPartyCreated} presentation="dialog" onClose={()=>setShowPartyCreated(false)}>
  <GameModalHeader eyebrow={gl('PARTY CREATED')} title={gl('Your Party is ready')} onClose={()=>setShowPartyCreated(false)}/>
  <View style={s.createdBody}><Text style={s.text}>Your {partyActivityLabel(activityLevel)} Party is ready. All classes are welcome.</Text>
   <GameButton title={gl('Find members')} disabled={busy} onPress={()=>{setShowPartyCreated(false);post('party_recruiting')}}/>
   <GameButton title={gl('Later')} tone="secondary" onPress={()=>setShowPartyCreated(false)}/>
  </View>
 </GameModalSurface>
 {tab==='party'&&draft?<GameModalSurface visible presentation="sheet" onClose={()=>{if(!busy)setDraft(null)}} dismissOnBackdrop={!busy}><GameModalHeader eyebrow={gl('RECRUITMENT')} title={gl('Find members')} closeDisabled={busy} onClose={()=>{if(!busy)setDraft(null)}}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalContent}>{recruitmentDetails}</ScrollView></GameModalSurface>:null}
 </SocialHubPanel>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({page:{flex:1,minHeight:0},pageTabs:{flexDirection:'row',gap:5,paddingHorizontal:12,paddingTop:10,paddingBottom:2},pageTab:{minHeight:44,flex:1,alignItems:'center',justifyContent:'center',paddingHorizontal:7,backgroundColor:C.panel,borderWidth:1,borderRadius:9,borderColor:C.line},pageTabSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},pageTabDisabled:{opacity:.45},pageTabLabel:{fontSize:11,color:C.muted,fontWeight:'800'},pageTabLabelSelected:{color:C.text},modalContent:{gap:10,paddingVertical:12},createdBody:{gap:12,paddingVertical:16},content:{padding:spacing.md,gap:spacing.md,paddingBottom:32},chatContent:{flex:1,minHeight:0,paddingHorizontal:spacing.md,paddingVertical:spacing.sm},
 prefsHeader:{flexDirection:'row',alignItems:'center',gap:8,minHeight:40,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel},
 prefsHeaderLabel:{flex:1,...typography.caption,color:C.muted,fontWeight:'800'},
 chevron:{fontSize:16,color:C.muted,fontWeight:'900'},flex:{flex:1,minWidth:0},chipRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6},chipLabel:{fontSize:10,fontWeight:'900',letterSpacing:1,color:C.accentSoft,marginRight:2},chip:{minHeight:38,paddingHorizontal:12,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},chipText:{fontSize:12,color:C.muted,fontWeight:'800'},chipTextSelected:{color:C.text},pressed:{opacity:.76},title:{color:C.accent,fontSize:18,fontWeight:'800'},selectedLabel:{...typography.caption,color:C.info,fontWeight:'900',letterSpacing:1},selectedHead:{flexDirection:'row',alignItems:'flex-start',gap:8},expiry:{fontSize:9,color:C.muted,fontWeight:'800',paddingTop:2},expirySoon:{color:C.warning},detailMeta:{flexDirection:'row',flexWrap:'wrap',gap:5},detailPill:{maxWidth:130,paddingHorizontal:6,paddingVertical:3,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},detailPillText:{fontSize:8,color:C.muted,fontWeight:'800'},objectivePill:{maxWidth:'100%',borderColor:C.info,backgroundColor:C.infoSurface},objectivePillText:{fontSize:8,color:C.info,fontWeight:'800'},detailActions:{flexDirection:'row',flexWrap:'wrap',gap:6},text:{color:C.text,lineHeight:21},errorCard:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.bad,borderRadius:10,backgroundColor:C.badSurface},errorLabel:{...typography.caption,color:C.bad,fontWeight:'900',letterSpacing:1},error:{color:C.text,lineHeight:21},syncRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:3,minHeight:36},syncText:{...typography.caption,color:C.muted,flexShrink:1},syncError:{...typography.caption,color:C.warning,flex:1},sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},sectionMeta:{fontSize:9,color:C.muted,fontWeight:'800'},ad:{gap:6,paddingVertical:6},adActions:{flexDirection:'row',gap:6},closedLabel:{fontSize:8,color:C.muted,fontWeight:'900',letterSpacing:.7,textAlign:'right'}});}

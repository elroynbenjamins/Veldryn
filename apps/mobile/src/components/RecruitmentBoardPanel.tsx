import {useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {RecruitmentFiltersPanel} from './RecruitmentFiltersPanel';
import {RecruitmentListing} from './RecruitmentListing';
import {filterRecruitmentCards,type RecruitmentCardView,type RecruitmentClientFilters,type RecruitmentPostType} from '../core/party-social';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

type Area='party'|'guild';
type Kind='groups'|'players';
type Action='looking_for_party'|'party_recruiting'|'looking_for_guild'|'guild_recruiting';
export function RecruitmentBoardPanel({area,onAreaChange,cards,own,filters,onFiltersChange,nowMs,busy,canRecruitGuild,inGuild,guildMembershipKnown,inParty,partyUnlocked,partyLeader,partyOpenSpots,onPost,onOpen,onRefresh,onClose,onOpenParty,onOpenGuild,onInviteFriends,matches=[],onDismissMatches,loading=false}:{
 area:Area;onAreaChange:(area:Area)=>void;cards:RecruitmentCardView[];own:RecruitmentCardView[];
 filters:RecruitmentClientFilters;onFiltersChange:(next:RecruitmentClientFilters)=>void;nowMs:number;busy:boolean;
 canRecruitGuild:boolean;inGuild:boolean;guildMembershipKnown:boolean;inParty:boolean;partyUnlocked:boolean;partyLeader:boolean;partyOpenSpots:number;
 onPost:(type:RecruitmentPostType)=>void;onOpen:(card:RecruitmentCardView)=>void;
 onRefresh:(id:string)=>void;onClose:(id:string)=>void;onOpenParty:()=>void;onOpenGuild:()=>void;onInviteFriends?:()=>void;
 matches?:RecruitmentCardView[];onDismissMatches?:()=>void;loading?:boolean;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [kind,setKind]=useState<Kind>('groups'),[view,setView]=useState<'browse'|'posts'>('browse'),[showCreate,setShowCreate]=useState(false),[showMatches,setShowMatches]=useState(false);
 const types:RecruitmentPostType[]=area==='party'?(kind==='groups'?['party_recruiting']:['looking_for_party']):(kind==='groups'?['guild_recruiting']:['looking_for_guild']);
 const visible=filterRecruitmentCards(cards,{...filters,postTypes:types},nowMs);
 const myPosts=own.filter(card=>area==='party'?card.postType.includes('party'):card.postType.includes('guild'));
 const options:{id:Action;title:string;detail:string;enabled:boolean}[]=[
  {id:'looking_for_party',title:'Looking for a Party',detail:'Find a persistent team',enabled:partyUnlocked&&!inParty},
  {id:'party_recruiting',title:'Recruit for my Party',detail:partyOpenSpots>0?'Find members for open Party slots':'Your Party has no open slots',enabled:partyUnlocked&&inParty&&partyLeader&&partyOpenSpots>0},
  {id:'looking_for_guild',title:'Looking for a Guild',detail:'Let Guilds discover you',enabled:guildMembershipKnown&&!inGuild},
  {id:'guild_recruiting',title:'Recruit for my Guild',detail:'Leader or Officer access',enabled:canRecruitGuild},
 ];
 const createAdvert=()=>{if(area==='party'){const eligible=options.filter(option=>option.id.includes('party')&&option.enabled);if(eligible.length===1){onPost(eligible[0].id);return;}}setShowCreate(true);};
 return <View style={s.root}>
  <View style={s.header}><View style={s.flex}><Text style={s.eyebrow}>FIND YOUR FELLOWSHIP</Text><Text accessibilityRole="header" style={s.title}>Recruitment</Text><Text style={s.copy}>Find players, Parties and Guilds</Text></View></View>
  <View accessibilityRole="tablist" style={s.tabs}>{(['party','guild'] as const).map(id=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:area===id}} onPress={()=>{onAreaChange(id);setKind('groups');setView('browse')}} style={[s.tab,area===id&&s.selected]}><Text style={[s.tabLabel,area===id&&s.selectedLabel]}>{id==='party'?'Party':'Guild'}</Text></Pressable>)}</View>
  <View accessibilityRole="tablist" style={s.tabs}>{(['browse','posts'] as const).map(id=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:view===id}} onPress={()=>setView(id)} style={[s.tab,view===id&&s.selected]}><Text style={[s.tabLabel,view===id&&s.selectedLabel]}>{id==='browse'?'Browse':'My Posts'}</Text></Pressable>)}</View>
  {matches.length&&area==='party'?<View style={s.matchCard}><View style={s.between}><View style={s.flex}><Text style={s.eyebrow}>MATCHES FOUND</Text><Text style={s.copy}>{matches.length} compatible recruitment adverts</Text></View><GameButton compact tone="secondary" title={showMatches?'Hide':'View'} onPress={()=>setShowMatches(v=>!v)}/></View>{showMatches?matches.slice(0,5).map(card=><RecruitmentListing key={card.id} card={card} nowMs={nowMs} onPress={()=>onOpen(card)}/>):null}{showMatches&&onDismissMatches?<GameButton compact tone="secondary" title="Dismiss matches" onPress={onDismissMatches}/>:null}</View>:null}
  {view==='browse'?<>
   <View style={s.hero}><View style={s.between}><View style={s.flex}><Text style={s.eyebrow}>{area.toUpperCase()} RECRUITMENT</Text><Text style={s.heading}>{area==='party'?'Find the right teammates':'Find your Guild connection'}</Text></View><Text style={s.pill}>{area==='party'?'LFG / LFM':'GUILDS'}</Text></View>
    <Text style={s.copy}>{area==='party'?'Find a Party or teammates.':'Find a Guild or recruit players.'}</Text>
    <GameButton title={area==='party'?'+ Post for Party':'+ Create advert'} disabled={busy} onPress={createAdvert}/>
    {area==='party'&&inParty&&partyLeader&&partyOpenSpots>0&&onInviteFriends?<GameButton compact tone="secondary" title="Invite friends privately" disabled={busy} onPress={onInviteFriends}/>:null}
   </View>
   <View accessibilityRole="tablist" style={s.tabs}>{(['groups','players'] as const).map(id=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:kind===id}} onPress={()=>setKind(id)} style={[s.tab,kind===id&&s.selected]}><Text style={[s.tabLabel,kind===id&&s.selectedLabel]}>{id==='groups'?area==='party'?'Parties recruiting':'Guilds recruiting':area==='party'?'Players seeking':'Guild seekers'}</Text></Pressable>)}</View>
   <RecruitmentFiltersPanel value={filters} onChange={onFiltersChange} hidePostType partyMode={area==='party'}/>
   <View style={s.between}><Text style={s.headingSmall}>{kind==='groups'?'Recruiting groups':'Available players'}</Text><Text style={s.copy}>{visible.length} results</Text></View>
   {loading?<View style={s.loading}><ActivityIndicator color={C.accent}/><Text style={s.copy}>Checking Recruitment…</Text></View>:null}
   {!loading&&visible.map(card=><RecruitmentListing key={card.id} card={card} nowMs={nowMs} onPress={()=>onOpen(card)}/>)}
   {!loading&&!visible.length?<View style={s.empty}><Text style={s.headingSmall}>No matching adverts</Text><Text style={[s.copy,{textAlign:'center'}]}>Try different filters or publish your own advert.</Text><GameButton compact title="Create advert" onPress={createAdvert}/></View>:null}
   <Text style={s.copy}>Party posts: 1 day · Guild posts: 1–3 days.</Text>
  </>:<>
   <View style={s.between}><Text style={s.headingSmall}>Your active adverts</Text><GameButton compact title="+ New post" disabled={busy} onPress={createAdvert}/></View>
   {myPosts.length?myPosts.map(card=><View key={card.id} style={s.post}><View style={s.between}><Text style={[s.headingSmall,s.flex]}>{card.title}</Text><Text style={s.pill}>{card.status==='closed'?'CLOSED':'ACTIVE'}</Text></View><Text style={s.copy}>{card.body}</Text><RecruitmentListing card={card} nowMs={nowMs} onPress={()=>onOpen(card)}/>{card.status!=='closed'?<View style={s.actions}><View style={s.flex}><GameButton compact tone="secondary" title="Refresh" disabled={busy} onPress={()=>onRefresh(card.id)}/></View><View style={s.flex}><GameButton compact tone="secondary" title="Close advert" disabled={busy} onPress={()=>onClose(card.id)}/></View></View>:null}{area==='party'&&card.postType==='party_recruiting'&&card.status!=='closed'&&inParty&&partyLeader&&partyOpenSpots>0&&onInviteFriends?<GameButton compact title="Invite friends" disabled={busy} onPress={onInviteFriends}/>:null}</View>):<View style={s.empty}><Text style={s.headingSmall}>No active adverts</Text><Text style={s.copy}>Create a post to find players.</Text><GameButton compact title="Create advert" onPress={createAdvert}/></View>}
   <Text style={s.copy}>One active post per type · 6h refresh cooldown.</Text>
  </>}
  <GameButton compact tone="secondary" title={area==='party'?'Open my Party':'Open Guild'} onPress={area==='party'?onOpenParty:onOpenGuild}/>
  <GameModalSurface visible={showCreate} presentation="sheet" onClose={()=>setShowCreate(false)}>
   <GameModalHeader eyebrow="NEW RECRUITMENT POST" title="What are you looking for?" onClose={()=>setShowCreate(false)}/>
   <View style={s.modalBody}><Text style={s.copy}>Choose a post type.</Text>
   {options.filter(option=>area==='party'?option.id.includes('party'):option.id.includes('guild')).map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityState={{disabled:!option.enabled}} disabled={!option.enabled||busy} onPress={()=>{setShowCreate(false);onPost(option.id)}} style={({pressed})=>[s.option,!option.enabled&&s.disabled,pressed&&s.pressed]}><View style={s.flex}><Text style={s.headingSmall}>{option.title}</Text><Text style={s.copy}>{option.detail}{!option.enabled?' · Unavailable':''}</Text></View><Text style={s.arrow}>›</Text></Pressable>)}
   </View>
  </GameModalSurface>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:11},loading:{minHeight:54,flexDirection:'row',alignItems:'center',gap:9},matchCard:{gap:9,padding:10,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.panelRaised},header:{flexDirection:'row',gap:9,alignItems:'center'},flex:{flex:1,minWidth:0},eyebrow:{fontSize:10,fontWeight:'900',letterSpacing:1,color:C.accentSoft},title:{fontSize:21,lineHeight:28,fontWeight:'900',color:C.text,marginTop:3},copy:{fontSize:12,lineHeight:18,color:C.muted},heading:{fontSize:16,lineHeight:22,fontWeight:'800',color:C.text,marginTop:4},headingSmall:{fontSize:13,lineHeight:19,fontWeight:'800',color:C.text},
 tabs:{flexDirection:'row',gap:5},tab:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:6,paddingVertical:9,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},
 selected:{borderColor:C.selectionLine,backgroundColor:C.selection},tabLabel:{fontSize:11,fontWeight:'800',textAlign:'center',color:C.muted},selectedLabel:{color:C.text},hero:{gap:10,backgroundColor:C.panelRaised,borderColor:C.lineStrong,borderWidth:1,borderRadius:11,padding:12},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 pill:{paddingHorizontal:8,paddingVertical:5,fontSize:10,fontWeight:'900',color:C.accent,borderWidth:1,borderColor:C.lineStrong,borderRadius:7},empty:{padding:16,borderWidth:1,borderStyle:'dashed',borderColor:C.lineStrong,borderRadius:10,gap:9,alignItems:'center',backgroundColor:C.panel},post:{gap:10,borderWidth:1,borderColor:C.line,borderRadius:10,padding:10,backgroundColor:C.panel},actions:{flexDirection:'row',gap:7},modalBody:{gap:10,paddingVertical:12},option:{minHeight:60,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,borderRadius:9,padding:11,flexDirection:'row',gap:10,alignItems:'center'},arrow:{fontSize:21,color:C.accent},disabled:{opacity:.45},pressed:{opacity:.73},
 });}

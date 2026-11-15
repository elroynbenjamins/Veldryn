import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {recentScreenText} from '../i18n/recent-screens';
import {NavigationLinework,navigationLinework} from '../components/NavigationLinework';
import type {GameState} from '../core/types';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {fetchCommunityRoadmap,toggleCommunityRoadmapVote,type CommunityRoadmapSnapshot,type CommunityRoadmapStatus} from '../online/community-roadmap';

type Language=GameState['settings']['language'];
// Stable database IDs, not localized display text. Unknown future ideas use a neutral glyph.
const ROADMAP_GLYPHS:Record<string,keyof typeof navigationLinework>={
 dungeons:'dungeon',
 seasonal_events:'events',
 companion_refinement:'companions',
 achievements:'trophy',
 cosmetics:'collection',
 community_rewards:'supplies',
 class_combat_refinement:'arena',
 guild_improvements:'guild',
 exploration_expansion:'expedition',
 new_regions_chapters:'unlocks',
 party_events:'roadmapPartyEvents',
 guild_pvp:'roadmapGuildPvp',
 guild_pve:'roadmapGuildPve',
 arena:'roadmapArena',
 leaderboards:'roadmapLeaderboards',
 world_boss:'roadmapWorldBoss',
 player_market:'roadmapPlayerMarket',
 tier_5_plus_equipment:'roadmapTier5',
 overall_refinement:'roadmapRefinement',
};
const STATUS_OPTIONS:{id:CommunityRoadmapStatus;label:string}[]=[
 {id:'considering',label:'Vote'},
 {id:'planned',label:'Planned'},
 {id:'in_progress',label:'In Development'},
 {id:'released',label:'Released'},
];

export function CommunityRoadmapScreen({language}:{language:Language}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),a=(source:string)=>recentScreenText(language,source);
 const [selected,setSelected]=useState<CommunityRoadmapStatus>('considering');
 const [snapshot,setSnapshot]=useState<CommunityRoadmapSnapshot|null>(null);
 const [loading,setLoading]=useState(true);
 const [pending,setPending]=useState<string|null>(null);
 const [error,setError]=useState('');
 const alive=useRef(true),request=useRef(0);
 const load=useCallback(async()=>{
   const version=++request.current;
   setLoading(true);setError('');
   try{
     const next=await fetchCommunityRoadmap();
     if(alive.current&&request.current===version)setSnapshot(next);
   }catch(e){
     if(alive.current&&request.current===version)setError(e instanceof Error?e.message:'Could not load roadmap.');
   }finally{
     if(alive.current&&request.current===version)setLoading(false);
   }
 },[]);
 useEffect(()=>{alive.current=true;void load();return()=>{alive.current=false;request.current++;};},[load]);

 const changeVote=async(id:string)=>{
   if(pending)return;
   setPending(id);setError('');
   try{
     const next=await toggleCommunityRoadmapVote(id);
     if(alive.current)setSnapshot(next);
   }catch(e){
     if(alive.current)setError(e instanceof Error?e.message:'Could not save vote.');
   }finally{
     if(alive.current)setPending(null);
   }
 };
 const rows=(snapshot?.features??[])
   .filter(feature=>feature.status===selected)
   .sort((left,right)=>selected==='considering'?right.votes-left.votes||left.title.localeCompare(right.title):left.title.localeCompare(right.title));
 const used=snapshot?.votes_used??0,limit=snapshot?.vote_limit??3;
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.hero}>
     <Text style={s.kicker}>{a('THE FUTURE OF VELDRYN')}</Text>
     <Text accessibilityRole="header" style={s.heading}>{a('Community Roadmap')}</Text>
     <Text style={s.subtitle}>{a("Vote on upcoming features and improvements. Your choices help guide Veldryn's development.")}</Text>
   </View>

   {selected==='considering'?<View style={s.voteBudget}>
     <View style={s.flex}>
       <Text style={s.budgetTitle}>{a('Your votes')}</Text>
       <Text style={s.budgetHint}>{a('Up to three active choices per account')}</Text>
     </View>
     <View style={s.budgetRight}>
       <Text style={s.voteCount}>{used}/{limit}</Text>
       <View style={s.diamonds}>
         {Array.from({length:limit},(_,index)=><View key={index} style={[s.diamond,index<used&&s.diamondActive]}/>)}
       </View>
     </View>
   </View>:null}

   <View accessibilityRole="tablist" style={s.tabs}>
     {STATUS_OPTIONS.map(option=><Pressable key={option.id} accessibilityRole="tab" accessibilityState={{selected:selected===option.id}} onPress={()=>setSelected(option.id)} style={({pressed})=>[s.tab,selected===option.id&&s.tabSelected,pressed&&s.pressed]}>
       <Text style={[s.tabLabel,selected===option.id&&s.tabLabelActive]}>{a(option.label)}</Text>
     </Pressable>)}
   </View>

   <View style={s.sectionHead}>
     <Text style={s.sectionTitle}>{a(STATUS_OPTIONS.find(option=>option.id===selected)?.label??'Vote')}</Text>
     <Text style={s.refreshText}>{a('Updates every 2 hours')}</Text>
   </View>

   {error?<View accessibilityRole="alert" style={s.errorCard}>
     <Text style={s.errorText}>{a(error)}</Text>
     {!snapshot?<Pressable accessibilityRole="button" onPress={()=>void load()} style={s.retry}><Text style={s.retryText}>{a('Retry')}</Text></Pressable>:null}
   </View>:null}
   {loading&&!snapshot?<View style={s.loading}><ActivityIndicator color={C.accent}/><Text style={s.emptyText}>{a('Loading roadmap…')}</Text></View>:null}

   {rows.map(feature=>{
     const canVote=feature.status==='considering';
     const disabled=!!pending||loading||(!feature.voted&&used>=limit);
     return <View key={feature.id} style={[s.feature,feature.voted&&s.featureSelected]}>
       <View style={s.featureTop}>
         <View style={s.featureGlyph} accessible={false} pointerEvents="none">
           <NavigationLinework name={ROADMAP_GLYPHS[feature.id]??'quests'} size={22} color={feature.voted?C.accent:C.accentSoft}/>
         </View>
         <View style={s.flex}>
           <Text style={s.featureTitle}>{a(feature.title)}</Text>
           <Text style={s.category}>{a(feature.category)} · {a(canVote?'Roadmap idea':STATUS_OPTIONS.find(option=>option.id===feature.status)?.label??'Planned')}</Text>
         </View>
         {canVote?<Pressable accessibilityRole="button" accessibilityLabel={a(feature.voted?'Remove vote for':'Vote for')+' '+a(feature.title)} accessibilityState={{selected:feature.voted,disabled}} disabled={disabled} onPress={()=>void changeVote(feature.id)} style={({pressed})=>[s.voteButton,feature.voted&&s.voteButtonActive,disabled&&s.voteButtonDisabled,pressed&&s.pressed]}>
           <Text style={[s.voteButtonText,feature.voted&&s.voteButtonTextActive]}>{pending===feature.id?a('Saving…'):feature.voted?'✓ '+a('Voted'):'+ '+a('Vote')}</Text>
         </Pressable>:null}
       </View>
       <Text style={s.description}>{a(feature.description)}</Text>
       {canVote||feature.release_version?<View style={s.featureFooter}>
         {canVote?<Text style={s.meta}>{feature.votes} {a(feature.votes===1?'vote':'votes')}</Text>:null}
         {feature.release_version?<Text style={s.meta}>{a('Released in')} {feature.release_version}</Text>:null}
       </View>:null}
     </View>;
   })}
   {snapshot&&!loading&&!rows.length?<View style={s.empty}>
     <Text style={s.emptyTitle}>{a(selected==='considering'?'No ideas open for voting':'Nothing here yet')}</Text>
     <Text style={s.emptyText}>{a('Major expansions will appear here when announced.')}</Text>
   </View>:null}
   {snapshot&&selected==='considering'?<Text style={s.footnote}>{a('Votes are not a promise of a release date. The development team decides priorities. When an idea moves to Planned, its votes are returned.')}</Text>:null}
 </ScrollView>;
}

function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:spacing.md,gap:10,paddingBottom:110},
 hero:{gap:6,paddingBottom:5},kicker:{...typography.caption,color:C.accentSoft,fontWeight:'900',letterSpacing:1.1},
 heading:{...typography.hero,color:C.text},subtitle:{...typography.caption,color:C.muted,lineHeight:18},
 voteBudget:{flexDirection:'row',alignItems:'center',gap:12,padding:13,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.selectionLine,borderRadius:radii.md},
 flex:{flex:1,minWidth:0},budgetTitle:{...typography.bodyStrong,color:C.text},budgetHint:{...typography.caption,color:C.muted,marginTop:3},
 budgetRight:{alignItems:'flex-end',gap:8},voteCount:{fontSize:18,fontWeight:'900',color:C.text},
 diamonds:{flexDirection:'row',gap:6},diamond:{width:10,height:10,transform:[{rotate:'45deg'}],borderWidth:1,borderColor:C.muted},diamondActive:{backgroundColor:C.accent,borderColor:C.accent},
 tabs:{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:4},
 tab:{flexGrow:1,minHeight:43,justifyContent:'center',alignItems:'center',paddingHorizontal:10,paddingVertical:8,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:9},
 tabSelected:{backgroundColor:C.selection,borderColor:C.selectionLine},tabLabel:{fontSize:11,fontWeight:'800',color:C.muted},tabLabelActive:{color:C.text},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:4},
 sectionTitle:{...typography.bodyStrong,color:C.text},refreshText:{fontSize:11,fontWeight:'700',color:C.muted},
 feature:{padding:13,gap:9,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 featureSelected:{borderColor:C.selectionLine,backgroundColor:C.panelRaised},
 featureTop:{flexDirection:'row',alignItems:'center',gap:10},featureGlyph:{width:38,height:38,flexShrink:0,alignItems:'center',justifyContent:'center',backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.selectionLine,borderRadius:9},featureTitle:{...typography.bodyStrong,color:C.text,fontSize:15},category:{...typography.caption,color:C.accentSoft,marginTop:4,fontSize:10},
 description:{...typography.caption,color:C.muted,lineHeight:18},
 featureFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},meta:{fontSize:10,color:C.muted,fontWeight:'800'},
 voteButton:{minHeight:44,minWidth:83,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.secondaryButtonBorder,borderRadius:9,backgroundColor:C.secondaryButton},
 voteButtonActive:{backgroundColor:C.accent,borderColor:C.accent},voteButtonDisabled:{opacity:.45},
 voteButtonText:{fontSize:11,fontWeight:'900',color:C.secondaryButtonText},voteButtonTextActive:{color:C.bg},
 empty:{alignItems:'center',padding:22,gap:6,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md},
 emptyTitle:{...typography.bodyStrong,color:C.text},emptyText:{...typography.caption,color:C.muted,textAlign:'center'},
 loading:{alignItems:'center',gap:10,padding:20},errorCard:{gap:8,padding:12,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},
 errorText:{...typography.caption,color:C.text},retry:{alignSelf:'flex-start',minHeight:40,justifyContent:'center'},retryText:{fontSize:12,fontWeight:'800',color:C.accent},
 footnote:{...typography.caption,color:C.muted,lineHeight:17,marginTop:9},pressed:{opacity:.75},
});}

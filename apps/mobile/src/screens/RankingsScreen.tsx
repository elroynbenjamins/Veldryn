import {useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {socialLabel,socialText} from '../i18n/social';
import {formatLocalizedNumber} from '../i18n/translator';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,ScrollView,type ScrollViewInstance,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {ActionFeedback} from '../components/ActionFeedback';
import {EmptyState} from '../components/EmptyState';
import {LoadingState} from '../components/LoadingState';
import {CompactPlayerIdentity} from '../components/CompactPlayerIdentity';
import {GameModalSurface,GameModalHeader} from '../components/GameModalSurface';
import {RANKING_BOARDS,RANKING_GROUPS,type RankingBoardId,type RankingBoardSnapshot,type RankingGroup,type RankingEntry} from '../core/rankings';
import {rankingsClient,rankingsOnlineConfigured} from '../online/rankings-client';
import {RANKING_PAGE_SIZE,rankingPageOffset,projectRankingPage,splitRankingDisplay} from '../core/ranking-pagination';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {rankingPositionPresentation} from '../core/social-identity';
export function RankingsScreen(){
 const st=useSocialText();
 const language=useGameLanguage();
 const rankingValueLabel=(id:RankingBoardId,value:number)=>{const unit=RANKING_BOARDS.find(row=>row.id===id)!.unit;const number=formatLocalizedNumber(language,Math.max(0,Math.floor(value)));return socialText(language,id==="dungeon_tier"?"Tier {value}":unit==="levels"?"{value} levels":unit==="points"?"{value} points":unit==="rating"?"{value} rating":unit==="wins"?"{value} wins":unit==="clears"?"{value} clears":"{value} level",{value:number});};
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackRows=width<360||fontScale>=1.25;const[group,setGroup]=useState<RankingGroup>('Account'),[board,setBoard]=useState<RankingBoardId>('profession_total'),[snapshot,setSnapshot]=useState<RankingBoardSnapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[boardPickerOpen,setBoardPickerOpen]=useState(false),[page,setPage]=useState(0),[loadedPage,setLoadedPage]=useState(0),[hasNext,setHasNext]=useState(false);const boards=useMemo(()=>RANKING_BOARDS.filter(row=>row.group===group),[group]);useEffect(()=>{if(!boards.some(row=>row.id===board))setBoard(boards[0].id)},[group]);
 const request=useRef(0);
 const scrollRef=useRef<ScrollViewInstance|null>(null);
 const [guideOpen,setGuideOpen]=useState(false);
 function selectGroup(value:RankingGroup){
   if(value===group)return;
   request.current++;
   const first=RANKING_BOARDS.find(row=>row.group===value);
   setGroup(value);setPage(0);setHasNext(false);setSnapshot(null);setError('');setLoading(false);
   if(first&&!RANKING_BOARDS.some(row=>row.id===board&&row.group===value))setBoard(first.id);
   scrollRef.current?.scrollTo({y:0,animated:false});
 }
 function selectBoard(next:RankingBoardId){
   setBoardPickerOpen(false);
   if(next===board)return;
   request.current++;
   setBoard(next);setPage(0);setHasNext(false);setSnapshot(null);setError('');setLoading(false);
   scrollRef.current?.scrollTo({y:0,animated:false});
 }
 function goToPage(next:number){
   if(loading||!Number.isSafeInteger(next)||next<0||next===page)return;
   try{rankingPageOffset(next);}catch{return;}
   request.current++;
   scrollRef.current?.scrollTo({y:0,animated:false});
   setSnapshot(null);setHasNext(false);setError('');setLoading(false);setPage(next);
 }
 async function load(){
   const version=++request.current;
   if(!rankingsOnlineConfigured){
     setLoading(false);setSnapshot(null);setHasNext(false);
     setError(st("Rankings require the authenticated online server."));return;
   }
   setLoading(true);setError('');
   try{
     const next=await rankingsClient.board(board,RANKING_PAGE_SIZE+1,rankingPageOffset(page));
     if(version===request.current){
       if(next.board!==board||!Array.isArray(next.entries)||next.entries.some(entry=>
         !Number.isSafeInteger(entry.rank)||entry.rank<1
         ||!Number.isFinite(entry.value)||entry.value<0
         ||typeof entry.displayName!=='string'))throw new Error('invalid_rankings_response');
       const display=projectRankingPage(next.entries,page);
       setSnapshot({...next,entries:display.entries});
       setLoadedPage(page);setHasNext(display.hasNext);
     }
   }catch(e){
     // Keep the last successful snapshot for this board and page when refreshing
     // fails. Previous/Next and board switches clear that snapshot explicitly.
     if(version===request.current){
       setError(st("Could not load Rankings."));
     }
   }finally{if(version===request.current)setLoading(false);}
 }
 useEffect(()=>{void load();const timer=setInterval(()=>{if(AppState.currentState==='active')void load();},60000);const foreground=AppState.addEventListener('change',next=>{if(next==='active')void load();});return()=>{request.current++;clearInterval(timer);foreground.remove();};},[board,page]);const definition=RANKING_BOARDS.find(row=>row.id===board)!,activeSnapshot=snapshot?.board===board&&loadedPage===page&&boards.some(row=>row.id===board)?snapshot:null;

 // Visual highlights do not change official ranks or hide tied entries.
 const {podium,remaining}=splitRankingDisplay(activeSnapshot?.entries??[],page);
 const pageInfo=activeSnapshot?projectRankingPage(activeSnapshot.entries,page):null;
 function rankRow(entry:RankingEntry,top=false,rowIndex=0){
   const position=rankingPositionPresentation(entry.rank),podiumTone=position.tone==='podium_gold'?s.rankGold:position.tone==='podium_silver'?s.rankSilver:position.tone==='podium_bronze'?s.rankBronze:undefined;
   return <View key={`${page}-${rowIndex}-${entry.entityType}-${entry.rank}`} style={[top?s.podiumCard:s.rankCard,top&&entry.rank===1&&s.firstPlaceCard,entry.isSelf&&s.youCard,top&&stackRows&&s.podiumStack]}>
     <View style={[s.row,stackRows&&s.rowStack,top&&s.podiumRow]}>
       <View style={[s.rankBadge,podiumTone,top&&s.podiumBadge]}>
         {top?<Text accessible={false} style={[s.rankEmblem,entry.rank===1&&s.rankGoldText]}>{entry.rank===1?'♛':'◆'}</Text>:null}
         <Text style={[s.rank,position.tone==='podium_gold'&&s.rankGoldText]}>{position.label}</Text>
       </View>
       <View style={s.flex}>
         <CompactPlayerIdentity badges={entry.playerBadges} name={entry.displayName} guildTag={entry.guildTag} guildTagColorId={entry.guildTagColorId} guild={entry.entityType==='guild'} avatarSize={top&&!stackRows?32:36} status={entry.isSelf?st("YOU"):entry.entityType==='guild'?st("GUILD"):st("PLAYER")} statusTone={entry.isSelf?'good':'muted'}/>
         {entry.subtitle?<Text style={s.rankMeta} numberOfLines={top?1:2}>{entry.subtitle}</Text>:null}
         {entry.detail&&!top?<Text style={s.detail}>{entry.detail}</Text>:null}
       </View>
       <View style={[s.scoreWrap,stackRows&&s.scoreWrapStack]}>
         <Text numberOfLines={top?2:1} style={[s.scoreValue,stackRows&&s.scoreValueStack,top&&s.podiumValue]}>{rankingValueLabel(board,entry.value)}</Text>
         {top&&entry.rank===1?<Text style={s.leaderLabel}>{st("LEADER")}</Text>:null}
       </View>
     </View>
   </View>;
 }
 return <>
 <ScrollView ref={scrollRef} contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <View style={[s.hero,stackRows&&s.heroCompact]}>
    <View style={[s.heroEmblem,stackRows&&s.heroEmblemCompact]} accessible={false}><Text style={s.heroEmblemText}>♛</Text></View>
    <View style={s.flex}>
      <Text style={s.kicker}>{st("HALL OF RENOWN")}</Text>
      <Text accessibilityRole="header" style={s.heading}>{st("VELDRYN Rankings")}</Text>
    </View>
    <View style={[s.heroActions,stackRows&&s.heroActionsCompact]}>
      <Pressable accessibilityRole="button" accessibilityLabel={loading?st("Loading rankings"):st("Refresh")} accessibilityState={{disabled:loading,busy:loading}} disabled={loading} onPress={()=>{void load();}} style={({pressed})=>[s.iconButton,(pressed||loading)&&s.pressed]}>
        <Text accessible={false} style={s.refreshGlyph}>{loading?'…':'↻'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={st("Rankings guide")} onPress={()=>setGuideOpen(true)} style={({pressed})=>[s.iconButton,pressed&&s.pressed]}>
        <Text accessible={false} style={s.helpGlyph}>?</Text>
      </Pressable>
    </View>
  </View>
  <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.groupRail} accessibilityLabel={st("RANKINGS")}>
    {RANKING_GROUPS.map(value=><ChoiceChip key={value} label={socialLabel(language,value==='Professions'?'Skills':value==='Competitive'?'Arena':value)} selected={group===value} onPress={()=>selectGroup(value)}/>)}
  </ScrollView>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:boardPickerOpen}} accessibilityLabel={st("BOARD")+' · '+socialLabel(language,definition.name)} onPress={()=>setBoardPickerOpen(true)} style={({pressed})=>[s.boardPicker,pressed&&s.pressed]}>
    <View style={s.boardGlyph} accessible={false}><Text style={s.boardGlyphText}>{group==='Professions'?'✥':group==='Competitive'?'⚔':group==='Dungeons'?'◆':group==='Guilds'?'⚑':'✦'}</Text></View>
    <View style={s.flex}><Text style={s.filterLabel}>{st("BOARD")}</Text><Text numberOfLines={1} style={s.boardName}>{socialLabel(language,definition.name)}</Text></View><Text style={s.selectorArrow}>⌄</Text>
  </Pressable>
  <View style={s.boardIntro}>
    <Text style={s.copy}>{definition.group==='Professions'?st('Highest {profession} level on one account character.',{profession:socialLabel(language,definition.name)}):socialLabel(language,definition.description)}</Text>
    {activeSnapshot&&Number.isFinite(activeSnapshot.generatedAtMs)&&activeSnapshot.generatedAtMs>0
      ?<Text style={s.lastUpdated}>{st("Updated {time}",{time:new Date(activeSnapshot.generatedAtMs).toLocaleTimeString()})}</Text>
      :null}
  </View>
  {activeSnapshot?.self?<View style={s.selfCard}>
    <View style={s.selfHead}><Text style={s.selfKicker}>{st("YOUR STANDING")}</Text><Text style={s.selfScope}>{st("GLOBAL")}</Text></View>
    <View style={s.selfStats}>
      <View style={s.flex}><Text style={s.selfRank}>{activeSnapshot.self.listed&&activeSnapshot.self.rank?`#${formatLocalizedNumber(language,activeSnapshot.self.rank)}`:'—'}</Text><Text style={s.selfCaption}>{st("Current rank")}</Text></View>
      <View style={s.selfScore}><Text numberOfLines={2} style={s.selfValue}>{rankingValueLabel(board,activeSnapshot.self.value)}</Text><Text style={s.selfCaption}>{st("Verified score")}</Text></View>
    </View>
    {activeSnapshot.self.reason?<Text style={s.warning}>{activeSnapshot.self.reason}</Text>:null}
  </View>:null}
  {loading&&!activeSnapshot?<LoadingState compact label={st("Loading rankings")} detail={st("Fetching the latest server-calculated board.")}/>:null}
  {error?<View style={s.errorPanel}>
    <ActionFeedback message={error} tone="error" reduceMotion/>
    {!activeSnapshot&&rankingsOnlineConfigured?<GameButton compact title={st("Refresh")} tone="secondary" onPress={()=>{void load();}}/>:null}
  </View>:null}
  {podium.length?<View style={s.sectionGroup}><Text style={s.filterLabel}>{st("TOP THREE")}</Text>
    <View style={[s.podiumGrid,stackRows&&s.podiumGridStack]}>{podium.map((entry,index)=>rankRow(entry,true,index))}</View>
  </View>:null}
  {remaining.length?<View style={s.sectionGroup}><Text style={s.filterLabel}>{st("RANKED PLAYERS")}</Text><View style={s.rankList}>{remaining.map((entry,index)=>rankRow(entry,false,index))}</View></View>:null}
  {activeSnapshot&&!loading&&!error&&!activeSnapshot.entries.length?<EmptyState compact title={page===0?st("No ranked entries yet"):st("No further ranked entries")} message={page===0?st("This board will populate when eligible public results are available."):st("Return to the previous page to view ranked entries.")} icon="world"/>:null}
  {(activeSnapshot||page>0)&&rankingsOnlineConfigured?<View style={s.pageControls}>
    <GameButton compact title={st("Previous")} tone="secondary" disabled={page===0||loading} onPress={()=>goToPage(page-1)}/>
    <View style={s.pageMeta}>
      <Text accessibilityLiveRegion="polite" style={s.pageCounter}>{st("Page")} {formatLocalizedNumber(language,page+1)}</Text>
      {pageInfo?.firstPosition&&pageInfo.lastPosition?
        <Text style={s.pageRange}>{st("Entries {first}–{last}",{
          first:formatLocalizedNumber(language,pageInfo.firstPosition),
          last:formatLocalizedNumber(language,pageInfo.lastPosition),
        })}</Text>:null}
    </View>
    <GameButton compact title={st("Next")} tone="secondary" disabled={!activeSnapshot||!hasNext||loading} onPress={()=>goToPage(page+1)}/>
  </View>:null}
  <View style={s.trustNote}><Text accessible={false} style={s.trustSymbol}>◆</Text><Text style={s.trustText}>{st("Server-ranked · Privacy protected")}</Text></View>
  <Text style={s.liveNote}>{st("Live rankings can change while players progress.")}</Text>
 </ScrollView>
 <GameModalSurface visible={guideOpen} onClose={()=>setGuideOpen(false)} reduceMotion={true}>
   <GameModalHeader title={st("Rankings guide")} onClose={()=>setGuideOpen(false)}/>
   <ScrollView style={s.guideScroll} contentContainerStyle={s.guideContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     <Text style={s.guideSection}>{socialLabel(language,definition.name)}</Text>
     <Text style={s.guideCopy}>{definition.group==='Professions'?st('Highest {profession} level on one account character.',{profession:socialLabel(language,definition.name)}):socialLabel(language,definition.description)}</Text>
     <View style={s.guideRule}/>
     <Text style={s.guideCopy}>{st('Rankings are read-only, server-calculated, and provide no exclusive combat power. Account boards respect Public Profile visibility and block relationships.')}</Text>
     <Text style={s.guideSection}>{st("Privacy and tied ranks")}</Text>
     <Text style={s.guideCopy}>{st("Equal scores may share a rank. Hidden or blocked players never promote other players into a higher official rank.")}</Text>
     <Text style={s.guideCopy}>{st("Live rankings can change while players progress.")}</Text>
   </ScrollView>
 </GameModalSurface>
 <GameModalSurface visible={boardPickerOpen} onClose={()=>setBoardPickerOpen(false)} reduceMotion={true}>
   <GameModalHeader title={st("BOARD")} onClose={()=>setBoardPickerOpen(false)}/>
   <ScrollView style={s.optionList} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     {boards.map(value=><Pressable key={value.id} accessibilityRole="radio" accessibilityState={{selected:board===value.id}} onPress={()=>selectBoard(value.id)} style={[s.boardOption,board===value.id&&s.boardOptionActive]}>
       <View style={s.flex}><Text style={s.boardOptionTitle}>{socialLabel(language,value.name)}</Text><Text numberOfLines={2} style={s.boardOptionDetail}>{socialLabel(language,value.description)}</Text></View><Text style={s.optionMark}>{board===value.id?'✓':' '}</Text>
     </Pressable>)}
   </ScrollView>
 </GameModalSurface>
 </>;
}
function ChoiceChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.md,gap:10,paddingBottom:110},
 hero:{flexDirection:'row',alignItems:'center',gap:8,minHeight:72,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.lg,backgroundColor:C.panelRaised},
 heroCompact:{flexWrap:'wrap',rowGap:8},heroEmblemCompact:{width:34,height:36},heroActionsCompact:{width:'100%',justifyContent:'flex-end'},
 heroEmblem:{width:38,height:42,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,backgroundColor:C.warningSurface},
 heroEmblemText:{fontSize:22,fontWeight:'900',color:C.warning},
 heroActions:{flexDirection:'row',alignItems:'center',gap:5},
 iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel,borderRadius:radii.md},
 helpGlyph:{fontSize:19,fontWeight:'900',color:C.accent},refreshGlyph:{fontSize:25,lineHeight:28,fontWeight:'700',color:C.accent},
 kicker:{fontSize:9.5,lineHeight:14,color:C.warning,fontWeight:'900',letterSpacing:1.1},
 heading:{fontSize:21,lineHeight:26,fontWeight:'900',color:C.text},
 copy:{...typography.caption,color:C.muted,lineHeight:18},
 filterLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},
 groupRail:{gap:6,paddingBottom:4,paddingRight:12},
 chip:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},
 chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},
 chipText:{fontSize:12,color:C.muted,fontWeight:'800'},chipTextSelected:{color:C.text},pressed:{opacity:.65},
 boardPicker:{minHeight:64,padding:10,borderRadius:radii.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.lineStrong,flexDirection:'row',alignItems:'center',gap:10},
 boardGlyph:{width:38,height:38,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,alignItems:'center',justifyContent:'center',backgroundColor:C.panel2},
 boardGlyphText:{fontSize:20,color:C.accent},boardName:{...typography.bodyStrong,color:C.text,marginTop:3},selectorArrow:{fontSize:22,color:C.accent},
 boardIntro:{paddingHorizontal:3,minHeight:18,gap:4},lastUpdated:{fontSize:10,lineHeight:14,color:C.muted},errorPanel:{gap:6},
 flex:{flex:1,minWidth:0},
 selfCard:{padding:12,borderRadius:radii.lg,backgroundColor:C.accentSurface,borderWidth:1,borderColor:C.selectionLine,gap:7},
 selfHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
 selfKicker:{...typography.caption,color:C.text,fontWeight:'900',letterSpacing:.7},
 selfScope:{fontSize:9,color:C.muted,fontWeight:'800',letterSpacing:.7},
 selfStats:{flexDirection:'row',alignItems:'flex-end',gap:10},
 selfScore:{flex:1,minWidth:0,alignItems:'flex-end',justifyContent:'flex-end'},
 selfRank:{fontSize:25,lineHeight:30,fontWeight:'900',color:C.text,fontVariant:['tabular-nums']},
 selfValue:{fontSize:17,lineHeight:22,color:C.text,fontWeight:'900',textAlign:'right'},
 selfCaption:{fontSize:10,lineHeight:14,color:C.muted},
 warning:{...typography.caption,color:C.warning},
 sectionGroup:{gap:8},
 podiumGrid:{flexDirection:'column',gap:7},podiumGridStack:{flexDirection:'column'},
 podiumCard:{width:'100%',minWidth:0,padding:10,minHeight:62,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panelRaised},
 firstPlaceCard:{borderColor:C.warning,backgroundColor:C.warningSurface},podiumStack:{flexDirection:'column'},podiumRow:{flexDirection:'row',alignItems:'center'},
 podiumBadge:{width:44,minHeight:48},
 podiumValue:{fontSize:12,textAlign:'right',maxWidth:132},
 leaderLabel:{fontSize:9,color:C.warning,fontWeight:'900',letterSpacing:.7,textAlign:'right',marginTop:2},
 rankList:{gap:5},rankCard:{paddingVertical:9,paddingHorizontal:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 youCard:{borderColor:C.good},
 row:{flexDirection:'row',alignItems:'center',gap:9},rowStack:{flexWrap:'wrap',alignItems:'flex-start'},
 rankBadge:{width:44,minHeight:38,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 rankEmblem:{fontSize:14,lineHeight:16,color:C.muted},
 rankGold:{borderColor:C.warning,backgroundColor:C.warningSurface},rankSilver:{borderColor:C.muted,backgroundColor:C.panel2},rankBronze:{borderColor:'#b77844',backgroundColor:C.panel2},
 rank:{...typography.bodyStrong,color:C.accent},rankGoldText:{color:C.warning},
 rankMeta:{fontSize:10,color:C.muted,marginTop:3},detail:{...typography.caption,color:C.good,marginTop:3},
 scoreWrap:{maxWidth:138,minWidth:0,alignItems:'flex-end'},scoreWrapStack:{width:'100%',maxWidth:'100%',paddingLeft:53,alignItems:'flex-start'},
 scoreValue:{...typography.bodyStrong,color:C.text,textAlign:'right',maxWidth:136,fontVariant:['tabular-nums']},scoreValueStack:{textAlign:'left'}, 
 pageControls:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,paddingTop:7,minHeight:44},
 pageMeta:{alignItems:'center',justifyContent:'center',minWidth:66,flexShrink:1,gap:2},
 pageCounter:{...typography.caption,color:C.text,fontWeight:'900',textAlign:'center'},pageRange:{...typography.caption,color:C.muted,fontSize:10,textAlign:'center'},
 trustNote:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center',paddingTop:6},trustSymbol:{fontSize:10,color:C.good},trustText:{...typography.caption,fontSize:10,color:C.muted},
 guideScroll:{maxHeight:400},guideContent:{padding:14,gap:12},guideSection:{...typography.bodyStrong,color:C.text},guideCopy:{...typography.body,color:C.muted,lineHeight:21},guideRule:{height:1,backgroundColor:C.line},
 liveNote:{...typography.caption,color:C.muted,fontSize:10,lineHeight:15,paddingBottom:9,textAlign:'center'},
 optionList:{maxHeight:430,flexShrink:1},
 boardOption:{minHeight:56,paddingVertical:9,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:C.line},
 boardOptionActive:{backgroundColor:C.accentSurface},boardOptionTitle:{...typography.bodyStrong,color:C.text},boardOptionDetail:{...typography.caption,color:C.muted,marginTop:2},
 optionMark:{fontSize:16,fontWeight:'900',color:C.accent}
});}

import {useSocialText} from '../i18n/social';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {socialLabel,socialText} from '../i18n/social';
import {formatLocalizedNumber} from '../i18n/translator';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {ActionFeedback} from '../components/ActionFeedback';
import {EmptyState} from '../components/EmptyState';
import {LoadingState} from '../components/LoadingState';
import {CompactPlayerIdentity} from '../components/CompactPlayerIdentity';
import {GameModalSurface,GameModalHeader} from '../components/GameModalSurface';
import {RANKING_BOARDS,RANKING_GROUPS,type RankingBoardId,type RankingBoardSnapshot,type RankingGroup,type RankingEntry} from '../core/rankings';
import {rankingsClient,rankingsOnlineConfigured} from '../online/rankings-client';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {rankingPositionPresentation} from '../core/social-identity';
export function RankingsScreen(){
 const st=useSocialText();
 const language=useGameLanguage();
 const rankingValueLabel=(id:RankingBoardId,value:number)=>{const unit=RANKING_BOARDS.find(row=>row.id===id)!.unit;const number=formatLocalizedNumber(language,Math.max(0,Math.floor(value)));return socialText(language,id==="dungeon_tier"?"Tier {value}":unit==="levels"?"{value} levels":unit==="points"?"{value} points":unit==="rating"?"{value} rating":unit==="wins"?"{value} wins":unit==="clears"?"{value} clears":"{value} level",{value:number});};
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackRows=width<360||fontScale>=1.25;const[group,setGroup]=useState<RankingGroup>('Account'),[board,setBoard]=useState<RankingBoardId>('profession_total'),[snapshot,setSnapshot]=useState<RankingBoardSnapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[boardPickerOpen,setBoardPickerOpen]=useState(false);const boards=useMemo(()=>RANKING_BOARDS.filter(row=>row.group===group),[group]);useEffect(()=>{if(!boards.some(row=>row.id===board))setBoard(boards[0].id)},[group]);
 const request=useRef(0);
 function selectGroup(value:RankingGroup){const first=RANKING_BOARDS.find(row=>row.group===value);setGroup(value);if(first&&!RANKING_BOARDS.some(row=>row.id===board&&row.group===value))setBoard(first.id);}
 async function load(){const version=++request.current;if(!rankingsOnlineConfigured){setSnapshot(null);setError(st("Rankings require the authenticated online server."));return;}setLoading(true);setError('');try{const next=await rankingsClient.board(board);if(version===request.current)setSnapshot(next);}catch(e){if(version===request.current){setSnapshot(null);setError(e instanceof Error?e.message:st("Could not load Rankings."));}}finally{if(version===request.current)setLoading(false);}}
 useEffect(()=>{void load();const timer=setInterval(()=>{if(AppState.currentState==='active')void load();},60000);const foreground=AppState.addEventListener('change',next=>{if(next==='active')void load();});return()=>{request.current++;clearInterval(timer);foreground.remove();};},[board]);const definition=RANKING_BOARDS.find(row=>row.id===board)!,activeSnapshot=snapshot?.board===board&&boards.some(row=>row.id===board)?snapshot:null;

 const podium=activeSnapshot?.entries.filter(entry=>entry.rank<=3).sort((a,b)=>a.rank-b.rank)??[];
 const remaining=activeSnapshot?.entries.filter(entry=>entry.rank>3)??[];
 function rankRow(entry:RankingEntry,top=false){
   const position=rankingPositionPresentation(entry.rank),podiumTone=position.tone==='podium_gold'?s.rankGold:position.tone==='podium_silver'?s.rankSilver:position.tone==='podium_bronze'?s.rankBronze:undefined;
   return <View key={`${entry.rank}-${entry.entityType}-${entry.displayName}-${entry.value}`} style={[top?s.podiumCard:s.rankCard,entry.isSelf&&s.youCard,top&&stackRows&&s.podiumStack]}>
     <View style={[s.row,stackRows&&s.rowStack,top&&s.podiumRow]}>
       <View style={[s.rankBadge,podiumTone,top&&s.podiumBadge]}><Text style={[s.rank,position.tone==='podium_gold'&&s.rankGoldText]}>{position.label}</Text></View>
       <View style={s.flex}>
         <CompactPlayerIdentity badges={entry.playerBadges} name={entry.displayName} guildTag={entry.guildTag} guildTagColorId={entry.guildTagColorId} guild={entry.entityType==='guild'} avatarSize={top&&!stackRows?32:36} status={entry.isSelf?st("YOU"):entry.entityType==='guild'?st("GUILD"):st("PLAYER")} statusTone={entry.isSelf?'good':'muted'}/>
         {entry.subtitle?<Text style={s.rankMeta} numberOfLines={top?1:2}>{entry.subtitle}</Text>:null}
         {entry.detail&&!top?<Text style={s.detail}>{entry.detail}</Text>:null}
       </View>
       <Text numberOfLines={top?2:1} style={[s.scoreValue,stackRows&&s.scoreValueStack,top&&s.podiumValue]}>{rankingValueLabel(board,entry.value)}</Text>
     </View>
   </View>;
 }
 return <>
 <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
  <Text style={s.kicker}>{st("RANKINGS")}</Text>
  <Text accessibilityRole="header" style={s.heading}>{st("VELDRYN Rankings")}</Text>
  <ScrollView accessibilityRole="tablist" horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.groupRail}>
    {RANKING_GROUPS.map(value=><ChoiceChip key={value} label={socialLabel(language,value)} selected={group===value} onPress={()=>selectGroup(value)}/>)}
  </ScrollView>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:boardPickerOpen}} accessibilityLabel={st("BOARD")} onPress={()=>setBoardPickerOpen(true)} style={({pressed})=>[s.boardPicker,pressed&&s.pressed]}>
    <View style={s.flex}><Text style={s.filterLabel}>{st("BOARD")}</Text><Text numberOfLines={1} style={s.boardName}>{socialLabel(language,definition.name)}</Text></View><Text style={s.selectorArrow}>⌄</Text>
  </Pressable>
  <View style={s.boardIntro}>
    <View style={s.flex}><Text style={s.copy}>{definition.group==='Professions'?st('Highest {profession} level on one account character.',{profession:socialLabel(language,definition.name)}):socialLabel(language,definition.description)}</Text></View>
    <GameButton compact title={st("Refresh")} tone="secondary" loading={loading} onPress={()=>load()}/>
  </View>
  {activeSnapshot?.self?<View style={s.selfCard}><View style={s.selfHead}><Text style={s.kicker}>{st("YOUR STANDING")}</Text><Text style={s.selfRank}>{activeSnapshot.self.listed&&activeSnapshot.self.rank?`#${activeSnapshot.self.rank}`:'—'}</Text></View>
    <Text style={s.selfValue}>{rankingValueLabel(board,activeSnapshot.self.value)}</Text>{activeSnapshot.self.reason?<Text style={s.warning}>{activeSnapshot.self.reason}</Text>:null}
  </View>:null}
  {loading&&!activeSnapshot?<LoadingState compact label={st("Loading rankings")} detail={st("Fetching the latest server-calculated board.")}/>:null}
  {error?<ActionFeedback message={error} tone="error" reduceMotion/>:null}
  {podium.length?<View style={s.sectionGroup}><Text style={s.filterLabel}>{st("TOP THREE")}</Text>
    <View style={[s.podiumGrid,stackRows&&s.podiumGridStack]}>{podium.map(entry=>rankRow(entry,true))}</View>
  </View>:null}
  {remaining.length?<View style={s.sectionGroup}><Text style={s.filterLabel}>{st("RANKINGS")}</Text><View style={s.rankList}>{remaining.map(entry=>rankRow(entry))}</View></View>:null}
  {activeSnapshot&&!loading&&!activeSnapshot.entries.length?<EmptyState compact title={st("No ranked entries yet")} message={st("This board will populate when eligible public results are available.")} icon="world"/>:null}
  <Text style={s.footerNote}>{st('Rankings are read-only, server-calculated, and provide no exclusive combat power. Account boards respect Public Profile visibility and block relationships.')}</Text>
 </ScrollView>
 <GameModalSurface visible={boardPickerOpen} onClose={()=>setBoardPickerOpen(false)} reduceMotion={true}>
   <GameModalHeader title={st("BOARD")} onClose={()=>setBoardPickerOpen(false)}/>
   <ScrollView style={s.optionList} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
     {boards.map(value=><Pressable key={value.id} accessibilityRole="radio" accessibilityState={{selected:board===value.id}} onPress={()=>{setBoard(value.id);setBoardPickerOpen(false)}} style={[s.boardOption,board===value.id&&s.boardOptionActive]}>
       <View style={s.flex}><Text style={s.boardOptionTitle}>{socialLabel(language,value.name)}</Text><Text numberOfLines={2} style={s.boardOptionDetail}>{socialLabel(language,value.description)}</Text></View><Text style={s.optionMark}>{board===value.id?'✓':' '}</Text>
     </Pressable>)}
   </ScrollView>
 </GameModalSurface>
 </>;
}
function ChoiceChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
 root:{padding:spacing.md,gap:10,paddingBottom:110},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.2},heading:{...typography.hero,color:C.text},copy:{...typography.caption,color:C.muted,lineHeight:18},
 filterLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.8},groupRail:{gap:6,paddingBottom:3},chip:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'800'},chipTextSelected:{color:C.text},pressed:{opacity:.76},
 boardPicker:{minHeight:52,padding:12,borderRadius:radii.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,flexDirection:'row',alignItems:'center',gap:10},boardName:{...typography.bodyStrong,color:C.text,marginTop:3},selectorArrow:{fontSize:22,color:C.accent},
 boardIntro:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:2},flex:{flex:1,minWidth:0},selfCard:{padding:12,borderRadius:radii.md,backgroundColor:C.accentSurface,borderWidth:1,borderColor:C.accent,gap:4},selfHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},selfRank:{fontSize:22,fontWeight:'900',color:C.text},selfValue:{fontSize:19,color:C.text,fontWeight:'900'},warning:{...typography.caption,color:C.warning},
 sectionGroup:{gap:8},podiumGrid:{flexDirection:'row',gap:7},podiumGridStack:{flexDirection:'column'},podiumCard:{flex:1,minWidth:0,padding:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},podiumStack:{flexDirection:'column'},podiumRow:{flexDirection:'column',alignItems:'flex-start'},podiumBadge:{width:44,height:30},podiumValue:{fontSize:12,textAlign:'left',width:'100%',marginLeft:0,marginTop:4},
 rankList:{gap:6},rankCard:{padding:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},youCard:{borderColor:C.good},row:{flexDirection:'row',alignItems:'center',gap:9},rowStack:{flexWrap:'wrap',alignItems:'flex-start'},rankBadge:{width:44,height:34,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},rankGold:{borderColor:equipmentColors.goldSoft,backgroundColor:C.accentSurface},rankSilver:{borderColor:C.muted,backgroundColor:C.panel2},rankBronze:{borderColor:'#b77844',backgroundColor:C.panel2},rank:{...typography.bodyStrong,color:C.accent},rankGoldText:{color:equipmentColors.goldSoft},rankMeta:{fontSize:10,color:C.muted,marginTop:3},detail:{...typography.caption,color:C.good,marginTop:3},scoreValue:{...typography.bodyStrong,color:C.text,textAlign:'right',maxWidth:128},scoreValueStack:{width:'100%',marginLeft:54,textAlign:'left'},
 footerNote:{...typography.caption,color:C.muted,lineHeight:17,paddingVertical:9},optionList:{maxHeight:430,flexShrink:1},boardOption:{minHeight:56,paddingVertical:9,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:C.line},boardOptionActive:{backgroundColor:C.accentSurface},boardOptionTitle:{...typography.bodyStrong,color:C.text},boardOptionDetail:{...typography.caption,color:C.muted,marginTop:2},optionMark:{fontSize:16,fontWeight:'900',color:C.accent}
});}
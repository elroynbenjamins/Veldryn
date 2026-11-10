import {useCallback,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useGuildHallUiText} from '../i18n/guild-hall-ui';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,View,type ScrollViewInstance} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {QuestBoard} from './QuestBoard';
import {OnlineGuildTokenShopPanel} from './OnlineGuildTokenShopPanel';
import {OnlineGuildConstructionPanel} from './OnlineGuildConstructionPanel';
import {OnlineGuildBankPanel} from './OnlineGuildBankPanel';
import {StatBar} from './StatBar';
import {guildFacilityArtwork} from '../theme/guild-remaster-art';
import {guildUpgradeComponentName} from '../theme/guild-upgrade-component-art';
import {GUILD_HALL_FACILITIES,DEFAULT_GUILD_HALL_POLICY} from '../core/guild-hall-v44';
import {guildConstructionBenefits} from '../content/guild-construction-benefits';
import {guildConstructionBlueprint} from '../content/guild-construction-blueprints';
import {loadOnlineGuildHallV44} from '../online/guild-hall-v44';
import {loadOnlineGuildTokenShop,type GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {GameState} from '../core/types';

type Projection=Awaited<ReturnType<typeof loadOnlineGuildHallV44>>;
// 'Skills' remains valid only for migration of older Hall navigation histories.
export type HeadquartersSection='Overview'|'Construction'|'Bank'|'Shop'|'Legacy'|'Skills';
interface HallNavigation {
 playerState?:GameState;
 activeSection?:HeadquartersSection;
 onSectionChange?:(section:HeadquartersSection)=>void;
 onTokenRewardsChanged?:()=>void|Promise<unknown>;
 headerHelp?:ReactNode;
}
const DESTINATIONS=['Overview','Construction','Bank','Shop','Legacy'] as const satisfies readonly HeadquartersSection[];
export function OnlineGuildHallPanel(navigation:HallNavigation){
 const ui=useGuildHallUiText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [projection,setProjection]=useState<Projection>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(force=false)=>{
  setLoading(true);setError('');
  try{setProjection(await loadOnlineGuildHallV44(force))}
  catch(reason){setError(reason instanceof Error?reason.message:ui('Unable to load Guild Hall.'))}
  finally{setLoading(false)}
 },[ui]);
 useEffect(()=>{void load()},[load]);
 if(loading&&!projection)return <Panel><Text style={s.title}>{ui('Guild Hall')}</Text><ActivityIndicator color={C.accent}/></Panel>;
 if(error&&!projection)return <Panel><Text style={s.title}>{ui('Guild Hall')}</Text><Text accessibilityRole="alert" style={s.error}>{error}</Text><GameButton title={ui("Retry Guild Hall")} tone="secondary" loading={loading} disabled={loading} onPress={()=>void load(true)}/></Panel>;
 if(!projection)return <Panel><Text style={s.title}>{ui('Guild Hall')}</Text><Text style={s.copy}>{ui('Join a Guild to unlock shared Hall progression.')}</Text></Panel>;
 return <GuildHallView {...navigation} projection={projection} loading={loading} error={error} onRefresh={()=>void load(true)}/>;
}

export function GuildHallView({projection,loading=false,error='',onRefresh,activeSection,onSectionChange,onTokenRewardsChanged,headerHelp,playerState,previewMode=false}:{projection:NonNullable<Projection>;loading?:boolean;error?:string;onRefresh?:()=>void;previewMode?:boolean}&HallNavigation){
 const ui=useGuildHallUiText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [localSection,setLocalSection]=useState<HeadquartersSection>('Overview');
 const hallTabsRef=useRef<ScrollViewInstance>(null);
 const [shop,setShop]=useState<GuildTokenShopSnapshot|null>(null);
 const [shopLoading,setShopLoading]=useState(true);
 const [shopError,setShopError]=useState('');
 const [bankFocus,setBankFocus]=useState<string|null>(null);
 const [returnBuilding,setReturnBuilding]=useState<string|undefined>(undefined);
 const [returnSelection,setReturnSelection]=useState<{templateId:string;resourceId:string}|undefined>(undefined);
 const requestedSection=activeSection??localSection;
 const section=requestedSection==='Skills'?'Overview':requestedSection;
 // On a narrow phone the Hall tabs scroll horizontally; always reveal the selected tab.
 useEffect(()=>{
  const index=DESTINATIONS.indexOf(section);
  if(index>=0)hallTabsRef.current?.scrollTo({x:Math.max(0,index-2)*88,animated:false});
 },[section]);
 const navigate=(next:HeadquartersSection)=>{if(onSectionChange)onSectionChange(next);else setLocalSection(next)};
 const refreshShop=useCallback(async()=>{
  setShopLoading(true);setShopError('');
  try{setShop(await loadOnlineGuildTokenShop())}
  catch(reason){setShopError(reason instanceof Error?reason.message:ui('Could not load guild construction and bank balances.'))}
  finally{setShopLoading(false)}
 },[ui]);
 useEffect(()=>{if(previewMode)setShopLoading(false);else void refreshShop()},[previewMode,refreshShop]);
 const {state,level,stage}=projection;
 const next=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[level]??DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[9];
 const previous=DEFAULT_GUILD_HALL_POLICY.hallLevelThresholds[Math.max(0,level-1)]??0;
 const hallRemaining=Math.max(0,next-state.hallProgress);
 const completed=new Set((shop?.construction??[]).filter(row=>row.completed).map(row=>row.templateId));
 const benefits=guildConstructionBenefits(completed);
 const nextProject=shop?.constructionTemplates.find(template=>template.id.startsWith('construction_')&&template.enabled&&template.guildLevel<=shop.guildLevel&&!shop.construction.some(row=>row.templateId===template.id&&row.completed));
 const funding=nextProject?shop?.construction.find(row=>row.templateId===nextProject.id):undefined;
 const needs=nextProject?[...(nextProject.gold>0?[{key:'gold',amount:nextProject.gold}]:[]),...nextProject.materials.map(material=>({key:material.materialKey,amount:material.amount}))]:[];
 const funded=needs.reduce((total,requirement)=>total+Math.min(requirement.amount,Math.max(0,funding?.resources[requirement.key]??0)),0);
 const required=needs.reduce((total,requirement)=>total+requirement.amount,0);
 const bankBalances=new Map((shop?.bank?.balances??[]).map(item=>[item.resourceId,item.amount]));
 const benefitsList=[
  ...(benefits.canChangeGuildColors?[{name:ui('Guild color editing'),detail:ui('Only previously unlocked colors can be selected')}]:[]),
  ...(benefits.smithingTailoringSpeedBps?[{name:ui('Smithing & Tailoring'),detail:ui('+{percent}% processing speed',{percent:benefits.smithingTailoringSpeedBps/100})}]:[]),
  ...(benefits.nonCombatXpBps?[{name:ui('Non-combat skill XP'),detail:'+'+(benefits.nonCombatXpBps/100)+'%'}]:[]),
  ...(benefits.guildTokenBonusBps?[{name:ui('Guild Token earnings'),detail:ui('+{percent}% · weekly cap {cap}',{percent:benefits.guildTokenBonusBps/100,cap:benefits.guildTokenWeeklyCap})}]:[]),
  ...(benefits.guildBossDamageBps?[{name:ui('Guild Boss damage'),detail:'+'+(benefits.guildBossDamageBps/100)+'%'}]:[]),
  ...(benefits.guildQuestGoldBps?[{name:ui('Guild Quest Gold'),detail:'+'+(benefits.guildQuestGoldBps/100)+'%'}]:[]),
 ];
 const renderHallProgress=()=> <Panel style={s.hero}>
  <View style={s.between}><View style={s.flex}><Text style={s.kicker}>{ui('AUTOMATIC HALL PROGRESSION')}</Text><Text style={s.heroTitle}>{stage}</Text><Text style={s.note}>{ui('{count} completed Guild Projects',{count:state.lifetimeProjectsCompleted})}</Text></View><View style={s.levelBadge}><Text style={s.level}>Lv {level}</Text><Text style={s.note}>/ 10</Text></View></View>
  <StatBar rounded label={ui("Hall Progress")} current={level>=10?1:Math.max(0,state.hallProgress-previous)} max={level>=10?1:Math.max(1,next-previous)}/>
  <Text style={s.note}>{level>=10?ui('Launch Hall level cap reached.'):ui('{count} Hall Progress to Level {level}',{count:hallRemaining.toLocaleString(),level:level+1})}</Text>
 </Panel>;
 const shopFallback=()=>previewMode?<Panel><Text style={s.copy}>{ui('Construction and bank balances require a connected Guild. This is a memory-only layout preview.')}</Text></Panel>:shopLoading&&!shop?<Panel><ActivityIndicator color={C.accent}/><Text style={s.copy}>{ui('Loading Guild Bank and construction…')}</Text></Panel>:!shop?<Panel><Text accessibilityRole="alert" style={s.error}>{shopError||ui('Guild supplies are unavailable.')}</Text><GameButton title={ui("Retry")} tone="secondary" loading={shopLoading} disabled={shopLoading} onPress={()=>void refreshShop()}/></Panel>:null;
 return <View style={s.root}>
  <View style={s.header}>
   <View style={s.crest}><Image source={guildFacilityArtwork('banner_gallery')} style={s.crestImage} resizeMode="contain" accessible={false}/></View>
   <View style={s.flex}><Text style={s.kicker}>{ui('GUILD HEADQUARTERS')}</Text><Text accessibilityRole="header" style={s.title}>{ui("Guild Hall")}</Text><Text style={s.note}>{ui('Shared progression and lasting benefits')}</Text></View>
   {headerHelp?<View style={s.helpWrap}>{headerHelp}</View>:null}
   {onRefresh?<Pressable accessibilityRole="button" accessibilityLabel={ui("Refresh Guild Hall and supplies")} disabled={loading||shopLoading} accessibilityState={{disabled:loading||shopLoading}} onPress={()=>{onRefresh();void refreshShop()}} style={({pressed})=>[s.refresh,pressed&&s.pressed]}><Text style={s.refreshText}>↻</Text></Pressable>:null}
  </View>
  <ScrollView ref={hallTabsRef} horizontal showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} accessibilityRole="tablist" accessibilityLabel={ui("Guild Hall sections")} contentContainerStyle={s.tabs}>
   {DESTINATIONS.map(id=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:section===id}} onPress={()=>navigate(id)} style={({pressed})=>[s.tab,{backgroundColor:section===id?C.selection:C.panel,borderColor:section===id?C.selectionLine:C.line},pressed&&s.pressed]}><Text style={[s.tabText,{color:section===id?C.text:C.muted}]}>{ui(id)}</Text></Pressable>)}
  </ScrollView>
  {section==='Overview'?<View style={s.root}>
   {renderHallProgress()}
   <View style={s.heading}><Text style={s.headingText}>{ui('Next guild construction')}</Text><GameButton compact tone="secondary" title={ui("View all")} onPress={()=>navigate('Construction')}/></View>
   {shopFallback()}
   {nextProject?<Panel style={s.priority}>
    <View style={s.between}><View style={s.flex}><Text style={s.priorityTitle}>{guildConstructionBlueprint(nextProject.id)?.name??ui('Guild Construction')}</Text><Text style={s.note}>{ui('Guild Lv {level} · {benefit}',{level:nextProject.guildLevel,benefit:guildConstructionBlueprint(nextProject.id)?.benefit??ui('Permanent guild upgrade')})}</Text></View><Text style={s.percent}>{required?Math.round(100*funded/required):0}%</Text></View>
    <StatBar rounded label={ui("Materials allocated")} current={funded} max={Math.max(1,required)}/>
    {needs.filter(req=>Math.max(0,funding?.resources[req.key]??0)<req.amount).slice(0,4).map(req=>{
     const allocated=Math.min(req.amount,Math.max(0,funding?.resources[req.key]??0)),remaining=Math.max(0,req.amount-allocated);
     const bank=shop?.bank===null?'—':(bankBalances.get(req.key)??0).toLocaleString();
     const name=req.key==='gold'?ui('Gold'):guildUpgradeComponentName(req.key)??req.key.toLowerCase().split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
     return <View key={req.key} style={s.fundingRow}><Text style={[s.note,s.flex]}>{name}</Text>
      <Text style={s.fundingAmount}>{ui('Need {needed} · Bank {bank}',{needed:remaining.toLocaleString(),bank})}</Text>
     </View>;
    })}
    <GameButton compact title={ui("Open Construction")} onPress={()=>navigate('Construction')}/>
   </Panel>:!shopLoading&&shop?<Panel><Text style={s.copy}>{ui('No eligible released construction is currently waiting for supplies.')}</Text><GameButton compact tone="secondary" title={ui("View roadmap")} onPress={()=>navigate('Construction')}/></Panel>:null}
   <View style={s.heading}><Text style={s.headingText}>{ui('Active construction benefits')}</Text><Text style={s.counter}>{ui('{count} unlocked',{count:benefitsList.length})}</Text></View>
   <Panel style={s.benefitList}>
    {benefitsList.length?benefitsList.slice(0,4).map((item,index)=><View key={item.name} style={[s.benefit,index>0&&s.benefitDivider]}><Text style={s.check}>✓</Text><View style={s.flex}><Text style={s.benefitTitle}>{item.name}</Text><Text style={s.note}>{item.detail}</Text></View></View>):<Text style={s.copy}>{ui('Complete Guild Construction to unlock permanent shared bonuses.')}</Text>}
    <Text style={s.note}>{ui('Shop quality unlocked: {quality}. Construction does not award free items.',{quality:benefits.shopQuality.charAt(0).toUpperCase()+benefits.shopQuality.slice(1)})}</Text>
   </Panel>
   <View style={s.heading}><Text style={s.headingText}>{ui('Hall facilities')}</Text><GameButton compact tone="secondary" title={ui("View details")} onPress={()=>navigate('Legacy')}/></View>
   <View style={s.facilityGrid}>{GUILD_HALL_FACILITIES.slice(0,4).map(def=><View key={def.id} style={s.facilityTile}><Text style={s.tileName}>{def.name}</Text><Text style={s.tileTier}>{ui('Tier {tier}/5',{tier:state.facilities[def.id].tier})}</Text></View>)}</View>
  </View>:null}
  {section==='Construction'?<View style={s.root}>
   {shopFallback()}
   {shop?<OnlineGuildConstructionPanel snapshot={shop} onReload={refreshShop}
    initialBuilding={returnBuilding} initialSelection={returnSelection}
    onOpenBank={(resourceId,building,selected)=>{setReturnBuilding(building);setReturnSelection(selected);setBankFocus(resourceId);navigate('Bank');}}/>:null}
   <GameButton compact tone="secondary" title={ui("Open Guild Bank")} onPress={()=>navigate('Bank')}/>
  </View>:null}
  {section==='Bank'?<View style={s.root}>
   {returnSelection?<View style={s.bankReturn}>
    <View style={s.flex}><Text style={s.priorityTitle}>{guildConstructionBlueprint(returnSelection.templateId)?.name??ui('Guild Construction')}</Text><Text style={s.note}>{ui('Continue funding your selected upgrade')}</Text></View>
    <GameButton compact tone="secondary" title={ui('Back to Construction')} onPress={()=>{setBankFocus(null);navigate('Construction')}}/>
   </View>:null}
   {shopFallback()}
   {shop?<OnlineGuildBankPanel snapshot={shop} playerState={playerState} onReload={refreshShop} focusResourceId={bankFocus}
    onFocusHandled={()=>setBankFocus(null)}
    onOpenConstruction={()=>{setBankFocus(null);navigate('Construction')}}/>:null}
  </View>:null}
  {section==='Shop'?(previewMode?shopFallback():<OnlineGuildTokenShopPanel onRewardsChanged={onTokenRewardsChanged} onOpenConstruction={()=>navigate('Construction')}/>):null}
  {section==='Legacy'?<View style={s.root}>{renderHallProgress()}<Text style={s.headingText}>{ui('Hall facilities')}</Text><Text style={s.copy}>{ui('Facilities advance automatically through Guild Projects. Construction and Guild Skills grant their own separate benefits.')}</Text>
   {GUILD_HALL_FACILITIES.map(def=>{const facility=state.facilities[def.id],tier=facility.tier,threshold=DEFAULT_GUILD_HALL_POLICY.facilityProgressThresholds[tier],requiredLevel=def.tierHallLevels[tier];return <View key={def.id} style={s.facility}>
    <Image source={guildFacilityArtwork(def.id)} resizeMode="contain" style={s.facilityImage} accessible={false}/>
    <View style={s.flex}><View style={s.between}><Text style={s.priorityTitle}>{def.name}</Text><Text style={s.tileTier}>T{tier}/5</Text></View><Text style={s.note}>{def.description}</Text>
    {tier<5?<><StatBar rounded label={ui("Facility progress")} current={Math.min(facility.progress,threshold)} max={Math.max(1,threshold)}/><Text style={[s.note,{color:level<requiredLevel?C.warning:C.muted}]}>{level<requiredLevel?ui('Hall Level {level} required · ',{level:requiredLevel}):''}{ui('+{count} project progress needed',{count:Math.max(0,threshold-facility.progress).toLocaleString()})}</Text></>:null}
    </View></View>})}
   <QuestBoard><View style={s.between}><Text style={s.headingText}>{ui('Trophy Room')}</Text><Text style={s.note}>{ui('{count} recorded',{count:state.trophies.length})}</Text></View>
    <Text style={s.copy}>{ui('Future Guild Legacy will preserve major trophies and season records permanently.')}</Text>
    {state.trophies.slice(0,10).map(trophy=><View key={trophy.trophyKey} style={s.trophy}><Text style={s.priorityTitle}>{trophy.label}</Text><Text style={s.copy}>{trophy.description||trophy.sourceKind}</Text><Text style={s.note}>{new Date(trophy.earnedAtMs).toLocaleDateString()}</Text></View>)}
    {!state.trophies.length?<Text style={s.note}>{ui('No recorded trophies yet.')}</Text>:null}
   </QuestBoard>
  </View>:null}
  {!!shopError&&shop?<Text accessibilityRole="alert" style={s.error}>{ui('Showing previously loaded supplies. Refresh failed: {error}',{error:shopError})}</Text>:null}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
 </View>;
}

function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:11},header:{flexDirection:'row',alignItems:'center',gap:10},helpWrap:{width:42,height:42,alignItems:'center',justifyContent:'center'},flex:{flex:1,minWidth:0,gap:4},
 crest:{width:51,height:51,borderRadius:12,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,justifyContent:'center',alignItems:'center'},
 crestImage:{width:43,height:43},
 title:{fontSize:20,lineHeight:26,fontWeight:'900',color:C.text},
 heroTitle:{fontSize:17,lineHeight:24,fontWeight:'800',color:C.text},
 kicker:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:.8,color:C.accentSoft},
 copy:{fontSize:12,lineHeight:18,color:C.muted},
 note:{fontSize:11,lineHeight:16,color:C.muted},
 error:{fontSize:12,lineHeight:18,color:C.bad},
 heading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headingText:{fontSize:15,lineHeight:21,fontWeight:'800',color:C.text},
 hero:{gap:10,backgroundColor:C.panelRaised},
 priority:{gap:9},priorityTitle:{fontSize:13,lineHeight:19,fontWeight:'800',color:C.text},
 between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9},
 levelBadge:{paddingVertical:5,paddingHorizontal:9,borderWidth:1,borderColor:C.lineStrong,borderRadius:9,alignItems:'center',backgroundColor:C.panel2},
 level:{fontSize:19,fontWeight:'900',color:C.accent},
 tabs:{gap:5,paddingBottom:2},tab:{minHeight:44,minWidth:83,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderRadius:9,borderWidth:1},
 tabText:{fontSize:11,fontWeight:'800'},pressed:{opacity:.72},
 refresh:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 refreshText:{fontSize:23,color:C.accent},
 percent:{fontSize:17,fontWeight:'900',color:C.accent},
 benefitList:{gap:7},
 benefit:{flexDirection:'row',alignItems:'flex-start',gap:9,paddingVertical:5},
 benefitDivider:{borderTopWidth:1,borderTopColor:C.line,paddingTop:10},
 check:{fontSize:17,fontWeight:'900',color:C.good},
 benefitTitle:{fontSize:12,lineHeight:18,fontWeight:'800',color:C.text},
 counter:{fontSize:11,color:C.good,fontWeight:'800'},
 bankReturn:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:9,padding:10,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panelRaised},
 fundingRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingVertical:3},
 fundingAmount:{fontSize:11,lineHeight:16,color:C.text,fontWeight:'700'},
 facilityGrid:{flexDirection:'row',flexWrap:'wrap',gap:7},
 facilityTile:{width:'48%',flexGrow:1,minHeight:61,padding:10,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},
 tileName:{fontSize:11,lineHeight:16,fontWeight:'700',color:C.muted},
 tileTier:{fontSize:12,lineHeight:18,fontWeight:'900',color:C.accent},
 facility:{flexDirection:'row',alignItems:'flex-start',gap:9,padding:10,borderWidth:1,borderRadius:10,borderColor:C.line,backgroundColor:C.panelRaised},
 facilityImage:{width:46,height:46},
 trophy:{borderTopWidth:1,borderTopColor:C.line,paddingTop:9,gap:4},
 });}

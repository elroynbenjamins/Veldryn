import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,AppState,Image,ImageBackground,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import type {GameState} from '../core/types';
import {WINTER_HEARTH_DONATION_IDS,winterHearthDonationTrack,winterHearthUnlockedStock,winterHearthMaxDonation,winterHearthQuickDonation,winterHearthValidQuantity,type WinterHearthTrack} from '../core/winter-hearth-donations';
import {readPendingWinterHearthDonation,submitWinterHearthDonation,type PendingWinterHearthDonation} from '../online/winter-hearth-pending-donation';
import {localizedItemName} from '../i18n/starter-item-names';
import {BoardTabs} from './BoardTabs';
import {guildBackgroundSources} from '../theme/card-background-assets';
import {GuildBannerArtwork,GuildFrameSwatch} from './GuildHeraldry';
import {GameThemeScope,useGameTheme} from '../theme/ThemeContext';
import {eventTheme} from '../theme/event-palette';
import {winterHearthMarketSource,warmNextWinterHearthMarket} from '../theme/winter-hearth-market-assets';
import {winterHearthStageFromProgress} from '../core/winter-hearth-2026';
import {FROSTFALL_EVENT} from '../content/annual-events-v2';
import {getWinterHearthGuildSnapshot,type WinterHearthGuildSnapshot,type WinterHearthDonationReceipt} from '../online/winter-hearth-guild';
import {useGameplayText} from '../i18n/gameplay';
import {useGameLanguage} from '../i18n/GameLanguageProvider';

type Page='Market'|'Rewards';
const stages=[
 {percent:25,gold:10000,name:'Market foundations',buff:'+4% Gathering Speed',cosmetics:[]},
 {percent:50,gold:20000,name:'Festive stalls',buff:'+6% Skill XP',cosmetics:["Winter's Aurora · Background"]},
 {percent:75,gold:30000,name:'Festival of Lights',buff:'+6% Combat XP',cosmetics:['Frostfall Standard · Banner']},
 {percent:100,gold:50000,name:'Grand Winter Market',buff:'All three bonuses +10%',cosmetics:['Frozen Majesty · Border','Frostfall Aurora · Name Color']},
] as const;
const cosmeticPreviews=[
 {percent:50,name:"Winter's Aurora · Background",kind:'background'},
 {percent:75,name:'Frostfall Standard · Banner',kind:'banner'},
 {percent:100,name:'Frozen Majesty · Border',kind:'border'},
 {percent:100,name:'Frostfall Aurora · Name Color',kind:'color'},
] as const;
const stageTitle=(p:number)=>stages.find(row=>row.percent===p)?.name??'Snow-covered grounds';
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
type Props={onClose:()=>void;onOpenCrafting?:(skill:'smithing'|'tailoring')=>void;scope:string;endsAtMs:number;state:GameState;accountId:string;guildId:string;gameplayBusy:boolean;onRefreshInventory:()=>Promise<void>};

/** Seasonal scope only: never changes account theme or Guild Home. */
export function WinterHearthGuildScreen(props:Props){
 const base=useGameTheme(),colors=useMemo(()=>eventTheme(base,FROSTFALL_EVENT),[base]);
 return <GameThemeScope colors={colors}><WinterHearthContent {...props}/></GameThemeScope>;
}
function WinterHearthContent({onClose,onOpenCrafting,scope,endsAtMs,state,accountId,guildId,gameplayBusy,onRefreshInventory}:Props){
 const C=useGameTheme(),{gl}=useGameplayText(),language=useGameLanguage();
 const [page,setPage]=useState<Page>('Market'),[snapshot,setSnapshot]=useState<WinterHearthGuildSnapshot|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[craftOpen,setCraftOpen]=useState(false),[expanded,setExpanded]=useState<number|null>(null);
 const [pending,setPending]=useState<PendingWinterHearthDonation|null>(null),[pendingReady,setPendingReady]=useState(false),[busy,setBusy]=useState(false),[donationTrack,setDonationTrack]=useState<WinterHearthTrack|null>(null),[selected,setSelected]=useState(''),[quantity,setQuantity]=useState('1'),[feedback,setFeedback]=useState(''),[confirmedReceipt,setConfirmedReceipt]=useState<WinterHearthDonationReceipt|null>(null),[inventoryStale,setInventoryStale]=useState(false);
 const writeLock=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false};},[]);
 useEffect(()=>{let alive=true;setPendingReady(false);void readPendingWinterHearthDonation(accountId).then(row=>{if(alive){setPending(row);setPendingReady(true)}}).catch(()=>{if(alive)setFeedback('Saved donation could not be read. Donations are paused.');});return()=>{alive=false};},[accountId]);
 const generation=useRef(0),[now,setNow]=useState(Date.now());
 useEffect(()=>{const tick=()=>{if(AppState.currentState==='active')setNow(Date.now())};const id=setInterval(tick,30_000);const sub=AppState.addEventListener('change',tick);return()=>{clearInterval(id);sub.remove()};},[]);
 const remainingHours=Math.max(0,Math.ceil((endsAtMs-now)/3600000));
 const remainingLabel=remainingHours>=24?Math.floor(remainingHours/24)+'d '+remainingHours%24+'h':remainingHours+'h';
 const reload=useCallback(async()=>{
  const key=++generation.current;setLoading(true);setError('');
  try{const next=await getWinterHearthGuildSnapshot();if(generation.current===key)setSnapshot(next);}
  catch{if(generation.current===key)setError('Unable to refresh guild event progress.');}
  finally{if(generation.current===key)setLoading(false);}
 },[]);
 useEffect(()=>{setSnapshot(null);void reload();const sub=AppState.addEventListener('change',status=>{if(status==='active')void reload()});return()=>{generation.current++;sub.remove();};},[reload,scope]);
 const fmt=(n:number)=>n.toLocaleString(language);
 const logs=snapshot?.logs??0,lights=snapshot?.lights??0;
 const stage=snapshot?.milestonePercent??0;
 const sceneStage=winterHearthStageFromProgress(logs,lights);
 useEffect(()=>{if(!snapshot?.enabled)return;const timer=setTimeout(()=>warmNextWinterHearthMarket(sceneStage),250);return()=>clearTimeout(timer);},[sceneStage,snapshot?.enabled]);
 const progress=clamp(Math.floor(Math.min(logs/25000,lights/2500)*100));
 const weekKey=new Date(now-(new Date(now).getUTCDay()+6)%7*86400000).toISOString().slice(0,10);
 const previousWeek=useRef(weekKey);
 useEffect(()=>{if(previousWeek.current!==weekKey){previousWeek.current=weekKey;void reload();}},[weekKey,reload]);
 const next=stages.find(row=>row.percent>stage);
 const available=(id:string)=>winterHearthUnlockedStock(state,id);
 const maxFor=(id:string)=>{const track=winterHearthDonationTrack(id);return track?winterHearthMaxDonation(available(id),track==='logs'?(snapshot?.memberLogsRemaining??0):(snapshot?.memberLightsRemaining??0),track==='logs'?25000-logs:2500-lights):0;};
 const disabled=loading||!!error||busy||gameplayBusy||!pendingReady||!!pending||inventoryStale||!snapshot?.active||!snapshot.weekStartUtc||now>=endsAtMs||!state.character;
 const max=maxFor(selected),amount=Number(quantity),valid=winterHearthValidQuantity(quantity,max);
 const itemName=(id:string)=>localizedItemName(language,id);
 const openDonation=(track:WinterHearthTrack)=>{if(disabled)return;const first=WINTER_HEARTH_DONATION_IDS.find(id=>winterHearthDonationTrack(id)===track&&maxFor(id)>0)??'';setSelected(first);setQuantity('1');setDonationTrack(track);setFeedback('');setConfirmedReceipt(null);};
 const refreshInventory=async()=>{try{await onRefreshInventory();if(mounted.current)setInventoryStale(false);}catch{if(mounted.current){setInventoryStale(true);setFeedback('Inventory refresh unavailable. Refresh before donating again.');}}};
 const send=async(retry?:PendingWinterHearthDonation)=>{
  if(writeLock.current||gameplayBusy||(!retry&&(disabled||!valid||!snapshot?.weekStartUtc||!state.character)))return;
  writeLock.current=true;setBusy(true);setFeedback('');setConfirmedReceipt(null);
  try{
   const context=retry??{accountId,guildId,characterId:state.character!.id,weekStartUtc:snapshot!.weekStartUtc!};
   const receipt=await submitWinterHearthDonation(context,retry?.itemId??selected,retry?.quantity??amount);
   if(mounted.current){setPending(null);setDonationTrack(null);setInventoryStale(true);setConfirmedReceipt(receipt);}
   await Promise.all([refreshInventory(),reload()]);
  }catch(reason){
   if(mounted.current){setFeedback(reason instanceof Error?reason.message:'Donation confirmation unavailable.');try{const saved=await readPendingWinterHearthDonation(accountId);if(mounted.current){setPending(saved);setPendingReady(true);}}catch{if(mounted.current)setPendingReady(false);}setDonationTrack(null);setInventoryStale(true);}
   await Promise.all([refreshInventory(),reload()]);
  }finally{writeLock.current=false;if(mounted.current)setBusy(false);}
 };
 const titleStyle={color:C.text,fontWeight:'800' as const,fontSize:15};
 const smallStyle={color:C.muted,fontSize:12,lineHeight:17};
 const renderTrack=(label:string,n:number,total:number,fill:string)=> <View style={s.trackWrap}><View style={s.row}><Text style={titleStyle}>{gl(label)}</Text><Text style={[smallStyle,{color:C.text,fontVariant:['tabular-nums']}]}>{fmt(n)} / {fmt(total)}</Text></View><View accessibilityRole="progressbar" accessibilityLabel={gl(label)} accessibilityValue={{min:0,max:total,now:n}} style={[s.track,{backgroundColor:C.panel2,borderColor:C.line}]}><View style={[s.fill,{width:`${clamp(n/total*100)}%`,backgroundColor:fill}]}/></View></View>;
 return <View style={[s.screen,{backgroundColor:C.bg}]}>
  <View style={[s.header,{borderBottomColor:C.line,backgroundColor:C.panel}]}><GameButton compact tone="secondary" title={gl('← Guild Home')} onPress={onClose}/><Text style={[s.headerText,{color:C.accent}]}>{gl('Frostfall 2026')}</Text></View>
  <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
   <ImageBackground source={winterHearthMarketSource(sceneStage)} fadeDuration={0} resizeMode="cover" style={s.hero} imageStyle={s.heroImage}><View style={s.shade}/><View style={s.heroText}><Text style={s.kicker}>{gl('GUILD CHRISTMAS MARKET')}</Text><Text style={s.heroTitle}>{gl('Winter Hearth')}</Text><Text style={s.heroCopy}>{gl('Build a winter market together.')}</Text><Text style={s.heroCopy}>{snapshot?.active&&remainingHours>0?remainingLabel+' · '+gl('remaining'):snapshot?.enabled&&!snapshot.active?gl('Donations closed'):gl('December 3–26')}</Text></View></ImageBackground>
    {confirmedReceipt?<Panel accentColor={C.good}><Text accessibilityRole="header" style={[titleStyle,{color:C.good}]}>{gl(confirmedReceipt.alreadyProcessed?'Saved donation confirmed.':'Donation confirmed')}</Text><Text style={smallStyle}>{fmt(confirmedReceipt.quantity)} · {itemName(confirmedReceipt.itemId)}</Text>{confirmedReceipt.newMilestones.length>0?<Text style={titleStyle}>{gl('Market milestones')} · {confirmedReceipt.newMilestones.map(p=>p+'%').join(' · ')}</Text>:null}{confirmedReceipt.newGuildGold>0?<Text style={smallStyle}>{fmt(confirmedReceipt.newGuildGold)} {gl('Guild Gold')}</Text>:null}{confirmedReceipt.alreadyProcessed?<Text style={smallStyle}>{gl('The original donation was confirmed. No additional resources were spent.')}</Text>:null}</Panel>:null}
    {feedback?<Panel accentColor={C.lineStrong}><Text accessibilityRole="alert" style={smallStyle}>{gl(feedback)}</Text></Panel>:null}
    {pending?<Panel accentColor={C.warning}><Text style={titleStyle}>{gl('Saved donation')}</Text><Text style={smallStyle}>{fmt(pending.quantity)} · {itemName(pending.itemId)}</Text><Text style={smallStyle}>{gl('Retry the original request before making a new donation. It will not be charged twice.')}</Text><GameButton title={gl('Retry saved donation')} disabled={busy||gameplayBusy||!pendingReady} loading={busy} onPress={()=>send(pending)}/></Panel>:null}
    {inventoryStale?<GameButton compact tone="secondary" title={gl('Refresh inventory')} disabled={busy||gameplayBusy} onPress={refreshInventory}/>:null}
   {error?<Panel accentColor={C.warning}><Text accessibilityRole="alert" style={smallStyle}>{gl(error)}</Text><GameButton compact title={gl('Retry')} disabled={loading||busy} onPress={reload}/></Panel>:null}
   {loading&&!snapshot?<Panel><ActivityIndicator color={C.accent}/><Text style={smallStyle}>{gl('Loading guild progress…')}</Text></Panel>:!snapshot?.inGuild||!snapshot.enabled?<Panel><Text style={titleStyle}>{gl('Winter Hearth is not available.')}</Text><GameButton tone="secondary" compact title={gl('Refresh')} onPress={reload}/></Panel>:<>
    {loading?<View style={s.row}><ActivityIndicator size="small" color={C.accent}/><Text style={smallStyle}>{gl('Loading guild progress…')}</Text></View>:null}
    <BoardTabs compact label={gl('Guild event sections')} items={[{id:'Market',label:gl('Market')},{id:'Rewards',label:gl('Rewards')}] as const} value={page} onChange={setPage}/>
    {page==='Market'?<>
     <Panel accentColor={C.lineStrong}><View style={s.row}><View style={s.flex}><Text style={smallStyle}>{gl('Market construction')}</Text><Text style={[titleStyle,{fontSize:19}]}>{gl(stageTitle(stage))}</Text></View><Text style={{fontSize:27,fontWeight:'900',color:C.accent,fontVariant:['tabular-nums']}}>{progress}%</Text></View>
     <View style={s.stageRow}>{[0,25,50,75,100].map(p=><View key={p} style={s.stageCell}><View style={[s.stageDot,{backgroundColor:p<=stage?C.accent:C.panel2,borderColor:p<=stage?C.accent:C.lineStrong}]}/><Text style={{fontSize:10,fontWeight:'700',color:p<=stage?C.accent:C.muted}}>{p}%</Text></View>)}</View>
     {renderTrack('Logs',logs,25000,C.accent)}{renderTrack('Christmas Lights',lights,2500,C.warning)}
     <Text style={smallStyle}>{next?gl('Both tracks must reach the next milestone.'):gl('Your guild completed the market!')}</Text>{next?<View style={[s.recipe,{borderColor:C.line,backgroundColor:C.panel2}]}><Text style={titleStyle}>{gl('Next milestone')} · {next.percent}%</Text><Text style={smallStyle}>{fmt(Math.max(0,next.percent*250-logs))} {gl('Logs')} · {fmt(Math.max(0,next.percent*25-lights))} {gl('Christmas Lights')} {gl('remaining')}</Text></View>:null}</Panel>
     <Panel><Text style={titleStyle}>{gl('Your weekly contributions')}</Text>{renderTrack('Logs',snapshot.memberLogsThisWeek??0,2500,C.accent)}{renderTrack('Christmas Lights',snapshot.memberLightsThisWeek??0,250,C.warning)}
      <Text style={smallStyle}>{gl('Donations are shared across characters and reset Monday at 00:00 UTC.')}</Text>
      <View style={s.donationRow}><GameButton style={s.flex} title={gl('Donate Logs')} disabled={disabled||!WINTER_HEARTH_DONATION_IDS.some(id=>winterHearthDonationTrack(id)==='logs'&&maxFor(id)>0)} onPress={()=>openDonation('logs')}/><GameButton style={s.flex} title={gl('Donate Lights')} disabled={disabled||!WINTER_HEARTH_DONATION_IDS.some(id=>winterHearthDonationTrack(id)==='lights'&&maxFor(id)>0)} onPress={()=>openDonation('lights')}/></View><Text style={smallStyle}>{gl(!snapshot.active||now>=endsAtMs?'The donation window is closed.':'Donate unlocked inventory materials. Donations are permanent.')}</Text>
      <GameButton compact tone="secondary" title={gl(craftOpen?'Hide light recipes':'How to craft lights')} onPress={()=>setCraftOpen(v=>!v)}/>
      {craftOpen&&(['smithing','tailoring'] as const).map(skill=><View key={skill} style={[s.recipe,{borderColor:C.line,backgroundColor:C.panel2}]}><Text style={titleStyle}>{gl(skill==='smithing'?'Smithing · Level 4':'Tailoring · Level 4')}</Text><Text style={smallStyle}>{gl(skill==='smithing'?'8 Copper Ore':'8 Moss Fiber')} · {gl('4 Dewleaf')} · {gl('1 Wisp Dust')}</Text><Text style={{color:C.accent,fontSize:12,fontWeight:'700'}}>{gl('5 Christmas Lights · 35 base XP · 40s · 30 base Gold')}</Text>{onOpenCrafting&&snapshot.active&&now<endsAtMs?<GameButton compact tone="secondary" title={gl('Open crafting')} disabled={busy||gameplayBusy} onPress={()=>onOpenCrafting(skill)}/>:null}</View>)}
     </Panel>
     <Panel><Text style={titleStyle}>{gl('Active guild bonuses')}</Text><View style={s.buffs}>{[[snapshot.gatheringSpeedBps??0,'Gathering Speed'],[snapshot.skillXpBps??0,'Skill XP'],[snapshot.combatXpBps??0,'Combat XP']].map(([bps,label])=><View key={String(label)} style={[s.buff,{backgroundColor:C.panel2,borderColor:C.line}]}><Text style={{fontSize:18,fontWeight:'900',color:Number(bps)>0?C.good:C.muted}}>+{Number(bps)/100}%</Text><Text style={[smallStyle,{textAlign:'center',fontSize:11}]}>{gl(String(label))}</Text></View>)}</View><Text style={smallStyle}>{gl('Temporary bonuses expire December 27 at 00:00 UTC.')}</Text></Panel>
    </>:null}
    <Panel><Text style={titleStyle}>{gl('Market milestones')}</Text>{stages.map(row=><Pressable key={row.percent} accessibilityRole="button" accessibilityState={{expanded:expanded===row.percent}} onPress={()=>setExpanded(p=>p===row.percent?null:row.percent)} style={[s.milestone,{borderColor:stage>=row.percent?C.accent:next?.percent===row.percent?C.warning:C.line,backgroundColor:C.panel2}]}><View style={s.row}><Text style={{fontSize:15,fontWeight:'900',color:stage>=row.percent?C.accent:C.text}}>{row.percent}%</Text><View style={s.flex}><Text style={titleStyle}>{gl(row.name)}</Text><Text style={smallStyle}>{fmt(row.gold)} {gl('Guild Gold')} · {gl(row.buff)}</Text></View><Text style={{color:C.muted}}>{expanded===row.percent?'−':'+'}</Text></View>{expanded===row.percent?<View style={s.detail}><Text style={smallStyle}>{fmt(row.percent*250)} {gl('Logs')} · {fmt(row.percent*25)} {gl('Christmas Lights')}</Text>{row.cosmetics.map(name=><Text key={name} style={{color:C.accent,fontSize:12,fontWeight:'700'}}>{gl(name)}</Text>)}<Text style={smallStyle}>{gl(stage>=row.percent?'Milestone reached':'Not yet reached')}</Text></View>:null}</Pressable>)}</Panel>
    <Panel><Text style={titleStyle}>{gl('Permanent guild cosmetics')}</Text><Text style={smallStyle}>{gl('Exclusive guild-owned rewards. Equip earned rewards in Guild Appearance.')}</Text>{cosmeticPreviews.map(row=><View key={row.kind} style={[s.reward,{borderColor:C.line}]}><View style={[s.rewardArt,{backgroundColor:C.panel2,borderColor:C.line}]}>{row.kind==='background'?<Image accessible={false} source={guildBackgroundSources.get('background_frostfall_winter_aurora_2026')?.wide} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill}/>:row.kind==='banner'?<GuildBannerArtwork height={48} bannerId="banner_frostfall_standard_2026"/>:row.kind==='border'?<GuildFrameSwatch frameId="border_frostfall_frozen_majesty_2026" size={54}/>:<Text style={{fontSize:22,fontWeight:'900',color:'#9fe9dc'}}>Aa</Text>}</View><View style={s.flex}><Text style={[titleStyle,{fontSize:13}]}>{gl(row.name)}</Text><Text style={smallStyle}>{gl(stage>=row.percent?'Milestone reached':'Milestone required')} · {row.percent}%</Text></View></View>)}</Panel>
    <GameButton compact tone="secondary" title={gl('Refresh progress')} disabled={loading||busy} loading={loading} onPress={reload}/>
   </>}
  </ScrollView>
  <GameModalSurface visible={donationTrack!==null} onClose={()=>{if(!busy)setDonationTrack(null)}} dismissOnBackdrop={!busy} reduceMotion={state.settings.reduceMotion}>
   <GameModalHeader eyebrow={gl('WINTER HEARTH')} title={gl(donationTrack==='logs'?'Donate Logs':'Donate Christmas Lights')} onClose={()=>{if(!busy)setDonationTrack(null)}} closeDisabled={busy}/>
   <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:9,paddingBottom:6}}>
    <Text style={smallStyle}>{gl('Choose an unlocked resource in your inventory.')}</Text>
    {WINTER_HEARTH_DONATION_IDS.filter(id=>winterHearthDonationTrack(id)===donationTrack).map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:id===selected,disabled:maxFor(id)===0||busy}} disabled={maxFor(id)===0||busy} onPress={()=>{setSelected(id);setQuantity('1')}} style={[s.recipe,{backgroundColor:id===selected?C.selection:C.panel2,borderColor:id===selected?C.accent:C.line,opacity:maxFor(id)===0?.5:1}]}><View style={s.row}><Text style={[titleStyle,{flex:1}]}>{itemName(id)}</Text><Text style={smallStyle}>{fmt(available(id))} {gl('available')}</Text></View></Pressable>)}
    <View style={s.row}><Text style={titleStyle}>{gl('Quantity')}</Text><Text style={smallStyle}>{gl('Maximum')}: {fmt(max)}</Text></View>
    <TextInput accessibilityLabel={gl('Donation quantity')} keyboardType="number-pad" maxLength={4} selectTextOnFocus editable={!busy&&max>0} value={quantity} onChangeText={value=>setQuantity(value.replace(/[^0-9]/g,'').slice(0,4))} style={[s.input,{color:C.text,borderColor:C.lineStrong,backgroundColor:C.panel}]}/>
    <View style={s.donationRow}>{[donationTrack==='logs'?250:50,'Half','Max'].map(p=><GameButton key={String(p)} style={s.flex} compact tone="secondary" title={gl(String(p))} disabled={busy||max<1} onPress={()=>setQuantity(String(winterHearthQuickDonation(donationTrack??'logs',p==='Max'?'Max':p==='Half'?'Half':'preset',max)))}/>)}</View>
    <Text style={smallStyle}>{gl('The server checks your inventory, guild goal and weekly allowance. Donated items cannot be withdrawn.')}</Text>
    <GameButton title={gl('Confirm donation')} disabled={disabled||!valid} loading={busy} onPress={()=>send()}/>
   </ScrollView>
  </GameModalSurface>
 </View>;
}
const s=StyleSheet.create({screen:{flex:1,minHeight:0},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:12,paddingVertical:8,borderBottomWidth:1,gap:8},headerText:{fontSize:13,fontWeight:'800',flexShrink:1},content:{padding:12,gap:10,paddingBottom:30},hero:{minHeight:175,aspectRatio:16/9,backgroundColor:'#101d32',borderRadius:10,overflow:'hidden',justifyContent:'flex-end'},heroImage:{opacity:.9},shade:{...StyleSheet.absoluteFill,backgroundColor:'rgba(8,23,43,.23)'},heroText:{padding:12,gap:3},kicker:{color:'#b9e9fa',fontSize:10,fontWeight:'800',letterSpacing:1.3},heroTitle:{fontSize:27,fontWeight:'900',color:'#f4fbff'},heroCopy:{fontSize:12,color:'#e2effa'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9,flexWrap:'wrap'},flex:{flex:1,minWidth:0},input:{borderWidth:1,borderRadius:6,padding:10,fontSize:17,textAlign:'center'},donationRow:{flexDirection:'row',gap:7,flexWrap:'wrap'},trackWrap:{gap:5},track:{height:10,borderWidth:1,borderRadius:3,overflow:'hidden'},fill:{height:'100%'},stageRow:{flexDirection:'row',justifyContent:'space-between',gap:3,marginVertical:4},stageCell:{flex:1,alignItems:'center',gap:4},stageDot:{width:11,height:11,borderWidth:1,borderRadius:3},buffs:{flexDirection:'row',gap:5},buff:{flex:1,minWidth:0,borderWidth:1,borderRadius:6,padding:7,alignItems:'center',gap:4},recipe:{borderWidth:1,borderRadius:6,padding:8,gap:5},milestone:{borderWidth:1,borderRadius:6,padding:9,gap:6},detail:{paddingTop:5,gap:4},rewardArt:{width:68,height:56,overflow:'hidden',borderWidth:1,borderRadius:5,alignItems:'center',justifyContent:'center'},reward:{flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:1,paddingTop:8}});

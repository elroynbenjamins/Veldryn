import {useEffect,useMemo,useState} from 'react';
import {guildBankResourceName,guildBankResourceShortName,useGuildBankUiText} from '../i18n/guild-bank-ui';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {Keyboard,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ResourceArtwork} from './ResourceArtwork';
import {GoldIcon} from './GoldIcon';
import {guildUpgradeComponentName} from '../theme/guild-upgrade-component-art';
import {gameAlert} from '../core/game-alerts';
import {useGameTheme} from '../theme/ThemeContext';
import type {GameState} from '../core/types';
import {radii,type ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {loadOnlineGuildSkills,type GuildSkillsSnapshot} from '../online/guild-skills';
import {depositOnlineGuildBank,pendingGuildBankDeposit,discardPendingGuildBankDeposit,type PendingGuildBankDeposit} from '../online/guild-bank';

type Need={current:number;upcoming:number;skills:number};
type BankSection='inventory'|'needed'|'activity';
function projectNeeds(snapshot:GuildTokenShopSnapshot,skillSnapshot:GuildSkillsSnapshot|null){
 const needed=new Map<string,Need>();
 for(const template of snapshot.constructionTemplates){
  if(!template.enabled)continue; // Future content is not donatable until released.
  const progress=snapshot.construction.find(row=>row.templateId===template.id);
  if(progress?.completed)continue;
  const upcoming=template.guildLevel>snapshot.guildLevel;
  const requirements=[...(template.gold>0?[{resourceId:'gold',amount:template.gold}]:[]),
    ...template.materials.map(material=>({resourceId:material.materialKey,amount:material.amount}))];
  for(const req of requirements){
   const remainder=Math.max(0,req.amount-Math.max(0,progress?.resources[req.resourceId]??0));
   if(!remainder)continue;
   const before=needed.get(req.resourceId)??{current:0,upcoming:0,skills:0};
   needed.set(req.resourceId,{...before,[upcoming?'upcoming':'current']:before[upcoming?'upcoming':'current']+remainder});
  }
 }
 // Released Guild Skills' next-rank costs may be banked before points are earned.
 if(skillSnapshot&&skillSnapshot.guildLevel===snapshot.guildLevel){
  for(const node of skillSnapshot.nodes){
   if(!node.released||node.rank>=node.maxRank)continue;
   for(const cost of node.costs){
    if(cost.rank!==node.rank+1||cost.amount<=0)continue;
    const before=needed.get(cost.resourceId)??{current:0,upcoming:0,skills:0};
    needed.set(cost.resourceId,{...before,skills:before.skills+cost.amount});
   }
  }
 }
 return needed;
}
export function OnlineGuildBankPanel({snapshot,playerState,onReload,focusResourceId,onFocusHandled,onOpenConstruction}:{
 snapshot:GuildTokenShopSnapshot;playerState?:GameState;onReload:()=>Promise<unknown>;
 focusResourceId?:string|null;onFocusHandled?:()=>void;onOpenConstruction?:()=>void;
}){
 const ui=useGuildBankUiText(),language=useGameLanguage(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{height:windowHeight,width:windowWidth,fontScale}=useWindowDimensions();
  const resourceTitle=(id:string)=>{
   const english=id==='gold'?'Gold':guildUpgradeComponentName(id)??id.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
   return guildBankResourceName(language,id,english);
  };
 // Preserve readable touch targets when accessibility fonts are significantly enlarged.
 const accessibleGrid=windowWidth<430||fontScale>=1.25;
 const roomyGrid=windowWidth<350||fontScale>=1.55;
 const [selection,setSelection]=useState<string|null>(null),[quantity,setQuantity]=useState('1');
 const [view,setView]=useState<BankSection>('inventory'),[search,setSearch]=useState('');
 const [pending,setPending]=useState<PendingGuildBankDeposit|null>(null);
 const [confirming,setConfirming]=useState(false);
 const [skillSnapshot,setSkillSnapshot]=useState<GuildSkillsSnapshot|null>(null);
 const [skillLoading,setSkillLoading]=useState(true),[skillError,setSkillError]=useState(false);
 const [skillRefresh,setSkillRefresh]=useState(0);
 // The server owns the balance; local deductions keep the displayed stock
 // accurate until the next authoritative game-state refresh arrives.
 const [localDeductions,setLocalDeductions]=useState<Record<string,number>>({});
 useEffect(()=>{setLocalDeductions({})},[playerState?.inventory.stacks,playerState?.character?.gold]);
 useEffect(()=>{
  let active=true;setSkillLoading(true);setSkillError(false);
  void loadOnlineGuildSkills().then(value=>{
   if(active){setSkillSnapshot(value);setSkillError(!value);}
  }).catch(()=>{if(active){setSkillSnapshot(null);setSkillError(true)}})
   .finally(()=>{if(active)setSkillLoading(false)});
  return()=>{active=false};
 },[snapshot.guildLevel,skillRefresh]);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;void pendingGuildBankDeposit().then(value=>{if(active)setPending(value)}).catch(reason=>{if(active)setError(String(reason))});return()=>{active=false}},[]);
 const needs=useMemo(()=>projectNeeds(snapshot,skillSnapshot),[snapshot,skillSnapshot]);
 const stored=new Map((snapshot.bank?.balances??[]).map(row=>[row.resourceId,row.amount]));
 const balance=(id:string)=>stored.get(id)??0;
 // Published upcoming Construction may be pre-funded, just like released Skill ranks.
 const depositCapacity=(id:string)=>Math.max(0,(needs.get(id)?.current??0)+(needs.get(id)?.upcoming??0)+(needs.get(id)?.skills??0)-balance(id));
 const lockedIds=new Set((playerState as unknown as {settings?:{lockedItemIds?:string[]}}|undefined)?.settings?.lockedItemIds??[]);
 const ownedQuantity=(id:string)=>id==='gold'?Math.max(0,Math.floor(playerState?.character?.gold??0)):
  (playerState?.inventory.stacks??[]).filter(row=>row.itemId===id).reduce((sum,row)=>sum+Math.max(0,Math.floor(row.quantity)),0);
 const unlockedQuantity=(id:string):number|null=>{
  if(!playerState)return null;
  if(id==='gold')return ownedQuantity(id);
  if(lockedIds.has(id))return 0;
  return playerState.inventory.stacks.filter(row=>row.itemId===id&&!(row as typeof row&{locked?:boolean}).locked)
   .reduce((sum,row)=>sum+Math.max(0,Math.floor(row.quantity)),0);
 };
 const availableQuantity=(id:string)=>{const stock=unlockedQuantity(id);return stock===null?null:Math.max(0,stock-(localDeductions[id]??0));};
 const maxDeposit=(id:string)=>Math.max(0,Math.min(1000000,depositCapacity(id),availableQuantity(id)??1000000));
 // The Construction shortcut focuses this material once. Clearing the focus
 // prevents the sheet from reopening after a successful deposit or dismissal.
 useEffect(()=>{
  if(!focusResourceId)return;
  const capacity=maxDeposit(focusResourceId);
  if(capacity>0&&!pending&&!busy&&snapshot.bank!==null){
   setView('inventory');setSearch('');setSelection(focusResourceId);setQuantity(String(Math.min(10,capacity,1000000)));
  }
  onFocusHandled?.();
 // The focus is a one-shot navigation instruction, not a subscription to balances.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[focusResourceId]);
 const ids=[...new Set([...needs.keys(),...stored.keys()])].sort((a,b)=>{
  const aNow=(needs.get(a)?.current??0)+(needs.get(a)?.skills??0)>0?0:1,bNow=(needs.get(b)?.current??0)+(needs.get(b)?.skills??0)>0?0:1;
  return aNow-bNow||Number(b==='gold')-Number(a==='gold')||a.localeCompare(b);
 });
 const visibleIds=ids.filter(id=>[resourceTitle(id),guildUpgradeComponentName(id)??''].some(name=>name.toLocaleLowerCase(language).includes(search.trim().toLocaleLowerCase(language))));
 const shortageNow=(id:string)=>Math.max(0,(needs.get(id)?.current??0)+(needs.get(id)?.skills??0)-balance(id));
 const shortageUpcoming=(id:string)=>Math.max(0,(needs.get(id)?.upcoming??0)-Math.max(0,balance(id)-(needs.get(id)?.current??0)-(needs.get(id)?.skills??0)));
 const currentIds=ids.filter(id=>(needs.get(id)?.current??0)+(needs.get(id)?.skills??0)>0);
 const upcomingIds=ids.filter(id=>(needs.get(id)?.upcoming??0)>0);
 const remainingTotal=ids.reduce((sum,id)=>sum+depositCapacity(id),0);
 const storedTypes=ids.filter(id=>balance(id)>0).length;
 const shortName=(id:string)=>guildBankResourceShortName(language,id,resourceTitle(id));
 const status=(id:string)=>shortageNow(id)>0?'Needed now':shortageUpcoming(id)>0?'Upcoming':'Covered';
 const compactQuantity=(value:number)=>value>=10000?(Math.round(value/100)/10).toLocaleString(language)+'k':value.toLocaleString(language);
 const activityTime=(iso:string)=>{
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime()))return ui('Recent');
  return date.toLocaleDateString(language,{month:'short',day:'numeric'})+' · '+date.toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'});
 };
 const selected=selection&&ids.includes(selection)?selection:null;
 const amount=Number(quantity);
 const valid=!!selected&&Number.isSafeInteger(amount)&&amount>=1&&amount<=maxDeposit(selected);
 const close=()=>{if(!busy){Keyboard.dismiss();setConfirming(false);setSelection(null);setQuantity('1');}};
 const deposit=async(input:{resourceId:string;amount:number})=>{
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const response=await depositOnlineGuildBank(input);
   setPending(null);setConfirming(false);setSelection(null);
   // A confirmed retry may report alreadyProcessed even when the original request
   // timed out, so update displayed local stock for either confirmed receipt.
   setLocalDeductions(previous=>({...previous,[input.resourceId]:(previous[input.resourceId]??0)+input.amount}));
   setNotice(response.alreadyProcessed?ui('Saved deposit confirmed. No additional resources were deducted.'):
    ui('{amount} {resource} deposited into the Guild Bank.',{amount:input.amount.toLocaleString(language),resource:resourceTitle(input.resourceId)}));
   try{await onReload();setSkillRefresh(x=>x+1)}catch{setNotice(ui('Deposit confirmed. Bank refresh is unavailable; reopen the Bank to update balances.'));}
  }catch(reason){
   setConfirming(false);setSelection(null);
   setError(reason instanceof Error?reason.message:ui('Unable to confirm Guild Bank deposit.'));
   try{setPending(await pendingGuildBankDeposit())}catch{/* Keep original error. */}
  }finally{setBusy(false)}
 };
 const confirmDeposit=()=>{
  if(!selected||!valid||pending||busy||snapshot.bank===null)return;
  Keyboard.dismiss();setConfirming(true);
 };
 const discard=()=>gameAlert.alert(ui('Discard saved deposit?'),
  ui('Only discard after checking the Guild Bank. If the original request was completed, donating again spends resources again.'),
  [{text:ui('Keep receipt'),style:'cancel'},{text:ui('Discard local retry'),style:'destructive',
   onPress:()=>void discardPendingGuildBankDeposit().then(()=>setPending(null)).catch(reason=>setError(String(reason)))}]);
 const choose=(id:string)=>{
  if(busy||pending||snapshot.bank===null)return;
  setConfirming(false);setSelection(id);setQuantity(String(Math.max(1,Math.min(10,maxDeposit(id)))));
 };
 const depositDisabled=busy||!!pending||snapshot.bank===null;
 const inventoryCard=(id:string)=>{
  const onHand=balance(id),remaining=depositCapacity(id),state=status(id),stock=availableQuantity(id);
  return <Pressable key={id} accessibilityRole="button"
   accessibilityLabel={ui('{resource}, {stored} in Guild Bank. {more} more can be donated.',{resource:resourceTitle(id),stored:onHand.toLocaleString(language),more:remaining.toLocaleString(language)})}
   accessibilityHint={ui("Opens material details and donation options")}
   disabled={depositDisabled} onPress={()=>choose(id)}
   style={({pressed})=>[s.bankSlot,accessibleGrid&&s.accessibleSlot,roomyGrid&&s.roomySlot,state==='Covered'&&s.fundedSlot,
    state==='Needed now'?s.nowSlot:state==='Upcoming'?s.futureSlot:null,pressed&&s.pressed]}>
   <View style={[s.statusDot,state==='Needed now'?s.nowDot:state==='Upcoming'?s.futureDot:s.fundedDot]}/>
   <View style={s.artFrame}>
    {id==='gold'?<GoldIcon size={39}/>:<ResourceArtwork itemId={id} size={39} framed={false}/>}
    <View style={s.stackCount}><Text numberOfLines={1} style={s.stackText}>{compactQuantity(onHand)}</Text></View>
   </View>
   <Text numberOfLines={2} style={s.slotName}>{shortName(id)}</Text>
   {stock!==null?<Text numberOfLines={1} style={s.slotOwned}>{ui('Owned: {count}',{count:compactQuantity(ownedQuantity(id))})}</Text>:null}
   <Text numberOfLines={1} style={[s.slotNeed,state==='Needed now'?s.nowText:state==='Upcoming'?s.futureText:null]}>
    {remaining>0?ui('+{count} needed',{count:compactQuantity(remaining)}):state==='Upcoming'
      ?ui('{count} needed later',{count:compactQuantity(shortageUpcoming(id))}):ui('✓ Covered')}
   </Text>
  </Pressable>;
 };
 const neededRow=(id:string,upcoming:boolean)=>{
  const shortage=upcoming?shortageUpcoming(id):shortageNow(id);
  return <View key={(upcoming?'later-':'now-')+id} style={s.neededRow}>
   <View style={s.neededArt}>{id==='gold'?<GoldIcon size={34}/>:<ResourceArtwork itemId={id} size={34} framed={false}/>}</View>
   <View style={s.flex}><Text numberOfLines={2} style={s.name}>{resourceTitle(id)}</Text>
    <Text style={s.meta}>{ui('{stored} stored · {more} more to deposit',{stored:balance(id).toLocaleString(language),more:shortage.toLocaleString(language)})}{!upcoming&&(needs.get(id)?.skills??0)>0?' · '+ui('Guild Skills'):''}</Text>
    {playerState?<Text style={s.meta}>{ui('You own {count} · {available} available',{count:ownedQuantity(id).toLocaleString(language),available:(availableQuantity(id)??0).toLocaleString(language)})}</Text>:null}
   </View>
   {shortage>0?<GameButton compact tone="secondary" title={ui("Donate")} disabled={depositDisabled} onPress={()=>choose(id)}/>:
    <Text style={[s.meta,s.nowText]}>{ui('In bank')}</Text>}
  </View>;
 };
 const canDonateSelected=!!selected&&!depositDisabled&&maxDeposit(selected)>0;
 const maxAmount=selected?maxDeposit(selected):0;
 return <Panel>
  <View style={s.headingRow}>
   <View style={s.flex}><Text style={s.kicker}>{ui('SHARED STORAGE')}</Text>
    <Text accessibilityRole="header" style={s.heading}>{ui("Guild Bank")}</Text>
    <Text style={s.meta}>{ui('Deposit only · Construction & Guild Skills')}</Text>
   </View>
   <View style={s.vaultMark}><Text style={s.vaultGlyph}>▣</Text></View>
  </View>
  <View style={[s.stats,roomyGrid&&s.statsWrap]}>
   <View style={[s.stat,roomyGrid&&s.wideStat]}><Text style={s.statLabel}>{ui('STORED MATERIALS')}</Text><Text style={s.statValue}>{snapshot.bank?storedTypes:'—'}<Text style={s.statSuffix}>{' '+ui('types')}</Text></Text></View>
   {!roomyGrid?<View style={s.statDivider}/>:null}
   <View style={[s.stat,roomyGrid&&s.wideStat]}><Text style={s.statLabel}>{ui('STILL TO DEPOSIT')}</Text><Text style={s.statValue}>{snapshot.bank?remainingTotal.toLocaleString(language):'—'}<Text style={s.statSuffix}>{' '+ui('units')}</Text></Text></View>
  </View>
  <View style={s.fundingGuide}>
   <Text style={s.guideTitle}>{ui('How Guild funding works')}</Text>
   <Text style={s.help}>{ui('1. Deposit your resources here into shared Guild storage.')}</Text>
   <Text style={s.help}>{ui('2. Allocate Bank resources to Construction or Guild Skills. Deposits cannot be withdrawn.')}</Text>
   {view!=='needed'&&currentIds.length>0?<GameButton compact tone="secondary"
    title={ui('See {count} materials needed now',{count:currentIds.length})} onPress={()=>setView('needed')}/>:null}
  </View>
  {snapshot.bank===null?<Text accessibilityRole="alert" style={s.warning}>{ui('Bank balances are unavailable. Donations are paused until a refresh succeeds.')}</Text>:null}
  {skillLoading?<Text style={s.meta}>{ui('Checking released Guild Skill requirements…')}</Text>:null}
  {skillError?<View style={s.actions}>
   <Text accessibilityRole="alert" style={[s.warning,s.flex]}>{ui('Guild Skill requirements could not load. Construction deposits remain available.')}</Text>
   <GameButton compact tone="secondary" title={ui("Retry")} onPress={()=>setSkillRefresh(v=>v+1)}/>
  </View>:null}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>}
  {pending?<View style={s.pending}>
   <Text style={s.name}>{ui('Deposit needs confirmation')}</Text>
   <Text style={s.help}>{ui('{amount} {resource} · Retry the saved receipt. Do not create a second donation.',{amount:pending.amount.toLocaleString(language),resource:resourceTitle(pending.resourceId)})}</Text>
   <View style={s.actions}>
    <GameButton compact title={ui("Retry saved deposit")} disabled={busy} loading={busy} onPress={()=>deposit(pending)}/>
    <GameButton compact tone="secondary" title={ui("Discard local retry")} disabled={busy} onPress={discard}/>
   </View>
  </View>:null}
  <View style={s.tabs} accessibilityRole="tablist">
   {([{id:'inventory',label:'▦  '+ui('Inventory')},{id:'needed',label:'◎  '+ui('Needed')},{id:'activity',label:'◷  '+ui('Activity')}] as const).map(tab=><Pressable key={tab.id} accessibilityRole="tab"
    accessibilityState={{selected:view===tab.id}} onPress={()=>{setView(tab.id);setNotice('')}}
    style={({pressed})=>[s.tab,fontScale>=1.25&&s.accessibleTab,view===tab.id&&s.activeTab,pressed&&s.pressed]}>
    <Text numberOfLines={fontScale>=1.25?2:1} style={[s.tabText,view===tab.id&&s.activeTabText]}>{tab.label}</Text>
   </Pressable>)}
  </View>
  {view==='inventory'?<View style={s.section}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>{ui('Guild materials')}</Text><Text style={s.meta}>{ui('Tap to inspect')}</Text></View>
   <TextInput value={search} onChangeText={setSearch} placeholder={ui("Search materials")}
    placeholderTextColor={C.muted} accessibilityLabel={ui("Search Guild Bank materials")}
    autoCorrect={false} returnKeyType="search" style={s.search}/>
   <View style={s.bankGrid}>{visibleIds.map(inventoryCard)}</View>
   {!visibleIds.length?<View style={s.empty}><Text style={s.name}>{ui('No matching materials')}</Text>
    <Text style={s.help}>{ui('Try a different search. Only published upgrade materials are accepted.')}</Text></View>:null}
   <Text style={s.footerHelp}>{ui('Only materials required by published Construction or released Guild Skills can be deposited. Donations cannot be withdrawn.')}</Text>
   <GameButton compact tone="secondary" title={ui("View materials needed")} onPress={()=>{setView('needed');setNotice('')}}/>
  </View>:null}
  {view==='needed'?<View style={s.section}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>{ui('Guild supply requirements')}</Text><Text style={s.meta}>{ui('{count} needed now',{count:currentIds.length})}</Text></View>
   <GameButton compact tone="secondary" title={ui(skillLoading?'Refreshing Guild Skill needs…':'Refresh requirements')} disabled={skillLoading}
    onPress={()=>{setSkillRefresh(v=>v+1);void onReload()}}/>
   <Text style={s.groupLabel}>{ui('NEEDED NOW')}</Text>
   {currentIds.length?currentIds.map(id=>neededRow(id,false)):
    <Text style={s.help}>{ui('No current construction or released Guild Skill requirements need more materials.')}</Text>}
   <Text style={s.groupLabel}>{ui('UPCOMING')}</Text>
   {upcomingIds.length?upcomingIds.map(id=>neededRow(id,true)):
    <Text style={s.help}>{ui('No upcoming published material requirements.')}</Text>}
   <View style={s.constructionCard}>
    <Text style={s.sectionTitle}>{ui('Guild Construction')}</Text>
    <Text style={s.help}>{ui('Use stored resources to fund specific Hall, Forge, Library, Treasury, War Room or Lodge upgrades.')}</Text>
    {onOpenConstruction?<GameButton compact tone="secondary" title={ui("Open Construction")} onPress={onOpenConstruction}/>:null}
   </View>
  </View>:null}
  {view==='activity'?<View style={s.section}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>{ui('Recent guild activity')}</Text><Text style={s.meta}>{ui('Shared ledger')}</Text></View>
   {snapshot.bank?.activity.length?snapshot.bank.activity.slice(0,20).map((item,index)=><View key={item.createdAt+'-'+item.resourceId+'-'+index} style={s.activityRow}>
    <View style={s.neededArt}>{item.resourceId==='gold'?<GoldIcon size={30}/>:<ResourceArtwork itemId={item.resourceId} size={30} framed={false}/>}</View>
    <View style={s.flex}>
     <Text numberOfLines={2} style={s.name}>{ui(item.kind==='project_reward'?'Guild Project reward':item.kind==='deposit'?(item.mine?'You donated':'Member donated'):item.kind==='skill_upgrade'?'Spent on Guild Skill':'Allocated to construction')}</Text>
     <Text numberOfLines={2} style={s.meta}>{resourceTitle(item.resourceId)} · {activityTime(item.createdAt)}</Text>
    </View>
    <Text style={[s.activityAmount,{color:item.kind==='deposit'||item.kind==='project_reward'?C.good:C.info}]}>
     {item.kind==='deposit'||item.kind==='project_reward'?'+':'−'}{item.amount.toLocaleString(language)}
    </Text>
   </View>):<View style={s.empty}><Text style={s.name}>{ui('No recorded activity yet')}</Text>
    <Text style={s.help}>{ui('Deposits and project allocations will appear here after they are confirmed.')}</Text></View>}
  </View>:null}
  <GameModalSurface visible={!!selected} presentation="sheet" surfaceStyle={{maxHeight:windowHeight*.86}}
   dismissOnBackdrop={!busy} onClose={close}>
   <GameModalHeader eyebrow={ui(confirming?"CONFIRM DONATION":"GUILD BANK · DONATE")} title={confirming?ui("Donate to Guild Bank?"):selected?resourceTitle(selected):ui("Guild Bank")}
    closeDisabled={busy} onClose={close}/>
   {selected?(confirming?<View style={s.confirmBody}>
    <View style={s.modalSummary}>
     <View style={s.modalArt}>{selected==='gold'?<GoldIcon size={56}/>:<ResourceArtwork itemId={selected} size={56} framed={false}/>}</View>
     <View style={s.flex}><Text style={s.name}>{resourceTitle(selected)}</Text>
      <Text style={s.help}>{ui('{amount} from your inventory into the shared Guild Bank',{amount:amount.toLocaleString(language)})}</Text>
      <Text style={s.meta}>{ui('{count} currently stored',{count:balance(selected).toLocaleString(language)})}</Text>
     </View>
    </View>
    <View style={s.warningCard}><Text style={s.help}>{ui('This donation is permanent and cannot be withdrawn. Guild Construction or Guild Skills can spend it separately.')}</Text></View>
    <View style={s.actions}>
     <View style={s.flex}><GameButton tone="secondary" title={ui("Back")} disabled={busy} onPress={()=>setConfirming(false)}/></View>
     <View style={s.flex}><GameButton title={ui("Confirm donation")} disabled={!valid||depositDisabled} loading={busy}
      onPress={()=>void deposit({resourceId:selected,amount})}/></View>
    </View>
   </View>:<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
    showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalBody}>
    <View style={s.modalSummary}>
     <View style={s.modalArt}>{selected==='gold'?<GoldIcon size={56}/>:<ResourceArtwork itemId={selected} size={56} framed={false}/>}</View>
     <View style={s.flex}><Text style={s.name}>{resourceTitle(selected)}</Text>
      <Text style={s.help}>{ui('{count} stored in the shared Bank',{count:balance(selected).toLocaleString(language)})}</Text>
      <Text style={s.meta}>{ui('Only published Construction and released Skill materials can be deposited')}</Text>
     </View>
    </View>
    <View style={[s.modalStats,roomyGrid&&s.modalStatsWrap]}>
     <View style={[s.modalStat,roomyGrid&&s.modalStatWide]}><Text style={s.statLabel}>{ui('GUILD OWNS')}</Text><Text style={s.modalNumber}>{balance(selected).toLocaleString(language)}</Text></View>
     <View style={[s.modalStat,roomyGrid&&s.modalStatWide]}><Text style={s.statLabel}>{ui('YOU OWN')}</Text><Text style={s.modalNumber}>{playerState?ownedQuantity(selected).toLocaleString(language):'—'}</Text></View>
     <View style={[s.modalStat,roomyGrid&&s.modalStatWide]}><Text style={s.statLabel}>{ui('CAN DONATE')}</Text><Text style={s.modalNumber}>{maxAmount.toLocaleString(language)}</Text></View>
    </View>
    <Text style={s.name}>{ui('Donation amount')}</Text>
    <TextInput value={quantity} onChangeText={setQuantity} selectTextOnFocus keyboardType="number-pad"
     maxLength={7} accessibilityLabel={ui("Guild Bank donation amount")} style={s.input}
     editable={canDonateSelected}/>
    <View style={s.presetRow}>{[1,10,'Half' as const,'Max' as const].map(preset=><Pressable key={preset}
     accessibilityRole="button" accessibilityLabel={ui('Donate quantity {amount}',{amount:typeof preset==='number'?preset:ui(preset)})} disabled={!canDonateSelected}
     onPress={()=>setQuantity(String(preset==='Max'?maxAmount:preset==='Half'?Math.max(1,Math.floor(maxAmount/2)):Math.min(maxAmount,preset)))}
     style={({pressed})=>[s.preset,pressed&&s.pressed]}>
     <Text style={s.presetText}>{typeof preset==='number'?preset:ui(preset)}</Text>
    </Pressable>)}</View>
    {playerState?<Text style={s.meta}>{ui('Available unlocked: {count}',{count:(availableQuantity(selected)??0).toLocaleString(language)})}</Text>:null}
    {maxAmount<=0?<Text style={s.warning}>{depositCapacity(selected)>0?ui('No unlocked stock available to donate.'):ui('The Guild Bank has enough for current requirements. Upcoming construction unlocks at its required Guild Level.')}</Text>:
     !valid?<Text style={s.warning}>{ui('Enter a whole number between 1 and {max}.',{max:maxAmount.toLocaleString(language)})}</Text>:
     <Text style={s.meta}>{ui('Up to {max} can be donated now. The server rechecks your inventory and Guild requirements.',{max:maxAmount.toLocaleString(language)})}</Text>}
    <View style={s.warningCard}><Text style={s.help}>{ui('Deposits are permanent. Only Guild systems may allocate these supplies; members cannot withdraw or transfer them.')}</Text></View>
    <View style={s.actions}><View style={s.flex}><GameButton tone="secondary" title={ui("Cancel")} disabled={busy} onPress={close}/></View>
     <View style={s.flex}><GameButton title={ui("Review donation")} disabled={!valid||depositDisabled} loading={busy} onPress={confirmDeposit}/></View></View>
   </ScrollView>):null}
  </GameModalSurface>
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},
 headingRow:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:12},
 kicker:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:1.1},
 heading:{fontSize:21,lineHeight:27,fontWeight:'900',color:C.text,marginTop:3},
 vaultMark:{width:47,height:47,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panel2},
 vaultGlyph:{color:C.accent,fontSize:29,fontWeight:'800'},
 stats:{flexDirection:'row',gap:12,alignItems:'center',borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,padding:12},
 stat:{flex:1,minWidth:0,gap:3},statsWrap:{flexWrap:'wrap'},wideStat:{flexBasis:'100%'},statDivider:{width:1,height:38,backgroundColor:C.lineStrong},
 statLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.6},
 statValue:{fontSize:20,lineHeight:26,color:C.accent,fontWeight:'900'},
 statSuffix:{fontSize:10,color:C.muted,fontWeight:'500'},
 help:{fontSize:12,lineHeight:18,color:C.muted},
 meta:{fontSize:11,lineHeight:16,color:C.muted},
 warning:{fontSize:12,lineHeight:18,color:C.warning,marginTop:6},
 error:{fontSize:12,lineHeight:18,color:C.bad,marginTop:6},
 success:{fontSize:12,lineHeight:18,color:C.good,marginTop:6},
 name:{fontSize:13,lineHeight:18,fontWeight:'800',color:C.text},
 fundingGuide:{gap:4,marginTop:10,padding:10,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 guideTitle:{fontSize:12,fontWeight:'900',color:C.text,marginBottom:2},
 section:{gap:10,marginTop:12},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 sectionTitle:{fontSize:14,fontWeight:'900',color:C.text,flexShrink:1},
 tabs:{flexDirection:'row',gap:4,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:13},
 tab:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:radii.sm},accessibleTab:{minHeight:58,paddingVertical:5},
 activeTab:{borderColor:C.selectionLine,backgroundColor:C.selection},
 tabText:{fontSize:11,color:C.muted,fontWeight:'800',textAlign:'center'},
 activeTabText:{color:C.text},pressed:{opacity:.75},
 search:{minHeight:44,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.inputBg,color:C.text,paddingHorizontal:12,fontSize:13},
 bankGrid:{flexDirection:'row',flexWrap:'wrap',columnGap:6,rowGap:7},
 bankSlot:{width:'23%',flexGrow:1,maxWidth:'24%',minWidth:0,minHeight:119,gap:4,paddingHorizontal:3,paddingTop:12,paddingBottom:7,alignItems:'center',justifyContent:'space-between',position:'relative',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 accessibleSlot:{width:'31%',maxWidth:'32%',minHeight:119},roomySlot:{width:'47%',maxWidth:'49%',minHeight:134},
 fundedSlot:{opacity:.75},nowSlot:{borderColor:C.good},futureSlot:{borderColor:C.info},
 statusDot:{position:'absolute',width:6,height:6,borderRadius:4,right:6,top:6},
 nowDot:{backgroundColor:C.good},futureDot:{backgroundColor:C.info},fundedDot:{backgroundColor:C.muted},
 artFrame:{width:49,height:45,alignItems:'center',justifyContent:'center'},
 stackCount:{position:'absolute',right:-4,bottom:-1,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.lineStrong,borderRadius:4,minWidth:19,maxWidth:51,paddingHorizontal:3,alignItems:'center'},
 stackText:{fontSize:10,fontWeight:'900',color:C.text},
 slotName:{fontSize:10,lineHeight:12,color:C.text,textAlign:'center',fontWeight:'800',minHeight:24},
 slotOwned:{fontSize:9,lineHeight:12,color:C.info,textAlign:'center',fontWeight:'700'},
 slotNeed:{fontSize:9,lineHeight:12,color:C.muted,textAlign:'center'},
 nowText:{color:C.good},futureText:{color:C.info},
 footerHelp:{fontSize:11,lineHeight:16,color:C.muted},
 groupLabel:{fontSize:10,color:C.accent,letterSpacing:1.0,fontWeight:'900',marginTop:6},
 neededRow:{flexDirection:'row',alignItems:'center',gap:9,borderBottomWidth:1,borderBottomColor:C.line,paddingVertical:7,minHeight:54},
 neededArt:{width:38,height:38,alignItems:'center',justifyContent:'center'},
 constructionCard:{gap:10,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:9},
 activityRow:{flexDirection:'row',gap:8,paddingVertical:9,alignItems:'center',borderBottomWidth:1,borderBottomColor:C.line},
 activityAmount:{fontSize:13,fontWeight:'900'},
 empty:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,gap:5},
 pending:{gap:8,padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface,marginTop:9},
 actions:{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'},
 modalBody:{paddingTop:8,paddingBottom:18,gap:11},
 confirmBody:{paddingTop:8,paddingBottom:20,gap:14},
 modalSummary:{flexDirection:'row',alignItems:'center',gap:11,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,padding:10},
 modalArt:{width:59,height:59,alignItems:'center',justifyContent:'center'},
 modalStats:{flexDirection:'row',gap:6},modalStatsWrap:{flexWrap:'wrap'},
 modalStat:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:3,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},modalStatWide:{flexBasis:'47%',minHeight:72},
 modalNumber:{fontSize:17,fontWeight:'900',color:C.accent},
 input:{minHeight:48,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,color:C.text,backgroundColor:C.inputBg,paddingHorizontal:12,fontSize:17},
 presetRow:{flexDirection:'row',gap:6},
 preset:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 presetText:{fontSize:12,color:C.text,fontWeight:'800'},
 warningCard:{borderLeftWidth:3,borderLeftColor:C.warning,padding:10,backgroundColor:C.warningSurface,borderRadius:radii.sm},
 });}

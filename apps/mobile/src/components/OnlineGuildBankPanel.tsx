import {useEffect,useMemo,useState} from 'react';
import {Keyboard,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ResourceArtwork} from './ResourceArtwork';
import {guildUpgradeComponentName} from '../theme/guild-upgrade-component-art';
import {gameAlert} from '../core/game-alerts';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,type ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {loadOnlineGuildSkills,type GuildSkillsSnapshot} from '../online/guild-skills';
import {depositOnlineGuildBank,pendingGuildBankDeposit,discardPendingGuildBankDeposit,type PendingGuildBankDeposit} from '../online/guild-bank';

const resourceTitle=(id:string)=>id==='gold'?'Gold':guildUpgradeComponentName(id)??id.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
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
 // Only released Guild Skills' next-rank costs can be banked, and only
 // while the guild still holds unspent skill points.
 if(skillSnapshot&&skillSnapshot.guildLevel===snapshot.guildLevel&&skillSnapshot.skillPoints>0){
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
export function OnlineGuildBankPanel({snapshot,onReload,focusResourceId,onFocusHandled,onOpenConstruction}:{
 snapshot:GuildTokenShopSnapshot;onReload:()=>Promise<unknown>;
 focusResourceId?:string|null;onFocusHandled?:()=>void;onOpenConstruction?:()=>void;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{height:windowHeight,width:windowWidth,fontScale}=useWindowDimensions();
 // Preserve readable touch targets when accessibility fonts are significantly enlarged.
 const accessibleGrid=windowWidth<330||fontScale>=1.35;
 const [selection,setSelection]=useState<string|null>(null),[quantity,setQuantity]=useState('1');
 const [view,setView]=useState<BankSection>('inventory'),[search,setSearch]=useState('');
 const [pending,setPending]=useState<PendingGuildBankDeposit|null>(null);
 const [confirming,setConfirming]=useState(false);
 const [skillSnapshot,setSkillSnapshot]=useState<GuildSkillsSnapshot|null>(null);
 const [skillLoading,setSkillLoading]=useState(true),[skillError,setSkillError]=useState(false);
 const [skillRefresh,setSkillRefresh]=useState(0);
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
 const totalNeed=(id:string)=>{const row=needs.get(id);return (row?.current??0)+(row?.upcoming??0)+(row?.skills??0)};
 const depositCapacity=(id:string)=>Math.max(0,totalNeed(id)-balance(id));
 // The Construction shortcut focuses this material once. Clearing the focus
 // prevents the sheet from reopening after a successful deposit or dismissal.
 useEffect(()=>{
  if(!focusResourceId)return;
  const capacity=depositCapacity(focusResourceId);
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
 const visibleIds=ids.filter(id=>resourceTitle(id).toLowerCase().includes(search.trim().toLowerCase()));
 const shortageNow=(id:string)=>Math.max(0,(needs.get(id)?.current??0)+(needs.get(id)?.skills??0)-balance(id));
 const shortageUpcoming=(id:string)=>Math.max(0,(needs.get(id)?.upcoming??0)-Math.max(0,balance(id)-(needs.get(id)?.current??0)-(needs.get(id)?.skills??0)));
 const currentIds=ids.filter(id=>(needs.get(id)?.current??0)+(needs.get(id)?.skills??0)>0);
 const upcomingIds=ids.filter(id=>(needs.get(id)?.upcoming??0)>0);
 const remainingTotal=ids.reduce((sum,id)=>sum+depositCapacity(id),0);
 const storedTypes=ids.filter(id=>balance(id)>0).length;
 const shortName=(id:string)=>resourceTitle(id)
  .replace('Reinforced Timber Bundle','Timber Bundle')
  .replace("Mason's Keystone",'Keystone')
  .replace('Forged Rivet Crate','Forged Rivets')
  .replace('Fortification Hinge Set','Hinge Set')
  .replace('Heraldic Dye Flask','Heraldic Dye')
  .replace('Beacon Oil Flask','Beacon Oil');
 const status=(id:string)=>depositCapacity(id)<=0?'Covered':shortageNow(id)>0?'Needed now':'Upcoming';
 const compactQuantity=(value:number)=>value>=10000?(Math.round(value/100)/10).toLocaleString()+'k':value.toLocaleString();
 const activityTime=(iso:string)=>{
  const date=new Date(iso);
  if(!Number.isFinite(date.getTime()))return 'Recent';
  return date.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+date.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
 };
 const selected=selection&&ids.includes(selection)?selection:null;
 const amount=Number(quantity);
 const valid=!!selected&&depositCapacity(selected)>0&&Number.isSafeInteger(amount)&&amount>=1&&amount<=1000000&&amount<=depositCapacity(selected);
 const close=()=>{if(!busy){Keyboard.dismiss();setConfirming(false);setSelection(null);setQuantity('1');}};
 const deposit=async(input:{resourceId:string;amount:number})=>{
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const response=await depositOnlineGuildBank(input);
   setPending(null);setConfirming(false);setSelection(null);
   setNotice(response.alreadyProcessed?'Saved deposit confirmed. No additional resources were deducted.':
    input.amount.toLocaleString()+' '+resourceTitle(input.resourceId)+' deposited into the Guild Bank.');
   try{await onReload();setSkillRefresh(x=>x+1)}catch{setNotice('Deposit confirmed. Bank refresh is unavailable; reopen the Bank to update balances.');}
  }catch(reason){
   setConfirming(false);setSelection(null);
   setError(reason instanceof Error?reason.message:'Unable to confirm Guild Bank deposit.');
   try{setPending(await pendingGuildBankDeposit())}catch{/* Keep original error. */}
  }finally{setBusy(false)}
 };
 const confirmDeposit=()=>{
  if(!selected||!valid||pending||busy||snapshot.bank===null)return;
  Keyboard.dismiss();setConfirming(true);
 };
 const discard=()=>gameAlert.alert('Discard saved deposit?',
  'Only discard after checking the Guild Bank. If the original request was completed, donating again spends resources again.',
  [{text:'Keep receipt',style:'cancel'},{text:'Discard local retry',style:'destructive',
   onPress:()=>void discardPendingGuildBankDeposit().then(()=>setPending(null)).catch(reason=>setError(String(reason)))}]);
 const choose=(id:string)=>{
  if(busy||pending||snapshot.bank===null)return;
  setConfirming(false);setSelection(id);setQuantity(String(Math.min(10,1000000,depositCapacity(id))));
 };
 const depositDisabled=busy||!!pending||snapshot.bank===null;
 const inventoryCard=(id:string)=>{
  const onHand=balance(id),remaining=depositCapacity(id),state=status(id);
  return <Pressable key={id} accessibilityRole="button"
   accessibilityLabel={resourceTitle(id)+', '+onHand.toLocaleString()+' in Guild Bank. '+remaining.toLocaleString()+' more can be donated.'}
   accessibilityHint="Opens material details and donation options"
   disabled={depositDisabled} onPress={()=>choose(id)}
   style={({pressed})=>[s.bankSlot,accessibleGrid&&s.accessibleSlot,state==='Covered'&&s.fundedSlot,
    state==='Needed now'?s.nowSlot:state==='Upcoming'?s.futureSlot:null,pressed&&s.pressed]}>
   <View style={[s.statusDot,state==='Needed now'?s.nowDot:state==='Upcoming'?s.futureDot:s.fundedDot]}/>
   <View style={s.artFrame}>
    {id==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={id} size={39} framed={false}/>}
    <View style={s.stackCount}><Text numberOfLines={1} style={s.stackText}>{compactQuantity(onHand)}</Text></View>
   </View>
   <Text numberOfLines={2} style={s.slotName}>{shortName(id)}</Text>
   <Text numberOfLines={1} style={[s.slotNeed,state==='Needed now'?s.nowText:state==='Upcoming'?s.futureText:null]}>
    {remaining>0?'+'+compactQuantity(remaining)+' needed':'✓ Covered'}
   </Text>
  </Pressable>;
 };
 const neededRow=(id:string,upcoming:boolean)=>{
  const shortage=upcoming?shortageUpcoming(id):shortageNow(id);
  return <View key={(upcoming?'later-':'now-')+id} style={s.neededRow}>
   <View style={s.neededArt}>{id==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={id} size={34} framed={false}/>}</View>
   <View style={s.flex}><Text numberOfLines={2} style={s.name}>{resourceTitle(id)}</Text>
    <Text style={s.meta}>{balance(id).toLocaleString()} stored · {shortage.toLocaleString()} more to deposit{!upcoming&&(needs.get(id)?.skills??0)>0?' · Guild Skills':''}</Text>
   </View>
   {shortage>0?<GameButton compact tone="secondary" title="Donate" disabled={depositDisabled} onPress={()=>choose(id)}/>:
    <Text style={[s.meta,s.nowText]}>In bank</Text>}
  </View>;
 };
 const canDonateSelected=!!selected&&!depositDisabled&&depositCapacity(selected)>0;
 const maxAmount=selected?Math.min(1000000,depositCapacity(selected)):0;
 return <Panel>
  <View style={s.headingRow}>
   <View style={s.flex}><Text style={s.kicker}>SHARED STORAGE</Text>
    <Text accessibilityRole="header" style={s.heading}>Guild Bank</Text>
    <Text style={s.meta}>Deposit only · Construction & Guild Skills</Text>
   </View>
   <View style={s.vaultMark}><Text style={s.vaultGlyph}>▣</Text></View>
  </View>
  <View style={s.stats}>
   <View style={s.stat}><Text style={s.statLabel}>STORED MATERIALS</Text><Text style={s.statValue}>{snapshot.bank?storedTypes:'—'}<Text style={s.statSuffix}> types</Text></Text></View>
   <View style={s.statDivider}/>
   <View style={s.stat}><Text style={s.statLabel}>STILL TO DEPOSIT</Text><Text style={s.statValue}>{snapshot.bank?remainingTotal.toLocaleString():'—'}<Text style={s.statSuffix}> units</Text></Text></View>
  </View>
  {snapshot.bank===null?<Text accessibilityRole="alert" style={s.warning}>Bank balances are unavailable. Donations are paused until a refresh succeeds.</Text>:null}
  {skillLoading?<Text style={s.meta}>Checking released Guild Skill requirements…</Text>:null}
  {skillError?<View style={s.actions}>
   <Text accessibilityRole="alert" style={[s.warning,s.flex]}>Guild Skill requirements could not load. Construction deposits remain available.</Text>
   <GameButton compact tone="secondary" title="Retry" onPress={()=>setSkillRefresh(v=>v+1)}/>
  </View>:null}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>}
  {pending?<View style={s.pending}>
   <Text style={s.name}>Deposit needs confirmation</Text>
   <Text style={s.help}>{pending.amount.toLocaleString()} {resourceTitle(pending.resourceId)} · Retry the saved receipt. Do not create a second donation.</Text>
   <View style={s.actions}>
    <GameButton compact title="Retry saved deposit" disabled={busy} loading={busy} onPress={()=>deposit(pending)}/>
    <GameButton compact tone="secondary" title="Discard local retry" disabled={busy} onPress={discard}/>
   </View>
  </View>:null}
  <View style={s.tabs} accessibilityRole="tablist">
   {([{id:'inventory',label:'▦  Inventory'},{id:'needed',label:'◎  Needed'},{id:'activity',label:'◷  Activity'}] as const).map(tab=><Pressable key={tab.id} accessibilityRole="tab"
    accessibilityState={{selected:view===tab.id}} onPress={()=>{setView(tab.id);setNotice('')}}
    style={({pressed})=>[s.tab,view===tab.id&&s.activeTab,pressed&&s.pressed]}>
    <Text numberOfLines={1} style={[s.tabText,view===tab.id&&s.activeTabText]}>{tab.label}</Text>
   </Pressable>)}
  </View>
  {view==='inventory'?<View style={s.section}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Guild materials</Text><Text style={s.meta}>Tap an item to donate</Text></View>
   <TextInput value={search} onChangeText={setSearch} placeholder="Search materials"
    placeholderTextColor={C.muted} accessibilityLabel="Search Guild Bank materials"
    autoCorrect={false} returnKeyType="search" style={s.search}/>
   <View style={s.bankGrid}>{visibleIds.map(inventoryCard)}</View>
   {!visibleIds.length?<View style={s.empty}><Text style={s.name}>No matching materials</Text>
    <Text style={s.help}>Try a different search. Only published upgrade materials are accepted.</Text></View>:null}
   <Text style={s.footerHelp}>Only materials required by published Construction or released Guild Skills can be deposited. Donations cannot be withdrawn.</Text>
   <GameButton compact tone="secondary" title="View materials needed" onPress={()=>{setView('needed');setNotice('')}}/>
  </View>:null}
  {view==='needed'?<View style={s.section}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Guild supply requirements</Text><Text style={s.meta}>{currentIds.length} needed now</Text></View>
   <GameButton compact tone="secondary" title={skillLoading?'Refreshing Guild Skill needs…':'Refresh requirements'} disabled={skillLoading}
    onPress={()=>{setSkillRefresh(v=>v+1);void onReload()}}/>
   <Text style={s.help}>Construction and released Guild Skills draw from the same Bank. Donate supplies first; spending is done in the relevant Guild screen.</Text>
   <Text style={s.groupLabel}>NEEDED NOW</Text>
   {currentIds.length?currentIds.map(id=>neededRow(id,false)):
    <Text style={s.help}>No current construction or released Guild Skill requirements need more materials.</Text>}
   <Text style={s.groupLabel}>UPCOMING</Text>
   {upcomingIds.length?upcomingIds.map(id=>neededRow(id,true)):
    <Text style={s.help}>No upcoming published material requirements.</Text>}
   <View style={s.constructionCard}>
    <Text style={s.sectionTitle}>Guild Construction</Text>
    <Text style={s.help}>Use stored resources to fund specific Hall, Forge, Library, Treasury, War Room or Lodge upgrades.</Text>
    {onOpenConstruction?<GameButton compact tone="secondary" title="Open Construction" onPress={onOpenConstruction}/>:null}
   </View>
  </View>:null}
  {view==='activity'?<View style={s.section}>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Recent guild activity</Text><Text style={s.meta}>Shared ledger</Text></View>
   {snapshot.bank?.activity.length?snapshot.bank.activity.slice(0,20).map((item,index)=><View key={item.createdAt+'-'+item.resourceId+'-'+index} style={s.activityRow}>
    <View style={s.neededArt}>{item.resourceId==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={item.resourceId} size={30} framed={false}/>}</View>
    <View style={s.flex}>
     <Text numberOfLines={2} style={s.name}>{item.kind==='deposit'?(item.mine?'You donated':'Member donated'):item.kind==='skill_upgrade'?'Spent on Guild Skill':'Allocated to construction'}</Text>
     <Text numberOfLines={2} style={s.meta}>{resourceTitle(item.resourceId)} · {activityTime(item.createdAt)}</Text>
    </View>
    <Text style={[s.activityAmount,{color:item.kind==='deposit'?C.good:C.info}]}>
     {item.kind==='deposit'?'+':'−'}{item.amount.toLocaleString()}
    </Text>
   </View>):<View style={s.empty}><Text style={s.name}>No recorded activity yet</Text>
    <Text style={s.help}>Deposits and project allocations will appear here after they are confirmed.</Text></View>}
  </View>:null}
  <GameModalSurface visible={!!selected} presentation="sheet" surfaceStyle={{maxHeight:windowHeight*.86}}
   dismissOnBackdrop={!busy} onClose={close}>
   <GameModalHeader eyebrow={confirming?"CONFIRM DONATION":"GUILD BANK · DONATE"} title={confirming?"Donate to Guild Bank?":selected?resourceTitle(selected):'Guild Bank'}
    closeDisabled={busy} onClose={close}/>
   {selected?(confirming?<View style={s.confirmBody}>
    <View style={s.modalSummary}>
     <View style={s.modalArt}>{selected==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={selected} size={56} framed={false}/>}</View>
     <View style={s.flex}><Text style={s.name}>{resourceTitle(selected)}</Text>
      <Text style={s.help}>{amount.toLocaleString()} from your inventory into the shared Guild Bank</Text>
      <Text style={s.meta}>{balance(selected).toLocaleString()} currently stored</Text>
     </View>
    </View>
    <View style={s.warningCard}><Text style={s.help}>This donation is permanent and cannot be withdrawn. Guild Construction or Guild Skills can spend it separately.</Text></View>
    <View style={s.actions}>
     <View style={s.flex}><GameButton tone="secondary" title="Back" disabled={busy} onPress={()=>setConfirming(false)}/></View>
     <View style={s.flex}><GameButton title="Confirm donation" disabled={!valid||depositDisabled} loading={busy}
      onPress={()=>void deposit({resourceId:selected,amount})}/></View>
    </View>
   </View>:<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
    showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalBody}>
    <View style={s.modalSummary}>
     <View style={s.modalArt}>{selected==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={selected} size={56} framed={false}/>}</View>
     <View style={s.flex}><Text style={s.name}>{resourceTitle(selected)}</Text>
      <Text style={s.help}>{balance(selected).toLocaleString()} stored in the shared Bank</Text>
      <Text style={s.meta}>Only published Construction and released Skill materials can be deposited</Text>
     </View>
    </View>
    <View style={s.modalStats}>
     <View style={s.modalStat}><Text style={s.statLabel}>GUILD OWNS</Text><Text style={s.modalNumber}>{balance(selected).toLocaleString()}</Text></View>
     <View style={s.modalStat}><Text style={s.statLabel}>NEEDED NOW</Text><Text style={s.modalNumber}>{((needs.get(selected)?.current??0)+(needs.get(selected)?.skills??0)).toLocaleString()}</Text></View>
     <View style={s.modalStat}><Text style={s.statLabel}>BANK LIMIT</Text><Text style={s.modalNumber}>{maxAmount.toLocaleString()}</Text></View>
    </View>
    <Text style={s.name}>Donation amount</Text>
    <TextInput value={quantity} onChangeText={setQuantity} selectTextOnFocus keyboardType="number-pad"
     maxLength={7} accessibilityLabel="Guild Bank donation amount" style={s.input}
     editable={canDonateSelected}/>
    <View style={s.presetRow}>{[1,10,'Half' as const,'Max' as const].map(preset=><Pressable key={preset}
     accessibilityRole="button" accessibilityLabel={'Donate quantity '+preset} disabled={!canDonateSelected}
     onPress={()=>setQuantity(String(preset==='Max'?maxAmount:preset==='Half'?Math.max(1,Math.floor(maxAmount/2)):Math.min(maxAmount,preset)))}
     style={({pressed})=>[s.preset,pressed&&s.pressed]}>
     <Text style={s.presetText}>{preset}</Text>
    </Pressable>)}</View>
    {maxAmount<=0?<Text style={s.success}>The Guild Bank already holds enough for all published requirements.</Text>:
     !valid?<Text style={s.warning}>Enter a whole number between 1 and {maxAmount.toLocaleString()}.</Text>:
     <Text style={s.meta}>Up to {maxAmount.toLocaleString()} more can be deposited. The server checks your available unlocked items or Gold when you confirm.</Text>}
    <View style={s.warningCard}><Text style={s.help}>Deposits are permanent. Only Guild systems may allocate these supplies; members cannot withdraw or transfer them.</Text></View>
    <View style={s.actions}><View style={s.flex}><GameButton tone="secondary" title="Cancel" disabled={busy} onPress={close}/></View>
     <View style={s.flex}><GameButton title="Review donation" disabled={!valid||depositDisabled} loading={busy} onPress={confirmDeposit}/></View></View>
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
 stat:{flex:1,minWidth:0,gap:3},statDivider:{width:1,height:38,backgroundColor:C.lineStrong},
 statLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.6},
 statValue:{fontSize:20,lineHeight:26,color:C.accent,fontWeight:'900'},
 statSuffix:{fontSize:10,color:C.muted,fontWeight:'500'},
 help:{fontSize:12,lineHeight:18,color:C.muted},
 meta:{fontSize:11,lineHeight:16,color:C.muted},
 warning:{fontSize:12,lineHeight:18,color:C.warning,marginTop:6},
 error:{fontSize:12,lineHeight:18,color:C.bad,marginTop:6},
 success:{fontSize:12,lineHeight:18,color:C.good,marginTop:6},
 name:{fontSize:13,lineHeight:18,fontWeight:'800',color:C.text},
 section:{gap:10,marginTop:12},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
 sectionTitle:{fontSize:14,fontWeight:'900',color:C.text,flexShrink:1},
 tabs:{flexDirection:'row',gap:4,padding:4,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,marginTop:13},
 tab:{flex:1,minWidth:0,minHeight:44,paddingHorizontal:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'transparent',borderRadius:radii.sm},
 activeTab:{borderColor:C.selectionLine,backgroundColor:C.selection},
 tabText:{fontSize:11,color:C.muted,fontWeight:'800',textAlign:'center'},
 activeTabText:{color:C.text},pressed:{opacity:.75},
 search:{minHeight:44,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.inputBg,color:C.text,paddingHorizontal:12,fontSize:13},
 bankGrid:{flexDirection:'row',flexWrap:'wrap',columnGap:6,rowGap:7},
 bankSlot:{width:'23%',flexGrow:1,maxWidth:'24%',minWidth:0,minHeight:109,gap:4,paddingHorizontal:3,paddingTop:12,paddingBottom:7,alignItems:'center',justifyContent:'space-between',position:'relative',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 accessibleSlot:{width:'31%',maxWidth:'32%',minHeight:119},
 fundedSlot:{opacity:.75},nowSlot:{borderColor:C.good},futureSlot:{borderColor:C.info},
 statusDot:{position:'absolute',width:6,height:6,borderRadius:4,right:6,top:6},
 nowDot:{backgroundColor:C.good},futureDot:{backgroundColor:C.info},fundedDot:{backgroundColor:C.muted},
 artFrame:{width:49,height:45,alignItems:'center',justifyContent:'center'},
 goldGlyph:{fontSize:28,fontWeight:'900',color:C.accent},
 stackCount:{position:'absolute',right:-4,bottom:-1,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.lineStrong,borderRadius:4,minWidth:19,maxWidth:51,paddingHorizontal:3,alignItems:'center'},
 stackText:{fontSize:10,fontWeight:'900',color:C.text},
 slotName:{fontSize:10,lineHeight:12,color:C.text,textAlign:'center',fontWeight:'800',minHeight:24},
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
 modalStats:{flexDirection:'row',gap:6},
 modalStat:{flex:1,minWidth:0,alignItems:'center',justifyContent:'center',gap:3,padding:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 modalNumber:{fontSize:17,fontWeight:'900',color:C.accent},
 input:{minHeight:48,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,color:C.text,backgroundColor:C.inputBg,paddingHorizontal:12,fontSize:17},
 presetRow:{flexDirection:'row',gap:6},
 preset:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
 presetText:{fontSize:12,color:C.text,fontWeight:'800'},
 warningCard:{borderLeftWidth:3,borderLeftColor:C.warning,padding:10,backgroundColor:C.warningSurface,borderRadius:radii.sm},
 });}

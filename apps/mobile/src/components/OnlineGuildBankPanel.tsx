import {useEffect,useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {ResourceArtwork} from './ResourceArtwork';
import {guildUpgradeComponentName} from '../theme/guild-upgrade-component-art';
import {gameAlert} from '../core/game-alerts';
import {useGameTheme} from '../theme/ThemeContext';
import {radii,spacing,type ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {depositOnlineGuildBank,pendingGuildBankDeposit,discardPendingGuildBankDeposit,type PendingGuildBankDeposit} from '../online/guild-bank';

const resourceTitle=(id:string)=>id==='gold'?'Gold':guildUpgradeComponentName(id)??id.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,letter=>letter.toUpperCase());
type Need={current:number;upcoming:number};
type ViewMode='all'|'current'|'upcoming';
function projectNeeds(snapshot:GuildTokenShopSnapshot){
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
   const before=needed.get(req.resourceId)??{current:0,upcoming:0};
   needed.set(req.resourceId,{...before,[upcoming?'upcoming':'current']:before[upcoming?'upcoming':'current']+remainder});
  }
 }
 return needed;
}
export function OnlineGuildBankPanel({snapshot,onReload}:{snapshot:GuildTokenShopSnapshot;onReload:()=>Promise<unknown>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{height:windowHeight}=useWindowDimensions();
 const [selection,setSelection]=useState<string|null>(null),[quantity,setQuantity]=useState('1'),[view,setView]=useState<ViewMode>('all');
 const [pending,setPending]=useState<PendingGuildBankDeposit|null>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;void pendingGuildBankDeposit().then(value=>{if(active)setPending(value)}).catch(reason=>{if(active)setError(String(reason))});return()=>{active=false}},[]);
 const needs=useMemo(()=>projectNeeds(snapshot),[snapshot]);
 const stored=new Map((snapshot.bank?.balances??[]).map(row=>[row.resourceId,row.amount]));
 const balance=(id:string)=>stored.get(id)??0;
 const totalNeed=(id:string)=>{const row=needs.get(id);return (row?.current??0)+(row?.upcoming??0)};
 const depositCapacity=(id:string)=>Math.max(0,totalNeed(id)-balance(id));
 const ids=[...new Set([...needs.keys(),...stored.keys()])].sort((a,b)=>{
  const aNow=(needs.get(a)?.current??0)>0?0:1,bNow=(needs.get(b)?.current??0)>0?0:1;
  return aNow-bNow||Number(b==='gold')-Number(a==='gold')||a.localeCompare(b);
 });
 const visibleIds=ids.filter(id=>view==='all'||(view==='current'?(needs.get(id)?.current??0)>0:(needs.get(id)?.upcoming??0)>0));
 const selected=selection&&ids.includes(selection)?selection:null;
 const amount=Number(quantity);
 const valid=!!selected&&depositCapacity(selected)>0&&Number.isSafeInteger(amount)&&amount>=1&&amount<=1000000&&amount<=depositCapacity(selected);
 const close=()=>{if(!busy){setSelection(null);setQuantity('1');}};
 const deposit=async(input:{resourceId:string;amount:number})=>{
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{
   const response=await depositOnlineGuildBank(input);
   setPending(null);setSelection(null);
   setNotice(response.alreadyProcessed?'Saved deposit confirmed. No additional resources were deducted.':
    input.amount.toLocaleString()+' '+resourceTitle(input.resourceId)+' deposited into the Guild Bank.');
   await onReload();
  }catch(reason){
   setError(reason instanceof Error?reason.message:'Unable to confirm Guild Bank deposit.');
   try{setPending(await pendingGuildBankDeposit())}catch{/* Keep original error. */}
  }finally{setBusy(false)}
 };
 const confirmDeposit=()=>{
  if(!selected||!valid||pending||busy||snapshot.bank===null)return;
  gameAlert.alert('Confirm Guild Bank donation',
   'Deposit '+amount.toLocaleString()+' '+resourceTitle(selected)+' into the shared Guild inventory? Donations cannot be withdrawn.',
   [{text:'Cancel',style:'cancel'},{text:'Donate',onPress:()=>void deposit({resourceId:selected,amount})}]);
 };
 const discard=()=>gameAlert.alert('Discard saved deposit?',
  'Only discard after checking the Guild Bank. If the original request was completed, donating again spends resources again.',
  [{text:'Keep receipt',style:'cancel'},{text:'Discard local retry',style:'destructive',
   onPress:()=>void discardPendingGuildBankDeposit().then(()=>setPending(null)).catch(reason=>setError(String(reason)))}]);
 const choose=(id:string)=>{
  if(busy||pending||snapshot.bank===null||depositCapacity(id)<=0)return;
  setSelection(id);setQuantity(String(Math.min(10,depositCapacity(id))));
 };
 const depositDisabled=busy||!!pending||snapshot.bank===null;
 return <Panel>
  <View style={s.headingRow}>
   <View style={s.flex}><Text style={s.kicker}>GUILD INVENTORY</Text><Text style={s.heading}>Guild Bank</Text></View>
   <View style={s.count}><Text style={s.countValue}>{stored.size}</Text><Text style={s.countText}>stored types</Text></View>
  </View>
  <Text style={s.help}>Shared supplies for Guild Construction and future Guild content. Members can only deposit items needed by published current or upcoming upgrades. No withdrawals.</Text>
  {snapshot.bank===null?<Text style={s.warning}>Bank balances are temporarily unavailable. Donations are disabled until a server refresh succeeds.</Text>:null}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>}
  {pending?<View style={s.pending}>
   <Text style={s.name}>Deposit needs confirmation</Text><Text style={s.help}>{pending.amount.toLocaleString()} {resourceTitle(pending.resourceId)} · Retry the same receipt to avoid duplicate deductions.</Text>
   <View style={s.actions}><GameButton compact title="Retry saved deposit" disabled={busy} loading={busy} onPress={()=>deposit(pending)}/><GameButton compact tone="secondary" title="Discard local retry" disabled={busy} onPress={discard}/></View>
  </View>:null}
  <View style={s.tabs}>
   {([{id:'all',label:'All materials'},{id:'current',label:'Needed now'},{id:'upcoming',label:'Upcoming'}] as const).map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{selected:view===tab.id}} onPress={()=>setView(tab.id)} style={({pressed})=>[s.tab,view===tab.id&&s.activeTab,pressed&&s.pressed]}><Text style={[s.tabText,view===tab.id&&s.activeTabText]}>{tab.label}</Text></Pressable>)}
  </View>
  <View style={s.bankGrid}>
   {visibleIds.map(id=>{
    const onHand=balance(id),need=needs.get(id)??{current:0,upcoming:0},remaining=depositCapacity(id),canDeposit=!depositDisabled&&remaining>0;
    const label=need.current>0?'Needed now':need.upcoming>0?'Upcoming':'Stored';
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={resourceTitle(id)+', '+onHand.toLocaleString()+' stored. '+remaining.toLocaleString()+' can be deposited.'}
     accessibilityState={{disabled:!canDeposit}} disabled={!canDeposit} onPress={()=>choose(id)}
     style={({pressed})=>[s.bankSlot,remaining===0&&s.funded,pressed&&s.pressed]}>
     <Text numberOfLines={2} style={s.slotName}>{resourceTitle(id)}</Text>
     <View style={s.artFrame}>{id==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={id} size={40} framed/>}
      <View style={s.stackCount}><Text numberOfLines={1} style={s.stackText}>{onHand.toLocaleString()}</Text></View>
     </View>
     <Text numberOfLines={1} style={[s.slotStatus,remaining>0&&need.current>0?s.nowStatus:need.upcoming>0?s.upcomingStatus:null]}>{label}</Text>
     <Text numberOfLines={1} style={s.slotNeed}>{remaining>0?'+'+remaining.toLocaleString()+' needed':'Fully funded'}</Text>
    </Pressable>;
   })}
   {!visibleIds.length?<View style={s.empty}><Text style={s.name}>No matching materials</Text><Text style={s.help}>Only published, incomplete upgrade requirements can receive deposits. Previously stored resources stay visible under All materials.</Text></View>:null}
  </View>
  <Text style={s.footerHelp}>Tap a material to donate. The server verifies your unlocked Inventory stacks or Gold and caps deposits to remaining Guild requirements.</Text>
  {snapshot.bank&&snapshot.bank.activity.length>0?<View style={s.history}>
   <Text style={s.name}>Recent activity</Text>
   {snapshot.bank.activity.slice(0,5).map((item,index)=><View key={item.createdAt+'-'+index} style={s.historyRow}>
    <Text numberOfLines={2} style={[s.help,s.flex]}>{item.kind==='deposit'?(item.mine?'You donated':'Member donated'):'Allocated to upgrade'} · {resourceTitle(item.resourceId)}</Text>
    <Text style={[s.name,{color:item.kind==='deposit'?C.good:C.info}]}>{item.kind==='deposit'?'+':'−'}{item.amount.toLocaleString()}</Text>
   </View>)}
  </View>:null}
  <GameModalSurface visible={!!selected} presentation="sheet" surfaceStyle={{maxHeight:windowHeight*.86}} dismissOnBackdrop={!busy} onClose={close}>
   <GameModalHeader eyebrow="DONATE MATERIALS" title={selected?resourceTitle(selected):'Guild Bank'} closeDisabled={busy} onClose={close}/>
   {selected?<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalBody}>
    <View style={s.modalSummary}>
     <View style={s.modalArt}>{selected==='gold'?<Text style={s.goldGlyph}>G</Text>:<ResourceArtwork itemId={selected} size={56} framed/>}</View>
     <View style={s.flex}><Text style={s.name}>{resourceTitle(selected)}</Text><Text style={s.help}>{balance(selected).toLocaleString()} in Guild Bank</Text>
      <Text style={s.meta}>{(needs.get(selected)?.current??0).toLocaleString()} needed now · {(needs.get(selected)?.upcoming??0).toLocaleString()} for upcoming upgrades</Text>
     </View>
    </View>
    <Text style={s.name}>Donation amount</Text>
    <Text style={s.help}>Maximum additional deposit: {depositCapacity(selected).toLocaleString()} · Personal inventory is verified by the server.</Text>
    <TextInput value={quantity} onChangeText={setQuantity} selectTextOnFocus keyboardType="number-pad" maxLength={7} accessibilityLabel="Guild Bank donation amount" style={s.input}/>
    <View style={s.presetRow}>{[1,10,100,'Max' as const].map(preset=><Pressable key={preset} accessibilityRole="button" disabled={busy} onPress={()=>setQuantity(String(Math.min(1000000,preset==='Max'?depositCapacity(selected):preset,depositCapacity(selected))))} style={({pressed})=>[s.preset,pressed&&s.pressed]}><Text style={s.presetText}>{preset}</Text></Pressable>)}</View>
    {!valid?<Text style={s.warning}>Enter a whole number between 1 and {Math.min(1000000,depositCapacity(selected)).toLocaleString()}.</Text>:null}
    <View style={s.warningCard}><Text style={s.help}>Donations are permanent. Only Guild systems can spend these supplies; members cannot withdraw or transfer them.</Text></View>
    <View style={s.actions}><View style={s.flex}><GameButton tone="secondary" title="Cancel" disabled={busy} onPress={close}/></View><View style={s.flex}><GameButton title="Donate to Guild" disabled={!valid||depositDisabled} loading={busy} onPress={confirmDeposit}/></View></View>
   </ScrollView>:null}
  </GameModalSurface>
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 flex:{flex:1,minWidth:0},headingRow:{flexDirection:'row',alignItems:'center',gap:10},kicker:{fontSize:10,color:C.accent,fontWeight:'900',letterSpacing:1},heading:{fontSize:21,lineHeight:27,fontWeight:'900',color:C.text,marginTop:3},
 help:{fontSize:12,lineHeight:18,color:C.muted},meta:{fontSize:11,lineHeight:16,color:C.muted},warning:{color:C.warning,fontSize:12,lineHeight:18},error:{color:C.bad,fontSize:12},success:{color:C.good,fontSize:12},name:{fontSize:13,lineHeight:18,fontWeight:'800',color:C.text},count:{minWidth:72,alignItems:'center',borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2,padding:7},countValue:{fontSize:19,fontWeight:'900',color:C.text},countText:{fontSize:10,color:C.muted},
 tabs:{flexDirection:'row',gap:6,marginTop:6},tab:{minHeight:44,flex:1,minWidth:0,paddingHorizontal:5,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},activeTab:{borderColor:C.selectionLine,backgroundColor:C.selection},tabText:{fontSize:11,color:C.muted,fontWeight:'800',textAlign:'center'},activeTabText:{color:C.text},pressed:{opacity:.76},
 bankGrid:{flexDirection:'row',flexWrap:'wrap',columnGap:6,rowGap:7,marginTop:5},bankSlot:{width:'23%',flexGrow:1,minWidth:0,maxWidth:'24%',minHeight:119,alignItems:'center',justifyContent:'space-between',gap:3,paddingHorizontal:3,paddingVertical:7,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},funded:{opacity:.65},slotName:{fontSize:10,lineHeight:13,color:C.text,textAlign:'center',fontWeight:'800',minHeight:26},
 artFrame:{width:51,height:49,alignItems:'center',justifyContent:'center',position:'relative'},goldGlyph:{fontSize:28,fontWeight:'900',color:C.accent},stackCount:{position:'absolute',bottom:-2,right:-6,backgroundColor:C.panelRaised,borderWidth:1,borderColor:C.lineStrong,borderRadius:4,minWidth:20,paddingHorizontal:3,paddingVertical:1,alignItems:'center'},stackText:{fontSize:10,fontWeight:'900',color:C.text},
 slotStatus:{fontSize:10,lineHeight:13,color:C.muted,textAlign:'center'},nowStatus:{color:C.good},upcomingStatus:{color:C.info},slotNeed:{fontSize:9,lineHeight:12,color:C.muted,textAlign:'center'},empty:{padding:12,borderColor:C.line,borderWidth:1,borderRadius:radii.md,backgroundColor:C.panel2,gap:4,width:'100%'},
 footerHelp:{fontSize:11,lineHeight:16,color:C.muted,marginTop:4},pending:{gap:8,padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.md,backgroundColor:C.warningSurface},
 actions:{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'},history:{gap:7,marginTop:6,paddingTop:12,borderTopWidth:1,borderTopColor:C.line},historyRow:{flexDirection:'row',alignItems:'center',gap:10,justifyContent:'space-between'},
 modalBody:{paddingTop:8,paddingBottom:18,gap:12},modalSummary:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2,padding:10},modalArt:{width:64,height:64,alignItems:'center',justifyContent:'center'},input:{minHeight:48,borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,color:C.text,backgroundColor:C.inputBg,paddingHorizontal:12,fontSize:17},
 presetRow:{flexDirection:'row',gap:6},preset:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},presetText:{fontSize:12,color:C.text,fontWeight:'800'},warningCard:{borderLeftWidth:3,borderLeftColor:C.warning,padding:10,backgroundColor:C.warningSurface}
 });}

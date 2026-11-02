import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {Panel} from './Panel';
import {GameButton} from './GameButton';
import {ResourceArtwork} from './ResourceArtwork';
import {guildUpgradeComponentName} from '../theme/guild-upgrade-component-art';
import {gameAlert} from '../core/game-alerts';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {depositOnlineGuildBank,pendingGuildBankDeposit,discardPendingGuildBankDeposit,type PendingGuildBankDeposit} from '../online/guild-bank';

const title=(id:string)=>id==='gold'?'Gold':guildUpgradeComponentName(id)??id.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase());
export function OnlineGuildBankPanel({snapshot,onReload}:{snapshot:GuildTokenShopSnapshot;onReload:()=>Promise<unknown>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [selection,setSelection]=useState<string|null>(null),[quantity,setQuantity]=useState('100');
 const [pending,setPending]=useState<PendingGuildBankDeposit|null>(null);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>{let active=true;void pendingGuildBankDeposit().then(value=>{if(active)setPending(value)}).catch(reason=>{if(active)setError(String(reason))});return()=>{active=false}},[]);
 // Only unfulfilled material requirements of enabled, level-eligible upgrades
 // can receive bank deposits. Gold is listed only if an upgrade needs it.
 const outstanding=new Map<string,number>();
 for(const template of snapshot.constructionTemplates){
  if(!template.enabled||snapshot.guildLevel<template.guildLevel)continue;
  const progress=snapshot.construction.find(row=>row.templateId===template.id);
  if(progress?.completed)continue;
  const requirements=[...(template.gold>0?[{key:'gold',required:template.gold}]:[]),
   ...template.materials.map(material=>({key:material.materialKey,required:material.amount}))];
  for(const need of requirements){
   const remaining=Math.max(0,need.required-Math.max(0,progress?.resources[need.key]??0));
   if(remaining>0)outstanding.set(need.key,(outstanding.get(need.key)??0)+remaining);
  }
 }
 const balance=(id:string)=>snapshot.bank?.balances.find(row=>row.resourceId===id)?.amount??0;
 const depositCapacity=(id:string)=>Math.max(0,(outstanding.get(id)??0)-balance(id));
 const resources=[...new Set([...outstanding.keys(),...(snapshot.bank?.balances??[]).filter(row=>row.amount>0).map(row=>row.resourceId)])]
  .sort((a,b)=>a==='gold'?-1:b==='gold'?1:a.localeCompare(b));
 const selected=selection&&depositCapacity(selection)>0?selection:null;
 const amount=Number(quantity),valid=!!selected&&Number.isSafeInteger(amount)&&amount>0&&amount<=1000000&&amount<=depositCapacity(selected);
 const deposit=async(input:{resourceId:string;amount:number})=>{
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const response=await depositOnlineGuildBank(input);
   setPending(null);setSelection(null);
   setNotice(response.alreadyProcessed?'Previous deposit confirmed. No second deduction.':
    input.amount.toLocaleString()+' '+title(input.resourceId)+' deposited into the Guild Bank.');
   await onReload();
  }catch(reason){
   setError(reason instanceof Error?reason.message:'Unable to confirm deposit.');
   try{setPending(await pendingGuildBankDeposit())}catch{/* Keep error until retry. */}
  }finally{setBusy(false)}
 };
 const discard=()=>gameAlert.alert('Discard saved deposit?',
  'Only discard after checking the Guild Bank balance. If the previous request succeeded, a new deposit would spend resources again.',
  [{text:'Keep receipt',style:'cancel'},{text:'Discard local retry',style:'destructive',
   onPress:()=>void discardPendingGuildBankDeposit().then(()=>setPending(null)).catch(reason=>setError(String(reason)))}]);
 return <Panel>
  <Text style={s.kicker}>GUILD BANK</Text>
  <Text style={s.heading}>Shared supplies</Text>
  <Text style={s.help}>Members deposit Gold and materials. Construction spends only Guild Bank stock — never another member's inventory. Deposits are permanent and cannot be withdrawn.</Text>
  {snapshot.bank===null?<Text style={s.warning}>Guild Bank is temporarily unavailable. Deposits are disabled until the server confirms balances.</Text>:null}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.success}>{notice}</Text>}
  {pending?<View style={s.pending}>
   <Text style={s.name}>Pending deposit</Text>
   <Text style={s.help}>{pending.amount.toLocaleString()} {title(pending.resourceId)}. Recheck the original receipt to avoid a duplicate charge.</Text>
   <View style={s.row}><GameButton compact title="Retry receipt" disabled={busy} loading={busy} onPress={()=>deposit(pending)}/>
    <GameButton compact title="Discard local retry" tone="secondary" disabled={busy} onPress={discard}/></View>
  </View>:null}
  {!resources.length?<Text style={s.help}>No construction supplies are needed by currently available upgrades.</Text>:null}
  <View style={s.bankGrid}>
   {resources.map(id=><Pressable key={id} accessibilityRole="button" accessibilityLabel={title(id)+', '+balance(id).toLocaleString()+' in Guild Bank. Deposit resource.'}
    accessibilityState={{selected:selected===id,disabled:busy||!!pending||snapshot.bank===null||depositCapacity(id)<=0}}
    disabled={busy||!!pending||snapshot.bank===null||depositCapacity(id)<=0}
    onPress={()=>{setSelection(selected===id?null:id);setQuantity(id==='gold'?'1000':'100')}}
    style={[s.bankSlot,selected===id&&s.bankSlotSelected]}>
    <Text numberOfLines={1} style={s.slotName}>{title(id)}</Text>
    {id==='gold'?<View style={s.goldIcon}><Text style={s.goldGlyph}>G</Text></View>:<ResourceArtwork itemId={id} size={40} framed/>}
    <Text numberOfLines={1} style={s.slotAmount}>{balance(id).toLocaleString()} in bank</Text>
    <Text numberOfLines={1} style={s.slotNeed}>{depositCapacity(id)>0?depositCapacity(id).toLocaleString()+' needed':'Fully funded'}</Text>
   </Pressable>)}
  </View>
  {selected&&!pending&&snapshot.bank!==null?<View style={s.entry}>
   <Text style={s.name}>Deposit {title(selected)}</Text>
   <Text style={s.meta}>Only {depositCapacity(selected).toLocaleString()} more needed by available upgrades. Deposits are permanent.</Text>
   <View style={s.row}><TextInput value={quantity} onChangeText={setQuantity} accessibilityLabel={'Deposit '+title(selected)}
    keyboardType="number-pad" selectTextOnFocus maxLength={7} style={s.input}/>
    <GameButton compact title={busy?'Depositing…':'Confirm deposit'} disabled={busy||!valid} loading={busy}
     onPress={()=>deposit({resourceId:selected,amount})}/></View>
   <View style={s.row}>{[10,100,1000].map(n=><Pressable key={n} accessibilityRole="button"
    onPress={()=>setQuantity(String(Math.min(n,depositCapacity(selected))))} style={s.preset}><Text style={s.meta}>{Math.min(n,depositCapacity(selected)).toLocaleString()}</Text></Pressable>)}</View>
  </View>:null}
  {snapshot.bank&&snapshot.bank.activity.length>0?<View style={s.history}>
   <Text style={s.name}>Recent bank activity</Text>
   {snapshot.bank.activity.slice(0,5).map((item,index)=><View key={index} style={s.historyRow}>
    <Text style={s.meta}>{item.kind==='deposit'?(item.mine?'You deposited':'Member deposited'):'Construction used'} · {title(item.resourceId)}</Text>
    <Text style={[s.name,{color:item.kind==='deposit'?C.good:C.info}]}>{item.kind==='deposit'?'+':'−'}{item.amount.toLocaleString()}</Text>
   </View>)}
  </View>:null}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 kicker:{fontSize:11,fontWeight:'900',color:C.accent,letterSpacing:1},
 heading:{fontSize:18,fontWeight:'900',color:C.text,marginTop:4},
 help:{fontSize:12,lineHeight:18,color:C.muted,marginTop:6},
 warning:{color:C.warning,fontSize:12,marginTop:9},
 error:{color:C.bad,fontSize:12,marginTop:9},
 success:{color:C.good,fontSize:12,marginTop:9},
 bankGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:12},bankSlot:{width:'23%',minWidth:69,flexGrow:1,alignItems:'center',justifyContent:'space-between',minHeight:91,paddingVertical:7,paddingHorizontal:3,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2,gap:4},bankSlotSelected:{borderColor:C.accent,backgroundColor:C.selection},slotName:{fontSize:10,fontWeight:'800',textAlign:'center',color:C.text},slotAmount:{fontSize:11,fontWeight:'900',color:C.info},slotNeed:{fontSize:9,textAlign:'center',color:C.muted},
 row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},
 flex:{flex:1,minWidth:100},
 name:{fontSize:13,fontWeight:'800',color:C.text},
 meta:{fontSize:11,color:C.muted},
 entry:{marginTop:10,padding:9,backgroundColor:C.panel2,borderRadius:9,gap:8},
 input:{minWidth:85,flex:1,minHeight:42,paddingHorizontal:10,borderRadius:8,borderWidth:1,borderColor:C.lineStrong,color:C.text,backgroundColor:C.inputBg},
 preset:{paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:C.line,borderRadius:8},
 goldIcon:{width:36,height:36,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:C.accentSurface},
 goldGlyph:{fontWeight:'900',color:C.accent,fontSize:17},
 pending:{padding:10,backgroundColor:C.panel2,borderColor:C.warning,borderWidth:1,borderRadius:10,marginTop:9,gap:6},
 history:{marginTop:14,gap:7},historyRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
 });}

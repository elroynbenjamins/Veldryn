import {useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameButton} from './GameButton';
import {Panel} from './Panel';
import {gameAlert} from '../core/game-alerts';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {discardPendingGuildConstructionDonation,donateOnlineGuildConstruction,
 pendingGuildConstructionDonation,type PendingGuildDonation} from '../online/guild-construction';

function resourceName(key:string){
 if(key==='gold')return 'Gold';
 return key.toLowerCase().split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
}

/** Server-owned gold/items are deducted only inside the atomic donation RPC.
 * This component never mutates local inventory optimistically.
 */
export function OnlineGuildConstructionPanel({
 snapshot,onRewardsChanged,onReload,
}:{
 snapshot:GuildTokenShopSnapshot;
 onRewardsChanged?:()=>void|Promise<unknown>;
 onReload?:()=>void|Promise<unknown>;
}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const [selected,setSelected]=useState<{templateId:string;resourceId:string}|null>(null);
 const [quantity,setQuantity]=useState('100'),[busy,setBusy]=useState(false);
 const [pending,setPending]=useState<PendingGuildDonation|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  let active=true;
  void pendingGuildConstructionDonation().then(value=>{if(active)setPending(value);})
   .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:'Could not restore pending donation.');});
  return()=>{active=false;};
 },[]);
 const donate=async(input:{templateId:string;resourceId:string;amount:number})=>{
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await donateOnlineGuildConstruction(input);
   setPending(null);
   setNotice(result.alreadyProcessed?'Previous donation confirmed. No second deduction.':
    result.completed?'Donation accepted. Guild construction is complete!':'Donation accepted. Thank you for helping your guild.');
   await onRewardsChanged?.();
   await onReload?.();
  }catch(reason){
   setError(reason instanceof Error?reason.message:'Donation could not be confirmed. Retry your saved request.');
   try{setPending(await pendingGuildConstructionDonation());}catch{/* Retain existing receipt state. */}
  }finally{setBusy(false);}
 };
 const confirmDiscard=()=>gameAlert.alert(
  'Discard pending donation?',
  'Only discard after checking Guild Construction and your balances. If the earlier request succeeded, a new request could spend resources again.',
  [{text:'Keep request',style:'cancel'},
   {text:'Discard local retry',style:'destructive',onPress:()=>void discardPendingGuildConstructionDonation().then(()=>setPending(null)).catch(reason=>setError(String(reason)))}],
 );
 return <Panel>
  <Text style={s.kicker}>GUILD CONSTRUCTION</Text>
  <Text style={s.title}>Build something together</Text>
  <Text style={s.copy}>Permanent guild cosmetics need collective Gold and materials. Construction never blocks ordinary Guild levels or Guild XP.</Text>
  <Text style={s.note}>Only released projects accept donations. All contributions are permanent and verified on the server.</Text>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}
  {pending?<View style={s.pending}>
   <Text style={s.projectName}>Previous donation needs confirmation</Text>
   <Text style={s.copy}>{pending.amount.toLocaleString()} {resourceName(pending.resourceId)} · {resourceName(pending.templateId)}</Text>
   <View style={s.actions}>
    <GameButton compact title={busy?'Checking…':'Retry same receipt'} disabled={busy} onPress={()=>void donate(pending)}/>
    <GameButton compact title="Discard local retry" tone="secondary" disabled={busy} onPress={confirmDiscard}/>
   </View>
  </View>:null}
  {snapshot.constructionTemplates.map(template=>{
   const row=snapshot.construction.find(p=>p.templateId===template.id);
   const requirements=[{key:'gold',required:template.gold},...template.materials.map(material=>({key:material.materialKey,required:material.amount}))];
   const completion=requirements.length?requirements.reduce((sum,res)=>sum+Math.min(1,Math.max(0,(row?.resources[res.key]??0)/res.required)),0)/requirements.length:0;
   const unlocked=snapshot.guildLevel>=template.guildLevel;
   const canDonate=unlocked&&template.enabled&&!row?.completed&&!pending;
   const selectedHere=selected?.templateId===template.id;
   const chosen=requirements.find(res=>res.key===selected?.resourceId);
   const remaining=chosen?chosen.required-Math.max(0,row?.resources[chosen.key]??0):0;
   const donationAmount=Number(quantity);
   const validQuantity=Number.isSafeInteger(donationAmount)&&donationAmount>0
    &&donationAmount<=remaining&&donationAmount<=1000000;
   return <View key={template.id} style={s.project}>
    <View style={s.head}><View style={s.flex}>
     <Text style={s.projectName}>{resourceName(template.id)}</Text>
     <Text style={s.projectMeta}>Guild Level {template.guildLevel} · {row?.completed?'Completed':!unlocked?'Guild level locked':template.enabled?'Donations open':'Coming soon'}</Text>
    </View><Text style={s.percent}>{Math.round(completion*100)}%</Text></View>
    {requirements.map(res=>{
     const amount=Math.max(0,row?.resources[res.key]??0),pct=res.required?Math.min(100,Math.round(amount/res.required*100)):100;
     const active=selectedHere&&selected.resourceId===res.key;
     return <Pressable key={res.key} disabled={!canDonate||amount>=res.required}
      accessibilityRole="button" accessibilityState={{selected:active,disabled:!canDonate||amount>=res.required}}
      accessibilityLabel={`Donate ${resourceName(res.key)} to ${resourceName(template.id)}`}
      onPress={()=>{setSelected({templateId:template.id,resourceId:res.key});setQuantity(res.key==='gold'?'1000':'100');}}
      style={[s.resource,active&&s.resourceSelected]}>
      <View style={s.head}><Text style={s.resourceName}>{resourceName(res.key)}</Text><Text style={s.resourceAmount}>{amount.toLocaleString()} / {res.required.toLocaleString()}</Text></View>
      <View style={s.track}><View style={[s.fill,{width:`${pct}%` as `${number}%`}]}/></View>
     </Pressable>;
    })}
    {canDonate&&selectedHere&&chosen&&remaining>0?<View style={s.donationControls}>
     <Text style={s.projectMeta}>Contribute {resourceName(chosen.key)} · {remaining.toLocaleString()} still needed</Text>
     <View style={s.actions}>
      <TextInput accessibilityLabel="Donation amount" value={quantity} onChangeText={setQuantity}
       keyboardType="number-pad" maxLength={7} selectTextOnFocus style={s.input}/>
      <GameButton compact title={busy?'Saving…':'Donate'} disabled={busy||!validQuantity}
       onPress={()=>void donate({templateId:template.id,resourceId:chosen.key,amount:donationAmount})}/>
     </View>
     <View style={s.actions}>{[10,100,1000].map(value=><Pressable key={value} onPress={()=>setQuantity(String(Math.min(value,remaining,1000000)))}
      accessibilityRole="button" style={s.preset}><Text style={s.presetText}>{value.toLocaleString()}</Text></Pressable>)}</View>
    </View>:null}
    <Text style={s.unlock}>{row?.completed?'Guild reward unlocked':`Reward: ${resourceName(template.unlockId)}`}</Text>
   </View>;
  })}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 kicker:{fontSize:9,color:C.accent,fontWeight:'900',letterSpacing:.8},
 title:{fontSize:17,color:C.text,fontWeight:'900',marginTop:3},
 copy:{fontSize:11,color:C.muted,lineHeight:16,marginTop:7},
 note:{fontSize:10,color:C.warning,marginTop:10,lineHeight:14},
 error:{color:C.bad,fontSize:11,marginTop:8},
 notice:{color:C.good,fontSize:11,marginTop:8},
 pending:{padding:10,borderWidth:1,borderRadius:9,borderColor:C.warning,backgroundColor:C.panel2,gap:7,marginTop:10},
 project:{marginTop:12,padding:11,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2,gap:8},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 flex:{flex:1},projectName:{fontSize:13,color:C.text,fontWeight:'800'},projectMeta:{fontSize:10,color:C.info,marginTop:3},
 percent:{fontSize:17,color:C.accent,fontWeight:'900'},
 resource:{gap:5,padding:4,borderWidth:1,borderColor:'transparent',borderRadius:8},
 resourceSelected:{borderColor:C.accent},
 resourceName:{fontSize:10,color:C.text,fontWeight:'700'},
 resourceAmount:{fontSize:9,color:C.muted},track:{height:5,borderRadius:4,overflow:'hidden',backgroundColor:C.panel},
 fill:{height:'100%',backgroundColor:C.accent},unlock:{color:C.good,fontSize:10,fontWeight:'700'},
 actions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 donationControls:{gap:8,padding:8,borderRadius:8,backgroundColor:C.panel},
 input:{minWidth:90,minHeight:40,flex:1,borderWidth:1,borderColor:C.lineStrong,borderRadius:7,paddingHorizontal:9,color:C.text,backgroundColor:C.inputBg},
 preset:{paddingHorizontal:12,paddingVertical:7,borderWidth:1,borderColor:C.lineStrong,borderRadius:7},
 presetText:{color:C.info,fontSize:10,fontWeight:'800'},
 });}

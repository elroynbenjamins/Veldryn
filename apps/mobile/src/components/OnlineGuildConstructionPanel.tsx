import {useEffect,useMemo,useState} from 'react';
import {useGuildConstructionUiText} from '../i18n/guild-construction-ui';
import {Image,Pressable,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {GameButton} from './GameButton';
import {ResourceArtwork} from './ResourceArtwork';
import {guildUpgradeComponentArtwork,guildUpgradeComponentName} from '../theme/guild-upgrade-component-art';
import {Panel} from './Panel';
import {gameAlert} from '../core/game-alerts';
import {guildConstructionBlueprint,GUILD_CONSTRUCTION_BLUEPRINTS} from '../content/guild-construction-blueprints';
import {guildFacilityArtwork} from '../theme/guild-remaster-art';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {GuildTokenShopSnapshot} from '../online/guild-token-shop';
import {discardPendingGuildConstructionDonation,donateOnlineGuildConstruction,
 pendingGuildConstructionDonation,type PendingGuildDonation} from '../online/guild-construction';

const BUILDINGS=[
 {id:'hall',title:'Hall',art:'banner_gallery' as const},
 {id:'forge',title:'Forge',art:'workshop' as const},
 {id:'library',title:'Library',art:'training_room' as const},
 {id:'treasury',title:'Treasury',art:'trophy_room' as const},
 {id:'war_room',title:'War Room',art:'raid_memorial' as const},
 {id:'expedition',title:'Lodge',art:'expedition_board' as const},
] as const;
function resourceName(key:string){
 if(key==='gold')return 'Gold';
 return guildUpgradeComponentName(key)??key.toLowerCase().split('_').map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
}

/** Server-owned gold/items are deducted only inside the atomic donation RPC.
 * This component never mutates local inventory optimistically.
 */
export function OnlineGuildConstructionPanel({
 snapshot,onRewardsChanged,onReload,initialBuilding,initialSelection,onOpenBank,
}:{
 snapshot:GuildTokenShopSnapshot;
 onRewardsChanged?:()=>void|Promise<unknown>;
 onReload?:()=>void|Promise<unknown>;
 initialBuilding?:string;
 initialSelection?:{templateId:string;resourceId:string};
 onOpenBank?:(resourceId:string,building:string,selection:{templateId:string;resourceId:string})=>void;
}){
 const ui=useGuildConstructionUiText(),C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{width,fontScale}=useWindowDimensions();
 const compactLayout=width<390||fontScale>=1.25;
 const [selected,setSelected]=useState<{templateId:string;resourceId:string}|null>(initialSelection??null);
 const [selectedBuilding,setSelectedBuilding]=useState<(typeof BUILDINGS)[number]['id']>(()=>{
  const remembered=BUILDINGS.find(building=>building.id===initialBuilding);
  if(remembered)return remembered.id;
  const active=snapshot.constructionTemplates.find(template=>template.enabled&&template.guildLevel<=snapshot.guildLevel&&!snapshot.construction.some(row=>row.templateId===template.id&&row.completed));
  return BUILDINGS.find(building=>active?.id.startsWith('construction_'+building.id+'_'))?.id??'hall';
 });
 const [quantity,setQuantity]=useState(()=>{
  if(!initialSelection)return '100';
  const template=snapshot.constructionTemplates.find(row=>row.id===initialSelection.templateId);
  const required=initialSelection.resourceId==='gold'?template?.gold??0:template?.materials.find(row=>row.materialKey===initialSelection.resourceId)?.amount??0;
  const committed=snapshot.construction.find(row=>row.templateId===initialSelection.templateId)?.resources[initialSelection.resourceId]??0;
  const available=snapshot.bank?.balances.find(row=>row.resourceId===initialSelection.resourceId)?.amount??0;
  return String(Math.max(1,Math.min(100,Math.max(0,required-committed),available)));
 }),[busy,setBusy]=useState(false);
 const [pending,setPending]=useState<PendingGuildDonation|null>(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{
  let active=true;
  void pendingGuildConstructionDonation().then(value=>{if(active)setPending(value);})
   .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:ui('Could not restore pending donation.'));});
  return()=>{active=false;};
 },[]);
 const donate=async(input:{templateId:string;resourceId:string;amount:number})=>{
  if(busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await donateOnlineGuildConstruction(input);
   setPending(null);
   setNotice(result.alreadyProcessed?ui('Previous project allocation confirmed. No second deduction.'):
    result.completed?ui('Guild Bank allocation accepted. Construction complete!'):ui('Guild Bank supplies allocated to construction.'));
   await onRewardsChanged?.();
   await onReload?.();
  }catch(reason){
   setError(reason instanceof Error?reason.message:ui('Donation could not be confirmed. Retry your saved request.'));
   try{setPending(await pendingGuildConstructionDonation());}catch{/* Retain existing receipt state. */}
  }finally{setBusy(false);}
 };
 const confirmFunding=(templateId:string,resourceId:string,amount:number)=>gameAlert.alert(
  ui('Allocate Guild Bank materials?'),
  ui('Allocate {amount} {resource} to {upgrade}? This Guild Bank allocation cannot be reversed.',{amount:amount.toLocaleString(),resource:resourceName(resourceId),upgrade:guildConstructionBlueprint(templateId)?.name??ui('this upgrade')}),
  [{text:ui('Cancel'),style:'cancel'},{text:ui('Allocate'),onPress:()=>void donate({templateId,resourceId,amount})}],
 );
 const confirmDiscard=()=>gameAlert.alert(
  ui('Discard pending donation?'),
  ui('Only discard after checking Guild Construction and your balances. If the earlier request succeeded, a new request could spend resources again.'),
  [{text:ui('Keep request'),style:'cancel'},
   {text:ui('Discard local retry'),style:'destructive',onPress:()=>void discardPendingGuildConstructionDonation().then(()=>setPending(null)).catch(reason=>setError(String(reason)))}],
 );
 return <Panel>
  <Text style={s.kicker}>{ui('GUILD CONSTRUCTION')}</Text>
  <Text accessibilityRole="header" style={s.title}>{ui('Build something together')}</Text>
  <Text style={s.copy}>{ui('Deposit resources into the Guild Bank, then allocate them here. Deposits and allocations cannot be reversed.')}</Text>
  <View style={s.buildingGrid}>{BUILDINGS.map(building=><Pressable key={building.id} accessibilityRole="button" accessibilityLabel={ui('View {title} upgrades',{title:ui(building.title)})} accessibilityState={{selected:selectedBuilding===building.id}} onPress={()=>{setSelectedBuilding(building.id);setSelected(null)}} style={({pressed})=>[s.building,compactLayout&&s.buildingWide,{borderColor:selectedBuilding===building.id?C.selectionLine:C.lineStrong,backgroundColor:selectedBuilding===building.id?C.selection:C.panel2},pressed&&s.pressed]}><Image source={guildFacilityArtwork(building.art)} style={s.buildingArt} resizeMode="contain" accessible={false}/><Text style={[s.buildingName,{color:selectedBuilding===building.id?C.text:C.muted}]}>{ui(building.title)}</Text></Pressable>)}</View>
  {snapshot.unavailableSections?.includes('constructionCosts')
   ?<Text style={s.error}>{ui('Current Guild Construction prices are unavailable. Refresh before funding.')}</Text>
   :null}
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {notice?<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>:null}
  {pending?<View style={s.pending}>
   <Text style={s.projectName}>{ui('Previous donation needs confirmation')}</Text>
   <Text style={s.copy}>{pending.amount.toLocaleString()} {resourceName(pending.resourceId)} · {resourceName(pending.templateId)}</Text>
   <View style={s.actions}>
    <GameButton compact title={ui(busy?'Checking…':'Retry same receipt')} disabled={busy} onPress={()=>donate(pending)}/>
    <GameButton compact title={ui("Discard local retry")} tone="secondary" disabled={busy} onPress={confirmDiscard}/>
   </View>
  </View>:null}
  {snapshot.constructionTemplates.filter(template=>template.id.startsWith('construction_'+selectedBuilding+'_')&&(template.enabled||snapshot.construction.some(row=>row.templateId===template.id&&row.completed))).map(template=>{
   const row=snapshot.construction.find(p=>p.templateId===template.id);
   const requirements=[...(template.gold>0?[{key:'gold',required:template.gold}]:[]),...template.materials.map(material=>({key:material.materialKey,required:material.amount}))];
   // Weighted by units actually allocated, matching the Guild Hall's overview meter.
  // Averaging each resource bar would overstate progress for tiny requirements.
  const totalRequired=requirements.reduce((sum,res)=>sum+res.required,0);
  const totalFunded=requirements.reduce((sum,res)=>sum+Math.min(res.required,Math.max(0,row?.resources[res.key]??0)),0);
  const completion=totalRequired>0?totalFunded/totalRequired:row?.completed?1:0;
   const unlocked=snapshot.guildLevel>=template.guildLevel;
   const canDonate=unlocked&&template.enabled&&!row?.completed&&!pending&&snapshot.bank!==null;
   const selectedHere=selected?.templateId===template.id;
   const chosen=requirements.find(res=>res.key===selected?.resourceId);
   const remaining=chosen?chosen.required-Math.max(0,row?.resources[chosen.key]??0):0;
   const bankAmount=chosen?(snapshot.bank?.balances.find(b=>b.resourceId===chosen.key)?.amount??0):0;
   const donationAmount=Number(quantity);
   const validQuantity=Number.isSafeInteger(donationAmount)&&donationAmount>0
    &&donationAmount<=remaining&&donationAmount<=bankAmount&&donationAmount<=1000000;
   return <View key={template.id} style={s.project}>
    <View style={[s.head,compactLayout&&s.compactHead]}><View style={s.flex}>
     <Text style={s.projectName}>{resourceName(template.id)}</Text>
     <Text style={s.projectMeta}>{ui('Guild Level {level}',{level:template.guildLevel})} · {ui(row?.completed?'Completed':!unlocked?'Guild level locked':template.enabled?'Donations open':'Coming soon')}</Text>
     {template.costMemberCount?<Text style={s.projectMeta}>{ui(template.costMemberCount===1?'Costs for {count} member':'Costs for {count} members',{count:template.costMemberCount})}</Text>:null}
    </View><Text style={s.percent}>{Math.round(completion*100)}%</Text></View>
    {requirements.map(res=>{
     const amount=Math.max(0,row?.resources[res.key]??0),pct=res.required?Math.min(100,Math.round(amount/res.required*100)):100;
     const active=selectedHere&&selected?.resourceId===res.key;
     return <Pressable key={res.key} disabled={!canDonate||amount>=res.required}
      accessibilityRole="button" accessibilityState={{selected:active,disabled:!canDonate||amount>=res.required}}
      accessibilityLabel={ui('Donate {resource} to {upgrade}',{resource:resourceName(res.key),upgrade:resourceName(template.id)})}
      onPress={()=>{setSelected({templateId:template.id,resourceId:res.key});const available=snapshot.bank?.balances.find(item=>item.resourceId===res.key)?.amount??0;setQuantity(String(Math.min(res.key==='gold'?1000:100,res.required-amount,available)));}}
      style={[s.resource,active&&s.resourceSelected]}>
      <View style={[s.head,compactLayout&&s.compactHead]}>
       {res.key==='gold'?<Text style={[s.resourceName,{color:C.accent}]}>◈</Text>:guildUpgradeComponentArtwork(res.key)?<Image source={guildUpgradeComponentArtwork(res.key)} style={s.materialIcon} resizeMode="contain" accessible={false}/>:<ResourceArtwork itemId={res.key} size={28} framed/>}
       <Text style={[s.resourceName,{flex:1}]}>{resourceName(res.key)}</Text>
       <Text style={s.resourceAmount}>{amount.toLocaleString()} / {res.required.toLocaleString()}</Text>
      </View>
      <Text style={s.resourceMeta}>{ui('Bank {bank} · Allocated {allocated} · Need {needed}',{
       bank:(snapshot.bank?.balances.find(item=>item.resourceId===res.key)?.amount??0).toLocaleString(),
       allocated:amount.toLocaleString(),needed:Math.max(0,res.required-amount).toLocaleString()})}</Text>
      <View style={s.track}><View style={[s.fill,{width:`${pct}%` as `${number}%`}]}/></View>
     </Pressable>;
    })}
    {canDonate&&selectedHere&&chosen&&remaining>0?<View style={s.donationControls}>
     <Text style={s.projectMeta}>{ui('{resource} · Need {needed} · Bank {bank}',{resource:resourceName(chosen.key),needed:remaining.toLocaleString(),bank:bankAmount.toLocaleString()})}</Text>
     <View style={s.actions}>
      <TextInput accessibilityLabel={ui("Donation amount")} value={quantity} onChangeText={setQuantity}
       keyboardType="number-pad" maxLength={7} selectTextOnFocus style={s.input}/>
      <GameButton compact title={ui(busy?'Funding…':'Fund project')} disabled={busy||!validQuantity}
       onPress={()=>confirmFunding(template.id,chosen.key,donationAmount)}/>
     </View>
     <View style={s.actions}>{[10,100,'Max' as const].map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={ui('Set funding amount to {amount}',{amount:value==='Max'?ui('Max'):value})} disabled={busy} onPress={()=>setQuantity(String(Math.min(value==='Max'?1000000:value,remaining,bankAmount,1000000)))} style={s.preset}><Text style={s.presetText}>{value==='Max'?ui('Max'):value.toLocaleString()}</Text></Pressable>)}</View>
      {bankAmount<remaining&&onOpenBank?<GameButton compact tone="secondary" title={ui('Deposit {resource} into Guild Bank',{resource:resourceName(chosen.key)})} disabled={busy}
       onPress={()=>onOpenBank(chosen.key,selectedBuilding,{templateId:template.id,resourceId:chosen.key})}/>:null}
    </View>:null}
    <Text style={s.unlock}>{row?.completed?ui('Guild upgrade completed'):ui('Reward: {reward}',{reward:guildConstructionBlueprint(template.id)?.benefit??resourceName(template.unlockId)})}</Text>
    {!template.enabled?<Text style={s.projectMeta}>{ui('Awaiting construction release')}</Text>:null}
   </View>;
  })}
  <Text style={s.kicker}>{ui('UPGRADE ROADMAP')}</Text>
  {GUILD_CONSTRUCTION_BLUEPRINTS.filter(plan=>plan.id.startsWith('construction_'+selectedBuilding+'_')&&!snapshot.constructionTemplates.some(template=>template.id===plan.id&&template.enabled)).map(plan=><View key={plan.id} style={s.lockedTier}><View style={[s.head,compactLayout&&s.compactHead]}><Text style={s.projectName}>{plan.name}</Text><Text style={s.projectMeta}>{ui('Guild Lv {level}',{level:plan.requiredGuildLevel})}</Text></View><Text style={s.unlock}>{plan.benefit}</Text><Text style={s.projectMeta}>{ui('Coming soon')}</Text></View>)}
 </Panel>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 kicker:{fontSize:11,color:C.accent,fontWeight:'900',letterSpacing:1,marginTop:8},
 buildingGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:13},
 building:{width:'31%',flexGrow:1,minHeight:80,alignItems:'center',justifyContent:'center',gap:5,padding:6,borderWidth:1,borderRadius:9},
  buildingWide:{width:'47%',minHeight:88},
 buildingArt:{width:38,height:38},buildingName:{fontSize:11,fontWeight:'800',textAlign:'center'},pressed:{opacity:.72},
 lockedTier:{marginTop:7,gap:6,borderColor:C.line,borderWidth:1,borderRadius:9,padding:10,backgroundColor:C.panel2},
 title:{fontSize:18,lineHeight:24,color:C.text,fontWeight:'900',marginTop:3},
 copy:{fontSize:12,color:C.muted,lineHeight:17,marginTop:7},
 note:{fontSize:12,color:C.warning,marginTop:10,lineHeight:17},
 error:{color:C.bad,fontSize:12,marginTop:8},
 notice:{color:C.good,fontSize:12,marginTop:8},
 pending:{padding:10,borderWidth:1,borderRadius:9,borderColor:C.warning,backgroundColor:C.panel2,gap:7,marginTop:10},
 project:{marginTop:12,padding:12,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2,gap:8},
 head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},compactHead:{flexWrap:'wrap',alignItems:'flex-start'},
 flex:{flex:1},projectName:{fontSize:14,lineHeight:19,color:C.text,fontWeight:'800'},projectMeta:{fontSize:12,lineHeight:17,color:C.info,marginTop:3},
 percent:{fontSize:18,lineHeight:22,color:C.accent,fontWeight:'900'},
 resource:{gap:6,padding:8,minHeight:48,borderWidth:1,borderColor:'transparent',borderRadius:8},
 materialIcon:{width:28,height:28},resourceSelected:{borderColor:C.accent},
 resourceName:{fontSize:12,lineHeight:16,color:C.text,fontWeight:'700'},
 resourceAmount:{fontSize:11,color:C.muted,flexShrink:1},resourceMeta:{fontSize:11,lineHeight:16,color:C.muted},track:{height:5,borderRadius:4,overflow:'hidden',backgroundColor:C.panel},
 fill:{height:'100%',backgroundColor:C.accent},unlock:{color:C.good,fontSize:12,fontWeight:'700'},
 actions:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:8},
 donationControls:{gap:8,padding:8,borderRadius:8,backgroundColor:C.panel},
 input:{minWidth:90,minHeight:40,flex:1,borderWidth:1,borderColor:C.lineStrong,borderRadius:7,paddingHorizontal:9,color:C.text,backgroundColor:C.inputBg},
 preset:{minHeight:44,minWidth:55,alignItems:'center',justifyContent:'center',paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:C.lineStrong,borderRadius:8},
 presetText:{color:C.info,fontSize:12,fontWeight:'800'},
 });}

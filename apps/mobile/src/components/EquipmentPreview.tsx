import {useEffect,useMemo,useState} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {itemDef} from '../content/items';
import {displayPercent,displayStat} from '../core/stat-display';
import {gearEnhancement,gemSocketState} from '../core/equipment-enhancement';
import {previewEquipment} from '../core/equipment-preview';
import {equipmentComparison} from '../core/equipment-comparison';
import {equipmentTradeOff} from '../core/equipment-trade-off';
import {craftedGearDisplayQuality,craftedGearInstances,equippedCraftedGearRarity} from '../core/crafted-gear-instances';
import {WEAPON_BONUS_LABELS,weaponBonusCompactLine} from '../core/weapon-bonus-rolls';
import {equipmentBonusCompactLine} from '../core/equipment-bonus-rolls';
import {weaponBonusComparisonRows,weaponBonusDisplayPercent,weaponBonusDisplayDelta} from '../core/weapon-bonus-display';
import {weaponBonusStatText,weaponBonusUiText} from '../i18n/weapon-bonus-ux';
import {StatHelpDisclosure} from './StatHelpDisclosure';
import type {StatHelpId} from '../i18n/stat-help';
import type {GameState} from '../core/types';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {equipmentPouchText} from '../i18n/equipment-pouch-ui';
import {EquipmentArtwork} from './EquipmentArtwork';
import {InventoryItemHeaderControls} from './InventoryItemHeaderControls';
import {GameButton} from './GameButton';
import {EquipmentDisposalStatus} from './EquipmentDisposalStatus';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Props={
 state:GameState;itemId:string|null;instanceId?:string|null;source?:'inventory'|'equipment_pouch';
 onClose:()=>void;onEquip?:()=>unknown|Promise<unknown>;onInspect?:()=>void;
 onStoreInGear?:()=>unknown|Promise<unknown>;canStoreInGear?:boolean;
 onMoveToBank?:()=>unknown|Promise<unknown>;onMoveToInventory?:()=>unknown|Promise<unknown>;
 onSell?:()=>void;onSalvage?:()=>void;canSell?:boolean;canSalvage?:boolean;
 sellBlockReason?:string;salvageBlockReason?:string;
 favorite?:boolean;locked?:boolean;onToggleFavorite?:()=>void|Promise<unknown>;onToggleLock?:()=>void|Promise<unknown>;
};

const percent=displayPercent;
function signed(value:number){const n=displayStat(value);return n===0?'—':n>0?'+'+n:String(n);}
function bonusPercent(bps:number){return bps===0?'—':(bps>0?'+':'')+(bps/100).toFixed(1)+'%';}
function bonusDifference(bps:number){return bps===0?'—':(bps>0?'+':'')+(bps/100).toFixed(1)+'%';}
function statColor(C:ThemeColors,delta:number){return delta>0?C.good:delta<0?C.bad:C.muted;}

/** Inventory's single, authoritative compare-before-equipping surface.
 * Every loadout stat and roll is visible; storage and disposal stay separated at the footer. */
export function EquipmentPreview({state,itemId,instanceId,source='inventory',onClose,onEquip,onInspect,favorite,locked,onToggleFavorite,onToggleLock,onSell,onSalvage,canSell=false,canSalvage=false,sellBlockReason,salvageBlockReason,onStoreInGear,canStoreInGear=false,onMoveToBank,onMoveToInventory}:Props){
 const {gt,gl,language}=useGameplayText();
 const gearText=(source:string)=>equipmentPouchText(state.settings.language,source);
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const {height,width,fontScale}=useWindowDimensions();
 const [busy,setBusy]=useState(false),[busyAction,setBusyAction]=useState<'equip'|'gear'|'bank'|'inventory'|null>(null),[error,setError]=useState('');
 useEffect(()=>{setBusy(false);setBusyAction(null);setError('');},[itemId,instanceId,source]);
 if(!itemId)return null;
 async function moveToBank(){
  if(!onMoveToBank||busy)return;
  setBusy(true);setBusyAction('bank');setError('');
  try{await onMoveToBank()}catch(cause){
   setError(cause instanceof Error?cause.message:gl('Action failed. Please try again.'));
  }finally{setBusyAction(null);setBusy(false)}
 } async function moveToInventory(){
  if(!onMoveToInventory||busy)return;
  setBusy(true);setBusyAction('inventory');setError('');
  try{await onMoveToInventory()}catch(cause){
   setError(cause instanceof Error?cause.message:gl('Action failed. Please try again.'));
  }finally{setBusyAction(null);setBusy(false)}
 }
 let projected:GameState;
 try{projected=previewEquipment(state,itemId,instanceId,source)}catch(cause){
  return <GameModalSurface visible reduceMotion={state.settings.reduceMotion} onClose={onClose}>
   <GameModalHeader title={gl('Compare equipment')} onClose={onClose}/>
   <View style={s.errorBox}>
    <Text style={s.note}>{gl(cause instanceof Error?cause.message:'Equipment unavailable')}</Text>
    {!!error?<Text accessibilityRole="alert" style={s.error}>{gl(error)}</Text>:null}
    {onMoveToInventory?<GameButton title={gearText('To Inventory')} tone="secondary" loading={busy&&busyAction==='inventory'} disabled={busy} onPress={()=>void moveToInventory()}/>:null}
    {onMoveToBank?<GameButton title={gearText('Move to Bank')} tone="secondary" loading={busy&&busyAction==='bank'} disabled={busy} onPress={()=>void moveToBank()}/>:null}
    <GameButton title={gl('Back to Inventory')} disabled={busy} onPress={onClose}/>
   </View>
  </GameModalSurface>;
 }
 const item=itemDef(itemId),slot=item.slot!;
 const comparison=equipmentComparison(state,projected),{before,after}=comparison,trade=equipmentTradeOff(before,after);
 const combatOnly=trade.grade==='neutral'&&(before.power!==after.power||comparison.secondary.length>0||comparison.effects.length>0);
 const instance=instanceId?craftedGearInstances(state).find(row=>row.id===instanceId):undefined;
 const rarity=rarityMeta(instance?.rarity??itemRarity(item));
 const enhancement=gearEnhancement(projected,itemId),sockets=gemSocketState(projected,itemId);
 const oldId=state.character?.equipment[slot],old=oldId?itemDef(oldId):undefined;
 const oldInstanceId=state.character?.equipmentInstanceIds?.[slot];
 const oldRecord=oldInstanceId?craftedGearInstances(state).find(row=>row.id===oldInstanceId):undefined;
 const oldRarity=old?rarityMeta(equippedCraftedGearRarity(state,slot)??itemRarity(old)):undefined;
 const weaponChanges=slot==='weapon'?weaponBonusComparisonRows(oldRecord?.weaponBonuses,instance?.weaponBonuses):[];
 const currentRolls=slot==='weapon'
   ?oldRecord?.weaponBonuses?.map(bonus=>({...bonus,short:weaponBonusCompactLine(bonus)}))??[]
   :oldRecord?.equipmentBonuses?.map(bonus=>({...bonus,short:equipmentBonusCompactLine(bonus)}))??[];
 const newRolls=slot==='weapon'
   ?instance?.weaponBonuses?.map(bonus=>({...bonus,short:weaponBonusCompactLine(bonus)}))??[]
   :instance?.equipmentBonuses?.map(bonus=>({...bonus,short:equipmentBonusCompactLine(bonus)}))??[];
 const bonusChanges=Array.from(new Set([...currentRolls,...newRolls].map(roll=>roll.stat))).map(stat=>({
   stat,before:currentRolls.find(roll=>roll.stat===stat)?.basisPoints??0,
   after:newRolls.find(roll=>roll.stat===stat)?.basisPoints??0,
 }));
 const oldRank=oldId?gearEnhancement(state,oldId).rank:0;
 const oldSockets=oldId?gemSocketState(state,oldId):undefined;
 const alreadyEquipped=oldId===itemId&&(instanceId?instanceId===oldInstanceId:!oldInstanceId);
 const blocked=state.character&&state.character.level<(item.requiredLevel??1)
  ?gl('Requires level')+' '+String(item.requiredLevel??1)
  :state.activity?.kind==='combat'&&slot!=='weapon'?gl('Stop combat before equipping')
  :undefined;
 const sets=comparison.sets;
 const stats=[
  {id:'attack',label:gl('Attack'),before:before.attack,after:after.attack},
  {id:'defense',label:gl('Defense'),before:before.defense,after:after.defense},
  {id:'health',label:gl('Max health'),before:before.hp,after:after.hp},
  {id:'power',label:gl('Power'),before:before.power,after:after.power},
 ];
 async function submit(){
  if(!onEquip||alreadyEquipped||blocked||busy)return;
  setBusy(true);setBusyAction('equip');setError('');
  try{await onEquip()}catch(cause){
   setError(cause instanceof Error?cause.message:gl('Action failed. Please try again.'));
  }finally{setBusyAction(null);setBusy(false)}
 }
 async function storeInGear(){
  if(!onStoreInGear||!canStoreInGear||busy)return;
  setBusy(true);setBusyAction('gear');setError('');
  try{await onStoreInGear()}catch(cause){
   setError(cause instanceof Error?cause.message:gl('Action failed. Please try again.'));
  }finally{setBusyAction(null);setBusy(false)}
 }
 const shortScreen=height<690||fontScale>=1.3;
 const compactBonusRows=width<380||fontScale>=1.2;
 const scrollWithActions=width<355||shortScreen||fontScale>=1.25;
 const stackFooterActions=width<355||fontScale>=1.25;
 // Storage and disposal remain visible instead of being hidden in a disclosure.
 const hasStorageActions=Boolean(onStoreInGear||onMoveToInventory||onMoveToBank);
 const hasDisposalActions=Boolean(onSell||onSalvage);
 const disposalBlocked=Boolean((onSell&&!canSell)||(onSalvage&&!canSalvage));
 const bonusChangeCount=slot==='weapon'?weaponChanges.filter(row=>row.deltaBps!==0).length:bonusChanges.filter(row=>row.before!==row.after).length;
 const gearSize=width<355?54:shortScreen?56:66;
 const footer=<View style={s.footer}>
   {!!error?<Text accessibilityRole="alert" style={s.error}>{gl(error)}</Text>:null}
   {!!blocked?<Text style={s.warning}>{blocked}</Text>:null}
   {onEquip?<GameButton title={alreadyEquipped?gl('Currently equipped'):busy&&busyAction==='equip'?gl('Equipping…'):old?gl('Swap Equipment'):gt('Equip {slot}',{slot:gl(slot)})}
    loading={busy&&busyAction==='equip'} disabled={alreadyEquipped||!!blocked||busy} onPress={()=>void submit()}/>:null}
   {hasStorageActions?<View style={[s.footerActionRow,stackFooterActions&&s.footerActionRowStacked]}>
    {onMoveToInventory?<View style={[s.footerActionCell,stackFooterActions&&s.footerActionCellStacked]}><GameButton compact title={gearText('To Inventory')} tone="secondary" loading={busy&&busyAction==='inventory'} disabled={busy} onPress={()=>void moveToInventory()}/></View>:null}
    {onMoveToBank?<View style={[s.footerActionCell,stackFooterActions&&s.footerActionCellStacked]}><GameButton compact title={gearText('Move to Bank')} tone="secondary" loading={busy&&busyAction==='bank'} disabled={busy} onPress={()=>void moveToBank()}/></View>:null}
    {onStoreInGear?<View style={[s.footerActionCell,stackFooterActions&&s.footerActionCellStacked]}><GameButton compact title={canStoreInGear?gearText('Store in Gear'):gearText('Gear storage full')} tone="secondary" disabled={!canStoreInGear||busy} loading={busy&&busyAction==='gear'} onPress={()=>void storeInGear()}/></View>:null}
   </View>:null}
   {hasDisposalActions?<View style={s.footerDisposal}>
    <View style={[s.footerActionRow,stackFooterActions&&s.footerActionRowStacked]}>
     {onSell?<View style={[s.footerActionCell,stackFooterActions&&s.footerActionCellStacked]}><GameButton compact title={gl('Sell copy')} tone="secondary" disabled={busy||!canSell} onPress={()=>onSell?.()}/></View>:null}
     {onSalvage?<View style={[s.footerActionCell,stackFooterActions&&s.footerActionCellStacked]}><GameButton compact title={gl('Salvage copy')} tone="danger" disabled={busy||!canSalvage} onPress={()=>onSalvage?.()}/></View>:null}
    </View>
    {disposalBlocked?<EquipmentDisposalStatus compact sellAllowed={canSell} salvageAllowed={canSalvage} sellReason={sellBlockReason} salvageReason={salvageBlockReason}/>:null}
   </View>:null}
  </View>;
 return <GameModalSurface visible onClose={busy?()=>{}:onClose} dismissOnBackdrop={!busy} reduceMotion={state.settings.reduceMotion}
  backdropLabel={gl('Close equipment comparison')}
  surfaceStyle={[s.surface,{height:Math.min(height*.89,shortScreen?620:710)}]}>
  <View style={s.compactHeader}>
    <View style={s.headerCopy}><Text style={s.headerEyebrow}>{gl('EQUIPMENT PREVIEW')}</Text><Text numberOfLines={1} style={[s.headerTitle,(width<355||fontScale>=1.25)&&{fontSize:16}]}>{gl('Compare & Swap')}</Text></View>
    <InventoryItemHeaderControls favorite={favorite} locked={locked} onFavorite={onToggleFavorite} onLock={onToggleLock} onClose={onClose} disabled={busy} closeLabel={gl('Close equipment comparison')}/>
   </View>
  <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.pair}>
    <View style={s.gearCard}>
     <Text style={s.kicker}>{gl('CURRENTLY EQUIPPED')}</Text>
     {old?<EquipmentArtwork item={old} rarity={oldRarity?.id} size={gearSize} framed={false}/>:<View style={[s.emptyArt,{height:gearSize,width:gearSize}]}><Text style={s.emptyMark}>+</Text></View>}
     <Text numberOfLines={2} style={[s.gearName,oldRarity&&{color:rarityNameColor(oldRarity.id,C.dark,C.text)}]}>{old?.name??gl('Empty slot')}{oldRank?' +'+oldRank:''}</Text>
     <Text style={s.meta}>{oldRarity?.label??gl(slot)}{oldRecord?' · Q'+craftedGearDisplayQuality(oldRecord):''}</Text>
    </View>
    <View style={[s.gearCard,s.newGearCard]}>
     <Text style={[s.kicker,{color:E.goldSoft}]}>{gl('NEW EQUIPMENT')}</Text>
     <EquipmentArtwork item={item} rarity={rarity.id} size={gearSize} framed={false}/>
     <Text numberOfLines={2} style={[s.gearName,{color:rarityNameColor(rarity.id,C.dark,C.text)}]}>{item.name}{enhancement.rank?' +'+enhancement.rank:''}</Text>
     <Text style={s.meta}>{rarity.label}{instance?' · Q'+craftedGearDisplayQuality(instance):''}</Text>
    </View>
   </View>
   <View style={[s.impact,trade.grade==='improvement'?s.impactGood:trade.grade==='downgrade'?s.impactBad:trade.grade==='tradeoff'?s.impactWarn:null]}>
    <View style={s.impactHead}>
     <Text style={[s.impactTitle,{color:trade.grade==='improvement'?C.good:trade.grade==='downgrade'?C.bad:trade.grade==='tradeoff'?C.warning:C.muted}]}>{combatOnly?gl('Other combat bonuses changed'):gl(trade.title)}</Text>
     <Text style={[s.impactPower,{color:statColor(C,after.power-before.power)}]}>{gl('Power')} {signed(after.power-before.power)}</Text>
    </View>
    {stats.slice(0,3).every(row=>displayStat(row.after-row.before)===0)?<Text style={s.impactText}>{gl('No visible Attack, Defense or Health change.')}</Text>:null}
    {oldSockets?.effectGemId!==sockets.effectGemId?<Text style={s.impactText}>{gl('Effect gem')}: {oldSockets?.effectGemId?itemDef(oldSockets.effectGemId).name:gl('Empty')} → {sockets.effectGemId?itemDef(sockets.effectGemId).name:gl('Empty')}</Text>:null}
    {bonusChangeCount>0?<Text style={s.impactText}>{gl('BONUS STATS')}: {bonusChangeCount}</Text>:null}
   </View>

   {sets.some(row=>row.after!==row.before)?<View style={s.setAlert}>
    <Text style={s.sectionTitle}>{gl('SET PROGRESS')}</Text>
    {sets.filter(row=>row.before!==row.after).map(row=><Text key={row.id} style={[s.setLine,{color:row.after<row.before?C.warning:C.good}]}>{row.tier} · {row.name}: {row.before} → {row.after}/10{row.milestones.map(m=>m.threshold===6?' · '+gl('6-piece trigger not active'):' · '+m.threshold+'pc '+(m.direction==='gained'?gl('bonus active'):gl('bonus lost'))).join('')}</Text>)}
   </View>:null}
   <View style={s.extra}>
   <View style={s.statPanel}>
    <StatHelpDisclosure key={itemId+':'+instanceId+':'+source} label={gl('TOTAL LOADOUT')} entries={[...stats.map(row=>({id:row.id as StatHelpId,label:row.label})),...([{id:'armor',stat:'armor'},{id:'critChance',stat:'critRate'},{id:'critDamage',stat:'critDamage'},{id:'accuracy',stat:'accuracy'},{id:'evasion',stat:'evasion'},{id:'haste',stat:'haste'}] as const).map(row=>({id:row.id,label:weaponBonusStatText(language,row.stat)}))]}/>
    <View style={s.statRow}><Text style={s.statLabel}>{gl('Stat')}</Text><Text style={s.statColumn}>{gl('Current')}</Text><Text style={s.statColumn}>{gl('New')}</Text><Text style={s.statColumn}>{gl('Change')}</Text></View>
    {stats.map(row=><View key={row.id} style={s.statRow}>
     <Text numberOfLines={1} style={s.statLabel}>{row.label}</Text>
     <Text style={s.statOld}>{displayStat(row.before)}</Text>
     <Text style={s.statNew}>{displayStat(row.after)}</Text>
     <Text style={[s.statDelta,{color:statColor(C,row.after-row.before)}]}>{signed(row.after-row.before)}</Text>
    </View>)}
   </View>
   
   {slot==='weapon'&&weaponChanges.length>0?<View style={s.weaponRollPanel}>
    <View style={s.rollCompareHead}>
     <Text style={s.sectionTitle}>{gl('BONUS STATS')}</Text>
     <Text style={s.rollLegend}>{weaponBonusUiText(language,'current')} → {weaponBonusUiText(language,'candidate')}</Text>
    </View>
    {weaponChanges.map(change=><View key={change.stat} accessible
      accessibilityLabel={weaponBonusStatText(language,change.stat)+': '+weaponBonusUiText(language,'current')+' '+weaponBonusDisplayPercent(change.beforeBps)+', '+weaponBonusUiText(language,'candidate')+' '+weaponBonusDisplayPercent(change.afterBps)+', '+weaponBonusDisplayDelta(change.deltaBps)}
      style={[s.rollCompareRow,compactBonusRows&&s.rollCompareRowStack]}>
      <Text numberOfLines={2} style={s.rollStatName}>{weaponBonusStatText(language,change.stat)}</Text>
      <View style={s.rollNumbers}>
       <Text style={s.rollBefore}>{weaponBonusDisplayPercent(change.beforeBps)}</Text>
       <Text style={s.rollArrow}>→</Text>
       <Text style={s.rollAfter}>{weaponBonusDisplayPercent(change.afterBps)}</Text>
       <Text style={[s.rollDelta,{color:statColor(C,change.deltaBps)}]}>{weaponBonusDisplayDelta(change.deltaBps)}</Text>
      </View>
    </View>)}

   </View>:null}
   {slot!=='weapon'&&(currentRolls.length>0||newRolls.length>0)?<View style={s.weaponRollPanel}>
    <Text style={s.sectionTitle}>{gl('BONUS STATS')}</Text>
    <Text style={s.rollGroupLabel}>{gl('CURRENTLY EQUIPPED')}</Text>
    {currentRolls.length?currentRolls.map((roll,index)=><Text key={index} style={s.rollValue}>{roll.short}</Text>):<Text style={s.note}>{gl('No bonus stats')}</Text>}
    <Text style={s.rollGroupLabel}>{gl('NEW EQUIPMENT')}</Text>
    {newRolls.length?newRolls.map((roll,index)=><Text key={index} style={[s.rollValue,{color:C.good}]}>{roll.short}</Text>):<Text style={s.note}>{gl('No bonus stats')}</Text>}
    <Text style={s.rollGroupLabel}>{gl('Bonus stat changes')}</Text>
    {bonusChanges.map(change=><View key={change.stat} style={{flexDirection:'row',alignItems:'center',gap:6,minHeight:28}}>
      <Text style={[s.rollValue,{flex:1}]}>{gl(WEAPON_BONUS_LABELS[change.stat])}</Text>
      <Text style={s.note}>{bonusPercent(change.before)} → {bonusPercent(change.after)}</Text>
      <Text style={[s.rollValue,{color:statColor(C,change.after-change.before),minWidth:52,textAlign:'right'}]}>{bonusDifference(change.after-change.before)}</Text>
    </View>)}
   </View>:null}
    <Text style={s.note}>{gl('Includes upgrades, socketed gems and set bonuses. Equip to apply.')}</Text>
    <Text style={s.detail}>{gl('Enhancement')} +{enhancement.rank} · {gl('Stat gem')} {sockets.statGemId?itemDef(sockets.statGemId).name:gl('Empty')} · {gl('Effect gem')} {sockets.effectGemId?itemDef(sockets.effectGemId).name:gl('Empty')}</Text>
    {sets.map(row=><Text key={row.id} style={s.detail}>{row.tier} · {row.name} · {row.before} → {row.after}/10 {gl('pieces')}</Text>)}
    {comparison.secondary.map(row=><Text key={row.key} style={s.detail}>{gl(row.label)}: {percent(row.before)} → {percent(row.after)}</Text>)}
    {comparison.effects.map(row=><Text key={row.key} style={s.detail}>{gl(row.label)}: {percent(row.before)} → {percent(row.after)}</Text>)}
    {onInspect?<GameButton compact tone="secondary" title={gl('Sources & crafting uses')} onPress={onInspect}/>:null}
   </View>

   {scrollWithActions?footer:null}
  </ScrollView>
  {!scrollWithActions?footer:null}
 </GameModalSurface>;
}

function makeStyles(C:ThemeColors){
 const E=equipmentTheme(C);
 return StyleSheet.create({
  surface:{maxWidth:560,backgroundColor:E.panel,borderColor:C.lineStrong},
  compactHeader:{minHeight:62,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:8,borderBottomWidth:1,borderBottomColor:C.line},
  headerCopy:{flex:1,minWidth:0,gap:2},headerEyebrow:{...typography.caption,fontSize:9,color:E.goldSoft,fontWeight:'900',letterSpacing:.6},headerTitle:{...typography.title,color:C.text,fontWeight:'800'},
  scroll:{flex:1,minHeight:0},
  body:{paddingTop:spacing.sm,paddingBottom:spacing.md,gap:spacing.sm},
  pair:{flexDirection:'row',gap:8},
  gearCard:{flex:1,minWidth:0,alignItems:'center',gap:4,minHeight:144,padding:8,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
  newGearCard:{borderColor:E.selectedLine,backgroundColor:E.stage},
  kicker:{...typography.caption,fontSize:9,fontWeight:'900',color:C.muted,letterSpacing:.6,textAlign:'center'},
  gearName:{...typography.bodyStrong,color:C.text,textAlign:'center',minHeight:31},
  meta:{...typography.caption,color:C.muted,textAlign:'center'},
  emptyArt:{borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,alignItems:'center',justifyContent:'center'},
  emptyMark:{fontSize:27,color:C.muted},
  impact:{gap:6,padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
  impactGood:{borderColor:C.good,backgroundColor:C.goodSurface},
  impactBad:{borderColor:C.bad,backgroundColor:C.badSurface},
  impactWarn:{borderColor:C.warning,backgroundColor:C.warningSurface},
  impactHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6,flexWrap:'wrap'},
  impactTitle:{...typography.bodyStrong,fontWeight:'900'},
  impactPower:{...typography.caption,fontWeight:'900'},
  impactText:{...typography.caption,color:C.text,lineHeight:17},
  statChips:{flexDirection:'row',gap:6},
  statChip:{flex:1,minWidth:0,alignItems:'center',paddingVertical:8,paddingHorizontal:3,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
  chipLabel:{...typography.caption,fontSize:10,color:C.muted},
  chipValue:{...typography.bodyStrong,fontSize:17,fontWeight:'900'},
  statColumn:{...typography.caption,color:C.muted,minWidth:46,textAlign:'right',fontSize:9},
  statPanel:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,overflow:'hidden',backgroundColor:E.panel},
  sectionHeader:{minHeight:33,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:10,borderBottomWidth:1,borderBottomColor:C.line},
  sectionTitle:{...typography.caption,fontSize:10,fontWeight:'900',color:E.goldSoft,letterSpacing:.7},
  legend:{...typography.caption,fontSize:10,color:C.muted},
  statRow:{minHeight:38,flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
  statLabel:{...typography.caption,flex:1,color:C.muted},
  statOld:{...typography.bodyStrong,minWidth:38,textAlign:'right',color:C.text},
  arrow:{...typography.caption,color:C.muted,minWidth:14,textAlign:'center'},
  statNew:{...typography.bodyStrong,minWidth:38,textAlign:'right',color:C.text},
  statDelta:{...typography.bodyStrong,minWidth:48,textAlign:'right',fontWeight:'900'},
  setAlert:{padding:10,borderWidth:1,borderColor:C.warning,borderRadius:radii.sm,gap:6},
  weaponRollPanel:{padding:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,gap:6,backgroundColor:C.panel2},
  rollGroupLabel:{...typography.caption,color:C.muted,fontSize:9,fontWeight:'800',letterSpacing:.5,marginTop:4},
  rollValue:{...typography.bodyStrong,color:C.text,fontWeight:'800',fontSize:12},
  rollCompareHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'},
  rollLegend:{...typography.caption,color:C.muted,fontSize:10,fontWeight:'700'},
  rollCompareRow:{minHeight:31,flexDirection:'row',alignItems:'center',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line,paddingVertical:5},
  rollCompareRowStack:{alignItems:'stretch',flexDirection:'column',gap:3},
  rollStatName:{...typography.bodyStrong,color:C.text,fontSize:12,flex:1,minWidth:0},
  rollNumbers:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:5},
  rollBefore:{...typography.caption,color:C.muted,fontSize:11,minWidth:40,textAlign:'right',fontVariant:['tabular-nums']},
  rollArrow:{...typography.caption,color:C.muted,fontSize:11},
  rollAfter:{...typography.bodyStrong,color:C.text,fontSize:11,minWidth:40,textAlign:'right',fontVariant:['tabular-nums']},
  rollDelta:{...typography.caption,fontWeight:'900',fontSize:11,minWidth:58,textAlign:'right',fontVariant:['tabular-nums']},
  setLine:{...typography.caption,fontWeight:'700'},
  otherActionsSection:{gap:7},
  otherActionsBody:{padding:10,gap:10,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
  otherActionsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
  otherActionCell:{flexBasis:'47%',flexGrow:1,minWidth:0},
  otherActionCellStack:{flexBasis:'100%'},
  actionHint:{...typography.caption,color:C.muted,lineHeight:17},
  disclosure:{minHeight:44,paddingHorizontal:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
  disclosureTitle:{...typography.bodyStrong,color:C.text},
  disclosureIcon:{fontSize:19,color:E.goldSoft},
  extra:{padding:10,gap:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
  note:{...typography.caption,color:C.muted,lineHeight:17},
  detail:{...typography.caption,color:C.text,lineHeight:18},
  footer:{flexShrink:0,borderTopWidth:1,borderTopColor:C.lineStrong,paddingTop:8,paddingBottom:3,gap:7,backgroundColor:E.panel},
  footerActionRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},footerActionCell:{flex:1,minWidth:0},
  footerActionRowStacked:{flexDirection:'column',flexWrap:'nowrap'},footerActionCellStacked:{flex:0,flexShrink:0,width:'100%'},
  footerDisposal:{gap:6,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.lineStrong,paddingTop:8},

  errorBox:{paddingVertical:12,gap:12},
  error:{...typography.caption,color:C.bad},
  warning:{...typography.caption,color:C.warning,textAlign:'center'},
 });
}

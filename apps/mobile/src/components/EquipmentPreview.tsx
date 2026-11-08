import {useEffect,useMemo,useRef,useState} from 'react';
import type {ComponentRef} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {itemDef} from '../content/items';
import {displayPercent,displayStat} from '../core/stat-display';
import {gearEnhancement,gemSocketState} from '../core/equipment-enhancement';
import {previewEquipment} from '../core/equipment-preview';
import {equipmentComparison} from '../core/equipment-comparison';
import {equipmentTradeOff} from '../core/equipment-trade-off';
import {craftedGearDisplayQuality,craftedGearInstances,equippedCraftedGearRarity} from '../core/crafted-gear-instances';
import type {GameState} from '../core/types';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {EquipmentArtwork} from './EquipmentArtwork';
import {InventoryItemHeaderControls} from './InventoryItemHeaderControls';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Props={
 state:GameState;itemId:string|null;instanceId?:string|null;source?:'inventory'|'equipment_pouch';
 onClose:()=>void;onEquip?:()=>unknown|Promise<unknown>;onInspect?:()=>void;
 onSell?:()=>void;onSalvage?:()=>void;canSell?:boolean;canSalvage?:boolean;
 favorite?:boolean;locked?:boolean;onToggleFavorite?:()=>void|Promise<unknown>;onToggleLock?:()=>void|Promise<unknown>;
};

const percent=displayPercent;
function signed(value:number){const n=displayStat(value);return n===0?'—':n>0?'+'+n:String(n);}
function statColor(C:ThemeColors,delta:number){return delta>0?C.good:delta<0?C.bad:C.muted;}

/** Inventory's single, authoritative compare-before-equipping surface.
 * The footer deliberately stays outside the scroll area on small devices. */
export function EquipmentPreview({state,itemId,instanceId,source='inventory',onClose,onEquip,onInspect,favorite,locked,onToggleFavorite,onToggleLock,onSell,onSalvage,canSell=false,canSalvage=false}:Props){
 const {gt,gl}=useGameplayText();
 const C=useGameTheme(),E=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
 const {height,width,fontScale}=useWindowDimensions();
 const [more,setMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const detailsScrollRef=useRef<ComponentRef<typeof ScrollView>>(null);
 useEffect(()=>{setMore(false);setBusy(false);setError('');},[itemId,instanceId,source]);
 if(!itemId)return null;
 let projected:GameState;
 try{projected=previewEquipment(state,itemId,instanceId,source)}catch(cause){
  return <GameModalSurface visible reduceMotion={state.settings.reduceMotion} onClose={onClose}>
   <GameModalHeader title={gl('Compare equipment')} onClose={onClose}/>
   <View style={s.errorBox}><Text style={s.note}>{gl(cause instanceof Error?cause.message:'Equipment unavailable')}</Text><GameButton title={gl('Back to Inventory')} onPress={onClose}/></View>
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
 const oldRank=oldId?gearEnhancement(state,oldId).rank:0;
 const oldSockets=oldId?gemSocketState(state,oldId):undefined;
 const alreadyEquipped=oldId===itemId&&(instanceId?instanceId===oldInstanceId:!oldInstanceId);
 const blocked=state.character&&state.character.level<(item.requiredLevel??1)
  ?gl('Requires level')+' '+String(item.requiredLevel??1)
  :state.activity?.kind==='combat'?gl('Stop combat before equipping')
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
  setBusy(true);setError('');
  try{await onEquip()}catch(cause){
   setError(cause instanceof Error?cause.message:gl('Action failed. Please try again.'));
  }finally{setBusy(false)}
 }
 const shortScreen=height<690||fontScale>=1.3;
 const gearSize=width<355?54:shortScreen?56:66;
 return <GameModalSurface visible onClose={busy?()=>{}:onClose} dismissOnBackdrop={!busy} reduceMotion={state.settings.reduceMotion}
  backdropLabel={gl('Close equipment comparison')}
  surfaceStyle={[s.surface,{height:Math.min(height*.89,shortScreen?620:710)}]}>
  <View style={s.compactHeader}>
    <View style={s.headerCopy}><Text style={s.headerEyebrow}>{gl('EQUIPMENT PREVIEW')}</Text><Text numberOfLines={1} style={[s.headerTitle,(width<355||fontScale>=1.25)&&{fontSize:16}]}>{gl('Compare & Swap')}</Text></View>
    <InventoryItemHeaderControls favorite={favorite} locked={locked} onFavorite={onToggleFavorite} onLock={onToggleLock} onClose={onClose} disabled={busy} closeLabel={gl('Close equipment comparison')}/>
   </View>
  <ScrollView ref={detailsScrollRef} style={s.scroll} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}
    onContentSizeChange={()=>{if(more)detailsScrollRef.current?.scrollToEnd({animated:!state.settings.reduceMotion})}}>
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
   </View>
   <View style={s.statChips}>
    {stats.slice(0,3).map(row=><View key={row.id} style={s.statChip}>
     <Text style={s.chipLabel}>{row.label}</Text>
     <Text style={[s.chipValue,{color:statColor(C,row.after-row.before)}]}>{signed(row.after-row.before)}</Text>
    </View>)}
   </View>
   {sets.some(row=>row.after!==row.before)?<View style={s.setAlert}>
    <Text style={s.sectionTitle}>{gl('SET PROGRESS')}</Text>
    {sets.filter(row=>row.before!==row.after).map(row=><Text key={row.id} style={[s.setLine,{color:row.after<row.before?C.warning:C.good}]}>{row.tier} · {row.name}: {row.before} → {row.after}/10{row.milestones.map(m=>m.threshold===6?' · '+gl('6-piece trigger not active'):' · '+m.threshold+'pc '+(m.direction==='gained'?gl('bonus active'):gl('bonus lost'))).join('')}</Text>)}
   </View>:null}
   {(onSell||onSalvage)?<View style={s.disposalActions}>
    <View style={s.disposalAction}><GameButton compact tone="secondary" title={gl('Sell')} disabled={busy||!canSell} onPress={()=>onSell?.()}/></View>
    <View style={s.disposalAction}><GameButton compact tone="danger" title={gl('Salvage')} disabled={busy||!canSalvage} onPress={()=>onSalvage?.()}/></View>
   </View>:null}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:more}} accessibilityLabel={more?gl('Hide equipment details'):gl('Show equipment details')}
    onPress={()=>setMore(v=>!v)} style={s.disclosure}>
    <Text style={s.disclosureTitle}>{gl('Full stats, gems & upgrades')}</Text><Text style={s.disclosureIcon}>{more?'−':'+'}</Text>
   </Pressable>
   {more?<View style={s.extra}>
   <View style={s.statPanel}>
    <View style={s.sectionHeader}><Text style={s.sectionTitle}>{gl('TOTAL LOADOUT')}</Text><Text style={s.legend}>{gl('Current → New')}</Text></View>
    {stats.map(row=><View key={row.id} style={s.statRow}>
     <Text style={s.statLabel}>{row.label}</Text>
     <Text style={s.statOld}>{displayStat(row.before)}</Text>
     <Text style={s.arrow}>→</Text>
     <Text style={s.statNew}>{displayStat(row.after)}</Text>
     <Text style={[s.statDelta,{color:statColor(C,row.after-row.before)}]}>{signed(row.after-row.before)}</Text>
    </View>)}
   </View>
   
    <Text style={s.note}>{gl('Includes upgrades, socketed gems and set bonuses. Equip to apply.')}</Text>
    <Text style={s.detail}>{gl('Enhancement')} +{enhancement.rank} · {gl('Stat gem')} {sockets.statGemId?itemDef(sockets.statGemId).name:gl('Empty')} · {gl('Effect gem')} {sockets.effectGemId?itemDef(sockets.effectGemId).name:gl('Empty')}</Text>
    {sets.map(row=><Text key={row.id} style={s.detail}>{row.tier} · {row.name} · {row.before} → {row.after}/10 {gl('pieces')}</Text>)}
    {comparison.secondary.map(row=><Text key={row.key} style={s.detail}>{gl(row.label)}: {percent(row.before)} → {percent(row.after)}</Text>)}
    {comparison.effects.map(row=><Text key={row.key} style={s.detail}>{gl(row.label)}: {percent(row.before)} → {percent(row.after)}</Text>)}
    {onInspect?<GameButton compact tone="secondary" title={gl('Sources & crafting uses')} onPress={onInspect}/>:null}
   </View>:null}
  </ScrollView>
  <View style={s.footer}>
   {!!error?<Text accessibilityRole="alert" style={s.error}>{gl(error)}</Text>:null}
   {!!blocked?<Text style={s.warning}>{blocked}</Text>:null}
   <View style={s.footerActions}>
      <View style={s.footerSecondary}><GameButton title={more?gl('Hide details'):gl('Full stats')} tone="secondary" disabled={busy} onPress={()=>setMore(value=>!value)}/></View>
      {onEquip?<View style={s.footerPrimary}><GameButton title={alreadyEquipped?gl('Currently equipped'):busy?gl('Equipping…'):old?gl('Swap Equipment'):gt('Equip {slot}',{slot:gl(slot)})}
        loading={busy} disabled={alreadyEquipped||!!blocked||busy} onPress={()=>void submit()}/></View>:null}
    </View>
  </View>
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
  setLine:{...typography.caption,fontWeight:'700'},
  disposalActions:{flexDirection:'row',gap:8},
  disposalAction:{flex:1,minWidth:0},
  disclosure:{minHeight:44,paddingHorizontal:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
  disclosureTitle:{...typography.bodyStrong,color:C.text},
  disclosureIcon:{fontSize:19,color:E.goldSoft},
  extra:{padding:10,gap:9,borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
  note:{...typography.caption,color:C.muted,lineHeight:17},
  detail:{...typography.caption,color:C.text,lineHeight:18},
  footer:{borderTopWidth:1,borderTopColor:C.lineStrong,paddingTop:10,paddingBottom:3,gap:7,backgroundColor:E.panel},
  footerActions:{flexDirection:'row',gap:8,alignItems:'stretch'},footerSecondary:{flex:1,minWidth:0},footerPrimary:{flex:1.45,minWidth:0},
  footerNote:{...typography.caption,fontSize:10,color:C.muted,textAlign:'center'},
  errorBox:{paddingVertical:12,gap:12},
  error:{...typography.caption,color:C.bad},
  warning:{...typography.caption,color:C.warning,textAlign:'center'},
 });
}

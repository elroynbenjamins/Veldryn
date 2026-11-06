import {useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState,GearSlot} from '../core/types';
import {availableEquipmentChoicesForSlot} from '../core/equipment-slot-picker';
import {previewEquipment} from '../core/equipment-preview';
import {effectiveStats} from '../core/game';
import {equipmentTradeOff} from '../core/equipment-trade-off';
import {craftedGearDisplayQuality,craftedGearInstances,equippedCraftedGearRarity} from '../core/crafted-gear-instances';
import {gearEnhancement,gemSocketState} from '../core/equipment-enhancement';
import {displayPercent,displayStat} from '../core/stat-display';
import {EQUIPMENT_SLOT_LABELS} from '../core/equipment-screen';
import {profileError,profileText} from '../i18n/profile';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {GameModalSurface,GameModalHeader} from './GameModalSurface';
import {EquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';
import {itemDef} from '../content/items';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
import {equipmentComparison} from '../core/equipment-comparison';

type Props={
 state:GameState;slot:GearSlot;
 onEquip:(itemId:string)=>Promise<void>|void;
 onEquipInstance?:(instanceId:string)=>Promise<void>|void;
 onEquipPouch?:(itemId:string)=>Promise<void>|void;
 onClose:()=>void;onInventory?:()=>void;
};
const percent=displayPercent;
const delta=(value:number)=>{const n=displayStat(value);return n===0?'—':n>0?'+'+n:String(n)};
const changeColor=(C:ThemeColors,value:number)=>value>0?C.good:value<0?C.bad:C.muted;

/** Compact character-screen picker, selecting the exact forged copy first. */
export function EquipmentSlotPicker({state,slot,onEquip,onEquipInstance,onEquipPouch,onClose,onInventory}:Props){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),language=useGameLanguage(),{gt,gl}=useGameplayText();
 const {height,fontScale}=useWindowDimensions(),short=height<700||fontScale>=1.3;
 const [selectedKey,setSelectedKey]=useState<string|null>(null),[details,setDetails]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false);
 useEffect(()=>{setSelectedKey(null);setDetails(false);setError('');},[slot]);
 const before=effectiveStats(state);
 const instances=useMemo(()=>new Map<string,import('../core/types').CraftedGearInstance>(craftedGearInstances(state).map(row=>[row.id,row] as const)),[state.account.craftedGearInstances]);
 const choices=useMemo(()=>availableEquipmentChoicesForSlot(state,slot).flatMap(choice=>{
  try{
  const projected=previewEquipment(state,choice.itemId,choice.instanceId,choice.source);
  const after=effectiveStats(projected),item=itemDef(choice.itemId);
  const instance=choice.instanceId?instances.get(choice.instanceId):undefined;
  return [{...choice,item,instance,after,projected,key:choice.instanceId?'copy:'+choice.instanceId:'legacy:'+choice.source+':'+choice.itemId,
   powerDelta:after.power-before.power}];
  }catch{return []}
 }).sort((a,b)=>b.powerDelta-a.powerDelta),[state,slot,instances]);
 const selected=choices.find(choice=>choice.key===selectedKey)??choices[0];
 const comparison=selected?equipmentComparison(state,selected.projected):undefined;
 const oldId=state.character?.equipment[slot],old=oldId?itemDef(oldId):undefined;
 const oldRarity=old?rarityMeta(equippedCraftedGearRarity(state,slot)??itemRarity(old)):undefined;
 const oldRank=oldId?gearEnhancement(state,oldId).rank:0;
 const oldSockets=oldId?gemSocketState(state,oldId):undefined;
 const trade=selected?equipmentTradeOff(before,selected.after):undefined;
 const oldInstance=state.character?.equipmentInstanceIds?.[slot];
 const same=selected&&oldId===selected.itemId&&(selected.instanceId?oldInstance===selected.instanceId:!oldInstance);
 const blocked=state.activity?.kind==='combat'?gl('Stop combat before equipping'):undefined;
  const socket=selected?gemSocketState(selected.projected,selected.itemId):undefined;
 const enhancement=selected?gearEnhancement(selected.projected,selected.itemId):undefined;
 const sets=comparison?.sets??[];
 const changes=selected?[
  {label:gl('Attack'),value:selected.after.attack-before.attack},
  {label:gl('Defense'),value:selected.after.defense-before.defense},
  {label:gl('Max health'),value:selected.after.hp-before.hp},
 ]:[];
 const close=()=>{if(!pending.current)onClose()};
 async function equip(){
  if(!selected||same||pending.current||blocked)return;
  if(selected.instanceId&&!onEquipInstance){onInventory?.();return;}
  pending.current=true;setBusy(true);setError('');
  try{
   if(selected.instanceId)await onEquipInstance!(selected.instanceId);
   else if(selected.source==='equipment_pouch'){
    if(!onEquipPouch)throw new Error('Equipment Pouch equip is unavailable');
    await onEquipPouch(selected.itemId);
   }else await onEquip(selected.itemId);
   onClose();
  }catch(cause){setError(profileError(language,cause,'Action failed. Please try again.'))}
  finally{pending.current=false;setBusy(false)}
 }
 return <GameModalSurface visible onClose={close} dismissOnBackdrop={!busy} reduceMotion={state.settings.reduceMotion} surfaceStyle={[s.surface,{height:Math.min(height*.82,short?570:690)}]}>
  <GameModalHeader eyebrow={profileText(language,'Compare & Swap')} title={profileText(language,EQUIPMENT_SLOT_LABELS[slot])} onClose={close} closeDisabled={busy}/>
  <ScrollView style={s.scroll} contentContainerStyle={s.body} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View style={s.current}>
    {old?<EquipmentArtwork item={old} rarity={oldRarity?.id} size={46} framed={false}/>:<View style={s.emptyArt}><Text style={s.emptyArtLabel}>+</Text></View>}
    <View style={s.flex}>
     <Text style={s.kicker}>{gl('CURRENTLY EQUIPPED')}</Text>
     <Text numberOfLines={2} style={[s.currentName,oldRarity&&{color:rarityNameColor(oldRarity.id,C.dark,C.text)}]}>{old?.name??gl('Empty slot')}{oldRank?' +'+oldRank:''}</Text>
     <Text style={s.meta}>{oldRarity?.label??gl(slot)}</Text>
    </View>
    <Text style={s.currentPower}>{gl('Power')} {displayStat(before.power)}</Text>
   </View>
   <View style={s.sectionRow}><Text style={s.heading}>{gl('AVAILABLE EQUIPMENT')}</Text><Text style={s.count}>{choices.length}</Text></View>
   {choices.length?choices.map(choice=>{
    const rarity=rarityMeta(choice.instance?.rarity??itemRarity(choice.item)),rank=gearEnhancement(choice.projected,choice.itemId).rank;
    const active=choice.key===(selected?.key);
    return <Pressable key={choice.key} accessibilityRole="button" accessibilityState={{selected:active,disabled:busy}}
     accessibilityLabel={choice.item.name+' · '+rarity.label+(choice.instance?' · Q'+craftedGearDisplayQuality(choice.instance):'')+' · '+gl('Power')+' '+delta(choice.powerDelta)}
     disabled={busy} onPress={()=>{setSelectedKey(choice.key);setDetails(false);setError('');}}
     style={[s.choice,active&&s.choiceActive]}>
      <EquipmentArtwork item={choice.item} rarity={rarity.id} size={44} framed={false}/>
      <View style={s.flex}>
       <Text numberOfLines={1} style={[s.choiceName,{color:rarityNameColor(rarity.id,C.dark,C.text)}]}>{choice.item.name}{rank?' +'+rank:''}</Text>
       <Text style={s.meta}>{rarity.label}{choice.instance?' · Q'+craftedGearDisplayQuality(choice.instance):''}{' · '+(choice.source==='equipment_pouch'?gl('Equipment Pouch'):gl('Inventory'))}</Text>
      </View>
      <View style={s.choiceEnd}><Text style={[s.choiceDelta,{color:changeColor(C,choice.powerDelta)}]}>{delta(choice.powerDelta)}</Text><Text style={s.powerLabel}>{gl('PWR')}</Text></View>
      <Text style={[s.selectDot,active&&s.selectActive]}>{active?'●':'○'}</Text>
     </Pressable>
   }):<View style={s.empty}><Text style={s.note}>{profileText(language,'None available in Inventory.')}</Text><GameButton compact tone="secondary" title={gl('Open Inventory')} onPress={()=>{close();onInventory?.()}} disabled={!onInventory}/></View>}
   {selected&&trade?<View style={s.preview}>
    <View style={s.previewHead}><Text style={s.heading}>{gl('SWAP PREVIEW')}</Text>
     <Text style={[s.previewPower,{color:changeColor(C,selected.powerDelta)}]}>{gl('Power')} {delta(selected.powerDelta)}</Text>
    </View>
    <Text style={[s.trade,{color:trade.grade==='downgrade'?C.bad:trade.grade==='improvement'?C.good:trade.grade==='tradeoff'?C.warning:C.muted}]}>{trade.grade==='neutral'&&comparison&&(selected?.powerDelta!==0||comparison.secondary.length>0||comparison.effects.length>0)?gl('Other combat bonuses changed'):gl(trade.title)}</Text>
    <View style={s.chips}>{changes.map(stat=><View key={stat.label} style={s.chip}><Text style={s.chipLabel}>{stat.label}</Text><Text style={[s.chipValue,{color:changeColor(C,stat.value)}]}>{delta(stat.value)}</Text></View>)}</View>
    {sets.length?<Text style={s.warning}>{gl('Set progress')}: {sets.map(set=>set.name+' '+set.before+' → '+set.after+'/10'+set.milestones.map(m=>' · '+(m.threshold===6?gl('6-piece trigger not active'):m.threshold+'pc '+(m.direction==='gained'?gl('bonus active'):gl('bonus lost')))).join('')).join(' · ')}</Text>:null}
    {oldSockets?.effectGemId!==socket?.effectGemId?<Text style={s.warning}>{gl('Effect gem')}: {oldSockets?.effectGemId?itemDef(oldSockets.effectGemId).name:gl('Empty')} → {socket?.effectGemId?itemDef(socket.effectGemId).name:gl('Empty')}</Text>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:details}} onPress={()=>setDetails(v=>!v)} style={s.more}>
     <Text style={s.moreText}>{gl('Full stats, gems & set bonuses')}</Text><Text style={s.moreIcon}>{details?'−':'+'}</Text>
    </Pressable>
    {details?<View style={s.detailBox}>
     {([
      [gl('Attack'),before.attack,selected.after.attack],
      [gl('Defense'),before.defense,selected.after.defense],
      [gl('Max health'),before.hp,selected.after.hp],
      [gl('Power'),before.power,selected.after.power],
     ] as Array<[string,number,number]>).map(([label,current,next])=><View key={label} style={s.detailRow}><Text style={s.detailLabel}>{label}</Text><Text style={s.detailValue}>{displayStat(current)} → {displayStat(next)}</Text><Text style={[s.detailChange,{color:changeColor(C,next-current)}]}>{delta(next-current)}</Text></View>)}
     <Text style={s.note}>{gl('Enhancement')} +{enhancement?.rank??0} · {gl('Stat gem')} {socket?.statGemId?itemDef(socket.statGemId).name:gl('Empty')} · {gl('Effect gem')} {socket?.effectGemId?itemDef(socket.effectGemId).name:gl('Empty')}</Text>
     {sets.map(set=><Text key={set.id} style={s.note}>{set.name} · {set.before} → {set.after}/10</Text>)}
     {comparison?.secondary.map(row=><Text key={row.key} style={s.note}>{gl(row.label)}: {percent(row.before)} → {percent(row.after)}</Text>)}
     {comparison?.effects.map(row=><Text key={row.key} style={s.note}>{gl(row.label)}: {percent(row.before)} → {percent(row.after)}</Text>)}
    </View>:null}
   </View>:null}
  </ScrollView>
  <View style={s.footer}>
   {!!error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
   {!!blocked?<Text style={s.warning}>{blocked}</Text>:null}
   {selected?<GameButton title={same?gl('Currently equipped'):selected.instanceId&&!onEquipInstance?gl('View in Inventory'):busy?gl('Equipping…'):old?gl('Swap Equipment'):gt('Equip {slot}',{slot:gl(slot)})}
     loading={busy} disabled={!!same||!!blocked||busy} onPress={()=>void equip()}/>:null}
   <Text style={s.footerHint}>{gl('Choose equipment to preview before equipping.')}</Text>
  </View>
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){
 const E=equipmentTheme(C);
 return StyleSheet.create({
  surface:{maxWidth:530,backgroundColor:E.panel,borderColor:C.lineStrong},
  scroll:{flex:1,minHeight:0},
  body:{gap:9,paddingTop:7,paddingBottom:13},
  current:{minHeight:67,padding:9,flexDirection:'row',alignItems:'center',gap:9,borderRadius:radii.md,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
  flex:{flex:1,minWidth:0},
  kicker:{...typography.caption,fontSize:9,fontWeight:'900',letterSpacing:.5,color:E.goldSoft},
  currentName:{...typography.bodyStrong,color:C.text},
  currentPower:{...typography.caption,color:C.muted,alignSelf:'flex-start'},
  meta:{...typography.caption,color:C.muted},
  emptyArt:{width:46,height:46,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.sm},
  emptyArtLabel:{fontSize:23,color:C.muted},
  sectionRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:1},
  heading:{...typography.caption,fontSize:10,fontWeight:'900',color:E.goldSoft,letterSpacing:.7},
  count:{...typography.caption,color:C.muted},
  choice:{minHeight:60,padding:7,flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel2},
  choiceActive:{borderWidth:2,borderColor:E.selectedLine,backgroundColor:E.stage,padding:6},
  choiceName:{...typography.bodyStrong,color:C.text},
  choiceEnd:{alignItems:'flex-end',minWidth:38},
  choiceDelta:{...typography.bodyStrong,fontWeight:'900'},
  powerLabel:{fontSize:9,fontWeight:'900',color:C.muted},
  selectDot:{fontSize:14,color:C.muted,marginRight:1},
  selectActive:{color:E.goldSoft},
  preview:{padding:10,gap:9,borderRadius:radii.md,borderWidth:1,borderColor:C.lineStrong,backgroundColor:E.panel},
  previewHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  previewPower:{...typography.bodyStrong,fontWeight:'900'},
  trade:{...typography.caption,fontWeight:'800'},
  chips:{flexDirection:'row',gap:6},
  chip:{flex:1,minWidth:0,paddingVertical:7,alignItems:'center',backgroundColor:C.panel2,borderRadius:radii.sm,borderWidth:1,borderColor:C.line},
  chipLabel:{...typography.caption,fontSize:10,color:C.muted},
  chipValue:{...typography.bodyStrong,fontSize:16,fontWeight:'900'},
  warning:{...typography.caption,color:C.warning,lineHeight:17},
  more:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:C.line},
  moreText:{...typography.caption,color:C.text,fontWeight:'800'},
  moreIcon:{fontSize:19,color:E.goldSoft},
  detailBox:{gap:8,padding:8,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},
  detailRow:{minHeight:29,flexDirection:'row',alignItems:'center',gap:7},
  detailLabel:{...typography.caption,flex:1,color:C.muted},
  detailValue:{...typography.caption,color:C.text},
  detailChange:{...typography.bodyStrong,minWidth:48,textAlign:'right'},
  note:{...typography.caption,color:C.muted,lineHeight:18},
  empty:{padding:12,gap:10,alignItems:'center'},
  footer:{gap:7,paddingTop:10,paddingBottom:2,borderTopWidth:1,borderTopColor:C.lineStrong,backgroundColor:E.panel},
  footerHint:{...typography.caption,fontSize:10,color:C.muted,textAlign:'center'},
  error:{...typography.caption,color:C.bad},
 });
}

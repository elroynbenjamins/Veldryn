import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,ItemStack} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {equipmentPouch,equipmentPouchUpgradePreview} from '../core/equipment-pouch';
import {equipmentSalvageReward} from '../core/equipment-salvage';
import {equipmentPouchSaleCandidates,equipmentPouchQuickSellIds,equipmentPouchSalvageCandidates,equipmentPouchQuickSalvageIds,type EquipmentPouchSaleCandidate} from '../core/equipment-pouch-selling';
import {craftedGearDisplayQuality,craftedGearInstances} from '../core/crafted-gear-instances';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {equipmentPouchText} from '../i18n/equipment-pouch-ui';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {ItemArtwork} from './ItemArtwork';
import {DisposalPreview} from './DisposalPreview';
import {GameButton} from './GameButton';
import {EquipmentPreview} from './EquipmentPreview';
import {EquipmentDisposalStatus} from './EquipmentDisposalStatus';
import {specificGearProtectionReason} from '../core/equipment-disposal-guidance';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

const PAGE_SIZE=30;
type PendingPouchDisposal={ids:string[];protectedCount:number};
/** Each character has a separate pouch. Forge equipment keeps its exact receipt,
 * rarity and quality, and can be equipped without passing through Inventory. */
export function EquipmentPouchPanel({state,busy=false,onAction}:{state:GameState;busy?:boolean;onAction?:(command:GameCommand)=>void|Promise<unknown>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const language=useGameLanguage();
 const p=(text:string,params?:Record<string,string|number>)=>equipmentPouchText(language,text,params);
 const pouch=equipmentPouch(state),upgrade=equipmentPouchUpgradePreview(state);
 const [page,setPage]=useState(0),[selectedIndex,setSelectedIndex]=useState<number|null>(null),[gridWidth,setGridWidth]=useState(300);
 const [previewStack,setPreviewStack]=useState<ItemStack|null>(null);
 const [transferError,setTransferError]=useState('');
 const [selectMode,setSelectMode]=useState(false),[selectedIds,setSelectedIds]=useState<string[]>([]);
 const [pendingSale,setPendingSale]=useState<PendingPouchDisposal|null>(null),[pendingSalvage,setPendingSalvage]=useState<PendingPouchDisposal|null>(null),saleInFlight=useRef(false);
 const columns=gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4;
 const slotWidth=Math.max(54,Math.floor((gridWidth-(columns-1)*5)/columns));
 const pages=Math.max(1,Math.ceil(Math.max(pouch.capacity,pouch.stacks.length)/PAGE_SIZE)),shownPage=Math.min(page,pages-1),start=shownPage*PAGE_SIZE;
 const entries=Array.from({length:Math.min(PAGE_SIZE,Math.max(pouch.capacity,pouch.stacks.length)-start)},(_,index)=>pouch.stacks[start+index]);
 const copyById=useMemo(()=>new Map(craftedGearInstances(state).map(row=>[row.id,row])),[state.account.craftedGearInstances]);
 const saleCandidates=useMemo(()=>equipmentPouchSaleCandidates(state),[state]);
 const salvageCandidates=useMemo(()=>equipmentPouchSalvageCandidates(state),[state]);
 const salvageByIndex=useMemo(()=>new Map(salvageCandidates.map(row=>[row.index,row])),[salvageCandidates]);
 const byIndex=useMemo(()=>new Map(saleCandidates.map(row=>[row.index,row])),[saleCandidates]);
 const selectedSet=new Set(selectedIds),selectedSales=saleCandidates.filter(row=>selectedSet.has(row.id));
 const eligibleSales=selectedSales.filter(row=>row.eligible);
 const selectedSalvages=useMemo(()=>selectedIds.length?equipmentPouchSalvageCandidates(state,selectedIds):[],[state,selectedIds]);
 const eligibleSalvages=selectedSalvages.filter(row=>row.eligible);
 const salvageCount=eligibleSalvages.length;
 const unlockableSales=selectedSales.filter(row=>{const stack=pouch.stacks[row.index];return !!stack&&(!!(stack.instanceId&&copyById.get(stack.instanceId)?.locked)||!!state.settings.lockedItemIds?.includes(stack.itemId));});
 const pendingSet=new Set(pendingSale?.ids??[]),pendingRows=saleCandidates.filter(row=>pendingSet.has(row.id));
 const pendingSalvageRows=useMemo(()=>pendingSalvage?equipmentPouchSalvageCandidates(state,pendingSalvage.ids):[],[state,pendingSalvage]);
 const saleCount=eligibleSales.length,saleGold=eligibleSales.reduce((sum,row)=>sum+row.gold,0);
 const excludedSelected=selectedSales.length-saleCount;
 const pendingGold=pendingRows.reduce((sum,row)=>sum+row.gold,0);
 const selectionValid=saleCount>0;
 const salvageSelectionValid=salvageCount>0;
 const confirmationValid=pendingRows.length>0&&pendingRows.length===(pendingSale?.ids.length??0)&&pendingRows.every(row=>row.eligible);
 const salvageConfirmationValid=pendingSalvageRows.length>0&&pendingSalvageRows.length===(pendingSalvage?.ids.length??0)&&pendingSalvageRows.every(row=>row.eligible);
 const salvageCandidate=selectedIndex===null?undefined:equipmentPouchSalvageCandidates(state,[salvageByIndex.get(selectedIndex)?.id??''])[0];
 const salvageRewards=(rows:typeof salvageCandidates):ItemStack[]=>{
  const amounts=new Map<string,number>();
  for(const row of rows)for(const reward of row.rewards??(row.reward?[row.reward]:[]))amounts.set(reward.itemId,(amounts.get(reward.itemId)??0)+reward.quantity);
  return [...amounts].map(([itemId,quantity])=>({itemId,quantity}));
 };
 const salvageMaterials=(rows:typeof salvageCandidates)=>salvageRewards(rows)
  .map(row=>`${row.quantity.toLocaleString(language)}× ${localizedItemName(language,row.itemId)}`).join(' · ');
 const disposalItems=(rows:readonly {itemId:string;index:number}[])=>rows.map(row=>{
  const stack=pouch.stacks[row.index],copy=stack?.instanceId?copyById.get(stack.instanceId):undefined;
  return {itemId:row.itemId,quantity:1,rarity:copy?.rarity??itemRarity(itemDef(row.itemId)),quality:copy?craftedGearDisplayQuality(copy):undefined};
 });
 const saleCandidate=selectedIndex===null?undefined:byIndex.get(selectedIndex);
 const previewRecord=previewStack?.instanceId?copyById.get(previewStack.instanceId):undefined;
 const previewSale=previewStack?.instanceId?saleCandidates.find(row=>pouch.stacks[row.index]?.instanceId===previewStack.instanceId):undefined;
 const previewSalvage=previewStack?.instanceId?salvageCandidates.find(row=>pouch.stacks[row.index]?.instanceId===previewStack.instanceId):undefined;
 const candidateReason=(row:{index:number;reason?:string})=>{
   const stack=pouch.stacks[row.index],record=stack?.instanceId?copyById.get(stack.instanceId):undefined;
   return specificGearProtectionReason(record,row.reason)??'Protected equipment';
 };
 const toggleSelected=(candidate:EquipmentPouchSaleCandidate)=>{
  if(busy)return;
  setSelectedIds(previous=>previous.includes(candidate.id)?previous.filter(id=>id!==candidate.id):previous.length<100?[...previous,candidate.id]:previous);
 };
 const selectSafe=()=>{
  const ids=equipmentPouchQuickSellIds(saleCandidates).slice(0,100);
  setSelectedIds(ids);setSelectMode(true);setSelectedIndex(null);
 };
 const selectSafeSalvage=()=>{
  setSelectedIds(equipmentPouchQuickSalvageIds(state,salvageCandidates));setSelectMode(true);setSelectedIndex(null);
 };
 const startSale=(ids:string[],protectedCount=0)=>{if(!ids.length||busy||!onAction)return;setSelectedIndex(null);setPendingSale({ids,protectedCount})};
 const startSalvage=(ids:string[],protectedCount=0)=>{if(!ids.length||busy||!onAction)return;setSelectedIndex(null);setPendingSalvage({ids,protectedCount})};
 const unlockSelected=async()=>{
  if(busy||!onAction||!unlockableSales.length)return;
  const updatedTypes=new Set<string>();
  for(const candidate of unlockableSales){
   const stack=pouch.stacks[candidate.index];
   if(!stack)continue;
   if(state.settings.lockedItemIds?.includes(stack.itemId)&&!updatedTypes.has(stack.itemId)){
    const result=await onAction({type:'inventory_preference',args:{id:stack.itemId,kind:'lock',enabled:false}});
    if(result===false)return;
    updatedTypes.add(stack.itemId);
   }
   if(stack.instanceId&&copyById.get(stack.instanceId)?.locked){
    const result=await onAction({type:'gear_lock',args:{instanceId:stack.instanceId,locked:false}});
    if(result===false)return;
   }
  }
 };
 const confirmSale=async()=>{
  const ids=pendingSale?.ids;
  if(!ids||busy||!confirmationValid||saleInFlight.current||!onAction)return;
  saleInFlight.current=true;
  try{
   const result=await onAction({type:'equipment_pouch_sell',args:{ids}});
   if(result!==false){setSelectedIds([]);setSelectMode(false);setPendingSale(null);}
  }finally{saleInFlight.current=false;}
 };
 const confirmSalvage=async()=>{
  const ids=pendingSalvage?.ids;
  if(!ids||busy||!salvageConfirmationValid||saleInFlight.current||!onAction)return;
  saleInFlight.current=true;
  try{
   const result=await onAction({type:'equipment_pouch_salvage',args:{ids}});
   if(result!==false){setSelectedIds([]);setSelectMode(false);setPendingSalvage(null);}
  }finally{saleInFlight.current=false;}
 };
 const selected=selectedIndex===null?undefined:pouch.stacks[selectedIndex];
 const record=selected?.instanceId?copyById.get(selected.instanceId):undefined;
 const item=selected?itemDef(selected.itemId):undefined;
 const salvageRecipe=item?equipmentSalvageReward(item.id):null;
 const rarity=selected?rarityMeta(record?.rarity??itemRarity(item!)):undefined;
 const canUpgrade=!!upgrade&&(state.character?.level??0)>=upgrade.level&&(state.character?.gold??0)>=upgrade.cost&&!busy;
 const send=(command:GameCommand)=>{setSelectedIndex(null);return onAction?.(command);};
 const choose=(stack:ItemStack|undefined,index:number)=>{
  if(!stack)return;
  if(selectMode){const candidate=byIndex.get(start+index);if(candidate)toggleSelected(candidate);return;}
  setTransferError('');setSelectedIndex(start+index);
 };
 const move=async(to:'inventory'|'bank')=>{
  if(!selected||!onAction||busy)return;
  setTransferError('');
  try{
    const result=await onAction(selected.instanceId?{type:'gear_move',args:{instanceId:selected.instanceId,to}}
      :{type:'equipment_pouch_move',args:{itemId:selected.itemId,quantity:1,from:'equipment_pouch',to}});
    if(result===false)throw new Error('Equipment transfer failed. Check Bank space and try again.');
    setSelectedIndex(null);
  }catch(cause){setTransferError(cause instanceof Error?cause.message:'Equipment transfer failed.');}
 };
 return <View style={s.root}>
  <View style={s.heading}>
   <View style={s.flex}><Text accessibilityRole="header" style={s.title}>{p('Equipment Pouch')}</Text>
    <Text style={s.meta}>{p('{used}/{capacity} slots · {character} only',{used:pouch.stacks.length,capacity:pouch.capacity,character:state.character?.name??p('Character')})}</Text></View>
  </View>
  <Text style={s.hint}>{p('Crafted gear arrives here first. To share it with another character, select a piece and tap To Bank.')}</Text>
  <View style={s.sellToolbar}>
   {selectMode?<>
    <GameButton compact tone="secondary" title={p('Select safe')} disabled={busy||!onAction} onPress={selectSafe}/>
    <GameButton compact tone="secondary" title={p('Select safe to salvage')} disabled={busy||!onAction} onPress={selectSafeSalvage}/>
    {selectedIds.length>0?<GameButton compact tone="secondary" title={p('Clear')} disabled={busy} onPress={()=>setSelectedIds([])}/>:null}
    <GameButton compact tone="secondary" title={p('Done')} disabled={busy} onPress={()=>{setSelectMode(false);setSelectedIds([])}}/>
   </>:<>
    <GameButton compact tone="secondary" title={p('Select gear')} disabled={busy||!onAction||!pouch.stacks.length} onPress={()=>{setSelectedIndex(null);setSelectMode(true);setSelectedIds([])}}/>
    <GameButton compact title={p('Quick sell')} disabled={busy||!onAction||!equipmentPouchQuickSellIds(saleCandidates).length} onPress={()=>startSale(equipmentPouchQuickSellIds(saleCandidates),saleCandidates.filter(row=>!row.eligible).length)}/>
    <GameButton compact tone="secondary" title={p('Quick salvage')} disabled={busy||!onAction||!equipmentPouchQuickSalvageIds(state,salvageCandidates).length} onPress={()=>startSalvage(equipmentPouchQuickSalvageIds(state,salvageCandidates),salvageCandidates.filter(row=>!row.eligible).length)}/>
   </>}
  </View>
  {selectMode?<View style={s.sellSummary}>
   <View style={s.selectionStats}>
    {([{label:'Selected',value:selectedIds.length},{label:'Sellable',value:saleCount},{label:'Salvageable',value:salvageCount}] as const).map(stat=><View key={stat.label} style={s.selectionStat}>
      <Text style={s.selectionStatNumber}>{stat.value.toLocaleString(language)}</Text>
      <Text style={s.selectionStatLabel}>{p(stat.label)}</Text>
    </View>)}
   </View>
   <Text style={s.meta}>{p('Estimated sale · {gold} Gold',{gold:saleGold.toLocaleString(language)})}</Text>
   <View style={s.sellToolbar}>
    <GameButton compact title={saleCount?p('Sell eligible · {gold}g',{gold:saleGold.toLocaleString(language)}):p('Nothing sellable')} tone="danger"
     disabled={!onAction||busy||!selectionValid} onPress={()=>startSale(eligibleSales.map(row=>row.id),selectedSales.length-saleCount)}/>
    <GameButton compact title={salvageCount?p('Salvage eligible · {count}',{count:salvageCount}):p('Nothing salvageable')} tone="danger"
     disabled={!onAction||busy||!salvageSelectionValid} onPress={()=>startSalvage(eligibleSalvages.map(row=>row.id),selectedSalvages.length-salvageCount)}/>
    {unlockableSales.length>0?<GameButton compact title={p('Unlock selected · {count}',{count:unlockableSales.length})} tone="secondary" disabled={!onAction||busy} onPress={()=>unlockSelected()}/>:null}
   </View>
   {excludedSelected>0?<Text style={s.meta}>{p('Protected copies are excluded from the sale.')+' '+selectedSales.filter(row=>!row.eligible).slice(0,2).map(row=>localizedItemName(language,row.itemId)+': '+p(candidateReason(row))).join(' · ')}</Text>:null}
   {selectedSalvages.length>salvageCount?<Text style={s.meta}>{p('Salvage protection:')+' '+selectedSalvages.filter(row=>!row.eligible).slice(0,2).map(row=>localizedItemName(language,row.itemId)+': '+p(candidateReason(row))).join(' · ')}</Text>:null}
  </View>:<Text style={s.hint}>{p('Quick-selects only eligible Common, Uncommon and Rare gear. Epic, Legendary and Mythic need manual selection.')}</Text>}
  <View style={s.grid} onLayout={event=>{const width=Math.floor(event.nativeEvent.layout.width);setGridWidth(previous=>previous===width?previous:width)}}>
   {entries.map((stack,index)=>{
    const copy=stack?.instanceId?copyById.get(stack.instanceId):undefined;
    const candidate=byIndex.get(start+index),salvage=salvageByIndex.get(start+index),checked=!!candidate&&selectedSet.has(candidate.id);
    const descriptor=stack?itemDef(stack.itemId):undefined,rar=descriptor?rarityMeta(copy?.rarity??itemRarity(descriptor)):undefined;
    return <Pressable key={stack?(stack.instanceId??stack.itemId+':'+(start+index)):'empty-'+(start+index)}
      accessibilityRole={selectMode?'checkbox':'button'} accessibilityState={selectMode?{checked}:undefined}
      accessibilityLabel={descriptor?localizedItemName(language,descriptor.id)+(copy?' · '+p(rar?.label??'Equipment')+', '+p('quality {quality}',{quality:craftedGearDisplayQuality(copy)}):'')+(selectMode&&candidate&&!candidate.eligible&&!salvage?.eligible?' · '+p(candidate.reason??'Protected equipment'):''):p('Empty equipment slot')}
      disabled={!stack||busy} onPress={()=>choose(stack,index)}
      style={[s.slot,{width:slotWidth,minHeight:Math.max(62,slotWidth)},stack&&s.filled,rar&&{borderColor:rar.color},checked&&s.slotChecked,selectMode&&!candidate?.eligible&&!salvage?.eligible&&!checked&&s.slotProtected]}>
      {stack?<>{selectMode&&checked?<View style={s.selectionCheck}><Text style={s.selectionCheckText}>✓</Text></View>:null}<ItemArtwork itemId={stack.itemId} size={Math.min(42,slotWidth-12)}/><Text style={[s.quantity,{color:rar?.color??C.text}]} numberOfLines={1}>{selectMode?(checked?(copy?'Q'+craftedGearDisplayQuality(copy):'×'+stack.quantity):candidate?.eligible||salvage?.eligible?'○':copy?.locked||state.settings.lockedItemIds?.includes(stack.itemId)?'🔒':'—'):copy?'Q'+craftedGearDisplayQuality(copy):'×'+stack.quantity}</Text></>:<Text style={s.empty}>·</Text>}
     </Pressable>;
   })}
  </View>
  {pages>1?<View style={s.paging}><GameButton compact title={p('Previous')} tone="secondary" disabled={shownPage===0} onPress={()=>{setSelectedIndex(null);setPage(value=>Math.max(0,value-1))}}/><Text style={s.meta}>{shownPage+1}/{pages}</Text><GameButton compact title={p('Next')} tone="secondary" disabled={shownPage>=pages-1} onPress={()=>{setSelectedIndex(null);setPage(value=>Math.min(pages-1,value+1))}}/></View>:null}
  <View style={s.upgrade}><View style={s.flex}><Text style={s.itemName}>{upgrade?p('Next: {count} slots',{count:upgrade.capacity}):p('Maximum capacity reached')}</Text>{upgrade?<Text style={s.meta}>{p('Level {level} · {gold} Gold',{level:upgrade.level,gold:upgrade.cost.toLocaleString(language)})}</Text>:null}</View>
    <GameButton compact title={p(upgrade?'Upgrade':'Maxed')} tone="secondary" disabled={!canUpgrade||!onAction} onPress={()=>onAction?.({type:'equipment_pouch_upgrade'})}/></View>
  <GameModalSurface visible={pendingSale!==null} reduceMotion={state.settings.reduceMotion} onClose={()=>{if(!saleInFlight.current&&!busy)setPendingSale(null)}} surfaceStyle={s.modal}>
   <GameModalHeader eyebrow={p('EQUIPMENT POUCH · SALE')} title={p('Sell selected equipment?')} onClose={()=>{if(!saleInFlight.current&&!busy)setPendingSale(null)}}/>
   <View style={s.details}>
    <DisposalPreview mode="sell" items={disposalItems(pendingRows)} gold={pendingGold} summary={pendingSale?{selected:pendingSale.ids.length+pendingSale.protectedCount,eligible:pendingSale.ids.length,protected:pendingSale.protectedCount}:undefined} note={p('Locked, favorited, enhanced, socketed, loadout and Working Toward gear stays protected.')}/>
    {!confirmationValid?<Text style={s.saleWarning}>{p('Selection has changed. Close and review the equipment.')}</Text>:null}
    <View style={s.actions}>
     <GameButton compact tone="secondary" title={p('Cancel')} disabled={busy} onPress={()=>setPendingSale(null)}/>
     <GameButton compact tone="danger" title={p('Confirm sale')} disabled={!onAction||busy||!confirmationValid} onPress={confirmSale}/>
    </View>
   </View>
  </GameModalSurface>
  <GameModalSurface visible={pendingSalvage!==null} reduceMotion={state.settings.reduceMotion} onClose={()=>{if(!saleInFlight.current&&!busy)setPendingSalvage(null)}} surfaceStyle={s.modal}>
   <GameModalHeader eyebrow={p('EQUIPMENT POUCH · SALVAGE')} title={p('Salvage selected equipment?')} onClose={()=>{if(!saleInFlight.current&&!busy)setPendingSalvage(null)}}/>
   <View style={s.details}>
    <DisposalPreview mode="salvage" items={disposalItems(pendingSalvageRows)} rewards={salvageRewards(pendingSalvageRows)} summary={pendingSalvage?{selected:pendingSalvage.ids.length+pendingSalvage.protectedCount,eligible:pendingSalvage.ids.length,protected:pendingSalvage.protectedCount}:undefined} note={p('Materials go to Inventory. Protected gear is excluded.')}/>
    {!salvageConfirmationValid?<Text style={s.saleWarning}>{p('Selection has changed. Close and review the equipment.')}</Text>:null}
    <View style={s.actions}>
     <GameButton compact tone="secondary" title={p('Cancel')} disabled={busy} onPress={()=>setPendingSalvage(null)}/>
     <GameButton compact tone="danger" title={p('Confirm salvage')} disabled={!onAction||busy||!salvageConfirmationValid} onPress={confirmSalvage}/>
    </View>
   </View>
  </GameModalSurface>
  <EquipmentPreview state={state} itemId={previewStack?.itemId??null} instanceId={previewStack?.instanceId} source="equipment_pouch" onClose={()=>setPreviewStack(null)}
   onMoveToBank={previewStack&&onAction?async()=>{
     if(!previewStack||!onAction)throw new Error('Equipment transfer is unavailable.');
     const result=await onAction(previewStack.instanceId?{type:'gear_move',args:{instanceId:previewStack.instanceId,to:'bank'}}
       :{type:'equipment_pouch_move',args:{itemId:previewStack.itemId,quantity:1,from:'equipment_pouch',to:'bank'}});
     if(result===false)throw new Error('Equipment transfer failed. Check Bank space and try again.');
     setPreviewStack(null);
   }:undefined}
   canSell={!!previewSale?.eligible&&!busy} canSalvage={!!previewSalvage?.eligible&&!busy}
   sellBlockReason={specificGearProtectionReason(previewRecord,previewSale?.reason)} salvageBlockReason={specificGearProtectionReason(previewRecord,previewSalvage?.reason)}
   onSell={previewSale?()=>{setPreviewStack(null);startSale([previewSale.id])}:undefined}
   onSalvage={previewSalvage?()=>{setPreviewStack(null);startSalvage([previewSalvage.id])}:undefined}
   onEquip={async()=>{
    if(!previewStack||!onAction)throw new Error(p('Equipment Pouch equip is unavailable'));
    const result=await onAction(previewStack.instanceId?{type:'gear_equip',args:{instanceId:previewStack.instanceId}}:{type:'equipment_pouch_equip',args:{itemId:previewStack.itemId}});
    if(result===false)throw new Error(p('Equipment was not equipped. Please try again.'));
    setPreviewStack(null);
   }}/>
  <GameModalSurface visible={!!selected} reduceMotion={state.settings.reduceMotion} onClose={()=>setSelectedIndex(null)} backdropLabel={p('Close Equipment Pouch details')} surfaceStyle={s.modal}>
   <GameModalHeader eyebrow={p('EQUIPMENT · CHARACTER STORAGE')} title={item?localizedItemName(language,item.id):p('Equipment')} onClose={()=>setSelectedIndex(null)}/>
   {selected&&item?<ScrollView contentContainerStyle={s.details} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.hero}><View style={[s.art,{borderColor:rarity?.color??C.line}]}><ItemArtwork itemId={item.id} size={74}/></View>
     <View style={s.flex}><Text style={[s.itemName,{color:rarity?.color??C.text}]}>{p(rarity?.label??'Equipment')}{record?' · Q'+craftedGearDisplayQuality(record):''}</Text>
      <Text style={s.meta}>{p('Stored on {character} · {slot}',{character:state.character?.name??p('this character'),slot:p(item.slot??'Gear')})}</Text>
      {record?<Text style={s.meta}>{record.locked?p('Locked · '):''}{record.enhancement.rank>0?'+'+record.enhancement.rank+p(' enhanced · '):''}{p('Unique forged copy')}</Text>:<Text style={s.meta}>{p('Standard equipment')}</Text>}</View>
    </View>
    <EquipmentDisposalStatus compact sellAllowed={!!saleCandidate?.eligible} salvageAllowed={!!salvageCandidate?.eligible}
      sellReason={specificGearProtectionReason(record,saleCandidate?.reason)} salvageReason={specificGearProtectionReason(record,salvageCandidate?.reason)}/>
    {!!transferError?<Text accessibilityRole="alert" style={s.saleWarning}>{p(transferError)}</Text>:null}
    <View style={s.actions}>
     <GameButton compact title={p(record?.enhancement.statGemId||record?.enhancement.effectGemId||record?.enhancement.gemIds.length?'Compare & Equip to Extract':'Compare & Equip')} disabled={!onAction||busy} onPress={()=>{setPreviewStack(selected);setSelectedIndex(null)}}/>
     <GameButton compact tone="secondary" title={p('To Inventory')} disabled={!onAction||busy} onPress={()=>move('inventory')}/>
     <GameButton compact tone="secondary" title={p('To Bank')} disabled={!onAction||busy} onPress={()=>move('bank')}/>
     {record?<GameButton compact tone="secondary" title={p(record.locked?'Unlock':'Lock')} disabled={!onAction||busy} onPress={()=>send({type:'gear_lock',args:{instanceId:record.id,locked:!record.locked}})}/>:<GameButton compact tone="secondary" title={p(state.settings.lockedItemIds?.includes(item.id)?'Unlock':'Lock')} disabled={!onAction||busy} onPress={()=>send({type:'inventory_preference',args:{id:item.id,kind:'lock',enabled:!state.settings.lockedItemIds?.includes(item.id)}})}/>}
     <GameButton compact tone="secondary" title={p(state.settings.favoriteItemIds?.includes(item.id)?'Remove favorite':'Favorite')} disabled={!onAction||busy} onPress={()=>send({type:'inventory_preference',args:{id:item.id,kind:'favorite',enabled:!state.settings.favoriteItemIds?.includes(item.id)}})}/>
     <GameButton compact tone="danger" title={saleCandidate?.eligible?p('Sell · {gold}g',{gold:saleCandidate.gold.toLocaleString(language)}):record?.locked||state.settings.lockedItemIds?.includes(item.id)?p('Unlock to sell'):p('Protected')} disabled={!onAction||busy||!saleCandidate?.eligible} onPress={()=>{if(saleCandidate)startSale([saleCandidate.id])}}/>
     {salvageRecipe?<GameButton compact tone="secondary" title={salvageCandidate?.eligible?p('Salvage · {count}× {name}',{count:salvageRecipe.quantity,name:localizedItemName(language,salvageRecipe.itemId)}):p('Protected')} disabled={!onAction||busy||!salvageCandidate?.eligible} onPress={()=>{if(salvageCandidate)startSalvage([salvageCandidate.id])}}/>:null}
    </View>
    {saleCandidate?.eligible?<Text style={s.meta}>{p('Selling this copy adds Gold to this character.')}</Text>:null}
    {salvageCandidate?.eligible&&salvageCandidate.rewards&&salvageCandidate.rewards.length>1?<Text style={s.meta}>{salvageMaterials([salvageCandidate])}</Text>:null}

   </ScrollView>:null}
  </GameModalSurface>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
 heading:{flexDirection:'row',alignItems:'center',padding:spacing.xs},flex:{flex:1,minWidth:0},
 title:{...typography.title,color:C.text},meta:{...typography.caption,color:C.muted},
 hint:{...typography.caption,color:C.muted,lineHeight:16,paddingHorizontal:spacing.xs},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:5},
 slot:{padding:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.bg},
 filled:{backgroundColor:C.panel2},slotChecked:{backgroundColor:C.selection,borderColor:C.selectionLine,borderWidth:2},slotProtected:{opacity:.68},quantity:{...typography.caption,fontWeight:'900'},empty:{fontSize:16,color:C.muted},
 selectionCheck:{position:'absolute',right:1,top:1,zIndex:1,minWidth:18,minHeight:18,borderRadius:9,backgroundColor:C.selectionLine,alignItems:'center',justifyContent:'center'},
 selectionCheckText:{fontSize:12,fontWeight:'900',color:C.bg},
 paging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 sellToolbar:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 sellSummary:{gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},
 selectionStats:{flexDirection:'row',gap:6},selectionStat:{flex:1,alignItems:'center',gap:2,paddingVertical:8,paddingHorizontal:4,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 selectionStatNumber:{...typography.title,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},selectionStatLabel:{...typography.caption,color:C.muted,fontSize:11,fontWeight:'800'},
 saleWarning:{...typography.caption,color:C.warning},
 upgrade:{flexDirection:'row',gap:8,alignItems:'center',borderTopWidth:1,borderColor:C.line,paddingTop:spacing.sm},
 modal:{maxHeight:'90%'},details:{gap:spacing.md,paddingBottom:spacing.md},
 hero:{flexDirection:'row',gap:spacing.md,alignItems:'center'},
 art:{width:88,height:88,borderRadius:12,borderWidth:1,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 itemName:{...typography.bodyStrong,color:C.text},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 });}

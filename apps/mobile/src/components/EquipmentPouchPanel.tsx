import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,ItemStack} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {equipmentPouch,equipmentPouchUpgradePreview} from '../core/equipment-pouch';
import {equipmentPouchSaleCandidates,equipmentPouchQuickSellIds,type EquipmentPouchSaleCandidate} from '../core/equipment-pouch-selling';
import {craftedGearDisplayQuality,craftedGearInstances} from '../core/crafted-gear-instances';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {equipmentPouchText} from '../i18n/equipment-pouch-ui';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';
import {EquipmentPreview} from './EquipmentPreview';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

const PAGE_SIZE=30;
/** Each character has a separate pouch. Forge equipment keeps its exact receipt,
 * rarity and quality, and can be equipped without passing through Inventory. */
export function EquipmentPouchPanel({state,busy=false,onAction}:{state:GameState;busy?:boolean;onAction?:(command:GameCommand)=>void|Promise<unknown>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const language=useGameLanguage();
 const p=(text:string,params?:Record<string,string|number>)=>equipmentPouchText(language,text,params);
 const pouch=equipmentPouch(state),upgrade=equipmentPouchUpgradePreview(state);
 const [page,setPage]=useState(0),[selectedIndex,setSelectedIndex]=useState<number|null>(null),[gridWidth,setGridWidth]=useState(300);
 const [previewStack,setPreviewStack]=useState<ItemStack|null>(null);
 const [selectMode,setSelectMode]=useState(false),[selectedIds,setSelectedIds]=useState<string[]>([]);
 const [pendingSale,setPendingSale]=useState<string[]|null>(null),saleInFlight=useRef(false);
 const columns=gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4;
 const slotWidth=Math.max(54,Math.floor((gridWidth-(columns-1)*5)/columns));
 const pages=Math.max(1,Math.ceil(Math.max(pouch.capacity,pouch.stacks.length)/PAGE_SIZE)),shownPage=Math.min(page,pages-1),start=shownPage*PAGE_SIZE;
 const entries=Array.from({length:Math.min(PAGE_SIZE,Math.max(pouch.capacity,pouch.stacks.length)-start)},(_,index)=>pouch.stacks[start+index]);
 const copyById=useMemo(()=>new Map(craftedGearInstances(state).map(row=>[row.id,row])),[state.account.craftedGearInstances]);
 const saleCandidates=useMemo(()=>equipmentPouchSaleCandidates(state),[state]);
 const byIndex=useMemo(()=>new Map(saleCandidates.map(row=>[row.index,row])),[saleCandidates]);
 const selectedSet=new Set(selectedIds),selectedSales=saleCandidates.filter(row=>selectedSet.has(row.id));
 const pendingSet=new Set(pendingSale??[]),pendingRows=saleCandidates.filter(row=>pendingSet.has(row.id));
 const saleCount=selectedSales.length,saleGold=selectedSales.reduce((sum,row)=>sum+row.gold,0);
 const pendingGold=pendingRows.reduce((sum,row)=>sum+row.gold,0);
 const selectionValid=saleCount>0&&saleCount===selectedIds.length&&selectedSales.every(row=>row.eligible);
 const confirmationValid=pendingRows.length>0&&pendingRows.length===(pendingSale?.length??0)&&pendingRows.every(row=>row.eligible);
 const saleCandidate=selectedIndex===null?undefined:byIndex.get(selectedIndex);
 const protectedCount=saleCandidates.filter(row=>!row.eligible).length;
 const toggleSelected=(candidate:EquipmentPouchSaleCandidate)=>{
  if(!candidate.eligible||busy)return;
  setSelectedIds(previous=>previous.includes(candidate.id)?previous.filter(id=>id!==candidate.id):previous.length<100?[...previous,candidate.id]:previous);
 };
 const selectSafe=()=>{
  const ids=equipmentPouchQuickSellIds(saleCandidates);
  setSelectedIds(ids);setSelectMode(true);setSelectedIndex(null);
 };
 const startSale=(ids:string[])=>{if(!ids.length||busy||!onAction)return;setSelectedIndex(null);setPendingSale(ids)};
 const confirmSale=async()=>{
  const ids=pendingSale;
  if(!ids||busy||!confirmationValid||saleInFlight.current||!onAction)return;
  saleInFlight.current=true;
  try{
   const result=await onAction({type:'equipment_pouch_sell',args:{ids}});
   if(result!==false){setSelectedIds([]);setSelectMode(false);setPendingSale(null);}
  }finally{saleInFlight.current=false;}
 };
 const selected=selectedIndex===null?undefined:pouch.stacks[selectedIndex];
 const record=selected?.instanceId?copyById.get(selected.instanceId):undefined;
 const item=selected?itemDef(selected.itemId):undefined;
 const rarity=selected?rarityMeta(record?.rarity??itemRarity(item!)):undefined;
 const canUpgrade=!!upgrade&&(state.character?.level??0)>=upgrade.level&&(state.character?.gold??0)>=upgrade.cost&&!busy;
 const send=(command:GameCommand)=>{setSelectedIndex(null);return onAction?.(command);};
 const choose=(stack:ItemStack|undefined,index:number)=>{
  if(!stack)return;
  if(selectMode){const candidate=byIndex.get(start+index);if(candidate)toggleSelected(candidate);return;}
  setSelectedIndex(start+index);
 };
 const move=(to:'inventory'|'bank')=>{if(!selected)return;
  return send(selected.instanceId?{type:'gear_move',args:{instanceId:selected.instanceId,to}}
    :{type:'equipment_pouch_move',args:{itemId:selected.itemId,quantity:1,from:'equipment_pouch',to}});
 };
 return <View style={s.root}>
  <View style={s.heading}>
   <View style={s.flex}><Text accessibilityRole="header" style={s.title}{p('Equipment Pouch')}</Text>
    <Text style={s.meta}>{p('{used}/{capacity} slots · {character} only',{used:pouch.stacks.length,capacity:pouch.capacity,character:state.character?.name??p('Character')})}</Text></View>
  </View>
  <Text style={s.hint}{p('New gear arrives here first. Compare, equip, transfer or sell copies directly. The Bank remains shared.')}</Text>
  <View style={s.sellToolbar}>
   {selectMode?<>
    <GameButton compact tone="secondary" title={p('Select safe')} disabled={busy||!onAction} onPress={selectSafe}/>
    <GameButton compact tone="secondary" title={p('Clear')} disabled={busy||!selectedIds.length} onPress={()=>setSelectedIds([])}/>
    <GameButton compact tone="secondary" title={p('Done')} disabled={busy} onPress={()=>{setSelectMode(false);setSelectedIds([])}}/>
   </>:<>
    <GameButton compact tone="secondary" title={p('Select gear')} disabled={busy||!onAction||!pouch.stacks.length} onPress={()=>{setSelectedIndex(null);setSelectMode(true);setSelectedIds([])}}/>
    <GameButton compact title={p('Select safe to sell')} disabled={busy||!onAction||!equipmentPouchQuickSellIds(saleCandidates).length} onPress={selectSafe}/>
   </>}
  </View>
  {selectMode?<View style={s.sellSummary}>
   <Text style={s.meta}>{p('{count} selected · {gold} Gold',{count:saleCount,gold:saleGold.toLocaleString(language)})}{protectedCount?p(' · {count} protected',{count:protectedCount}):''}</Text>
   <GameButton compact title={saleCount?p('Sell selected · {gold}g',{gold:saleGold.toLocaleString(language)}):p('Select gear')} tone="danger"
    disabled={!onAction||busy||!selectionValid} onPress={()=>startSale(selectedIds)}/>
  </View>:<Text style={s.hint}{p('Quick-selects only eligible Common, Uncommon and Rare gear. Epic, Legendary and Mythic need manual selection.')}</Text>}
  <View style={s.grid} onLayout={event=>{const width=Math.floor(event.nativeEvent.layout.width);setGridWidth(previous=>previous===width?previous:width)}}>
   {entries.map((stack,index)=>{
    const copy=stack?.instanceId?copyById.get(stack.instanceId):undefined;
    const candidate=byIndex.get(start+index),checked=!!candidate&&selectedSet.has(candidate.id);
    const descriptor=stack?itemDef(stack.itemId):undefined,rar=descriptor?rarityMeta(copy?.rarity??itemRarity(descriptor)):undefined;
    return <Pressable key={stack?(stack.instanceId??stack.itemId+':'+(start+index)):'empty-'+(start+index)}
      accessibilityRole={selectMode?'checkbox':'button'} accessibilityState={selectMode?{checked}:undefined}
      accessibilityLabel={descriptor?localizedItemName(language,descriptor.id)+(copy?' · '+p(rar?.label??'Equipment')+', '+p('quality {quality}',{quality:craftedGearDisplayQuality(copy)}):'')+(selectMode&&candidate&&!candidate.eligible?p(' · protected'):''):p('Empty equipment slot')}
      disabled={!stack||busy||(selectMode&&!candidate?.eligible)} onPress={()=>choose(stack,index)}
      style={[s.slot,{width:slotWidth,minHeight:Math.max(62,slotWidth)},stack&&s.filled,rar&&{borderColor:rar.color},checked&&s.slotChecked,selectMode&&!candidate?.eligible&&s.slotProtected]}>
      {stack?<><ItemArtwork itemId={stack.itemId} size={Math.min(42,slotWidth-12)}/><Text style={[s.quantity,{color:rar?.color??C.text}]} numberOfLines={1}>{selectMode?(checked?'✓':candidate?.eligible?'○':'🔒'):copy?'Q'+craftedGearDisplayQuality(copy):'×'+stack.quantity}</Text></>:<Text style={s.empty}>·</Text>}
     </Pressable>;
   })}
  </View>
  {pages>1?<View style={s.paging}><GameButton compact title={p('Previous')} tone="secondary" disabled={shownPage===0} onPress={()=>{setSelectedIndex(null);setPage(value=>Math.max(0,value-1))}}/><Text style={s.meta}>{shownPage+1}/{pages}</Text><GameButton compact title={p('Next')} tone="secondary" disabled={shownPage>=pages-1} onPress={()=>{setSelectedIndex(null);setPage(value=>Math.min(pages-1,value+1))}}/></View>:null}
  <View style={s.upgrade}><View style={s.flex}><Text style={s.itemName}>{upgrade?p('Next: {count} slots',{count:upgrade.capacity}):p('Maximum capacity reached')}</Text>{upgrade?<Text style={s.meta}>{p('Level {level} · {gold} Gold',{level:upgrade.level,gold:upgrade.cost.toLocaleString(language)})}</Text>:null}</View>
    <GameButton compact title={p(upgrade?'Upgrade':'Maxed')} tone="secondary" disabled={!canUpgrade||!onAction} onPress={()=>onAction?.({type:'equipment_pouch_upgrade'})}/></View>
  <GameModalSurface visible={pendingSale!==null} reduceMotion={state.settings.reduceMotion} onClose={()=>{if(!saleInFlight.current&&!busy)setPendingSale(null)}} surfaceStyle={s.modal}>
   <GameModalHeader eyebrow={p('EQUIPMENT POUCH · SALE')} title={p('Sell selected equipment?')} onClose={()=>{if(!saleInFlight.current&&!busy)setPendingSale(null)}}/>
   <View style={s.details}>
    <Text style={s.itemName}>{p(pendingRows.length===1?'{count} copy · {gold} Gold':'{count} copies · {gold} Gold',{count:pendingRows.length,gold:pendingGold.toLocaleString(language)})}</Text>
    <Text style={s.meta}{p('This cannot be undone. Locked, favorited, enhanced, socketed, loadout and Working Toward gear stays protected.')}</Text>
    {!confirmationValid?<Text style={s.saleWarning}{p('Selection has changed. Close and review the equipment.')}</Text>:null}
    <View style={s.actions}>
     <GameButton compact tone="secondary" title={p('Cancel')} disabled={busy} onPress={()=>setPendingSale(null)}/>
     <GameButton compact tone="danger" title={p('Confirm sale')} disabled={!onAction||busy||!confirmationValid} onPress={confirmSale}/>
    </View>
   </View>
  </GameModalSurface>
  <EquipmentPreview state={state} itemId={previewStack?.itemId??null} instanceId={previewStack?.instanceId} source="equipment_pouch" onClose={()=>setPreviewStack(null)} onEquip={async()=>{
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
      {record?<Text style={s.meta}>{record.locked?p('Locked · '):''}{record.enhancement.rank>0?'+'+record.enhancement.rank+p(' enhanced · '):''}{p('Unique forged copy')}</Text>:<Text style={s.meta}{p('Standard equipment')}</Text>}</View>
    </View>
    <View style={s.actions}>
     <GameButton compact title={p('Compare & Equip')} disabled={!onAction||busy} onPress={()=>{setPreviewStack(selected);setSelectedIndex(null)}}/>
     <GameButton compact tone="secondary" title={p('To Inventory')} disabled={!onAction||busy} onPress={()=>move('inventory')}/>
     <GameButton compact tone="secondary" title={p('To Bank')} disabled={!onAction||busy} onPress={()=>move('bank')}/>
     {record?<GameButton compact tone="secondary" title={p(record.locked?'Unlock':'Lock')} disabled={!onAction||busy} onPress={()=>send({type:'gear_lock',args:{instanceId:record.id,locked:!record.locked}})}/>:<GameButton compact tone="secondary" title={p(state.settings.lockedItemIds?.includes(item.id)?'Unlock':'Lock')} disabled={!onAction||busy} onPress={()=>send({type:'inventory_preference',args:{id:item.id,kind:'lock',enabled:!state.settings.lockedItemIds?.includes(item.id)}})}/>}
     <GameButton compact tone="secondary" title={p(state.settings.favoriteItemIds?.includes(item.id)?'Remove favorite':'Favorite')} disabled={!onAction||busy} onPress={()=>send({type:'inventory_preference',args:{id:item.id,kind:'favorite',enabled:!state.settings.favoriteItemIds?.includes(item.id)}})}/>
     <GameButton compact tone="danger" title={saleCandidate?.eligible?p('Sell · {gold}g',{gold:saleCandidate.gold.toLocaleString(language)}):p('Protected')} disabled={!onAction||busy||!saleCandidate?.eligible} onPress={()=>{if(saleCandidate)startSale([saleCandidate.id])}}/>
    </View>
    <Text style={s.meta}>{p(saleCandidate?.eligible?'Selling this copy adds Gold to this character.':saleCandidate?.reason??'This equipment is protected.')} {p('Enhanced, socketed and loadout gear cannot be sold.')}</Text>
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
 filled:{backgroundColor:C.panel2},slotChecked:{backgroundColor:C.selection,borderWidth:2},slotProtected:{opacity:.44},quantity:{...typography.caption,fontWeight:'900'},empty:{fontSize:16,color:C.muted},
 paging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 sellToolbar:{flexDirection:'row',flexWrap:'wrap',gap:8,alignItems:'center'},
 sellSummary:{gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},
 saleWarning:{...typography.caption,color:C.warning},
 upgrade:{flexDirection:'row',gap:8,alignItems:'center',borderTopWidth:1,borderColor:C.line,paddingTop:spacing.sm},
 modal:{maxHeight:'90%'},details:{gap:spacing.md,paddingBottom:spacing.md},
 hero:{flexDirection:'row',gap:spacing.md,alignItems:'center'},
 art:{width:88,height:88,borderRadius:12,borderWidth:1,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 itemName:{...typography.bodyStrong,color:C.text},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 });}

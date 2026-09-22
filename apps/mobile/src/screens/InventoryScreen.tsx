import {SearchField} from '../components/SearchField';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState,ItemStack} from '../core/types';
import {ItemDef,itemDef} from '../content/items';
import {InventoryFilter,InventorySort,inventoryFavoriteIds,inventoryNewItemIds,recoveryAmount,storageCapacityStatus,transferAmount,transferError,visibleStacks} from '../core/inventory-view';
import {claimOverflowToBank,effectiveStats,StorageLocation,storageUpgradePreview} from '../core/game';
import {ItemCard} from '../components/ItemCard';
import {ConfirmModal} from '../components/ConfirmModal';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {EmptyState} from '../components/EmptyState';
import {ActionFeedback} from '../components/ActionFeedback';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentPreview} from '../components/EquipmentPreview';
import {ItemQuickInspect} from '../components/ItemQuickInspect';
import {previewEquipment} from '../core/equipment-preview';
import {formatGameNumber} from '../core/number-format';
import {ot} from '../i18n';
import {enhancedGearStats,gearEnhancement,gemSocketCapacity,hasEnhancement} from '../core/equipment-enhancement';
import {bankGearInstances,equippedGearInstance,inventoryGearInstances} from '../core/equipment-instances';
import {bulkSelectionSummary,type BulkStorageLocation} from '../core/inventory-bulk';
import type {WorkingTowardDestination} from '../core/working-toward';
import {equipmentChangeFeedback,equipmentFeedbackSnapshot,type EquipmentChangeFeedback} from '../core/equipment-change-feedback';
import {inventoryFeedbackIntent,resolveInventoryActionFeedback,type InventoryActionFeedback,type InventoryFeedbackIntent,type InventoryFeedbackRequest} from '../core/inventory-action-feedback';

type Pending={kind:'sell'|'salvage'|'deposit';item:ItemDef;quantity:number;ref?:string}|null;
type BulkAction='transfer'|'sell'|'salvage';
type BulkPending={kind:BulkAction;ids:string[]}|null;
const FILTER_OPTIONS:{id:InventoryFilter;label:string}[]=[{id:'all',label:'All'},{id:'new',label:'New'},{id:'favorites',label:'★ Favorites'},{id:'gear',label:'Gear'},{id:'material',label:'Materials'},{id:'gem',label:'Gems'},{id:'food',label:'Food'},{id:'potion',label:'Potions'},{id:'tool',label:'Tools'},{id:'quest',label:'Quest'}];
const SORT_OPTIONS:{id:InventorySort;label:string}[]=[{id:'name',label:'Name'},{id:'new',label:'New first'},{id:'favorite',label:'Favorites first'},{id:'quantity',label:'Quantity ↓'},{id:'value',label:'Value ↓'}];
const nextSort=(value:InventorySort)=>SORT_OPTIONS[(SORT_OPTIONS.findIndex(option=>option.id===value)+1)%SORT_OPTIONS.length].id;
const nextQuantity=(value:1|10|'all'):1|10|'all'=>value===1?10:value===10?'all':1;
const signed=(value:number)=>value>0?`+${value}`:String(value);
function EquipmentSwapMoment({moment,reduceMotion,onDismiss}:{moment:EquipmentChangeFeedback;reduceMotion:boolean;onDismiss:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scale=useRef(new Animated.Value(1)).current,dismissRef=useRef(onDismiss);dismissRef.current=onDismiss;
  useEffect(()=>{const timer=setTimeout(()=>dismissRef.current(),5000);scale.stopAnimation();scale.setValue(1);if(!reduceMotion)Animated.sequence([Animated.spring(scale,{toValue:1.025,damping:9,stiffness:230,mass:.65,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:16,stiffness:210,mass:.75,useNativeDriver:true})]).start();return()=>{clearTimeout(timer);scale.stopAnimation()}},[moment,reduceMotion,scale]);
  const title=moment.action==='replaced'?'GEAR SWAPPED':moment.action==='equipped'?'EQUIPPED':'UNEQUIPPED',accent=moment.action==='unequipped'?C.warning:C.good;
  const deltas=[['POWER',moment.delta.power],['ATK',moment.delta.attack],['DEF',moment.delta.defense],['HP',moment.delta.hp]].filter(([,value])=>(value as number)!==0);
  return <Animated.View accessibilityLiveRegion="polite" style={[s.equipMoment,{borderColor:accent,transform:[{scale}]}]}>
    <View style={s.equipMomentHead}><View style={s.resultSummary}><Text style={[s.equipMomentEyebrow,{color:accent}]}>{title}</Text><Text style={s.equipMomentName}>{moment.itemName??moment.previousItemName??'Equipment updated'}</Text></View><Text style={[s.equipMomentSlot,{color:accent}]}>{moment.slot.toUpperCase()}</Text></View>
    {moment.action==='replaced'&&moment.previousItemName?<Text style={s.equipMomentMeta}>{moment.previousItemName} returned to Inventory.</Text>:null}
    {deltas.length?<Text style={s.equipMomentDelta}>{deltas.map(([label,value])=>`${label} ${signed(value as number)}`).join(' · ')}</Text>:<Text style={s.equipMomentMeta}>Loadout stats unchanged.</Text>}
    {moment.setChanges.map(change=><View key={change.type+':'+change.setId+':'+change.pieces} style={[s.setChange,{borderColor:change.type==='activated'?C.good:C.warning,backgroundColor:change.type==='activated'?C.goodSurface:C.warningSurface}]}><Text style={[s.setChangeTitle,{color:change.type==='activated'?C.good:C.warning}]}>{change.type==='activated'?'SET BONUS ACTIVATED':'SET BONUS LOST'} · {change.pieces}PC · {change.setName}</Text><Text style={s.equipMomentMeta}>{change.bonus}</Text></View>)}
  </Animated.View>;
}
export function InventoryScreen({state,onEquip,onFood,onEat,onSell,onSalvage,onDeposit,onDepositMaterials,onUpgradeStorage,onWithdraw,onOverflow,onToggleFavorite,onAcknowledgeItem,onAcknowledgeAll,onBulkAction,onNavigateInspect}:{state:GameState;onEquip:(id:string)=>void;onFood:(id:string)=>void;onEat:(id:string)=>void;onSell:(id:string)=>void;onSalvage:(id:string)=>void;onDeposit:(id:string,quantity:number)=>void;onDepositMaterials:()=>void;onUpgradeStorage:(location:StorageLocation)=>void;onWithdraw:(id:string,quantity:number)=>void;onOverflow:()=>void;onToggleFavorite:(id:string)=>void;onAcknowledgeItem:(id:string)=>void;onAcknowledgeAll:()=>void;onBulkAction:(kind:BulkAction,location:BulkStorageLocation,ids:string[])=>void;onNavigateInspect:(destination:WorkingTowardDestination)=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [pending,setPending]=useState<Pending>(null),[location,setLocation]=useState<'inventory'|'bank'>('inventory');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<InventoryFilter>('all'),[sort,setSort]=useState<InventorySort>('name');
  const [quantity,setQuantity]=useState<1|10|'all'>(1);
  const [error,setError]=useState('');
  const [expandedItem,setExpandedItem]=useState<string|null>(null);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [inspectId,setInspectId]=useState<string|null>(null);
  const [showStorage,setShowStorage]=useState(false),[filterOpen,setFilterOpen]=useState(false);
  const [selectMode,setSelectMode]=useState(false),[selectedIds,setSelectedIds]=useState<string[]>([]),[bulkPending,setBulkPending]=useState<BulkPending>(null);
  const [equipMoment,setEquipMoment]=useState<EquipmentChangeFeedback|null>(null),equipmentSnapshotRef=useRef(equipmentFeedbackSnapshot(state));
  const [inventoryIntent,setInventoryIntent]=useState<InventoryFeedbackIntent|null>(null),[inventoryFeedback,setInventoryFeedback]=useState<InventoryActionFeedback|null>(null);
  useEffect(()=>{const next=equipmentFeedbackSnapshot(state),previous=equipmentSnapshotRef.current;equipmentSnapshotRef.current=next;if(previous.characterId!==next.characterId){setEquipMoment(null);return;}const result=equipmentChangeFeedback(previous,next);if(result)setEquipMoment(result)},[state]);
  useEffect(()=>{if(!inventoryIntent)return;const result=resolveInventoryActionFeedback(inventoryIntent,state);if(result){setInventoryFeedback(result);setInventoryIntent(null)}},[state,inventoryIntent]);
  useEffect(()=>{if(!inventoryIntent)return;const timer=setTimeout(()=>setInventoryIntent(null),12000);return()=>clearTimeout(timer)},[inventoryIntent]);
  useEffect(()=>{if(!inventoryFeedback)return;const timer=setTimeout(()=>setInventoryFeedback(null),4500);return()=>clearTimeout(timer)},[inventoryFeedback]);
  const run=(action:()=>void)=>{try{action();setError('')}catch(e){setError(e instanceof Error?e.message:'Action failed. Please try again.')}};
  const runInventory=(request:InventoryFeedbackRequest,action:()=>void)=>{const intent=inventoryFeedbackIntent(state,request);try{action();setInventoryIntent(intent);setInventoryFeedback(null);setError('')}catch(e){setInventoryIntent(null);setError(e instanceof Error?e.message:'Action failed. Please try again.')}};
  const confirm=()=>{if(!pending)return;const ref=pending.ref??pending.item.id,request:InventoryFeedbackRequest=pending.kind==='deposit'?{kind:'deposit',itemId:pending.item.id,quantity:pending.quantity}:pending.kind==='sell'?{kind:'sell',itemId:pending.item.id,quantity:1}:{kind:'salvage',itemId:pending.item.id,quantity:1};runInventory(request,()=>pending.kind==='deposit'?onDeposit(ref,pending.quantity):pending.kind==='sell'?onSell(ref):onSalvage(ref));setPending(null)};
  const favorites=inventoryFavoriteIds(state),favoriteSet=new Set(favorites),newItemIds=inventoryNewItemIds(state),newItemSet=new Set(newItemIds);
  const inventoryCapacity=storageCapacityStatus(state.inventory.stacks,state.inventory.capacity),bankCapacity=storageCapacityStatus(state.bank.stacks,state.bank.capacity),activeCapacity=location==='inventory'?inventoryCapacity:bankCapacity;
  const activeNewCount=new Set(state[location].stacks.filter(stack=>stack.quantity>0&&newItemSet.has(stack.itemId)).map(stack=>stack.itemId)).size;
  const stacks=visibleStacks(state[location].stacks,query,filter,sort,favorites,newItemIds);
  const selectedSet=new Set(selectedIds),selectionSummary=bulkSelectionSummary(state,selectedIds,location);
  const exitSelection=()=>{setSelectMode(false);setSelectedIds([]);setBulkPending(null)};
  const changeLocation=(value:BulkStorageLocation)=>{if(value===location)return;exitSelection();setExpandedItem(null);setLocation(value)};
  const toggleSelection=(itemId:string)=>{setSelectedIds(current=>{if(current.includes(itemId))return current.filter(id=>id!==itemId);if(current.length>=100){setError('Select up to 100 item stacks at once.');return current;}setError('');return [...current,itemId]})};
  const selectShown=()=>{const ids=[...new Set(stacks.map(stack=>stack.itemId))].slice(0,100);setSelectedIds(ids);setError(stacks.length>100?'Selected the first 100 matching stacks.':'')};
  const beginSelection=()=>{setSelectMode(true);setSelectedIds([]);setExpandedItem(null);setPreviewId(null);setInspectId(null);setError('')};
  const beginBulk=(kind:BulkAction)=>{const ids=kind==='transfer'?selectionSummary.transferableIds:kind==='sell'?selectionSummary.sellableIds:selectionSummary.salvageableIds;if(ids.length)setBulkPending({kind,ids})};
  const closeInspect=()=>{if(inspectId&&newItemSet.has(inspectId))run(()=>onAcknowledgeItem(inspectId));setInspectId(null)};
  const toggleItem=(itemId:string,newItem:boolean)=>{const key=location+':'+itemId,closing=expandedItem===key;if(closing&&newItem)run(()=>onAcknowledgeItem(itemId));else if(!closing&&expandedItem){const previousId=expandedItem.slice(expandedItem.indexOf(':')+1);if(newItemSet.has(previousId))run(()=>onAcknowledgeItem(previousId));}setExpandedItem(closing?null:key)};
  const renderStack=(stack:ItemStack)=>{
    const item=itemDef(stack.itemId),carried=location==='inventory',favorite=favoriteSet.has(item.id),newItem=newItemSet.has(item.id);
    if(item.type==='gear'){
      const instances=(carried?inventoryGearInstances(state):bankGearInstances(state)).filter(row=>row.itemId===item.id);
      const equippedId=item.slot?state.character?.equipment[item.slot]:undefined,equippedInstance=item.slot?equippedGearInstance(state,item.slot):undefined;
      return instances.map((instance,index)=>{
        const ref=instance.id,enhancement=gearEnhancement(state,ref),enhancementProtected=hasEnhancement(state,ref),key=`${location}:${ref}`;
        return <ItemCard favorite={favorite} newItem={newItem&&index===0} selectionMode={false} onInspect={()=>setInspectId(ref)} onToggleFavorite={()=>run(()=>onToggleFavorite(item.id))} expanded={expandedItem===key} onToggle={()=>{if(expandedItem===key&&newItem)run(()=>onAcknowledgeItem(item.id));setExpandedItem(expandedItem===key?null:key)}} key={key} item={item} quantity={1} equipped={equippedId?itemDef(equippedId):undefined} rarityOverride={instance.rarity} upgradeRank={enhancement.rank} socketed={enhancement.gemIds.length} socketCapacity={gemSocketCapacity(ref,state)} enhancementProtected={enhancementProtected} displayStats={enhancedGearStats(state,ref)} equippedDisplayStats={equippedInstance?enhancedGearStats(state,equippedInstance.id):equippedId?enhancedGearStats(state,equippedId):undefined} numberMode={state.settings.numberMode}
          onPreview={()=>run(()=>{previewEquipment(state,ref);setPreviewId(ref)})}
          onEquip={carried?()=>run(()=>onEquip(ref)):undefined}
          onSell={carried&&item.value>0&&!enhancementProtected&&!favorite?()=>setPending({kind:'sell',item,quantity:1,ref}):undefined}
          onSalvage={carried&&item.salvage&&!enhancementProtected&&!favorite?()=>setPending({kind:'salvage',item,quantity:1,ref}):undefined}
          onDeposit={carried?()=>runInventory({kind:'deposit',itemId:item.id,quantity:1},()=>onDeposit(ref,1)):undefined}
          onWithdraw={!carried?()=>runInventory({kind:'withdraw',itemId:item.id,quantity:1},()=>onWithdraw(ref,1)):undefined}/>;
      });
    }
    const equippedId=item.slot?state.character?.equipment[item.slot]:undefined;
    const amount=transferAmount(stack.quantity,quantity),selectedFood=state.character?.equippedFoodId===item.id;
    return <ItemCard favorite={favorite} newItem={newItem} selectionMode={selectMode} selected={selectedSet.has(item.id)} onSelect={()=>toggleSelection(item.id)} onInspect={!selectMode?()=>setInspectId(item.id):undefined} onToggleFavorite={()=>run(()=>onToggleFavorite(item.id))} expanded={!selectMode&&expandedItem===location+':'+item.id} onToggle={()=>toggleItem(item.id,newItem)} key={`${location}:${item.id}`} item={item} quantity={stack.quantity} equipped={equippedId?itemDef(equippedId):undefined} selectedFood={selectedFood} healAmount={recoveryAmount(state,item.id)} transferQuantity={amount} transferIssue={transferError(state,item.id,amount,location)} numberMode={state.settings.numberMode}
      onSelectFood={carried&&item.type==='food'?()=>run(()=>onFood(item.id)):undefined} onEat={carried&&item.type==='food'?()=>run(()=>onEat(item.id)):undefined}
      onSell={carried&&item.value>0&&!favorite?()=>setPending({kind:'sell',item,quantity:1}):undefined}
      onDeposit={carried?()=>selectedFood?setPending({kind:'deposit',item,quantity:amount}):runInventory({kind:'deposit',itemId:item.id,quantity:amount},()=>onDeposit(item.id,amount)):undefined} onWithdraw={!carried?()=>runInventory({kind:'withdraw',itemId:item.id,quantity:amount},()=>onWithdraw(item.id,amount)):undefined}/>;
  };
  const foodWarning=pending?.item.id===state.character?.equippedFoodId?' This is your selected auto-eat food. Only food carried in Inventory can be consumed in combat.':'';
  const message=pending?.kind==='sell'?`Sell 1 for ${pending.item.value} gold. This cannot be undone.${foodWarning}`:pending?.kind==='deposit'?`Move ${pending.quantity}× ${pending.item.name} to Bank?${foodWarning}`:pending?.item.salvage?`Destroy 1 item for ${pending.item.salvage.quantity}× ${itemDef(pending.item.salvage.itemId).name}.`:'';
  const bulkMessage=bulkPending?.kind==='transfer'
    ?`Move ${selectionSummary.transferableStackCount} selected stacks (${selectionSummary.transferableUnitCount} items) to ${location==='inventory'?'Bank':'Inventory'}?${selectionSummary.transferProtectedCount?` ${selectionSummary.transferProtectedCount} auto-eat stack stays safely in Inventory.`:''} The move is all-or-nothing if storage space is insufficient.`
    :bulkPending?.kind==='sell'
      ?`Sell ${selectionSummary.sellableStackCount} eligible stacks (${selectionSummary.sellableUnitCount} items) for ${formatGameNumber(selectionSummary.sellGold,state.settings.numberMode)} gold?${selectionSummary.sellProtectedCount?` ${selectionSummary.sellProtectedCount} selected stacks are excluded by protection or sell rules.`:''} This cannot be undone.`
      :bulkPending?.kind==='salvage'
        ?`Salvage ${selectionSummary.salvageableStackCount} eligible equipment stacks (${selectionSummary.salvageableUnitCount} items)?${selectionSummary.salvageProtectedCount?` ${selectionSummary.salvageProtectedCount} selected stacks are excluded because they are protected or not salvageable.`:''} This cannot be undone.`
        :'';
  const confirmBulk=()=>{if(!bulkPending)return;const action=bulkPending,request:InventoryFeedbackRequest=action.kind==='transfer'?{kind:'bulk_transfer',direction:location==='inventory'?'deposit':'withdraw',stacks:selectionSummary.transferableStackCount,units:selectionSummary.transferableUnitCount}:action.kind==='sell'?{kind:'bulk_sell',stacks:selectionSummary.sellableStackCount,units:selectionSummary.sellableUnitCount,gold:selectionSummary.sellGold}:{kind:'bulk_salvage',stacks:selectionSummary.salvageableStackCount,units:selectionSummary.salvageableUnitCount};runInventory(request,()=>onBulkAction(action.kind,location,action.ids));setBulkPending(null);exitSelection()};
  const remaining=claimOverflowToBank(state).overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const overflowCount=state.overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const inventoryUpgrade=storageUpgradePreview(state,'inventory'),bankUpgrade=storageUpgradePreview(state,'bank');
  return <><EquipmentPreview state={state} itemId={previewId} onClose={()=>setPreviewId(null)}/><ItemQuickInspect state={state} itemId={inspectId} onClose={closeInspect} onNavigate={destination=>{closeInspect();onNavigateInspect(destination)}}/><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={s.h}>Inventory</Text>
    <View style={s.recovery}><Text style={s.label}>RECOVERY</Text><Text style={s.sub}>Health {state.character!.currentHp}/{effectiveStats(state).hp} · Auto-eat: {state.character?.equippedFoodId?itemDef(state.character.equippedFoodId).name:'None'}</Text><Text style={s.sub}>Carried auto-eat portions: {state.inventory.stacks.find(item=>item.itemId===state.character?.equippedFoodId)?.quantity??0}</Text></View>
    <View style={s.storageRow}>{(['inventory','bank'] as const).map(value=><StorageChip key={value} label={value==='inventory'?'Inventory':'Bank'} selected={location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}</View>
    {activeCapacity.level!=='ok'&&<Text accessibilityRole="alert" style={activeCapacity.level==='full'?s.capacityFull:s.warning}>{location==='inventory'?'Inventory':'Bank'} {activeCapacity.level==='full'?'is full. Free a slot or upgrade storage before receiving another unique stack.':`is ${activeCapacity.percent}% full · ${activeCapacity.free} slots remain.`}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showStorage}} onPress={()=>setShowStorage(value=>!value)} style={s.disclosure}><View style={s.flex}><Text style={s.disclosureTitle}>STORAGE MANAGEMENT</Text><Text style={s.sub}>Bulk deposit and capacity upgrades</Text></View><Text style={s.disclosureMark}>{showStorage?'−':'+'}</Text></Pressable>
    {showStorage&&<Panel><Text style={s.sub}>Inventory travels with this character. Bank storage is shared by every character on the account.</Text>{location==='inventory'&&<GameButton title="Deposit all materials" tone="secondary" disabled={!state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')} onPress={()=>run(onDepositMaterials)}/>}<View style={s.row}><View style={s.flex}><Text style={s.upgradeLabel}>INVENTORY · {state.inventory.capacity} SLOTS</Text><GameButton title={inventoryUpgrade?`Upgrade to ${inventoryUpgrade.capacity} · ${formatGameNumber(inventoryUpgrade.cost,state.settings.numberMode)}g`:'Inventory maxed'} disabled={!inventoryUpgrade} tone="secondary" onPress={()=>run(()=>onUpgradeStorage('inventory'))}/></View><View style={s.flex}><Text style={s.upgradeLabel}>BANK · {state.bank.capacity} SLOTS</Text><GameButton title={bankUpgrade?`Upgrade to ${bankUpgrade.capacity} · ${formatGameNumber(bankUpgrade.cost,state.settings.numberMode)}g`:'Bank maxed'} disabled={!bankUpgrade} tone="secondary" onPress={()=>run(()=>onUpgradeStorage('bank'))}/></View></View></Panel>}
    <Text style={s.sub}>{location==='inventory'?'Carried items available during adventures.':'Bank materials are available for crafting, but food must be withdrawn for combat.'}</Text>
    <SearchField accessibilityLabel="Search stored items" placeholder="Search items…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    {!selectMode&&<View style={s.utilityRow}>
      <UtilityChip label={`Filter · ${filter==='all'?'All':FILTER_OPTIONS.find(option=>option.id===filter)?.label??filter}${filter==='new'&&activeNewCount?` (${activeNewCount})`:''}`} accessibilityLabel={`Filter items. Current filter: ${filter}`} selected={filter!=='all'} onPress={()=>setFilterOpen(true)}/>
      <UtilityChip label={`↕ Sort · ${SORT_OPTIONS.find(option=>option.id===sort)?.label??'Name'}`} accessibilityLabel={`Sort items. Current sort: ${sort}`} onPress={()=>setSort(value=>nextSort(value))}/>
      <UtilityChip label={`⇄ Move · ${quantity==='all'?'All':quantity}`} accessibilityLabel={`Transfer quantity. Current amount: ${quantity}`} onPress={()=>setQuantity(value=>nextQuantity(value))}/>
    </View>}
    {!selectMode&&<Text style={s.inspectHint}>Hold an item for Quick Inspect · sources, uses, stats & upgrades</Text>}
    {!!error&&<Text accessibilityRole="alert" style={s.errorText}>{error}</Text>}
    {inventoryFeedback&&<ActionFeedback message={inventoryFeedback.message} tone={inventoryFeedback.tone} reduceMotion={state.settings.reduceMotion} compact/>}
    {equipMoment&&<EquipmentSwapMoment moment={equipMoment} reduceMotion={state.settings.reduceMotion} onDismiss={()=>setEquipMoment(null)}/>}
    <View style={s.resultRow}><Text style={[s.sub,s.resultSummary]}>{selectMode?`${selectedIds.length} selected · ${stacks.length} matching stacks`:`${stacks.length} matching stacks · ${activeCapacity.free} free slots${favorites.length?` · ${favorites.length} favorites`:``}${newItemIds.length?` · ${newItemIds.length} new`:``}`}</Text><View style={s.resultActions}>{!selectMode&&newItemIds.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="Mark all new items as seen" onPress={()=>run(onAcknowledgeAll)} style={({pressed})=>[s.markSeen,pressed&&s.pressed]}><Text style={s.markSeenText}>Mark all seen</Text></Pressable>}{stacks.length>0&&<Pressable accessibilityRole="button" accessibilityLabel={selectMode?`Finish selecting items`:`Select multiple items`} onPress={selectMode?exitSelection:beginSelection} style={({pressed})=>[s.selectModeButton,selectMode&&s.selectModeButtonActive,pressed&&s.pressed]}><Text style={[s.selectModeText,selectMode&&s.selectModeTextActive]}>{selectMode?`Done`:`Select`}</Text></Pressable>}</View></View>
    {selectMode&&<Panel><View style={s.selectionHead}><View style={s.resultSummary}><Text style={s.selectionTitle}>BULK MANAGEMENT · {selectedIds.length} SELECTED</Text><Text style={s.sub}>Whole stacks only · up to 100 stacks per action</Text></View><View style={s.selectionQuick}><Pressable accessibilityRole="button" onPress={selectShown} style={({pressed})=>[s.selectionQuickButton,pressed&&s.pressed]}><Text style={s.selectionQuickText}>Select shown</Text></Pressable><Pressable accessibilityRole="button" disabled={!selectedIds.length} onPress={()=>setSelectedIds([])} style={({pressed})=>[s.selectionQuickButton,!selectedIds.length&&s.selectionQuickDisabled,pressed&&selectedIds.length>0&&s.pressed]}><Text style={s.selectionQuickText}>Clear</Text></Pressable></View></View><Text style={s.sub}>{location==='inventory'?'Favorites and enhanced gear are automatically excluded from disposal. Your selected auto-eat food also stays in Inventory.':'Withdraw selected moves complete Bank stacks back to this character.'}</Text><View style={s.bulkActions}><GameButton compact title={`${location==='inventory'?'Deposit':'Withdraw'} · ${selectionSummary.transferableStackCount}`} disabled={!selectionSummary.transferableStackCount} tone="secondary" onPress={()=>beginBulk('transfer')}/>{location==='inventory'&&<GameButton compact title={`Sell · ${selectionSummary.sellableStackCount} · ${formatGameNumber(selectionSummary.sellGold,state.settings.numberMode)}g`} disabled={!selectionSummary.sellableStackCount} tone="secondary" onPress={()=>beginBulk('sell')}/>} {location==='inventory'&&<GameButton compact title={`Salvage · ${selectionSummary.salvageableStackCount}`} disabled={!selectionSummary.salvageableStackCount} tone="danger" onPress={()=>beginBulk('salvage')}/>}</View>{selectedIds.length>0&&location==='inventory'&&(selectionSummary.sellProtectedCount>0||selectionSummary.transferProtectedCount>0)&&<Text style={s.selectionNote}>{selectionSummary.sellProtectedCount} selected stacks excluded from bulk sell{selectionSummary.transferProtectedCount?` · ${selectionSummary.transferProtectedCount} auto-eat stack protected from deposit`:``}.</Text>}</Panel>}
    {stacks.length?stacks.map(renderStack):<><EmptyState title="No items to show" message="Try another storage tab or clear the search and category filter."/><GameButton title="Clear filters" tone="secondary" onPress={()=>{setQuery('');setFilter('all')}}/></>}
    {overflowCount>0&&<Panel><Text style={s.title}>{ot(state.settings.language,'overflow.title')} · {overflowCount}</Text><Text style={s.warning}>{ot(state.settings.language,'overflow.body')}</Text>{state.overflow.stacks.map((stack,index)=><Text key={`${stack.itemId}:${index}`} style={s.sub}>{stack.quantity}× {itemDef(stack.itemId).name}</Text>)}{state.overflow.expiresAtMs!==null&&<Text style={s.warning}>Recorded expiry: {new Date(state.overflow.expiresAtMs).toLocaleString()}</Text>}<GameButton title={ot(state.settings.language,'overflow.move',{count:overflowCount-remaining})} disabled={remaining===overflowCount} onPress={()=>run(onOverflow)}/>{remaining>0&&<Text style={s.sub}>{ot(state.settings.language,'overflow.remain',{count:remaining})}</Text>}</Panel>}
  </ScrollView>
  <GameModalSurface visible={filterOpen} reduceMotion={state.settings.reduceMotion} onClose={()=>setFilterOpen(false)} backdropLabel="Close inventory filters" surfaceStyle={s.filterSheet}>
        <GameModalHeader eyebrow="INVENTORY VIEW" title="Filter items" onClose={()=>setFilterOpen(false)}/>
        <ScrollView style={s.filterList} contentContainerStyle={s.filterListContent}>
          {FILTER_OPTIONS.map(option=>{const selected=filter===option.id,label=option.id==='new'&&activeNewCount?`New · ${activeNewCount}`:option.label;return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>setFilter(option.id)} style={({pressed})=>[s.filterOption,selected&&s.filterOptionSelected,pressed&&s.pressed]}><Text style={[s.filterOptionText,selected&&s.filterOptionTextSelected]}>{label}</Text><Text style={[s.filterOptionMark,selected&&s.filterOptionMarkSelected]}>{selected?'✓':'›'}</Text></Pressable>})}
        </ScrollView>
        <View style={s.sheetActions}><View style={s.flex}><GameButton title="Reset" tone="secondary" onPress={()=>setFilter('all')}/></View><View style={s.flex}><GameButton title="Done" onPress={()=>setFilterOpen(false)}/></View></View>
  </GameModalSurface>
  <ConfirmModal visible={pending!==null} title={`${pending?.kind==='deposit'?'Bank':pending?.kind==='sell'?'Sell':'Salvage'} ${pending?.item.name??'item'}?`} message={message} confirmLabel={pending?.kind==='deposit'?'Deposit':pending?.kind==='sell'?'Sell 1':'Salvage 1'} danger={pending?.kind!=='deposit'} reduceMotion={state.settings.reduceMotion} onConfirm={confirm} onCancel={()=>setPending(null)}/><ConfirmModal visible={bulkPending!==null} title={bulkPending?.kind==='transfer'?`${location==='inventory'?'Deposit':'Withdraw'} selected stacks?`:bulkPending?.kind==='sell'?'Sell selected items?':'Salvage selected equipment?'} message={bulkMessage} confirmLabel={bulkPending?.kind==='transfer'?(location==='inventory'?'Deposit selected':'Withdraw selected'):bulkPending?.kind==='sell'?'Sell eligible':'Salvage eligible'} danger={bulkPending?.kind!=='transfer'} reduceMotion={state.settings.reduceMotion} onConfirm={confirmBulk} onCancel={()=>setBulkPending(null)}/></>;
}
function UtilityChip({label,accessibilityLabel,selected=false,onPress}:{label:string;accessibilityLabel:string;selected?:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.utilityChip,selected&&s.utilityChipActive,pressed&&s.pressed]}><Text numberOfLines={1} style={[s.utilityChipText,selected&&s.utilityChipTextActive]}>{label}</Text></Pressable>}
function StorageChip({label,selected,status,onPress}:{label:string;selected:boolean;status:ReturnType<typeof storageCapacityStatus>;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipmentColors=equipmentTheme(C),tone=status.level==='full'?C.bad:status.level==='near'?C.warning:selected?equipmentColors.selectedLine:C.line,width=`${status.percent}%` as `${number}%`;return <Pressable accessibilityRole="button" accessibilityLabel={`${label} storage, ${status.used} of ${status.capacity} slots used, ${status.free} free`} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.storageChip,selected&&s.storageChipSelected,status.level==='full'&&s.storageChipFull,pressed&&s.pressed]}><View style={s.storageChipTop}><Text style={[s.storageChipLabel,selected&&s.storageChipLabelSelected]}>{selected?'✓ ':''}{label}</Text><Text style={[s.storageChipCount,{color:tone}]}>{status.used}/{status.capacity}</Text></View><View style={s.capacityTrack}><View style={[s.capacityFill,{width,backgroundColor:tone}]}/></View></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  recovery:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  equipMoment:{gap:6,padding:spacing.sm,borderWidth:1,borderLeftWidth:4,borderRadius:10,backgroundColor:C.panel2},
  equipMomentHead:{flexDirection:'row',alignItems:'center',gap:8},
  equipMomentEyebrow:{...typography.caption,fontWeight:'900',letterSpacing:.8},
  equipMomentName:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  equipMomentSlot:{...typography.caption,fontWeight:'900',letterSpacing:.6},
  equipMomentMeta:{...typography.caption,color:C.muted},
  equipMomentDelta:{...typography.bodyStrong,color:C.info,fontWeight:'900'},
  setChange:{gap:2,padding:7,borderWidth:1,borderRadius:8},
  setChangeTitle:{...typography.caption,fontWeight:'900',letterSpacing:.45},
  root:{padding:spacing.md,gap:10},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  warning:{...typography.body,color:C.warning},
  capacityFull:{...typography.bodyStrong,color:C.bad},
  errorText:{...typography.body,color:C.bad,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},
  label:{...typography.caption,color:C.accent,fontWeight:'700'},
  upgradeLabel:{...typography.caption,color:C.muted,fontWeight:'700',marginBottom:spacing.xs},
  disclosure:{minHeight:50,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  disclosureTitle:{...typography.caption,color:C.accent,fontWeight:'700',letterSpacing:.8},
  disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},
  row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  storageRow:{flexDirection:'row',gap:8},
  storageChip:{flex:1,minWidth:0,minHeight:48,gap:7,justifyContent:'center',paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
  storageChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},
  storageChipFull:{borderColor:C.bad},
  storageChipTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  storageChipLabel:{fontSize:12,color:C.muted,fontWeight:'800'},
  storageChipLabelSelected:{color:C.text},
  storageChipCount:{fontSize:11,fontWeight:'900'},
  capacityTrack:{height:4,overflow:'hidden',borderRadius:99,backgroundColor:C.bg},
  capacityFill:{height:4,borderRadius:99},
  resultRow:{flexDirection:'row',alignItems:'center',gap:8},
  resultSummary:{flex:1,minWidth:0},
  markSeen:{minHeight:36,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
  markSeenText:{fontSize:10,color:C.info,fontWeight:'900'},
  resultActions:{flexDirection:'row',alignItems:'center',gap:6},
  selectModeButton:{minHeight:36,justifyContent:'center',paddingHorizontal:11,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  selectModeButtonActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
  selectModeText:{fontSize:10,color:C.text,fontWeight:'900'},
  selectModeTextActive:{color:C.selectionLine},
  selectionHead:{flexDirection:'row',alignItems:'center',gap:8},
  selectionTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.6},
  selectionQuick:{flexDirection:'row',gap:6},
  selectionQuickButton:{minHeight:36,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},
  selectionQuickDisabled:{opacity:.45},
  selectionQuickText:{fontSize:10,color:C.text,fontWeight:'800'},
  bulkActions:{flexDirection:'row',flexWrap:'wrap',gap:8},
  selectionNote:{...typography.caption,color:C.warning},
  utilityRow:{flexDirection:'row',gap:6},
  inspectHint:{...typography.caption,color:C.muted,textAlign:'center'},
  utilityChip:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  utilityChipActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
  utilityChipText:{fontSize:11,color:C.text,fontWeight:'800'},
  utilityChipTextActive:{color:C.selectionLine},
  filterSheet:{maxHeight:'78%',gap:10},
  filterList:{maxHeight:430},
  filterListContent:{gap:5},
  filterOption:{minHeight:44,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  filterOptionSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
  filterOptionText:{flex:1,...typography.bodyStrong,color:C.text},
  filterOptionTextSelected:{color:C.text},
  filterOptionMark:{fontSize:18,color:C.muted,fontWeight:'900'},
  filterOptionMarkSelected:{color:C.selectionLine},
  sheetActions:{flexDirection:'row',gap:8},
  pressed:{opacity:.76},
  flex:{flex:1,minWidth:148},
  input:{minHeight:44,paddingHorizontal:spacing.md,borderRadius:10,borderWidth:1,borderColor:C.line,color:C.text,backgroundColor:C.panel,fontSize:16}
});}

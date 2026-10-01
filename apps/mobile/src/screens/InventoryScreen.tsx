import {useGameplayText} from '../i18n/gameplay';
import {SearchField} from '../components/SearchField';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Animated,Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {GameState,ItemStack} from '../core/types';
import {ItemDef,itemDef} from '../content/items';
import {InventoryFilter,InventorySort,inventoryFavoriteIds,inventoryNewItemIds,recoveryAmount,storageCapacityStatus,transferAmount,transferError,visibleStacks} from '../core/inventory-view';
import {entitlementStorageCapacity} from '../core/account-entitlements';
import {claimOverflowToBank,StorageLocation,storageUpgradePreview} from '../core/game';
import {ItemArtwork} from '../components/ItemArtwork';
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
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {effectiveOwnedGearRarity} from '../core/crafted-gear-instances';
import {bulkSelectionSummary,type BulkStorageLocation} from '../core/inventory-bulk';
import type {WorkingTowardDestination} from '../core/working-toward';
import {workingTowardInventoryProtectionMap} from '../core/working-toward-inventory';
import {equipmentChangeFeedback,equipmentFeedbackSnapshot,type EquipmentChangeFeedback} from '../core/equipment-change-feedback';
import {inventoryFeedbackIntent,resolveInventoryActionFeedback,type InventoryActionFeedback,type InventoryFeedbackIntent,type InventoryFeedbackRequest} from '../core/inventory-action-feedback';

type Pending={kind:'sell'|'salvage'|'deposit';item:ItemDef;quantity:number}|null;
type BulkAction='transfer'|'sell'|'salvage';
type BulkPending={kind:BulkAction;ids:string[]}|null;
const FILTER_OPTIONS:{id:InventoryFilter;label:string}[]=[{id:'all',label:'All'},{id:'new',label:'New'},{id:'favorites',label:'★ Favorites'},{id:'gear',label:'Gear'},{id:'material',label:'Materials'},{id:'gem',label:'Gems'},{id:'food',label:'Food'},{id:'potion',label:'Potions'},{id:'tool',label:'Tools'},{id:'quest',label:'Quest'}];
const SORT_OPTIONS:{id:InventorySort;label:string}[]=[{id:'name',label:'Name'},{id:'new',label:'New first'},{id:'favorite',label:'Favorites first'},{id:'quantity',label:'Quantity ↓'},{id:'value',label:'Value ↓'}];
const nextQuantity=(value:1|10|'all'):1|10|'all'=>value===1?10:value===10?'all':1;
const signed=(value:number)=>value>0?`+${value}`:String(value);
function EquipmentSwapMoment({moment,reduceMotion,onDismiss}:{moment:EquipmentChangeFeedback;reduceMotion:boolean;onDismiss:()=>void}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scale=useRef(new Animated.Value(1)).current,dismissRef=useRef(onDismiss);dismissRef.current=onDismiss;
  useEffect(()=>{const timer=setTimeout(()=>dismissRef.current(),5000);scale.stopAnimation();scale.setValue(1);if(!reduceMotion)Animated.sequence([Animated.spring(scale,{toValue:1.025,damping:9,stiffness:230,mass:.65,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:16,stiffness:210,mass:.75,useNativeDriver:true})]).start();return()=>{clearTimeout(timer);scale.stopAnimation()}},[moment,reduceMotion,scale]);
  const title=moment.action==='replaced'?gt("GEAR SWAPPED"):moment.action==='equipped'?gt("Equipped").toLocaleUpperCase(language):gt("UNEQUIPPED"),accent=moment.action==='unequipped'?C.warning:C.good;
  const deltas=[[gt("Power").toLocaleUpperCase(language),moment.delta.power],['ATK',moment.delta.attack],['DEF',moment.delta.defense],['HP',moment.delta.hp]].filter(([,value])=>(value as number)!==0);
  return <Animated.View accessibilityLiveRegion="polite" style={[s.equipMoment,{borderColor:accent,transform:[{scale}]}]}>
    <View style={s.equipMomentHead}><View style={s.resultSummary}><Text style={[s.equipMomentEyebrow,{color:accent}]}>{title}</Text><Text style={s.equipMomentName}>{moment.itemName??moment.previousItemName??gt("Equipment updated")}</Text></View><Text style={[s.equipMomentSlot,{color:accent}]}>{gl(moment.slot).toLocaleUpperCase(language)}</Text></View>
    {moment.action==='replaced'&&moment.previousItemName?<Text style={s.equipMomentMeta}>{gt("{name} returned to Inventory.",{name:moment.previousItemName})}</Text>:null}
    {deltas.length?<Text style={s.equipMomentDelta}>{deltas.map(([label,value])=>`${label} ${signed(value as number)}`).join(' · ')}</Text>:<Text style={s.equipMomentMeta}>{gt("Loadout stats unchanged.")}</Text>}
    {moment.setChanges.map(change=><View key={change.type+':'+change.setId+':'+change.pieces} style={[s.setChange,{borderColor:change.type==='activated'?C.good:C.warning,backgroundColor:change.type==='activated'?C.goodSurface:C.warningSurface}]}><Text style={[s.setChangeTitle,{color:change.type==='activated'?C.good:C.warning}]}>{change.type==='activated'?gt("SET BONUS ACTIVATED"):gt("SET BONUS LOST")} · {gt("{count} pieces",{count:change.pieces})} · {change.setName}</Text><Text style={s.equipMomentMeta}>{gl(change.bonus)}</Text></View>)}
  </Animated.View>;
}
export function InventoryScreen({state,onEquip,onFood,onEat,onSell,onSalvage,onDeposit,onDepositMaterials,onUpgradeStorage,onWithdraw,onOverflow,onToggleFavorite,onAcknowledgeItem,onAcknowledgeAll,onBulkAction,onNavigateInspect}:{state:GameState;onEquip:(id:string)=>void;onFood:(id:string)=>void;onEat:(id:string)=>void;onSell:(id:string)=>void;onSalvage:(id:string)=>void;onDeposit:(id:string,quantity:number)=>void;onDepositMaterials:()=>void;onUpgradeStorage:(location:StorageLocation)=>void;onWithdraw:(id:string,quantity:number)=>void;onOverflow:()=>void;onToggleFavorite:(id:string)=>void;onAcknowledgeItem:(id:string)=>void;onAcknowledgeAll:()=>void;onBulkAction:(kind:BulkAction,location:BulkStorageLocation,ids:string[])=>void;onNavigateInspect:(destination:WorkingTowardDestination)=>void}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const {width}=useWindowDimensions();
  const [gridWidth,setGridWidth]=useState(Math.max(280,width-32));
  const gridColumns=gridWidth>=720?6:gridWidth>=480?5:gridWidth<300?3:4,tileSize=Math.floor((gridWidth-(gridColumns-1)*10)/gridColumns),iconSize=Math.min(88,tileSize-14);
  const [pending,setPending]=useState<Pending>(null),[location,setLocation]=useState<'inventory'|'bank'>("inventory");
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<InventoryFilter>("all"),[sort,setSort]=useState<InventorySort>("new"),[sortOpen,setSortOpen]=useState(false);
  const [quantity,setQuantity]=useState<1|10|'all'>(1);
  const [error,setError]=useState('');
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
  const run=(action:()=>void)=>{try{action();setError('')}catch(e){setError(e instanceof Error?e.message:gt("Action failed. Please try again."))}};
  const runInventory=(request:InventoryFeedbackRequest,action:()=>void)=>{const intent=inventoryFeedbackIntent(state,request);try{action();setInventoryIntent(intent);setInventoryFeedback(null);setError('')}catch(e){setInventoryIntent(null);setError(e instanceof Error?e.message:gt("Action failed. Please try again."))}};
  const confirm=()=>{if(!pending)return;const request:InventoryFeedbackRequest=pending.kind==='deposit'?{kind:"deposit",itemId:pending.item.id,quantity:pending.quantity}:pending.kind==='sell'?{kind:"sell",itemId:pending.item.id,quantity:1}:{kind:"salvage",itemId:pending.item.id,quantity:1};runInventory(request,()=>pending.kind==='deposit'?onDeposit(pending.item.id,pending.quantity):pending.kind==='sell'?onSell(pending.item.id):onSalvage(pending.item.id));setPending(null)};
  const favorites=inventoryFavoriteIds(state),favoriteSet=new Set(favorites),newItemIds=inventoryNewItemIds(state),newItemSet=new Set(newItemIds),goalProtection=workingTowardInventoryProtectionMap(state);
  const effectiveInventoryCapacity=entitlementStorageCapacity(state,"inventory"),effectiveBankCapacity=entitlementStorageCapacity(state,"bank"),inventoryCapacity=storageCapacityStatus(state.inventory.stacks,effectiveInventoryCapacity),bankCapacity=storageCapacityStatus(state.bank.stacks,effectiveBankCapacity),activeCapacity=location==='inventory'?inventoryCapacity:bankCapacity;
  const activeNewCount=new Set(state[location].stacks.filter(stack=>stack.quantity>0&&newItemSet.has(stack.itemId)).map(stack=>stack.itemId)).size;
  const stacks=visibleStacks(state[location].stacks,query,filter,sort,favorites,newItemIds);
  const selectedSet=new Set(selectedIds),selectionSummary=bulkSelectionSummary(state,selectedIds,location);
  const exitSelection=()=>{setSelectMode(false);setSelectedIds([]);setBulkPending(null)};
  const changeLocation=(value:BulkStorageLocation)=>{if(value===location)return;exitSelection();setLocation(value)};
  const toggleSelection=(itemId:string)=>{setSelectedIds(current=>{if(current.includes(itemId))return current.filter(id=>id!==itemId);if(current.length>=100){setError(gt("Select up to 100 item stacks at once."));return current;}setError('');return [...current,itemId]})};
  const selectShown=()=>{const ids=[...new Set(stacks.map(stack=>stack.itemId))].slice(0,100);setSelectedIds(ids);setError(stacks.length>100?gt("Selected the first 100 matching stacks."):'')};
  const beginSelection=()=>{setSelectMode(true);setSelectedIds([]);setPreviewId(null);setInspectId(null);setError('')};
  const beginBulk=(kind:BulkAction)=>{const ids=kind==='transfer'?selectionSummary.transferableIds:kind==='sell'?selectionSummary.sellableIds:selectionSummary.salvageableIds;if(ids.length)setBulkPending({kind,ids})};
  const closeInspect=()=>{if(inspectId&&newItemSet.has(inspectId))run(()=>onAcknowledgeItem(inspectId));setInspectId(null)};
  const renderStack=(stack:ItemStack)=>{
    const item=itemDef(stack.itemId),favorite=favoriteSet.has(item.id),newItem=newItemSet.has(item.id),selected=selectedSet.has(item.id),autoEat=state.character?.equippedFoodId===item.id,rarity=rarityMeta(item.type==='gear'?effectiveOwnedGearRarity(state,item.id):itemRarity(item)),goalProtected=goalProtection.has(item.id);
    const label=[gt('{name}, {count} owned',{name:item.name,count:formatGameNumber(stack.quantity,state.settings.numberMode,state.settings.language)}),favorite?gt('favorite'):'',newItem?gt('New'):'',goalProtected?gt('needed for Working Toward'):''].filter(Boolean).join(', ');
    return <Pressable key={`${location}:${item.id}`} accessibilityRole={selectMode?'checkbox':'button'} accessibilityLabel={selectMode?gt(selected?'Deselect {label}':'Select {label}',{label}):label} accessibilityHint={selectMode?gt("Select this stack for bulk management"):gt("Open item details, sources and crafting uses")} accessibilityState={selectMode?{checked:selected}:undefined} onPress={()=>selectMode?toggleSelection(item.id):item.type==='gear'&&location==='inventory'?setPreviewId(item.id):setInspectId(item.id)} style={({pressed})=>[s.itemTile,{width:tileSize,height:tileSize,borderColor:selected?C.selectionLine:goalProtected||autoEat?C.good:rarity.color,backgroundColor:selected?C.selection:C.panel},pressed&&s.pressed]}>
      <ItemArtwork itemId={item.id} size={iconSize}/>
      <Text accessible={false} style={[s.itemQuantity,{color:rarity.color}]}>×{formatGameNumber(stack.quantity,state.settings.numberMode,state.settings.language)}</Text>
      {newItem?<View accessible={false} style={s.itemNew}><Text style={s.itemNewText}>{gt("New").toLocaleUpperCase(language)}</Text></View>:null}
      {favorite?<Text accessible={false} style={s.itemFavorite}>★</Text>:null}
      {autoEat&&!selectMode?<Text accessible={false} style={s.itemAuto}>{gt("EAT")}</Text>:null}
      {selectMode?<View accessible={false} style={[s.itemSelected,selected&&s.itemSelectedOn]}><Text style={s.itemSelectedText}>{selected?'✓':'○'}</Text></View>:null}
    </Pressable>;
  };
  const foodWarning=pending?.item.id===state.character?.equippedFoodId?gt("This is your selected auto-eat food. Only food carried in Inventory can be consumed in combat."):'';
  const goalWarning=pending&&pending.kind!=='deposit'?goalProtection.get(pending.item.id):undefined;
  const goalWarningText=goalWarning?gt('Working Toward is using this item for {goal}. Additional goals: {count}.',{goal:goalWarning.goalTitles[0],count:goalWarning.goalTitles.length-1}):'';
  const message=[pending?.kind==='sell'?gt('Sell 1 for {gold} gold. This cannot be undone.',{gold:pending.item.value}):pending?.kind==='deposit'?gt('Move {count}× {name} to Bank?',{count:pending.quantity,name:pending.item.name}):pending?.item.salvage?gt('Destroy 1 item for {count}× {name}.',{count:pending.item.salvage.quantity,name:itemDef(pending.item.salvage.itemId).name}):'',pending?.kind==='deposit'||pending?.kind==='sell'?foodWarning:'',goalWarningText].filter(Boolean).join(' ');
  const bulkMessage=bulkPending?.kind==='transfer'
    ?[gt('Move {stacks} selected stacks ({items} items) to {location}?',{stacks:selectionSummary.transferableStackCount,items:selectionSummary.transferableUnitCount,location:gt(location==='inventory'?'Bank':'Inventory')}),selectionSummary.transferProtectedCount?gt('{count} auto-eat stacks stay in Inventory.',{count:selectionSummary.transferProtectedCount}):'',gt('The move is all-or-nothing if storage space is insufficient.')].filter(Boolean).join(' ')
    :bulkPending?.kind==='sell'||bulkPending?.kind==='salvage'
      ?[bulkPending.kind==='sell'?gt('Sell {stacks} eligible stacks ({items} items) for {gold} gold?',{stacks:selectionSummary.sellableStackCount,items:selectionSummary.sellableUnitCount,gold:formatGameNumber(selectionSummary.sellGold,state.settings.numberMode,state.settings.language)}):gt('Salvage {stacks} eligible equipment stacks ({items} items)?',{stacks:selectionSummary.salvageableStackCount,items:selectionSummary.salvageableUnitCount}),bulkPending.kind==='sell'?(selectionSummary.sellProtectedCount?gt('{count} selected stacks are excluded by protection or sell rules.',{count:selectionSummary.sellProtectedCount}):''):(selectionSummary.salvageProtectedCount?gt('{count} selected stacks are protected or not salvageable.',{count:selectionSummary.salvageProtectedCount}):''),selectionSummary.goalProtectedCount?gt('{count} Working Toward stacks remain protected.',{count:selectionSummary.goalProtectedCount}):'',gt('This cannot be undone.')].filter(Boolean).join(' ')
      :'';
  const confirmBulk=()=>{if(!bulkPending)return;const action=bulkPending,request:InventoryFeedbackRequest=action.kind==='transfer'?{kind:'bulk_transfer',direction:location==='inventory'?"deposit":"withdraw",stacks:selectionSummary.transferableStackCount,units:selectionSummary.transferableUnitCount}:action.kind==='sell'?{kind:'bulk_sell',stacks:selectionSummary.sellableStackCount,units:selectionSummary.sellableUnitCount,gold:selectionSummary.sellGold}:{kind:'bulk_salvage',stacks:selectionSummary.salvageableStackCount,units:selectionSummary.salvageableUnitCount};runInventory(request,()=>onBulkAction(action.kind,location,action.ids));setBulkPending(null);exitSelection()};
  const remaining=claimOverflowToBank(state).overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const overflowCount=state.overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const inventoryUpgrade=storageUpgradePreview(state,"inventory"),bankUpgrade=storageUpgradePreview(state,"bank");
  const inspected=inspectId?itemDef(inspectId):undefined,carried=location==='inventory';
  const inspectActions=inspected?<View style={s.inspectActions}>
    {carried&&inspected.type==='gear'?<GameButton compact title={gt("Compare stats")} tone="secondary" onPress={()=>{setPreviewId(inspected.id);closeInspect()}}/>:null}
    {carried&&inspected.type==='gear'?<GameButton compact title={gt('Equip {slot}',{slot:gl(inspected.slot)})} onPress={()=>{run(()=>onEquip(inspected.id));closeInspect()}}/>:null}
    {carried&&inspected.type==='food'?<GameButton compact title={state.character?.equippedFoodId===inspected.id?gt("Auto-eat selected"):gt("Use for auto-eat")} disabled={state.character?.equippedFoodId===inspected.id} onPress={()=>{run(()=>onFood(inspected.id));closeInspect()}}/>:null}
    {carried&&inspected.type==='food'?<GameButton compact title={recoveryAmount(state,inspected.id)===0?gt("Health full"):gt('Eat 1 · +{hp} HP',{hp:formatGameNumber(recoveryAmount(state,inspected.id),state.settings.numberMode,state.settings.language)})} disabled={recoveryAmount(state,inspected.id)===0} tone="secondary" onPress={()=>{run(()=>onEat(inspected.id));closeInspect()}}/>:null}
    <GameButton compact title={favoriteSet.has(inspected.id)?gt("Remove favorite"):gt("Favorite")} tone="secondary" onPress={()=>{run(()=>onToggleFavorite(inspected.id));closeInspect()}}/>
    {carried?<GameButton compact title={gt('Deposit {count}',{count:formatGameNumber(transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);if(state.character?.equippedFoodId===inspected.id)setPending({kind:"deposit",item:inspected,quantity:amount});else runInventory({kind:"deposit",itemId:inspected.id,quantity:amount},()=>onDeposit(inspected.id,amount));closeInspect()}}/>:<GameButton compact title={gt('Withdraw {count}',{count:formatGameNumber(transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);runInventory({kind:"withdraw",itemId:inspected.id,quantity:amount},()=>onWithdraw(inspected.id,amount));closeInspect()}}/>}
    {carried&&inspected.value>0&&!favoriteSet.has(inspected.id)?<GameButton compact title={gt('Sell 1 · {gold}g',{gold:formatGameNumber(inspected.value,state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{setPending({kind:"sell",item:inspected,quantity:1});closeInspect()}}/>:null}
    {carried&&inspected.salvage&&!favoriteSet.has(inspected.id)?<GameButton compact title={gt("Salvage 1")} tone="danger" onPress={()=>{setPending({kind:"salvage",item:inspected,quantity:1});closeInspect()}}/>:null}
  </View>:null;
  return <><EquipmentPreview state={state} itemId={previewId} onClose={()=>{if(previewId&&newItemSet.has(previewId))run(()=>onAcknowledgeItem(previewId));setPreviewId(null)}} onEquip={()=>{if(previewId)run(()=>{onEquip(previewId);setPreviewId(null)})}} onInspect={()=>{setInspectId(previewId);setPreviewId(null)}} onFavorite={()=>{if(previewId)run(()=>onToggleFavorite(previewId))}} onDeposit={()=>{if(previewId){const id=previewId,amount=transferAmount(state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0,quantity);runInventory({kind:"deposit",itemId:id,quantity:amount},()=>{onDeposit(id,amount);setPreviewId(null)})}}}/><ItemQuickInspect state={state} itemId={inspectId} onClose={closeInspect} onNavigate={destination=>{closeInspect();onNavigateInspect(destination)}} actions={inspectActions}/><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.h}>{gt("Inventory")}</Text>
    <Text style={s.sub}>{gl("Everything for your next adventure.")}</Text>
    <View style={s.storageRow}>{(["inventory","bank"] as const).map(value=><StorageChip key={value} label={value==='inventory'?gt("Inventory"):gt("Bank")} selected={location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}</View>
    {activeCapacity.level!=='ok'&&<Text accessibilityRole="alert" style={activeCapacity.level==='full'?s.capacityFull:s.warning}>{gt(activeCapacity.level==='full'?'{location} is full. Free a slot or upgrade storage before receiving another unique stack.':'{location} is {percent}% full · {free} slots remain.',{location:gt(location==='inventory'?'Inventory':'Bank'),percent:activeCapacity.percent,free:activeCapacity.free})}</Text>}
    {location==='bank'&&<Text style={s.sub}>{gt("Bank materials are available for crafting, but food must be withdrawn for combat.")}</Text>}
    <SearchField accessibilityLabel={gt("Search stored items")} placeholder={gt("Search items…")} placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    {!selectMode&&<ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.quickFilters}>{FILTER_OPTIONS.filter(row=>['all','gear','material','gem','food'].includes(row.id)).map(row=><Pressable key={row.id} accessibilityRole="button" accessibilityLabel={gl(row.label)+' '+gl('category')} accessibilityState={{selected:filter===row.id}} onPress={()=>setFilter(row.id)} style={[s.quickFilter,filter===row.id&&s.utilityChipActive]}><Text style={s.utilityChipText}>{gl(row.label)}</Text></Pressable>)}</ScrollView>}

    {!!error&&<Text accessibilityRole="alert" style={s.errorText}>{gl(error)}</Text>}
    {inventoryFeedback&&<ActionFeedback message={gl(inventoryFeedback.message)} tone={inventoryFeedback.tone} reduceMotion={state.settings.reduceMotion} compact/>}
    {equipMoment&&<EquipmentSwapMoment moment={equipMoment} reduceMotion={state.settings.reduceMotion} onDismiss={()=>setEquipMoment(null)}/>}
    <View style={s.resultRow}>
      {selectMode?<Text style={[s.sub,s.resultSummary]}>{gt('{count} selected · {stacks} matching stacks',{count:selectedIds.length,stacks:stacks.length})}</Text>:<Pressable accessibilityRole="button" accessibilityLabel={gt('Sort items. Current sort: {sort}',{sort:gl(SORT_OPTIONS.find(option=>option.id===sort)?.label)})} accessibilityState={{expanded:sortOpen}} onPress={()=>setSortOpen(value=>!value)} style={s.sortTrigger}><Text style={s.sub}>{gl('Sort:')} <Text style={s.sortValue}>{gl(SORT_OPTIONS.find(option=>option.id===sort)?.label)}</Text></Text><Text accessible={false} style={s.sortChevron}>{sortOpen?'⌃':'⌄'}</Text></Pressable>}
      {stacks.length>0&&<Pressable accessibilityRole="button" accessibilityLabel={selectMode?gt("Finish selecting items"):gt("Select multiple items")} onPress={selectMode?exitSelection:()=>{setSortOpen(false);beginSelection()}} style={s.textAction}><Text style={s.sortValue}>{selectMode?gt("Done"):gt("Select")}</Text></Pressable>}
      {!selectMode&&<Pressable accessibilityRole="button" accessibilityLabel={gt('Filter items. Current filter: {filter}',{filter:gl(FILTER_OPTIONS.find(option=>option.id===filter)?.label??filter)})} onPress={()=>{setSortOpen(false);setFilterOpen(true)}} style={s.textAction}><Text style={s.sortValue}>{['all','gear','material','gem','food'].includes(filter)?'•••':gl(FILTER_OPTIONS.find(option=>option.id===filter)?.label)}</Text></Pressable>}
    </View>
    {sortOpen&&!selectMode&&<View accessibilityRole="radiogroup" accessibilityLabel={gl('Sort items')} style={s.sortMenu}>{SORT_OPTIONS.map(option=><Pressable key={option.id} accessibilityRole="radio" accessibilityState={{checked:sort===option.id}} onPress={()=>{setSort(option.id);setSortOpen(false)}} style={[s.sortOption,sort===option.id&&s.utilityChipActive]}><Text style={s.sortValue}>{gl(option.label)}</Text><Text style={s.sortValue}>{sort===option.id?'✓':''}</Text></Pressable>)}</View>}

    {selectMode&&<Panel><View style={s.selectionHead}><View style={s.resultSummary}><Text style={s.selectionTitle}>{gt('BULK MANAGEMENT · {count} SELECTED',{count:selectedIds.length})}</Text><Text style={s.sub}>{gt("Whole stacks only · up to 100 stacks per action")}</Text></View><View style={s.selectionQuick}><Pressable accessibilityRole="button" onPress={selectShown} style={({pressed})=>[s.selectionQuickButton,pressed&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Select shown")}</Text></Pressable><Pressable accessibilityRole="button" disabled={!selectedIds.length} onPress={()=>setSelectedIds([])} style={({pressed})=>[s.selectionQuickButton,!selectedIds.length&&s.selectionQuickDisabled,pressed&&selectedIds.length>0&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Clear")}</Text></Pressable></View></View><Text style={s.sub}>{location==='inventory'?gt("Working Toward items, favorites and enhanced gear are automatically excluded from bulk disposal. Your selected auto-eat food also stays in Inventory."):gt("Withdraw selected moves complete Bank stacks back to this character.")}</Text><View style={s.bulkActions}><GameButton compact title={`${location==='inventory'?gt("Deposit"):gt("Withdraw")} · ${selectionSummary.transferableStackCount}`} disabled={!selectionSummary.transferableStackCount} tone="secondary" onPress={()=>beginBulk('transfer')}/>{location==='inventory'&&<GameButton compact title={`${gt("Sell")} · ${selectionSummary.sellableStackCount} · ${formatGameNumber(selectionSummary.sellGold,state.settings.numberMode,state.settings.language)}g`} disabled={!selectionSummary.sellableStackCount} tone="secondary" onPress={()=>beginBulk("sell")}/>} {location==='inventory'&&<GameButton compact title={`${gt("Salvage")} · ${selectionSummary.salvageableStackCount}`} disabled={!selectionSummary.salvageableStackCount} tone="danger" onPress={()=>beginBulk("salvage")}/>}</View>{selectedIds.length>0&&location==='inventory'&&(selectionSummary.sellProtectedCount>0||selectionSummary.transferProtectedCount>0||selectionSummary.goalProtectedCount>0)&&<Text style={s.selectionNote}>{[gt('{count} selected stacks are excluded by protection or sell rules.',{count:selectionSummary.sellProtectedCount}),selectionSummary.goalProtectedCount?gt('{count} Working Toward stacks remain protected.',{count:selectionSummary.goalProtectedCount}):'',selectionSummary.transferProtectedCount?gt('{count} auto-eat stacks stay in Inventory.',{count:selectionSummary.transferProtectedCount}):''].filter(Boolean).join(' ')}</Text>}</Panel>}
    {stacks.length?<><View style={s.itemGrid} onLayout={event=>setGridWidth(event.nativeEvent.layout.width)}>{stacks.map(renderStack)}</View></>:<><EmptyState title={gt("No items to show")} message={gt("Try another storage tab or clear the search and category filter.")}/><GameButton title={gt("Clear filters")} tone="secondary" onPress={()=>{setQuery('');setFilter("all")}}/></>}
<Text style={s.inspectHint}>{gl('Goal items, favorites and enhanced gear are protected from bulk disposal.')}</Text>
    {location==='inventory'&&!selectMode?<GameButton title={gt("Deposit all materials")} tone="secondary" disabled={!state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')} onPress={()=>run(onDepositMaterials)}/>:null}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showStorage}} onPress={()=>setShowStorage(value=>!value)} style={s.disclosure}><View style={s.flex}><Text style={s.disclosureTitle}>{gt("STORAGE MANAGEMENT")}</Text><Text style={s.sub}>{gt("Bulk deposit and capacity upgrades")}</Text></View><Text style={s.disclosureMark}>{showStorage?'−':'+'}</Text></Pressable>
    {showStorage&&<Panel><Text style={s.sub}>{gt("Inventory travels with this character. Bank storage is shared by every character on the account.")}</Text>{location==='inventory'&&<GameButton title={gt("Deposit all materials")} tone="secondary" disabled={!state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')} onPress={()=>run(onDepositMaterials)}/>}<View style={s.row}><View style={s.flex}><Text style={s.upgradeLabel}>{gt('{location} · {count} slots',{location:gt('Inventory'),count:effectiveInventoryCapacity})}{effectiveInventoryCapacity>state.inventory.capacity?' · '+gt('{count} base',{count:state.inventory.capacity}):''}</Text><GameButton title={inventoryUpgrade?gt('Upgrade to {capacity} · {gold}g',{capacity:inventoryUpgrade.capacity,gold:formatGameNumber(inventoryUpgrade.cost,state.settings.numberMode,state.settings.language)}):gt("Inventory maxed")} disabled={!inventoryUpgrade} tone="secondary" onPress={()=>run(()=>onUpgradeStorage("inventory"))}/></View><View style={s.flex}><Text style={s.upgradeLabel}>{gt('{location} · {count} slots',{location:gt('Bank'),count:effectiveBankCapacity})}{effectiveBankCapacity>state.bank.capacity?' · '+gt('{count} base',{count:state.bank.capacity}):''}</Text><GameButton title={bankUpgrade?gt('Upgrade to {capacity} · {gold}g',{capacity:bankUpgrade.capacity,gold:formatGameNumber(bankUpgrade.cost,state.settings.numberMode,state.settings.language)}):gt("Bank maxed")} disabled={!bankUpgrade} tone="secondary" onPress={()=>run(()=>onUpgradeStorage("bank"))}/></View></View></Panel>}
    {overflowCount>0&&<Panel><Text style={s.title}>{ot(state.settings.language,'overflow.title')} · {overflowCount}</Text><Text style={s.warning}>{ot(state.settings.language,'overflow.body')}</Text>{state.overflow.stacks.map((stack,index)=><Text key={`${stack.itemId}:${index}`} style={s.sub}>{stack.quantity}× {itemDef(stack.itemId).name}</Text>)}{state.overflow.expiresAtMs!==null&&<Text style={s.warning}>{gt('Recorded expiry: {date}',{date:new Date(state.overflow.expiresAtMs).toLocaleString(language)})}</Text>}<GameButton title={ot(state.settings.language,'overflow.move',{count:overflowCount-remaining})} disabled={remaining===overflowCount} onPress={()=>run(onOverflow)}/>{remaining>0&&<Text style={s.sub}>{ot(state.settings.language,'overflow.remain',{count:remaining})}</Text>}</Panel>}
  </ScrollView>
  <GameModalSurface visible={filterOpen} reduceMotion={state.settings.reduceMotion} onClose={()=>setFilterOpen(false)} backdropLabel={gt("Close inventory filters")} surfaceStyle={s.filterSheet}>
        <GameModalHeader eyebrow={gt("INVENTORY VIEW")} title={gt("Filter items")} onClose={()=>setFilterOpen(false)}/>
        <ScrollView style={s.filterList} contentContainerStyle={s.filterListContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          {FILTER_OPTIONS.map(option=>{const selected=filter===option.id,label=option.id==='new'&&activeNewCount?`${gt("New")} · ${activeNewCount}`:gl(option.label);return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>setFilter(option.id)} style={({pressed})=>[s.filterOption,selected&&s.filterOptionSelected,pressed&&s.pressed]}><Text style={[s.filterOptionText,selected&&s.filterOptionTextSelected]}>{label}</Text><Text style={[s.filterOptionMark,selected&&s.filterOptionMarkSelected]}>{selected?'✓':'›'}</Text></Pressable>})}
        </ScrollView>
        {newItemIds.length>0&&<GameButton title={gt("Mark all seen")} tone="secondary" onPress={()=>run(onAcknowledgeAll)}/>}
        <UtilityChip label={gt('⇄ Move · {count}',{count:quantity==='all'?gt('All'):quantity})} accessibilityLabel={gt('Transfer quantity. Current amount: {count}',{count:quantity==='all'?gt('All'):quantity})} onPress={()=>setQuantity(value=>nextQuantity(value))}/>
        <View style={s.sheetActions}><View style={s.flex}><GameButton title={gt("Reset")} tone="secondary" onPress={()=>setFilter("all")}/></View><View style={s.flex}><GameButton title={gt("Done")} onPress={()=>setFilterOpen(false)}/></View></View>
  </GameModalSurface>
  <ConfirmModal visible={pending!==null} title={gt('{action} {name}?',{action:gt(pending?.kind==='deposit'?'Deposit':pending?.kind==='sell'?'Sell':'Salvage'),name:pending?.item.name??''})} message={message} confirmLabel={pending?.kind==='deposit'?gt("Deposit"):pending?.kind==='sell'?gt("Sell 1"):gt("Salvage 1")} danger={pending?.kind!=='deposit'} reduceMotion={state.settings.reduceMotion} onConfirm={confirm} onCancel={()=>setPending(null)}/><ConfirmModal visible={bulkPending!==null} title={bulkPending?.kind==='transfer'?gt('{action} selected stacks?',{action:gt(location==='inventory'?'Deposit':'Withdraw')}):bulkPending?.kind==='sell'?gt("Sell selected items?"):gt("Salvage selected equipment?")} message={bulkMessage} confirmLabel={bulkPending?.kind==='transfer'?(location==='inventory'?gt("Deposit selected"):gt("Withdraw selected")):bulkPending?.kind==='sell'?gt("Sell eligible"):gt("Salvage eligible")} danger={bulkPending?.kind!=='transfer'} reduceMotion={state.settings.reduceMotion} onConfirm={confirmBulk} onCancel={()=>setBulkPending(null)}/></>;
}
function UtilityChip({label,accessibilityLabel,selected=false,onPress}:{label:string;accessibilityLabel:string;selected?:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.utilityChip,selected&&s.utilityChipActive,pressed&&s.pressed]}><Text numberOfLines={1} style={[s.utilityChipText,selected&&s.utilityChipTextActive]}>{label}</Text></Pressable>}
function StorageChip({label,selected,status,onPress}:{label:string;selected:boolean;status:ReturnType<typeof storageCapacityStatus>;onPress:()=>void}){const {gt}=useGameplayText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipmentColors=equipmentTheme(C),tone=status.level==='full'?C.bad:status.level==='near'?C.warning:selected?equipmentColors.selectedLine:C.line,width=`${status.percent}%` as `${number}%`;return <Pressable accessibilityRole="button" accessibilityLabel={gt('{label} storage, {used} of {capacity} slots used, {free} free',{label,used:status.used,capacity:status.capacity,free:status.free})} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.storageChip,selected&&s.storageChipSelected,status.level==='full'&&s.storageChipFull,pressed&&s.pressed]}><View style={s.storageChipTop}><Text style={[s.storageChipLabel,selected&&s.storageChipLabelSelected]}>{selected?'✓ ':''}{label}</Text><Text style={[s.storageChipCount,{color:tone}]}>{status.used}/{status.capacity}</Text></View><View style={s.capacityTrack}><View style={[s.capacityFill,{width,backgroundColor:tone}]}/></View></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  equipMoment:{gap:6,padding:spacing.sm,borderWidth:1,borderLeftWidth:4,borderRadius:10,backgroundColor:C.panel2},
  equipMomentHead:{flexDirection:'row',alignItems:'center',gap:8},
  equipMomentEyebrow:{...typography.caption,fontWeight:'900',letterSpacing:.8},
  equipMomentName:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  equipMomentSlot:{...typography.caption,fontWeight:'900',letterSpacing:.6},
  equipMomentMeta:{...typography.caption,color:C.muted},
  equipMomentDelta:{...typography.bodyStrong,color:C.info,fontWeight:'900'},
  setChange:{gap:2,padding:7,borderWidth:1,borderRadius:8},
  setChangeTitle:{...typography.caption,fontWeight:'900',letterSpacing:.45},
  root:{padding:16,gap:12,paddingBottom:100,width:'100%',maxWidth:960,alignSelf:'center'},
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
  sortTrigger:{flex:1,minHeight:44,flexDirection:'row',alignItems:'center',gap:5},sortChevron:{...typography.body,color:C.muted,transform:[{translateY:-3}]},sortValue:{...typography.bodyStrong,color:C.text},textAction:{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center',paddingHorizontal:6},sortMenu:{borderWidth:1,borderColor:C.lineStrong,borderRadius:10,overflow:'hidden',backgroundColor:C.panel},sortOption:{minHeight:44,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  resultRow:{flexDirection:'row',alignItems:'center',gap:8},
  resultSummary:{flex:1,minWidth:0},
  markSeen:{minHeight:44,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
  markSeenText:{fontSize:10,color:C.info,fontWeight:'900'},
  resultActions:{flexDirection:'row',alignItems:'center',gap:6},
  selectModeButton:{minHeight:44,justifyContent:'center',paddingHorizontal:11,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  selectModeButtonActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
  selectModeText:{fontSize:10,color:C.text,fontWeight:'900'},
  selectModeTextActive:{color:C.selectionLine},
  selectionHead:{flexDirection:'row',alignItems:'center',gap:8},
  selectionTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.6},
  selectionQuick:{flexDirection:'row',gap:6},
  selectionQuickButton:{minHeight:44,justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},
  selectionQuickDisabled:{opacity:.45},
  selectionQuickText:{fontSize:10,color:C.text,fontWeight:'800'},
  bulkActions:{flexDirection:'row',flexWrap:'wrap',gap:8},
  selectionNote:{...typography.caption,color:C.warning},
  utilityRow:{flexDirection:'row',gap:6},
  inspectHint:{...typography.caption,color:C.muted,textAlign:'center'},
  gridHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:2},gridLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},gridMeta:{...typography.caption,color:C.muted},
  itemGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  itemTile:{position:'relative',alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:10},
  itemQuantity:{position:'absolute',right:3,bottom:3,paddingHorizontal:4,borderRadius:7,overflow:'hidden',fontSize:9,lineHeight:14,fontWeight:'900',backgroundColor:C.panel},
  itemNew:{position:'absolute',left:3,top:3,paddingHorizontal:3,paddingVertical:1,borderRadius:3,backgroundColor:C.info},itemNewText:{fontSize:9,color:C.panel,fontWeight:'900',letterSpacing:.3},
  itemFavorite:{position:'absolute',right:4,top:1,fontSize:12,color:C.accent},
  itemAuto:{position:'absolute',left:3,bottom:3,paddingHorizontal:3,paddingVertical:1,borderRadius:3,overflow:'hidden',fontSize:6,lineHeight:8,color:C.panel,fontWeight:'900',letterSpacing:.35,backgroundColor:C.good},
  itemSelected:{position:'absolute',left:3,bottom:3,width:17,height:17,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},itemSelectedOn:{borderColor:C.selectionLine,backgroundColor:C.selection},itemSelectedText:{fontSize:10,color:C.text,fontWeight:'900'},
  quickFilters:{gap:8},quickFilter:{minHeight:44,paddingHorizontal:16,justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},inspectActions:{gap:spacing.xs},
  utilityChip:{minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
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

import {useGameplayText} from '../i18n/gameplay';
import {SearchField} from '../components/SearchField';
import {newInventoryScreenState,openInventoryFood,type InventoryScreenState} from '../core/inventory-screen-state';
import {scheduleAfterPaint} from '../core/use-delayed-busy';
import {liveHealthState} from '../core/live-health';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Animated,FlatList,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {GameState,ItemStack} from '../core/types';
import {ItemDef,itemDef} from '../content/items';
import {isReleasedEquipmentItemId} from '../content/equipment-release';
import {InventoryFilter,InventorySort,inventoryFavoriteIds,inventoryLockedIds,inventoryNewItemIds,recoveryAmount,storageCapacityStatus,transferAmount,transferError,visibleStacks} from '../core/inventory-view';
import {entitlementStorageCapacity} from '../core/account-entitlements';
import {claimOverflowToBank,StorageLocation,storageUpgradePreview} from '../core/game';
import {ItemArtwork} from '../components/ItemArtwork';
import {GemPouchPanel} from '../components/GemPouchPanel';
import {gemPouch} from '../core/gem-pouch';
import {ConfirmModal} from '../components/ConfirmModal';
import {GameModalHeader,GameModalSurface} from '../components/GameModalSurface';
import {EmptyState} from '../components/EmptyState';
import {ActionFeedback} from '../components/ActionFeedback';
import {GameButton} from '../components/GameButton';
import {UiIcon} from '../components/UiIcon';
import {Panel} from '../components/Panel';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentPreview} from '../components/EquipmentPreview';
import {ItemQuickInspect} from '../components/ItemQuickInspect';
import {previewEquipment} from '../core/equipment-preview';
import {formatGameNumber} from '../core/number-format';
import {ot} from '../i18n';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {craftedGearInstances,craftedGearDisplayQuality} from '../core/crafted-gear-instances';
import {auditCraftedGearOwnership,craftedGearCopiesAt} from '../core/crafted-gear-ownership';
import type {GameCommand} from '../core/game-commands';
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
export function InventoryScreen({state,viewMemory,foodRequest=0,onEquip,onFood,onEat,onSell,onSalvage,onDeposit,onDepositMaterials,onUpgradeStorage,onWithdraw,onBankSell,onBankGoldTransfer,onOverflow,onToggleFavorite,onToggleLock,onAcknowledgeItem,onAcknowledgeAll,onBulkAction,onNavigateInspect,onCommand}:{state:GameState;viewMemory?:InventoryScreenState;foodRequest?:number;onEquip:(id:string)=>void|Promise<unknown>;onFood:(id:string)=>void|Promise<unknown>;onEat:(id:string)=>void|Promise<unknown>;onSell:(id:string,quantity:number)=>void|Promise<unknown>;onSalvage:(id:string)=>void|Promise<unknown>;onDeposit:(id:string,quantity:number)=>void|Promise<unknown>;onDepositMaterials:()=>void|Promise<unknown>;onUpgradeStorage:(location:StorageLocation)=>void|Promise<unknown>;onWithdraw:(id:string,quantity:number)=>void|Promise<unknown>;onBankSell:(id:string,quantity:number)=>void|Promise<unknown>;onBankGoldTransfer:(direction:'deposit'|'withdraw',amount:number)=>void|Promise<unknown>;onOverflow:()=>void|Promise<unknown>;onToggleFavorite:(id:string)=>void|Promise<unknown>;onToggleLock:(id:string)=>void|Promise<unknown>;onAcknowledgeItem:(id:string)=>void|Promise<unknown>;onAcknowledgeAll:()=>void|Promise<unknown>;onBulkAction:(kind:BulkAction,location:BulkStorageLocation,ids:string[])=>void|Promise<unknown>;onNavigateInspect:(destination:WorkingTowardDestination)=>void|Promise<unknown>;onCommand?:(command:GameCommand)=>Promise<unknown>}){
 const {gt,gl,language}=useGameplayText();
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const healthState=liveHealthState(state,Date.now());
  const {width,fontScale}=useWindowDimensions();
  const stackStorageActions=width<380||fontScale>=1.25;
  const [gridWidth,setGridWidth]=useState(Math.max(280,Math.min(960,width)-32));
  const gridColumns=gridWidth>=720?6:gridWidth>=480?5:gridWidth<300?3:4,tileSize=Math.floor((gridWidth-(gridColumns-1)*10)/gridColumns),iconSize=Math.min(88,tileSize-14);
  const memory=useRef(viewMemory??newInventoryScreenState()).current;
  const initial=useRef(foodRequest>memory.foodRequest?openInventoryFood(memory,foodRequest):{...memory}).current;
  const scrollRef=useRef<FlatList<ItemStack>>(null),scrollY=useRef(initial.scrollY),restored=useRef<number|null>(null);
  const [bankGoldAmount,setBankGoldAmount]=useState('');const [copyPending,setCopyPending]=useState<{instanceId:string;method:'sell'|'salvage';name:string}|null>(null);const [pending,setPending]=useState<Pending>(null),[location,setLocation]=useState<'inventory'|'bank'>(initial.location);
  const [pouchOpen,setPouchOpen]=useState(initial.pouchOpen===true);
  const [query,setQuery]=useState(initial.query),[filter,setFilter]=useState<InventoryFilter>(initial.filter),[sort,setSort]=useState<InventorySort>(initial.sort),[sortOpen,setSortOpen]=useState(false);
  useEffect(()=>{Object.assign(memory,{location,query,filter,sort,scrollY:scrollY.current,pouchOpen});},[memory,location,query,filter,sort,pouchOpen]);
  useEffect(()=>{if(foodRequest<=memory.foodRequest)return;Object.assign(memory,openInventoryFood(memory,foodRequest));setLocation('inventory');setPouchOpen(false);setQuery('');setFilter('food');setSelectMode(false);setSelectedIds([]);setInspectId(null);setPreviewId(null);setSortOpen(false);scrollY.current=0;scrollRef.current?.scrollToOffset({offset:0,animated:false});},[foodRequest,memory]);
  const [quantity,setQuantity]=useState<number|'all'>(1),[quantityInput,setQuantityInput]=useState('');
  const [error,setError]=useState('');
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [inspectId,setInspectId]=useState<string|null>(null),[selectedInstanceId,setSelectedInstanceId]=useState<string|null>(null);
  const [showStorage,setShowStorage]=useState(false),[filterOpen,setFilterOpen]=useState(false);
  const [selectMode,setSelectMode]=useState(false),[selectedIds,setSelectedIds]=useState<string[]>([]),[bulkPending,setBulkPending]=useState<BulkPending>(null);
  const equipmentSnapshot=useMemo(()=>equipmentFeedbackSnapshot(state),[state]);
  const [equipMoment,setEquipMoment]=useState<EquipmentChangeFeedback|null>(null),equipmentSnapshotRef=useRef(equipmentSnapshot);
  const [inventoryIntent,setInventoryIntent]=useState<InventoryFeedbackIntent|null>(null),[inventoryFeedback,setInventoryFeedback]=useState<InventoryActionFeedback|null>(null);
  const [inventoryBusyLabel,setInventoryBusyLabel]=useState<string|null>(null),inventoryBusyRef=useRef(false);
  const carriedGold=state.character?.gold??0,bankGold=state.bank.gold??0,customGoldAmount=Number(bankGoldAmount),validCustomGold=Number.isSafeInteger(customGoldAmount)&&customGoldAmount>0;
  useEffect(()=>{const next=equipmentSnapshot,previous=equipmentSnapshotRef.current;equipmentSnapshotRef.current=next;if(previous.characterId!==next.characterId){setEquipMoment(null);return;}const result=equipmentChangeFeedback(previous,next);if(result)setEquipMoment(result)},[equipmentSnapshot]);
  useEffect(()=>{if(!inventoryIntent)return;const result=resolveInventoryActionFeedback(inventoryIntent,state);if(result){setInventoryFeedback(result);setInventoryIntent(null)}},[state,inventoryIntent]);
  useEffect(()=>{if(!inventoryIntent)return;const timer=setTimeout(()=>setInventoryIntent(null),12000);return()=>clearTimeout(timer)},[inventoryIntent]);
  useEffect(()=>{if(!inventoryFeedback)return;const timer=setTimeout(()=>setInventoryFeedback(null),4500);return()=>clearTimeout(timer)},[inventoryFeedback]);
  const clearInventorySubmission=()=>{inventoryBusyRef.current=false;setInventoryBusyLabel(null)};


  const run=(action:()=>void)=>{try{action();setError('')}catch(e){setError(e instanceof Error?e.message:gt("Action failed. Please try again."))}};
  const beginInventorySubmission=async(label:string,action:()=>void|Promise<unknown>)=>{if(inventoryBusyRef.current)return false;inventoryBusyRef.current=true;setInventoryBusyLabel(label);try{await action();setError('');return true}catch(e){setError(e instanceof Error?e.message:gt("Action failed. Please try again."));return false}finally{clearInventorySubmission()}};
  const transferGold=async(direction:'deposit'|'withdraw',amount:number)=>{const available=direction==='deposit'?carriedGold:bankGold;if(!Number.isSafeInteger(amount)||amount<1||amount>available){setError(direction==='deposit'?'Enter a valid amount of carried Gold.':'Enter a valid amount of Bank Gold.');return;}const success=await beginInventorySubmission(direction==='deposit'?gt("Moving Gold to Bank…"):gt("Moving Gold to Inventory…"),()=>onBankGoldTransfer(direction,amount));if(success)setBankGoldAmount('')};
  const runInventory=(request:InventoryFeedbackRequest,action:()=>void|Promise<unknown>)=>{const intent=inventoryFeedbackIntent(state,request),label=request.kind==='sell'||request.kind==='bulk_sell'?gt("Selling items…"):request.kind==='withdraw'||request.kind==='bulk_transfer'&&request.direction==='withdraw'?gt("Moving items to Inventory…"):request.kind==='deposit'||request.kind==='bulk_transfer'?gt("Moving items to Bank…"):gt("Updating inventory…");void beginInventorySubmission(label,async()=>{await action();setInventoryIntent(intent);setInventoryFeedback(null)})};
  const confirm=()=>{if(!pending)return;const action=pending,request:InventoryFeedbackRequest=action.kind==='deposit'?{kind:"deposit",itemId:action.item.id,quantity:action.quantity}:action.kind==='sell'?{kind:"sell",itemId:action.item.id,quantity:action.quantity}:{kind:"salvage",itemId:action.item.id,quantity:1};setPending(null);scheduleAfterPaint(()=>runInventory(request,()=>action.kind==='deposit'?onDeposit(action.item.id,action.quantity):action.kind==='sell'?onSell(action.item.id,action.quantity):onSalvage(action.item.id)))};
  const favorites=useMemo(()=>inventoryFavoriteIds(state),[state.settings.favoriteItemIds]);
  const favoriteSet=useMemo(()=>new Set(favorites),[favorites]);
  const lockedIds=useMemo(()=>inventoryLockedIds(state),[state.settings.lockedItemIds]);
  const lockedSet=useMemo(()=>new Set(lockedIds),[lockedIds]);
  const newItemIds=useMemo(()=>inventoryNewItemIds(state),[state.inventory.stacks,state.bank.stacks,state.settings.seenItemIds]);
  const newItemSet=useMemo(()=>new Set(newItemIds),[newItemIds]);
  // Working Toward can depend on recipes, other resources and progression;
  // memoize by the authoritative snapshot, never by inventory alone.
  const goalProtection=useMemo(()=>workingTowardInventoryProtectionMap(state),[state]);
  const capacities=useMemo(()=>{
    const inventoryLimit=entitlementStorageCapacity(state,'inventory'),bankLimit=entitlementStorageCapacity(state,'bank');
    return {inventory:storageCapacityStatus(state.inventory.stacks,inventoryLimit),bank:storageCapacityStatus(state.bank.stacks,bankLimit)};
  },[state]);
  const effectiveInventoryCapacity=capacities.inventory.capacity,effectiveBankCapacity=capacities.bank.capacity;
  const inventoryCapacity=capacities.inventory,bankCapacity=capacities.bank,activeCapacity=location==='inventory'?inventoryCapacity:bankCapacity;
  const activeStacks=state[location].stacks;
   const activeNewCount=useMemo(()=>new Set(activeStacks.filter(stack=>{const item=itemDef(stack.itemId);return stack.quantity>0&&newItemSet.has(stack.itemId)&&(item.type!=='gear'||isReleasedEquipmentItemId(item.id));}).map(stack=>stack.itemId)).size,[activeStacks,newItemSet]);
  const stacks=useMemo(()=>visibleStacks(activeStacks,query,filter,sort,favorites,newItemIds),[activeStacks,query,filter,sort,favorites,newItemIds]);
  const selectedSet=useMemo(()=>new Set(selectedIds),[selectedIds]);
   const selectionSummary=useMemo(()=>bulkSelectionSummary(state,selectedIds,location),[state,selectedIds,location]);
  const exitSelection=()=>{setSelectMode(false);setSelectedIds([]);setBulkPending(null)};
  const changeLocation=(value:BulkStorageLocation)=>{if(value===location&&!pouchOpen)return;exitSelection();setPouchOpen(false);setLocation(value);setError('')};
  const openPouch=()=>{exitSelection();setPouchOpen(true);setPreviewId(null);setInspectId(null);setSortOpen(false);setError('')};
  const toggleSelection=(itemId:string)=>{setSelectedIds(current=>{if(current.includes(itemId))return current.filter(id=>id!==itemId);if(current.length>=100){setError(gt("Select up to 100 item stacks at once."));return current;}setError('');return [...current,itemId]})};
  const selectShown=()=>{const ids=[...new Set(stacks.map(stack=>stack.itemId))].slice(0,100);setSelectedIds(ids);setError(stacks.length>100?gt("Selected the first 100 matching stacks."):'')};
  const beginSelection=()=>{setSelectMode(true);setSelectedIds([]);setPreviewId(null);setInspectId(null);setError('')};
  const beginBulk=(kind:BulkAction)=>{const ids=kind==='transfer'?selectionSummary.transferableIds:kind==='sell'?selectionSummary.sellableIds:selectionSummary.salvageableIds;if(ids.length)setBulkPending({kind,ids})};
  const closeInspect=()=>{if(inspectId&&newItemSet.has(inspectId))run(()=>onAcknowledgeItem(inspectId));setInspectId(null);setSelectedInstanceId(null)};
  const renderStack=(stack:ItemStack)=>{
    const item=itemDef(stack.itemId),exactRecord=stack.instanceId?craftedGearInstances(state).find(row=>row.id===stack.instanceId):undefined,favorite=favoriteSet.has(item.id),locked=lockedSet.has(item.id)||exactRecord?.locked===true,newItem=newItemSet.has(item.id),selected=selectedSet.has(item.id),autoEat=state.character?.equippedFoodId===item.id,rarity=rarityMeta(exactRecord?.rarity??itemRarity(item)),goalProtected=goalProtection.has(item.id);
    const label=[gt('{name}, {count} owned',{name:item.name,count:formatGameNumber(stack.quantity,state.settings.numberMode,state.settings.language)}),favorite?gt('favorite'):'',locked?gt('Locked'):'',exactRecord?rarity.label:'',newItem?gt('New'):'',goalProtected?gt('needed for Working Toward'):''].filter(Boolean).join(', ');
    return <View key={`${location}:${item.id}:${stack.instanceId??'legacy'}`} style={[s.itemTile,{width:tileSize,height:tileSize,borderColor:rarity.color,borderWidth:rarity.borderWidth,backgroundColor:selected?C.selection:C.panel}]}>
      <Pressable accessibilityRole={selectMode?'checkbox':'button'} accessibilityLabel={selectMode?gt(selected?'Deselect {label}':'Select {label}',{label}):label} accessibilityHint={selectMode?gt("Select this stack for bulk management"):gt("Open item details, sources and crafting uses")} accessibilityState={selectMode?{checked:selected}:undefined} onPress={()=>{if(selectMode){toggleSelection(item.id);return;}if(!stack.instanceId&&item.type==='gear'&&location==='inventory'){setPreviewId(item.id);return;}setSelectedInstanceId(stack.instanceId??null);setInspectId(item.id)}} style={({pressed})=>[s.itemOpen,pressed&&s.pressed]}>
        <ItemArtwork itemId={item.id} size={iconSize}/>
        <Text accessible={false} style={[s.itemQuantity,{color:rarity.color}]}>{exactRecord?`Q${craftedGearDisplayQuality(exactRecord)}`:`×${formatGameNumber(stack.quantity,state.settings.numberMode,state.settings.language)}`}</Text>
        {newItem?<View accessible={false} style={[s.itemNew,selectMode&&s.itemNewTop]}><Text style={s.itemNewText}>{gt("New").toLocaleUpperCase(language)}</Text></View>:null}
        {autoEat&&!selectMode?<Text accessible={false} style={s.itemAuto}>{gt("EAT")}</Text>:null}
        {selectMode?<View accessible={false} style={[s.itemSelected,selected&&s.itemSelectedOn]}><Text style={s.itemSelectedText}>{selected?'✓':'○'}</Text></View>:null}
      </Pressable>
      {!selectMode&&<>
        <Pressable accessibilityRole="button" accessibilityLabel={locked?gt('Unlock {name}',{name:item.name}):gt('Lock {name}',{name:item.name})} accessibilityState={{selected:locked}} hitSlop={2} onPress={()=>{if(lockedSet.has(item.id)){void onToggleLock(item.id);return;}if(stack.instanceId&&exactRecord&&onCommand){void beginInventorySubmission('Updating equipment lock…',()=>onCommand({type:'gear_lock',args:{instanceId:stack.instanceId!,locked:!exactRecord.locked}}));return;}void onToggleLock(item.id)}} style={({pressed})=>[s.itemCorner,s.itemLockCorner,locked&&s.itemCornerActive,pressed&&s.pressed]}>
          <InventoryLockGlyph locked={locked} color={locked?C.warning:C.muted}/>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={favorite?gt('Remove {name} from favorites',{name:item.name}):gt('Favorite {name}',{name:item.name})} accessibilityState={{selected:favorite}} hitSlop={2} onPress={()=>{void onToggleFavorite(item.id)}} style={({pressed})=>[s.itemCorner,s.itemFavoriteCorner,favorite&&s.itemCornerActive,pressed&&s.pressed]}>
          <Text accessible={false} style={[s.itemStar,favorite&&s.itemStarOn]}>{favorite?'★':'☆'}</Text>
        </Pressable>
      </>}
    </View>;
  };
  const foodWarning=pending?.item.id===state.character?.equippedFoodId?gt("This is your selected auto-eat food. Only food carried in Inventory can be consumed in combat."):'';
  const goalWarning=pending&&pending.kind!=='deposit'?goalProtection.get(pending.item.id):undefined;
  const goalWarningText=goalWarning?gt('Working Toward is using this item for {goal}. Additional goals: {count}.',{goal:goalWarning.goalTitles[0],count:goalWarning.goalTitles.length-1}):'';
  const message=[pending?.kind==='sell'?gt('Sell {count} for {gold} gold. This cannot be undone.',{count:pending.quantity,gold:formatGameNumber(pending.item.value*pending.quantity,state.settings.numberMode,state.settings.language)}):pending?.kind==='deposit'?gt('Move {count}× {name} to Bank?',{count:pending.quantity,name:pending.item.name}):pending?.item.salvage?gt('Destroy 1 item for {count}× {name}.',{count:pending.item.salvage.quantity,name:itemDef(pending.item.salvage.itemId).name}):'',pending?.kind==='deposit'||pending?.kind==='sell'?foodWarning:'',goalWarningText].filter(Boolean).join(' ');
  const bulkMessage=bulkPending?.kind==='transfer'
    ?[gt('Move {stacks} selected stacks ({items} items) to {location}?',{stacks:selectionSummary.transferableStackCount,items:selectionSummary.transferableUnitCount,location:gt(location==='inventory'?'Bank':'Inventory')}),selectionSummary.transferProtectedCount?gt('{count} auto-eat stacks stay in Inventory.',{count:selectionSummary.transferProtectedCount}):'',gt('The move is all-or-nothing if storage space is insufficient.')].filter(Boolean).join(' ')
    :bulkPending?.kind==='sell'||bulkPending?.kind==='salvage'
      ?[bulkPending.kind==='sell'?gt('Sell {stacks} eligible stacks ({items} items) for {gold} gold?',{stacks:selectionSummary.sellableStackCount,items:selectionSummary.sellableUnitCount,gold:formatGameNumber(selectionSummary.sellGold,state.settings.numberMode,state.settings.language)}):gt('Salvage {stacks} eligible equipment stacks ({items} items)?',{stacks:selectionSummary.salvageableStackCount,items:selectionSummary.salvageableUnitCount}),bulkPending.kind==='sell'?(selectionSummary.sellProtectedCount?gt('{count} selected stacks are excluded by protection or sell rules.',{count:selectionSummary.sellProtectedCount}):''):(selectionSummary.salvageProtectedCount?gt('{count} selected stacks are protected or not salvageable.',{count:selectionSummary.salvageProtectedCount}):''),selectionSummary.goalProtectedCount?gt('{count} Working Toward stacks remain protected.',{count:selectionSummary.goalProtectedCount}):'',gt('This cannot be undone.')].filter(Boolean).join(' ')
      :'';
  const confirmBulk=()=>{if(!bulkPending)return;const action=bulkPending,actionLocation=location,request:InventoryFeedbackRequest=action.kind==='transfer'?{kind:'bulk_transfer',direction:actionLocation==='inventory'?"deposit":"withdraw",stacks:selectionSummary.transferableStackCount,units:selectionSummary.transferableUnitCount}:action.kind==='sell'?{kind:'bulk_sell',stacks:selectionSummary.sellableStackCount,units:selectionSummary.sellableUnitCount,gold:selectionSummary.sellGold}:{kind:'bulk_salvage',stacks:selectionSummary.salvageableStackCount,units:selectionSummary.salvageableUnitCount};setBulkPending(null);exitSelection();scheduleAfterPaint(()=>runInventory(request,()=>onBulkAction(action.kind,actionLocation,action.ids)))};
  const remaining=useMemo(()=>claimOverflowToBank(state).overflow.stacks.reduce((sum,item)=>sum+item.quantity,0),[state]);
  const overflowCount=state.overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const inventoryUpgrade=useMemo(()=>storageUpgradePreview(state,'inventory'),[state]),bankUpgrade=useMemo(()=>storageUpgradePreview(state,'bank'),[state]);
  const inspected=inspectId?itemDef(inspectId):undefined,carried=location==='inventory';
  const exactRecords=craftedGearInstances(state);
  const exactCopies=inspected?.type==='gear'?craftedGearCopiesAt(state,inspected.id,location).map(row=>exactRecords.find(record=>record.id===row.instanceId)!).filter(Boolean):[];
  const selectedCopy=exactCopies.find(row=>row.id===selectedInstanceId)??exactCopies[0];
  const hasLegacyStack=inspected?state[location].stacks.some(row=>row.itemId===inspected.id&&row.instanceId===undefined&&row.quantity>0):false;
  const legacyStackIndex=inspected?state[location].stacks.findIndex(row=>row.itemId===inspected.id&&row.instanceId===undefined&&row.quantity>0):-1;
  const linkAudit=inspected?.type==='gear'?auditCraftedGearOwnership(state):undefined;
  const unlinkedForgeCopies=inspected?.type==='gear'&&linkAudit&&!linkAudit.problems.length
    ?exactRecords.filter(row=>row.itemId===inspected.id&&linkAudit.unlocatedInstanceIds.includes(row.id))
    :[];
  const inspectActions=inspected?<View style={s.inspectActions}>
    {carried&&inspected.type==='gear'?<GameButton compact title={gt("Compare stats")} tone="secondary" onPress={()=>{setPreviewId(inspected.id);closeInspect()}}/>:null}
    {hasLegacyStack&&carried&&inspected.type==='gear'?<GameButton compact title={gt('Equip {slot}',{slot:gl(inspected.slot)})} onPress={()=>{run(()=>onEquip(inspected.id));closeInspect()}}/>:null}
    {carried&&inspected.type==='food'?<GameButton compact title={state.character?.equippedFoodId===inspected.id?gt("Auto-eat selected"):gt("Use for auto-eat")} disabled={state.character?.equippedFoodId===inspected.id} onPress={()=>{run(()=>onFood(inspected.id));closeInspect()}}/>:null}
    {carried&&inspected.type==='food'?<GameButton compact title={recoveryAmount(healthState,inspected.id)===0?gt("Health full"):gt('Eat 1 · +{hp} HP',{hp:formatGameNumber(Math.round(recoveryAmount(healthState,inspected.id)),state.settings.numberMode,state.settings.language)})} disabled={recoveryAmount(healthState,inspected.id)===0} tone="secondary" onPress={()=>{run(()=>onEat(inspected.id));closeInspect()}}/>:null}
    <GameButton compact title={favoriteSet.has(inspected.id)?gt("Remove favorite"):gt("Favorite")} tone="secondary" onPress={()=>{run(()=>onToggleFavorite(inspected.id));closeInspect()}}/>
    <GameButton compact title={lockedSet.has(inspected.id)?gt("Unlock item"):gt("Lock item")} tone="secondary" onPress={()=>{run(()=>onToggleLock(inspected.id));closeInspect()}}/>
    {hasLegacyStack&&(carried?<GameButton compact title={gt('Deposit {count}',{count:formatGameNumber(transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);if(state.character?.equippedFoodId===inspected.id)setPending({kind:"deposit",item:inspected,quantity:amount});else runInventory({kind:"deposit",itemId:inspected.id,quantity:amount},()=>onDeposit(inspected.id,amount));closeInspect()}}/>:<GameButton compact title={gt('Withdraw {count}',{count:formatGameNumber(transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);runInventory({kind:"withdraw",itemId:inspected.id,quantity:amount},()=>onWithdraw(inspected.id,amount));closeInspect()}}/>)}
    {hasLegacyStack&&!carried&&inspected.value>0&&!favoriteSet.has(inspected.id)&&!lockedSet.has(inspected.id)?<GameButton compact title={gt('Sell {count} · {gold}g',{count:transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),gold:formatGameNumber(inspected.value*transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);beginInventorySubmission(gt("Selling items…"),()=>onBankSell(inspected.id,amount));closeInspect()}}/>:null}
    {hasLegacyStack&&carried&&inspected.value>0&&!favoriteSet.has(inspected.id)&&!lockedSet.has(inspected.id)?<GameButton compact title={gt('Sell {count} · {gold}g',{count:transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),gold:formatGameNumber(inspected.value*transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);setPending({kind:"sell",item:inspected,quantity:amount});closeInspect()}}/>:null}
    {hasLegacyStack&&carried&&inspected.salvage&&!favoriteSet.has(inspected.id)&&!lockedSet.has(inspected.id)?<GameButton compact title={gt("Salvage 1")} tone="danger" onPress={()=>{setPending({kind:"salvage",item:inspected,quantity:1});closeInspect()}}/>:null}
    {legacyStackIndex>=0&&unlinkedForgeCopies.length>0?<View style={s.quantityPanel}>
      <Text style={s.quantityTitle}>LINK OLDER FORGE EQUIPMENT</Text>
      <Text style={s.sub}>Older forged copies were saved without a physical ID. Select which original roll belongs to an untagged copy. No new item is created.</Text>
      {unlinkedForgeCopies.map(record=><View key={record.id} style={s.row}>
        <Text style={[s.sub,s.flex]}>{rarityMeta(record.rarity).label} · Q{craftedGearDisplayQuality(record)}{record.quality===undefined?' · Legacy baseline':''}</Text>
        <GameButton compact tone="secondary" title="Link copy" disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Linking original Forge copy…',async()=>{await onCommand!({type:'gear_link_legacy',args:{instanceId:record.id,from:location,stackIndex:legacyStackIndex}});closeInspect()})}/>
      </View>)}
    </View>:null}
    {exactCopies.length>0?<View style={s.quantityPanel}>
      <Text style={s.quantityTitle}>UNIQUE EQUIPMENT · {exactCopies.length} {exactCopies.length===1?'COPY':'COPIES'}</Text>
      {exactCopies.map(copy=><Pressable key={copy.id} accessibilityRole="button" accessibilityState={{selected:selectedCopy?.id===copy.id}} onPress={()=>setSelectedInstanceId(copy.id)} style={[s.row,{padding:10,borderColor:rarityMeta(copy.rarity).color,borderWidth:rarityMeta(copy.rarity).borderWidth,borderRadius:10,backgroundColor:selectedCopy?.id===copy.id?C.selection:C.panel2}]}>
        <Text style={[s.sub,s.flex,{color:rarityMeta(copy.rarity).color,fontWeight:'800'}]}>{rarityMeta(copy.rarity).label} · Q{craftedGearDisplayQuality(copy)}{copy.quality===undefined?' · Legacy baseline':''} {copy.locked?' · Locked':''} {copy.enhancement.rank>0?' · +'+copy.enhancement.rank:''}</Text>
        <Text style={s.quantityTitle}>{selectedCopy?.id===copy.id?'✓':'›'}</Text>
      </Pressable>)}
      {selectedCopy?<View style={s.quantityPanel}>
        <Text style={[s.title,{color:rarityMeta(selectedCopy.rarity).color}]}>{rarityMeta(selectedCopy.rarity).label} · Q{craftedGearDisplayQuality(selectedCopy)}{selectedCopy.quality===undefined?' · Legacy':''}</Text>
        <View style={s.row}>
          <GameButton compact title={selectedCopy.locked?'Unlock':'Lock'} tone="secondary" disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Updating equipment lock…',()=>onCommand!({type:'gear_lock',args:{instanceId:selectedCopy.id,locked:!selectedCopy.locked}}))}/>
          {carried?<GameButton compact title="Equip" disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Equipping unique equipment…',async()=>{await onCommand!({type:'gear_equip',args:{instanceId:selectedCopy.id}});closeInspect()})}/>:null}
          <GameButton compact title={carried?'To Bank':'Withdraw'} tone="secondary" disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Transferring equipment…',async()=>{await onCommand!({type:'gear_move',args:{instanceId:selectedCopy.id,to:carried?'bank':'inventory'}});closeInspect()})}/>
        </View>
        <View style={s.row}>
          <GameButton compact title="Sell copy" tone="secondary" disabled={!onCommand||selectedCopy.locked||inventoryBusyLabel!==null} onPress={()=>{setCopyPending({instanceId:selectedCopy.id,method:'sell',name:inspected.name});closeInspect()}}/>
          {inspected.salvage?<GameButton compact title="Salvage copy" tone="danger" disabled={!onCommand||selectedCopy.locked||inventoryBusyLabel!==null} onPress={()=>{setCopyPending({instanceId:selectedCopy.id,method:'salvage',name:inspected.name});closeInspect()}}/>:null}
        </View>
      </View>:null}
    </View>:null}
  </View>:null;
  if(pouchOpen)return <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.h}>{gt("Inventory")}</Text>
    <Text style={s.sub}>Keep your Gems separate from regular items.</Text>
    <View style={s.storageRow}>{(["inventory","bank"] as const).map(value=><StorageChip key={value} label={value==='inventory'?gt("Inventory"):gt("Bank")} selected={!pouchOpen&&location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}<StorageChip label="Gems" selected={pouchOpen} status={storageCapacityStatus(gemPouch(state).stacks,gemPouch(state).capacity)} onPress={openPouch}/></View>
    {!!error?<Text accessibilityRole="alert" style={s.errorText}>{gl(error)}</Text>:null}
    {inventoryBusyLabel?<View accessibilityLiveRegion="polite" style={s.pouchStatus}><ActivityIndicator size="small" color={C.accent}/><Text style={s.sub}>{inventoryBusyLabel}</Text></View>:null}
    <GemPouchPanel standalone state={state} busy={inventoryBusyLabel!==null} onUpgrade={onCommand?()=>beginInventorySubmission('Upgrading Gem Pouch…',()=>onCommand({type:'gem_pouch_upgrade'})):undefined} onAction={onCommand?command=>beginInventorySubmission('Updating Gem Pouch…',()=>onCommand(command)):undefined} onFavorite={onToggleFavorite} onLock={onToggleLock}/>
  </ScrollView>;
  return <><ConfirmModal visible={copyPending!==null} title={copyPending?.method==='sell'?'Sell this exact equipment copy?':'Salvage this exact equipment copy?'} message={copyPending?`This affects only the selected ${copyPending.name} with its own rarity and quality. Equipped, locked, upgraded, socketed and loadout-protected copies cannot be destroyed.`:''} confirmLabel={copyPending?.method==='sell'?'Sell this copy':'Salvage this copy'} danger reduceMotion={state.settings.reduceMotion} onConfirm={()=>{const copy=copyPending;setCopyPending(null);if(copy&&onCommand)void beginInventorySubmission('Processing selected equipment…',()=>onCommand({type:copy.method==='sell'?'gear_sell':'gear_salvage',args:{instanceId:copy.instanceId}}))}} onCancel={()=>setCopyPending(null)}/><EquipmentPreview state={state} itemId={previewId} onClose={()=>{if(previewId&&newItemSet.has(previewId))run(()=>onAcknowledgeItem(previewId));setPreviewId(null)}} onEquip={()=>{if(previewId)run(()=>{onEquip(previewId);setPreviewId(null)})}} onInspect={()=>{setInspectId(previewId);setPreviewId(null)}} onFavorite={()=>{if(previewId)run(()=>onToggleFavorite(previewId))}} onDeposit={()=>{if(previewId){const id=previewId,amount=transferAmount(state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0,quantity);runInventory({kind:"deposit",itemId:id,quantity:amount},async()=>{await onDeposit(id,amount);setPreviewId(null)})}}} onSell={previewId&&location==='inventory'&&itemDef(previewId).value>0&&!favoriteSet.has(previewId)?()=>{const previewed=itemDef(previewId);setPending({kind:"sell",item:previewed,quantity:1});setPreviewId(null)}:undefined} onSalvage={previewId&&location==='inventory'&&itemDef(previewId).salvage&&!favoriteSet.has(previewId)?()=>{const previewed=itemDef(previewId);setPending({kind:"salvage",item:previewed,quantity:1});setPreviewId(null)}:undefined}/><ItemQuickInspect state={state} itemId={inspectId} onClose={closeInspect} onNavigate={destination=>{closeInspect();onNavigateInspect(destination)}} actions={inspectActions}/><FlatList key={gridColumns} data={stacks} numColumns={gridColumns} keyExtractor={stack=>`${location}:${stack.itemId}:${stack.instanceId??'legacy'}`} renderItem={({item})=>renderStack(item)} columnWrapperStyle={s.itemGrid} initialNumToRender={12} maxToRenderPerBatch={8} windowSize={3} removeClippedSubviews onLayout={event=>setGridWidth(Math.max(1,Math.min(960,event.nativeEvent.layout.width)-32))} ref={scrollRef} onContentSizeChange={()=>{if(restored.current!==gridColumns){restored.current=gridColumns;scrollRef.current?.scrollToOffset({offset:scrollY.current,animated:false});}}} onScroll={event=>{scrollY.current=event.nativeEvent.contentOffset.y;memory.scrollY=scrollY.current;}} scrollEventThrottle={100} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ListHeaderComponent={<View style={s.listSection}>
    <Text accessibilityRole="header" style={s.h}>{gt("Inventory")}</Text>
    <Text style={s.sub}>{gl("Everything for your next adventure.")}</Text>
    <View style={s.storageRow}>{(["inventory","bank"] as const).map(value=><StorageChip key={value} label={value==='inventory'?gt("Inventory"):gt("Bank")} selected={!pouchOpen&&location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}<StorageChip label="Gems" selected={pouchOpen} status={storageCapacityStatus(gemPouch(state).stacks,gemPouch(state).capacity)} onPress={openPouch}/></View>
    
    {location==='bank'&&<View style={s.goldStorage}>
      <View style={s.goldStorageHead}><View><Text style={s.goldStorageTitle}>Gold Storage</Text><Text style={s.goldStorageBalance}>Carried: {formatGameNumber(carriedGold,state.settings.numberMode,state.settings.language)}g · Bank: {formatGameNumber(bankGold,state.settings.numberMode,state.settings.language)}g</Text></View></View>
      <View style={s.goldAllActions}><View style={s.goldAction}><GameButton compact title={gt('Deposit all {amount}g',{amount:formatGameNumber(carriedGold,state.settings.numberMode,state.settings.language)})} disabled={inventoryBusyLabel!==null||carriedGold<1} onPress={()=>transferGold('deposit',carriedGold)}/></View><View style={s.goldAction}><GameButton compact title={gt('Withdraw all {amount}g',{amount:formatGameNumber(bankGold,state.settings.numberMode,state.settings.language)})} tone="secondary" disabled={inventoryBusyLabel!==null||bankGold<1} onPress={()=>transferGold('withdraw',bankGold)}/></View></View>
      <View style={s.goldCustomRow}><TextInput accessibilityLabel="Gold transfer amount" keyboardType="number-pad" placeholder={gt('Custom amount')} placeholderTextColor={C.muted} value={bankGoldAmount} onChangeText={value=>setBankGoldAmount(value.replace(/\D/g,''))} style={s.goldCustomInput}/></View>
      <View style={s.goldAllActions}><View style={s.goldAction}><GameButton compact title={gt('Deposit {amount}g',{amount:validCustomGold?formatGameNumber(customGoldAmount,state.settings.numberMode,state.settings.language):'—'})} tone="secondary" disabled={inventoryBusyLabel!==null||!validCustomGold||customGoldAmount>carriedGold} onPress={()=>transferGold('deposit',customGoldAmount)}/></View><View style={s.goldAction}><GameButton compact title={gt('Withdraw {amount}g',{amount:validCustomGold?formatGameNumber(customGoldAmount,state.settings.numberMode,state.settings.language):'—'})} tone="secondary" disabled={inventoryBusyLabel!==null||!validCustomGold||customGoldAmount>bankGold} onPress={()=>transferGold('withdraw',customGoldAmount)}/></View></View>
    </View>}
    {activeCapacity.level!=='ok'&&<Text accessibilityRole="alert" style={activeCapacity.level==='full'?s.capacityFull:s.warning}>{gt(activeCapacity.level==='full'?'{location} is full. Free a slot or upgrade storage before receiving another unique stack.':'{location} is {percent}% full · {free} slots remain.',{location:gt(location==='inventory'?'Inventory':'Bank'),percent:activeCapacity.percent,free:activeCapacity.free})}</Text>}
    {location==='bank'&&<Text style={s.sub}>{gt("Bank materials are available for crafting, but food must be withdrawn for combat.")}</Text>}
    <View style={s.quantityPanel}><View style={s.quantityHeader}><View style={s.quantityCopy}><Text style={s.quantityTitle}>{gt("MOVE / SELL AMOUNT")}</Text><Text style={s.quantitySummary}>{quantity==='all'?gt("All available units"):gt("{count} units per item action",{count:formatGameNumber(quantity,state.settings.numberMode,state.settings.language)})}</Text></View><View style={s.quantityCurrent}><Text style={s.quantityCurrentText}>{quantity==='all'?gt('All'):formatGameNumber(quantity,state.settings.numberMode,state.settings.language)}</Text></View></View><View style={s.quantityControls}><View style={s.quantityQuickAmounts}>{([1,10,100] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={gt('Use {count} units',{count:value})} accessibilityState={{selected:quantity===value}} onPress={()=>{setQuantity(value);setQuantityInput('')}} style={[s.quantityPreset,quantity===value&&s.quantityPresetActive]}><Text style={[s.quantityPresetText,quantity===value&&s.quantityPresetTextActive]}>{value}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel={gt("Use all available units")} accessibilityState={{selected:quantity==='all'}} onPress={()=>{setQuantity('all');setQuantityInput('')}} style={[s.quantityPreset,quantity==='all'&&s.quantityPresetActive]}><Text style={[s.quantityPresetText,quantity==='all'&&s.quantityPresetTextActive]}>{gt("All")}</Text></Pressable></View><View style={[s.quantityCustom,quantityInput.length>0&&s.quantityCustomActive]}><TextInput accessibilityLabel={gt("Custom move or sell amount")} keyboardType="number-pad" placeholder={gt("Custom")} placeholderTextColor={C.muted} value={quantityInput} onChangeText={value=>{const digits=value.replace(/\D/g,'');setQuantityInput(digits);const parsed=Number(digits);if(Number.isSafeInteger(parsed)&&parsed>0)setQuantity(parsed)}} style={s.quantityInput}/></View></View></View>
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

    {selectMode&&<Panel><View style={s.selectionHead}><View style={s.resultSummary}><Text style={s.selectionTitle}>{gt('BULK MANAGEMENT · {count} SELECTED',{count:selectedIds.length})}</Text><Text style={s.sub}>{gt("Whole stacks only · up to 100 stacks per action")}</Text></View><View style={s.selectionQuick}><Pressable accessibilityRole="button" onPress={selectShown} style={({pressed})=>[s.selectionQuickButton,pressed&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Select shown")}</Text></Pressable><Pressable accessibilityRole="button" disabled={!selectedIds.length} onPress={()=>setSelectedIds([])} style={({pressed})=>[s.selectionQuickButton,!selectedIds.length&&s.selectionQuickDisabled,pressed&&selectedIds.length>0&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Clear")}</Text></Pressable></View></View><Text style={s.sub}>{location==='inventory'?gt("Working Toward items, favorites, locked items and enhanced gear are automatically excluded from bulk disposal. Your selected auto-eat food also stays in Inventory."):gt("Withdraw selected moves complete Bank stacks back to this character.")}</Text><View style={s.bulkActions}><GameButton compact title={`${location==='inventory'?gt("Deposit"):gt("Withdraw")} · ${selectionSummary.transferableStackCount}`} disabled={!selectionSummary.transferableStackCount} tone="secondary" onPress={()=>beginBulk('transfer')}/>{location==='inventory'&&<GameButton compact title={`${gt("Sell")} · ${selectionSummary.sellableStackCount} · ${formatGameNumber(selectionSummary.sellGold,state.settings.numberMode,state.settings.language)}g`} disabled={!selectionSummary.sellableStackCount} tone="secondary" onPress={()=>beginBulk("sell")}/>} {location==='inventory'&&<GameButton compact title={`${gt("Salvage")} · ${selectionSummary.salvageableStackCount}`} disabled={!selectionSummary.salvageableStackCount} tone="danger" onPress={()=>beginBulk("salvage")}/>}</View>{selectedIds.length>0&&location==='inventory'&&(selectionSummary.sellProtectedCount>0||selectionSummary.transferProtectedCount>0||selectionSummary.goalProtectedCount>0)&&<Text style={s.selectionNote}>{[gt('{count} selected stacks are excluded by protection or sell rules.',{count:selectionSummary.sellProtectedCount}),selectionSummary.goalProtectedCount?gt('{count} Working Toward stacks remain protected.',{count:selectionSummary.goalProtectedCount}):'',selectionSummary.transferProtectedCount?gt('{count} auto-eat stacks stay in Inventory.',{count:selectionSummary.transferProtectedCount}):''].filter(Boolean).join(' ')}</Text>}</Panel>}
    </View>} ListEmptyComponent={<View style={s.listSection}><EmptyState title={gt("No items to show")} message={gt("Try another storage tab or clear the search and category filter.")}/><GameButton title={gt("Clear filters")} tone="secondary" onPress={()=>{setQuery('');setFilter("all")}}/></View>} ListFooterComponent={<View style={s.listSection}>
<Text style={s.inspectHint}>{gl('Goal items, favorites and enhanced gear are protected from bulk disposal.')}</Text>
    <View style={s.storageManagement}>
      <Pressable accessibilityRole="button" accessibilityLabel={gt("Storage management")} accessibilityState={{expanded:showStorage}} onPress={()=>setShowStorage(value=>!value)} style={({pressed})=>[s.disclosure,showStorage&&s.disclosureExpanded,pressed&&s.pressed]}>
        <View style={s.flex}><Text style={s.disclosureTitle}>{gt("STORAGE MANAGEMENT")}</Text><Text style={s.disclosureSubtitle}>{gt("Bulk deposit and capacity upgrades")}</Text></View>
        <View style={[s.disclosureArrow,showStorage&&s.disclosureArrowOpen]}><UiIcon name="next" size={18} muted/></View>
      </Pressable>
      {showStorage&&<View style={s.storageManagementContent}>
        <Text style={s.storageExplanation}>{gt("Inventory travels with this character. Bank storage is shared by every character on the account.")}</Text>
        {location==='inventory'&&!selectMode&&<GameButton compact style={s.depositMaterialsButton} title={gt("Deposit all materials")} tone="secondary" disabled={inventoryBusyLabel!==null||!state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')} onPress={()=>beginInventorySubmission(gt("Moving materials to Bank…"),onDepositMaterials)}/>}
        <View style={s.storageUpgradeList}>
          {([
            {id:'inventory' as const,label:gt("Inventory"),capacity:effectiveInventoryCapacity,base:state.inventory.capacity,upgrade:inventoryUpgrade},
            {id:'bank' as const,label:gt("Bank"),capacity:effectiveBankCapacity,base:state.bank.capacity,upgrade:bankUpgrade},
          ]).map(row=><View key={row.id} style={[s.storageUpgradeRow,stackStorageActions&&s.storageUpgradeRowStacked]}>
            <View style={[s.storageUpgradeDetails,stackStorageActions&&s.storageUpgradeDetailsStacked]}>
              <Text style={s.storageUpgradeTitle}>{gt('{location} · {count} slots',{location:row.label,count:row.capacity})}{row.capacity>row.base?' · '+gt('{count} base',{count:row.base}):''}</Text>
              <Text style={s.storageUpgradeMeta}>{row.upgrade?`${gt("Level")} ${row.upgrade.level} · ${formatGameNumber(row.upgrade.cost,state.settings.numberMode,state.settings.language)}g`:gt("Maximum storage capacity reached")}</Text>
            </View>
            <View style={[s.storageUpgradeAction,stackStorageActions&&s.storageUpgradeActionStacked]}>
              <GameButton compact style={s.storageUpgradeButton} title={row.upgrade?gt('Upgrade to {capacity}',{capacity:row.upgrade.capacity}):gt("Maxed")} tone="secondary" disabled={inventoryBusyLabel!==null||!row.upgrade||(state.character?.level??0)<row.upgrade.level||(state.character?.gold??0)<row.upgrade.cost} onPress={()=>beginInventorySubmission(gt(row.id==='inventory'?"Upgrading Inventory…":"Upgrading Bank…"),()=>onUpgradeStorage(row.id))}/>
            </View>
          </View>)}
        </View>
      </View>}
    </View>
    {overflowCount>0&&<Panel><Text style={s.title}>{ot(state.settings.language,'overflow.title')} · {overflowCount}</Text><Text style={s.warning}>{ot(state.settings.language,'overflow.body')}</Text>{state.overflow.stacks.map((stack,index)=><Text key={`${stack.itemId}:${index}`} style={s.sub}>{stack.quantity}× {itemDef(stack.itemId).name}</Text>)}{state.overflow.expiresAtMs!==null&&<Text style={s.warning}>{gt('Recorded expiry: {date}',{date:new Date(state.overflow.expiresAtMs).toLocaleString(language)})}</Text>}<GameButton title={ot(state.settings.language,'overflow.move',{count:overflowCount-remaining})} disabled={remaining===overflowCount} onPress={()=>beginInventorySubmission(gt("Moving Overflow items…"),onOverflow)}/>{remaining>0&&<Text style={s.sub}>{ot(state.settings.language,'overflow.remain',{count:remaining})}</Text>}</Panel>}
  </View>}/>
  <GameModalSurface visible={filterOpen} reduceMotion={state.settings.reduceMotion} onClose={()=>setFilterOpen(false)} backdropLabel={gt("Close inventory filters")} surfaceStyle={s.filterSheet}>
        <GameModalHeader eyebrow={gt("INVENTORY VIEW")} title={gt("Filter items")} onClose={()=>setFilterOpen(false)}/>
        <ScrollView style={s.filterList} contentContainerStyle={s.filterListContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          {FILTER_OPTIONS.map(option=>{const selected=filter===option.id,label=option.id==='new'&&activeNewCount?`${gt("New")} · ${activeNewCount}`:gl(option.label);return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>setFilter(option.id)} style={({pressed})=>[s.filterOption,selected&&s.filterOptionSelected,pressed&&s.pressed]}><Text style={[s.filterOptionText,selected&&s.filterOptionTextSelected]}>{label}</Text><Text style={[s.filterOptionMark,selected&&s.filterOptionMarkSelected]}>{selected?'✓':'›'}</Text></Pressable>})}
        </ScrollView>
        {newItemIds.length>0&&<GameButton title={gt("Mark all seen")} tone="secondary" onPress={()=>run(onAcknowledgeAll)}/>}
        <View style={s.sheetActions}><View style={s.flex}><GameButton title={gt("Reset")} tone="secondary" onPress={()=>setFilter("all")}/></View><View style={s.flex}><GameButton title={gt("Done")} onPress={()=>setFilterOpen(false)}/></View></View>
  </GameModalSurface>
  <ConfirmModal visible={pending!==null} title={gt('{action} {name}?',{action:gt(pending?.kind==='deposit'?'Deposit':pending?.kind==='sell'?'Sell':'Salvage'),name:pending?.item.name??''})} message={message} confirmLabel={pending?.kind==='deposit'?gt("Deposit"):pending?.kind==='sell'?gt("Sell {count}",{count:pending.quantity}):gt("Salvage 1")} danger={pending?.kind!=='deposit'} reduceMotion={state.settings.reduceMotion} onConfirm={confirm} onCancel={()=>setPending(null)}/><ConfirmModal visible={bulkPending!==null} title={bulkPending?.kind==='transfer'?gt('{action} selected stacks?',{action:gt(location==='inventory'?'Deposit':'Withdraw')}):bulkPending?.kind==='sell'?gt("Sell selected items?"):gt("Salvage selected equipment?")} message={bulkMessage} confirmLabel={bulkPending?.kind==='transfer'?(location==='inventory'?gt("Deposit selected"):gt("Withdraw selected")):bulkPending?.kind==='sell'?gt("Sell eligible"):gt("Salvage eligible")} danger={bulkPending?.kind!=='transfer'} reduceMotion={state.settings.reduceMotion} onConfirm={confirmBulk} onCancel={()=>setBulkPending(null)}/><Modal transparent visible={inventoryBusyLabel!==null} animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={()=>{}}><View style={s.transactionBackdrop}><View accessibilityRole="progressbar" accessibilityLabel={inventoryBusyLabel??gt("Updating inventory")} accessibilityState={{busy:true}} style={s.transactionCard}><ActivityIndicator size="large" color={C.accent}/><Text style={s.transactionTitle}>{inventoryBusyLabel}</Text><Text style={s.transactionCopy}>{gt("Please wait while your inventory is updated.")}</Text></View></View></Modal></>;
}
/** Compact padlock badge drawn from native primitives, so it remains crisp at item-card scale. */
function InventoryLockGlyph({locked,color}:{locked:boolean;color:string}){
  return <View accessible={false} style={{width:15,height:16}}>
    <View style={{position:'absolute',left:locked?4:8,top:1,width:7,height:7,borderWidth:1.5,borderColor:color,borderBottomWidth:0,borderTopLeftRadius:5,borderTopRightRadius:5,transform:locked?undefined:[{rotate:'-30deg'}]}}/>
    <View style={{position:'absolute',left:2,top:7,width:11,height:8,borderWidth:1.5,borderColor:color,borderRadius:3,backgroundColor:'transparent'}}/>
    {locked?<View style={{position:'absolute',left:6,top:10,width:3,height:3,borderRadius:2,backgroundColor:color}}/>:null}
  </View>;
}
function UtilityChip({label,accessibilityLabel,selected=false,onPress}:{label:string;accessibilityLabel:string;selected?:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.utilityChip,selected&&s.utilityChipActive,pressed&&s.pressed]}><Text numberOfLines={1} style={[s.utilityChipText,selected&&s.utilityChipTextActive]}>{label}</Text></Pressable>}
function StorageChip({label,selected,status,onPress}:{label:string;selected:boolean;status:ReturnType<typeof storageCapacityStatus>;onPress:()=>void}){const {gt}=useGameplayText();const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipmentColors=equipmentTheme(C),tone=status.level==='full'?C.bad:status.level==='near'?C.warning:selected?equipmentColors.selectedLine:C.line,width=`${status.percent}%` as `${number}%`;return <Pressable accessibilityRole="button" accessibilityLabel={gt('{label} storage, {used} of {capacity} slots used, {free} free',{label,used:status.used,capacity:status.capacity,free:status.free})} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.storageChip,selected&&s.storageChipSelected,status.level==='full'&&s.storageChipFull,pressed&&s.pressed]}><View style={s.storageChipTop}><Text style={[s.storageChipLabel,selected&&s.storageChipLabelSelected]}>{selected?'✓ ':''}{label}</Text><Text style={[s.storageChipCount,{color:tone}]}>{status.used}/{status.capacity}</Text></View><View style={s.capacityTrack}><View style={[s.capacityFill,{width,backgroundColor:tone}]}/></View></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},
  transactionBackdrop:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:C.overlay},
  transactionCard:{width:'100%',maxWidth:320,alignItems:'center',gap:12,padding:24,borderWidth:1,borderColor:C.accent,borderRadius:14,backgroundColor:C.panelRaised},
  transactionTitle:{...typography.bodyStrong,color:C.text,textAlign:'center'},
  transactionCopy:{...typography.caption,color:C.muted,textAlign:'center'},
  equipMoment:{gap:6,padding:spacing.sm,borderWidth:1,borderLeftWidth:4,borderRadius:10,backgroundColor:C.panel2},
  equipMomentHead:{flexDirection:'row',alignItems:'center',gap:8},
  equipMomentEyebrow:{...typography.caption,fontWeight:'900',letterSpacing:.8},
  equipMomentName:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  equipMomentSlot:{...typography.caption,fontWeight:'900',letterSpacing:.6},
  equipMomentMeta:{...typography.caption,color:C.muted},
  equipMomentDelta:{...typography.bodyStrong,color:C.info,fontWeight:'900'},
  setChange:{gap:2,padding:7,borderWidth:1,borderRadius:8},
  setChangeTitle:{...typography.caption,fontWeight:'900',letterSpacing:.45},
  listSection:{gap:12},root:{padding:16,gap:12,paddingBottom:100,width:'100%',maxWidth:960,alignSelf:'center'},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  warning:{...typography.body,color:C.warning},
  capacityFull:{...typography.bodyStrong,color:C.bad},
  errorText:{...typography.body,color:C.bad,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},
  label:{...typography.caption,color:C.accent,fontWeight:'700'},
  storageManagement:{borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel,overflow:'hidden'},
  disclosure:{minHeight:60,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.md,paddingVertical:10},
  disclosureExpanded:{borderBottomWidth:1,borderBottomColor:C.line},
  disclosureTitle:{...typography.caption,color:C.text,fontWeight:'900',letterSpacing:.7},
  disclosureSubtitle:{...typography.caption,color:C.muted,marginTop:2},
  disclosureArrow:{width:32,height:32,alignItems:'center',justifyContent:'center',borderRadius:9,backgroundColor:C.panel2,transform:[{rotate:'90deg'}]},
  disclosureArrowOpen:{transform:[{rotate:'-90deg'}]},
  storageManagementContent:{gap:10,padding:12},
  storageExplanation:{...typography.caption,color:C.muted,lineHeight:19},
  depositMaterialsButton:{width:'100%',minHeight:46},
  storageUpgradeList:{gap:8},
  storageUpgradeRow:{minHeight:76,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:C.line,borderRadius:11,backgroundColor:C.panel2},
  storageUpgradeRowStacked:{alignItems:'stretch',flexDirection:'column',gap:8},
  storageUpgradeDetails:{flex:1,minWidth:0,gap:4},
  storageUpgradeDetailsStacked:{flex:0,width:'100%'},
  storageUpgradeTitle:{...typography.bodyStrong,color:C.text},
  storageUpgradeMeta:{...typography.caption,color:C.muted},
  storageUpgradeAction:{width:144,flexShrink:0},
  storageUpgradeActionStacked:{width:'100%'},
  storageUpgradeButton:{width:'100%',minHeight:44},
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
  goldStorage:{gap:10,padding:spacing.md,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,backgroundColor:C.panel},
  goldStorageHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},
  goldStorageTitle:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  goldStorageBalance:{...typography.caption,color:C.muted,marginTop:3},
  goldAllActions:{flexDirection:'row',gap:8},
  goldAction:{flex:1,minWidth:0},
  goldCustomRow:{paddingTop:2},
  goldCustomInput:{minHeight:46,paddingHorizontal:12,paddingVertical:0,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,color:C.text,textAlign:'center',textAlignVertical:'center',fontSize:14,lineHeight:20,fontWeight:'800',backgroundColor:C.inputBg},
  quantityPanel:{gap:10,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel2},
  quantityHeader:{flexDirection:'row',alignItems:'center',gap:spacing.sm},
  quantityCopy:{flex:1,minWidth:0},
  quantityTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.65},
  quantitySummary:{...typography.caption,color:C.muted,marginTop:2},
  quantityCurrent:{minWidth:42,minHeight:28,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.selectionLine,borderRadius:99,backgroundColor:C.selection},
  quantityCurrentText:{fontSize:11,color:C.selectionLine,fontWeight:'900'},
  quantityControls:{flexDirection:'row',alignItems:'stretch',gap:8},
  quantityQuickAmounts:{flex:1,minWidth:0,flexDirection:'row',gap:6},
  quantityPreset:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  quantityPresetActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
  quantityPresetText:{fontSize:13,lineHeight:18,color:C.text,fontWeight:'900'},
  quantityPresetTextActive:{color:C.selectionLine},
  quantityCustom:{width:112,minHeight:44,justifyContent:'center',borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.bg},
  quantityCustomActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
  quantityInput:{height:42,paddingHorizontal:9,paddingVertical:0,color:C.text,textAlign:'center',textAlignVertical:'center',fontSize:12,lineHeight:18,fontWeight:'800'},
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
  itemGrid:{flexDirection:'row',gap:10},
  itemTile:{position:'relative',alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:10},
  itemOpen:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},
  itemCorner:{position:'absolute',top:2,width:26,height:26,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:7,borderColor:C.line,backgroundColor:C.panel},
  itemCornerActive:{borderColor:C.warning},itemLockCorner:{left:2},itemFavoriteCorner:{right:2},
  itemStar:{fontSize:18,lineHeight:22,fontWeight:'900',color:C.muted},itemStarOn:{color:C.warning},
  itemQuantity:{position:'absolute',right:3,bottom:3,paddingHorizontal:4,borderRadius:7,overflow:'hidden',fontSize:9,lineHeight:14,fontWeight:'900',backgroundColor:C.panel},
  itemNew:{position:'absolute',left:3,bottom:16,paddingHorizontal:3,paddingVertical:1,borderRadius:3,backgroundColor:C.info},itemNewTop:{bottom:undefined,top:3},itemNewText:{fontSize:9,color:C.panel,fontWeight:'900',letterSpacing:.3},
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

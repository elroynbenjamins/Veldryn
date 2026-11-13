import {useGameplayText} from '../i18n/gameplay';
import {SearchField} from '../components/SearchField';
import {newInventoryScreenState,openInventoryFood,type InventoryScreenState} from '../core/inventory-screen-state';
import {scheduleAfterPaint} from '../core/use-delayed-busy';
import {liveHealthState} from '../core/live-health';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,Animated,FlatList,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {GameState,ItemStack} from '../core/types';
import {ItemDef,itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {isReleasedEquipmentItemId} from '../content/equipment-release';
import {InventoryFilter,InventorySort,foodHealingAmount,inventoryFavoriteIds,inventoryLockedIds,inventoryNewItemIds,recoveryAmount,storageCapacityStatus,transferAmount,transferError,visibleStacks} from '../core/inventory-view';
import {entitlementStorageCapacity} from '../core/account-entitlements';
import {claimOverflowToBank,salvageItem,sellItem,StorageLocation,storageUpgradePreview} from '../core/game';
import {ItemArtwork} from '../components/ItemArtwork';
import {GemPouchPanel} from '../components/GemPouchPanel';
import {accountText} from '../i18n/account';
import {gemPouch,gemDepositDestination} from '../core/gem-pouch';
import {equipmentPouch} from '../core/equipment-pouch';
import {EquipmentPouchPanel} from '../components/EquipmentPouchPanel';
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
import {formatGameNumber} from '../core/number-format';
import {displayStat} from '../core/stat-display';
import {ot} from '../i18n';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {craftedGearInstances,craftedGearDisplayQuality} from '../core/crafted-gear-instances';
import {indexInventoryGearCopies} from '../core/inventory-gear-lookup';
import {auditCraftedGearOwnership,craftedGearCopiesAt,disposeCraftedGearInstance} from '../core/crafted-gear-ownership';
import {canDisposeLegacyEquipment} from '../core/equipment-enhancement';
import type {GameCommand} from '../core/game-commands';
import {bulkSelectionSummary,inventoryBulkSelectionId,type BulkStorageLocation} from '../core/inventory-bulk';
import {equipmentSalvageReward,equipmentSalvageRewards} from '../core/equipment-salvage';
import type {WorkingTowardDestination} from '../core/working-toward';
import {workingTowardInventoryProtectionMap} from '../core/working-toward-inventory';
import {equipmentChangeFeedback,equipmentFeedbackSnapshot,type EquipmentChangeFeedback} from '../core/equipment-change-feedback';
import {inventoryFeedbackIntent,resolveInventoryActionFeedback,type InventoryActionFeedback,type InventoryFeedbackIntent,type InventoryFeedbackRequest} from '../core/inventory-action-feedback';

import {mealBonusDef} from '../core/meal-buffs';

type Pending={kind:'sell'|'bank_sell'|'salvage'|'deposit';item:ItemDef;quantity:number}|null;
type BulkAction='transfer'|'sell'|'salvage';
type BulkPending={kind:BulkAction;ids:string[]}|null;
const STORAGE_PAGE_SIZE=30;
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
  const gridColumns=gridWidth<235?3:gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4,tileSize=Math.max(48,Math.floor((gridWidth-(gridColumns-1)*5)/gridColumns)),iconSize=Math.min(42,tileSize-12);
  const memory=useRef(viewMemory??newInventoryScreenState()).current;
  const initial=useRef(foodRequest>memory.foodRequest?openInventoryFood(memory,foodRequest):{...memory}).current;
  const scrollRef=useRef<FlatList<ItemStack|null>>(null),scrollY=useRef(initial.scrollY),restored=useRef<number|null>(null);
  const [bankGoldAmount,setBankGoldAmount]=useState('');const [copyPending,setCopyPending]=useState<{instanceId:string;method:'sell'|'salvage';name:string}|null>(null);const [pending,setPending]=useState<Pending>(null),[location,setLocation]=useState<'inventory'|'bank'>(initial.location);
  const [pouchOpen,setPouchOpen]=useState(initial.pouchOpen===true);
  const [equipmentPouchOpen,setEquipmentPouchOpen]=useState(false);
  const [query,setQuery]=useState(initial.query),[filter,setFilter]=useState<InventoryFilter>(initial.filter),[sort,setSort]=useState<InventorySort>(initial.sort);
  useEffect(()=>{Object.assign(memory,{location,query,filter,sort,scrollY:scrollY.current,pouchOpen});},[memory,location,query,filter,sort,pouchOpen]);
  useEffect(()=>{if(foodRequest<=memory.foodRequest)return;Object.assign(memory,openInventoryFood(memory,foodRequest));setLocation('inventory');setPouchOpen(false);setEquipmentPouchOpen(false);setQuery('');setFilter('food');setSelectMode(false);setSelectedIds([]);setInspectId(null);setPreviewId(null);setPreviewInstanceId(null);scrollY.current=0;scrollRef.current?.scrollToOffset({offset:0,animated:false});},[foodRequest,memory]);
  const [quantity,setQuantity]=useState<number|'all'>(1),[quantityInput,setQuantityInput]=useState('');
  const [error,setError]=useState('');
  const [previewId,setPreviewId]=useState<string|null>(null),[previewInstanceId,setPreviewInstanceId]=useState<string|null>(null);
  const [inspectId,setInspectId]=useState<string|null>(null),[selectedInstanceId,setSelectedInstanceId]=useState<string|null>(null),[inspectQuantity,setInspectQuantity]=useState(1);
  const [gridPage,setGridPage]=useState(0),[showGoldTransfer,setShowGoldTransfer]=useState(false),[filterOpen,setFilterOpen]=useState(false);
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
  const runInventory=(request:InventoryFeedbackRequest,action:()=>void|Promise<unknown>)=>{const intent=inventoryFeedbackIntent(state,request),label=request.kind==='sell'||request.kind==='bulk_sell'?gt("Selling items…"):request.kind==='withdraw'||request.kind==='bulk_transfer'&&request.direction==='withdraw'?gt("Moving items to Inventory…"):request.kind==='deposit'&&gemDepositDestination(state,request.itemId)==='gem_pouch'?gt("Moving gems to Gem Pouch…"):request.kind==='deposit'?gt("Moving items to Bank…"):request.kind==='bulk_transfer'?gt("Depositing selected items…"):gt("Updating inventory…");void beginInventorySubmission(label,async()=>{await action();setInventoryIntent(intent);setInventoryFeedback(null)})};
  const confirm=()=>{if(!pending)return;const action=pending;setPending(null);
    if(action.kind==='bank_sell'){void beginInventorySubmission(gt("Selling items…"),()=>onBankSell(action.item.id,action.quantity));return;}
    const request:InventoryFeedbackRequest=action.kind==='deposit'?{kind:"deposit",itemId:action.item.id,quantity:action.quantity}:action.kind==='sell'?{kind:"sell",itemId:action.item.id,quantity:action.quantity}:{kind:"salvage",itemId:action.item.id,quantity:1};
    scheduleAfterPaint(()=>runInventory(request,()=>action.kind==='deposit'?onDeposit(action.item.id,action.quantity):action.kind==='sell'?onSell(action.item.id,action.quantity):onSalvage(action.item.id)));
  };
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
    const inventoryCapacity=capacities.inventory,bankCapacity=capacities.bank,activeCapacity=location==='inventory'?inventoryCapacity:bankCapacity;
  const activeStacks=state[location].stacks;
   const activeNewCount=useMemo(()=>new Set(activeStacks.filter(stack=>{const item=itemDef(stack.itemId);return stack.quantity>0&&newItemSet.has(stack.itemId)&&(item.type!=='gear'||isReleasedEquipmentItemId(item.id));}).map(stack=>stack.itemId)).size,[activeStacks,newItemSet]);
  const stacks=useMemo(()=>visibleStacks(activeStacks,query,filter,sort,favorites,newItemIds),[activeStacks,query,filter,sort,favorites,newItemIds]);
   const isFiltered=filter!=='all'||query.trim().length>0;
   const totalGridSlots=isFiltered?stacks.length:Math.max(activeCapacity.capacity,stacks.length);
   const gridPages=Math.max(1,Math.ceil(totalGridSlots/STORAGE_PAGE_SIZE));
   const shownGridPage=Math.min(gridPage,gridPages-1);
   const gridEntries=useMemo<(ItemStack|null)[]>(()=>{
     const start=shownGridPage*STORAGE_PAGE_SIZE;
     const count=Math.min(STORAGE_PAGE_SIZE,Math.max(0,totalGridSlots-start));
     return Array.from({length:count},(_,index)=>stacks[start+index]??null);
   },[shownGridPage,totalGridSlots,stacks]);
   useEffect(()=>{setGridPage(0);scrollY.current=0;scrollRef.current?.scrollToOffset({offset:0,animated:false});},[location,query,filter,sort]);
  // Normalize once per authoritative equipment snapshot; tile rendering must not
  // scan or re-normalize every crafted copy for every visible inventory tile.
  const exactRecords=useMemo(()=>craftedGearInstances(state),[state.account.craftedGearInstances]);
  const exactRecordsById=useMemo(()=>indexInventoryGearCopies(exactRecords),[exactRecords]);
  // Preview actions always target the NEW Inventory copy, never the equipped slot.
  // Dry-run the existing disposal reducers so protected and stale copies stay disabled.
  const previewDisposal=useMemo(()=>{
    const unavailable={sell:false,salvage:false};
    if(!previewId||!state.character)return unavailable;
    const stack=state.inventory.stacks.find(row=>row.itemId===previewId&&row.instanceId===(previewInstanceId??undefined)&&row.quantity>0);
    if(!stack||goalProtection.has(previewId)||favoriteSet.has(previewId)||lockedSet.has(previewId))return unavailable;
    const item=itemDef(previewId);
    if(item.type!=='gear'||item.guildOnly||item.knowledgeUnlockId)return unavailable;
    const eligible=(method:'sell'|'salvage')=>{
      if(method==='sell'&&(!Number.isSafeInteger(item.value)||item.value<=0))return false;
      if(method==='salvage'&&!equipmentSalvageReward(previewId))return false;
      try{
        if(previewInstanceId){
          if(!onCommand)return false;
          disposeCraftedGearInstance(state,previewInstanceId,method);
        }else{
          if(!canDisposeLegacyEquipment(state,previewId,'inventory',1))return false;
          if(method==='sell')sellItem(state,previewId,1);
          else salvageItem(state,previewId);
        }
        return true;
      }catch{return false;}
    };
    return {sell:eligible('sell'),salvage:eligible('salvage')};
  },[state,previewId,previewInstanceId,goalProtection,favoriteSet,lockedSet,onCommand]);
  const selectedSet=useMemo(()=>new Set(selectedIds),[selectedIds]);
   const hasUnselectedShown=gridEntries.some(stack=>stack!==null&&!selectedSet.has(inventoryBulkSelectionId(stack)));
   const selectionSummary=useMemo(()=>bulkSelectionSummary(state,selectedIds,location),[state,selectedIds,location]);
  const exitSelection=()=>{setSelectMode(false);setSelectedIds([]);setBulkPending(null)};
  const changeLocation=(value:BulkStorageLocation)=>{if(value===location&&!pouchOpen&&!equipmentPouchOpen)return;exitSelection();setPouchOpen(false);setEquipmentPouchOpen(false);setLocation(value);setError('')};
  const openPouch=()=>{exitSelection();restored.current=null;setEquipmentPouchOpen(false);setPouchOpen(true);setPreviewId(null);setPreviewInstanceId(null);setInspectId(null);setError('')};
  const openEquipmentPouch=()=>{exitSelection();restored.current=null;setPouchOpen(false);setEquipmentPouchOpen(true);setPreviewId(null);setPreviewInstanceId(null);setInspectId(null);setError('')};
  const toggleSelection=(itemId:string)=>{setSelectedIds(current=>{if(current.includes(itemId))return current.filter(id=>id!==itemId);if(current.length>=100){setError(gt("Select up to 100 item stacks at once."));return current;}setError('');return [...current,itemId]})};
  const selectShown=()=>{
     const shown=gridEntries.filter((stack):stack is ItemStack=>!!stack).map(inventoryBulkSelectionId);
     const combined=[...new Set([...selectedIds,...shown])];
     setSelectedIds(combined.slice(0,100));
     setError(combined.length>100?gt('Select up to 100 item stacks at once.'):'');
   };
  const beginSelection=()=>{setSelectMode(true);setSelectedIds([]);setPreviewId(null);setPreviewInstanceId(null);setInspectId(null);setError('')};
  const beginBulk=(kind:BulkAction)=>{const ids=kind==='transfer'?selectionSummary.transferableIds:kind==='sell'?selectionSummary.sellableIds:selectionSummary.salvageableIds;if(ids.length)setBulkPending({kind,ids})};
  const closeInspect=()=>{if(inspectId&&newItemSet.has(inspectId))run(()=>onAcknowledgeItem(inspectId));setInspectId(null);setSelectedInstanceId(null)};
  const renderStack=(stack:ItemStack)=>{
    const item=itemDef(stack.itemId),exactRecord=stack.instanceId?exactRecordsById.get(stack.instanceId):undefined,favorite=favoriteSet.has(item.id),locked=lockedSet.has(item.id)||exactRecord?.locked===true,newItem=newItemSet.has(item.id),selected=selectedSet.has(inventoryBulkSelectionId(stack)),autoEat=state.character?.equippedFoodId===item.id,rarity=rarityMeta(exactRecord?.rarity??itemRarity(item)),goalProtected=goalProtection.has(item.id);
    const label=[gt('{name}, {count} owned',{name:localizedItemName(language,item.id),count:formatGameNumber(stack.quantity,state.settings.numberMode,state.settings.language)}),favorite?gt('favorite'):'',locked?gt('Locked'):'',exactRecord?rarity.label:'',newItem?gt('New'):'',goalProtected?gt('needed for Working Toward'):''].filter(Boolean).join(', ');
    return <View key={`${location}:${item.id}:${stack.instanceId??'legacy'}`} style={[s.itemTile,{width:tileSize,height:tileSize,borderColor:rarity.color,borderWidth:rarity.borderWidth,backgroundColor:selected?C.selection:C.panel2}]}>
      <Pressable accessibilityRole={selectMode?'checkbox':'button'} accessibilityLabel={selectMode?gt(selected?'Deselect {label}':'Select {label}',{label}):label} accessibilityHint={selectMode?gt("Select this stack for bulk management"):item.type==='gear'&&location==='inventory'?gl("Preview the equipment swap before equipping"):gt("Open item details, sources and crafting uses")} accessibilityState={selectMode?{checked:selected}:undefined} onPress={()=>{if(selectMode){toggleSelection(inventoryBulkSelectionId(stack));return;}if(item.type==='gear'&&location==='inventory'){setPreviewInstanceId(stack.instanceId??null);setPreviewId(item.id);return;}setSelectedInstanceId(stack.instanceId??null);setInspectQuantity(1);setInspectId(item.id)}} style={({pressed})=>[s.itemOpen,pressed&&s.pressed]}>
        <ItemArtwork itemId={item.id} size={iconSize}/>
        <Text accessible={false} style={[s.itemQuantity,{color:rarity.color}]}>{exactRecord?`Q${craftedGearDisplayQuality(exactRecord)}`:`×${formatGameNumber(stack.quantity,state.settings.numberMode,state.settings.language)}`}</Text>
        {newItem?<View accessible={false} style={[s.itemNew,selectMode?s.itemNewTop:s.itemNewBottom]}><Text numberOfLines={1} style={s.itemNewText}>{gt("New").toLocaleUpperCase(language)}</Text></View>:null}
        {autoEat&&!selectMode?<Text accessible={false} style={s.itemAuto}>{gt("EAT")}</Text>:null}
        {selectMode?<View accessible={false} style={[s.itemSelected,selected&&s.itemSelectedOn]}><Text style={s.itemSelectedText}>{selected?'✓':'○'}</Text></View>:null}
      </Pressable>
      {!selectMode&&<>
        <Pressable accessibilityRole="button" accessibilityLabel={locked?gt('Unlock {name}',{name:localizedItemName(language,item.id)}):gt('Lock {name}',{name:localizedItemName(language,item.id)})} accessibilityState={{selected:locked}} hitSlop={2} onPress={()=>{if(lockedSet.has(item.id)){void onToggleLock(item.id);return;}if(stack.instanceId&&exactRecord&&onCommand){void beginInventorySubmission('Updating equipment lock…',()=>onCommand({type:'gear_lock',args:{instanceId:stack.instanceId!,locked:!exactRecord.locked}}));return;}void onToggleLock(item.id)}} style={({pressed})=>[s.itemCorner,s.itemLockCorner,locked&&s.itemCornerActive,pressed&&s.pressed]}>
          <InventoryLockGlyph locked={locked} color={locked?C.warning:C.muted}/>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={favorite?gt('Remove {name} from favorites',{name:localizedItemName(language,item.id)}):gt('Favorite {name}',{name:localizedItemName(language,item.id)})} accessibilityState={{selected:favorite}} hitSlop={2} onPress={()=>{void onToggleFavorite(item.id)}} style={({pressed})=>[s.itemCorner,s.itemFavoriteCorner,favorite&&s.itemCornerActive,pressed&&s.pressed]}>
          <Text accessible={false} style={[s.itemStar,favorite&&s.itemStarOn]}>{favorite?'★':'☆'}</Text>
        </Pressable>
      </>}
    </View>;
  };
  const foodWarning=pending?.item.id===state.character?.equippedFoodId?gt("This is your selected auto-eat food. Only food carried in Inventory can be consumed in combat."):'';
  const goalWarning=pending&&pending.kind!=='deposit'?goalProtection.get(pending.item.id):undefined;
  const goalWarningText=goalWarning?gt('Working Toward is using this item for {goal}. Additional goals: {count}.',{goal:goalWarning.goalTitles[0],count:goalWarning.goalTitles.length-1}):'';
  const message=[(pending?.kind==='sell'||pending?.kind==='bank_sell')?gt('Sell {count} for {gold} gold. This cannot be undone.',{count:pending.quantity,gold:formatGameNumber(pending.item.value*pending.quantity,state.settings.numberMode,state.settings.language)}):pending?.kind==='deposit'?gt('Move {count}× {name} to {destination}?',{count:pending.quantity,name:localizedItemName(language,pending.item.id),destination:gemDepositDestination(state,pending.item.id)==='gem_pouch'?'Gem Pouch':'Bank'}):pending?.item&&equipmentSalvageReward(pending.item.id)?gt('Destroy 1 item for {count}× {name}.',{count:equipmentSalvageReward(pending.item.id)!.quantity,name:localizedItemName(language,equipmentSalvageReward(pending.item.id)!.itemId)}):'',pending?.kind==='deposit'||pending?.kind==='sell'||pending?.kind==='bank_sell'?foodWarning:'',goalWarningText].filter(Boolean).join(' ');
  const bulkMessage=bulkPending?.kind==='transfer'
    ?[gt('Move {stacks} selected stacks ({items} items) to {location}?',{stacks:selectionSummary.transferableStackCount,items:selectionSummary.transferableUnitCount,location:gt(location==='inventory'?'storage (Gem Pouch first for gems)':'Inventory')}),selectionSummary.transferProtectedCount?gt('{count} auto-eat stacks stay in Inventory.',{count:selectionSummary.transferProtectedCount}):'',gt('The move is all-or-nothing if storage space is insufficient.')].filter(Boolean).join(' ')
    :bulkPending?.kind==='sell'||bulkPending?.kind==='salvage'
      ?[bulkPending.kind==='sell'?gt('Sell {stacks} eligible stacks ({items} items) for {gold} gold?',{stacks:selectionSummary.sellableStackCount,items:selectionSummary.sellableUnitCount,gold:formatGameNumber(selectionSummary.sellGold,state.settings.numberMode,state.settings.language)}):gt('Salvage {stacks} eligible equipment stacks ({items} items)?',{stacks:selectionSummary.salvageableStackCount,items:selectionSummary.salvageableUnitCount}),bulkPending.kind==='sell'?(selectionSummary.sellProtectedCount?(selectionSummary.sellProtectedCount?gt('{count} selected stacks are excluded by protection or sell rules.',{count:selectionSummary.sellProtectedCount}):''):''):(selectionSummary.salvageProtectedCount?gt('{count} selected stacks are protected or not salvageable.',{count:selectionSummary.salvageProtectedCount}):''),selectionSummary.goalProtectedCount?gt('{count} Working Toward stacks remain protected.',{count:selectionSummary.goalProtectedCount}):'',gt('This cannot be undone.')].filter(Boolean).join(' ')
      :'';
  const confirmBulk=()=>{if(!bulkPending)return;const action=bulkPending,actionLocation=location,request:InventoryFeedbackRequest=action.kind==='transfer'?{kind:'bulk_transfer',direction:actionLocation==='inventory'?"deposit":"withdraw",stacks:selectionSummary.transferableStackCount,units:selectionSummary.transferableUnitCount}:action.kind==='sell'?{kind:'bulk_sell',stacks:selectionSummary.sellableStackCount,units:selectionSummary.sellableUnitCount,gold:selectionSummary.sellGold}:{kind:'bulk_salvage',stacks:selectionSummary.salvageableStackCount,units:selectionSummary.salvageableUnitCount};setBulkPending(null);exitSelection();scheduleAfterPaint(()=>runInventory(request,()=>onBulkAction(action.kind,actionLocation,action.ids)))};
  const remaining=useMemo(()=>claimOverflowToBank(state).overflow.stacks.reduce((sum,item)=>sum+item.quantity,0),[state]);
  const overflowCount=state.overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const inventoryUpgrade=useMemo(()=>storageUpgradePreview(state,'inventory'),[state]),bankUpgrade=useMemo(()=>storageUpgradePreview(state,'bank'),[state]);
   const activeUpgrade=location==='inventory'?inventoryUpgrade:bankUpgrade;
   const canUpgradeStorage=!!activeUpgrade&&inventoryBusyLabel===null&&(state.character?.level??0)>=activeUpgrade.level&&carriedGold>=activeUpgrade.cost;
   const upgradeRequirement=activeUpgrade&&inventoryBusyLabel===null&&!canUpgradeStorage
     ?(state.character?.level??0)<activeUpgrade.level
       ?gt('Requires character level {level}.',{level:activeUpgrade.level})
       :gt('Need {amount} more Gold',{amount:formatGameNumber(Math.max(0,activeUpgrade.cost-carriedGold),state.settings.numberMode,language)})
     :null;
  const inspected=inspectId?itemDef(inspectId):undefined,carried=location==='inventory';

  const exactCopies=inspected?.type==='gear'?craftedGearCopiesAt(state,inspected.id,location).map(row=>exactRecordsById.get(row.instanceId)!).filter(Boolean):[];
  const selectedCopy=exactCopies.find(row=>row.id===selectedInstanceId)??exactCopies[0];
  const hasLegacyStack=inspected?state[location].stacks.some(row=>row.itemId===inspected.id&&row.instanceId===undefined&&row.quantity>0):false;
  const legacyStackIndex=inspected?state[location].stacks.findIndex(row=>row.itemId===inspected.id&&row.instanceId===undefined&&row.quantity>0):-1;
  const linkAudit=inspected?.type==='gear'?auditCraftedGearOwnership(state):undefined;
  const unlinkedForgeCopies=inspected?.type==='gear'&&linkAudit&&!linkAudit.problems.length
    ?exactRecords.filter(row=>row.itemId===inspected.id&&linkAudit.unlocatedInstanceIds.includes(row.id))
    :[];
  const inspectStock=inspected?state[location].stacks.reduce((total,stack)=>total+(stack.itemId===inspected.id&&!stack.instanceId?stack.quantity:0),0):0;
  const inspectAmount=Math.max(1,Math.min(inspectStock,inspectQuantity));
  const inspectFavorite=!!inspected&&favoriteSet.has(inspected.id);
  const inspectLocked=!!inspected&&(lockedSet.has(inspected.id)||selectedCopy?.locked===true);
  const previewRecord=previewInstanceId?exactRecordsById.get(previewInstanceId):undefined;
  const previewFavorite=!!previewId&&favoriteSet.has(previewId);
  const previewLocked=!!previewId&&(lockedSet.has(previewId)||previewRecord?.locked===true);
  const changeInspectLock=()=>{if(!inspected)return;
    if(lockedSet.has(inspected.id))return beginInventorySubmission('Updating item lock…',()=>onToggleLock(inspected.id));
    if(selectedCopy&&onCommand)return beginInventorySubmission('Updating equipment lock…',()=>onCommand({type:'gear_lock',args:{instanceId:selectedCopy.id,locked:!selectedCopy.locked}}));
    return beginInventorySubmission('Updating item lock…',()=>onToggleLock(inspected.id));
  };
  const changePreviewLock=()=>{if(!previewId)return;
    if(lockedSet.has(previewId))return beginInventorySubmission('Updating item lock…',()=>onToggleLock(previewId));
    if(previewRecord&&onCommand)return beginInventorySubmission('Updating equipment lock…',()=>onCommand({type:'gear_lock',args:{instanceId:previewRecord.id,locked:!previewRecord.locked}}));
    return beginInventorySubmission('Updating item lock…',()=>onToggleLock(previewId));
  };
  const inspectQuickActions=inspected?.type==='material'&&inspectStock>0?<View style={s.inspectQuickActions}>
    <View style={s.inspectAmountRow}>
      <Text style={s.inspectAmountLabel}>{gt('Amount')} · {formatGameNumber(inspectStock,state.settings.numberMode,language)} {gl('available')}</Text>
      <View style={s.inspectStepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={gl('Decrease amount')} disabled={inspectAmount<=1} onPress={()=>setInspectQuantity(value=>Math.max(1,value-1))} style={[s.inspectStep,inspectAmount<=1&&s.inspectStepDisabled]}><Text style={s.inspectStepText}>−</Text></Pressable>
        <Text style={s.inspectAmountValue}>{formatGameNumber(inspectAmount,state.settings.numberMode,language)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={gl('Increase amount')} disabled={inspectAmount>=inspectStock} onPress={()=>setInspectQuantity(value=>Math.min(inspectStock,value+1))} style={[s.inspectStep,inspectAmount>=inspectStock&&s.inspectStepDisabled]}><Text style={s.inspectStepText}>+</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('All')} onPress={()=>setInspectQuantity(inspectStock)} style={s.inspectStep}><Text style={s.inspectStepAll}>{gt('All')}</Text></Pressable>
      </View>
    </View>
    <View style={s.inspectQuickButtons}>
      <View style={s.inspectQuickButton}><GameButton compact title={carried?(gemDepositDestination(state,inspected.id)==='gem_pouch'?gl('To Gem Pouch'):gl('To Bank')):gt('Withdraw')} tone="secondary" loading={inventoryBusyLabel!==null} disabled={inventoryBusyLabel!==null} onPress={()=>{const id=inspected.id,amount=inspectAmount;
        if(carried)runInventory({kind:'deposit',itemId:id,quantity:amount},()=>onDeposit(id,amount));
        else runInventory({kind:'withdraw',itemId:id,quantity:amount},()=>onWithdraw(id,amount));
        closeInspect();
      }}/></View>
      {inspected.value>0?<View style={s.inspectQuickButton}><GameButton compact title={gt('Sell')+' · '+formatGameNumber(inspected.value*inspectAmount,state.settings.numberMode,language)+'g'} tone="secondary" disabled={inventoryBusyLabel!==null||inspectLocked||inspectFavorite||goalProtection.has(inspected.id)} onPress={()=>{setPending({kind:carried?'sell':'bank_sell',item:inspected,quantity:inspectAmount});closeInspect()}}/></View>:null}
    </View>
  </View>:null;
  const inspectActions=inspected?<View style={s.inspectActions}>
    {carried&&inspected.type==='gear'?<GameButton compact title={gt("Compare stats")} tone="secondary" onPress={()=>{setPreviewInstanceId(selectedInstanceId??(hasLegacyStack?null:selectedCopy?.id??null));setPreviewId(inspected.id);closeInspect()}}/>:null}
    {hasLegacyStack&&carried&&inspected.type==='gear'?<GameButton compact title={gt('Equip {slot}',{slot:gl(inspected.slot)})} onPress={()=>{setPreviewInstanceId(null);setPreviewId(inspected.id);closeInspect()}}/>:null}
    {carried&&inspected.type==='food'?<GameButton compact title={state.character?.equippedFoodId===inspected.id?gt("Auto-eat selected"):gt("Use for auto-eat")} disabled={state.character?.equippedFoodId===inspected.id} onPress={()=>{run(()=>onFood(inspected.id));closeInspect()}}/>:null}
    {carried&&inspected.type==='food'&&mealBonusDef(inspected.id)?<>
      <Text style={[s.sub,{color:C.good}]}>{mealBonusDef(inspected.id)!.label} · {mealBonusDef(inspected.id)!.durationHours}h · {gt('Only one meal buff can be active.')}</Text>
      {state.character?.activeMealBuff?<Text style={s.sub}>{gt('Active meal')}: {localizedItemName(language,state.character.activeMealBuff.itemId)} · {Math.ceil(state.character.activeMealBuff.remainingSeconds/60)} min</Text>:null}
      <GameButton compact title={gt('Eat for Bonus')} disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>beginInventorySubmission(gt('Eat for Bonus'),async()=>{await onCommand?.({type:'meal_bonus',args:{id:inspected.id}});closeInspect()})}/>
    </>:null}
    {carried&&inspected.type==='food'?<GameButton compact title={recoveryAmount(healthState,inspected.id)===0?gt("Health full"):gt('Eat 1 · up to {hp} HP',{hp:formatGameNumber(displayStat(Math.round(foodHealingAmount(healthState,inspected.id))),state.settings.numberMode,state.settings.language)})} disabled={recoveryAmount(healthState,inspected.id)===0} tone="secondary" onPress={()=>{run(()=>onEat(inspected.id));closeInspect()}}/>:null}
    <GameButton compact title={favoriteSet.has(inspected.id)?gt("Remove favorite"):gt("Favorite")} tone="secondary" onPress={()=>{run(()=>onToggleFavorite(inspected.id));closeInspect()}}/>
    <GameButton compact title={lockedSet.has(inspected.id)?gt("Unlock item"):gt("Lock item")} tone="secondary" onPress={()=>{run(()=>onToggleLock(inspected.id));closeInspect()}}/>
    {hasLegacyStack&&inspected.type==='gear'&&onCommand?<GameButton compact title={gl('To Equipment')} tone="secondary" loading={inventoryBusyLabel!==null} disabled={inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Storing equipment…',async()=>{await onCommand({type:'equipment_pouch_move',args:{itemId:inspected.id,quantity:1,from:location,to:'equipment_pouch'}});closeInspect()})}/>:null}
    {hasLegacyStack&&inspected.type!=='material'&&(carried?<GameButton compact title={gt('Deposit {count}',{count:formatGameNumber(transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})+(gemDepositDestination(state,inspected.id)==='gem_pouch'?' · Gem Pouch':'')} tone="secondary" onPress={()=>{const amount=transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);if(state.character?.equippedFoodId===inspected.id)setPending({kind:"deposit",item:inspected,quantity:amount});else runInventory({kind:"deposit",itemId:inspected.id,quantity:amount},()=>onDeposit(inspected.id,amount));closeInspect()}}/>:<GameButton compact title={gt('Withdraw {count}',{count:formatGameNumber(transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);runInventory({kind:"withdraw",itemId:inspected.id,quantity:amount},()=>onWithdraw(inspected.id,amount));closeInspect()}}/>)}
    {hasLegacyStack&&inspected.type!=='material'&&!carried&&inspected.value>0&&!favoriteSet.has(inspected.id)&&!lockedSet.has(inspected.id)?<GameButton compact title={gt('Sell {count} · {gold}g',{count:transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),gold:formatGameNumber(inspected.value*transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.bank.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);beginInventorySubmission(gt("Selling items…"),()=>onBankSell(inspected.id,amount));closeInspect()}}/>:null}
    {hasLegacyStack&&inspected.type!=='material'&&carried&&inspected.value>0&&!favoriteSet.has(inspected.id)&&!lockedSet.has(inspected.id)?<GameButton compact title={gt('Sell {count} · {gold}g',{count:transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),gold:formatGameNumber(inspected.value*transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity),state.settings.numberMode,state.settings.language)})} tone="secondary" onPress={()=>{const amount=transferAmount(state.inventory.stacks.find(stack=>stack.itemId===inspected.id)?.quantity??0,quantity);setPending({kind:"sell",item:inspected,quantity:amount});closeInspect()}}/>:null}
    {hasLegacyStack&&inspected.type!=='material'&&carried&&equipmentSalvageReward(inspected.id)&&!favoriteSet.has(inspected.id)&&!lockedSet.has(inspected.id)?<GameButton compact title={gt("Salvage 1")} tone="danger" onPress={()=>{setPending({kind:"salvage",item:inspected,quantity:1});closeInspect()}}/>:null}
    {legacyStackIndex>=0&&unlinkedForgeCopies.length>0?<View style={s.quantityPanel}>
      <Text style={s.quantityTitle}>{gl('LINK OLDER FORGE EQUIPMENT')}</Text>
      <Text style={s.sub}>{gl('Older forged copies were saved without a physical ID. Select which original roll belongs to an untagged copy. No new item is created.')}</Text>
      {unlinkedForgeCopies.map(record=><View key={record.id} style={s.row}>
        <Text style={[s.sub,s.flex]}>{rarityMeta(record.rarity).label} · Q{craftedGearDisplayQuality(record)}{record.quality===undefined?' · '+gl('Legacy baseline'):''}</Text>
        <GameButton compact tone="secondary" title={gl('Link copy')} loading={inventoryBusyLabel!==null} disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Linking original Forge copy…',async()=>{await onCommand!({type:'gear_link_legacy',args:{instanceId:record.id,from:location,stackIndex:legacyStackIndex}});closeInspect()})}/>
      </View>)}
    </View>:null}
    {exactCopies.length>0?<View style={s.quantityPanel}>
      <Text style={s.quantityTitle}>{gl('UNIQUE EQUIPMENT')} · {exactCopies.length} {gl(exactCopies.length===1?'COPY':'COPIES')}</Text>
      {exactCopies.map(copy=><Pressable key={copy.id} accessibilityRole="button" accessibilityState={{selected:selectedCopy?.id===copy.id}} onPress={()=>setSelectedInstanceId(copy.id)} style={[s.row,{padding:10,borderColor:rarityMeta(copy.rarity).color,borderWidth:rarityMeta(copy.rarity).borderWidth,borderRadius:10,backgroundColor:selectedCopy?.id===copy.id?C.selection:C.panel2}]}>
        <Text style={[s.sub,s.flex,{color:rarityMeta(copy.rarity).color,fontWeight:'800'}]}>{rarityMeta(copy.rarity).label} · Q{craftedGearDisplayQuality(copy)}{copy.quality===undefined?' · '+gl('Legacy baseline'):''} {copy.locked?' · '+gl('Locked'):''} {copy.enhancement.rank>0?' · +'+copy.enhancement.rank:''}</Text>
        <Text style={s.quantityTitle}>{selectedCopy?.id===copy.id?'✓':'›'}</Text>
      </Pressable>)}
      {selectedCopy?<View style={s.quantityPanel}>
        <Text style={[s.title,{color:rarityMeta(selectedCopy.rarity).color}]}>{rarityMeta(selectedCopy.rarity).label} · Q{craftedGearDisplayQuality(selectedCopy)}{selectedCopy.quality===undefined?' · '+gl('Legacy'):''}</Text>
        <View style={s.row}>
          
          {carried?<GameButton compact title={gl('Compare & Equip')} loading={inventoryBusyLabel!==null} disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>{setPreviewInstanceId(selectedCopy.id);setPreviewId(inspected.id);closeInspect()}}/>:null}
          <GameButton compact title={gl(carried?'To Bank':'Withdraw')} tone="secondary" loading={inventoryBusyLabel!==null} disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Transferring equipment…',async()=>{await onCommand!({type:'gear_move',args:{instanceId:selectedCopy.id,to:carried?'bank':'inventory'}});closeInspect()})}/>
        {selectedCopy.ownerCharacterId===state.character?.id?<GameButton compact title={gl('To Equipment')} tone="secondary" loading={inventoryBusyLabel!==null} disabled={!onCommand||inventoryBusyLabel!==null} onPress={()=>void beginInventorySubmission('Storing equipment…',async()=>{await onCommand!({type:'gear_move',args:{instanceId:selectedCopy.id,to:'equipment_pouch'}});closeInspect()})}/>:null}
        </View>
        <View style={s.row}>
          <GameButton compact title={gl('Sell copy')} tone="secondary" disabled={!onCommand||selectedCopy.locked||inventoryBusyLabel!==null} onPress={()=>{setCopyPending({instanceId:selectedCopy.id,method:'sell',name:inspected.name});closeInspect()}}/>
          {equipmentSalvageReward(inspected.id)?<GameButton compact title={gl('Salvage copy')} tone="danger" disabled={!onCommand||selectedCopy.locked||inventoryBusyLabel!==null} onPress={()=>{setCopyPending({instanceId:selectedCopy.id,method:'salvage',name:inspected.name});closeInspect()}}/>:null}
        </View>
      </View>:null}
    </View>:null}
  </View>:null;
  if(equipmentPouchOpen)return <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.h}>{gt("Inventory")}</Text>
    <Text style={s.sub}>Equipment stored only for {state.character?.name??'this character'}.</Text>
    <View style={s.storageRow}>{(["inventory","bank"] as const).map(value=><StorageChip key={value} label={value==='inventory'?gt("Inventory"):gt("Bank")} selected={!pouchOpen&&!equipmentPouchOpen&&location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}<StorageChip label={accountText(language,'Gems')} selected={pouchOpen} status={storageCapacityStatus(gemPouch(state).stacks,gemPouch(state).capacity)} onPress={openPouch}/><StorageChip label="Gear" selected={equipmentPouchOpen} status={storageCapacityStatus(equipmentPouch(state).stacks,equipmentPouch(state).capacity)} onPress={openEquipmentPouch}/></View>
    {!!error?<Text accessibilityRole="alert" style={s.errorText}>{gl(error)}</Text>:null}
    {inventoryBusyLabel?<View accessibilityLiveRegion="polite" style={s.pouchStatus}><ActivityIndicator size="small" color={C.accent}/><Text style={s.sub}>{inventoryBusyLabel}</Text></View>:null}
    <EquipmentPouchPanel state={state} busy={inventoryBusyLabel!==null} onAction={onCommand?command=>beginInventorySubmission(command.type==='equipment_pouch_sell'?'Selling equipment…':command.type==='equipment_pouch_salvage'?'Salvaging equipment…':'Updating Equipment Pouch…',async()=>{const result=await onCommand(command);if(result===false)throw new Error('Equipment action was not confirmed.');}):undefined}/>
  </ScrollView>;
  if(pouchOpen)return <ScrollView style={{flex:1,backgroundColor:C.bg}} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <Text accessibilityRole="header" style={s.h}>{gt("Inventory")}</Text>
    <Text style={s.sub}>{accountText(language,'Keep your Gems separate from regular items.')}</Text>
    <View style={s.storageRow}>{(["inventory","bank"] as const).map(value=><StorageChip key={value} label={value==='inventory'?gt("Inventory"):gt("Bank")} selected={!pouchOpen&&!equipmentPouchOpen&&location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}<StorageChip label={accountText(language,'Gems')} selected={pouchOpen} status={storageCapacityStatus(gemPouch(state).stacks,gemPouch(state).capacity)} onPress={openPouch}/><StorageChip label="Gear" selected={equipmentPouchOpen} status={storageCapacityStatus(equipmentPouch(state).stacks,equipmentPouch(state).capacity)} onPress={openEquipmentPouch}/></View>
    {!!error?<Text accessibilityRole="alert" style={s.errorText}>{gl(error)}</Text>:null}
    {inventoryBusyLabel?<View accessibilityLiveRegion="polite" style={s.pouchStatus}><ActivityIndicator size="small" color={C.accent}/><Text style={s.sub}>{inventoryBusyLabel}</Text></View>:null}
    <GemPouchPanel standalone state={state} busy={inventoryBusyLabel!==null} onUpgrade={onCommand?()=>beginInventorySubmission('Upgrading Gem Pouch…',()=>onCommand({type:'gem_pouch_upgrade'})):undefined} onAction={onCommand?command=>beginInventorySubmission('Updating Gem Pouch…',()=>onCommand(command)):undefined} onFavorite={onToggleFavorite} onLock={onToggleLock}/>
  </ScrollView>;
  return <><ConfirmModal visible={copyPending!==null} title={copyPending?.method==='sell'?'Sell this exact equipment copy?':'Salvage this exact equipment copy?'} message={copyPending?`This affects only the selected ${copyPending.name} with its own rarity and quality. ${copyPending.method==='salvage'?('Returns: '+equipmentSalvageRewards(exactRecordsById.get(copyPending.instanceId)?.itemId??'',exactRecordsById.get(copyPending.instanceId)).map(row=>row.quantity+'× '+localizedItemName(language,row.itemId)).join(' · ')+'. '):''}Equipped, locked, upgraded, socketed and loadout-protected copies cannot be destroyed.`:''} confirmLabel={copyPending?.method==='sell'?'Sell this copy':'Salvage this copy'} danger reduceMotion={state.settings.reduceMotion} onConfirm={()=>{const copy=copyPending;setCopyPending(null);if(copy&&onCommand)void beginInventorySubmission('Processing selected equipment…',()=>onCommand({type:copy.method==='sell'?'gear_sell':'gear_salvage',args:{instanceId:copy.instanceId}}))}} onCancel={()=>setCopyPending(null)}/><EquipmentPreview state={state} itemId={previewId} instanceId={previewInstanceId} favorite={previewFavorite} locked={previewLocked}
  onToggleFavorite={previewId?()=>beginInventorySubmission('Updating favorite…',()=>onToggleFavorite(previewId)):undefined}
  onToggleLock={previewId?changePreviewLock:undefined}
  canSell={previewDisposal.sell&&inventoryBusyLabel===null}
  canSalvage={previewDisposal.salvage&&inventoryBusyLabel===null}
  onSell={previewId?()=>{
    if(!previewDisposal.sell||inventoryBusyLabel!==null)return;
    const item=itemDef(previewId);
    if(previewInstanceId)setCopyPending({instanceId:previewInstanceId,method:'sell',name:item.name});
    else setPending({kind:'sell',item,quantity:1});
    setPreviewId(null);setPreviewInstanceId(null);
  }:undefined}
  onSalvage={previewId?()=>{
    if(!previewDisposal.salvage||inventoryBusyLabel!==null)return;
    const item=itemDef(previewId);
    if(previewInstanceId)setCopyPending({instanceId:previewInstanceId,method:'salvage',name:item.name});
    else setPending({kind:'salvage',item,quantity:1});
    setPreviewId(null);setPreviewInstanceId(null);
  }:undefined}
 onClose={()=>{if(previewId&&newItemSet.has(previewId))run(()=>onAcknowledgeItem(previewId));setPreviewId(null);setPreviewInstanceId(null)}}
 onEquip={async()=>{if(!previewId)return;const id=previewId,instanceId=previewInstanceId;
   if(instanceId){if(!onCommand)throw new Error('Exact equipment equipping is unavailable.');await onCommand({type:'gear_equip',args:{instanceId}});}
   else await onEquip(id);
   setPreviewId(null);setPreviewInstanceId(null);
 }}
 onInspect={()=>{setSelectedInstanceId(previewInstanceId);setInspectQuantity(1);setInspectId(previewId);setPreviewId(null);setPreviewInstanceId(null)}}/><ItemQuickInspect state={state} itemId={inspectId} instanceId={selectedInstanceId} source={location} onClose={closeInspect}
  favorite={inspectFavorite} locked={inspectLocked}
  onToggleFavorite={inspected?()=>beginInventorySubmission('Updating favorite…',()=>onToggleFavorite(inspected.id)):undefined}
  onToggleLock={inspected?changeInspectLock:undefined}
  onNavigate={destination=>{closeInspect();onNavigateInspect(destination)}} actions={inspected?.type==='material'?undefined:inspectActions} quickActions={inspectQuickActions}/><FlatList key={gridColumns} data={gridEntries} numColumns={gridColumns} keyExtractor={(stack,index)=>stack?`${location}:${stack.itemId}:${stack.instanceId??'legacy'}`:`${location}:empty:${shownGridPage*STORAGE_PAGE_SIZE+index}`} renderItem={({item})=>item?renderStack(item):<View accessible={false} style={[s.itemTile,s.emptySlot,{width:tileSize,height:tileSize}]}><Text style={s.emptySlotMark}>·</Text></View>} columnWrapperStyle={s.itemGrid} initialNumToRender={12} maxToRenderPerBatch={8} windowSize={3} removeClippedSubviews onLayout={event=>setGridWidth(Math.max(1,Math.min(960,event.nativeEvent.layout.width)-32))} ref={scrollRef} onContentSizeChange={()=>{if(restored.current!==gridColumns){restored.current=gridColumns;scrollRef.current?.scrollToOffset({offset:scrollY.current,animated:false});}}} onScroll={event=>{scrollY.current=event.nativeEvent.contentOffset.y;memory.scrollY=scrollY.current;}} scrollEventThrottle={100} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} ListHeaderComponent={<View style={s.listSection}>
    <Text accessibilityRole="header" style={s.h}>{gt(location==='inventory'?'Inventory':'Bank')}</Text>
    <Text style={s.sub}>{gt('{used}/{capacity} slots · {scope}',{used:activeCapacity.used,capacity:activeCapacity.capacity,scope:location==='bank'?gt('Shared across characters'):gt('Character storage')})}</Text>
    <View style={s.storageRow}>{(["inventory","bank"] as const).map(value=><StorageChip key={value} label={value==='inventory'?gt("Inventory"):gt("Bank")} selected={!pouchOpen&&!equipmentPouchOpen&&location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>changeLocation(value)}/>)}<StorageChip label={accountText(language,'Gems')} selected={pouchOpen} status={storageCapacityStatus(gemPouch(state).stacks,gemPouch(state).capacity)} onPress={openPouch}/><StorageChip label="Gear" selected={equipmentPouchOpen} status={storageCapacityStatus(equipmentPouch(state).stacks,equipmentPouch(state).capacity)} onPress={openEquipmentPouch}/></View>
    
    {location==='bank'&&<View style={s.goldStorage}>
      <Pressable accessibilityRole="button" accessibilityLabel={gt('Gold Storage')} accessibilityState={{expanded:showGoldTransfer}} onPress={()=>setShowGoldTransfer(value=>!value)} style={({pressed})=>[s.goldStorageHead,pressed&&s.pressed]}>
        <View style={s.storageSummaryMain}><Text style={s.goldStorageTitle}>{gt('Gold Storage')}</Text><Text style={s.goldStorageBalance}>{gt('Bank: {bank}g · Carried: {carried}g',{bank:formatGameNumber(bankGold,state.settings.numberMode,state.settings.language),carried:formatGameNumber(carriedGold,state.settings.numberMode,state.settings.language)})}</Text></View>
        <Text style={s.goldToggle}>{showGoldTransfer?'−':'+'}</Text>
      </Pressable>
      {showGoldTransfer&&<View style={s.goldTransferBody}>
      <View style={[s.goldAllActions,stackStorageActions&&s.goldActionsStacked]}><View style={s.goldAction}><GameButton compact title={gt('Deposit all {amount}g',{amount:formatGameNumber(carriedGold,state.settings.numberMode,state.settings.language)})} disabled={inventoryBusyLabel!==null||carriedGold<1} onPress={()=>transferGold('deposit',carriedGold)}/></View><View style={s.goldAction}><GameButton compact title={gt('Withdraw all {amount}g',{amount:formatGameNumber(bankGold,state.settings.numberMode,state.settings.language)})} tone="secondary" disabled={inventoryBusyLabel!==null||bankGold<1} onPress={()=>transferGold('withdraw',bankGold)}/></View></View>
      <View style={s.goldCustomRow}><TextInput accessibilityLabel={gl('Gold transfer amount')} keyboardType="number-pad" placeholder={gt('Custom amount')} placeholderTextColor={C.muted} value={bankGoldAmount} onChangeText={value=>setBankGoldAmount(value.replace(/\D/g,''))} style={s.goldCustomInput}/></View>
      <View style={[s.goldAllActions,stackStorageActions&&s.goldActionsStacked]}><View style={s.goldAction}><GameButton compact title={gt('Deposit {amount}g',{amount:validCustomGold?formatGameNumber(customGoldAmount,state.settings.numberMode,state.settings.language):'—'})} tone="secondary" disabled={inventoryBusyLabel!==null||!validCustomGold||customGoldAmount>carriedGold} onPress={()=>transferGold('deposit',customGoldAmount)}/></View><View style={s.goldAction}><GameButton compact title={gt('Withdraw {amount}g',{amount:validCustomGold?formatGameNumber(customGoldAmount,state.settings.numberMode,state.settings.language):'—'})} tone="secondary" disabled={inventoryBusyLabel!==null||!validCustomGold||customGoldAmount>bankGold} onPress={()=>transferGold('withdraw',customGoldAmount)}/></View></View>
      </View>}
    </View>}
    {activeCapacity.level!=='ok'&&<Text accessibilityRole="alert" style={activeCapacity.level==='full'?s.capacityFull:s.warning}>{gt(activeCapacity.level==='full'?'{location} full · Free a slot or upgrade below.':'{location} · {free} slots left.',{location:gt(location==='inventory'?'Inventory':'Bank'),free:activeCapacity.free})}</Text>}
    <SearchField accessibilityLabel={gt("Search stored items")} placeholder={gt("Search items…")} placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>

    {!!error&&<Text accessibilityRole="alert" style={s.errorText}>{gl(error)}</Text>}
    {inventoryFeedback&&<ActionFeedback message={gl(inventoryFeedback.message)} tone={inventoryFeedback.tone} reduceMotion={state.settings.reduceMotion} compact/>}
    {equipMoment&&<EquipmentSwapMoment moment={equipMoment} reduceMotion={state.settings.reduceMotion} onDismiss={()=>setEquipMoment(null)}/>}
    <View style={s.resultRow}>
      {selectMode?<Text style={[s.sub,s.resultSummary]}>{gt('{count} selected · {stacks} matching stacks',{count:selectedIds.length,stacks:stacks.length})}</Text>:<><Pressable accessibilityRole="button" accessibilityLabel={gt('View and action settings. Current filter: {filter}. Current sort: {sort}',{filter:gl(FILTER_OPTIONS.find(option=>option.id===filter)?.label??filter),sort:gl(SORT_OPTIONS.find(option=>option.id===sort)?.label)})} onPress={()=>setFilterOpen(true)} style={s.viewOptionsTrigger}><Text numberOfLines={1} style={s.sub}>{gl('View:')} <Text style={s.sortValue}>{gl(FILTER_OPTIONS.find(option=>option.id===filter)?.label??filter)} · {gl(SORT_OPTIONS.find(option=>option.id===sort)?.label)}</Text></Text><Text accessible={false} style={s.sortChevron}>›</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={gt('Set move or sell amount. Current amount: {amount}',{amount:quantity==='all'?gt('All'):formatGameNumber(quantity,state.settings.numberMode,state.settings.language)})} onPress={()=>setFilterOpen(true)} style={s.amountTrigger}><Text style={s.amountText}>{gt('Amount')+' · '+(quantity==='all'?gt('All'):formatGameNumber(quantity,state.settings.numberMode,state.settings.language))}</Text></Pressable></>}
      {stacks.length>0&&<Pressable accessibilityRole="button" accessibilityLabel={selectMode?gt("Finish selecting items"):gt("Select multiple items")} onPress={selectMode?exitSelection:beginSelection} style={s.textAction}><Text style={s.sortValue}>{selectMode?gt("Done"):gt("Select")}</Text></Pressable>}
    </View>

    {!isFiltered&&activeStacks.length===0&&<Text style={s.emptyGridHint}>{gt('No items to show')}</Text>}
     {selectMode&&selectedIds.length===0&&<View style={s.selectionEmpty}><Text style={s.selectionEmptyText}>{gt("Select item stacks to manage them together.")}</Text><Pressable accessibilityRole="button" accessibilityState={{disabled:!hasUnselectedShown}} disabled={!hasUnselectedShown} onPress={selectShown} style={({pressed})=>[s.selectionQuickButton,!hasUnselectedShown&&s.selectionQuickDisabled,pressed&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Select shown")}</Text></Pressable></View>}
    {selectMode&&selectedIds.length>0&&<Panel><View style={s.selectionHead}><View style={s.resultSummary}><Text style={s.selectionTitle}>{gt('BULK MANAGEMENT · {count} SELECTED',{count:selectedIds.length})}</Text><Text style={s.sub}>{gt("Whole stacks only · up to 100 stacks per action")}</Text></View><View style={s.selectionQuick}><Pressable accessibilityRole="button" accessibilityState={{disabled:!hasUnselectedShown}} disabled={!hasUnselectedShown} onPress={selectShown} style={({pressed})=>[s.selectionQuickButton,!hasUnselectedShown&&s.selectionQuickDisabled,pressed&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Select shown")}</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>setSelectedIds([])} style={({pressed})=>[s.selectionQuickButton,pressed&&s.pressed]}><Text style={s.selectionQuickText}>{gt("Clear")}</Text></Pressable></View></View><View style={s.bulkActions}><GameButton compact title={`${location==='inventory'?gt("Deposit"):gt("Withdraw")} · ${selectionSummary.transferableStackCount}`} disabled={!selectionSummary.transferableStackCount} tone="secondary" onPress={()=>beginBulk('transfer')}/>{location==='inventory'&&<GameButton compact title={`${gt("Sell")} · ${selectionSummary.sellableStackCount} · ${formatGameNumber(selectionSummary.sellGold,state.settings.numberMode,state.settings.language)}g`} disabled={!selectionSummary.sellableStackCount} tone="secondary" onPress={()=>beginBulk("sell")}/>} {location==='inventory'&&<GameButton compact title={`${gt("Salvage")} · ${selectionSummary.salvageableStackCount}`} disabled={!selectionSummary.salvageableStackCount} tone="danger" onPress={()=>beginBulk("salvage")}/>}</View>{location==='inventory'&&(selectionSummary.sellProtectedCount>0||selectionSummary.transferProtectedCount>0||selectionSummary.goalProtectedCount>0)&&<Text style={s.selectionNote}>{[gt('{count} selected stacks are excluded by protection or sell rules.',{count:selectionSummary.sellProtectedCount}),selectionSummary.goalProtectedCount?gt('{count} Working Toward stacks remain protected.',{count:selectionSummary.goalProtectedCount}):'',selectionSummary.transferProtectedCount?gt('{count} auto-eat stacks stay in Inventory.',{count:selectionSummary.transferProtectedCount}):''].filter(Boolean).join(' ')}</Text>}</Panel>}
    </View>} ListEmptyComponent={<View style={s.listSection}><EmptyState title={gt("No items to show")} message={gt("Try another storage tab or clear the search and category filter.")}/><GameButton title={gt("Clear filters")} tone="secondary" onPress={()=>{setQuery('');setFilter("all")}}/></View>} ListFooterComponent={<View style={s.listSection}>
    {gridPages>1&&<View style={s.storagePaging}>
      <GameButton compact tone="secondary" title={gt('Previous')} disabled={shownGridPage===0} onPress={()=>{setGridPage(page=>Math.max(0,page-1));scrollRef.current?.scrollToOffset({offset:0,animated:false})}}/>
      <Text style={s.storageUpgradeMeta}>{shownGridPage+1}/{gridPages}</Text>
      <GameButton compact tone="secondary" title={gt('Next')} disabled={shownGridPage>=gridPages-1} onPress={()=>{setGridPage(page=>Math.min(gridPages-1,page+1));scrollRef.current?.scrollToOffset({offset:0,animated:false})}}/>
    </View>}
    {location==='inventory'&&!selectMode&&<GameButton compact style={s.depositMaterialsButton} title={gt('Deposit all materials')} tone="secondary" disabled={inventoryBusyLabel!==null||!state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')} onPress={()=>beginInventorySubmission(gt('Moving materials to Bank…'),onDepositMaterials)}/>}
    <View style={s.storageManagement}>
      <View style={s.storageSummary}>
        <View style={s.storageSummaryMain}><Text style={s.storageUpgradeTitle}>{gt('{location} storage',{location:gt(location==='inventory'?'Inventory':'Bank')})}</Text><Text style={s.storageUpgradeMeta}>{activeCapacity.used}/{activeCapacity.capacity} {gt('slots')}</Text></View>
        <Text style={[s.storageUpgradeMeta,activeCapacity.level==='full'&&s.capacityFull]}>{activeCapacity.free} {gt('free')}</Text>
      </View>
      <View style={s.capacityTrack}><View style={[s.capacityFill,{width:`${activeCapacity.percent}%` as `${number}%`,backgroundColor:activeCapacity.level==='full'?C.bad:activeCapacity.level==='near'?C.warning:equipmentColors.selectedLine}]}/></View>
      <View style={[s.storageUpgradeRow,stackStorageActions&&s.storageUpgradeRowStacked]}>
        <View style={[s.storageUpgradeDetails,stackStorageActions&&s.storageUpgradeDetailsStacked]}>
          <Text style={s.storageUpgradeTitle}>{activeUpgrade?gt('Next: {count} slots',{count:activeUpgrade.capacity}):gt('Maximum capacity reached')}</Text>
          {activeUpgrade?<Text style={s.storageUpgradeMeta}>{gt('Level {level} · {gold} Gold',{level:activeUpgrade.level,gold:formatGameNumber(activeUpgrade.cost,state.settings.numberMode,state.settings.language)})}</Text>:null}
           {upgradeRequirement?<Text style={s.storageUpgradeRequirement}>{upgradeRequirement}</Text>:null}
        </View>
        <View style={[s.storageUpgradeAction,stackStorageActions&&s.storageUpgradeActionStacked]}>
          <GameButton compact style={s.storageUpgradeButton} title={activeUpgrade?gt('Upgrade'):gt('Maxed')} tone="secondary" disabled={!canUpgradeStorage} onPress={()=>beginInventorySubmission(gt(location==='inventory'?'Upgrading Inventory…':'Upgrading Bank…'),()=>onUpgradeStorage(location))}/>
        </View>
      </View>
    </View>
    {overflowCount>0&&<Panel><Text style={s.title}>{ot(state.settings.language,'overflow.title')} · {overflowCount}</Text><Text style={s.warning}>{ot(state.settings.language,'overflow.body')}</Text>{state.overflow.stacks.map((stack,index)=><Text key={`${stack.itemId}:${index}`} style={s.sub}>{stack.quantity}× {localizedItemName(language,stack.itemId)}</Text>)}{state.overflow.expiresAtMs!==null&&<Text style={s.warning}>{gt('Recorded expiry: {date}',{date:new Date(state.overflow.expiresAtMs).toLocaleString(language)})}</Text>}<GameButton title={ot(state.settings.language,'overflow.move',{count:overflowCount-remaining})} disabled={remaining===overflowCount} onPress={()=>beginInventorySubmission(gt("Moving Overflow items…"),onOverflow)}/>{remaining>0&&<Text style={s.sub}>{ot(state.settings.language,'overflow.remain',{count:remaining})}</Text>}</Panel>}
  </View>}/>
  <GameModalSurface visible={filterOpen} reduceMotion={state.settings.reduceMotion} onClose={()=>setFilterOpen(false)} backdropLabel={gt("Close inventory view and actions")} surfaceStyle={s.filterSheet}>
        <GameModalHeader eyebrow={gt("INVENTORY VIEW")} title={gt("View & actions")} onClose={()=>setFilterOpen(false)}/>
        <ScrollView style={s.filterList} contentContainerStyle={s.filterListContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
          <View style={s.quantityPanel}><View style={s.quantityHeader}><View style={s.quantityCopy}><Text style={s.quantityTitle}>{gt("MOVE / SELL AMOUNT")}</Text><Text style={s.quantitySummary}>{quantity==='all'?gt("All available units"):gt("{count} units per item action",{count:formatGameNumber(quantity,state.settings.numberMode,state.settings.language)})}</Text></View><View style={s.quantityCurrent}><Text style={s.quantityCurrentText}>{quantity==='all'?gt('All'):formatGameNumber(quantity,state.settings.numberMode,state.settings.language)}</Text></View></View><View style={s.quantityControls}><View style={s.quantityQuickAmounts}>{([1,10,100] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={gt('Use {count} units',{count:value})} accessibilityState={{selected:quantity===value}} onPress={()=>{setQuantity(value);setQuantityInput('')}} style={[s.quantityPreset,quantity===value&&s.quantityPresetActive]}><Text style={[s.quantityPresetText,quantity===value&&s.quantityPresetTextActive]}>{value}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel={gt("Use all available units")} accessibilityState={{selected:quantity==='all'}} onPress={()=>{setQuantity('all');setQuantityInput('')}} style={[s.quantityPreset,quantity==='all'&&s.quantityPresetActive]}><Text style={[s.quantityPresetText,quantity==='all'&&s.quantityPresetTextActive]}>{gt("All")}</Text></Pressable></View><View style={[s.quantityCustom,quantityInput.length>0&&s.quantityCustomActive]}><TextInput accessibilityLabel={gt("Custom move or sell amount")} keyboardType="number-pad" placeholder={gt("Custom")} placeholderTextColor={C.muted} value={quantityInput} onChangeText={value=>{const digits=value.replace(/\D/g,'');setQuantityInput(digits);const parsed=Number(digits);if(Number.isSafeInteger(parsed)&&parsed>0)setQuantity(parsed)}} style={s.quantityInput}/></View></View></View>
          <Text style={s.sheetLabel}>{gt("SORT")}</Text>
          {SORT_OPTIONS.map(option=>{const selected=sort===option.id;return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>setSort(option.id)} style={({pressed})=>[s.filterOption,selected&&s.filterOptionSelected,pressed&&s.pressed]}><Text style={[s.filterOptionText,selected&&s.filterOptionTextSelected]}>{gl(option.label)}</Text><Text style={[s.filterOptionMark,selected&&s.filterOptionMarkSelected]}>{selected?'✓':'›'}</Text></Pressable>})}
          <Text style={s.sheetLabel}>{gt("CATEGORY")}</Text>
          {FILTER_OPTIONS.map(option=>{const selected=filter===option.id,label=option.id==='new'&&activeNewCount?`${gt("New")} · ${activeNewCount}`:gl(option.label);return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{selected}} onPress={()=>setFilter(option.id)} style={({pressed})=>[s.filterOption,selected&&s.filterOptionSelected,pressed&&s.pressed]}><Text style={[s.filterOptionText,selected&&s.filterOptionTextSelected]}>{label}</Text><Text style={[s.filterOptionMark,selected&&s.filterOptionMarkSelected]}>{selected?'✓':'›'}</Text></Pressable>})}
        </ScrollView>
        {newItemIds.length>0&&<GameButton title={gt("Mark all seen")} tone="secondary" onPress={()=>run(onAcknowledgeAll)}/>}
        <View style={s.sheetActions}><View style={s.flex}><GameButton title={gt("Reset")} tone="secondary" onPress={()=>setFilter("all")}/></View><View style={s.flex}><GameButton title={gt("Done")} onPress={()=>setFilterOpen(false)}/></View></View>
  </GameModalSurface>
  <ConfirmModal visible={pending!==null} title={gt('{action} {name}?',{action:gt(pending?.kind==='deposit'?'Deposit':pending?.kind==='sell'||pending?.kind==='bank_sell'?'Sell':'Salvage'),name:pending?.item?localizedItemName(language,pending.item.id):''})} message={message} confirmLabel={pending?.kind==='deposit'?gt("Deposit"):pending?.kind==='sell'||pending?.kind==='bank_sell'?gt("Sell {count}",{count:pending.quantity}):gt("Salvage 1")} danger={pending?.kind!=='deposit'} reduceMotion={state.settings.reduceMotion} onConfirm={confirm} onCancel={()=>setPending(null)}/><ConfirmModal visible={bulkPending!==null} title={bulkPending?.kind==='transfer'?gt('{action} selected stacks?',{action:gt(location==='inventory'?'Deposit':'Withdraw')}):bulkPending?.kind==='sell'?gt("Sell selected items?"):gt("Salvage selected equipment?")} message={bulkMessage} confirmLabel={bulkPending?.kind==='transfer'?(location==='inventory'?gt("Deposit selected"):gt("Withdraw selected")):bulkPending?.kind==='sell'?gt("Sell eligible"):gt("Salvage eligible")} danger={bulkPending?.kind!=='transfer'} reduceMotion={state.settings.reduceMotion} onConfirm={confirmBulk} onCancel={()=>setBulkPending(null)}/><Modal transparent visible={inventoryBusyLabel!==null} animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={()=>{}}><View style={s.transactionBackdrop}><View accessibilityRole="progressbar" accessibilityLabel={inventoryBusyLabel??gt("Updating inventory")} accessibilityState={{busy:true}} style={s.transactionCard}><ActivityIndicator size="large" color={C.accent}/><Text style={s.transactionTitle}>{inventoryBusyLabel}</Text><Text style={s.transactionCopy}>{gt("Please wait while your inventory is updated.")}</Text></View></View></Modal></>;
}
/** Concept 1: a squared, centered padlock badge that stays legible at item-card scale. */
function InventoryLockGlyph({locked,color}:{locked:boolean;color:string}){
  return <View accessible={false} style={{width:15,height:16}}>
    <View style={{position:'absolute',left:locked?4:2,top:1,width:8,height:7,borderWidth:1.35,borderColor:color,borderBottomWidth:0,borderTopLeftRadius:5,borderTopRightRadius:5,transform:locked?undefined:[{rotate:'-28deg'}]}}/>
    <View style={{position:'absolute',left:1,top:7,width:13,height:8,borderWidth:1.35,borderColor:color,borderRadius:2,backgroundColor:'transparent'}}/>
    <View style={{position:'absolute',left:6,top:9,width:3,height:3,borderRadius:99,backgroundColor:color}}/>
    <View style={{position:'absolute',left:7,top:11,width:1,height:2,backgroundColor:color}}/>
  </View>;
}
function UtilityChip({label,accessibilityLabel,selected=false,onPress}:{label:string;accessibilityLabel:string;selected?:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.utilityChip,selected&&s.utilityChipActive,pressed&&s.pressed]}><Text numberOfLines={1} style={[s.utilityChipText,selected&&s.utilityChipTextActive]}>{label}</Text></Pressable>}
function StorageChip({label,selected,status,onPress}:{label:string;selected:boolean;status:ReturnType<typeof storageCapacityStatus>;onPress:()=>void}){const {gt}=useGameplayText();const {width:deviceWidth,fontScale}=useWindowDimensions();const narrow=deviceWidth<420||fontScale>=1.25;const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipmentColors=equipmentTheme(C),tone=status.level==='full'?C.bad:status.level==='near'?C.warning:selected?equipmentColors.selectedLine:C.line,width=`${status.percent}%` as `${number}%`;return <Pressable accessibilityRole="button" accessibilityLabel={gt('{label} storage, {used} of {capacity} slots used, {free} free',{label,used:status.used,capacity:status.capacity,free:status.free})} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.storageChip,selected&&s.storageChipSelected,status.level==='full'&&s.storageChipFull,pressed&&s.pressed]}><View style={[s.storageChipTop,narrow&&s.storageChipTopCompact]}><Text numberOfLines={1} style={[s.storageChipLabel,selected&&s.storageChipLabelSelected]} >{label}</Text><Text style={[s.storageChipCount,{color:tone}]}>{status.used}/{status.capacity}</Text></View><View style={s.capacityTrack}><View style={[s.capacityFill,{width,backgroundColor:tone}]}/></View></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},
  pouchStatus:{flexDirection:'row',alignItems:'center',gap:8,padding:spacing.sm,borderRadius:10,backgroundColor:C.panel2},
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
  listSection:{gap:10},root:{padding:16,gap:12,paddingBottom:100,width:'100%',maxWidth:960,alignSelf:'center'},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  warning:{...typography.body,color:C.warning},
  capacityFull:{...typography.bodyStrong,color:C.bad},
  errorText:{...typography.body,color:C.bad,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},
  label:{...typography.caption,color:C.accent,fontWeight:'700'},
  storageManagement:{gap:10,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
  storageSummary:{flexDirection:'row',alignItems:'center',gap:8},
  storageSummaryMain:{flex:1,minWidth:0},
  depositMaterialsButton:{width:'100%',minHeight:44},
  storageUpgradeRow:{flexDirection:'row',alignItems:'center',gap:10,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},
  storageUpgradeRowStacked:{alignItems:'stretch',flexDirection:'column',gap:8},
  storageUpgradeDetails:{flex:1,minWidth:0,gap:4},
  storageUpgradeDetailsStacked:{flex:0,width:'100%'},
  storageUpgradeTitle:{...typography.bodyStrong,color:C.text},
  storageUpgradeMeta:{...typography.caption,color:C.muted},
  storageUpgradeRequirement:{...typography.caption,color:C.warning,fontWeight:'700'},
  storageUpgradeAction:{width:116,flexShrink:0},
  storageUpgradeActionStacked:{width:'100%'},
  storageUpgradeButton:{width:'100%',minHeight:44},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  storageRow:{flexDirection:'row',gap:5},
  storageChip:{flex:1,minWidth:0,minHeight:48,gap:6,justifyContent:'center',paddingHorizontal:6,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  storageChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected,borderWidth:2},
  storageChipFull:{borderColor:C.bad},
  storageChipTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  storageChipTopCompact:{flexDirection:'column',alignItems:'flex-start',gap:2},
  storageChipLabel:{fontSize:12,color:C.muted,fontWeight:'800'},
  storageChipLabelSelected:{color:C.text},
  storageChipCount:{fontSize:11,fontWeight:'900'},
  capacityTrack:{height:4,overflow:'hidden',borderRadius:99,backgroundColor:C.bg},
  capacityFill:{height:4,borderRadius:99},
  goldStorage:{borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel,overflow:'hidden'},
  goldTransferBody:{gap:8,paddingHorizontal:spacing.sm,paddingBottom:spacing.sm},
  goldToggle:{color:C.accent,fontSize:20,fontWeight:'800'},
  goldStorageHead:{minHeight:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm,paddingHorizontal:spacing.md,paddingVertical:8},
  goldStorageTitle:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
  goldStorageBalance:{...typography.caption,color:C.muted,marginTop:3},
  goldAllActions:{flexDirection:'row',gap:8},
  goldActionsStacked:{flexDirection:'column'},
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
  viewOptionsTrigger:{flex:1,minWidth:0,minHeight:44,flexDirection:'row',alignItems:'center',gap:5},amountTrigger:{minHeight:44,justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},amountText:{fontSize:10,color:C.text,fontWeight:'900'},sortChevron:{...typography.body,color:C.muted,transform:[{translateY:-3}]},sortValue:{...typography.bodyStrong,color:C.text},textAction:{minHeight:44,minWidth:44,alignItems:'center',justifyContent:'center',paddingHorizontal:6},
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
  selectionEmpty:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},selectionEmptyText:{flex:1,minWidth:0,...typography.caption,color:C.muted,fontWeight:'700'},
  bulkActions:{flexDirection:'row',flexWrap:'wrap',gap:8},
  selectionNote:{...typography.caption,color:C.warning},
  utilityRow:{flexDirection:'row',gap:6},
  inspectHint:{...typography.caption,color:C.muted,textAlign:'center'},
  gridHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:2},gridLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},gridMeta:{...typography.caption,color:C.muted},
  itemGrid:{flexDirection:'row',gap:5},
   emptyGridHint:{...typography.caption,color:C.muted,textAlign:'center',paddingVertical:2},
   emptySlot:{borderColor:C.line,backgroundColor:C.bg},emptySlotMark:{fontSize:16,color:C.muted,opacity:.45},
   storagePaging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  itemTile:{position:'relative',alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8},
  itemOpen:{width:'100%',height:'100%',alignItems:'center',justifyContent:'center'},
  itemCorner:{position:'absolute',top:2,width:25,height:25,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:6,borderColor:C.line,backgroundColor:C.panel},
  itemCornerActive:{borderColor:C.warning},itemLockCorner:{left:2},itemFavoriteCorner:{right:2},
  itemStar:{fontSize:18,lineHeight:22,fontWeight:'900',color:C.muted},itemStarOn:{color:C.warning},
  itemQuantity:{position:'absolute',right:3,bottom:3,paddingHorizontal:4,borderRadius:7,overflow:'hidden',fontSize:9,lineHeight:14,fontWeight:'900',backgroundColor:C.panel},
  itemNew:{position:'absolute',left:3,height:16,maxHeight:16,alignSelf:'flex-start',flexGrow:0,flexShrink:0,alignItems:'center',justifyContent:'center',paddingHorizontal:4,borderRadius:3,backgroundColor:C.info},itemNewBottom:{bottom:16},itemNewTop:{top:3},itemNewText:{fontSize:9,lineHeight:11,includeFontPadding:false,color:C.panel,fontWeight:'900',letterSpacing:.3},
  itemAuto:{position:'absolute',left:3,bottom:3,paddingHorizontal:3,paddingVertical:1,borderRadius:3,overflow:'hidden',fontSize:6,lineHeight:8,color:C.panel,fontWeight:'900',letterSpacing:.35,backgroundColor:C.good},
  itemSelected:{position:'absolute',left:3,bottom:3,width:17,height:17,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel},itemSelectedOn:{borderColor:C.selectionLine,backgroundColor:C.selection},itemSelectedText:{fontSize:10,color:C.text,fontWeight:'900'},
  inspectActions:{gap:spacing.xs},
  inspectQuickActions:{gap:8},
  inspectAmountRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:7,flexWrap:'wrap'},
  inspectAmountLabel:{...typography.caption,color:C.muted,flexShrink:1},
  inspectStepper:{flexDirection:'row',alignItems:'center',gap:5},
  inspectStep:{minWidth:36,minHeight:38,paddingHorizontal:7,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2},
  inspectStepDisabled:{opacity:.35},inspectStepText:{fontSize:20,fontWeight:'900',color:C.text},inspectStepAll:{...typography.caption,color:C.accent,fontWeight:'900'},
  inspectAmountValue:{minWidth:38,textAlign:'center',...typography.bodyStrong,color:C.text},
  inspectQuickButtons:{flexDirection:'row',gap:8},inspectQuickButton:{flex:1,minWidth:0},
  utilityChip:{minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  utilityChipActive:{borderColor:C.selectionLine,backgroundColor:C.selection},
  utilityChipText:{fontSize:11,color:C.text,fontWeight:'800'},
  utilityChipTextActive:{color:C.selectionLine},
  filterSheet:{maxHeight:'78%',gap:10},
  filterList:{maxHeight:430},
  filterListContent:{gap:5},
  sheetLabel:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8,paddingTop:6},
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

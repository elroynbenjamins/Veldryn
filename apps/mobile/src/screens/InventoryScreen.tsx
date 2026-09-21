import {SearchField} from '../components/SearchField';
import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState,ItemStack} from '../core/types';
import {ItemDef,itemDef} from '../content/items';
import {InventoryFilter,InventorySort,inventoryFavoriteIds,inventoryNewItemIds,recoveryAmount,storageCapacityStatus,transferAmount,transferError,visibleStacks} from '../core/inventory-view';
import {claimOverflowToBank,effectiveStats,StorageLocation,storageUpgradePreview} from '../core/game';
import {ItemCard} from '../components/ItemCard';
import {ConfirmModal} from '../components/ConfirmModal';
import {EmptyState} from '../components/EmptyState';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentPreview} from '../components/EquipmentPreview';
import {previewEquipment} from '../core/equipment-preview';
import {formatGameNumber} from '../core/number-format';
import {ot} from '../i18n';
import {enhancedGearStats,gearEnhancement,gemSocketCapacity,hasEnhancement} from '../core/equipment-enhancement';

type Pending={kind:'sell'|'salvage'|'deposit';item:ItemDef;quantity:number}|null;
const FILTER_OPTIONS:{id:InventoryFilter;label:string}[]=[{id:'all',label:'All'},{id:'new',label:'New'},{id:'favorites',label:'★ Favorites'},{id:'gear',label:'Gear'},{id:'material',label:'Materials'},{id:'gem',label:'Gems'},{id:'food',label:'Food'},{id:'potion',label:'Potions'},{id:'tool',label:'Tools'},{id:'quest',label:'Quest'}];
const SORT_OPTIONS:{id:InventorySort;label:string}[]=[{id:'name',label:'Name'},{id:'new',label:'New first'},{id:'favorite',label:'Favorites first'},{id:'quantity',label:'Quantity ↓'},{id:'value',label:'Value ↓'}];
const nextSort=(value:InventorySort)=>SORT_OPTIONS[(SORT_OPTIONS.findIndex(option=>option.id===value)+1)%SORT_OPTIONS.length].id;
const nextQuantity=(value:1|10|'all'):1|10|'all'=>value===1?10:value===10?'all':1;
export function InventoryScreen({state,onEquip,onFood,onEat,onSell,onSalvage,onDeposit,onDepositMaterials,onUpgradeStorage,onWithdraw,onOverflow,onToggleFavorite,onAcknowledgeItem,onAcknowledgeAll}:{state:GameState;onEquip:(id:string)=>void;onFood:(id:string)=>void;onEat:(id:string)=>void;onSell:(id:string)=>void;onSalvage:(id:string)=>void;onDeposit:(id:string,quantity:number)=>void;onDepositMaterials:()=>void;onUpgradeStorage:(location:StorageLocation)=>void;onWithdraw:(id:string,quantity:number)=>void;onOverflow:()=>void;onToggleFavorite:(id:string)=>void;onAcknowledgeItem:(id:string)=>void;onAcknowledgeAll:()=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  const [pending,setPending]=useState<Pending>(null),[location,setLocation]=useState<'inventory'|'bank'>('inventory');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<InventoryFilter>('all'),[sort,setSort]=useState<InventorySort>('name');
  const [quantity,setQuantity]=useState<1|10|'all'>(1);
  const [error,setError]=useState('');
  const [expandedItem,setExpandedItem]=useState<string|null>(null);
  const [previewId,setPreviewId]=useState<string|null>(null);
  const [showStorage,setShowStorage]=useState(false);
  const run=(action:()=>void)=>{try{action();setError('')}catch(e){setError(e instanceof Error?e.message:'Action failed. Please try again.')}};
  const confirm=()=>{if(!pending)return;run(()=>pending.kind==='deposit'?onDeposit(pending.item.id,pending.quantity):pending.kind==='sell'?onSell(pending.item.id):onSalvage(pending.item.id));setPending(null)};
  const favorites=inventoryFavoriteIds(state),favoriteSet=new Set(favorites),newItemIds=inventoryNewItemIds(state),newItemSet=new Set(newItemIds);
  const inventoryCapacity=storageCapacityStatus(state.inventory.stacks,state.inventory.capacity),bankCapacity=storageCapacityStatus(state.bank.stacks,state.bank.capacity),activeCapacity=location==='inventory'?inventoryCapacity:bankCapacity;
  const activeNewCount=new Set(state[location].stacks.filter(stack=>stack.quantity>0&&newItemSet.has(stack.itemId)).map(stack=>stack.itemId)).size;
  const stacks=visibleStacks(state[location].stacks,query,filter,sort,favorites,newItemIds);
  const toggleItem=(itemId:string,newItem:boolean)=>{const key=location+':'+itemId,closing=expandedItem===key;if(closing&&newItem)run(()=>onAcknowledgeItem(itemId));else if(!closing&&expandedItem){const previousId=expandedItem.slice(expandedItem.indexOf(':')+1);if(newItemSet.has(previousId))run(()=>onAcknowledgeItem(previousId));}setExpandedItem(closing?null:key)};
  const renderStack=(stack:ItemStack)=>{
    const item=itemDef(stack.itemId),equippedId=item.slot?state.character?.equipment[item.slot]:undefined,carried=location==='inventory',favorite=favoriteSet.has(item.id),newItem=newItemSet.has(item.id);
    const amount=transferAmount(stack.quantity,quantity),selectedFood=state.character?.equippedFoodId===item.id,enhancement=item.type==='gear'?gearEnhancement(state,item.id):undefined,enhancementProtected=item.type==='gear'&&hasEnhancement(state,item.id);
    return <ItemCard favorite={favorite} newItem={newItem} onToggleFavorite={()=>run(()=>onToggleFavorite(item.id))} expanded={expandedItem===location+':'+item.id} onToggle={()=>toggleItem(item.id,newItem)} key={`${location}:${item.id}`} item={item} quantity={stack.quantity} equipped={equippedId?itemDef(equippedId):undefined} upgradeRank={enhancement?.rank} socketed={enhancement?.gemIds.length} socketCapacity={item.type==='gear'?gemSocketCapacity(item.id):0} enhancementProtected={enhancementProtected} displayStats={item.type==='gear'?enhancedGearStats(state,item.id):undefined} equippedDisplayStats={equippedId?enhancedGearStats(state,equippedId):undefined} selectedFood={selectedFood} healAmount={recoveryAmount(state,item.id)} transferQuantity={amount} transferIssue={transferError(state,item.id,amount,location)} numberMode={state.settings.numberMode}
      onPreview={item.type==='gear'?()=>run(()=>{previewEquipment(state,item.id);setPreviewId(item.id)}):undefined}
      onEquip={carried&&item.type==='gear'?()=>run(()=>onEquip(item.id)):undefined} onSelectFood={carried&&item.type==='food'?()=>run(()=>onFood(item.id)):undefined} onEat={carried&&item.type==='food'?()=>run(()=>onEat(item.id)):undefined}
      onSell={carried&&item.value>0&&!enhancementProtected&&!favorite?()=>setPending({kind:'sell',item,quantity:1}):undefined} onSalvage={carried&&item.salvage&&!enhancementProtected&&!favorite?()=>setPending({kind:'salvage',item,quantity:1}):undefined}
      onDeposit={carried?()=>selectedFood?setPending({kind:'deposit',item,quantity:amount}):run(()=>onDeposit(item.id,amount)):undefined} onWithdraw={!carried?()=>run(()=>onWithdraw(item.id,amount)):undefined}/>;
  };
  const foodWarning=pending?.item.id===state.character?.equippedFoodId?' This is your selected auto-eat food. Only food carried in Inventory can be consumed in combat.':'';
  const message=pending?.kind==='sell'?`Sell 1 for ${pending.item.value} gold. This cannot be undone.${foodWarning}`:pending?.kind==='deposit'?`Move ${pending.quantity}× ${pending.item.name} to Bank?${foodWarning}`:pending?.item.salvage?`Destroy 1 item for ${pending.item.salvage.quantity}× ${itemDef(pending.item.salvage.itemId).name}.`:'';
  const remaining=claimOverflowToBank(state).overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const overflowCount=state.overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const inventoryUpgrade=storageUpgradePreview(state,'inventory'),bankUpgrade=storageUpgradePreview(state,'bank');
  return <><EquipmentPreview state={state} itemId={previewId} onClose={()=>setPreviewId(null)}/><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={s.h}>Inventory</Text>
    <View style={s.recovery}><Text style={s.label}>RECOVERY</Text><Text style={s.sub}>Health {state.character!.currentHp}/{effectiveStats(state).hp} · Auto-eat: {state.character?.equippedFoodId?itemDef(state.character.equippedFoodId).name:'None'}</Text><Text style={s.sub}>Carried auto-eat portions: {state.inventory.stacks.find(item=>item.itemId===state.character?.equippedFoodId)?.quantity??0}</Text></View>
    <View style={s.storageRow}>{(['inventory','bank'] as const).map(value=><StorageChip key={value} label={value==='inventory'?'Inventory':'Bank'} selected={location===value} status={value==='inventory'?inventoryCapacity:bankCapacity} onPress={()=>setLocation(value)}/>)}</View>
    {activeCapacity.level!=='ok'&&<Text accessibilityRole="alert" style={activeCapacity.level==='full'?s.capacityFull:s.warning}>{location==='inventory'?'Inventory':'Bank'} {activeCapacity.level==='full'?'is full. Free a slot or upgrade storage before receiving another unique stack.':`is ${activeCapacity.percent}% full · ${activeCapacity.free} slots remain.`}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showStorage}} onPress={()=>setShowStorage(value=>!value)} style={s.disclosure}><View style={s.flex}><Text style={s.disclosureTitle}>STORAGE MANAGEMENT</Text><Text style={s.sub}>Bulk deposit and capacity upgrades</Text></View><Text style={s.disclosureMark}>{showStorage?'−':'+'}</Text></Pressable>
    {showStorage&&<Panel><Text style={s.sub}>Inventory travels with this character. Bank storage is shared by every character on the account.</Text>{location==='inventory'&&<GameButton title="Deposit all materials" tone="secondary" disabled={!state.inventory.stacks.some(entry=>itemDef(entry.itemId).type==='material')} onPress={()=>run(onDepositMaterials)}/>}<View style={s.row}><View style={s.flex}><Text style={s.upgradeLabel}>INVENTORY · {state.inventory.capacity} SLOTS</Text><GameButton title={inventoryUpgrade?`Upgrade to ${inventoryUpgrade.capacity} · ${formatGameNumber(inventoryUpgrade.cost,state.settings.numberMode)}g`:'Inventory maxed'} disabled={!inventoryUpgrade} tone="secondary" onPress={()=>run(()=>onUpgradeStorage('inventory'))}/></View><View style={s.flex}><Text style={s.upgradeLabel}>BANK · {state.bank.capacity} SLOTS</Text><GameButton title={bankUpgrade?`Upgrade to ${bankUpgrade.capacity} · ${formatGameNumber(bankUpgrade.cost,state.settings.numberMode)}g`:'Bank maxed'} disabled={!bankUpgrade} tone="secondary" onPress={()=>run(()=>onUpgradeStorage('bank'))}/></View></View></Panel>}
    <Text style={s.sub}>{location==='inventory'?'Carried items available during adventures.':'Bank materials are available for crafting, but food must be withdrawn for combat.'}</Text>
    <SearchField accessibilityLabel="Search stored items" placeholder="Search items…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.controlStrip}>
      {FILTER_OPTIONS.map(option=><ChoiceChip key={option.id} label={option.id==='new'&&activeNewCount?`New · ${activeNewCount}`:option.label} selected={filter===option.id} onPress={()=>setFilter(option.id)}/>)}
    </ScrollView>
    <View style={s.utilityRow}>
      <UtilityChip label={`↕ Sort · ${SORT_OPTIONS.find(option=>option.id===sort)?.label??'Name'}`} accessibilityLabel={`Sort items. Current sort: ${sort}`} onPress={()=>setSort(value=>nextSort(value))}/>
      <UtilityChip label={`⇄ Move · ${quantity==='all'?'All':quantity}`} accessibilityLabel={`Transfer quantity. Current amount: ${quantity}`} onPress={()=>setQuantity(value=>nextQuantity(value))}/>
    </View>
    {!!error&&<Text accessibilityRole="alert" style={s.errorText}>{error}</Text>}
    <View style={s.resultRow}><Text style={[s.sub,s.resultSummary]}>{stacks.length} matching stacks · {activeCapacity.free} free slots{favorites.length?` · ${favorites.length} favorites`:''}{newItemIds.length?` · ${newItemIds.length} new`:''}</Text>{newItemIds.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="Mark all new items as seen" onPress={()=>run(onAcknowledgeAll)} style={({pressed})=>[s.markSeen,pressed&&s.pressed]}><Text style={s.markSeenText}>Mark all seen</Text></Pressable>}</View>
    {stacks.length?stacks.map(renderStack):<><EmptyState title="No items to show" message="Try another storage tab or clear the search and category filter."/><GameButton title="Clear filters" tone="secondary" onPress={()=>{setQuery('');setFilter('all')}}/></>}
    {overflowCount>0&&<Panel><Text style={s.title}>{ot(state.settings.language,'overflow.title')} · {overflowCount}</Text><Text style={s.warning}>{ot(state.settings.language,'overflow.body')}</Text>{state.overflow.stacks.map((stack,index)=><Text key={`${stack.itemId}:${index}`} style={s.sub}>{stack.quantity}× {itemDef(stack.itemId).name}</Text>)}{state.overflow.expiresAtMs!==null&&<Text style={s.warning}>Recorded expiry: {new Date(state.overflow.expiresAtMs).toLocaleString()}</Text>}<GameButton title={ot(state.settings.language,'overflow.move',{count:overflowCount-remaining})} disabled={remaining===overflowCount} onPress={()=>run(onOverflow)}/>{remaining>0&&<Text style={s.sub}>{ot(state.settings.language,'overflow.remain',{count:remaining})}</Text>}</Panel>}
  </ScrollView><ConfirmModal visible={pending!==null} title={`${pending?.kind==='deposit'?'Bank':pending?.kind==='sell'?'Sell':'Salvage'} ${pending?.item.name??'item'}?`} message={message} confirmLabel={pending?.kind==='deposit'?'Deposit':pending?.kind==='sell'?'Sell 1':'Salvage 1'} danger={pending?.kind!=='deposit'} onConfirm={confirm} onCancel={()=>setPending(null)}/></>;
}
function ChoiceChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.chip,selected&&s.chipSelected,pressed&&s.pressed]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}
function UtilityChip({label,accessibilityLabel,onPress}:{label:string;accessibilityLabel:string;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({pressed})=>[s.utilityChip,pressed&&s.pressed]}><Text numberOfLines={1} style={s.utilityChipText}>{label}</Text></Pressable>}
function StorageChip({label,selected,status,onPress}:{label:string;selected:boolean;status:ReturnType<typeof storageCapacityStatus>;onPress:()=>void}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),equipmentColors=equipmentTheme(C),tone=status.level==='full'?C.bad:status.level==='near'?C.warning:selected?equipmentColors.selectedLine:C.line,width=`${status.percent}%` as `${number}%`;return <Pressable accessibilityRole="button" accessibilityLabel={`${label} storage, ${status.used} of ${status.capacity} slots used, ${status.free} free`} accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[s.storageChip,selected&&s.storageChipSelected,status.level==='full'&&s.storageChipFull,pressed&&s.pressed]}><View style={s.storageChipTop}><Text style={[s.storageChipLabel,selected&&s.chipTextSelected]}>{selected?'✓ ':''}{label}</Text><Text style={[s.storageChipCount,{color:tone}]}>{status.used}/{status.capacity}</Text></View><View style={s.capacityTrack}><View style={[s.capacityFill,{width,backgroundColor:tone}]}/></View></Pressable>}
function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  recovery:{gap:4,padding:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  root:{padding:spacing.lg,gap:spacing.md},
  h:{...typography.hero,color:C.text},
  title:{...typography.title,color:C.text},
  sub:{...typography.body,color:C.muted},
  warning:{...typography.body,color:C.warning},
  capacityFull:{...typography.bodyStrong,color:C.bad},
  errorText:{...typography.body,color:C.bad,padding:spacing.sm,borderWidth:1,borderColor:C.bad,borderRadius:8,backgroundColor:C.badSurface},
  label:{...typography.caption,color:C.accent,fontWeight:'700'},
  upgradeLabel:{...typography.caption,color:C.muted,fontWeight:'700',marginBottom:spacing.xs},
  disclosure:{minHeight:56,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
  disclosureTitle:{...typography.caption,color:C.accent,fontWeight:'700',letterSpacing:.8},
  disclosureMark:{width:28,color:C.accent,fontSize:25,textAlign:'center'},
  row:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},
  chipRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  storageRow:{flexDirection:'row',gap:8},
  storageChip:{flex:1,minWidth:0,minHeight:54,gap:7,justifyContent:'center',paddingHorizontal:12,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
  storageChipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},
  storageChipFull:{borderColor:C.bad},
  storageChipTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  storageChipLabel:{fontSize:12,color:C.muted,fontWeight:'800'},
  storageChipCount:{fontSize:11,fontWeight:'900'},
  capacityTrack:{height:4,overflow:'hidden',borderRadius:99,backgroundColor:C.bg},
  capacityFill:{height:4,borderRadius:99},
  controlStrip:{gap:6,paddingRight:spacing.md},
  chip:{minHeight:44,paddingHorizontal:13,justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},
  chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},
  chipText:{fontSize:12,color:C.muted,fontWeight:'700'},
  chipTextSelected:{color:C.text},
  resultRow:{flexDirection:'row',alignItems:'center',gap:8},
  resultSummary:{flex:1,minWidth:0},
  markSeen:{minHeight:36,justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.info,borderRadius:99,backgroundColor:C.infoSurface},
  markSeenText:{fontSize:10,color:C.info,fontWeight:'900'},
  utilityRow:{flexDirection:'row',gap:8},
  utilityChip:{flex:1,minWidth:0,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},
  utilityChipText:{fontSize:12,color:C.text,fontWeight:'800'},
  pressed:{opacity:.76},
  flex:{flex:1,minWidth:148},
  input:{minHeight:48,paddingHorizontal:spacing.md,borderRadius:10,borderWidth:1,borderColor:C.line,color:C.text,backgroundColor:C.panel,fontSize:16}
});}

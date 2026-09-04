import React,{useState} from 'react';
import {ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {GameState,ItemStack} from '../core/types';
import {ItemDef,itemDef} from '../content/items';
import {InventoryFilter,InventorySort,recoveryAmount,transferAmount,transferError,visibleStacks} from '../core/inventory-view';
import {claimOverflowToBank,effectiveStats,usedSlots} from '../core/game';
import {ItemCard} from '../components/ItemCard';
import {ConfirmModal} from '../components/ConfirmModal';
import {EmptyState} from '../components/EmptyState';
import {GameButton} from '../components/GameButton';
import {Panel} from '../components/Panel';
import {C,spacing,typography} from '../theme/theme';
import {EquipmentPreview} from '../components/EquipmentPreview';
import {previewEquipment} from '../core/equipment-layers';

type Pending={kind:'sell'|'salvage'|'deposit';item:ItemDef;quantity:number}|null;
export function InventoryScreen({state,onEquip,onFood,onEat,onSell,onSalvage,onDeposit,onWithdraw,onOverflow}:{state:GameState;onEquip:(id:string)=>void;onFood:(id:string)=>void;onEat:(id:string)=>void;onSell:(id:string)=>void;onSalvage:(id:string)=>void;onDeposit:(id:string,quantity:number)=>void;onWithdraw:(id:string,quantity:number)=>void;onOverflow:()=>void}){
  const [pending,setPending]=useState<Pending>(null),[location,setLocation]=useState<'inventory'|'bank'>('inventory');
  const [query,setQuery]=useState(''),[filter,setFilter]=useState<InventoryFilter>('all'),[sort,setSort]=useState<InventorySort>('name');
  const [quantity,setQuantity]=useState<1|10|'all'>(1);
  const [error,setError]=useState('');
  const [previewId,setPreviewId]=useState<string|null>(null);
  const run=(action:()=>void)=>{try{action();setError('')}catch(e){setError(e instanceof Error?e.message:'Action failed. Please try again.')}};
  const confirm=()=>{if(!pending)return;run(()=>pending.kind==='deposit'?onDeposit(pending.item.id,pending.quantity):pending.kind==='sell'?onSell(pending.item.id):onSalvage(pending.item.id));setPending(null)};
  const stacks=visibleStacks(state[location].stacks,query,filter,sort);
  const renderStack=(stack:ItemStack)=>{
    const item=itemDef(stack.itemId),equippedId=item.slot?state.character?.equipment[item.slot]:undefined,carried=location==='inventory';
    const amount=transferAmount(stack.quantity,quantity),selectedFood=state.character?.equippedFoodId===item.id;
    return <ItemCard key={`${location}:${item.id}`} item={item} quantity={stack.quantity} equipped={equippedId?itemDef(equippedId):undefined} selectedFood={selectedFood} healAmount={recoveryAmount(state,item.id)} transferQuantity={amount} transferIssue={transferError(state,item.id,amount,location)}
      onPreview={item.type==='gear'?()=>run(()=>{previewEquipment(state,item.id);setPreviewId(item.id)}):undefined}
      onEquip={carried&&item.type==='gear'?()=>run(()=>onEquip(item.id)):undefined} onSelectFood={carried&&item.type==='food'?()=>run(()=>onFood(item.id)):undefined} onEat={carried&&item.type==='food'?()=>run(()=>onEat(item.id)):undefined}
      onSell={carried&&item.value>0?()=>setPending({kind:'sell',item,quantity:1}):undefined} onSalvage={carried&&item.salvage?()=>setPending({kind:'salvage',item,quantity:1}):undefined}
      onDeposit={carried?()=>selectedFood?setPending({kind:'deposit',item,quantity:amount}):run(()=>onDeposit(item.id,amount)):undefined} onWithdraw={!carried?()=>run(()=>onWithdraw(item.id,amount)):undefined}/>;
  };
  const foodWarning=pending?.item.id===state.character?.equippedFoodId?' This is your selected auto-eat food. Only food carried in Inventory can be consumed in combat.':'';
  const message=pending?.kind==='sell'?`Sell 1 for ${pending.item.value} gold. This cannot be undone.${foodWarning}`:pending?.kind==='deposit'?`Move ${pending.quantity}× ${pending.item.name} to Bank?${foodWarning}`:pending?.item.salvage?`Destroy 1 item for ${pending.item.salvage.quantity}× ${itemDef(pending.item.salvage.itemId).name}.`:'';
  const remaining=claimOverflowToBank(state).overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  const overflowCount=state.overflow.stacks.reduce((sum,item)=>sum+item.quantity,0);
  return <><EquipmentPreview state={state} itemId={previewId} onClose={()=>setPreviewId(null)}/><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <Text style={s.h}>Equipment & Storage</Text>
    <Panel><Text style={s.title}>Recovery</Text><Text style={s.sub}>Health {state.character!.currentHp}/{effectiveStats(state).hp} · Auto-eat: {state.character?.equippedFoodId?itemDef(state.character.equippedFoodId).name:'None'}</Text><Text style={s.sub}>Carried auto-eat portions: {state.inventory.stacks.find(item=>item.itemId===state.character?.equippedFoodId)?.quantity??0}</Text></Panel>
    <View style={s.row}>{(['inventory','bank'] as const).map(value=><View style={s.flex} key={value}><GameButton title={`${value==='inventory'?'Inventory':'Bank'} ${usedSlots(state[value].stacks)}/${state[value].capacity}`} tone={location===value?'primary':'secondary'} onPress={()=>setLocation(value)}/></View>)}</View>
    <Text style={s.sub}>{location==='inventory'?'Carried items available during adventures.':'Bank materials are available for crafting, but food must be withdrawn for combat.'}</Text>
    <TextInput style={s.input} accessibilityLabel="Search stored items" placeholder="Search items…" placeholderTextColor={C.muted} value={query} onChangeText={setQuery}/>
    <ScrollView horizontal contentContainerStyle={s.row}>{(['all','gear','food','material'] as const).map(value=><GameButton key={value} title={value} tone={filter===value?'primary':'secondary'} onPress={()=>setFilter(value)}/>)}</ScrollView>
    <Text style={s.label}>SORT BY</Text><View style={s.row}>{(['name','quantity','value'] as const).map(value=><View style={s.flex} key={value}><GameButton title={value==='value'?'Unit value':value} tone={sort===value?'primary':'secondary'} onPress={()=>setSort(value)}/></View>)}</View>
    <Text style={s.label}>TRANSFER QUANTITY · SALES REMAIN ONE AT A TIME</Text><View style={s.row}>{([1,10,'all'] as const).map(value=><View key={value} style={s.flex}><GameButton title={String(value)} tone={quantity===value?'primary':'secondary'} onPress={()=>setQuantity(value)}/></View>)}</View>
    {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
    <Text style={s.sub}>{stacks.length} matching stacks · {Math.max(0,state[location].capacity-usedSlots(state[location].stacks))} free slots</Text>
    {stacks.length?stacks.map(renderStack):<><EmptyState title="No items to show" message="Try another storage tab or clear the search and category filter."/><GameButton title="Clear filters" tone="secondary" onPress={()=>{setQuery('');setFilter('all')}}/></>}
    {overflowCount>0&&<Panel><Text style={s.title}>Overflow Chest · {overflowCount} items</Text><Text style={s.warning}>Normal storage was full. Free Bank space to recover these items.</Text>{state.overflow.stacks.map((stack,index)=><Text key={`${stack.itemId}:${index}`} style={s.sub}>{stack.quantity}× {itemDef(stack.itemId).name}</Text>)}{state.overflow.expiresAtMs!==null&&<Text style={s.warning}>Recorded expiry: {new Date(state.overflow.expiresAtMs).toLocaleString()}</Text>}<GameButton title={`Move ${overflowCount-remaining} items to Bank`} disabled={remaining===overflowCount} onPress={()=>run(onOverflow)}/>{remaining>0&&<Text style={s.sub}>{remaining} items would remain; make more Bank space.</Text>}</Panel>}
  </ScrollView><ConfirmModal visible={pending!==null} title={`${pending?.kind==='deposit'?'Bank':pending?.kind==='sell'?'Sell':'Salvage'} ${pending?.item.name??'item'}?`} message={message} confirmLabel={pending?.kind==='deposit'?'Deposit':pending?.kind==='sell'?'Sell 1':'Salvage 1'} danger={pending?.kind!=='deposit'} onConfirm={confirm} onCancel={()=>setPending(null)}/></>;
}
const s=StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md},h:{...typography.hero,color:C.text},title:{...typography.title,color:C.text},sub:{...typography.body,color:C.muted},warning:{...typography.body,color:C.warning},label:{...typography.caption,color:C.accent,fontWeight:'900'},row:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},input:{minHeight:48,paddingHorizontal:spacing.md,borderRadius:10,borderWidth:1,borderColor:C.line,color:C.text,backgroundColor:C.panel,fontSize:16}});

import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameButton} from './GameButton';
import type {InventoryFilter,InventorySort} from '../core/inventory-view';
import {C,radii,spacing,typography} from '../theme/theme';

const FILTERS:{id:InventoryFilter;label:string}[]=[
 {id:'all',label:'All items'},{id:'gear',label:'Equipment'},{id:'tool',label:'Tools'},{id:'food',label:'Food'},{id:'potion',label:'Potions'},{id:'material',label:'Materials'},
];
const SORTS:{id:InventorySort;label:string}[]=[
 {id:'name',label:'Name'},{id:'quantity',label:'Quantity'},{id:'value',label:'Unit value'},{id:'favorite',label:'Favorites first'},
];

export function InventoryFilterSheet({visible,onClose,filter,onFilter,sort,onSort,quantity,onQuantity,resultCount,totalCount}:{visible:boolean;onClose:()=>void;filter:InventoryFilter;onFilter:(value:InventoryFilter)=>void;sort:InventorySort;onSort:(value:InventorySort)=>void;quantity:1|10|'all';onQuantity:(value:1|10|'all')=>void;resultCount:number;totalCount:number}){
 const active=filter==='all'?0:1;
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close inventory filters" onPress={onClose}/><View style={s.sheet}>
   <View style={s.header}><View style={s.flex}><Text style={s.title}>Bag Filters</Text><Text style={s.sub}>{resultCount} of {totalCount} stacks shown</Text></View>{active?<View style={s.badge}><Text style={s.badgeText}>{active} active</Text></View>:null}<Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={s.close}><Text style={s.closeText}>×</Text></Pressable></View>
   <ScrollView contentContainerStyle={s.content}>
    <Text style={s.section}>Item type</Text>
    <View style={s.options}>{FILTERS.map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected:filter===option.id}} onPress={()=>onFilter(option.id)} style={[s.option,filter===option.id&&s.optionActive]}><Text style={[s.optionText,filter===option.id&&s.optionTextActive]}>{filter===option.id?'✓ ':''}{option.label}</Text></Pressable>)}</View>
    <Text style={s.section}>Sort by</Text>
    <View style={s.options}>{SORTS.map(option=><Pressable key={option.id} accessibilityRole="button" accessibilityState={{selected:sort===option.id}} onPress={()=>onSort(option.id)} style={[s.option,sort===option.id&&s.optionActive]}><Text style={[s.optionText,sort===option.id&&s.optionTextActive]}>{sort===option.id?'✓ ':''}{option.label}</Text></Pressable>)}</View>
    <Text style={s.section}>Transfer quantity</Text>
    <Text style={s.sub}>Used when moving stacks between Inventory and Bank.</Text>
    <View style={s.options}>{([1,10,'all'] as const).map(value=><Pressable key={String(value)} accessibilityRole="button" accessibilityState={{selected:quantity===value}} onPress={()=>onQuantity(value)} style={[s.option,quantity===value&&s.optionActive]}><Text style={[s.optionText,quantity===value&&s.optionTextActive]}>{quantity===value?'✓ ':''}{value==='all'?'All':value}</Text></Pressable>)}</View>
   </ScrollView>
   <View style={s.footer}><View style={s.flex}><GameButton title="Reset" tone="secondary" onPress={()=>{onFilter('all');onSort('name');onQuantity(1)}}/></View><View style={s.flex}><GameButton title="Apply Filters" onPress={onClose}/></View></View>
  </View></View>
 </Modal>;
}

export function inventoryFilterLabel(value:InventoryFilter){return FILTERS.find(option=>option.id===value)?.label??'All items'}
export function inventorySortLabel(value:InventorySort){return SORTS.find(option=>option.id===value)?.label??'Name'}

const s=StyleSheet.create({
 backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'#0008'},sheet:{maxHeight:'82%',backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,borderTopLeftRadius:20,borderTopRightRadius:20,paddingBottom:12},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},flex:{flex:1},title:{...typography.title,color:C.text},sub:{...typography.caption,color:C.muted},badge:{paddingHorizontal:8,paddingVertical:5,borderRadius:12,backgroundColor:'#17364b'},badgeText:{color:'#a9dcf6',fontSize:10,fontWeight:'900'},close:{width:44,height:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md},closeText:{color:C.text,fontSize:24},content:{padding:spacing.md,gap:spacing.sm},section:{...typography.bodyStrong,color:C.text,marginTop:spacing.sm},options:{gap:6},option:{minHeight:48,justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},optionActive:{borderColor:C.accent,backgroundColor:'#29251c'},optionText:{color:C.muted,fontWeight:'700'},optionTextActive:{color:C.text,fontWeight:'900'},footer:{flexDirection:'row',gap:spacing.sm,paddingHorizontal:spacing.md,paddingTop:spacing.sm,borderTopWidth:1,borderTopColor:C.line}
});

import {useMemo,useState} from 'react';
import {FlatList,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import type {GameState} from '../core/types';
import type {EquipmentV2Role,EquipmentV2PieceDescriptor} from '../content/equipment-v2-catalog';
import {EQUIPMENT_V2_PIECES} from '../content/equipment-v2-catalog';
import {equipmentV2PreviewRoutesForItem} from '../core/equipment-crafting-v2-adapter';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** UNMOUNTED INTERNAL catalogue. A real player release additionally requires
 * item artworks, localization, authenticated recipes and the joint release gate.
 */
type TierFilter='all'|1|2|3|4;
type RoleFilter='all'|EquipmentV2Role;
const ROLE_NAMES:Record<EquipmentV2Role,string>={tank:'Tank',damage:'Damage',support:'Support'};
const SLOT_MARK:Record<string,string>={helmet:'H',chest:'C',gloves:'G',legs:'L',boots:'B',cape:'P',weapon:'W',offhand:'O',amulet:'A',ring:'R'};
function initialTier(level:number):TierFilter{
 return level>=40?4:level>=26?3:level>=12?2:1;
}
export function EquipmentCraftingV2CataloguePreview({state,onInspect}:{state:GameState;onInspect:(pieceId:string)=>void}){
 const C=useGameTheme(),s=useMemo(()=>style(C),[C]);
 const [tier,setTier]=useState<TierFilter>(()=>initialTier(state.character?.level??1));
 const [role,setRole]=useState<RoleFilter>('all');
 const [readyOnly,setReadyOnly]=useState(false);
 const [search,setSearch]=useState('');
 const entries=useMemo(()=>{
  const text=search.trim().toLocaleLowerCase();
  return EQUIPMENT_V2_PIECES.filter(piece=>(tier==='all'||piece.tier===tier)
   &&(role==='all'||piece.role===role)
   &&(!text||(piece.name+' '+piece.slot+' '+piece.role).toLocaleLowerCase().includes(text)))
   .map(piece=>{
    const routes=equipmentV2PreviewRoutesForItem(state,piece.id,'gather');
    const ready=routes.some(route=>route.ingredients.every(i=>i.owned>=i.required)
     &&route.characterLevel>=({1:2,2:12,3:26,4:40} as const)[route.tier]
     &&route.professionLevel>=({1:1,2:8,3:20,4:34} as const)[route.tier]
     &&route.goldAvailable>=({1:400,2:1500,3:6000,4:12000} as const)[route.tier]*.3);
    const smallest=routes.length?Math.min(...routes.map(route=>route.ingredients.filter(x=>x.owned<x.required).length)):0;
    return {piece,ready,missingTypes:smallest};
   }).filter(entry=>!readyOnly||entry.ready)
   .sort((a,b)=>Number(b.ready)-Number(a.ready)||a.piece.tier-b.piece.tier||a.piece.name.localeCompare(b.piece.name));
 },[search,tier,role,readyOnly,state]);
 const renderRow=({item}:{item:{piece:EquipmentV2PieceDescriptor;ready:boolean;missingTypes:number}})=>
  <Pressable onPress={()=>onInspect(item.piece.id)} accessibilityRole="button"
    accessibilityLabel={'Inspect '+item.piece.name+', tier '+item.piece.tier}
    style={({pressed})=>[s.item,pressed&&s.pressed]}>
   <View style={s.iconSlot} accessibilityLabel={item.piece.slot}><Text style={s.iconLetter}>{SLOT_MARK[item.piece.slot]}</Text></View>
   <View style={s.itemBody}>
    <Text numberOfLines={2} style={s.itemName}>{item.piece.name}</Text>
    <Text style={s.itemSub}>T{item.piece.tier} · {ROLE_NAMES[item.piece.role]} · {item.piece.slot}{item.piece.setId?' · Set':''}</Text>
    <Text style={[s.itemStatus,{color:item.ready?C.good:C.muted}]}>
     {item.ready?'Materials available · preview':item.missingTypes+' material types still needed'}
    </Text>
   </View>
   <Text style={s.chevron}>›</Text>
  </Pressable>;
 const filter=(label:string,selected:boolean,press:()=>void)=>
  <Pressable key={label} onPress={press} accessibilityRole="button" accessibilityState={{selected}}
   style={[s.chip,selected&&s.chipSelected]}><Text style={[s.chipText,selected&&s.chipTextSelected]}>{label}</Text></Pressable>;
 return <View style={s.root}>
  <Text style={s.title}>Crafting 2.0</Text>
  <Text style={s.subtitle}>INTERNAL PREVIEW · T1–T4 · No crafting or purchases enabled</Text>
  <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Search Equipment 2.0"
   placeholder="Search equipment..." placeholderTextColor={C.muted} style={s.search}/>
  <Text style={s.sectionTitle}>Tier</Text>
  <View style={s.filters}>{(['all',1,2,3,4] as const).map(t=>filter(t==='all'?'All':'T'+t,tier===t,()=>setTier(t)))}</View>
  <Text style={s.sectionTitle}>Role</Text>
  <View style={s.filters}>{(['all','tank','damage','support'] as const).map(r=>filter(r==='all'?'All':ROLE_NAMES[r],role===r,()=>setRole(r)))}</View>
  <Pressable accessibilityRole="checkbox" accessibilityState={{checked:readyOnly}} onPress={()=>setReadyOnly(x=>!x)}
   style={s.readyFilter}><Text style={s.readyCheck}>{readyOnly?'✓':'○'}</Text><Text style={s.readyText}>Materials ready only (preview)</Text></Pressable>
  <View style={s.countRow}><Text style={s.sectionTitle}>Equipment</Text><Text style={s.subtitle}>{entries.length} items</Text></View>
  <FlatList data={entries} renderItem={renderRow} keyExtractor={row=>row.piece.id}
   initialNumToRender={12} maxToRenderPerBatch={10} windowSize={7}
   keyboardShouldPersistTaps="handled" contentContainerStyle={s.list}
   ListEmptyComponent={<Text style={s.empty}>No items match these filters.</Text>}/>
 </View>;
}
function style(C:ThemeColors){return StyleSheet.create({
 root:{flex:1,padding:12,gap:9,backgroundColor:C.panel},title:{fontSize:19,fontWeight:'900',color:C.text},
 subtitle:{fontSize:11,color:C.muted},search:{minHeight:44,borderColor:C.line,borderWidth:1,borderRadius:10,paddingHorizontal:12,color:C.text,backgroundColor:C.panel2,fontSize:14},
 sectionTitle:{fontSize:12,fontWeight:'900',color:C.text},filters:{flexDirection:'row',flexWrap:'wrap',gap:6},
 chip:{minHeight:44,minWidth:44,paddingHorizontal:12,borderWidth:1,borderColor:C.line,borderRadius:8,justifyContent:'center',alignItems:'center',backgroundColor:C.panel2},
 chipSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},chipText:{color:C.muted,fontWeight:'800',fontSize:12},chipTextSelected:{color:C.text},
 readyFilter:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8},readyCheck:{fontSize:17,color:C.text},readyText:{fontSize:12,color:C.text,fontWeight:'700'},
 countRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},list:{gap:6,paddingBottom:24},
 item:{flexDirection:'row',gap:10,alignItems:'center',minHeight:70,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:10,padding:9},
 pressed:{opacity:.72},iconSlot:{width:46,height:46,borderWidth:1,borderColor:C.line,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:C.panel},
 iconLetter:{fontWeight:'900',fontSize:17,color:C.text},itemBody:{flex:1,minWidth:0,gap:3},
 itemName:{fontWeight:'900',fontSize:12,color:C.text},itemSub:{fontSize:11,color:C.muted},itemStatus:{fontSize:11},
 chevron:{color:C.muted,fontSize:20,paddingHorizontal:3},empty:{fontSize:12,color:C.muted,paddingVertical:20,textAlign:'center'}
});}

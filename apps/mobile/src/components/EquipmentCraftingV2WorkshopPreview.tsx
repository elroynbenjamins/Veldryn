import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import {equipmentV2PreviewRoutesForItem} from '../core/equipment-crafting-v2-adapter';
import {EquipmentCraftingV2CataloguePreview} from './EquipmentCraftingV2CataloguePreview';
import {EquipmentCraftingV2Preview} from './EquipmentCraftingV2Preview';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** Internal-only TWO SCREEN flow. Deliberately not mounted on live Skills,
 * Inventory, account or navigation. Preview buttons cannot craft, buy or claim.
 */
export function EquipmentCraftingV2WorkshopPreview({state}:{state:GameState}){
 const C=useGameTheme(),styles=useMemo(()=>StyleSheet.create({
  root:{flex:1,backgroundColor:C.panel},back:{minHeight:48,flexDirection:'row',alignItems:'center',gap:6,
   borderBottomWidth:1,borderBottomColor:C.line,paddingHorizontal:12},
  backText:{color:C.text,fontSize:13,fontWeight:'900' as const},
 }),[C]);
 const [inspecting,setInspecting]=useState<string|null>(null);
 const variants=useMemo(()=>inspecting?equipmentV2PreviewRoutesForItem(state,inspecting,'gather'):[],[state,inspecting]);
 if(!inspecting)return <View style={styles.root}><EquipmentCraftingV2CataloguePreview state={state} onInspect={setInspecting}/></View>;
 return <View style={styles.root}>
  <Pressable accessibilityRole="button" accessibilityLabel="Back to Equipment 2.0 catalogue"
   onPress={()=>setInspecting(null)} style={styles.back}>
   <Text style={styles.backText}>‹ Back to equipment</Text>
  </Pressable>
  <EquipmentCraftingV2Preview variants={variants}/>
 </View>;
}

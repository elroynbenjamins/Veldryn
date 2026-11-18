import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';
import type {EquipmentV2RecipePreviewInput} from '../core/equipment-crafting-v2-screen';
import {equipmentV2HiddenRecipeScreen} from '../core/equipment-crafting-v2-screen';
import type {V2PreparationResult} from '../core/equipment-crafting-v2-preparation';

/** Internal-only read-only preview; deliberately unmounted from every player route.
 * No crafting, currency, inventory or Market mutations exist in this component.
 */
export interface EquipmentCraftingV2PreviewVariant extends EquipmentV2RecipePreviewInput{
 key:string;methodName:string;recommended?:boolean;
 preparation?:V2PreparationResult;
 setBonuses?:readonly {pieces:number;description:string}[];
}
type Tab='materials'|'outcomes';
const format=(value:number)=>Math.round(value).toLocaleString('en-US');
const duration=(seconds:number)=>{const minutes=Math.ceil(seconds/60);return minutes<60?minutes+'m':Math.floor(minutes/60)+'h '+minutes%60+'m';};
function nextStep(action:ReturnType<typeof equipmentV2HiddenRecipeScreen>['action']){
 switch(action){
  case 'craft':return 'Materials ready — crafting unavailable in preview';
  case 'unlock':return 'View level or profession requirements';
  case 'prepare_components':return 'Prepare missing components';
  case 'find_materials':return 'Gather or find missing materials';
  case 'review_market_purchase':return 'Review verified market listing purchases';
  case 'obtain_gold':return 'Earn more Gold';
  case 'free_queue_slot':return 'Free a crafting slot';
 }
}
export function EquipmentCraftingV2Preview({variants}:{variants:readonly EquipmentCraftingV2PreviewVariant[]}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const [methodId,setMethodId]=useState(''),[tab,setTab]=useState<Tab>('materials');
 const method=variants.find(row=>row.key===methodId)??variants.find(row=>row.recommended)??variants[0];
 if(!method)return null;
 const preview=equipmentV2HiddenRecipeScreen(method);
 const stats=([['ATK',preview.baseStats.attack],['DEF',preview.baseStats.defense],['HP',preview.baseStats.hp]] as const).filter(([,n])=>n>0);
 return <ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" accessibilityLabel="Equipment 2.0 internal crafting preview">
  <View style={s.header}>
   <View style={s.heading}>
    <Text style={s.eyebrow}>INTERNAL DESIGN PREVIEW · T{method.tier}</Text>
    <Text style={s.title}>{method.name}</Text>
    <Text style={s.subtle}>{method.slot.toUpperCase()} · {method.setPiece?'SET PIECE':method.equipClass?'CLASS ARMAMENT':'STANDALONE'}</Text>
    {method.equipClass?<Text style={s.subtle}>Equippable: {method.equipClass.replace(/_/g,' ')}</Text>:null}
   </View>
   <View style={s.itemBadge}><Text style={s.itemBadgeText}>T{method.tier}</Text></View>
  </View>
  <View style={s.stats}>
   {stats.map(([label,value])=><View key={label} style={s.stat}>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={s.statValue}>{format(value)}</Text>
   </View>)}
  </View>
  <Text style={s.note}>Preview base stats at Q{method.quality??50}; rarity is not pre-rolled. Actual item stats must come from the authoritative craft receipt.</Text>
  <View style={s.summary}>
   <View style={s.summaryCell}><Text style={s.statLabel}>ASSEMBLY GOLD</Text><Text style={s.summaryValue}>{format(preview.cost.assemblyGold)}</Text></View>
   <View style={s.summaryCell}><Text style={s.statLabel}>BASE XP</Text><Text style={s.summaryValue}>+{format(preview.draftXp)}</Text></View>
   <View style={s.summaryCell}><Text style={s.statLabel}>CRAFT TIME</Text><Text style={s.summaryValue}>{method.craftSeconds?duration(method.craftSeconds):'—'}</Text></View>
  </View>
  <Text style={s.note}>Known Gold subtotal: {format(method.preparation?.knownGoldSubtotal??preview.cost.knownGold)}
   {' '}({format(preview.cost.assemblyGold)} assembly + {format(method.preparation?.processingGold??0)} planned processing).
   {method.preparation?.requiresExternalSources?' External materials must still be gathered or purchased.':''}
   {' '}No speculative Market prices are included.</Text>
  {variants.length>1?<View style={s.section}>
   <Text style={s.sectionTitle}>Crafting method</Text>
   <View style={s.segmentRow}>
    {variants.map(row=><Pressable key={row.key} accessibilityRole="button" accessibilityState={{selected:method.key===row.key}}
      onPress={()=>setMethodId(row.key)} style={[s.segment,method.key===row.key&&s.selected]}>
     <Text style={[s.segmentText,method.key===row.key&&s.selectedText]}>{row.methodName}{row.recommended?' · Suggested':''}</Text>
    </Pressable>)}
   </View>
   <Text style={s.note}>Methods use different materials but do not alter the finished item's rarity or quality odds.</Text>
  </View>:null}
  <View style={s.segmentRow}>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='materials'}} onPress={()=>setTab('materials')} style={[s.segment,tab==='materials'&&s.selected]}>
    <Text style={[s.segmentText,tab==='materials'&&s.selectedText]}>Materials</Text>
   </Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:tab==='outcomes'}} onPress={()=>setTab('outcomes')} style={[s.segment,tab==='outcomes'&&s.selected]}>
    <Text style={[s.segmentText,tab==='outcomes'&&s.selectedText]}>Possible results</Text>
   </Pressable>
  </View>
  {tab==='materials'?<View style={s.section}>
    <View style={s.row}><Text style={s.sectionTitle}>Requirements</Text><Text style={s.subtle}>Owned / Required</Text></View>
    {preview.source.ingredients.map(row=><View key={row.itemId} style={s.material}>
      <View style={s.heading}>
       <Text style={s.materialName}>{row.itemId.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</Text>
       {row.gatherOrProcess>0?<Text style={s.subtle}>Need {row.gatherOrProcess} more</Text>:null}
      </View>
      <View style={s.amountWrap}>
       <Text style={[s.amount,{color:row.missing?C.warning:C.good}]}>{row.owned} / {row.required}</Text>
       <Text accessibilityLabel={row.missing?'Missing material':'Material ready'} style={{color:row.missing?C.warning:C.good}}>{row.missing?'!':'✓'}</Text>
      </View>
    </View>)}
    {method.preparation?<View style={s.footerInfo}>
      <Text style={s.sectionTitle}>Prerequisite preparation</Text>
      <View style={s.row}><Text style={s.body}>Processing Gold</Text><Text style={s.body}>{format(method.preparation.processingGold)}</Text></View>
      <View style={s.row}><Text style={s.body}>Processing time (sequential)</Text><Text style={s.body}>{duration(method.preparation.processingSeconds)}</Text></View>
      {method.preparation.steps.map(step=><View key={step.recipeId} style={s.material}>
       <View style={s.heading}>
        <Text style={s.materialName}>{step.name} ×{step.batches}</Text>
        <Text style={s.subtle}>{step.skillId} · {format(step.gold)} Gold</Text>
       </View>
       <Text style={s.amount}>+{format(step.xp)} XP</Text>
      </View>)}
      {!!method.preparation.shortages.length&&<View style={s.footerInfo}>
       <Text style={s.sectionTitle}>Materials still to obtain</Text>
       {method.preparation.shortages.map(item=><Text key={item.itemId} style={s.note}>
        {item.quantity} × {item.itemId.replace(/_/g,' ')}
        {item.reason==='recipe_locked'?' · recipe locked':item.reason==='recipe_cycle'?' · dependency cycle':' · gather or buy'}
       </Text>)}
      </View>}
      <Text style={s.note}>Preparation costs and XP assume the listed crafts are performed.
       Materials already owned are not double-counted. Recipes requiring unlocks or external stock are shown as incomplete.</Text>
     </View>:null}
    <View style={s.footerInfo}>
     <Text style={s.sectionTitle}>Next step</Text>
     <Text style={s.body}>{nextStep(preview.action)}</Text>
     <Text style={s.note}>Market actions and live Forge settlement are disabled for this preview.</Text>
    </View>
   </View>:<View style={s.section}>
    <Text style={s.sectionTitle}>Published draft crafting odds</Text>
    {preview.rarityOutcomes.map(row=><View key={row.rarity} style={s.material}>
     <Text style={s.materialName}>{row.rarity.slice(0,1).toUpperCase()+row.rarity.slice(1)}</Text>
     <View style={s.amountWrap}>
      <Text style={s.amount}>{Number((row.chance*100).toFixed(2))}%</Text>
      <Text style={s.subtle}>{row.affixes} {row.affixes===1?'affix':'affixes'}</Text>
     </View>
    </View>)}
    <Text style={s.note}>Quality is independent (Q0–Q100). Affix values use tier-specific ranges and rarity bands; exact results are never preview-rolled.</Text>
   </View>}
  {!!method.setBonuses?.length&&<View style={s.section}>
   <Text style={s.sectionTitle}>Set bonuses</Text>
   {method.setBonuses.map(bonus=><Text key={bonus.pieces} style={s.body}>{bonus.pieces} pieces · {bonus.description}</Text>)}
  </View>}
  <View style={s.disabledFooter}>
   <Text style={s.disabledTitle}>Crafting 2.0 not released</Text>
   <Text style={s.note}>This preview never spends Gold, produces equipment, enters the queue or buys Market supplies.</Text>
  </View>
 </ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 root:{padding:12,paddingBottom:30,gap:12,backgroundColor:C.panel},
 header:{flexDirection:'row',alignItems:'center',gap:10},heading:{flex:1,minWidth:0,gap:3},
 eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1,color:C.muted},title:{fontSize:18,fontWeight:'900',color:C.text},
 subtle:{fontSize:11,color:C.muted},itemBadge:{width:58,height:58,backgroundColor:C.panel2,borderWidth:1,borderColor:C.line,borderRadius:10,justifyContent:'center',alignItems:'center'},
 itemBadgeText:{fontSize:22,fontWeight:'900',color:C.text},
 stats:{flexDirection:'row',gap:8,flexWrap:'wrap'},stat:{flex:1,minWidth:85,padding:10,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 statLabel:{fontSize:10,fontWeight:'800',letterSpacing:.3,color:C.muted},statValue:{fontSize:18,fontWeight:'900',color:C.text},
 note:{fontSize:11,color:C.muted,lineHeight:16},
 summary:{flexDirection:'row',gap:7,flexWrap:'wrap'},summaryCell:{flex:1,minWidth:85,padding:10,borderRadius:9,backgroundColor:C.panel2},
 summaryValue:{fontSize:14,fontWeight:'900',color:C.text},
 section:{padding:12,borderWidth:1,borderColor:C.line,borderRadius:11,backgroundColor:C.panel2,gap:10},
 sectionTitle:{fontSize:13,color:C.text,fontWeight:'900'},
 segmentRow:{flexDirection:'row',gap:8},segment:{flex:1,minHeight:44,justifyContent:'center',alignItems:'center',paddingHorizontal:8,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:9},
 selected:{backgroundColor:C.selection,borderColor:C.selectionLine},segmentText:{fontSize:12,color:C.muted,fontWeight:'800',textAlign:'center'},
 selectedText:{color:C.text},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
 material:{flexDirection:'row',alignItems:'center',minHeight:44,gap:8,paddingVertical:4,borderTopColor:C.line,borderTopWidth:1},
 materialName:{fontSize:12,fontWeight:'700',color:C.text},amountWrap:{flexDirection:'row',alignItems:'center',gap:8},
 amount:{fontSize:12,color:C.text,fontWeight:'900'},footerInfo:{gap:4,paddingTop:8,borderTopWidth:1,borderTopColor:C.line},
 body:{fontSize:12,color:C.text},disabledFooter:{padding:12,gap:4,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 disabledTitle:{fontSize:12,color:C.muted,fontWeight:'800'}
});}

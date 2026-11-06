import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {GameState} from '../core/types';
import {RECIPES,type Recipe} from '../content/skills';
import {itemDef} from '../content/items';
import {localizedItemName} from '../i18n/starter-item-names';
import {alchemyAvailability} from '../core/alchemy';
import {processingRunCapacity} from '../core/processing';
import {offlineCapSeconds} from '../core/game';
import {professionActionPace} from '../core/profession-action-pace';
import {potionDef,POTION_TIER_UNLOCK_LEVELS} from '../content/alchemy';
import {mealBonusDef} from '../core/meal-buffs';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {ItemArtwork} from './ItemArtwork';
import {IngredientList} from './IngredientList';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Skill='cooking'|'alchemy';
type Props={state:GameState;skillId:Skill;preferredRecipeId?:string;onStart:(id:string)=>Promise<unknown>};

const categories={
 cooking:['Fish','Meals','Special'] as const,
 alchemy:['Healing','Tonics','Infusions'] as const,
};
function categoryOf(recipe:Recipe):string{
 if(recipe.skillId==='cooking'){
   if(['COOK_IRONWOOD_STEW','COOK_ASHLANDS_EMBER_STEW'].includes(recipe.id))return 'Meals';
   if(['COOK_GLASSFIN_FEAST','COOK_ICEFISH','COOK_EMBERFIN'].includes(recipe.id))return 'Special';
   return 'Fish';
 }
 const def=potionDef(recipe.output.itemId);
 return !def?'Infusions':def.effect.kind==='healing'?'Healing':'Tonics';
}
function timeLabel(seconds:number){
 const n=Math.max(0,Math.ceil(seconds));
 return n>=3600?Math.floor(n/3600)+'h '+Math.ceil(n%3600/60)+'m':n>=60?Math.floor(n/60)+'m '+(n%60?n%60+'s':''):n+'s';
}

/** Compact, one-tap Cooking/Alchemy. Only commands reserve materials; previews never mutate game state. */
export function ConsumableWorkshop({state,skillId,preferredRecipeId,onStart}:Props){
 const C=useGameTheme(),{gt,gl,language}=useGameplayText(),{width,fontScale}=useWindowDimensions();
 // Generate player-facing benefits from the same values used by combat and crafting.
 // Do not translate potion IDs, recipe IDs, or player-provided text.
 const itemName=(itemId:string)=>localizedItemName(language,itemId);
 const benefit=(recipe:Recipe):string=>{
  const output=itemDef(recipe.output.itemId);
  if(recipe.skillId==='cooking')return gt('Restores {hp} HP per food',{hp:output.heal??0});
  const potion=potionDef(recipe.output.itemId);
  if(!potion)return gl(output.passive??'Equipment infusion material');
  const effect=potion.effect;
  if(effect.kind==='healing')return gt('Restores {percent}% maximum HP in boss fights or between dungeon rooms.',{percent:Math.round(effect.maxHpFraction*100)});
  const count=effect.encounters;
  if(effect.healingStrengthFraction>0||effect.shieldStrengthFraction>0)
   return gt('+{damage}% damage · +{strength}% healing and shielding for {count} ordinary encounters.',{damage:Math.round(effect.damageDealtFraction*100),strength:Math.round(effect.healingStrengthFraction*100),count});
  if(effect.damageReductionFraction>0)
   return gt('Takes {percent}% less damage for {count} ordinary encounters.',{percent:Math.round(effect.damageReductionFraction*100),count});
  return gt('Deals {percent}% more damage for {count} ordinary encounters.',{percent:Math.round(effect.damageDealtFraction*100),count});
 };
 const all=useMemo(()=>RECIPES.filter(r=>r.skillId===skillId&&!r.noviceSetId).sort((a,b)=>a.level-b.level),[skillId]);
 const groups=categories[skillId],preferred=all.find(r=>r.id===preferredRecipeId);
 const [category,setCategory]=useState<string>(preferred?categoryOf(preferred):groups[0]);
 const [readyOnly,setReadyOnly]=useState(false),[detailId,setDetailId]=useState<string|null>(preferred?.id??null);
 const [pendingId,setPendingId]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const busyRef=useRef(false);
 const activity=state.activity,activeId=activity?.kind==='alchemy'?activity.targetId:activity?.kind==='processing'&&activity.processing?.skillId==='cooking'?activity.targetId:undefined;
 const skillLevel=state.skills.find(sk=>sk.skillId===skillId)?.level??1;
 const afkCap=offlineCapSeconds(state);
 const capacities=useMemo(()=>all.map(recipe=>{
  const r=recipe;
  let capacity=0;
  try{
   const cycle=professionActionPace(state,r,'batch').cycleSeconds;
   const timeCount=Math.floor(afkCap/cycle);
   if(skillId==='alchemy'){const a=alchemyAvailability(state,r.id);capacity=a.ready?Math.max(0,Math.min(timeCount,a.maxBatches)):0;}
   else capacity=processingRunCapacity(state,r.id,afkCap,true).availableBatches;
  }catch{capacity=0;}
  return [r.id,capacity] as const;
 }),[all,state,skillId,afkCap]);
 const counts=new Map(capacities);
 const count=(recipe:Recipe)=>counts.get(recipe.id)??0;
 const recipes=all.filter(r=>categoryOf(r)===category&&(!readyOnly||(r.level<=skillLevel&&count(r)>0)));
 const detail=all.find(r=>r.id===detailId);
 const submit=async(id:string)=>{
  if(busyRef.current)return;
  busyRef.current=true;setBusy(true);setError('');
  try{await onStart(id);setPendingId(null);setDetailId(null);}
  catch(e){setError(e instanceof Error?e.message:gt('Action failed. Please try again.'));}
  finally{busyRef.current=false;setBusy(false);}
 };
 const start=(recipe:Recipe)=>{
  if(busyRef.current||recipe.id===activeId)return;
  setError('');
  if(activity){setDetailId(null);setPendingId(recipe.id);return;}
  if(count(recipe)<1){setDetailId(recipe.id);return;}
  void submit(recipe.id);
 };
 const selected=all.find(r=>r.id===pendingId);
 const regionVariant=(recipe:Recipe)=>recipe.id.endsWith('_SUNSCAR')?'Sunscar':recipe.id.endsWith('_FROSTMARCH')?'Frostmarch':recipe.id.endsWith('_ASHLANDS')?'Ashlands':undefined;
 const mobile=width<360||fontScale>=1.35;
 /** Potion tiers are visual section breaks inside the existing Alchemy categories, not tabs. */
 const potionList=skillId==='alchemy'&&category!=='Infusions';
 const renderPotionRow=(recipe:Recipe)=>{
  const available=count(recipe),isActive=activeId===recipe.id,locked=recipe.level>skillLevel;
  return <View key={recipe.id} style={[s.potionRow,{borderColor:isActive?C.good:C.line,backgroundColor:C.panel}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={itemName(recipe.output.itemId)+'. '+benefit(recipe)+'. '+gt('Show recipe details')} onPress={()=>setDetailId(recipe.id)} style={({pressed})=>[s.potionRowMain,pressed&&{opacity:.72}]}>
      <ItemArtwork itemId={recipe.output.itemId} size={44}/>
      <View style={s.potionRowCopy}>
        <Text style={[s.name,{color:C.text}]} numberOfLines={1}>{itemName(recipe.output.itemId)}{regionVariant(recipe)?' · '+regionVariant(recipe):''}</Text>
        <Text style={[s.caption,{color:C.muted}]} numberOfLines={2}>{benefit(recipe)}</Text>
        <Text style={[s.ready,{color:isActive||available?C.good:C.warning}]}>{isActive?'● '+gt('Active'):locked?gt('Locked'):available?available+' '+gt('batches'):gt('Needs materials')}</Text>
      </View>
      <View style={s.potionRowSide}>
        <Text style={[s.tier,{color:locked?C.warning:C.muted}]}>{gt('Lv {level}',{level:recipe.level})}</Text>
        <Text style={[s.caption,{color:C.info}]}>ⓘ {gt('Details')}</Text>
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={itemName(recipe.output.itemId)+' · '+gt('Start Brewing')} accessibilityState={{disabled:busy||isActive||available<1}} disabled={busy||isActive||available<1} onPress={()=>start(recipe)} style={[s.potionRowBrew,{borderTopColor:C.line,backgroundColor:available>0&&!isActive?C.selection:C.panel2}]}>
      <Text style={[s.bold,{color:available>0&&!isActive?C.text:C.muted}]}>{isActive?gt('Active'):locked?gt('Locked'):available>0?gt('Start Brewing'):gt('Needs materials')}</Text>
    </Pressable>
  </View>;
 };
 return <View style={s.root}>
  {activeId?<View style={[s.active,{backgroundColor:C.goodSurface,borderColor:C.good}]}>
    <View style={s.line}><Text style={[s.bold,{color:C.good}]}>{gt('Crafting')} · {gt('Active')}</Text></View>
    <Text style={[s.name,{color:C.text}]}>{all.find(r=>r.id===activeId)?itemName(all.find(r=>r.id===activeId)!.output.itemId):activeId}</Text>
    <Text style={[s.caption,{color:C.muted}]}>{(activity?.kind==='alchemy'?activity?.brew?.remainingBatches:activity?.processing?.remainingBatches)??0} {gt('batches')} {gt('reserved')} · {gt('Continue until resources or AFK time run out')}</Text>
    <Text style={[s.caption,{color:C.muted}]}>{gt('Use the main Activity bar to stop or claim production.')}</Text>
  </View>:null}
  <View style={s.line}><Text style={[s.title,{color:C.text}]}>{gt('Recipes')}</Text><Pressable accessibilityRole="checkbox" accessibilityState={{checked:readyOnly}} onPress={()=>setReadyOnly(x=>!x)} style={[s.toggle,{borderColor:C.line,backgroundColor:readyOnly?C.selection:C.panel2}]}><Text style={[s.caption,{color:C.text}]}>{readyOnly?'✓ ':''}{gt('Craftable only')}</Text></Pressable></View>
  <View style={s.categories}>{groups.map(g=><Pressable key={g} accessibilityRole="tab" accessibilityState={{selected:category===g}} onPress={()=>{setCategory(g);setDetailId(null)}} style={[s.category,{borderColor:category===g?C.selectionLine:C.line,backgroundColor:category===g?C.selection:C.panel2}]}><Text style={[s.categoryText,{color:category===g?C.text:C.muted}]}>{gt(g as 'Fish'|'Meals'|'Special'|'Healing'|'Tonics'|'Infusions')}</Text></Pressable>)}</View>
  {potionList?<View style={s.potionList}>
    {([1,2,3] as const).map(tier=>{
      const rows=recipes.filter(recipe=>potionDef(recipe.output.itemId)?.tier===tier);
      return rows.length?<View key={tier} style={s.potionTierGroup}>
        <View style={s.potionTierHeading}>
          <Text style={[s.potionTierTitle,{color:C.text}]}>T{tier} {gt('Potions')}</Text>
          <View style={[s.potionTierDivider,{backgroundColor:C.line}]}/>
          <Text style={[s.caption,{color:C.muted}]}>{gt('Lv {level}',{level:POTION_TIER_UNLOCK_LEVELS[tier]})}+</Text>
        </View>
        {rows.map(renderPotionRow)}
      </View>:null;
    })}
  </View>:  <View style={s.grid}>{recipes.map(recipe=>{
    const available=count(recipe),isActive=activeId===recipe.id,meal=mealBonusDef(recipe.output.itemId);
    return <View key={recipe.id} style={[s.tile,{width:mobile?'100%':'48.7%',borderColor:isActive?C.good:C.line,backgroundColor:C.panel}]}>
     <Pressable accessibilityRole="button" accessibilityLabel={itemName(recipe.output.itemId)+'. '+benefit(recipe)+'. '+(isActive?gt('Active'):available?gt('Tap to start'):gt('Requirements missing'))} accessibilityState={{disabled:busy||isActive}} disabled={busy||isActive} onPress={()=>start(recipe)} style={({pressed})=>[s.tileTap,pressed&&{opacity:.7}]}>
      <View style={s.line}><ItemArtwork itemId={recipe.output.itemId} size={48}/><Text style={[s.tier,{color:recipe.level>skillLevel?C.warning:C.muted}]}>{gt('Lv {level}',{level:recipe.level})}</Text></View>
      <Text style={[s.name,{color:C.text}]} numberOfLines={2}>{itemName(recipe.output.itemId)}</Text>
      <Text style={[s.caption,{color:C.muted}]} numberOfLines={2}>{benefit(recipe)}</Text>
      {meal?<Text style={[s.buff,{color:C.good}]} numberOfLines={2}>{meal.label} · {meal.durationHours}h</Text>:null}
      <Text style={[s.ready,{color:isActive||available?C.good:C.warning}]}>{isActive?'● '+gt('Active'):available?'▶ '+available+' '+gt('batches'):recipe.level>skillLevel?gt('Locked'):gt('Needs materials')}</Text>
     </Pressable>
     <Pressable accessibilityRole="button" accessibilityLabel={gt('Show recipe details')} onPress={()=>setDetailId(x=>x===recipe.id?null:recipe.id)} style={[s.info,{borderTopColor:C.line}]}><Text style={[s.caption,{color:C.muted}]}>ⓘ {gt('Details')}</Text></Pressable>
    </View>;
   })}
  </View>}
  {!recipes.length?<Text style={[s.caption,{color:C.muted}]}>{gt('No recipes available.')}</Text>:null}
  <GameModalSurface visible={!!detail} reduceMotion={state.settings.reduceMotion} onClose={()=>setDetailId(null)} surfaceStyle={s.detailModal}>
    {detail?<>
      <GameModalHeader title={itemName(detail.output.itemId)+(regionVariant(detail)?' · '+regionVariant(detail):'')} onClose={()=>setDetailId(null)} closeDisabled={busy}/>
      <ScrollView style={s.detailScroll} contentContainerStyle={s.detailContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
        <View style={s.line}><ItemArtwork itemId={detail.output.itemId} size={52}/><Text style={[s.caption,{color:C.good,flex:1}]}>{benefit(detail)}</Text></View>
        {mealBonusDef(detail.output.itemId)?<Text style={[s.buff,{color:C.good}]}>{mealBonusDef(detail.output.itemId)!.label} · {mealBonusDef(detail.output.itemId)!.durationHours}h · {gt('Eat for Bonus in Inventory')}</Text>:null}
        <Text style={[s.caption,{color:C.muted}]}>{gt('Per batch')}: {detail.output.quantity} {gt('items')} · {detail.gold} {gt('Gold')} · {timeLabel(professionActionPace(state,detail,'batch').cycleSeconds)}</Text>
        <Text style={[s.caption,{color:C.muted}]}>{gt('Maximum production')}: {count(detail)} {gt('batches')} · {count(detail)*detail.output.quantity} {gt('items')} · {count(detail)*detail.gold} {gt('Gold')}</Text>
        <IngredientList inputs={detail.inputs.map(r=>({...r,inventory:state.inventory.stacks.filter(s=>s.itemId===r.itemId).reduce((n,s)=>n+s.quantity,0),bank:state.bank.stacks.filter(s=>s.itemId===r.itemId).reduce((n,s)=>n+s.quantity,0)}))} numberMode={state.settings.numberMode} showStorage/>
        {skillId==='alchemy'&&potionDef(detail.output.itemId)?.effect.kind==='healing'?<Text style={[s.caption,{color:C.info}]}>{gt('Healing potions work in boss fights and between dungeon rooms. Food is disabled there. Choose a potion from the HP menu.')}</Text>:null}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityState={{disabled:busy||count(detail)<1||activeId===detail.id}} disabled={busy||count(detail)<1||activeId===detail.id} onPress={()=>start(detail)} style={[s.primary,{backgroundColor:C.accent,opacity:busy||count(detail)<1?.5:1}]}><Text style={[s.bold,{color:C.panel}]}>{activeId===detail.id?gt('Active'):skillId==='cooking'?gt('Start Cooking'):gt('Start Brewing')}</Text></Pressable>
      {error?<Text accessibilityRole="alert" style={[s.caption,{color:C.bad}]}>{error}</Text>:null}
    </>:null}
  </GameModalSurface>
  {selected?<View style={[s.detail,{borderColor:C.warning,backgroundColor:C.panel2}]}>
    <Text style={[s.title,{color:C.text}]}>{gt('Switch activity?')}</Text>
    <Text style={[s.caption,{color:C.muted}]}>{gt('Starting a new activity settles the current one and safely refunds any unfinished reserved batches.')}</Text>
    <Text style={[s.name,{color:C.text}]}>{itemName(selected.output.itemId)}</Text>
    {count(selected)===0?<Text style={[s.caption,{color:C.warning}]}>{gt('Check ingredients and Gold after switching; the server will reject an unaffordable run without replacing your current activity.')}</Text>:null}
    <View style={s.line}><Pressable accessibilityRole="button" onPress={()=>setPendingId(null)} style={[s.secondary,{borderColor:C.line}]}><Text style={[s.bold,{color:C.text}]}>{gt('Cancel')}</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void submit(selected.id)} style={[s.secondary,{borderColor:C.good,backgroundColor:C.goodSurface}]}><Text style={[s.bold,{color:C.good}]}>{gt('Switch')}</Text></Pressable></View>
  </View>:null}
  {error?<Text accessibilityRole="alert" style={[s.caption,{color:C.bad}]}>{error}</Text>:null}
  <Text style={[s.caption,{color:C.muted}]}>{gt('Tap a recipe to start continuous production. Batches are reserved up to the AFK limit, available ingredients and Gold.')}</Text>
 </View>;
}
const s=StyleSheet.create({
 root:{gap:12},line:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},title:{fontSize:17,fontWeight:'800',lineHeight:22},name:{fontSize:13,fontWeight:'800',lineHeight:18},bold:{fontSize:12,fontWeight:'800'},caption:{fontSize:11,lineHeight:16},tier:{fontSize:11,fontWeight:'800'},ready:{fontSize:11,fontWeight:'800',marginTop:4},buff:{fontSize:11,fontWeight:'800',lineHeight:16},toggle:{borderWidth:1,borderRadius:8,paddingHorizontal:10,minHeight:38,justifyContent:'center'},
 categories:{flexDirection:'row',gap:6},category:{flex:1,minWidth:0,minHeight:44,borderWidth:1,borderRadius:8,justifyContent:'center',alignItems:'center',paddingHorizontal:4},categoryText:{fontSize:11,fontWeight:'800'},
 potionList:{gap:14},potionTierGroup:{gap:7},potionTierHeading:{minHeight:28,flexDirection:'row',alignItems:'center',gap:8},potionTierTitle:{fontSize:12,fontWeight:'900',letterSpacing:.6},potionTierDivider:{height:1,flex:1},
 potionRow:{borderWidth:1,borderRadius:11,overflow:'hidden'},potionRowMain:{minHeight:72,flexDirection:'row',alignItems:'center',gap:10,padding:10},potionRowCopy:{flex:1,minWidth:0,gap:3},potionRowSide:{minWidth:54,alignItems:'flex-end',alignSelf:'stretch',justifyContent:'space-between'},potionRowBrew:{minHeight:38,borderTopWidth:1,alignItems:'center',justifyContent:'center'},
 grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:8},tile:{borderWidth:1,borderRadius:11,overflow:'hidden'},tileTap:{minHeight:160,padding:11,gap:5},info:{minHeight:38,borderTopWidth:1,justifyContent:'center',alignItems:'center'},detail:{borderWidth:1,borderRadius:11,padding:12,gap:10},detailModal:{maxHeight:'86%'},detailScroll:{flexGrow:0,flexShrink:1},detailContent:{gap:10,paddingBottom:8},primary:{minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:8},
 secondary:{minHeight:44,flex:1,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8},active:{borderWidth:1,borderRadius:11,padding:12,gap:5}
});

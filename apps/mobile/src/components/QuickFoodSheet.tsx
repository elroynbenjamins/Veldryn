import {useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {ActiveActivity,GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {effectiveStats} from '../core/game';
import {displayStat} from '../core/stat-display';
import {foodHealingAmount,recoveryAmount} from '../core/inventory-view';
import {MAX_FOOD_BACKUPS} from '../core/food-queue';
import {huntGoalIdFromSnapshot} from '../core/hunt-goals';
import {itemDef} from '../content/items';
import {potionDef} from '../content/alchemy';
import {useGameplayText} from '../i18n/gameplay';
import {accountText} from '../i18n/account';
import {useGameTheme} from '../theme/ThemeContext';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';
import {ItemArtwork} from './ItemArtwork';

const displayHealHp=(value:number)=>displayStat(Math.max(0,Math.round(value)));

export function QuickFoodSheet({state,hunt,stopped,onCommand,onClose,onInventory}:{state:GameState;hunt:ActiveActivity|null;stopped:boolean;onCommand:(command:GameCommand)=>Promise<void>;onClose:()=>void;onInventory:()=>void}){
 const {gt,gl,language}=useGameplayText(),C=useGameTheme(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[section,setSection]=useState<'food'|'potions'>('food'),inFlight=useRef(false);
 const foods=useMemo(()=>state.inventory.stacks.filter(stack=>stack.quantity>0&&itemDef(stack.itemId).type==='food'),[state.inventory.stacks]);
 const healingPotions=useMemo(()=>state.inventory.stacks.filter(stack=>stack.quantity>0&&potionDef(stack.itemId)?.effect.kind==='healing'),[state.inventory.stacks]);
 const selectedPotionId=state.character?.equippedHealingPotionId,selectedPotion=selectedPotionId?potionDef(selectedPotionId):undefined;
 const queuedFoodIds=state.character?.foodQueueIds??[];
 const maxHp=useMemo(()=>effectiveStats(state).hp,[state]);
 const hp=state.character?.currentHp??0,canResume=!!hunt&&!state.activity&&hp>1,hpPct=Math.max(0,Math.min(100,Math.round(hp/Math.max(1,maxHp)*100))),equippedFoodId=state.character?.equippedFoodId,equippedStack=equippedFoodId?state.inventory.stacks.find(stack=>stack.itemId===equippedFoodId):undefined,equippedFood=equippedFoodId?itemDef(equippedFoodId):undefined,equippedHeal=equippedFoodId?recoveryAmount(state,equippedFoodId):0,equippedHealLabel=equippedFoodId?displayHealHp(foodHealingAmount(state,equippedFoodId)):'0';
 const s=useMemo(()=>makeStyles(C),[C]);
 async function run(command:GameCommand,close=false){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{await onCommand(command);if(close)onClose();}catch(e){setError(e instanceof Error?e.message:gt('Action failed. Please try again.'));}finally{inFlight.current=false;setBusy(false);}}
 const updateSettings=(patch:Partial<GameState["settings"]>)=>void run({type:'settings',args:{settings:{...state.settings,...patch}}});
 const updateQueue=(ids:string[])=>void run({type:'food_queue',args:{ids}});
 return <GameModalSurface visible onClose={()=>{if(!busy)onClose();}} reduceMotion={state.settings.reduceMotion} surfaceStyle={s.surface}>
  <GameModalHeader title={gt('Food & potions')} onClose={onClose} closeDisabled={busy}/>
  <View style={s.healthCard}><View style={s.healthHead}><View><Text style={s.healthLabel}>{accountText(language,'HEALTH')}</Text><Text style={s.healthValue}>{displayStat(Math.floor(hp))} <Text style={s.healthMax}>/ {displayStat(Math.floor(maxHp))}</Text></Text></View><View style={s.percentBadge}><Text style={s.percentText}>{hpPct}%</Text></View></View><View style={s.track}><View style={[s.fill,{width:`${hpPct}%`,backgroundColor:hpPct<=25?C.bad:hpPct<=50?C.warning:C.good}]}/></View>{equippedFood?<Text style={s.healthHint}>{equippedFood.name} · {equippedStack?.quantity??0} {gt('carried')} · {gt('Restores up to {hp} HP',{hp:equippedHealLabel})}</Text>:<Text style={[s.healthHint,{color:C.warning}]}>{gt('No food selected for auto-eat')}</Text>}</View>
  <View style={s.tabBar}>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:section==='food'}} onPress={()=>setSection('food')} style={[s.tab,section==='food'&&s.tabActive]}>
    <Text style={[s.tabText,section==='food'&&s.tabTextActive]}>{gt('Food')}</Text>
   </Pressable>
   <Pressable accessibilityRole="tab" accessibilityState={{selected:section==='potions'}} onPress={()=>setSection('potions')} style={[s.tab,section==='potions'&&s.tabActive]}>
    <Text style={[s.tabText,section==='potions'&&s.tabTextActive]}>{gt('Potions')}</Text>
   </Pressable>
  </View>
  {error?<Text accessibilityRole="alert" style={s.error}>{gl(error)}</Text>:null}
  <ScrollView style={s.foodScroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.foodList}>
   {section==='food'?<>
    <View style={s.autoCard}>
     <View style={s.sectionHeading}><Text style={s.autoTitle}>{accountText(language,'AUTO-EAT')}</Text><Text style={s.autoHint}>{gt('Food auto-heals during ordinary hunts. Selected healing potions trigger at this threshold during boss fights instead.')}</Text></View>
     <View style={s.thresholds}>{([20,40,60,80] as const).map(threshold=><Pressable key={threshold} accessibilityRole="radio" accessibilityState={{selected:state.settings.autoEatThresholdPct===threshold,disabled:busy}} disabled={busy} onPress={()=>updateSettings({autoEatThresholdPct:threshold})} style={({pressed})=>[s.threshold,state.settings.autoEatThresholdPct===threshold&&s.thresholdSelected,pressed&&s.pressed]}><Text style={[s.thresholdText,state.settings.autoEatThresholdPct===threshold&&s.thresholdTextSelected]}>{threshold}%</Text></Pressable>)}</View>
     <Pressable accessibilityRole="switch" accessibilityState={{checked:state.settings.stopCombatWhenOutOfFood,disabled:busy}} disabled={busy} onPress={()=>updateSettings({stopCombatWhenOutOfFood:!state.settings.stopCombatWhenOutOfFood})} style={({pressed})=>[s.safetyRow,pressed&&s.pressed]}>
      <View style={s.safetyCopy}><Text style={s.safetyTitle}>{gt('Stop combat when out of food')}</Text></View>
      <View style={[s.switchTrack,state.settings.stopCombatWhenOutOfFood&&s.switchTrackOn]}><View style={[s.switchThumb,state.settings.stopCombatWhenOutOfFood&&s.switchThumbOn]}/></View>
     </Pressable>
    </View>
    <View style={s.queueCard}>
     <View style={s.cardHeading}><Text style={s.queueTitle}>{gt('FOOD BACKUPS')}</Text><Text style={s.queueCount}>{queuedFoodIds.length}/{MAX_FOOD_BACKUPS}</Text></View>
     {equippedFoodId&&equippedFood?
      <View style={s.primaryRow}>
       <View style={s.primaryArt}><ItemArtwork itemId={equippedFoodId} size={42}/></View>
       <View style={s.foodCopy}><Text style={s.queueEyebrow}>{gt('PRIMARY')}</Text><Text style={s.foodName} numberOfLines={1}>{equippedFood.name}</Text><Text style={s.foodHeal}>{equippedStack?.quantity??0} {gt('carried')} · +{equippedHealLabel} HP</Text></View>
       <GameButton compact tone="secondary" title={hp>=maxHp?gt('Health is full'):gt('Eat {name} · restore up to {hp} HP',{name:equippedFood.name,hp:equippedHealLabel})} disabled={busy||equippedHeal<=0||(equippedStack?.quantity??0)<1} onPress={()=>run({type:'eat',args:{id:equippedFoodId}})}/>
      </View>
      :<Text style={s.empty}>{gt('No food selected for auto-eat')}</Text>}
     {queuedFoodIds.map((id,index)=>{
      const food=itemDef(id),quantity=state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0;
      return <View key={id} style={s.backupBlock}>
       <View style={s.backupRow}>
        <Text style={s.rank}>{index+1}</Text>
        <ItemArtwork itemId={id} size={34}/>
        <View style={s.foodCopy}><Text numberOfLines={1} style={s.foodName}>{food.name}</Text><Text style={s.foodHeal}>{quantity} {gt('carried')} · +{displayHealHp(foodHealingAmount(state,id))} HP</Text></View>
       </View>
       <View style={s.queueControls}>
        <View style={s.backupEat}><GameButton compact tone="secondary" title={gt('Eat 1')} disabled={busy||quantity<=0||recoveryAmount(state,id)<=0} onPress={()=>run({type:'eat',args:{id}})}/></View>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Up')} accessibilityState={{disabled:busy||index===0}} disabled={busy||index===0} onPress={()=>{const ids=[...queuedFoodIds];[ids[index-1],ids[index]]=[ids[index],ids[index-1]];updateQueue(ids);}} style={[s.iconAction,(busy||index===0)&&s.iconDisabled]}><Text style={s.iconActionText}>↑</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Down')} accessibilityState={{disabled:busy||index===queuedFoodIds.length-1}} disabled={busy||index===queuedFoodIds.length-1} onPress={()=>{const ids=[...queuedFoodIds];[ids[index],ids[index+1]]=[ids[index+1],ids[index]];updateQueue(ids);}} style={[s.iconAction,(busy||index===queuedFoodIds.length-1)&&s.iconDisabled]}><Text style={s.iconActionText}>↓</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Remove backup')} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>updateQueue(queuedFoodIds.filter(entry=>entry!==id))} style={[s.iconAction,busy&&s.iconDisabled]}><Text style={[s.iconActionText,{color:C.bad}]}>×</Text></Pressable>
       </View>
      </View>;
     })}
     <Text style={s.queueHint}>{gt('Uses the selected food first, then each backup in order when it runs out. Only food carried in Inventory is used.')}</Text>
    </View>
    <View style={s.availableHeading}><Text style={s.queueTitle}>{gt('AVAILABLE FOOD')}</Text><Text style={s.queueCount}>{foods.filter(stack=>stack.itemId!==equippedFoodId&&!queuedFoodIds.includes(stack.itemId)).length}</Text></View>
    {foods.filter(stack=>stack.itemId!==equippedFoodId&&!queuedFoodIds.includes(stack.itemId)).map(stack=>{
     const food=itemDef(stack.itemId),heal=recoveryAmount(state,food.id),healLabel=displayHealHp(foodHealingAmount(state,food.id));
     return <View key={food.id} style={s.availableRow}>
      <View style={s.foodHead}><ItemArtwork itemId={food.id} size={38}/><View style={s.foodCopy}><Text style={s.foodName} numberOfLines={1}>{food.name} ×{stack.quantity}</Text><Text style={s.foodHeal}>+{healLabel} HP</Text></View></View>
      <View style={s.compactActions}>
       <GameButton compact tone="secondary" title={gt('Eat 1')} disabled={busy||heal<=0} onPress={()=>run({type:'eat',args:{id:food.id}})} style={s.smallButton}/>
       <GameButton compact tone="secondary" title={gt('Set primary')} disabled={busy} onPress={()=>run({type:'food',args:{id:food.id}})} style={s.smallButton}/>
       <GameButton compact title={gt('Add as backup')} disabled={busy||!equippedFoodId||queuedFoodIds.length>=MAX_FOOD_BACKUPS} onPress={()=>updateQueue([...queuedFoodIds,food.id])} style={s.smallButton}/>
      </View>
     </View>;
    })}
    {!foods.length?<Text style={s.empty}>{gt('No food in Inventory. Withdraw food from Bank or cook more.')}</Text>:null}
    {foods.length>0&&foods.every(stack=>stack.itemId===equippedFoodId||queuedFoodIds.includes(stack.itemId))?<Text style={s.empty}>{gt('All carried food is already assigned.')}</Text>:null}
   </>:<>
    <View style={s.queueCard}>
     <Text style={s.queueTitle}>{gt('BOSS HEALING POTIONS')}</Text>
     <Text style={s.queueHint}>{gt('Food is disabled in bosses and dungeons. Boss fights use your selected Alchemy healing potion (up to 5 per fight); dungeon runs have their own limited potion charges.')}</Text>
     {selectedPotion?<View style={s.primaryRow}><ItemArtwork itemId={selectedPotion.id} size={42}/><View style={s.foodCopy}><Text style={s.queueEyebrow}>{gt('SELECTED')}</Text><Text style={s.foodName} numberOfLines={1}>{selectedPotion.name}</Text><Text style={s.foodHeal}>{state.inventory.stacks.find(row=>row.itemId===selectedPotion.id)?.quantity??0} {gt('carried')}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={gt('Clear boss potion choice')} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>run({type:'select_healing_potion',args:{id:'none'}})} style={[s.iconAction,busy&&s.iconDisabled]}><Text style={[s.iconActionText,{color:C.bad}]}>×</Text></Pressable></View>:null}
    </View>
    {healingPotions.filter(stack=>stack.itemId!==selectedPotionId).map(stack=>{
      const potion=potionDef(stack.itemId)!;
      return <View key={potion.id} style={s.availableRow}>
       <View style={s.foodHead}><ItemArtwork itemId={potion.id} size={38}/><View style={s.foodCopy}><Text style={s.foodName} numberOfLines={1}>{potion.name} ×{stack.quantity}</Text><Text style={s.foodHeal}>{potion.effect.kind==='healing'?Math.round(potion.effect.maxHpFraction*100):0}% {gt('max HP per charge')}</Text></View></View>
       <GameButton compact title={gt('Select for bosses')} disabled={busy} onPress={()=>run({type:'select_healing_potion',args:{id:potion.id}})}/>
      </View>;
    })}
    {!healingPotions.length?<Text style={s.empty}>{gt('No healing potions carried. Brew them in Alchemy or withdraw from Bank.')}</Text>:null}
   </>}
  </ScrollView>
  {stopped?<GameButton title={gt('Stop and recover')} tone="secondary" disabled={busy} onPress={()=>run({type:'stop'})}/>:null}
  {canResume?<GameButton title={gt('Resume hunt')} disabled={busy} onPress={()=>run({type:'start',args:{kind:'combat',id:hunt!.targetId,tacticId:hunt!.combatTacticId??'balanced',goalId:huntGoalIdFromSnapshot(hunt!.huntGoal)}},true)}/>:null}
  <GameButton title={gt('Open food inventory')} tone="secondary" disabled={busy} onPress={onInventory}/>
 </GameModalSurface>;
}

function makeStyles(C:ReturnType<typeof useGameTheme>){return StyleSheet.create({
 pressed:{opacity:.76},
 tabBar:{flexDirection:'row',gap:5,padding:4,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 tab:{flex:1,minHeight:40,justifyContent:'center',alignItems:'center',borderRadius:7},
 tabActive:{backgroundColor:C.selection,borderWidth:1,borderColor:C.selectionLine},
 tabText:{fontSize:12,fontWeight:'800',color:C.muted},tabTextActive:{color:C.text},
 sectionHeading:{gap:3},
 queueCard:{gap:8,padding:10,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 cardHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 queueCount:{fontSize:11,fontWeight:'800',color:C.muted},
 queueEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:.4,color:C.good},
 primaryRow:{minHeight:56,flexDirection:'row',alignItems:'center',gap:9,padding:7,borderRadius:8,borderWidth:1,borderColor:C.selectionLine,backgroundColor:C.selection},
 primaryArt:{width:44,height:44,alignItems:'center',justifyContent:'center'},
 backupBlock:{gap:5,paddingBottom:7,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},backupRow:{minHeight:39,flexDirection:'row',alignItems:'center',gap:7,paddingVertical:2},
 rank:{fontSize:12,fontWeight:'900',color:C.info,width:14,textAlign:'center'},
 queueControls:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:4},backupEat:{minWidth:80,marginRight:'auto'},
 iconAction:{width:35,minHeight:40,justifyContent:'center',alignItems:'center',borderRadius:7,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 iconDisabled:{opacity:.35},iconActionText:{fontSize:17,fontWeight:'800',color:C.text},
 availableHeading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:2,paddingTop:3},
 availableRow:{gap:7,padding:9,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 compactActions:{flexDirection:'row',gap:5},smallButton:{flex:1,minWidth:0,paddingHorizontal:4},

 surface:{height:'96%',maxHeight:'96%',gap:8},healthCard:{gap:6,padding:10,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},healthHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},healthLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:1},healthValue:{fontSize:21,lineHeight:26,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},healthMax:{fontSize:14,color:C.muted},percentBadge:{paddingHorizontal:9,paddingVertical:5,borderRadius:99,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},percentText:{fontSize:12,color:C.text,fontWeight:'900'},track:{height:7,borderRadius:99,overflow:'hidden',backgroundColor:C.inputBg},fill:{height:'100%',borderRadius:99},healthHint:{fontSize:11,lineHeight:15,color:C.muted,fontWeight:'700'},autoCard:{gap:10,padding:12,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},autoTitle:{fontSize:10,color:C.info,fontWeight:'900',letterSpacing:1},autoHint:{fontSize:11,lineHeight:15,color:C.muted},queueSummary:{gap:4,padding:10,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2},queueTitle:{fontSize:10,color:C.info,fontWeight:'900',letterSpacing:.5},queueHint:{fontSize:10,lineHeight:14,color:C.muted},queueEntry:{fontSize:10,color:C.text,fontWeight:'700'},queueActions:{flexDirection:'row',alignItems:'center',gap:6},queueActionWide:{flex:1,minWidth:0},thresholds:{flexDirection:'row',gap:7},threshold:{minWidth:54,minHeight:38,alignItems:'center',justifyContent:'center',paddingHorizontal:9,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel},thresholdSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},thresholdText:{fontSize:12,color:C.muted,fontWeight:'900'},thresholdTextSelected:{color:C.text},safetyRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingTop:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},safetyCopy:{flex:1,minWidth:0},safetyTitle:{fontSize:12,color:C.text,fontWeight:'800'},safetyHint:{fontSize:10,lineHeight:13,color:C.muted},switchTrack:{width:42,height:24,padding:3,borderRadius:12,backgroundColor:C.inputBg,borderWidth:1,borderColor:C.line},switchTrackOn:{backgroundColor:C.goodSurface,borderColor:C.good},switchThumb:{width:16,height:16,borderRadius:8,backgroundColor:C.muted},switchThumbOn:{alignSelf:'flex-end',backgroundColor:C.good},foodScroll:{flex:1,minHeight:76},potionSection:{gap:9,borderTopWidth:1,borderTopColor:C.line,paddingTop:12},potionTitle:{fontSize:11,color:C.info,fontWeight:'900',letterSpacing:.6},potionHint:{fontSize:11,lineHeight:16,color:C.muted},potionSelected:{fontSize:11,color:C.good,fontWeight:'800'},foodList:{gap:10,paddingBottom:8},foodRow:{minHeight:66,gap:7,paddingBottom:10,borderBottomWidth:1,borderBottomColor:C.line},foodHead:{minHeight:44,flexDirection:'row',alignItems:'center',gap:8},foodArtwork:{width:44,height:44,flexShrink:0,alignItems:'center',justifyContent:'center'},foodCopy:{flex:1,minWidth:0},foodName:{color:C.text,fontWeight:'800'},foodHeal:{fontSize:11,color:C.muted},selected:{fontSize:8,color:C.good,fontWeight:'900',letterSpacing:.6},foodActions:{flexDirection:'row',gap:8},foodAction:{flex:1,minWidth:0},error:{color:C.bad,fontWeight:'700'},empty:{color:C.muted}
 });}

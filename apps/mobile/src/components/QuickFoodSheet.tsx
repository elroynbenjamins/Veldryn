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
 const {gt,gl,language}=useGameplayText(),C=useGameTheme(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[section,setSection]=useState<'food'|'potions'>('food'),[expandedFoodId,setExpandedFoodId]=useState<string|null>(null),[showQueueHelp,setShowQueueHelp]=useState(false),inFlight=useRef(false);
 const foods=useMemo(()=>state.inventory.stacks.filter(stack=>stack.quantity>0&&itemDef(stack.itemId).type==='food'),[state.inventory.stacks]);
 const healingPotions=useMemo(()=>state.inventory.stacks.filter(stack=>stack.quantity>0&&potionDef(stack.itemId)?.effect.kind==='healing'),[state.inventory.stacks]);
 const selectedPotionId=state.character?.equippedHealingPotionId,selectedPotion=selectedPotionId?potionDef(selectedPotionId):undefined;
 const queuedFoodIds=state.character?.foodQueueIds??[];
 const maxHp=useMemo(()=>effectiveStats(state).hp,[state]);
 const hp=state.character?.currentHp??0,canResume=!!hunt&&!state.activity&&hp>1,hpPct=Math.max(0,Math.min(100,Math.round(hp/Math.max(1,maxHp)*100))),equippedFoodId=state.character?.equippedFoodId,equippedStack=equippedFoodId?state.inventory.stacks.find(stack=>stack.itemId===equippedFoodId):undefined,equippedFood=equippedFoodId?itemDef(equippedFoodId):undefined,equippedHeal=equippedFoodId?recoveryAmount(state,equippedFoodId):0,equippedHealLabel=equippedFoodId?displayHealHp(foodHealingAmount(state,equippedFoodId)):'0';
 const availableFood=foods.filter(stack=>stack.itemId!==equippedFoodId&&!queuedFoodIds.includes(stack.itemId));
 const queuedFoodTotal=(equippedFoodId?[equippedFoodId,...queuedFoodIds]:[]).reduce((sum,id)=>sum+(state.inventory.stacks.find(stack=>stack.itemId===id)?.quantity??0),0);
 const s=useMemo(()=>makeStyles(C),[C]);
 async function run(command:GameCommand,close=false){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{await onCommand(command);if(close)onClose();}catch(e){setError(e instanceof Error?e.message:gt('Action failed. Please try again.'));}finally{inFlight.current=false;setBusy(false);}}
 const updateSettings=(patch:Partial<GameState["settings"]>)=>void run({type:'settings',args:{settings:{...state.settings,...patch}}});
 const updateQueue=(ids:string[])=>void run({type:'food_queue',args:{ids}});
 return <GameModalSurface visible onClose={()=>{if(!busy)onClose();}} reduceMotion={state.settings.reduceMotion} surfaceStyle={s.surface}>
  <GameModalHeader title={gt('Food & potions')} onClose={onClose} closeDisabled={busy}/>
  <View style={s.healthCard}>
   <View style={s.healthHead}><View><Text style={s.healthLabel}>{accountText(language,'HEALTH')}</Text><Text style={s.healthValue}>{displayStat(Math.floor(hp))}<Text style={s.healthMax}> / {displayStat(Math.floor(maxHp))}</Text></Text></View><Text style={[s.percentText,{color:hpPct<=25?C.bad:hpPct<=50?C.warning:C.good}]}>{hpPct}%</Text></View>
   <View style={s.track}><View style={[s.fill,{width:hpPct+'%',backgroundColor:hpPct<=25?C.bad:hpPct<=50?C.warning:C.good}]}/></View>
   {section==='food'?(equippedFood?<View style={s.healthHead}><Text style={s.healthHint} numberOfLines={1}>{equippedFood.name} · ×{equippedStack?.quantity??0}</Text><Text style={[s.healthHint,queuedFoodTotal<=2&&{color:C.warning}]}>{queuedFoodTotal<=2?gt('Food running low'):gt('Restores up to {hp} HP',{hp:equippedHealLabel})}</Text></View>:<Text style={[s.healthHint,{color:C.warning}]}>{gt('No food selected for auto-eat')}</Text>):null}
  </View>
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
     <Text style={s.queueTitle}>{accountText(language,'AUTO-EAT')}</Text>
     <View style={s.thresholds}>{([20,40,60,80] as const).map(threshold=><Pressable key={threshold} accessibilityRole="radio" accessibilityState={{selected:state.settings.autoEatThresholdPct===threshold,disabled:busy}} disabled={busy} onPress={()=>updateSettings({autoEatThresholdPct:threshold})} style={({pressed})=>[s.threshold,state.settings.autoEatThresholdPct===threshold&&s.thresholdSelected,pressed&&s.pressed]}><Text style={[s.thresholdText,state.settings.autoEatThresholdPct===threshold&&s.thresholdTextSelected]}>{threshold}%</Text></Pressable>)}</View>
     <Pressable accessibilityRole="switch" accessibilityState={{checked:state.settings.stopCombatWhenOutOfFood,disabled:busy}} disabled={busy} onPress={()=>updateSettings({stopCombatWhenOutOfFood:!state.settings.stopCombatWhenOutOfFood})} style={({pressed})=>[s.safetyRow,pressed&&s.pressed]}>
      <Text style={s.safetyTitle}>{gt('Stop combat when out of food')}</Text><View style={[s.switchTrack,state.settings.stopCombatWhenOutOfFood&&s.switchTrackOn]}><View style={[s.switchThumb,state.settings.stopCombatWhenOutOfFood&&s.switchThumbOn]}/></View>
     </Pressable>
    </View>
    <View style={s.queueCard}>
     <View style={s.cardHeading}>
      <Text style={s.queueTitle}>{gt('FOOD ROTATION')}</Text>
      <View style={s.headingActions}><Text style={s.queueCount}>{queuedFoodIds.length}/{MAX_FOOD_BACKUPS} {gt('BACKUP')}</Text><Pressable accessibilityRole="button" accessibilityLabel={gt('Uses the selected food first, then each backup in order when it runs out. Only food carried in Inventory is used.')} accessibilityState={{expanded:showQueueHelp}} onPress={()=>setShowQueueHelp(current=>!current)} style={s.infoAction}><Text style={s.infoText}>?</Text></Pressable></View>
     </View>
     {showQueueHelp?<Text style={s.queueHint}>{gt('Uses the selected food first, then each backup in order when it runs out. Only food carried in Inventory is used.')}</Text>:null}
     {equippedFoodId&&equippedFood?<View style={[s.rotationRow,s.primaryRow]}>
      <ItemArtwork itemId={equippedFoodId} size={34}/>
      <View style={s.foodCopy}><Text style={s.queueEyebrow}>{gt('PRIMARY')}</Text><Text style={s.foodName} numberOfLines={1}>{equippedFood.name}</Text><Text style={s.foodHeal}>×{equippedStack?.quantity??0} · +{equippedHealLabel} HP</Text></View>
      <GameButton compact tone="secondary" title={gt('Eat 1')} disabled={busy||equippedHeal<=0||(equippedStack?.quantity??0)<1} onPress={()=>run({type:'eat',args:{id:equippedFoodId}})} style={s.primaryEat}/>
     </View>:<Text style={s.empty}>{gt('No food selected for auto-eat')}</Text>}
     {queuedFoodIds.map((id,index)=>{
      const food=itemDef(id),quantity=state.inventory.stacks.find(row=>row.itemId===id)?.quantity??0,expanded=expandedFoodId===id;
      return <View key={id} style={s.foodBlock}>
       <View style={s.rotationRow}>
        <ItemArtwork itemId={id} size={32}/>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Food actions')+': '+food.name} accessibilityState={{expanded,disabled:busy}} disabled={busy} onPress={()=>setExpandedFoodId(expanded?null:id)} style={({pressed})=>[s.expandFood,pressed&&s.pressed]}>
         <Text style={s.queueEyebrow}>{gt('BACKUP')} {index+1} {expanded?'▴':'▾'}</Text><Text style={s.foodName} numberOfLines={1}>{food.name}</Text><Text style={s.foodHeal}>×{quantity} · +{displayHealHp(foodHealingAmount(state,id))} HP</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Up')} accessibilityState={{disabled:busy||index===0}} disabled={busy||index===0} onPress={()=>{const ids=[...queuedFoodIds];[ids[index-1],ids[index]]=[ids[index],ids[index-1]];updateQueue(ids);}} style={[s.iconAction,(busy||index===0)&&s.iconDisabled]}><Text style={s.iconActionText}>↑</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Down')} accessibilityState={{disabled:busy||index===queuedFoodIds.length-1}} disabled={busy||index===queuedFoodIds.length-1} onPress={()=>{const ids=[...queuedFoodIds];[ids[index],ids[index+1]]=[ids[index+1],ids[index]];updateQueue(ids);}} style={[s.iconAction,(busy||index===queuedFoodIds.length-1)&&s.iconDisabled]}><Text style={s.iconActionText}>↓</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Remove backup')} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>{setExpandedFoodId(null);updateQueue(queuedFoodIds.filter(entry=>entry!==id));}} style={[s.iconAction,busy&&s.iconDisabled]}><Text style={[s.iconActionText,{color:C.bad}]}>×</Text></Pressable>
       </View>
       {expanded?<View style={s.inlineActions}>
        <GameButton compact tone="secondary" title={gt('Eat 1')} disabled={busy||quantity<=0||recoveryAmount(state,id)<=0} onPress={()=>run({type:'eat',args:{id}})} style={s.inlineButton}/>
        <GameButton compact tone="secondary" title={gt('Set primary')} disabled={busy||quantity<=0} onPress={()=>{setExpandedFoodId(null);void run({type:'food',args:{id}});}} style={s.inlineButton}/>
       </View>:null}
      </View>;
     })}
    </View>
    <View style={s.queueCard}>
     <View style={s.cardHeading}><Text style={s.queueTitle}>{gt('AVAILABLE FOOD')}</Text><Text style={s.queueCount}>{availableFood.length}</Text></View>
     {availableFood.map(stack=>{
      const food=itemDef(stack.itemId),heal=recoveryAmount(state,food.id),expanded=expandedFoodId===food.id;
      return <View key={food.id} style={s.foodBlock}>
       <View style={s.rotationRow}>
        <ItemArtwork itemId={food.id} size={32}/>
        <View style={s.foodCopy}><Text style={s.foodName} numberOfLines={1}>{food.name}</Text><Text style={s.foodHeal}>×{stack.quantity} · +{displayHealHp(foodHealingAmount(state,food.id))} HP</Text></View>
        {!equippedFoodId?<GameButton compact title={gt('Set primary')} disabled={busy} onPress={()=>run({type:'food',args:{id:food.id}})} style={s.primaryChoice}/>:<Pressable accessibilityRole="button" accessibilityLabel={gt('Add as backup')} accessibilityState={{disabled:busy||queuedFoodIds.length>=MAX_FOOD_BACKUPS}} disabled={busy||queuedFoodIds.length>=MAX_FOOD_BACKUPS} onPress={()=>{setExpandedFoodId(null);updateQueue([...queuedFoodIds,food.id]);}} style={[s.addAction,(busy||queuedFoodIds.length>=MAX_FOOD_BACKUPS)&&s.iconDisabled]}><Text style={s.addText}>+</Text></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={gt('Food actions')} accessibilityState={{expanded,disabled:busy}} disabled={busy} onPress={()=>setExpandedFoodId(expanded?null:food.id)} style={[s.iconAction,busy&&s.iconDisabled]}><Text style={s.iconActionText}>{expanded?'▴':'⋯'}</Text></Pressable>
       </View>
       {expanded?<View style={s.inlineActions}>
        <GameButton compact tone="secondary" title={gt('Eat 1')} disabled={busy||heal<=0} onPress={()=>run({type:'eat',args:{id:food.id}})} style={s.inlineButton}/>
        {equippedFoodId?<GameButton compact tone="secondary" title={gt('Set primary')} disabled={busy} onPress={()=>{setExpandedFoodId(null);void run({type:'food',args:{id:food.id}});}} style={s.inlineButton}/>:null}
       </View>:null}
      </View>;
     })}
     {!foods.length?<Text style={s.empty}>{gt('No food in Inventory. Withdraw food from Bank or cook more.')}</Text>:null}
     {foods.length>0&&!availableFood.length?<Text style={s.empty}>{gt('All carried food is already assigned.')}</Text>:null}
    </View>
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
  <GameButton compact title={gt('Open food inventory')} tone="secondary" disabled={busy} onPress={onInventory}/>
 </GameModalSurface>;
}

function makeStyles(C:ReturnType<typeof useGameTheme>){return StyleSheet.create({
 pressed:{opacity:.74},
 surface:{height:'96%',maxHeight:'96%',gap:7},
 healthCard:{gap:5,paddingHorizontal:10,paddingVertical:8,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 healthHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 healthLabel:{fontSize:9,color:C.muted,fontWeight:'900',letterSpacing:.8},
 healthValue:{fontSize:18,lineHeight:22,color:C.text,fontWeight:'900',fontVariant:['tabular-nums']},
 healthMax:{fontSize:12,color:C.muted},
 percentText:{fontSize:12,color:C.good,fontWeight:'900'},
 track:{height:5,borderRadius:5,overflow:'hidden',backgroundColor:C.inputBg},
 fill:{height:'100%',borderRadius:5},
 healthHint:{fontSize:10,color:C.muted,fontWeight:'700',flexShrink:1},
 tabBar:{flexDirection:'row',gap:4,padding:3,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 tab:{flex:1,minHeight:38,justifyContent:'center',alignItems:'center',borderRadius:6},
 tabActive:{backgroundColor:C.selection,borderWidth:1,borderColor:C.selectionLine},
 tabText:{fontSize:12,fontWeight:'800',color:C.muted},
 tabTextActive:{color:C.text},
 foodScroll:{flex:1,minHeight:76},
 foodList:{gap:8,paddingBottom:8},
 autoCard:{gap:6,padding:9,borderWidth:1,borderColor:C.line,borderRadius:9,backgroundColor:C.panel2},
 queueCard:{gap:5,padding:9,borderRadius:9,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
 cardHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 headingActions:{flexDirection:'row',alignItems:'center',gap:5},
 queueTitle:{fontSize:10,color:C.info,fontWeight:'900',letterSpacing:.5},
 queueCount:{fontSize:10,fontWeight:'800',color:C.muted},
 queueEyebrow:{fontSize:9,fontWeight:'900',letterSpacing:.3,color:C.good},
 queueHint:{fontSize:10,lineHeight:14,color:C.muted},
 infoAction:{width:30,height:30,alignItems:'center',justifyContent:'center',borderRadius:15,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 infoText:{fontSize:12,color:C.info,fontWeight:'900'},
 thresholds:{flexDirection:'row',gap:6},
 threshold:{flex:1,minWidth:0,minHeight:36,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:20,backgroundColor:C.panel},
 thresholdSelected:{borderColor:C.selectionLine,backgroundColor:C.selection},
 thresholdText:{fontSize:12,color:C.muted,fontWeight:'900'},
 thresholdTextSelected:{color:C.text},
 safetyRow:{minHeight:40,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingTop:6,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:C.line},
 safetyTitle:{fontSize:11,color:C.text,fontWeight:'800',flex:1},
 switchTrack:{width:42,height:24,padding:3,borderRadius:12,backgroundColor:C.inputBg,borderWidth:1,borderColor:C.line},
 switchTrackOn:{backgroundColor:C.goodSurface,borderColor:C.good},
 switchThumb:{width:16,height:16,borderRadius:8,backgroundColor:C.muted},
 switchThumbOn:{alignSelf:'flex-end',backgroundColor:C.good},
 rotationRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4,paddingHorizontal:4},
 primaryRow:{borderWidth:1,borderColor:C.selectionLine,borderRadius:7,backgroundColor:C.selection},
 foodBlock:{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
 foodCopy:{flex:1,minWidth:0,gap:1},
 foodName:{fontSize:12,color:C.text,fontWeight:'800',flexShrink:1},
 foodHeal:{fontSize:10,color:C.muted},
 expandFood:{flex:1,minWidth:0,minHeight:44,justifyContent:'center',gap:1},
 iconAction:{width:38,minHeight:44,justifyContent:'center',alignItems:'center',borderRadius:6,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 iconDisabled:{opacity:.35},
 iconActionText:{fontSize:17,fontWeight:'800',color:C.text},
 addAction:{width:42,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:7,borderWidth:1,borderColor:C.good,backgroundColor:C.goodSurface},
 addText:{fontSize:22,fontWeight:'700',color:C.good},
 primaryEat:{minWidth:72,paddingHorizontal:6},
 primaryChoice:{minWidth:0,paddingHorizontal:6,maxWidth:122},
 inlineActions:{flexDirection:'row',gap:6,paddingLeft:36,paddingBottom:7},
 inlineButton:{flex:1,minWidth:0},
 availableRow:{gap:6,padding:8,borderRadius:8,borderWidth:1,borderColor:C.line,backgroundColor:C.panel2},
 foodHead:{minHeight:40,flexDirection:'row',alignItems:'center',gap:7},
 compactActions:{flexDirection:'row',gap:5},
 smallButton:{flex:1,minWidth:0,paddingHorizontal:4},
 empty:{color:C.muted,fontSize:11,lineHeight:16},
 error:{color:C.bad,fontWeight:'700',fontSize:11}
 });}

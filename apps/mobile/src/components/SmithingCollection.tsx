import {useEffect,useMemo,useRef,useState,type ComponentProps} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {EQUIPMENT_SETS} from '../content/equipment-sets';
import {isReleasedEquipmentTier} from '../content/equipment-release';
import {RECIPES} from '../content/skills';
import {alchemyRecipeDef} from '../content/alchemy';
import {itemDef} from '../content/items';
import {equipmentCraftAvailability,equipmentCraftDurationSeconds,equipmentCraftQueueModel} from '../core/equipment-crafting-queue';
import {formatQueueTimeV31} from '../core/equipment-crafting-v31';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {profileSourceText} from '../i18n/profile';
import {ItemArtwork} from './ItemArtwork';
import {hasEquipmentArtwork} from './EquipmentArtwork';
import {RecipeCard} from './RecipeCard';
import {localizedItemName} from '../i18n/starter-item-names';
import {CraftingRecipeBrowser} from './CraftingRecipeBrowser';
import {EquipmentCraftQueuePanel} from './EquipmentCraftQueuePanel';
import {ForgeOddsGuide} from './ForgeOddsGuide';
import {ActivityArtwork} from './ActivityArtwork';
import {progressWithinLevel} from '../core/progression';
import {ownedEquipmentDefinitionIds} from '../core/equipment-collection-ownership';
import {workingTowardItemSourceEntries} from '../core/working-toward';
import {rememberedEquipmentTier,rememberEquipmentTier} from '../core/equipment-tier-memory';
import {OptionPager,type PagerOption} from './OptionPager';

type EquipmentCraftingSkill='smithing'|'tailoring';
type Props=Omit<ComponentProps<typeof CraftingRecipeBrowser>,'skillId'|'category'> & {queueProps:ComponentProps<typeof EquipmentCraftQueuePanel>;skillId?:EquipmentCraftingSkill};
const slots=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
const slotLabels:Record<string,string>={helmet:'Helmet',chest:'Chest',gloves:'Gloves',legs:'Legs',boots:'Boots',weapon:'Weapon',offhand:'Off-hand',cape:'Cape',amulet:'Necklace',ring:'Ring'};

export function EquipmentCraftingHeader({state,skillId='smithing'}:{state:Props['state'];onBack?:()=>void;skillId?:EquipmentCraftingSkill}){
 const C=useGameTheme(),{gl}=useGameplayText(),skill=state.skills.find(row=>row.skillId===skillId),p=progressWithinLevel(skill?.xp??0,skill?.level??1),ratio=(skill?.level??1)>=100?1:Math.max(0,Math.min(1,p.current/Math.max(1,p.need)));
 return <View style={{gap:10}}><View style={s.between}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><ActivityArtwork id={skillId} size={36}/><Text accessibilityRole="header" style={{fontSize:26,fontWeight:'700',color:C.text}}>{gl(skillId)}</Text></View><Text style={[s.body,{color:C.text}]}>{gl('Level')} {skill?.level??1}</Text></View><View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1,height:6,backgroundColor:C.line,borderRadius:3,overflow:'hidden'}}><View style={{height:6,width:`${ratio*100}%`,backgroundColor:C.accent}}/></View><Text style={[s.caption,{color:C.muted}]}>{(skill?.level??1)>=100?gl('Mastered'):Math.floor(p.current)+' / '+p.need+' XP'}</Text></View></View>;
}

/** @deprecated Use EquipmentCraftingHeader so Tailoring and Smithing stay in the same set browser. */
export const SmithingHeader=EquipmentCraftingHeader;

/** Collection browsing is presentation only; existing forge commands own all costs and gates. */
export function SmithingCollection(props:Props){
 const {state,preferredRecipeId,onCraft,queueProps,skillId='smithing'}=props,C=useGameTheme(),{gl,gt,language}=useGameplayText(),{width:viewportWidth,fontScale}=useWindowDimensions();
 const recipes=useMemo(()=>RECIPES.filter(r=>r.skillId===skillId&&!r.noviceSetId&&(!r.classId||r.classId===state.character?.classId)&&(!r.v33EquipmentTier||isReleasedEquipmentTier(r.v33EquipmentTier))),[state.character?.classId,skillId]);
 const preferred=recipes.find(r=>r.id===preferredRecipeId),characterId=state.character?.id;
 const [tab,setTab]=useState<'equipment'|'materials'|'tools'>(preferred&&!preferred.v33SetId?(itemDef(preferred.output.itemId).type==='tool'?'tools':'materials'):'equipment');
 const sets=useMemo(()=>EQUIPMENT_SETS.filter(set=>recipes.some(r=>r.v33SetId===set.id)&&set.itemIds.every(id=>hasEquipmentArtwork(itemDef(id)))),[recipes]);
 const [setId,setSetId]=useState<string|undefined>(preferred?.v33SetId??sets[0]?.id),[itemId,setItemId]=useState(preferred?.output.itemId),[bonusesOpen,setBonusesOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false),[queueOpen,setQueueOpen]=useState(()=>equipmentCraftQueueModel(state,Date.now()).ready>0),[width,setWidth]=useState(Math.max(260,viewportWidth-32)),[now,setNow]=useState(Date.now()),[error,setError]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!preferred)return;setTab(preferred.v33SetId?'equipment':itemDef(preferred.output.itemId).type==='tool'?'tools':'materials');setSetId(preferred.v33SetId);setItemId(preferred.output.itemId);setDetailsOpen(false)},[preferredRecipeId]);
 const set=sets.find(row=>row.id===setId)??sets[0],tierSets=sets.filter(row=>row.tier===set?.tier),setIndex=tierSets.findIndex(row=>row.id===set?.id);
 const tiers=[...new Set(sets.map(row=>row.tier))].sort((a,b)=>Number(a.slice(1))-Number(b.slice(1)));
 const pieces=set?[...set.itemIds].sort((a,b)=>slots.indexOf(itemDef(a).slot??'')-slots.indexOf(itemDef(b).slot??'')):[];
 const selected=pieces.includes(itemId??'')?itemId!:pieces[0],recipe=recipes.find(row=>row.output.itemId===selected),item=selected?itemDef(selected):undefined;
 const status=recipe?equipmentCraftAvailability(state,recipe.id):undefined,queue=equipmentCraftQueueModel(state,now),full=queue.freeSlots<=0&&queue.freeWaiting<=0,ready=!!status?.ready&&!full;
 const owned=ownedEquipmentDefinitionIds(state);
 // Keep the familiar two-row, five-column equipment grid on regular phones.
 // Switch to larger touch targets only on narrow screens or enlarged system text.
 const tileColumns=width<295||fontScale>=1.6?3:width<345||fontScale>=1.3?4:5;
 const tileWidth=(width-8*(tileColumns-1))/tileColumns,artSize=Math.max(32,Math.min(78,tileWidth-12));
 const chooseSet=(id:string)=>{
  setSetId(id);setItemId(undefined);setDetailsOpen(false);setBonusesOpen(false);setError('');
  const tier=sets.find(row=>row.id===id)?.tier;
  if(tier)void rememberEquipmentTier(characterId,skillId,tier);
 };
 // A smith at T7 should not have to walk back up from T1 on every visit. Restore the last
 // tier they browsed, but never over a set the caller asked for or one already chosen here.
 const restoredFor=useRef('');
 useEffect(()=>{
  const key=(characterId??'')+'|'+skillId;
  if(preferred||!sets.length||restoredFor.current===key)return;
  restoredFor.current=key;
  let active=true;
  void rememberedEquipmentTier(characterId,skillId).then(tier=>{
   if(!active||!tier)return;
   const landing=sets.find(row=>row.tier===tier);
   if(landing)setSetId(current=>current===undefined||current===sets[0]?.id?landing.id:current);
  });
  return()=>{active=false};
 },[characterId,skillId,sets,preferred]);
 const tierOptions:PagerOption[]=tiers.map(tier=>{
  const ids=sets.filter(row=>row.tier===tier).flatMap(row=>row.itemIds);
  return {key:tier,label:gl('Tier')+' '+tier.slice(1),meta:ids.filter(id=>owned.has(id)).length+'/'+ids.length};
 });
 const panel={backgroundColor:C.panel,borderColor:C.line},text={color:C.text},muted={color:C.muted};
 const button=(title:string,onPress:()=>void,extra?:object,accessibleLabel=title)=><Pressable accessibilityRole="button" accessibilityLabel={accessibleLabel} onPress={onPress} style={({pressed})=>[s.control,panel,extra,pressed&&s.pressed]}><Text style={[s.body,text]}>{title}</Text></Pressable>;
 const active=queue.jobs.find(job=>job.status==='active'),progress=active?Math.max(0,Math.min(1,1-active.remainingSeconds/Math.max(1,active.durationSeconds))):0;
 return <View style={s.root} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
  <Pressable accessibilityRole="button" accessibilityLabel={gt("Forge")+" · "+queue.ready+" "+gt("Ready")} accessibilityState={{expanded:queueOpen}} onPress={()=>setQueueOpen(value=>!value)} style={({pressed})=>[s.queue,panel,queue.ready>0&&{borderColor:C.good,backgroundColor:C.goodSurface},pressed&&s.pressed]}>
    <ActivityArtwork id={skillId} size={28}/>
    <View style={s.flex}><Text style={[s.body,text,{fontWeight:'700'}]}>{gt("Forge")} · {queue.ready>0?queue.ready+" "+gt("Ready"):queue.active+" "+gl("active")}</Text><Text style={[s.caption,muted]}>{queue.active}/{queue.slotInfo.capacity} {gl("active")} · {queue.waiting} {gl("Waiting")}{queue.ready>0?" · "+gt("Collect finished equipment"):''}</Text>{active&&!queueOpen?<View style={[s.track,{backgroundColor:C.line}]}><View style={{width:`${progress*100}%`,height:4,backgroundColor:C.accent}}/></View>:null}</View>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.caption,{color:queue.ready>0?C.good:C.muted,fontWeight:'700',maxWidth:92,textAlign:'right'}]}>{queueOpen?gt("Back to crafting"):gt("Manage & collect")}</Text>
    <Text style={muted}>{queueOpen?'⌃':'›'}</Text>
  </Pressable>
  {queueOpen?<EquipmentCraftQueuePanel {...queueProps}/>:<>
  <View accessibilityRole="tablist" style={[s.tabs,{borderBottomColor:C.line}]}>{(['equipment','materials','tools'] as const).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:tab===value}} onPress={()=>{setTab(value);setError('')}} style={[s.tab,{borderBottomColor:tab===value?C.selectionLine:'transparent'}]}><Text style={[s.body,{color:tab===value?C.text:C.muted,fontWeight:tab===value?'700':'400'}]}>{gl(value[0].toUpperCase()+value.slice(1))}</Text></Pressable>)}</View>
  {tab==='equipment'&&set&&item&&recipe&&status?<>
   <View style={s.between}><Text style={[s.body,{color:C.text,fontWeight:'700'}]}>{gl('Tier')}</Text><Text style={[s.body,muted]}>{state.character?.classId.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</Text></View>
   <OptionPager options={tierOptions} value={set.tier} onChange={tier=>{const first=sets.find(row=>row.tier===tier);if(first)chooseSet(first.id)}}
    accessibilityLabel={gt('Equipment tier')} previousLabel={gt('Previous tier')} nextLabel={gt('Next tier')}
    reduceMotion={state.settings.reduceMotion}/>
   <View style={[s.setHeader,panel]}>
    {button('‹',()=>chooseSet(tierSets[(setIndex-1+tierSets.length)%tierSets.length].id),undefined,gt('Previous set'))}
    <View style={s.center}>
     <Text style={[s.caption,muted]}>{gt('Set {number} / {total}',{number:setIndex+1,total:tierSets.length})}</Text>
     <Text style={[s.setName,text]}>{set.name}</Text>
     <Text style={[s.caption,text,{textAlign:'center'}]}>{profileSourceText(language,set.buildFocus)}</Text>
     <Text style={[s.caption,muted]}>{pieces.filter(id=>owned.has(id)).length} / {pieces.length} {gl('pieces owned')}</Text>
    </View>
    {button('›',()=>chooseSet(tierSets[(setIndex+1)%tierSets.length].id),undefined,gt('Next set'))}
   </View>
   <View style={s.grid}>{pieces.map(id=>{const def=itemDef(id),chosen=id===selected;return <Pressable key={id} accessibilityRole="button" accessibilityLabel={localizedItemName(language,def.id)+(owned.has(id)?', '+gl('Owned'):'')} accessibilityState={{selected:chosen}} onPress={()=>{setItemId(id);setDetailsOpen(false);setError('')}} style={({pressed})=>[s.tile,panel,{width:tileWidth,borderColor:chosen?C.selectionLine:C.line,backgroundColor:chosen?C.selection:C.panel},pressed&&s.pressed]}><ItemArtwork itemId={id} size={artSize}/><Text numberOfLines={1} adjustsFontSizeToFit style={[s.slot,chosen?text:muted]}>{gl(slotLabels[def.slot??'']??'Equipment')}</Text>{owned.has(id)?<View style={[s.check,{backgroundColor:C.good}]}><Text style={{color:C.bg,fontSize:10,fontWeight:'800'}}>✓</Text></View>:null}</Pressable>})}</View>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:bonusesOpen}} onPress={()=>setBonusesOpen(!bonusesOpen)} style={[s.disclosure,panel]}><Text style={[s.body,text]}>{gl('Set bonuses')}</Text><Text style={muted}>{bonusesOpen?'⌃':'⌄'}</Text></Pressable>
   {bonusesOpen?<View style={[s.detail,panel]}>{[set.twoPiece,set.fourPiece,set.sixPiece,set.eightPiece,set.tenPiece].map((bonus,i)=><Text key={i} style={[s.caption,muted]}>{(i+1)*2} · {gl(bonus)}</Text>)}</View>:null}
   <View style={[s.detail,panel]}>
    <View style={s.between}><Text style={[s.title,text]}>{localizedItemName(language,item.id)}</Text><Text style={[s.badge,muted,{borderColor:C.line}]}>{set.tier}</Text></View>
    <View style={s.itemHero}><ItemArtwork itemId={item.id} size={Math.min(100,width*.25)}/><View style={s.stats}>{[['Attack',item.attack],['Defense',item.defense],['Health',item.hp]].filter(([,value])=>Number(value)>0).map(([label,value])=><View key={label} style={[s.stat,{borderBottomColor:C.line}]}><Text style={[s.body,muted]}>{gl(String(label))}</Text><Text style={[s.body,text]}>+{value}</Text></View>)}<Text accessibilityLiveRegion="polite" style={[s.caption,{color:ready?C.good:C.warning}]}>{ready?gl('Ready to craft'):full?gl('Forge + backlog full'):gl(status.reason)}</Text></View></View>
    <Pressable accessibilityRole="button" accessibilityState={{disabled:!ready}} disabled={!ready} onPress={()=>{setError('');try{onCraft(recipe.id)}catch(e){setError(e instanceof Error?e.message:String(e))}}} style={({pressed})=>[s.craft,{backgroundColor:C.primaryButton,borderColor:C.primaryButtonBorder,opacity:ready?1:.5},pressed&&s.pressed]}><ActivityArtwork id={skillId} size={24}/><View style={s.flex}><Text style={[s.body,{color:C.primaryButtonText,fontWeight:'700',textAlign:'center'}]}>{gl(queue.freeSlots<=0?'Queue craft':'Add to forge')}</Text><Text style={[s.caption,{color:C.primaryButtonText,textAlign:'center'}]}>{formatQueueTimeV31(equipmentCraftDurationSeconds(state,recipe.id))} · {recipe.gold} {gl('Gold')}</Text></View></Pressable>
    <View style={[s.materials,{borderTopColor:C.line}]}><View style={s.between}><Text style={[s.body,text]}>{gl('Materials')}</Text><Text style={[s.caption,muted]}>{gl('Owned / required')}</Text></View><View style={s.ingredients}>{status.inputs.map(input=>{const infusion=alchemyRecipeDef('BREW_'+input.itemId);return <Pressable key={input.itemId} accessibilityRole="button" accessibilityLabel={localizedItemName(language,input.itemId)+', '+(input.inventory+input.bank)+' / '+input.quantity} onPress={()=>{const missing=input.inventory+input.bank<input.quantity;const source=missing&&props.onNavigate?workingTowardItemSourceEntries(state,input.itemId).find(row=>row.availability.canNavigate):undefined;if(source&&props.onNavigate)props.onNavigate(source.destination);else setDetailsOpen(true)}} style={[s.ingredient,{backgroundColor:C.panel2,borderColor:C.line}]}><ItemArtwork itemId={input.itemId} size={32}/><View style={s.flex}><Text numberOfLines={2} style={[s.caption,text]}>{localizedItemName(language,input.itemId)}</Text><Text style={[s.body,{color:input.inventory+input.bank>=input.quantity?C.good:C.warning}]}>{input.inventory+input.bank} / {input.quantity}</Text>{infusion?<Text style={[s.caption,muted]}>{gl('Alchemy')} · {gl('Level')} {infusion.level}</Text>:null}{input.inventory+input.bank<input.quantity&&props.onNavigate?<Text style={[s.caption,{color:C.info}]}>{gt('Find source')} ›</Text>:null}</View></Pressable>})}</View></View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(!detailsOpen)} style={[s.disclosure,panel]}><Text style={[s.body,muted]}>{gl('Details & sources')}</Text><Text style={muted}>{detailsOpen?'⌃':'⌄'}</Text></Pressable>
    {detailsOpen?<RecipeCard key={recipe.id} state={state} recipe={recipe} status={status} onCraft={onCraft} onNavigate={props.onNavigate} onCraftPrerequisites={props.onCraftPrerequisites} onTrackPreparation={props.onTrackPreparation} detailsOnly/>:null}
    <ForgeOddsGuide key={recipe.output.itemId} itemId={recipe.output.itemId}/>
    {error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}

   </View>
  </>:tab==='equipment'?<Text style={[s.body,muted]}>{gl('No recipes available.')}</Text>:<CraftingRecipeBrowser key={tab} {...props} skillId={skillId} category={tab} initialQuery={preferred&&!preferred.v33SetId?props.initialQuery:''}/>}
  </>}
 </View>;
}
const s=StyleSheet.create({root:{gap:12},tabs:{flexDirection:'row',borderBottomWidth:1},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderBottomWidth:2},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},control:{minHeight:44,minWidth:44,paddingHorizontal:12,borderWidth:1,borderRadius:8,justifyContent:'center',alignItems:'center'},body:{fontSize:14,lineHeight:20},caption:{fontSize:12,lineHeight:17},setHeader:{flexDirection:'row',alignItems:'center',padding:8,borderWidth:1,borderRadius:10,gap:8},center:{flex:1,alignItems:'center',gap:3},setName:{fontSize:16,lineHeight:22,fontWeight:'700',textAlign:'center'},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},tile:{borderWidth:1,borderRadius:9,paddingVertical:10,alignItems:'center',justifyContent:'center',gap:8,minHeight:84},slot:{fontSize:11,lineHeight:16,paddingHorizontal:2},check:{position:'absolute',right:4,top:4,width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},disclosure:{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderRadius:8},detail:{padding:12,gap:12,borderWidth:1,borderRadius:10},title:{flex:1,fontSize:19,lineHeight:25,fontWeight:'700'},badge:{borderWidth:1,borderRadius:5,paddingVertical:3,paddingHorizontal:7,fontSize:12},itemHero:{flexDirection:'row',alignItems:'center',gap:16},stats:{flex:1,gap:7},stat:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,paddingBottom:6},materials:{borderTopWidth:1,paddingTop:12,gap:10},ingredients:{flexDirection:'row',flexWrap:'wrap',gap:8},ingredient:{flexGrow:1,flexBasis:120,flexDirection:'row',alignItems:'center',gap:8,padding:8,minHeight:60,borderWidth:1,borderRadius:8},flex:{flex:1,minWidth:0},craft:{minHeight:50,borderWidth:1.5,borderRadius:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:8},queue:{minHeight:58,borderWidth:1,borderRadius:10,padding:12,flexDirection:'row',alignItems:'center',gap:12},track:{height:4,borderRadius:2,overflow:'hidden',marginTop:6},pressed:{opacity:.75}});

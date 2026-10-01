import {useEffect,useMemo,useState,type ComponentProps} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {EQUIPMENT_SETS} from '../content/equipment-sets';
import {RECIPES} from '../content/skills';
import {itemDef} from '../content/items';
import {equipmentCraftAvailability,equipmentCraftDurationSeconds,equipmentCraftQueueModel} from '../core/equipment-crafting-queue';
import {formatQueueTimeV31} from '../core/equipment-crafting-v31';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameplayText} from '../i18n/gameplay';
import {profileSourceText} from '../i18n/profile';
import {ItemArtwork} from './ItemArtwork';
import {RecipeCard} from './RecipeCard';
import {CraftingRecipeBrowser} from './CraftingRecipeBrowser';
import {EquipmentCraftQueuePanel} from './EquipmentCraftQueuePanel';
import {ActivityArtwork} from './ActivityArtwork';
import {progressWithinLevel} from '../core/progression';

type Props=Omit<ComponentProps<typeof CraftingRecipeBrowser>,'skillId'|'category'> & {queueProps:ComponentProps<typeof EquipmentCraftQueuePanel>};
const slots=['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring'];
const slotLabels:Record<string,string>={helmet:'Helmet',chest:'Chest',gloves:'Gloves',legs:'Legs',boots:'Boots',weapon:'Weapon',offhand:'Off-hand',cape:'Cape',amulet:'Necklace',ring:'Ring'};

export function SmithingHeader({state,onBack}:{state:Props['state'];onBack?:()=>void}){
 const C=useGameTheme(),{gl}=useGameplayText(),skill=state.skills.find(row=>row.skillId==='smithing'),p=progressWithinLevel(skill?.xp??0,skill?.level??1),ratio=(skill?.level??1)>=100?1:Math.max(0,Math.min(1,p.current/Math.max(1,p.need)));
 return <View style={{gap:10}}>{onBack?<Pressable accessibilityRole="button" onPress={onBack} style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start'}}><Text style={{fontSize:16,color:C.muted}}>‹  {gl('Skills')}</Text></Pressable>:null}<View style={s.between}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><ActivityArtwork id="smithing" size={36}/><Text accessibilityRole="header" style={{fontSize:26,fontWeight:'700',color:C.text}}>{gl('Smithing')}</Text></View><Text style={[s.body,{color:C.text}]}>{gl('Level')} {skill?.level??1}</Text></View><View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1,height:6,backgroundColor:C.line,borderRadius:3,overflow:'hidden'}}><View style={{height:6,width:`${ratio*100}%`,backgroundColor:C.accent}}/></View><Text style={[s.caption,{color:C.muted}]}>{(skill?.level??1)>=100?gl('Mastered'):Math.floor(p.current)+' / '+p.need+' XP'}</Text></View></View>;
}

/** Collection browsing is presentation only; existing forge commands own all costs and gates. */
export function SmithingCollection(props:Props){
 const {state,preferredRecipeId,onCraft,queueProps}=props,C=useGameTheme(),{gl,gt,language}=useGameplayText();
 const recipes=useMemo(()=>RECIPES.filter(r=>r.skillId==='smithing'&&!r.noviceSetId&&(!r.classId||r.classId===state.character?.classId)),[state.character?.classId]);
 const preferred=recipes.find(r=>r.id===preferredRecipeId);
 const [tab,setTab]=useState<'equipment'|'materials'|'tools'>(preferred&&!preferred.v33SetId?(itemDef(preferred.output.itemId).type==='tool'?'tools':'materials'):'equipment');
 const sets=useMemo(()=>EQUIPMENT_SETS.filter(set=>recipes.some(r=>r.v33SetId===set.id)),[recipes]);
 const [setId,setSetId]=useState<string|undefined>(preferred?.v33SetId??sets[0]?.id),[itemId,setItemId]=useState(preferred?.output.itemId),[tiersOpen,setTiersOpen]=useState(false),[bonusesOpen,setBonusesOpen]=useState(false),[detailsOpen,setDetailsOpen]=useState(false),[queueOpen,setQueueOpen]=useState(false),[width,setWidth]=useState(400),[now,setNow]=useState(Date.now()),[error,setError]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!preferred)return;setTab(preferred.v33SetId?'equipment':itemDef(preferred.output.itemId).type==='tool'?'tools':'materials');setSetId(preferred.v33SetId);setItemId(preferred.output.itemId);setDetailsOpen(false)},[preferredRecipeId]);
 const set=sets.find(row=>row.id===setId)??sets[0],tierSets=sets.filter(row=>row.tier===set?.tier),setIndex=tierSets.findIndex(row=>row.id===set?.id);
 const pieces=set?[...set.itemIds].sort((a,b)=>slots.indexOf(itemDef(a).slot??'')-slots.indexOf(itemDef(b).slot??'')):[];
 const selected=pieces.includes(itemId??'')?itemId!:pieces[0],recipe=recipes.find(row=>row.output.itemId===selected),item=selected?itemDef(selected):undefined;
 const status=recipe?equipmentCraftAvailability(state,recipe.id):undefined,queue=equipmentCraftQueueModel(state,now),full=queue.freeSlots<=0&&queue.freeWaiting<=0,ready=!!status?.ready&&!full;
 const owned=new Set([...state.inventory.stacks,...state.bank.stacks].filter(row=>row.quantity>0).map(row=>row.itemId));
 Object.values(state.character?.equipment??{}).forEach(id=>{if(id)owned.add(id)});
 const tileWidth=(width-32)/5,artSize=Math.max(32,Math.min(78,tileWidth-12));
 const chooseSet=(id:string)=>{setSetId(id);setItemId(undefined);setDetailsOpen(false);setBonusesOpen(false);setError('')};
 const panel={backgroundColor:C.panel,borderColor:C.line},text={color:C.text},muted={color:C.muted};
 const button=(title:string,onPress:()=>void,extra?:object)=><Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({pressed})=>[s.control,panel,extra,pressed&&s.pressed]}><Text style={[s.body,text]}>{title}</Text></Pressable>;
 const active=queue.jobs.find(job=>job.status==='active'),progress=active?Math.max(0,Math.min(1,1-active.remainingSeconds/Math.max(1,active.durationSeconds))):0;
 return <View style={s.root} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
  <View accessibilityRole="tablist" style={[s.tabs,{borderBottomColor:C.line}]}>{(['equipment','materials','tools'] as const).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:tab===value}} onPress={()=>setTab(value)} style={[s.tab,{borderBottomColor:tab===value?C.selectionLine:'transparent'}]}><Text style={[s.body,{color:tab===value?C.text:C.muted,fontWeight:tab===value?'700':'400'}]}>{gl(value[0].toUpperCase()+value.slice(1))}</Text></Pressable>)}</View>
  {tab==='equipment'&&set&&item&&recipe&&status?<>
   <View style={s.between}>{button(gl('Tier')+' '+set.tier.slice(1)+'  ⌄',()=>setTiersOpen(!tiersOpen),{minWidth:130})}<Text style={[s.body,muted]}>{state.character?.classId.toLowerCase().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</Text></View>
   {tiersOpen?<View style={s.tiers}>{[...new Set(sets.map(row=>row.tier))].map(tier=><Pressable key={tier} accessibilityRole="button" accessibilityState={{selected:tier===set.tier}} onPress={()=>{chooseSet(sets.find(row=>row.tier===tier)!.id);setTiersOpen(false)}} style={[s.control,panel,tier===set.tier&&{borderColor:C.selectionLine}]}><Text style={text}>{tier}</Text></Pressable>)}</View>:null}
   <View style={[s.setHeader,panel]}>
    {button('‹',()=>chooseSet(tierSets[(setIndex-1+tierSets.length)%tierSets.length].id))}
    <View style={s.center}>
     <Text style={[s.caption,muted]}>{gt('Set {number} / {total}',{number:setIndex+1,total:tierSets.length})}</Text>
     <Text style={[s.setName,text]}>{set.name}</Text>
     <Text style={[s.caption,text,{textAlign:'center'}]}>{profileSourceText(language,set.buildFocus)}</Text>
     <Text style={[s.caption,muted]}>{pieces.filter(id=>owned.has(id)).length} / {pieces.length} {gl('pieces owned')}</Text>
    </View>
    {button('›',()=>chooseSet(tierSets[(setIndex+1)%tierSets.length].id))}
   </View>
   <View style={s.grid}>{pieces.map(id=>{const def=itemDef(id),chosen=id===selected;return <Pressable key={id} accessibilityRole="button" accessibilityLabel={def.name+(owned.has(id)?', '+gl('Owned'):'')} accessibilityState={{selected:chosen}} onPress={()=>{setItemId(id);setDetailsOpen(false);setError('')}} style={({pressed})=>[s.tile,panel,{width:tileWidth,borderColor:chosen?C.selectionLine:C.line,backgroundColor:chosen?C.selection:C.panel},pressed&&s.pressed]}><ItemArtwork itemId={id} size={artSize}/><Text numberOfLines={1} adjustsFontSizeToFit style={[s.slot,chosen?text:muted]}>{gl(slotLabels[def.slot??'']??'Equipment')}</Text>{owned.has(id)?<View style={[s.check,{backgroundColor:C.good}]}><Text style={{color:C.bg,fontSize:10,fontWeight:'800'}}>✓</Text></View>:null}</Pressable>})}</View>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:bonusesOpen}} onPress={()=>setBonusesOpen(!bonusesOpen)} style={[s.disclosure,panel]}><Text style={[s.body,text]}>{gl('Set bonuses')}</Text><Text style={muted}>{bonusesOpen?'⌃':'⌄'}</Text></Pressable>
   {bonusesOpen?<View style={[s.detail,panel]}>{[set.twoPiece,set.fourPiece,set.sixPiece,set.eightPiece,set.tenPiece].map((bonus,i)=><Text key={i} style={[s.caption,muted]}>{(i+1)*2} · {gl(bonus)}</Text>)}</View>:null}
   <View style={[s.detail,panel]}>
    <View style={s.between}><Text style={[s.title,text]}>{item.name}</Text><Text style={[s.badge,muted,{borderColor:C.line}]}>{set.tier}</Text></View>
    <View style={s.itemHero}><ItemArtwork itemId={item.id} size={Math.min(100,width*.25)}/><View style={s.stats}>{[['Attack',item.attack],['Defense',item.defense],['Health',item.hp]].filter(([,value])=>Number(value)>0).map(([label,value])=><View key={label} style={[s.stat,{borderBottomColor:C.line}]}><Text style={[s.body,muted]}>{gl(String(label))}</Text><Text style={[s.body,text]}>+{value}</Text></View>)}<Text accessibilityLiveRegion="polite" style={[s.caption,{color:ready?C.good:C.warning}]}>{ready?gl('Ready to craft'):full?gl('Forge + backlog full'):gl(status.reason)}</Text></View></View>
    <View style={[s.materials,{borderTopColor:C.line}]}><View style={s.between}><Text style={[s.body,text]}>{gl('Materials')}</Text><Text style={[s.caption,muted]}>{gl('Owned / required')}</Text></View><View style={s.ingredients}>{status.inputs.map(input=><Pressable key={input.itemId} accessibilityRole="button" accessibilityLabel={itemDef(input.itemId).name+', '+(input.inventory+input.bank)+' / '+input.quantity} onPress={()=>setDetailsOpen(true)} style={[s.ingredient,{backgroundColor:C.panel2,borderColor:C.line}]}><ItemArtwork itemId={input.itemId} size={32}/><View style={s.flex}><Text numberOfLines={2} style={[s.caption,text]}>{itemDef(input.itemId).name}</Text><Text style={[s.body,{color:input.inventory+input.bank>=input.quantity?C.good:C.warning}]}>{input.inventory+input.bank} / {input.quantity}</Text></View></Pressable>)}</View></View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(!detailsOpen)} style={[s.disclosure,panel]}><Text style={[s.body,muted]}>{gl('Details & sources')}</Text><Text style={muted}>{detailsOpen?'⌃':'⌄'}</Text></Pressable>
    {detailsOpen?<RecipeCard key={recipe.id} state={state} recipe={recipe} status={status} onCraft={onCraft} onNavigate={props.onNavigate} onCraftPrerequisites={props.onCraftPrerequisites} onTrackPreparation={props.onTrackPreparation} detailsOnly/>:null}
    {error?<Text accessibilityRole="alert" style={{color:C.bad}}>{error}</Text>:null}
    <Pressable accessibilityRole="button" accessibilityState={{disabled:!ready}} disabled={!ready} onPress={()=>{try{onCraft(recipe.id)}catch(e){setError(e instanceof Error?e.message:String(e))}}} style={({pressed})=>[s.craft,{backgroundColor:C.primaryButton,borderColor:C.primaryButtonBorder,opacity:ready?1:.5},pressed&&s.pressed]}><ActivityArtwork id="smithing" size={24}/><Text style={[s.body,{color:C.primaryButtonText,fontWeight:'700'}]}>{gl(queue.freeSlots<=0?'Queue craft':'Craft')} · {formatQueueTimeV31(equipmentCraftDurationSeconds(state,recipe.id))} · {recipe.gold} {gl('Gold')}</Text></Pressable>
   </View>
  </>:tab==='equipment'?<Text style={[s.body,muted]}>{gl('No recipes available.')}</Text>:<CraftingRecipeBrowser key={tab} {...props} skillId="smithing" category={tab} initialQuery={preferred&&!preferred.v33SetId?props.initialQuery:''}/>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:queueOpen}} onPress={()=>setQueueOpen(!queueOpen)} style={[s.queue,panel]}><ActivityArtwork id="smithing" size={28}/><View style={s.flex}><Text style={[s.body,text]}>{gl('Forge')} · {queue.active} {gl('active')}{queue.ready?' · '+queue.ready+' '+gl('Ready'):''}{queue.waiting?' · '+queue.waiting+' '+gl('Waiting'):''}</Text>{active?<View style={[s.track,{backgroundColor:C.line}]}><View style={{width:`${progress*100}%`,height:4,backgroundColor:C.accent}}/></View>:null}</View>{active?<Text style={[s.caption,muted]}>{formatQueueTimeV31(active.remainingSeconds)}</Text>:null}<Text style={muted}>{queueOpen?'⌃':'›'}</Text></Pressable>
  {queueOpen||queue.ready>0||props.queueProps.forgeResults?.length?<EquipmentCraftQueuePanel {...queueProps}/>:null}
 </View>;
}
const s=StyleSheet.create({root:{gap:12},tabs:{flexDirection:'row',borderBottomWidth:1},tab:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderBottomWidth:2},between:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},control:{minHeight:44,minWidth:44,paddingHorizontal:12,borderWidth:1,borderRadius:8,justifyContent:'center',alignItems:'center'},body:{fontSize:14,lineHeight:20},caption:{fontSize:12,lineHeight:17},tiers:{flexDirection:'row',flexWrap:'wrap',gap:8},setHeader:{flexDirection:'row',alignItems:'center',padding:8,borderWidth:1,borderRadius:10,gap:8},center:{flex:1,alignItems:'center',gap:3},setName:{fontSize:16,lineHeight:22,fontWeight:'700',textAlign:'center'},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},tile:{borderWidth:1,borderRadius:9,paddingVertical:10,alignItems:'center',justifyContent:'center',gap:8,minHeight:84},slot:{fontSize:11,lineHeight:16,paddingHorizontal:2},check:{position:'absolute',right:4,top:4,width:16,height:16,borderRadius:8,alignItems:'center',justifyContent:'center'},disclosure:{minHeight:44,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderRadius:8},detail:{padding:12,gap:12,borderWidth:1,borderRadius:10},title:{flex:1,fontSize:19,lineHeight:25,fontWeight:'700'},badge:{borderWidth:1,borderRadius:5,paddingVertical:3,paddingHorizontal:7,fontSize:12},itemHero:{flexDirection:'row',alignItems:'center',gap:16},stats:{flex:1,gap:7},stat:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,paddingBottom:6},materials:{borderTopWidth:1,paddingTop:12,gap:10},ingredients:{flexDirection:'row',flexWrap:'wrap',gap:8},ingredient:{flexGrow:1,flexBasis:120,flexDirection:'row',alignItems:'center',gap:8,padding:8,minHeight:60,borderWidth:1,borderRadius:8},flex:{flex:1,minWidth:0},craft:{minHeight:50,borderWidth:1.5,borderRadius:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,padding:8},queue:{minHeight:58,borderWidth:1,borderRadius:10,padding:12,flexDirection:'row',alignItems:'center',gap:12},track:{height:4,borderRadius:2,overflow:'hidden',marginTop:6},pressed:{opacity:.75}});

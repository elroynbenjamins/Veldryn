import {useMemo,useState} from 'react';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState,ItemStack} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {equipmentPouch,equipmentPouchUpgradePreview} from '../core/equipment-pouch';
import {craftedGearDisplayQuality,craftedGearInstances} from '../core/crafted-gear-instances';
import {itemDef} from '../content/items';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';
import {EquipmentPreview} from './EquipmentPreview';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

const PAGE_SIZE=30;
/** Each character has a separate pouch. Forge equipment keeps its exact receipt,
 * rarity and quality, and can be equipped without passing through Inventory. */
export function EquipmentPouchPanel({state,busy=false,onAction}:{state:GameState;busy?:boolean;onAction?:(command:GameCommand)=>void|Promise<unknown>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const pouch=equipmentPouch(state),upgrade=equipmentPouchUpgradePreview(state);
 const [page,setPage]=useState(0),[selectedIndex,setSelectedIndex]=useState<number|null>(null),[gridWidth,setGridWidth]=useState(300);
 const [previewStack,setPreviewStack]=useState<ItemStack|null>(null);
 const columns=gridWidth>=600?8:gridWidth>=440?6:gridWidth>=345?5:4;
 const slotWidth=Math.max(54,Math.floor((gridWidth-(columns-1)*5)/columns));
 const pages=Math.max(1,Math.ceil(Math.max(pouch.capacity,pouch.stacks.length)/PAGE_SIZE)),shownPage=Math.min(page,pages-1),start=shownPage*PAGE_SIZE;
 const entries=Array.from({length:Math.min(PAGE_SIZE,Math.max(pouch.capacity,pouch.stacks.length)-start)},(_,index)=>pouch.stacks[start+index]);
 const copyById=useMemo(()=>new Map(craftedGearInstances(state).map(row=>[row.id,row])),[state.account.craftedGearInstances]);
 const selected=selectedIndex===null?undefined:pouch.stacks[selectedIndex];
 const record=selected?.instanceId?copyById.get(selected.instanceId):undefined;
 const item=selected?itemDef(selected.itemId):undefined;
 const rarity=selected?rarityMeta(record?.rarity??itemRarity(item!)):undefined;
 const canUpgrade=!!upgrade&&(state.character?.level??0)>=upgrade.level&&(state.character?.gold??0)>=upgrade.cost&&!busy;
 const send=(command:GameCommand)=>{setSelectedIndex(null);return onAction?.(command);};
 const choose=(stack:ItemStack|undefined,index:number)=>{if(stack)setSelectedIndex(start+index)};
 const move=(to:'inventory'|'bank')=>{if(!selected)return;
  return send(selected.instanceId?{type:'gear_move',args:{instanceId:selected.instanceId,to}}
    :{type:'equipment_pouch_move',args:{itemId:selected.itemId,quantity:1,from:'equipment_pouch',to}});
 };
 return <View style={s.root}>
  <View style={s.heading}>
   <View style={s.flex}><Text accessibilityRole="header" style={s.title}>Equipment Pouch</Text>
    <Text style={s.meta}>{pouch.stacks.length}/{pouch.capacity} slots · {state.character?.name??'Character'} only</Text></View>
  </View>
  <Text style={s.hint}>New equipment goes here first. Each forged copy keeps its own rarity and quality. The shared Bank is still available for transfers.</Text>
  <View style={s.grid} onLayout={event=>{const width=Math.floor(event.nativeEvent.layout.width);setGridWidth(previous=>previous===width?previous:width)}}>
   {entries.map((stack,index)=>{
    const copy=stack?.instanceId?copyById.get(stack.instanceId):undefined;
    const descriptor=stack?itemDef(stack.itemId):undefined,rar=descriptor?rarityMeta(copy?.rarity??itemRarity(descriptor)):undefined;
    return <Pressable key={stack?(stack.instanceId??stack.itemId+':'+(start+index)):'empty-'+(start+index)}
      accessibilityRole="button" accessibilityLabel={descriptor?descriptor.name+(copy?' · '+rar?.label+', quality '+craftedGearDisplayQuality(copy):''):'Empty equipment slot'}
      disabled={!stack} onPress={()=>choose(stack,index)} style={[s.slot,{width:slotWidth,minHeight:Math.max(62,slotWidth)},stack&&s.filled,rar&&{borderColor:rar.color}]}>
      {stack?<><ItemArtwork itemId={stack.itemId} size={Math.min(42,slotWidth-12)}/><Text style={[s.quantity,{color:rar?.color??C.text}]} numberOfLines={1}>{copy?'Q'+craftedGearDisplayQuality(copy):'×'+stack.quantity}</Text></>:<Text style={s.empty}>·</Text>}
     </Pressable>;
   })}
  </View>
  {pages>1?<View style={s.paging}><GameButton compact title="Previous" tone="secondary" disabled={shownPage===0} onPress={()=>{setSelectedIndex(null);setPage(value=>Math.max(0,value-1))}}/><Text style={s.meta}>{shownPage+1}/{pages}</Text><GameButton compact title="Next" tone="secondary" disabled={shownPage>=pages-1} onPress={()=>{setSelectedIndex(null);setPage(value=>Math.min(pages-1,value+1))}}/></View>:null}
  <View style={s.upgrade}><View style={s.flex}><Text style={s.itemName}>{upgrade?'Next: '+upgrade.capacity+' slots':'Maximum capacity reached'}</Text>{upgrade?<Text style={s.meta}>Level {upgrade.level} · {upgrade.cost.toLocaleString()} Gold</Text>:null}</View>
    <GameButton compact title={upgrade?'Upgrade':'Maxed'} tone="secondary" disabled={!canUpgrade||!onAction} onPress={()=>onAction?.({type:'equipment_pouch_upgrade'})}/></View>
  <EquipmentPreview state={state} itemId={previewStack?.itemId??null} instanceId={previewStack?.instanceId} source="equipment_pouch" onClose={()=>setPreviewStack(null)} onEquip={async()=>{
    if(!previewStack||!onAction)throw new Error('Equipment Pouch equip is unavailable');
    const result=await onAction(previewStack.instanceId?{type:'gear_equip',args:{instanceId:previewStack.instanceId}}:{type:'equipment_pouch_equip',args:{itemId:previewStack.itemId}});
    if(result===false)throw new Error('Equipment was not equipped. Please try again.');
    setPreviewStack(null);
   }}/>
  <GameModalSurface visible={!!selected} reduceMotion={state.settings.reduceMotion} onClose={()=>setSelectedIndex(null)} backdropLabel="Close Equipment Pouch details" surfaceStyle={s.modal}>
   <GameModalHeader eyebrow="EQUIPMENT · CHARACTER STORAGE" title={item?.name??'Equipment'} onClose={()=>setSelectedIndex(null)}/>
   {selected&&item?<ScrollView contentContainerStyle={s.details} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
    <View style={s.hero}><View style={[s.art,{borderColor:rarity?.color??C.line}]}><ItemArtwork itemId={item.id} size={74}/></View>
     <View style={s.flex}><Text style={[s.itemName,{color:rarity?.color??C.text}]}>{rarity?.label??'Equipment'}{record?' · Q'+craftedGearDisplayQuality(record):''}</Text>
      <Text style={s.meta}>Stored on {state.character?.name??'this character'} · {item.slot??'Gear'}</Text>
      {record?<Text style={s.meta}>{record.locked?'Locked · ':''}{record.enhancement.rank>0?'+'+record.enhancement.rank+' enhanced · ':''}Unique forged copy</Text>:<Text style={s.meta}>Standard equipment</Text>}</View>
    </View>
    <View style={s.actions}>
     <GameButton compact title="Compare & Equip" disabled={!onAction||busy} onPress={()=>{setPreviewStack(selected);setSelectedIndex(null)}}/>
     <GameButton compact tone="secondary" title="To Inventory" disabled={!onAction||busy} onPress={()=>move('inventory')}/>
     <GameButton compact tone="secondary" title="To Bank" disabled={!onAction||busy} onPress={()=>move('bank')}/>
     {record?<GameButton compact tone="secondary" title={record.locked?'Unlock':'Lock'} disabled={!onAction||busy} onPress={()=>send({type:'gear_lock',args:{instanceId:record.id,locked:!record.locked}})}/>:null}
    </View>
    {!record?<Text style={s.meta}>Standard equipment can be equipped directly. Move it to Inventory to sell or salvage.</Text>:<Text style={s.meta}>Unique equipment can be equipped directly; safeguards still protect locked, enhanced and loadout equipment.</Text>}
   </ScrollView>:null}
  </GameModalSurface>
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:spacing.sm,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel},
 heading:{flexDirection:'row',alignItems:'center',padding:spacing.xs},flex:{flex:1,minWidth:0},
 title:{...typography.title,color:C.text},meta:{...typography.caption,color:C.muted},
 hint:{...typography.caption,color:C.muted,lineHeight:16,paddingHorizontal:spacing.xs},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:5},
 slot:{padding:3,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.bg},
 filled:{backgroundColor:C.panel2},quantity:{...typography.caption,fontWeight:'900'},empty:{fontSize:16,color:C.muted},
 paging:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 upgrade:{flexDirection:'row',gap:8,alignItems:'center',borderTopWidth:1,borderColor:C.line,paddingTop:spacing.sm},
 modal:{maxHeight:'90%'},details:{gap:spacing.md,paddingBottom:spacing.md},
 hero:{flexDirection:'row',gap:spacing.md,alignItems:'center'},
 art:{width:88,height:88,borderRadius:12,borderWidth:1,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 itemName:{...typography.bodyStrong,color:C.text},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 });}

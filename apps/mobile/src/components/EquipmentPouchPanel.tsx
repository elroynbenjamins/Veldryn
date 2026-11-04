import {useMemo,useState} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import {characterEquipmentPouch} from '../core/equipment-pouch';
import {craftedGearInstances,craftedGearDisplayQuality} from '../core/crafted-gear-instances';
import {itemDef} from '../content/items';
import {rarityMeta} from '../core/item-rarity';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';
import {useGameTheme} from '../theme/ThemeContext';
import type {ThemeColors} from '../theme/theme';

/** Character-bound exact equipment copies; one occupied slot per unique Forge roll. */
export function EquipmentPouchPanel({state,busy=false,onAction}:{state:GameState;busy?:boolean;onAction?:(command:GameCommand)=>Promise<unknown>}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),pouch=characterEquipmentPouch(state);
 const records=useMemo(()=>new Map(craftedGearInstances(state).map(record=>[record.id,record])),[state.account.craftedGearInstances]);
 const [error,setError]=useState('');
 const command=(action:GameCommand)=>{if(!onAction||busy)return;setError('');void onAction(action).catch(e=>setError(e instanceof Error?e.message:'Equipment transfer failed'));};
 return <View style={s.root}>
  <View style={s.heading}><View style={s.flex}><Text accessibilityRole="header" style={s.title}>Equipment Pouch</Text><Text style={s.sub}>Only for {state.character?.name??'this character'} · unique forged equipment</Text></View><Text style={s.count}>{pouch.stacks.length}/{pouch.capacity}</Text></View>
  <Text style={s.hint}>Finished Forge equipment goes here automatically. Transfer a copy to Inventory to equip it. If full, Forge claims use Inventory, then Bank.</Text>
  {error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:null}
  {!pouch.stacks.length?<View style={s.empty}><Text style={s.sub}>No forged equipment stored yet.</Text></View>:pouch.stacks.map(stack=>{
    const record=records.get(stack.instanceId??''),item=itemDef(stack.itemId),rarity=rarityMeta(record?.rarity??'common');
    return <View key={stack.instanceId} style={[s.card,{borderColor:rarity.color}]}>
      <View style={s.row}><ItemArtwork itemId={stack.itemId} size={48}/><View style={s.flex}><Text style={[s.itemName,{color:rarity.color}]} numberOfLines={2}>{item.name}</Text><Text style={s.sub}>{rarity.label}{record?' · Q'+craftedGearDisplayQuality(record):''}{record?.locked?' · Locked':''}{record?.enhancement.rank?' · +'+record.enhancement.rank:''}</Text></View></View>
      <View style={s.actions}><View style={s.flex}><GameButton compact title="To Inventory" disabled={!onAction||busy} onPress={()=>command({type:'gear_move',args:{instanceId:stack.instanceId,to:'inventory'}})}/></View><View style={s.flex}><GameButton compact title="To Bank" tone="secondary" disabled={!onAction||busy} onPress={()=>command({type:'gear_move',args:{instanceId:stack.instanceId,to:'bank'}})}/></View><View style={s.flex}><GameButton compact title={record?.locked?'Unlock':'Lock'} tone="secondary" disabled={!record||!onAction||busy} onPress={()=>command({type:'gear_lock',args:{instanceId:stack.instanceId,locked:!record?.locked}})}/></View></View>
    </View>;
  })}
 </View>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 root:{gap:10},heading:{flexDirection:'row',alignItems:'center',gap:10},flex:{flex:1,minWidth:0},title:{fontSize:20,lineHeight:25,fontWeight:'900',color:C.text},count:{fontSize:13,fontWeight:'900',color:C.accent},sub:{fontSize:11,lineHeight:17,color:C.muted},hint:{fontSize:12,lineHeight:18,color:C.muted},card:{borderWidth:1,borderRadius:12,padding:10,backgroundColor:C.panel,gap:9},itemName:{fontSize:13,fontWeight:'900'},row:{flexDirection:'row',gap:9,alignItems:'center'},actions:{flexDirection:'row',flexWrap:'wrap',gap:5},error:{color:C.bad,fontSize:12},empty:{borderWidth:1,borderColor:C.line,borderRadius:12,padding:18,alignItems:'center'}
});}

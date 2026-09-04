import React from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {ItemDef,itemDef} from '../content/items';
import {C,radii,spacing,typography} from '../theme/theme';
import {GameButton} from './GameButton';
import {Panel} from './Panel';

type StatKey='attack'|'defense'|'hp';
const stats:{key:StatKey;label:string}[]=[{key:'attack',label:'ATK'},{key:'defense',label:'DEF'},{key:'hp',label:'HP'}];
function delta(next:number,current:number){const value=next-current;return value===0?'—':`${value>0?'+':''}${value}`}

export function ItemCard({item,quantity,equipped,selectedFood=false,onEquip,onSelectFood,onEat,onSell,onSalvage,onDeposit,onWithdraw,transferQuantity=1,transferIssue='',healAmount,onPreview}:{item:ItemDef;quantity:number;equipped?:ItemDef;selectedFood?:boolean;onEquip?:()=>void;onSelectFood?:()=>void;onEat?:()=>void;onSell?:()=>void;onSalvage?:()=>void;onDeposit?:()=>void;onWithdraw?:()=>void;transferQuantity?:number;transferIssue?:string;healAmount?:number;onPreview?:()=>void}){
  const gear=item.type==='gear';
  return <Panel>
    {onPreview&&<GameButton title="Try on / compare" tone="secondary" onPress={onPreview}/>}
    <View style={s.heading}><View style={s.copy}><Text style={s.name}>{item.name}</Text><Text style={s.meta}>{item.type.toUpperCase()}{item.slot?` · ${item.slot.toUpperCase()}`:''}</Text></View><Text style={s.qty}>×{quantity}</Text></View>
    {gear&&<><View style={s.stats}>{stats.map(({key,label})=>{const value=item[key]||0,current=equipped?.[key]||0,d=value-current;return <View key={key} style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text><Text style={[s.delta,d>0?s.better:d<0?s.worse:s.same]}>{delta(value,current)}</Text></View>})}</View><Text style={s.compare}>{equipped?`Compared with ${equipped.name}`:`Changes versus an empty ${item.slot} slot`}</Text></>}
    {item.type==='food'?<Text style={s.food}>Restores {item.heal} HP · readiness {item.readiness||0}{selectedFood?' · AUTO-EAT SELECTED':''}</Text>:!gear&&<Text style={s.value}>Sell value · {item.value} gold each</Text>}
    {item.salvage&&<Text style={s.salvage}>Salvage yields {item.salvage.quantity}× {itemDef(item.salvage.itemId).name}</Text>}
    {onEquip&&<GameButton title={`Equip ${item.slot}`} onPress={onEquip}/>} {onSelectFood&&<GameButton title={selectedFood?'Auto-eat selected':'Use for auto-eat'} disabled={selectedFood} onPress={onSelectFood}/>} {onEat&&<GameButton title={healAmount===0?'Health full':`Eat 1 · +${healAmount??item.heal} HP`} disabled={healAmount===0} tone="secondary" onPress={onEat}/>} {onSell&&<GameButton title={`Sell 1 · ${item.value} gold`} tone="secondary" onPress={onSell}/>} {onSalvage&&<GameButton title="Salvage 1" tone="danger" onPress={onSalvage}/>} {onDeposit&&<GameButton title={`Deposit ${transferQuantity} to Bank`} disabled={!!transferIssue} tone="secondary" onPress={onDeposit}/>} {onWithdraw&&<GameButton title={`Withdraw ${transferQuantity}`} disabled={!!transferIssue} tone="secondary" onPress={onWithdraw}/>}
    {!!transferIssue&&<Text style={s.salvage}>Transfer unavailable: {transferIssue}. Try a smaller quantity or free space.</Text>}
  </Panel>;
}
const s=StyleSheet.create({heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:spacing.md},copy:{flex:1},name:{...typography.title,color:C.text},meta:{...typography.caption,color:C.muted,fontWeight:'800'},qty:{fontSize:18,color:C.accent,fontWeight:'900'},stats:{flexDirection:'row',gap:spacing.sm},stat:{flex:1,backgroundColor:C.panel2,borderRadius:radii.sm,padding:spacing.sm},statLabel:{...typography.caption,color:C.muted},statValue:{...typography.bodyStrong,color:C.text},delta:{...typography.caption,fontWeight:'900'},better:{color:C.good},worse:{color:C.bad},same:{color:C.muted},compare:{...typography.caption,color:C.info},value:{...typography.body,color:C.muted},food:{...typography.bodyStrong,color:C.good},salvage:{...typography.body,color:C.warning}});

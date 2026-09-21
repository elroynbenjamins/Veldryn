import {useEffect,useMemo,useState} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {inventoryGearCopies} from '../core/crafted-gear-instances';
import {enhancedGearStats,gearEnhancement} from '../core/equipment-enhancement';
import {rarityMeta} from '../core/item-rarity';
import type {GameState} from '../core/types';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

type Props={
  visible:boolean;
  state:GameState;
  itemId:string|null;
  onClose:()=>void;
  onEquip:(instanceId:string)=>void;
  onSell:(instanceId:string)=>void;
  onSalvage:(instanceId:string)=>void;
};
const shortId=(id:string)=>id.length>12?id.slice(-10):id;
const signed=(value:number)=>value>0?`+${value}`:String(value);

export function GearCopiesModal({visible,state,itemId,onClose,onEquip,onSell,onSalvage}:Props){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const [compareIds,setCompareIds]=useState<string[]>([]);
  useEffect(()=>{setCompareIds([])},[itemId,visible]);
  if(!itemId)return null;
  const item=itemDef(itemId),copies=inventoryGearCopies(state,itemId);
  const favorite=!!state.settings.favoriteItemIds?.includes(itemId);
  const toggleCompare=(id:string)=>setCompareIds(current=>{
    if(current.includes(id))return current.filter(value=>value!==id);
    if(current.length>=2)return [current[1],id];
    return [...current,id];
  });
  const compared=compareIds.map(id=>copies.find(copy=>copy.id===id)).filter((copy):copy is NonNullable<typeof copy>=>Boolean(copy));
  const comparison=compared.length===2?(()=>{
    const [a,b]=compared,as=enhancedGearStats(state,itemId,a.id),bs=enhancedGearStats(state,itemId,b.id);
    return {a,b,as,bs};
  })():null;

  return <GameModalSurface visible={visible} reduceMotion={state.settings.reduceMotion} onClose={onClose} backdropLabel="Close equipment copy selector" surfaceStyle={s.surface}>
    <GameModalHeader eyebrow="EXACT EQUIPMENT COPIES" title={item.name} onClose={onClose}/>
    <Text style={s.help}>Each row is one physical copy. Rank, Stat Gem, Effect Gem and forged rarity stay with that exact copy.</Text>
    {comparison&&<View style={s.compare}>
      <View style={s.compareHead}><Text style={s.section}>COPY A / B COMPARISON</Text><Text style={s.compareHint}>Green delta favors B</Text></View>
      <CompareLine label="Attack" a={comparison.as.attack} b={comparison.bs.attack}/>
      <CompareLine label="Defense" a={comparison.as.defense} b={comparison.bs.defense}/>
      <CompareLine label="Health" a={comparison.as.hp} b={comparison.bs.hp}/>
      <CompareLine label="Rank" a={comparison.a.enhancement.rank} b={comparison.b.enhancement.rank}/>
    </View>}
    {!comparison&&<Text style={s.comparePrompt}>{compareIds.length===1?'Select one more copy to compare.':'Select A/B on two copies to compare them directly.'}</Text>}
    <ScrollView style={s.list} contentContainerStyle={s.listContent}>
      {copies.map((copy,index)=>{
        const rarity=rarityMeta(copy.rarity),enhancement=gearEnhancement(state,itemId,copy.id),stats=enhancedGearStats(state,itemId,copy.id);
        const selectedIndex=compareIds.indexOf(copy.id),protectedCopy=enhancement.rank>0||enhancement.gemIds.length>0;
        const statGem=enhancement.statGemId?itemDef(enhancement.statGemId):undefined,effectGem=enhancement.effectGemId?itemDef(enhancement.effectGemId):undefined;
        return <View key={copy.id} style={[s.copy,{borderColor:rarity.color,backgroundColor:rarity.surface}]}>
          <View style={s.copyTop}>
            <View style={s.flex}>
              <Text style={[s.copyTitle,{color:rarity.color}]}>COPY {index+1} · {rarity.label.toUpperCase()} {enhancement.rank?`+${enhancement.rank}`:''}</Text>
              <Text style={s.copyId}>#{shortId(copy.id)} · {copy.acquireSource==='migration'?'owned copy':copy.acquireSource}</Text>
            </View>
            <GameButton compact tone="secondary" selected={selectedIndex>=0} title={selectedIndex===0?'A':selectedIndex===1?'B':'A/B'} onPress={()=>toggleCompare(copy.id)}/>
          </View>
          <View style={s.stats}>
            <Text style={s.stat}>ATK {stats.attack}</Text><Text style={s.stat}>DEF {stats.defense}</Text><Text style={s.stat}>HP {stats.hp}</Text>
          </View>
          <View style={s.socketRow}>
            <Text style={s.socket}>STAT · {statGem?.name??'Empty'}</Text>
            <Text style={s.socket}>EFFECT · {effectGem?.name??'Empty'}</Text>
          </View>
          {protectedCopy&&<Text style={s.protected}>Enhanced copy · disposal protected</Text>}
          <View style={s.actions}>
            <View style={s.flex}><GameButton compact title="Equip this copy" onPress={()=>onEquip(copy.id)}/></View>
            {item.value>0&&<GameButton compact tone="danger" disabled={favorite||protectedCopy} title="Sell" onPress={()=>onSell(copy.id)}/>}
            {item.salvage&&<GameButton compact tone="danger" disabled={favorite||protectedCopy} title="Salvage" onPress={()=>onSalvage(copy.id)}/>}
          </View>
        </View>;
      })}
      {!copies.length&&<Text style={s.empty}>No copies of this equipment are currently in Inventory.</Text>}
    </ScrollView>
  </GameModalSurface>;

  function CompareLine({label,a,b}:{label:string;a:number;b:number}){
    const delta=b-a;
    return <View style={s.compareLine}><Text style={s.compareLabel}>{label}</Text><Text style={s.compareValue}>{a}</Text><Text style={s.arrow}>→</Text><Text style={s.compareValue}>{b}</Text><Text style={[s.delta,delta>0?s.good:delta<0?s.bad:undefined]}>{signed(delta)}</Text></View>;
  }
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
  surface:{maxHeight:'90%'},help:{...typography.body,color:C.muted,marginBottom:spacing.sm},section:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
  compare:{gap:5,padding:spacing.sm,borderWidth:1,borderColor:C.selectionLine,borderRadius:10,backgroundColor:C.selection},
  compareHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},compareHint:{...typography.caption,color:C.muted},
  compareLine:{minHeight:28,flexDirection:'row',alignItems:'center',gap:7},compareLabel:{...typography.body,color:C.muted,flex:1},compareValue:{...typography.bodyStrong,color:C.text,minWidth:40,textAlign:'right'},arrow:{color:C.muted},delta:{...typography.caption,color:C.muted,minWidth:38,textAlign:'right',fontWeight:'900'},good:{color:C.good},bad:{color:C.bad},
  comparePrompt:{...typography.caption,color:C.muted,textAlign:'center',paddingVertical:5},list:{maxHeight:560},listContent:{gap:8,paddingVertical:spacing.sm,paddingBottom:spacing.xl},
  copy:{gap:7,padding:spacing.sm,borderWidth:1,borderRadius:10},copyTop:{flexDirection:'row',alignItems:'center',gap:8},flex:{flex:1,minWidth:0},
  copyTitle:{...typography.bodyStrong,fontWeight:'900'},copyId:{...typography.caption,color:C.muted},stats:{flexDirection:'row',gap:8},stat:{...typography.caption,color:C.text,fontWeight:'900'},
  socketRow:{gap:2},socket:{...typography.caption,color:C.muted},protected:{...typography.caption,color:C.warning,fontWeight:'800'},actions:{flexDirection:'row',alignItems:'center',gap:6,flexWrap:'wrap'},empty:{...typography.body,color:C.muted,textAlign:'center',padding:spacing.lg}
});}

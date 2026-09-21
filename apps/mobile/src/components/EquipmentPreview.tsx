import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {effectiveStats} from '../core/game';
import {activeSocketedGemIds,gearEnhancement,gemSocketCapacity} from '../core/equipment-enhancement';
import {previewEquipment} from '../core/equipment-preview';
import {GameState} from '../core/types';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

function CompareRow({label,before,after}:{label:string;before:number;after:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),change=after-before;return <View style={s.statRow}><Text style={s.statLabel}>{label}</Text><Text style={s.old}>{before}</Text><Text style={s.arrow}>→</Text><Text style={s.next}>{after}</Text><Text style={[s.delta,change>0?s.better:change<0?s.worse:s.same]}>{change===0?'—':`${change>0?'+':''}${change}`}</Text></View>}

export function EquipmentPreview({state,itemId,onClose}:{state:GameState;itemId:string|null;onClose:()=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  if(!itemId)return null;
  let projected:GameState;try{projected=previewEquipment(state,itemId)}catch{return null}
  const item=itemDef(itemId),before=effectiveStats(state),after=effectiveStats(projected),rarityId=itemRarity(item),rarity=rarityMeta(rarityId),nameColor=rarityNameColor(rarityId,C.dark,C.text),enhancement=gearEnhancement(state,itemId),capacity=gemSocketCapacity(itemId),activeGems=activeSocketedGemIds(state,itemId);
  const oldId=item.slot?state.character!.equipment[item.slot]:undefined,old=oldId?itemDef(oldId):undefined,oldEnhancement=oldId?gearEnhancement(state,oldId):undefined;
  const candidateSet=item.equipmentSetId?equipmentSetDef(item.equipmentSetId):undefined,oldSet=old?.equipmentSetId&&old.equipmentSetId!==item.equipmentSetId?equipmentSetDef(old.equipmentSetId):undefined;
  const setRows=[
    candidateSet?{id:candidateSet.id,name:candidateSet.name,tier:candidateSet.tier,before:equippedSetPieceCount(state.character!.equipment,candidateSet),after:equippedSetPieceCount(projected.character!.equipment,candidateSet)}:null,
    oldSet?{id:oldSet.id,name:oldSet.name,tier:oldSet.tier,before:equippedSetPieceCount(state.character!.equipment,oldSet),after:equippedSetPieceCount(projected.character!.equipment,oldSet)}:null,
  ].filter(Boolean) as Array<{id:string;name:string;tier:string;before:number;after:number}>;
  const powerDelta=after.power-before.power;
  const leading=hasEquipmentArtwork(item)?<EquipmentArtwork item={item} compact framed={false}/>:undefined;
  return <GameModalSurface visible reduceMotion={state.settings.reduceMotion} onClose={onClose} backdropLabel="Close equipment comparison" surfaceStyle={[s.surface,{borderColor:rarity.color}]}>
    <GameModalHeader eyebrow={rarity.label.toUpperCase()+' · '+String(item.slot??'gear').toUpperCase()} title={item.name+(enhancement.rank?` +${enhancement.rank}`:'')} onClose={onClose} leading={leading}/>
    <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false}>
      <View style={[s.hero,{borderColor:rarity.color,backgroundColor:rarity.surface}]}><View style={s.flex}><Text style={[s.rarity,{color:rarity.color}]}>{rarity.symbol} {rarity.label.toUpperCase()}</Text><Text style={[s.title,{color:nameColor}]}>{item.name}{enhancement.rank?` +${enhancement.rank}`:''}</Text><Text style={s.meta}>{capacity?`◆ ${activeGems.length}/${capacity} sockets`:'No gem sockets'}{candidateSet?` · ${candidateSet.tier} ${candidateSet.name}`:''}</Text></View><View style={[s.powerBadge,powerDelta>0?s.powerGood:powerDelta<0?s.powerBad:s.powerNeutral]}><Text style={s.powerLabel}>POWER</Text><Text style={[s.powerValue,powerDelta>0?s.better:powerDelta<0?s.worse:s.same]}>{powerDelta===0?'—':`${powerDelta>0?'+':''}${powerDelta}`}</Text></View></View>
      <View style={s.replacement}><Text style={s.section}>REPLACES</Text><Text style={s.replacementName}>{old?`${old.name}${oldEnhancement?.rank?` +${oldEnhancement.rank}`:''}`:'Empty slot'}</Text></View>
      <View style={s.compare}><View style={s.compareHead}><Text style={s.section}>TOTAL LOADOUT</Text><Text style={s.legend}>Current → Preview · Change</Text></View><CompareRow label="Attack" before={before.attack} after={after.attack}/><CompareRow label="Defense" before={before.defense} after={after.defense}/><CompareRow label="Max health" before={before.hp} after={after.hp}/><CompareRow label="Power" before={before.power} after={after.power}/></View>
      {setRows.length?<View style={s.setPanel}><View style={s.compareHead}><Text style={s.section}>SET CONTEXT</Text><Text style={s.legend}>Equipped pieces after this swap</Text></View>{setRows.map(row=><View key={row.id} style={s.setRow}><View style={s.flex}><Text style={s.setName}>{row.tier} · {row.name}</Text><Text style={s.meta}>V33 ten-piece equipment set</Text></View><Text style={[s.setCount,row.after>row.before?s.better:row.after<row.before?s.worse:s.same]}>{row.before} → {row.after}/10</Text></View>)}</View>:null}
      <Text style={s.note}>Preview includes the candidate item’s current upgrade rank, socketed gems, replaced equipment and currently implemented runtime bonuses. Nothing is changed.</Text>
      <Text style={s.appearance}>Appearance remains your selected whole-character skin.</Text>
      <GameButton title="Back to Inventory" onPress={onClose}/>
    </ScrollView>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({surface:{maxWidth:680,backgroundColor:equipmentColors.panel,borderWidth:2},root:{gap:spacing.md,paddingVertical:spacing.md,paddingBottom:spacing.xl},hero:{flexDirection:'row',alignItems:'center',gap:spacing.md,borderWidth:2,borderRadius:radii.md,padding:spacing.md},flex:{flex:1,minWidth:0},rarity:{...typography.caption,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text,fontWeight:'900'},meta:{...typography.caption,color:C.muted},powerBadge:{minWidth:64,alignItems:'center',paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderRadius:radii.sm},powerGood:{borderColor:C.good,backgroundColor:C.goodSurface},powerBad:{borderColor:C.bad,backgroundColor:C.badSurface},powerNeutral:{borderColor:C.line,backgroundColor:C.panel2},powerLabel:{fontSize:7.5,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.5},powerValue:{...typography.bodyStrong,fontWeight:'900'},replacement:{padding:spacing.md,borderWidth:1,borderColor:equipmentColors.line,backgroundColor:equipmentColors.panel},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},replacementName:{...typography.bodyStrong,color:C.text,marginTop:spacing.xs},compare:{borderWidth:1,borderColor:C.line,backgroundColor:equipmentColors.panel},compareHead:{padding:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},legend:{...typography.caption,color:C.muted},statRow:{minHeight:44,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},statLabel:{...typography.body,color:C.muted,flex:1},old:{...typography.bodyStrong,color:C.text,minWidth:48,textAlign:'right'},arrow:{...typography.body,color:C.muted,paddingHorizontal:spacing.sm},next:{...typography.bodyStrong,color:C.text,minWidth:48},delta:{...typography.bodyStrong,minWidth:48,textAlign:'right'},better:{color:C.good},worse:{color:C.bad},same:{color:C.muted},setPanel:{borderWidth:1,borderColor:C.line,backgroundColor:equipmentColors.panel},setRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},setName:{...typography.bodyStrong,color:C.text},setCount:{...typography.bodyStrong,minWidth:72,textAlign:'right'},note:{...typography.body,color:C.muted},appearance:{...typography.caption,color:C.info,textAlign:'center'}});}

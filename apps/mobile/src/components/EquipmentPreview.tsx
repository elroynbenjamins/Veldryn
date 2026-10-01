import {useGameplayText} from '../i18n/gameplay';
import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {itemDef} from '../content/items';
import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {effectiveStats} from '../core/game';
import {gearEnhancement,gemSocketCapacity,gemSocketState} from '../core/equipment-enhancement';
import {previewEquipment} from '../core/equipment-preview';
import {GameState} from '../core/types';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

function CompareRow({label,before,after}:{label:string;before:number;after:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),change=after-before;return <View style={s.statRow}><Text style={s.statLabel}>{label}</Text><Text style={s.old}>{before}</Text><Text style={s.arrow}>→</Text><Text style={s.next}>{after}</Text><Text style={[s.delta,change>0?s.better:change<0?s.worse:s.same]}>{change===0?'—':`${change>0?'+':''}${change}`}</Text></View>}

export function EquipmentPreview({state,itemId,onClose,onEquip,onInspect,onFavorite,onDeposit}:{state:GameState;itemId:string|null;onClose:()=>void;onEquip?:()=>void;onInspect?:()=>void;onFavorite?:()=>void;onDeposit?:()=>void}){
 const {gt,gl,language}=useGameplayText();
 const {height}=useWindowDimensions();
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  if(!itemId)return null;
  let projected:GameState;try{projected=previewEquipment(state,itemId)}catch(error){return <GameModalSurface visible onClose={onClose} backdropLabel={gt("Close equipment comparison")}><GameModalHeader title={gl('Compare equipment')} onClose={onClose}/><Text style={s.note}>{gl(error instanceof Error?error.message:'Equipment unavailable')}</Text><GameButton title={gt("Back to Inventory")} onPress={onClose}/></GameModalSurface>}
  const item=itemDef(itemId),before=effectiveStats(state),after=effectiveStats(projected),rarityId=itemRarity(item),rarity=rarityMeta(rarityId),nameColor=rarityNameColor(rarityId,C.dark,C.text),enhancement=gearEnhancement(state,itemId),capacity=gemSocketCapacity(itemId),sockets=gemSocketState(state,itemId);
  const oldId=item.slot?state.character!.equipment[item.slot]:undefined,old=oldId?itemDef(oldId):undefined,oldEnhancement=oldId?gearEnhancement(state,oldId):undefined;
  const candidateSet=item.equipmentSetId?equipmentSetDef(item.equipmentSetId):undefined,oldSet=old?.equipmentSetId&&old.equipmentSetId!==item.equipmentSetId?equipmentSetDef(old.equipmentSetId):undefined;
  const setRows=[
    candidateSet?{id:candidateSet.id,name:candidateSet.name,tier:candidateSet.tier,before:equippedSetPieceCount(state.character!.equipment,candidateSet),after:equippedSetPieceCount(projected.character!.equipment,candidateSet)}:null,
    oldSet?{id:oldSet.id,name:oldSet.name,tier:oldSet.tier,before:equippedSetPieceCount(state.character!.equipment,oldSet),after:equippedSetPieceCount(projected.character!.equipment,oldSet)}:null,
  ].filter(Boolean) as Array<{id:string;name:string;tier:string;before:number;after:number}>;
  const powerDelta=after.power-before.power;
  const leading=hasEquipmentArtwork(item)?<EquipmentArtwork item={item} compact framed={false}/>:undefined;
  return <GameModalSurface visible reduceMotion={state.settings.reduceMotion} onClose={onClose} backdropLabel={gt("Close equipment comparison")} surfaceStyle={[s.surface,{height:Math.min(height*.88,900)}]}>
    <GameModalHeader eyebrow={gl('EQUIPMENT PREVIEW')} title={gl('Compare equipment')} onClose={onClose}/>
    <ScrollView style={{flex:1}} contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
      <View style={s.hero}><EquipmentArtwork item={item} size={112} framed={false}/><View style={s.flex}><Text style={[s.rarity,{color:rarity.color}]}>{rarity.symbol} {rarity.label.toUpperCase()}</Text><Text style={[s.title,{color:nameColor}]}>{item.name}{enhancement.rank?` +${enhancement.rank}`:''}</Text><Text style={s.meta}>{capacity?`S ${sockets.statGemId?'◆':'◇'} · FX ${sockets.effectGemId?'✦':'◇'}`:gt("No gem sockets")}{candidateSet?` · ${candidateSet.tier} ${candidateSet.name}`:''}</Text></View><View style={[s.powerBadge,powerDelta>0?s.powerGood:powerDelta<0?s.powerBad:s.powerNeutral]}><Text style={s.powerLabel}>{gt("Power").toLocaleUpperCase(language)}</Text><Text style={[s.powerValue,powerDelta>0?s.better:powerDelta<0?s.worse:s.same]}>{powerDelta===0?'—':`${powerDelta>0?'+':''}${powerDelta}`}</Text></View></View>
      <View style={s.replacement}><Text style={s.section}>{gt("REPLACES")}</Text><Text style={s.replacementName}>{old?`${old.name}${oldEnhancement?.rank?` +${oldEnhancement.rank}`:''}`:gt("Empty slot")}</Text></View>
      <View style={s.compare}><View style={s.compareHead}><Text style={s.section}>{gt("TOTAL LOADOUT")}</Text><Text style={s.legend}>{gt("Current → Preview · Change")}</Text></View><CompareRow label={gt("Attack")} before={before.attack} after={after.attack}/><CompareRow label={gt("Defense")} before={before.defense} after={after.defense}/><CompareRow label={gt("Max health")} before={before.hp} after={after.hp}/><CompareRow label={gt("Power")} before={before.power} after={after.power}/></View>
      {setRows.length?<View style={s.setPanel}><View style={s.compareHead}><Text style={s.section}>{gt("SET CONTEXT")}</Text><Text style={s.legend}>{gt("Equipped pieces after this swap")}</Text></View>{setRows.map(row=><View key={row.id} style={s.setRow}><View style={s.flex}><Text style={s.setName}>{row.tier} · {row.name}</Text><Text style={s.meta}>{gl("Equipped pieces")}</Text></View><Text style={[s.setCount,row.after>row.before?s.better:row.after<row.before?s.worse:s.same]}>{row.before} → {row.after}/10</Text></View>)}</View>:null}
      <Text style={s.note}>{gl("Includes upgrades, socketed gems and set bonuses. Equip to apply.")}</Text>
      {onInspect?<GameButton title={gl('Sources & crafting uses')} tone="secondary" onPress={onInspect}/>:null}
      {onEquip?<GameButton title={oldId===itemId?gl('Currently equipped'):gt('Equip {slot}',{slot:gl(item.slot)})} disabled={oldId===itemId} onPress={onEquip}/>:null}
      <View style={s.actions}>{onFavorite?<View style={s.flex}><GameButton compact title={state.settings.favoriteItemIds?.includes(itemId)?gt('Remove favorite'):gt('Favorite')} tone="secondary" onPress={onFavorite}/></View>:null}{onDeposit?<View style={s.flex}><GameButton compact title={gt('Deposit')} tone="secondary" onPress={onDeposit}/></View>:null}{onInspect?<View style={s.flex}><GameButton compact title={gl('More')} tone="secondary" onPress={onInspect}/></View>:null}</View>
      <GameButton title={gt("Back to Inventory")} tone="secondary" onPress={onClose}/>
    </ScrollView>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({actions:{flexDirection:'row',flexWrap:'wrap',gap:8},surface:{maxWidth:680,backgroundColor:equipmentColors.panel,borderWidth:1,borderColor:C.lineStrong},root:{gap:spacing.md,paddingVertical:spacing.md,paddingBottom:spacing.xl},hero:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:spacing.md,borderWidth:1,borderColor:C.line,backgroundColor:C.stage,borderRadius:radii.md,padding:spacing.md},flex:{flex:1,minWidth:0},rarity:{...typography.caption,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text,fontWeight:'900'},meta:{...typography.caption,color:C.muted},powerBadge:{minWidth:64,alignItems:'center',paddingHorizontal:spacing.sm,paddingVertical:spacing.xs,borderWidth:1,borderRadius:radii.sm},powerGood:{borderColor:C.good,backgroundColor:C.goodSurface},powerBad:{borderColor:C.bad,backgroundColor:C.badSurface},powerNeutral:{borderColor:C.line,backgroundColor:C.panel2},powerLabel:{fontSize:7.5,lineHeight:10,color:C.muted,fontWeight:'900',letterSpacing:.5},powerValue:{...typography.bodyStrong,fontWeight:'900'},replacement:{padding:spacing.md,borderWidth:1,borderColor:equipmentColors.line,backgroundColor:equipmentColors.panel},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},replacementName:{...typography.bodyStrong,color:C.text,marginTop:spacing.xs},compare:{borderWidth:1,borderRadius:radii.md,overflow:'hidden',borderColor:C.line,backgroundColor:equipmentColors.panel},compareHead:{padding:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},legend:{...typography.caption,color:C.muted},statRow:{minHeight:44,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},statLabel:{...typography.body,color:C.muted,flex:1},old:{...typography.bodyStrong,color:C.text,minWidth:48,textAlign:'right'},arrow:{...typography.body,color:C.muted,paddingHorizontal:spacing.sm},next:{...typography.bodyStrong,color:C.text,minWidth:48},delta:{...typography.bodyStrong,minWidth:48,textAlign:'right'},better:{color:C.good},worse:{color:C.bad},same:{color:C.muted},setPanel:{borderWidth:1,borderRadius:radii.md,overflow:'hidden',borderColor:C.line,backgroundColor:equipmentColors.panel},setRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.md,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},setName:{...typography.bodyStrong,color:C.text},setCount:{...typography.bodyStrong,minWidth:72,textAlign:'right'},note:{...typography.body,color:C.muted},appearance:{...typography.caption,color:C.info,textAlign:'center'}});}

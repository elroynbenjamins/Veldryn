import {useMemo} from 'react';
import {Modal,SafeAreaView,ScrollView,StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {effectiveStats} from '../core/game';
import {gearEnhancement,gemSocketCapacity} from '../core/equipment-enhancement';
import {previewEquipment} from '../core/equipment-preview';
import {GameState} from '../core/types';
import {itemRarity,rarityMeta} from '../core/item-rarity';
import {radii,spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';

function CompareRow({label,before,after}:{label:string;before:number;after:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);const change=after-before;return <View style={s.statRow}><Text style={s.statLabel}>{label}</Text><Text style={s.old}>{before}</Text><Text style={s.arrow}>→</Text><Text style={s.next}>{after}</Text><Text style={[s.delta,change>0?s.better:change<0?s.worse:s.same]}>{change===0?'—':`${change>0?'+':''}${change}`}</Text></View>}

export function EquipmentPreview({state,itemId,onClose}:{state:GameState;itemId:string|null;onClose:()=>void}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  if(!itemId)return null;
  let projected:GameState;try{projected=previewEquipment(state,itemId)}catch{return null}
  const item=itemDef(itemId),before=effectiveStats(state),after=effectiveStats(projected),rarity=rarityMeta(itemRarity(item)),enhancement=gearEnhancement(state,itemId),capacity=gemSocketCapacity(itemId);
  const oldId=item.slot?state.character!.equipment[item.slot]:undefined,old=oldId?itemDef(oldId):undefined,oldEnhancement=oldId?gearEnhancement(state,oldId):undefined;
  return <Modal visible animationType={state.settings.reduceMotion?'none':'slide'} onRequestClose={onClose}><SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.root}>
    <View style={s.top}><Text style={s.eyebrow}>ITEM COMPARISON</Text><GameButton title="Close" tone="secondary" onPress={onClose}/></View>
    <View style={[s.hero,{borderColor:rarity.color,backgroundColor:rarity.surface}]}>{hasEquipmentArtwork(item)&&<EquipmentArtwork item={item}/>}<View style={s.flex}><Text style={[s.rarity,{color:rarity.color}]}>{rarity.symbol} {rarity.label.toUpperCase()} · {item.slot?.toUpperCase()}</Text><Text style={s.title}>{item.name}{enhancement.rank?` +${enhancement.rank}`:''}</Text><Text style={s.meta}>{capacity?`◆ ${enhancement.gemIds.length}/${capacity} gems`:'No gem sockets'}</Text></View></View>
    <View style={s.replacement}><Text style={s.section}>REPLACES</Text><Text style={s.replacementName}>{old?`${old.name}${oldEnhancement?.rank?` +${oldEnhancement.rank}`:''}`:'Empty slot'}</Text></View>
    <View style={s.compare}><View style={s.compareHead}><Text style={s.section}>TOTAL LOADOUT</Text><Text style={s.legend}>Current → Preview · Change</Text></View><CompareRow label="Attack" before={before.attack} after={after.attack}/><CompareRow label="Defense" before={before.defense} after={after.defense}/><CompareRow label="Max health" before={before.hp} after={after.hp}/><CompareRow label="Power" before={before.power} after={after.power}/></View>
    <Text style={s.note}>Preview includes this item’s upgrade rank, socketed gems, replaced equipment, and active novice-set bonus. Nothing is changed.</Text>
    <Text style={s.appearance}>Appearance remains your selected whole-character skin.</Text>
    <GameButton title="Back to Inventory" onPress={onClose}/>
  </ScrollView></SafeAreaView></Modal>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({safe:{flex:1,backgroundColor:equipmentColors.background},root:{flexGrow:1,padding:spacing.lg,gap:spacing.md,paddingBottom:spacing.xl},top:{minHeight:48,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md},eyebrow:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1.2},hero:{flexDirection:'row',alignItems:'center',gap:spacing.md,borderWidth:2,borderRadius:radii.md,padding:spacing.md},flex:{flex:1,minWidth:0},rarity:{...typography.caption,fontWeight:'900',letterSpacing:.8},title:{...typography.title,color:C.text},meta:{...typography.caption,color:C.muted},replacement:{padding:spacing.md,borderWidth:1,borderColor:equipmentColors.line,backgroundColor:equipmentColors.panel},section:{...typography.caption,color:equipmentColors.goldSoft,fontWeight:'900',letterSpacing:1},replacementName:{...typography.bodyStrong,color:C.text,marginTop:spacing.xs},compare:{borderWidth:1,borderColor:C.line,backgroundColor:equipmentColors.panel},compareHead:{padding:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},legend:{...typography.caption,color:C.muted},statRow:{minHeight:44,flexDirection:'row',alignItems:'center',paddingHorizontal:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},statLabel:{...typography.body,color:C.muted,flex:1},old:{...typography.bodyStrong,color:C.text,minWidth:48,textAlign:'right'},arrow:{...typography.body,color:C.muted,paddingHorizontal:spacing.sm},next:{...typography.bodyStrong,color:C.text,minWidth:48},delta:{...typography.bodyStrong,minWidth:48,textAlign:'right'},better:{color:C.good},worse:{color:C.bad},same:{color:C.muted},note:{...typography.body,color:C.muted},appearance:{...typography.caption,color:C.info,textAlign:'center'}});}

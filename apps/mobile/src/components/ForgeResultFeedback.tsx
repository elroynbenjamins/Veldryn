import {useEffect,useMemo,useRef} from 'react';
import {Animated,StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import type {ForgeCraftResult} from '../core/game-commands';
import {rarityMeta,rarityNameColor,type ItemRarity} from '../core/item-rarity';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {ActionFeedback} from './ActionFeedback';
import {EquipmentArtwork} from './EquipmentArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

const RARITY_ORDER:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
function highest(results:readonly ForgeCraftResult[]){return results.slice().sort((a,b)=>RARITY_ORDER.indexOf(b.rarity)-RARITY_ORDER.indexOf(a.rarity))[0];}
export function forgeClaimBannerMessage(results:readonly ForgeCraftResult[]){
  if(!results.length)return '';
  if(results.length===1){const result=results[0],item=itemDef(result.itemId);return `Forged ${item.name} · ${rarityMeta(result.rarity).label}${result.duplicateCount?` · copy ${result.duplicateCount+1}`:''}.`;}
  const best=highest(results);return `${results.length} equipment pieces claimed · best result ${rarityMeta(best.rarity).label}.`;
}

export function ForgeClaimBanner({results,reduceMotion,onDismiss}:{results:readonly ForgeCraftResult[];reduceMotion:boolean;onDismiss:()=>void}){
  const dismissRef=useRef(onDismiss);dismissRef.current=onDismiss;
  useEffect(()=>{if(!results.length||results.some(row=>row.qualityProc))return;const timer=setTimeout(()=>dismissRef.current(),4500);return()=>clearTimeout(timer)},[results]);
  if(!results.length||results.some(row=>row.qualityProc))return null;
  return <ActionFeedback message={forgeClaimBannerMessage(results)} tone="success" reduceMotion={reduceMotion} compact/>;
}

export function ForgeRarityRevealModal({results,reduceMotion,onClose,onInventory}:{results:readonly ForgeCraftResult[];reduceMotion:boolean;onClose:()=>void;onInventory:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),scale=useRef(new Animated.Value(1)).current;
  const procs=results.filter(row=>row.qualityProc),best=procs.length?highest(procs):undefined,bestMeta=best?rarityMeta(best.rarity):undefined;
  useEffect(()=>{scale.stopAnimation();scale.setValue(1);if(!procs.length||reduceMotion)return;Animated.sequence([Animated.spring(scale,{toValue:1.035,damping:8,stiffness:210,mass:.65,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:15,stiffness:190,mass:.8,useNativeDriver:true})]).start();return()=>scale.stopAnimation()},[best?.instanceId,procs.length,reduceMotion,scale]);
  if(!procs.length)return null;
  return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel="Close Forge result" surfaceStyle={[s.dialog,bestMeta&&{borderColor:bestMeta.color}]}>
    <GameModalHeader eyebrow="EXCEPTIONAL FORGE RESULT" title={procs.length===1?`${bestMeta!.label} quality proc`:`${procs.length} quality procs`} onClose={onClose}/>
    <Animated.View style={[s.reveal,{transform:[{scale}]}]}>
      <Text style={[s.revealMark,{color:bestMeta?.color}]}>{bestMeta?.symbol} {bestMeta?.label.toUpperCase()} {bestMeta?.symbol}</Text>
      <Text style={s.revealCopy}>{procs.length===1?'The Forge produced a rarer crafted copy.':'Multiple finished crafts produced rarer copies.'}</Text>
    </Animated.View>
    <View style={s.results}>{procs.map(result=>{const item=itemDef(result.itemId),meta=rarityMeta(result.rarity),base=rarityMeta(result.baseRarity),bonus=Math.max(0,Math.round((result.statMultiplier-1)*100));return <View key={result.instanceId} style={[s.result,{borderColor:meta.color,backgroundColor:meta.surface}]}>
      <View style={[s.artFrame,{borderColor:meta.color}]}><EquipmentArtwork item={item} compact framed={false}/></View>
      <View style={s.flex}><Text style={[s.itemName,{color:rarityNameColor(result.rarity,C.dark,C.text)}]}>{item.name}</Text><Text style={s.meta}>{base.label} base → {meta.label} crafted copy</Text><Text style={[s.bonus,{color:meta.color}]}>+{bonus}% equipment stats vs this item's base rarity</Text>{result.duplicateCount>0?<Text style={s.copy}>Crafted copy #{result.duplicateCount+1} owned</Text>:<Text style={s.copy}>First crafted copy owned</Text>}</View>
      <View style={[s.rarityBadge,{borderColor:meta.color}]}><Text style={[s.rarityText,{color:meta.color}]}>{meta.label.toUpperCase()}</Text></View>
    </View>})}</View>
    {results.length>procs.length?<Text style={s.normal}>{results.length-procs.length} additional normal craft{results.length-procs.length===1?'':'s'} claimed at the same time.</Text>:null}
    <View style={s.actions}><View style={s.action}><GameButton title="Continue forging" tone="secondary" onPress={onClose}/></View><View style={s.action}><GameButton title="View inventory" onPress={onInventory}/></View></View>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 dialog:{gap:spacing.md,borderWidth:2,backgroundColor:E.panel},reveal:{alignItems:'center',gap:4,padding:spacing.md,borderWidth:1,borderColor:E.line,backgroundColor:E.stage,borderRadius:radii.md},revealMark:{...typography.title,fontWeight:'900',letterSpacing:1},revealCopy:{...typography.caption,color:C.muted,textAlign:'center'},results:{gap:spacing.sm},result:{minHeight:78,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderWidth:1,borderRadius:radii.md,padding:spacing.sm},artFrame:{width:56,height:56,alignItems:'center',justifyContent:'center',borderWidth:2,borderRadius:radii.sm,backgroundColor:C.stage},flex:{flex:1,minWidth:0},itemName:{...typography.bodyStrong,fontWeight:'900'},meta:{...typography.caption,color:C.muted},bonus:{...typography.caption,fontWeight:'900'},copy:{fontSize:9,lineHeight:12,color:C.muted},rarityBadge:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderRadius:99},rarityText:{fontSize:8,fontWeight:'900',letterSpacing:.5},normal:{...typography.caption,color:C.muted,textAlign:'center'},actions:{flexDirection:'row',gap:spacing.sm},action:{flex:1},
 });}

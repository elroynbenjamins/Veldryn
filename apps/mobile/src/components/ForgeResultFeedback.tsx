import {useGameplayText} from '../i18n/gameplay';
import {useEffect,useMemo,useRef} from 'react';
import {Animated,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
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
/** Legendary and Mythic gear get a special reveal, whether upgraded or crafted at their base rarity. Never celebrate gear that was auto-sold on arrival. */
export function isExceptionalForgeResult(result:ForgeCraftResult){return result.autoSold!=='incoming'&&(result.rarity==='legendary'||result.rarity==='mythic');}
function highest(results:readonly ForgeCraftResult[]){return results.slice().sort((a,b)=>RARITY_ORDER.indexOf(b.rarity)-RARITY_ORDER.indexOf(a.rarity))[0];}
export function forgeClaimBannerMessage(results:readonly ForgeCraftResult[]){
  if(!results.length)return '';
  if(results.length===1){const result=results[0],item=itemDef(result.itemId);return `Forged ${item.name} · ${rarityMeta(result.rarity).label}${result.quality!==undefined?` · Q${result.quality}/100`:''}${result.autoSold==='incoming'?` · auto-sold new gear for ${result.saleGold} Gold`:result.autoSold==='existing'?` · sold weaker existing gear for ${result.saleGold} Gold`:' · sent to your Equipment Pouch (or fallback storage)'}.`;}
  const best=highest(results),sold=results.filter(row=>row.autoSold),gold=sold.reduce((sum,row)=>sum+row.saleGold,0);return `${results.length} Forge jobs settled · ${sold.length?`${sold.length} auto-sold for ${gold} Gold · `:''}best roll ${rarityMeta(best.rarity).label}.`;
}

export function ForgeClaimBanner({results,reduceMotion,onDismiss}:{results:readonly ForgeCraftResult[];reduceMotion:boolean;onDismiss:()=>void}){
  const C=useGameTheme(),best=results.length?highest(results):undefined,meta=best?rarityMeta(best.rarity):undefined;
  const dismissRef=useRef(onDismiss);dismissRef.current=onDismiss;
  useEffect(()=>{if(!results.length||results.some(isExceptionalForgeResult))return;const timer=setTimeout(()=>dismissRef.current(),4500);return()=>clearTimeout(timer)},[results]);
  if(!results.length||results.some(isExceptionalForgeResult))return null;
  return <ActionFeedback message={forgeClaimBannerMessage(results)} tone="success" reduceMotion={reduceMotion} compact accentColor={meta?.color} accentSurface={meta?.surface} highlightText={meta?.label} highlightTextColor={meta?(C.dark?meta.color:meta.lightTextColor):undefined}/>;
}

export function ForgeRarityRevealModal({results,reduceMotion,onClose,onInventory}:{results:readonly ForgeCraftResult[];reduceMotion:boolean;onClose:()=>void;onInventory:()=>void}){
 const {gt}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,fontScale}=useWindowDimensions(),stackActions=width<360||fontScale>=1.25,scale=useRef(new Animated.Value(1)).current;
  const procs=results.filter(isExceptionalForgeResult),best=procs.length?highest(procs):undefined,bestMeta=best?rarityMeta(best.rarity):undefined;
  useEffect(()=>{scale.stopAnimation();scale.setValue(1);if(!procs.length||reduceMotion)return;Animated.sequence([Animated.spring(scale,{toValue:best?.rarity==='mythic'?1.085:1.045,damping:9,stiffness:200,mass:.65,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:15,stiffness:190,mass:.8,useNativeDriver:true})]).start();return()=>scale.stopAnimation()},[best?.instanceId,best?.rarity,procs.length,reduceMotion,scale]);
  if(!procs.length)return null;
  return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel={gt("Close Forge result")} surfaceStyle={[s.dialog,bestMeta&&{borderColor:bestMeta.color,borderWidth:best?.rarity==='mythic'?3:2}]}>
    <GameModalHeader eyebrow={gt("EXCEPTIONAL FORGE RESULT")} title={procs.length===1?`${bestMeta!.label} gear forged`:`${procs.length} exceptional Forge results`} onClose={onClose}/>
    <Animated.View style={[s.reveal,bestMeta&&{borderColor:bestMeta.color,borderWidth:bestMeta.borderWidth,backgroundColor:bestMeta.surface},{transform:[{scale}]}]}>
      <Text style={[s.revealMark,{color:bestMeta?.color}]}>{bestMeta?.symbol} {bestMeta?.label.toUpperCase()} {bestMeta?.symbol}</Text>
      <Text style={s.revealCopy}>{"Equipment Pouch first · Inventory or Bank if full"}</Text>
    </Animated.View>
    <View style={s.results}>{procs.map(result=>{const item=itemDef(result.itemId),meta=rarityMeta(result.rarity),base=rarityMeta(result.baseRarity),bonus=Math.round((result.statMultiplier-1)*100);return <View key={result.instanceId} style={[s.result,{borderColor:meta.color,backgroundColor:meta.surface}]}>
      <View style={[s.artFrame,{borderColor:meta.color}]}><EquipmentArtwork item={item} rarity={result.rarity} compact framed={false}/></View>
      <View style={s.flex}><Text style={[s.itemName,{color:rarityNameColor(result.rarity,C.dark,C.text)}]}>{item.name}</Text><Text style={s.meta}>{result.qualityProc?`${base.label} → ${meta.label}`:meta.label} gear{result.quality!==undefined?` · Q${result.quality}/100`:''}</Text>{bonus>0?<Text style={[s.bonus,{color:meta.color}]}>+{bonus}% equipment stats vs base gear</Text>:null}{result.autoSold?<Text style={s.copy}>{result.autoSold==='incoming'?'New gear auto-sold; existing gear kept':'Weaker gear sold; stronger gear kept'} · +{result.saleGold} Gold</Text>:<Text style={s.copy}>{"Equipment Pouch first · Inventory or Bank if full"}</Text>}</View>
      <View style={[s.rarityBadge,{borderColor:meta.color}]}><Text style={[s.rarityText,{color:meta.color}]}>{meta.label.toUpperCase()}</Text></View>
    </View>})}</View>
    {results.length>procs.length?<Text style={s.normal}>{results.length-procs.length} other Forge job{results.length-procs.length===1?'':'s'} completed at the same time.</Text>:null}
    <View style={[s.actions,stackActions&&s.actionsStack]}><View style={[s.action,stackActions&&s.actionStack]}><GameButton title={gt("Continue forging")} tone="secondary" onPress={onClose}/></View><View style={[s.action,stackActions&&s.actionStack]}><GameButton title="View Gear storage" onPress={onInventory}/></View></View>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 dialog:{gap:spacing.md,borderWidth:2,backgroundColor:E.panel},reveal:{alignItems:'center',gap:4,padding:spacing.md,borderWidth:1,borderColor:E.line,backgroundColor:E.stage,borderRadius:radii.md},revealMark:{...typography.title,fontWeight:'900',letterSpacing:1},revealCopy:{...typography.caption,color:C.muted,textAlign:'center'},results:{gap:spacing.sm},result:{minHeight:78,flexDirection:'row',alignItems:'center',gap:spacing.sm,borderWidth:1,borderRadius:radii.md,padding:spacing.sm},artFrame:{width:56,height:56,alignItems:'center',justifyContent:'center',borderWidth:2,borderRadius:radii.sm,backgroundColor:C.stage},flex:{flex:1,minWidth:0},itemName:{...typography.bodyStrong,fontWeight:'900'},meta:{...typography.caption,color:C.muted},bonus:{...typography.caption,fontWeight:'900'},copy:{fontSize:9,lineHeight:12,color:C.muted},rarityBadge:{paddingHorizontal:7,paddingVertical:4,borderWidth:1,borderRadius:99},rarityText:{fontSize:8,fontWeight:'900',letterSpacing:.5},normal:{...typography.caption,color:C.muted,textAlign:'center'},actions:{flexDirection:'row',gap:spacing.sm},actionsStack:{flexDirection:'column'},action:{flex:1},actionStack:{flex:0,width:'100%'},
 });}

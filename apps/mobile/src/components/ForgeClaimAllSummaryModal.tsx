import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {itemDef} from '../content/items';
import {equipmentRecipeForItem} from '../core/equipment-crafting-path';
import type {ForgeCraftResult} from '../core/game-commands';
import {rarityMeta,rarityNameColor,type ItemRarity} from '../core/item-rarity';
import {useGameplayText} from '../i18n/gameplay';
import {equipmentTheme,radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork} from './EquipmentArtwork';
import {ItemArtwork} from './ItemArtwork';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';

const RARITIES:ItemRarity[]=['common','uncommon','rare','epic','legendary','mythic'];
const byBestRoll=(a:ForgeCraftResult,b:ForgeCraftResult)=>
  RARITIES.indexOf(b.rarity)-RARITIES.indexOf(a.rarity)||(b.quality??0)-(a.quality??0);

/** An incoming auto-sold result was not collected. Replacing an existing
 * weaker copy, however, means the newly forged equipment WAS retained. */
export function forgeClaimAllSummaryGroups(results:readonly ForgeCraftResult[]){
  const kept=results.filter(result=>result.autoSold!=='incoming').sort(byBestRoll);
  const sold=results.filter(result=>result.autoSold==='incoming').sort(byBestRoll);
  const incomingGold=sold.reduce((sum,result)=>sum+result.saleGold,0);
  const replaced=kept.filter(result=>result.autoSold==='existing');
  const replacedGold=replaced.reduce((sum,result)=>sum+result.saleGold,0);
  return {kept,sold,replaced,incomingGold,replacedGold};
}

function ForgeResultRow({result,sold=false}:{result:ForgeCraftResult;sold?:boolean}){
  const {gt}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  // A newer server catalog must never crash an older client merely because
  // its claimed item is not yet present in this build's catalog.
  let item:ReturnType<typeof itemDef>|undefined;
  try{item=itemDef(result.itemId);}catch{/* Keep the original item identifier visible. */}
  const rarity=rarityMeta(result.rarity);
  const tier=equipmentRecipeForItem(result.itemId)?.v33EquipmentTier
    ??result.itemId.match(/(?:^|[_-])(T[1-9])(?:[_-]|$)/i)?.[1];
  const name=item?.name??result.itemId.replace(/_/g,' ');
  return <View accessible accessibilityLabel={[name,tier,rarity.label,result.quality===undefined?null:'Quality '+result.quality,gt(sold?'Auto-sold':'Collected')].filter(Boolean).join(', ')} style={[s.itemRow,sold&&s.soldRow]}>
    <View style={[s.art,{borderWidth:rarity.borderWidth,borderColor:rarity.color,backgroundColor:rarity.surface}]}>
      {item?<EquipmentArtwork item={item} rarity={result.rarity} size={44} compact framed={false}/>:<ItemArtwork itemId={result.itemId} size={42}/> }
    </View>
    <View style={s.itemBody}>
      <Text numberOfLines={2} style={[s.itemName,{color:rarityNameColor(result.rarity,C.dark,C.text)}]}>{name}</Text>
      <View style={s.metaRow}>
        {tier?<Text style={s.metaChip}>{tier.toUpperCase()}</Text>:null}
        <Text style={[s.rarityChip,{color:C.dark?rarity.color:rarity.lightTextColor,borderColor:rarity.color}]}>{rarity.label}</Text>
        {result.quality!==undefined?<Text style={s.metaChip}>Q{result.quality}/100</Text>:null}
      </View>
      {sold?<Text style={s.saleNote}>{gt('Auto-sold new gear')} · +{result.saleGold.toLocaleString()} Gold</Text>
        :result.autoSold==='existing'?<Text style={s.saleNote}>{gt('Weaker copy sold')} · +{result.saleGold.toLocaleString()} Gold</Text>:null}
    </View>
  </View>;
}

/** One compact, scrollable receipt for Claim All; unlike the exceptional reveal
 * it lists every successful equipment result, not only Legendary/Mythic rolls. */
export function ForgeClaimAllSummaryModal({results,remainingCount=0,reduceMotion,onClose,onInventory}:{results:readonly ForgeCraftResult[];remainingCount?:number;reduceMotion:boolean;onClose:()=>void;onInventory:()=>void}){
  const {gt}=useGameplayText();
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{width,height,fontScale}=useWindowDimensions();
  const groups=useMemo(()=>forgeClaimAllSummaryGroups(results),[results]);
  const stackActions=width<360||fontScale>=1.25;
  if(!results.length)return null;
  const {kept,sold,replaced,incomingGold,replacedGold}=groups;
  return <GameModalSurface visible presentation="dialog" reduceMotion={reduceMotion} onClose={onClose} backdropLabel={gt('Close Forge collection')} surfaceStyle={s.dialog}>
    <GameModalHeader eyebrow={gt('FORGE · CLAIM ALL')} title={gt('Collection summary')} onClose={onClose}/>
    <View style={s.overview}>
      <Text style={s.overviewCount}>{gt('Equipment collected: {count}',{count:kept.length})}</Text>
      {kept.length>0?<Text style={s.overviewDetail}>{gt('Equipment Pouch first · Inventory or Bank if full')}</Text>:null}
      {sold.length>0?<Text style={s.soldCount}>{gt('Auto-sold incoming: {count}',{count:sold.length})} · +{incomingGold.toLocaleString()} Gold</Text>:null}
      {replaced.length>0?<Text style={s.soldCount}>{gt('Weaker copies sold: {count}',{count:replaced.length})} · +{replacedGold.toLocaleString()} Gold</Text>:null}
    </View>
    {remainingCount>0?<Text accessibilityRole="alert" style={s.pendingNote}>{gt('Forge jobs still waiting: {count}',{count:remainingCount})}</Text>:null}
    <ScrollView style={{maxHeight:Math.max(128,height*0.48)}} contentContainerStyle={s.results} showsVerticalScrollIndicator={false}>
      {kept.map(result=><ForgeResultRow key={result.instanceId} result={result}/>)}
      {sold.length>0?<View style={s.sectionDivider}><Text style={s.sectionLabel}>{gt('AUTO-SOLD · NOT COLLECTED')}</Text></View>:null}
      {sold.map(result=><ForgeResultRow key={result.instanceId} result={result} sold/>)}
    </ScrollView>
    <View style={[s.actions,stackActions&&s.actionsStack]}>
      <View style={[s.action,stackActions&&s.actionStack]}><GameButton title={gt('Continue forging')} tone="secondary" onPress={onClose}/></View>
      <View style={[s.action,stackActions&&s.actionStack]}><GameButton title={gt('View Gear storage')} onPress={onInventory}/></View>
    </View>
  </GameModalSurface>;
}

function makeStyles(C:ThemeColors){
  const E=equipmentTheme(C);
  return StyleSheet.create({
    dialog:{gap:spacing.sm,backgroundColor:E.panel},
    overview:{gap:3,padding:spacing.sm,borderRadius:radii.sm,backgroundColor:E.stage,borderWidth:1,borderColor:E.line},
    overviewCount:{...typography.bodyStrong,color:C.text,fontWeight:'900'},
    overviewDetail:{...typography.caption,color:C.muted},
    soldCount:{...typography.caption,color:C.warning,fontWeight:'800'},
    pendingNote:{...typography.caption,color:C.warning,backgroundColor:C.warningSurface,padding:8,borderRadius:radii.sm},
    results:{gap:6,paddingBottom:3},
    itemRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:7,borderWidth:1,borderColor:E.line,borderRadius:radii.sm,backgroundColor:C.panel2},
    soldRow:{opacity:0.8},
    art:{width:50,height:50,alignItems:'center',justifyContent:'center',borderRadius:radii.sm,overflow:'hidden'},
    itemBody:{flex:1,minWidth:0,gap:3},
    itemName:{...typography.bodyStrong,fontWeight:'800'},
    metaRow:{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'},
    metaChip:{fontSize:10,lineHeight:14,color:C.muted,fontWeight:'800'},
    rarityChip:{fontSize:10,lineHeight:14,fontWeight:'900',borderWidth:1,borderRadius:5,paddingHorizontal:5},
    saleNote:{...typography.caption,color:C.warning},
    sectionDivider:{paddingTop:6,borderTopWidth:1,borderTopColor:E.line},
    sectionLabel:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:.6},
    actions:{flexDirection:'row',gap:spacing.sm},
    actionsStack:{flexDirection:'column'},
    action:{flex:1},
    actionStack:{flex:0,width:'100%'},
  });
}


import {useMemo} from 'react';
import type {ReactNode} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {GameState} from '../core/types';
import {itemInspectModel} from '../core/item-inspect';
import {rarityNameColor} from '../core/item-rarity';
import {formatGameNumber} from '../core/number-format';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {EquipmentArtwork,hasEquipmentArtwork} from './EquipmentArtwork';
import {GatheringToolArtwork} from './GatheringToolArtwork';
import {ResourceArtwork} from './ResourceArtwork';
import {hasResourceArtwork} from '../theme/resource-assets';

function InspectArt({state,itemId}:{state:GameState;itemId:string}){
  const C=useGameTheme(),model=itemInspectModel(state,itemId),item=model.item;
  if(item.type==='gear'&&hasEquipmentArtwork(item))return <EquipmentArtwork item={item} framed={false}/>;
  if(item.type==='tool')return <GatheringToolArtwork itemId={item.id} size={72} framed={false}/>;
  if(hasResourceArtwork(item.id))return <ResourceArtwork itemId={item.id} size={72} framed={false}/>;
  return <View style={[art.fallback,{borderColor:model.rarity.color,backgroundColor:model.rarity.surface}]}><Text style={[art.symbol,{color:model.rarity.color}]}>{model.rarity.symbol}</Text><Text style={[art.fallbackText,{color:C.muted}]}>{item.type.toUpperCase()}</Text></View>;
}

export function ItemQuickInspect({state,itemId,onClose}:{state:GameState;itemId:string|null;onClose:()=>void}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  if(!itemId)return null;
  const model=itemInspectModel(state,itemId),item=model.item,rarity=model.rarity,upgrade=model.upgrade,sockets=model.sockets,nameColor=rarityNameColor(model.rarityId,C.dark,C.text);
  const sourceRows=model.sources.slice(0,4),useRows=model.usedIn.slice(0,4);
  const upgradeChance=upgrade?Math.round(upgrade.successChance*100):0;
  const upgradeColor=upgrade?.maxed?C.good:upgradeChance>=70?C.good:upgradeChance>=30?C.warning:C.bad;
  return <Modal visible transparent statusBarTranslucent animationType={state.settings.reduceMotion?'none':'fade'} onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close item quick inspect" onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View style={s.sheet}>
        <View style={s.grabber}/>
        <View style={s.hero}>
          <View style={[s.artBox,{borderColor:rarity.color,backgroundColor:rarity.surface}]}><InspectArt state={state} itemId={itemId}/></View>
          <View style={s.heroCopy}>
            <Text style={[s.rarity,{color:rarity.color}]}>{rarity.symbol+' '+rarity.label.toUpperCase()+' · '+item.type.toUpperCase()}</Text>
            <Text numberOfLines={2} style={[s.name,{color:nameColor}]}>{item.name+(upgrade?.rank?' +'+upgrade.rank:'')}</Text>
            <Text style={s.owned}>{'Owned · '+formatGameNumber(model.totalQuantity,state.settings.numberMode)+' total · '+formatGameNumber(model.inventoryQuantity,state.settings.numberMode)+' carried · '+formatGameNumber(model.bankQuantity,state.settings.numberMode)+' banked'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close item quick inspect" onPress={onClose} style={({pressed})=>[s.close,pressed&&s.pressed]}><Text style={s.closeText}>×</Text></Pressable>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {(model.stats||model.effectLines.length>0)&&<Section title="WHAT IT DOES"><View style={s.statRow}>{model.stats&&<><Stat label="ATK" value={model.stats.attack}/><Stat label="DEF" value={model.stats.defense}/><Stat label="HP" value={model.stats.hp}/></>}</View>{model.effectLines.map((line,index)=><Text key={index} style={s.body}>{'• '+line}</Text>)}</Section>}

          {upgrade&&<Section title="UPGRADE"><View style={s.upgradeTop}><Text style={s.bodyStrong}>{'Current +'+upgrade.rank}</Text><Text style={[s.chance,{color:upgradeColor}]}>{upgrade.maxed?'MAXED':upgradeChance+'% → +'+upgrade.nextRank}</Text></View>{upgrade.maxed?<Text style={s.body}>This item has reached the maximum upgrade rank.</Text>:<><Text style={s.body}>{'Next attempt · '+formatGameNumber(upgrade.gold,state.settings.numberMode)+' gold · '+upgrade.dust+' Tempering Dust'+(upgrade.cores?' · '+upgrade.cores+' Tempering Core'+(upgrade.cores===1?'':'s'):'')}</Text>{upgrade.failures>0&&<Text style={s.note}>{'Pity bonus active after '+upgrade.failures+' failed attempt'+(upgrade.failures===1?'':'s')+'.'}</Text>}{!upgrade.equipped&&<Text style={s.note}>Equip this item before attempting an upgrade.</Text>}</>}</Section>}

          {sockets&&<Section title="SOCKETS"><Text style={s.body}>{sockets.capacity?sockets.filled+'/'+sockets.capacity+' filled':'No sockets at this rarity.'}</Text>{sockets.gemNames.map((name,index)=><Text key={index} style={s.body}>{'◆ '+name}</Text>)}</Section>}

          <Section title="HOW TO GET">{sourceRows.length?sourceRows.map((source,index)=><View key={source.kind+':'+source.title+':'+index} style={s.sourceRow}><View style={[s.sourceDot,{backgroundColor:source.kind==='combat'?C.bad:source.kind==='crafting'?C.accent:source.kind==='gathering'?C.good:C.info}]}/><View style={s.flex}><Text style={s.bodyStrong}>{source.title}</Text><Text style={s.note}>{source.detail}</Text></View></View>):<Text style={s.note}>No repeatable source is catalogued for this item yet. It may come from a quest, event, one-time reward, or future content.</Text>}{model.sources.length>sourceRows.length&&<Text style={s.note}>{'+'+(model.sources.length-sourceRows.length)+' more known source'+(model.sources.length-sourceRows.length===1?'':'s')}</Text>}</Section>

          <Section title={'USED IN CRAFTING'+(model.usedIn.length?' · '+model.usedIn.length:'')}>{useRows.length?useRows.map((recipe,index)=><View key={recipe.name+':'+index} style={s.recipeRow}><View style={s.flex}><Text style={s.bodyStrong}>{recipe.name}</Text><Text style={s.note}>{recipe.skill+' Lv '+recipe.level+' · needs '+recipe.quantity}</Text></View></View>):<Text style={s.note}>Not currently used as a crafting ingredient.</Text>}{model.usedIn.length>useRows.length&&<Text style={s.note}>{'+'+(model.usedIn.length-useRows.length)+' more recipe'+(model.usedIn.length-useRows.length===1?'':'s')}</Text>}</Section>

          <View style={s.footerRow}><Text style={s.sell}>{'Sell value · '+formatGameNumber(item.value,state.settings.numberMode)+' gold each'}</Text>{item.classRestriction&&<Text style={s.classText}>{item.classRestriction.replaceAll('_',' ')}</Text>}</View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
function Section({title,children}:{title:string;children:ReactNode}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.section}><Text style={s.sectionTitle}>{title}</Text>{children}</View>}
function Stat({label,value}:{label:string;value:number}){const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);return <View style={s.stat}><Text style={s.statLabel}>{label}</Text><Text style={s.statValue}>{value}</Text></View>}
const art=StyleSheet.create({fallback:{width:72,height:72,borderWidth:1,borderRadius:radii.sm,alignItems:'center',justifyContent:'center'},symbol:{fontSize:30,fontWeight:'900'},fallbackText:{fontSize:8,fontWeight:'800'}});
function makeStyles(C:ThemeColors){return StyleSheet.create({
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:C.overlay,paddingHorizontal:spacing.sm,paddingBottom:spacing.sm},
  sheet:{maxHeight:'84%',width:'100%',maxWidth:520,alignSelf:'center',overflow:'hidden',borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.lg,backgroundColor:C.panelRaised},
  grabber:{width:42,height:4,borderRadius:99,backgroundColor:C.line,alignSelf:'center',marginTop:8},
  hero:{minHeight:104,flexDirection:'row',alignItems:'center',gap:spacing.md,padding:spacing.md,borderBottomWidth:1,borderBottomColor:C.line},
  artBox:{width:84,height:84,borderWidth:1,borderRadius:radii.md,alignItems:'center',justifyContent:'center'},
  heroCopy:{flex:1,minWidth:0,gap:3},rarity:{...typography.caption,fontWeight:'900',letterSpacing:.7},name:{...typography.title,fontWeight:'800'},owned:{...typography.caption,color:C.muted},
  close:{width:40,height:40,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel2},closeText:{fontSize:24,lineHeight:27,color:C.text,fontWeight:'700'},
  scroll:{maxHeight:520},content:{padding:spacing.md,gap:spacing.md,paddingBottom:spacing.lg},
  section:{gap:6,paddingBottom:spacing.sm,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},sectionTitle:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},
  statRow:{flexDirection:'row',gap:spacing.sm},stat:{flex:1,minWidth:0,padding:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2},statLabel:{...typography.caption,color:C.muted},statValue:{...typography.bodyStrong,color:C.text,fontWeight:'800'},
  body:{...typography.body,color:C.text},bodyStrong:{...typography.bodyStrong,color:C.text},note:{...typography.caption,color:C.muted},
  upgradeTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm},chance:{...typography.bodyStrong,fontWeight:'900'},
  sourceRow:{flexDirection:'row',alignItems:'flex-start',gap:8},sourceDot:{width:8,height:8,borderRadius:99,marginTop:6},recipeRow:{paddingVertical:2},
  footerRow:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:8},sell:{...typography.caption,color:C.muted},classText:{...typography.caption,color:C.info,fontWeight:'800'},
  flex:{flex:1,minWidth:0},pressed:{opacity:.72},
});}

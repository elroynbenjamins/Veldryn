import {useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {itemDef} from '../content/items';
import {craftedGearRarityOutcomes} from '../core/crafted-gear-rarity';
import {CRAFTED_GEAR_QUALITY_MIN,CRAFTED_GEAR_QUALITY_MAX,LEGACY_CRAFTED_GEAR_QUALITY,craftedGearQualityMultiplier} from '../core/crafted-gear-instances';
import {rarityMeta,rarityNameColor} from '../core/item-rarity';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';

const chanceLabel=(chance:number)=>(chance*100).toFixed(2)+'%';
function statEffect(multiplier:number){
  const percent=Math.round((multiplier-1)*1000)/10;
  return percent===0?'Base':(percent>0?'+':'')+percent+'%';
}

/** Shared by Smithing and Tailoring. Hidden until requested; no extra tabs or modals. */
export function ForgeOddsGuide({itemId}:{itemId:string}){
  const C=useGameTheme(),{gt}=useGameplayText(),{width,fontScale}=useWindowDimensions();
  const [open,setOpen]=useState(false),compact=width<350||fontScale>=1.3;
  const item=itemDef(itemId);
  if(item.type!=='gear')return null;
  const outcomes=craftedGearRarityOutcomes(item.id);
  const qualityPoints=[
    {value:CRAFTED_GEAR_QUALITY_MIN,label:gt('Low'),color:C.bad,surface:C.badSurface},
    {value:LEGACY_CRAFTED_GEAR_QUALITY,label:gt('Normal'),color:C.muted,surface:C.panel2},
    {value:CRAFTED_GEAR_QUALITY_MAX,label:gt('High'),color:C.good,surface:C.goodSurface},
  ] as const;
  return <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={gt('Rarity chances and quality effects')}
      accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)}
      style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
      <View style={s.grow}>
        <Text style={[s.heading,{color:C.text}]}>{gt('Rarity & quality')}</Text>
        <Text style={[s.subtitle,{color:C.muted}]}>{gt('Crafting chances and stat effects')}</Text>
      </View>
      <Text accessible={false} style={[s.chevron,{color:C.muted}]}>{open?'⌃':'⌄'}</Text>
    </Pressable>
    {open?<View style={[s.content,{borderTopColor:C.line}]}>
      <View style={s.sectionHead}>
        <Text style={[s.sectionTitle,{color:C.text}]}>{gt('Rarity')}</Text>
        <Text style={[s.sectionItem,{color:C.muted}]} numberOfLines={1}>{item.name}</Text>
      </View>
      <View style={s.tableHead}>
        <Text style={[s.colName,s.colLabel,{color:C.muted}]}>{gt('Result')}</Text>
        <Text style={[s.colChance,s.colLabel,{color:C.muted}]}>{gt('Chance')}</Text>
        <Text style={[s.colStats,s.colLabel,{color:C.muted}]}>{gt('Stats')}</Text>
      </View>
      {outcomes.map(outcome=>{
        const meta=rarityMeta(outcome.rarity);
        return <View key={outcome.rarity} style={[s.oddsRow,compact&&s.oddsRowCompact,{borderBottomColor:C.line}]}
          accessibilityLabel={`${meta.label}: ${chanceLabel(outcome.chance)} chance, ${statEffect(outcome.statMultiplier)} stats`}>
          <View style={[s.nameWrap,compact&&s.nameCompact]}>
            <View accessible={false} style={[s.rarityDot,{backgroundColor:meta.color}]}/>
            <Text numberOfLines={compact?2:1} style={[s.rarity,{color:rarityNameColor(outcome.rarity,C.dark,C.text)}]}>{meta.label}</Text>
          </View>
          <Text style={[s.colChance,s.value,{color:C.text}]}>{chanceLabel(outcome.chance)}</Text>
          <Text style={[s.colStats,s.statValue,{color:outcome.statMultiplier>1?C.good:C.muted}]}>{statEffect(outcome.statMultiplier)}</Text>
        </View>;
      })}
      <Text style={[s.explain,{color:C.muted}]}>{gt('Stats are compared with this item’s normal stats.')}</Text>
      <View style={[s.rule,{backgroundColor:C.line}]}/>
      <Text style={[s.sectionTitle,{color:C.text}]}>{gt('Quality')}</Text>
      <View style={s.qualityRow}>{qualityPoints.map(point=><View key={point.value} style={[s.qualityCell,{backgroundColor:point.surface,borderColor:point.value===50?C.lineStrong:C.line}]}>
        <Text style={[s.qualityNumber,{color:C.text}]}>Q{point.value}</Text>
        <Text style={[s.qualityEffect,{color:point.color}]}>{statEffect(craftedGearQualityMultiplier(point.value))}</Text>
      </View>)}</View>
      <Text style={[s.explain,{color:C.muted}]}>{gt('Lower quality means weaker stats; higher quality means stronger stats. Rarity and quality combine.')}</Text>
      <Text style={[s.legacy,{color:C.muted}]}>{gt('Older Forge gear without a quality roll counts as Q50.')}</Text>
    </View>:null}
  </View>;
}

const s=StyleSheet.create({
  card:{borderWidth:1,borderRadius:10,overflow:'hidden'},
  trigger:{minHeight:56,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10},
  grow:{flex:1,minWidth:0,gap:2},heading:{fontSize:14,lineHeight:20,fontWeight:'700'},
  subtitle:{fontSize:11,lineHeight:16},chevron:{fontSize:19,fontWeight:'700'},
  content:{padding:12,gap:8,borderTopWidth:1},
  sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  sectionTitle:{fontSize:13,lineHeight:19,fontWeight:'800'},
  sectionItem:{fontSize:11,lineHeight:16,flexShrink:1,textAlign:'right'},
  tableHead:{flexDirection:'row',gap:7,paddingBottom:2},
  colName:{flex:1,minWidth:0},colChance:{width:66,textAlign:'right'},colStats:{width:58,textAlign:'right'},
  colLabel:{fontSize:10,lineHeight:14,fontWeight:'700'},
  oddsRow:{minHeight:38,flexDirection:'row',alignItems:'center',gap:7,borderBottomWidth:1,paddingVertical:6},
  oddsRowCompact:{minHeight:45},
  nameWrap:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:6},
  nameCompact:{alignItems:'center'},rarityDot:{width:8,height:8,borderRadius:2,flexShrink:0},
  rarity:{fontSize:13,lineHeight:17,fontWeight:'800',flexShrink:1},value:{fontSize:12,lineHeight:17,fontWeight:'700'},
  statValue:{fontSize:12,lineHeight:17,fontWeight:'800'},
  explain:{fontSize:11,lineHeight:16},
  rule:{height:1,marginVertical:4},
  qualityRow:{flexDirection:'row',gap:6},
  qualityCell:{flex:1,minWidth:0,paddingVertical:9,paddingHorizontal:3,borderWidth:1,borderRadius:8,alignItems:'center',gap:3},
  qualityNumber:{fontSize:13,lineHeight:17,fontWeight:'800'},
  qualityEffect:{fontSize:12,lineHeight:16,fontWeight:'800'},
  legacy:{fontSize:10,lineHeight:15},
  pressed:{opacity:.75},
});

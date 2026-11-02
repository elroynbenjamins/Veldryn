import {useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {itemDef} from '../content/items';
import {craftedGearRarityOutcomes} from '../core/crafted-gear-rarity';
import {CRAFTED_GEAR_QUALITY_MIN,CRAFTED_GEAR_QUALITY_MAX,LEGACY_CRAFTED_GEAR_QUALITY,craftedGearQualityMultiplier,craftedGearQualityChanceAtLeast} from '../core/crafted-gear-instances';
import {rarityMeta,type ItemRarity} from '../core/item-rarity';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';

const chanceLabel=(chance:number)=>(chance*100).toFixed(2)+'%';
const rarityPower=(multiplier:number)=>multiplier.toFixed(2)+'×';
const QUALITY_STEP=5;
const qualityAnchors=[CRAFTED_GEAR_QUALITY_MIN,LEGACY_CRAFTED_GEAR_QUALITY,90,CRAFTED_GEAR_QUALITY_MAX] as const;
function statEffect(multiplier:number){
 const percent=Math.round((multiplier-1)*1000)/10;
 return percent===0?'0%':(percent>0?'+':'')+percent+'%';
}

/** Shared by Smithing and Tailoring. The only odds source is the selected recipe output. */
export function ForgeOddsGuide({itemId}:{itemId:string}){
 const C=useGameTheme(),{gt}=useGameplayText(),{width,fontScale}=useWindowDimensions();
 const [open,setOpen]=useState(false);
 const [selectedRarity,setSelectedRarity]=useState<ItemRarity>('rare');
 const [quality,setQuality]=useState<number>(LEGACY_CRAFTED_GEAR_QUALITY);
 const [trackWidth,setTrackWidth]=useState(0);
 const compact=width<350||fontScale>=1.3;
 const item=itemDef(itemId);
 if(item.type!=='gear')return null;
 // A higher authored base rarity absorbs every lower result; never show impossible odds.
 const outcomes=craftedGearRarityOutcomes(item.id);
 const chosen=outcomes.find(row=>row.rarity===selectedRarity)??outcomes[0];
 const chosenMeta=rarityMeta(chosen.rarity);
 const totalMultiplier=chosen.statMultiplier*craftedGearQualityMultiplier(quality);
 const highlights=outcomes.filter(row=>['rare','epic','mythic'].includes(row.rarity));
 const summary=highlights.length>=2?highlights:outcomes.slice(-3);
 const updateQuality=(position:number)=>{
   if(trackWidth<=0||!Number.isFinite(position))return;
   const next=Math.round(Math.min(1,Math.max(0,position/trackWidth))*CRAFTED_GEAR_QUALITY_MAX/QUALITY_STEP)*QUALITY_STEP;
   setQuality(next);
 };
 return <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
  <Pressable accessibilityRole="button" accessibilityLabel={gt('Rarity chances and quality effects')} accessibilityState={{expanded:open}}
    onPress={()=>setOpen(value=>!value)} style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
   <View style={s.grow}>
    <Text style={[s.heading,{color:C.text}]}>{gt('Rarity & quality')}</Text>
    <Text style={[s.summary,{color:C.muted}]}>
      {summary.map((row,index)=>{
       const meta=rarityMeta(row.rarity);
       return <Text key={row.rarity} style={{color:C.dark?meta.color:meta.lightTextColor}}>{index>0?' · ':''}{gt(meta.label)} {chanceLabel(row.chance)}</Text>;
      })}
    </Text>
    <Text style={[s.subtitle,{color:C.muted}]}>Q0 −25%  ·  Q50 {gt('Normal')}  ·  Q100 +25%</Text>
   </View>
   <Text accessible={false} style={[s.chevron,{color:C.muted}]}>{open?'⌃':'⌄'}</Text>
  </Pressable>
  {open?<View style={[s.content,{borderTopColor:C.line}]}>
    <View style={s.sectionHead}>
     <Text style={[s.sectionTitle,{color:C.text}]}>{gt('Rarity')}</Text>
     <Text style={[s.sectionItem,{color:C.muted}]} numberOfLines={1}>{item.name}</Text>
    </View>
    {!compact?<View style={s.tableHead}>
     <Text style={[s.colName,s.colLabel,{color:C.muted}]}>{gt('Result')}</Text>
     <Text style={[s.colChance,s.colLabel,{color:C.muted}]}>{gt('Chance')}</Text>
     <Text style={[s.colStats,s.colLabel,{color:C.muted}]}>{gt('Stats')}</Text>
    </View>:null}
    {outcomes.map(row=>{
      const meta=rarityMeta(row.rarity),selected=chosen.rarity===row.rarity;
      return <Pressable key={row.rarity} accessibilityRole="button"
        accessibilityLabel={meta.label+', '+chanceLabel(row.chance)+', '+rarityPower(row.statMultiplier)+' '+gt('stats')}
        accessibilityState={{selected}} onPress={()=>setSelectedRarity(row.rarity)}
        style={({pressed})=>[s.oddsRow,compact&&s.oddsRowCompact,{
          borderColor:selected?meta.color:C.line,
          backgroundColor:selected?meta.surface:C.panel,
        },pressed&&s.pressed]}>
        <View style={[s.nameWrap,compact&&s.nameCompact]}>
         <View accessible={false} style={[s.rarityDot,{backgroundColor:meta.color}]}/>
         <Text style={[s.rarity,{color:C.dark?meta.color:meta.lightTextColor}]}>{gt(meta.label)}</Text>
        </View>
        {compact?<View style={s.compactMeta}>
          <Text style={[s.value,{color:C.text}]}>{chanceLabel(row.chance)}</Text>
          <Text style={[s.statValue,{color:C.text}]}>{rarityPower(row.statMultiplier)}</Text>
        </View>:<>
          <Text style={[s.colChance,s.value,{color:C.text}]}>{chanceLabel(row.chance)}</Text>
          <Text style={[s.colStats,s.statValue,{color:C.text}]}>{rarityPower(row.statMultiplier)}</Text>
        </>}
      </Pressable>;
    })}
    <Text style={[s.explain,{color:C.muted}]}>{gt('Stats are compared with this item’s normal stats.')}</Text>
    <View style={[s.rule,{backgroundColor:C.line}]}/>
    <View style={s.sectionHead}>
      <Text style={[s.sectionTitle,{color:C.text}]}>{gt('Quality preview')}</Text>
      <Text style={[s.qualityNumber,{color:C.text}]}>Q{quality} · {statEffect(craftedGearQualityMultiplier(quality))}</Text>
    </View>
    <Pressable accessibilityRole="adjustable" accessibilityLabel={gt('Quality preview')}
      accessibilityValue={{min:CRAFTED_GEAR_QUALITY_MIN,max:CRAFTED_GEAR_QUALITY_MAX,now:quality}}
      accessibilityActions={[{name:'increment'},{name:'decrement'}]}
      onAccessibilityAction={event=>{
       if(event.nativeEvent.actionName==='increment')setQuality(value=>Math.min(100,value+QUALITY_STEP));
       if(event.nativeEvent.actionName==='decrement')setQuality(value=>Math.max(0,value-QUALITY_STEP));
      }}
      onLayout={event=>setTrackWidth(event.nativeEvent.layout.width)}
      onPress={event=>updateQuality(event.nativeEvent.locationX)}
      onTouchMove={event=>updateQuality(event.nativeEvent.locationX)}
      style={s.sliderHit}>
      <View pointerEvents="none" style={[s.sliderTrack,{backgroundColor:C.line}]}>
       <View style={[s.sliderFill,{backgroundColor:C.accent,width:quality+'%'}]}/>
       <View style={[s.sliderThumb,{backgroundColor:C.accent,borderColor:C.panel,left:quality+'%'}]}/>
      </View>
    </Pressable>
    <View style={s.qualityRow}>
     {qualityAnchors.map(value=>{
       const chosenQuality=quality===value;
       return <Pressable key={value} accessibilityRole="button" accessibilityState={{selected:chosenQuality}}
          accessibilityLabel={'Q'+value+', '+statEffect(craftedGearQualityMultiplier(value))}
          onPress={()=>setQuality(value)}
          style={({pressed})=>[s.qualityCell,{
           backgroundColor:chosenQuality?C.selection:C.panel2,
           borderColor:chosenQuality?C.selectionLine:C.line,
          },pressed&&s.pressed]}>
         <Text style={[s.qualityAnchor,{color:C.text}]}>Q{value}</Text>
         <Text style={[s.qualityEffect,{color:value<50?C.bad:value===50?C.muted:C.good}]}>
           {value===50?gt('Normal'):statEffect(craftedGearQualityMultiplier(value))}
         </Text>
       </Pressable>;
     })}
    </View>
    <View style={[s.preview,{backgroundColor:C.panel2,borderColor:C.line}]}>
      <View style={s.previewRow}>
       <Text style={[s.sectionTitle,{color:C.dark?chosenMeta.color:chosenMeta.lightTextColor}]}>{gt(chosenMeta.label)} · Q{quality}</Text>
       <Text style={[s.previewValue,{color:C.text}]}>{rarityPower(totalMultiplier)}</Text>
      </View>
      <Text style={[s.explain,{color:C.muted}]}>{gt('Combined base stats')}</Text>
      <View style={[s.rule,{backgroundColor:C.line}]}/>
      <View style={s.previewRow}>
       <Text style={[s.explain,{color:C.muted}]}>{gt('Chance of Q{quality}+', {quality})}</Text>
       <Text style={[s.value,{color:C.text}]}>{chanceLabel(craftedGearQualityChanceAtLeast(quality))}</Text>
      </View>
    </View>
    <Text style={[s.explain,{color:C.muted}]}>{gt('Lower quality means weaker stats; higher quality means stronger stats. Rarity and quality combine.')}</Text>
    <Text style={[s.explain,{color:C.muted}]}>{gt('Odds depend on the selected recipe’s base rarity.')}</Text>
    <Text style={[s.legacy,{color:C.muted}]}>{gt('Preview only. Rarity and quality are rolled when claimed.')}</Text>
    <Text style={[s.legacy,{color:C.muted}]}>{gt('Older Forge gear without a quality roll counts as Q50.')}</Text>
   </View>:null}
 </View>;
}

const s=StyleSheet.create({
 card:{borderWidth:1,borderRadius:10,overflow:'hidden'},
 trigger:{minHeight:70,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10},
 grow:{flex:1,minWidth:0,gap:3},heading:{fontSize:14,lineHeight:20,fontWeight:'700'},
 summary:{fontSize:11,lineHeight:17,fontWeight:'700'},subtitle:{fontSize:11,lineHeight:16},
 chevron:{fontSize:19,fontWeight:'700'},
 content:{padding:12,gap:8,borderTopWidth:1},
 sectionHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 sectionTitle:{fontSize:13,lineHeight:19,fontWeight:'800'},
 sectionItem:{fontSize:11,lineHeight:16,flexShrink:1,textAlign:'right'},
 tableHead:{flexDirection:'row',gap:7,paddingHorizontal:10,paddingBottom:2},
 colName:{flex:1,minWidth:0},colChance:{width:66,textAlign:'right'},colStats:{width:58,textAlign:'right'},
 colLabel:{fontSize:10,lineHeight:14,fontWeight:'700'},
 oddsRow:{minHeight:42,flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderRadius:8,paddingHorizontal:9,paddingVertical:6},
 oddsRowCompact:{minHeight:52,flexDirection:'column',alignItems:'stretch',gap:2},
 nameWrap:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:7},
 nameCompact:{flex:0},
 compactMeta:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,paddingLeft:15},
 rarityDot:{width:8,height:8,borderRadius:2,flexShrink:0},
 rarity:{fontSize:13,lineHeight:17,fontWeight:'800',flexShrink:1},value:{fontSize:12,lineHeight:17,fontWeight:'700'},
 statValue:{fontSize:12,lineHeight:17,fontWeight:'800'},
 explain:{fontSize:11,lineHeight:16},rule:{height:1,marginVertical:3},
 qualityNumber:{fontSize:13,lineHeight:17,fontWeight:'800'},
 sliderHit:{minHeight:44,justifyContent:'center',paddingHorizontal:9},
 sliderTrack:{height:6,borderRadius:5,position:'relative',justifyContent:'center'},
 sliderFill:{height:6,borderRadius:5,position:'absolute',left:0},
 sliderThumb:{width:18,height:18,borderRadius:10,borderWidth:2,position:'absolute',marginLeft:-9},
 qualityRow:{flexDirection:'row',gap:6},
 qualityCell:{flex:1,minWidth:0,paddingVertical:8,paddingHorizontal:2,borderWidth:1,borderRadius:8,alignItems:'center',gap:2,minHeight:48},
 qualityAnchor:{fontSize:12,lineHeight:17,fontWeight:'800'},
 qualityEffect:{fontSize:11,lineHeight:15,fontWeight:'800'},
 preview:{padding:12,gap:5,borderWidth:1,borderRadius:10},
 previewRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 previewValue:{fontSize:19,lineHeight:25,fontWeight:'800'},legacy:{fontSize:10,lineHeight:15},
 pressed:{opacity:.75},
});

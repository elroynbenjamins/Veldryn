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
const translatedRarityName={common:'Common',uncommon:'Uncommon',rare:'Rare',epic:'Epic',legendary:'Legendary',mythic:'Mythic'} as const;
const QUALITY_STEP=5;
const SLIDER_INSET=9;
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
 // Two rarity columns on phones; one column if text must grow substantially.
 const stacked=width<320||fontScale>=1.45;
 const item=itemDef(itemId);
 if(item.type!=='gear')return null;
 // A higher authored base rarity absorbs every lower result; never show impossible odds.
 const outcomes=craftedGearRarityOutcomes(item.id);
 const chosen=outcomes.find(row=>row.rarity===selectedRarity)??outcomes[0];
 const chosenMeta=rarityMeta(chosen.rarity);
 const totalMultiplier=chosen.statMultiplier*craftedGearQualityMultiplier(quality);
 const qualityPosition=(quality+'%') as `${number}%`;
 const rarityTileWidth=(stacked?'100%':'48.4%') as `${number}%`;
 const highlights=outcomes.filter(row=>['rare','epic','mythic'].includes(row.rarity));
 const summary=highlights.length>=2?highlights:outcomes.slice(-3);
 const updateQuality=(position:number)=>{
   if(trackWidth<=0||!Number.isFinite(position))return;
   const usableWidth=trackWidth-2*SLIDER_INSET;
   if(usableWidth<=0)return;
   const fraction=Math.min(1,Math.max(0,(position-SLIDER_INSET)/usableWidth));
   const next=Math.round(fraction*CRAFTED_GEAR_QUALITY_MAX/QUALITY_STEP)*QUALITY_STEP;
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
       return <Text key={row.rarity} style={{color:C.dark?meta.color:meta.lightTextColor}}>{index>0?' · ':''}{gt(translatedRarityName[meta.id])} {chanceLabel(row.chance)}</Text>;
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
    <View style={s.chanceGrid}>
     {outcomes.map(row=>{
       const meta=rarityMeta(row.rarity),selected=chosen.rarity===row.rarity;
       return <Pressable key={row.rarity} accessibilityRole="button"
         accessibilityLabel={gt(translatedRarityName[meta.id])+', '+chanceLabel(row.chance)+' '+gt('Chance')+', '+rarityPower(row.statMultiplier)+' '+gt('Stats')}
         accessibilityState={{selected}} onPress={()=>setSelectedRarity(row.rarity)}
         style={({pressed})=>[s.chanceTile,{width:rarityTileWidth,
           borderColor:selected?meta.color:C.line,backgroundColor:selected?meta.surface:C.panel,
         },pressed&&s.pressed]}>
         <View style={s.tileHeading}>
          <View style={[s.rarityDot,{backgroundColor:meta.color}]}/>
          <Text numberOfLines={1} style={[s.rarity,{color:C.dark?meta.color:meta.lightTextColor,flex:1}]}>{gt(translatedRarityName[meta.id])}</Text>
          {selected?<Text accessibilityElementsHidden style={{color:meta.color,fontSize:14,fontWeight:'800'}}>✓</Text>:null}
         </View>
         <View style={s.tileValues}>
          <Text style={[s.value,{color:C.text}]}>{chanceLabel(row.chance)}</Text>
          <Text style={[s.statValue,{color:C.text}]}>{rarityPower(row.statMultiplier)}</Text>
         </View>
       </Pressable>;
     })}
    </View>
    <View style={s.tableLegend}>
      <Text style={[s.explain,{color:C.muted}]}>{gt('Chance')}</Text>
      <Text style={[s.explain,{color:C.muted}]}>{gt('Stats')}</Text>
    </View>
    <Text style={[s.explain,{color:C.muted}]}>{gt('Compared with normal item stats.')}</Text>
    <View style={[s.rule,{backgroundColor:C.line}]}/>
    <View style={s.sectionHead}>
      <Text style={[s.sectionTitle,{color:C.text}]}>{gt('Quality preview')}</Text>
      <Text style={[s.qualityNumber,{color:C.text}]}>Q{quality} · {statEffect(craftedGearQualityMultiplier(quality))}</Text>
    </View>
    <View style={s.sliderControls}>
     <Pressable accessibilityRole="button" accessibilityLabel={gt('Decrease quality')}
       accessibilityState={{disabled:quality===CRAFTED_GEAR_QUALITY_MIN}}
       disabled={quality===CRAFTED_GEAR_QUALITY_MIN}
       hitSlop={4} onPress={()=>setQuality(value=>Math.max(CRAFTED_GEAR_QUALITY_MIN,value-QUALITY_STEP))}
       style={({pressed})=>[s.stepButton,{borderColor:C.line,backgroundColor:C.panel2,opacity:quality===0 ? 0.4 : pressed ? 0.7 : 1}]}>
       <Text style={[s.stepText,{color:C.text}]}>−</Text>
     </Pressable>
     <View accessible accessibilityRole="adjustable" accessibilityLabel={gt('Quality preview')}
       accessibilityValue={{min:CRAFTED_GEAR_QUALITY_MIN,max:CRAFTED_GEAR_QUALITY_MAX,now:quality}}
       accessibilityActions={[{name:'increment'},{name:'decrement'}]}
       onAccessibilityAction={event=>{
        if(event.nativeEvent.actionName==='increment')setQuality(value=>Math.min(100,value+QUALITY_STEP));
        if(event.nativeEvent.actionName==='decrement')setQuality(value=>Math.max(0,value-QUALITY_STEP));
       }}
       onLayout={event=>setTrackWidth(event.nativeEvent.layout.width)}
       onStartShouldSetResponder={()=>true}
       onMoveShouldSetResponder={()=>true}
       onResponderTerminationRequest={()=>false}
       onResponderGrant={event=>updateQuality(event.nativeEvent.locationX)}
       onResponderMove={event=>updateQuality(event.nativeEvent.locationX)}
       style={s.sliderHit}>
       <View pointerEvents="none" style={[s.sliderTrack,{backgroundColor:C.line}]}>
        <View style={[s.sliderFill,{backgroundColor:C.accent,width:qualityPosition}]}/>
        <View style={[s.sliderThumb,{backgroundColor:C.accent,borderColor:C.panel,left:qualityPosition}]}/>
       </View>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={gt('Increase quality')}
       accessibilityState={{disabled:quality===CRAFTED_GEAR_QUALITY_MAX}}
       disabled={quality===CRAFTED_GEAR_QUALITY_MAX}
       hitSlop={4} onPress={()=>setQuality(value=>Math.min(CRAFTED_GEAR_QUALITY_MAX,value+QUALITY_STEP))}
       style={({pressed})=>[s.stepButton,{borderColor:C.line,backgroundColor:C.panel2,opacity:quality===100 ? 0.4 : pressed ? 0.7 : 1}]}>
       <Text style={[s.stepText,{color:C.text}]}>+</Text>
     </Pressable>
    </View>
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
       <Text style={[s.sectionTitle,{color:C.dark?chosenMeta.color:chosenMeta.lightTextColor}]}>{gt(translatedRarityName[chosenMeta.id])} · Q{quality}</Text>
       <Text style={[s.previewValue,{color:C.text}]}>{rarityPower(totalMultiplier)}</Text>
      </View>
      <Text style={[s.explain,{color:C.muted}]}>{gt('Combined base stats')}</Text>
      <View style={[s.rule,{backgroundColor:C.line}]}/>
      <View style={s.previewRow}>
       <Text style={[s.explain,{color:C.muted}]}>{gt('Chance of Q{quality}+', {quality})}</Text>
       <Text style={[s.value,{color:C.text}]}>{chanceLabel(craftedGearQualityChanceAtLeast(quality))}</Text>
      </View>
    </View>
    <Text style={[s.explain,{color:C.muted}]}>{gt('Rarity and quality both affect stats.')}</Text>
    <Text style={[s.explain,{color:C.muted}]}>{gt('Odds depend on the recipe.')}</Text>
    <Text style={[s.legacy,{color:C.muted}]}>{gt('Rarity and quality roll on claim.')}</Text>
    <Text style={[s.legacy,{color:C.muted}]}>{gt('Older gear defaults to Q50.')}</Text>
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
 chanceGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:7},
 chanceTile:{borderWidth:1.5,borderRadius:9,paddingHorizontal:9,paddingVertical:9,minHeight:68,justifyContent:'space-between',gap:6},
 tileHeading:{flexDirection:'row',alignItems:'center',gap:6,minWidth:0},
 tileValues:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:6},
 tableLegend:{flexDirection:'row',justifyContent:'space-between',paddingHorizontal:10},
 rarityDot:{width:8,height:8,borderRadius:3,flexShrink:0},
 rarity:{fontSize:12,lineHeight:17,fontWeight:'800',flexShrink:1},
 value:{fontSize:12,lineHeight:17,fontWeight:'700'},
 statValue:{fontSize:12,lineHeight:17,fontWeight:'800'},
 explain:{fontSize:11,lineHeight:16},rule:{height:1,marginVertical:3},
 qualityNumber:{fontSize:13,lineHeight:17,fontWeight:'800'},
 sliderControls:{flexDirection:'row',alignItems:'center',gap:5},
 stepButton:{minWidth:42,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderRadius:8},
 stepText:{fontSize:23,lineHeight:27,fontWeight:'700'},
 sliderHit:{flex:1,minHeight:44,justifyContent:'center',paddingHorizontal:SLIDER_INSET},
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

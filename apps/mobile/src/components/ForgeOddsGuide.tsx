import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {craftedGearRarityOutcomes,CRAFTED_EPIC_CHANCE,CRAFTED_MYTHIC_CHANCE} from '../core/crafted-gear-rarity';
import {craftedGearQualityMultiplier} from '../core/crafted-gear-instances';
import {itemRarity,rarityMeta,rarityNameColor} from '../core/item-rarity';
import {useGameplayText} from '../i18n/gameplay';
import {useGameTheme} from '../theme/ThemeContext';

const QUALITY_MARKS=[0,25,50,75,100] as const;
const percent=(chance:number)=>(chance*100).toFixed(2)+'%';
const multiplier=(value:number)=>value.toFixed(2)+'×';
function qualityEffect(quality:number){
  const delta=Math.round((craftedGearQualityMultiplier(quality)-1)*1000)/10;
  return delta===0?'Normal':(delta>0?'+':'')+delta+'%';
}

/** Collapsed by default so Forge odds stay discoverable without crowding recipes. */
export function ForgeOddsGuide({itemId}:{itemId?:string}){
  const C=useGameTheme(),{gt}=useGameplayText(),[open,setOpen]=useState(false);
  const item=itemId?itemDef(itemId):undefined;
  const outcomes=item?.type==='gear'?craftedGearRarityOutcomes(item.id):undefined;
  const base=item?.type==='gear'?itemRarity(item):undefined;
  return <View style={[s.card,{borderColor:C.line,backgroundColor:C.panel}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={gt('Rarity chances and quality effects')}
      accessibilityHint={gt(open?'Hide Forge chances':'Show Forge chances')}
      accessibilityState={{expanded:open}} onPress={()=>setOpen(value=>!value)}
      style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
      <View style={s.grow}>
        <Text style={[s.heading,{color:C.text}]}>{gt('Rarity chances & quality')}</Text>
        <Text style={[s.muted,{color:C.muted}]}>{gt('Forge odds · quality −25% to +25%')}</Text>
      </View>
      <Text style={[s.chevron,{color:C.muted}]}>{open?'⌃':'⌄'}</Text>
    </Pressable>
    {open?<View style={[s.content,{borderTopColor:C.line}]}>
      <Text style={[s.sectionTitle,{color:C.text}]}>{gt('RARITY CHANCES')}</Text>
      {outcomes&&base&&item?<>
        <Text style={[s.note,{color:C.muted}]}>{gt('For')} {item.name} · {gt('Base')} {rarityMeta(base).label}</Text>
        {outcomes.map(outcome=>{
          const meta=rarityMeta(outcome.rarity),color=rarityNameColor(outcome.rarity,C.dark,C.text);
          return <View key={outcome.rarity} style={[s.oddsRow,{borderBottomColor:C.line}]}>
            <Text style={[s.rarity,{color}]}>{meta.symbol} {meta.label}</Text>
            <Text style={[s.chance,{color:C.text}]}>{percent(outcome.chance)}</Text>
            <Text style={[s.effect,{color:C.muted}]}>{multiplier(outcome.statMultiplier)} {gt('stats')}</Text>
          </View>;
        })}
        <Text style={[s.note,{color:C.muted}]}>{gt('Chances reflect the selected recipe. Rarity never falls below its original tier; effects are relative to its base stats.')}</Text>
      </>:<>
        <View style={[s.oddsRow,{borderBottomColor:C.line}]}><Text style={[s.rarity,{color:C.text}]}>{gt('Base rarity')}</Text><Text style={[s.chance,{color:C.text}]}>{percent(1-CRAFTED_EPIC_CHANCE-CRAFTED_MYTHIC_CHANCE)}</Text></View>
        <View style={[s.oddsRow,{borderBottomColor:C.line}]}><Text style={[s.rarity,{color:rarityMeta('epic').color}]}>{gt('Epic upgrade roll')}</Text><Text style={[s.chance,{color:C.text}]}>{percent(CRAFTED_EPIC_CHANCE)}</Text></View>
        <View style={[s.oddsRow,{borderBottomColor:C.line}]}><Text style={[s.rarity,{color:rarityMeta('mythic').color}]}>{gt('Mythic upgrade roll')}</Text><Text style={[s.chance,{color:C.text}]}>{percent(CRAFTED_MYTHIC_CHANCE)}</Text></View>
        <Text style={[s.note,{color:C.muted}]}>{gt('Select Equipment to see final rarity chances and stat effects for a specific recipe. Higher-tier items cannot be downgraded.')}</Text>
      </>}
      <View style={[s.separator,{backgroundColor:C.line}]}/>
      <Text style={[s.sectionTitle,{color:C.text}]}>{gt('QUALITY EFFECT')}</Text>
      <View style={s.qualityRow}>{QUALITY_MARKS.map(quality=><View key={quality} style={[s.qualityCell,{borderColor:quality===50?C.selectionLine:C.line,backgroundColor:C.panel2}]}>
        <Text style={[s.qualityValue,{color:C.text}]}>Q{quality}</Text>
        <Text style={[s.qualityDelta,{color:quality<50?C.warning:quality>50?C.good:C.muted}]}>{qualityEffect(quality)}</Text>
      </View>)}</View>
      <Text style={[s.note,{color:C.muted}]}>{gt('Every newly forged equipment copy rolls Q0–Q100. Quality multiplies Attack, Defense and HP on top of rarity and upgrades. Existing unrolled Forge gear stays at neutral Q50. Gems are separate.')}</Text>
    </View>:null}
  </View>;
}

const s=StyleSheet.create({
  card:{borderWidth:1,borderRadius:10,overflow:'hidden'},
  trigger:{minHeight:56,paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10},
  grow:{flex:1,minWidth:0,gap:2},heading:{fontSize:14,lineHeight:20,fontWeight:'700'},
  muted:{fontSize:11,lineHeight:16},chevron:{fontSize:19,fontWeight:'700'},
  content:{padding:12,gap:9,borderTopWidth:1},sectionTitle:{fontSize:11,lineHeight:16,fontWeight:'800',letterSpacing:.5},
  note:{fontSize:11,lineHeight:16},
  oddsRow:{minHeight:35,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,paddingVertical:6},
  rarity:{flex:1,fontSize:13,fontWeight:'700'},chance:{minWidth:65,fontSize:12,fontWeight:'700',textAlign:'right'},
  effect:{minWidth:72,fontSize:11,textAlign:'right'},
  separator:{height:1,marginVertical:3},qualityRow:{flexDirection:'row',flexWrap:'wrap',gap:6},
  qualityCell:{flexGrow:1,flexBasis:48,minWidth:48,borderWidth:1,borderRadius:7,alignItems:'center',paddingVertical:8,gap:3},
  qualityValue:{fontSize:12,fontWeight:'800'},qualityDelta:{fontSize:10,fontWeight:'700'},
  pressed:{opacity:.75},
});

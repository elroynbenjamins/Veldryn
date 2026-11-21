import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {ItemRarity} from '../core/item-rarity';
import {equipmentBonusConfig,equipmentBonusRange} from '../core/equipment-bonus-rolls';
import {
  WEAPON_BONUS_LABELS,weaponBonusConfig,weaponBonusRange,
  type WeaponBonusRoll,type WeaponBonusRollVersion,
} from '../core/weapon-bonus-rolls';
import {useGameplayText} from '../i18n/gameplay';
import {weaponBonusStatText} from '../i18n/weapon-bonus-ux';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const formatBonus=(basisPoints:number)=>'+'+(basisPoints/100).toFixed(1)+'%';
const formatRange=(range:readonly [number,number])=>formatBonus(range[0])+'–'+formatBonus(range[1]);

/** Displays actual recipe-specific possibilities. No guessed odds or class-based filtering. */
export function WeaponBonusPool({itemId,initialExpanded=false,expanded:controlledExpanded,onExpandedChange}:{
  itemId:string;initialExpanded?:boolean;expanded?:boolean;onExpandedChange?:(expanded:boolean)=>void;
}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{gt,gl,language}=useGameplayText();
  const [localExpanded,setLocalExpanded]=useState(initialExpanded);
  const expanded=controlledExpanded??localExpanded;
  const toggleExpanded=()=>{
    if(controlledExpanded!==undefined)onExpandedChange?.(!controlledExpanded);
    else setLocalExpanded(value=>!value);
  };
  const weapon=weaponBonusConfig(itemId,'common');
  const armor=weapon?undefined:equipmentBonusConfig(itemId,'common');
  const base=weapon??armor;
  if(!base)return null;
  const twoAtAllRarities=base.count===2;
  return <View style={s.panel}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityHint={expanded?gt("Hide possible rolls"):gt("View possible rolls")}
      accessibilityLabel={expanded?gt('Hide possible rolls'):gt('View possible rolls')}
      onPress={toggleExpanded} style={s.heading}>
      <View style={s.flex}>
        <Text style={s.title}>{gt('Possible bonus stats')}</Text>
        <Text style={s.subtitle}>{base.pool.length} {gt('possible stats')} · {twoAtAllRarities?gl('2 bonuses per item'):gt('1 bonus · Epic+ gets 2')}</Text>
      </View>
      <Text style={s.chevron}>{expanded?'−':'+'}</Text>
    </Pressable>
    {expanded?<View style={s.content}>
      <Text style={s.note}>{gl('All eligible equipment shares one class-neutral bonus pool.')}</Text>
      {base.pool.map(stat=>{
        const range=weapon?weaponBonusRange(base.tier,stat):equipmentBonusRange(base.tier,stat,armor!.slot);
        if(!range)return null;
        return <View key={stat} style={s.poolRow} accessible accessibilityLabel={weaponBonusStatText(language,stat)+": "+formatRange(range)}>
          <Text style={s.statName}>{weaponBonusStatText(language,stat)}</Text>
          <Text style={s.range}>{formatRange(range)}</Text>
        </View>;
      })}
      <Text style={s.note}>{gl('Each bonus type appears at most once per equipment copy.')}</Text>
      <Text style={s.note}>{twoAtAllRarities?gt('Two different bonuses on every rarity.'):gt('Common–Rare: 1 bonus. Epic+: 2 bonuses.')}</Text>
      <Text style={s.note}>{gt('Bonus stats, rarity and quality roll separately on claim.')}</Text>
    </View>:null}
  </View>;
}

/** Exact-copy bonus presentation. Show real values and optional ranges, never a subjective roll-strength bar. */
export function WeaponBonusDetails({itemId,rarity,rolls,version,compact=false,showEmpty=false}:{
  itemId:string;rarity:ItemRarity;rolls?:readonly WeaponBonusRoll[];version?:WeaponBonusRollVersion;
  compact?:boolean;showEmpty?:boolean;
}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{gt,gl}=useGameplayText();
  const config=weaponBonusConfig(itemId,rarity,version);
  if(!config)return null;
  if(!rolls?.length&&!showEmpty)return null;
  return <View style={s.details}>
    <View style={s.detailsHead}>
      <Text style={s.title}>{gt('Random bonus stats')}</Text>
      <Text style={s.count}>{rolls?.length??0}/{config.count}</Text>
    </View>
    {rolls?.length?rolls.map((bonus,index)=>{
      const range=weaponBonusRange(config.tier,bonus.stat,version,rarity);
      const label=gl(WEAPON_BONUS_LABELS[bonus.stat]);
      return <View key={bonus.stat+index} style={s.detailRow}
        accessible accessibilityLabel={label+', '+formatBonus(bonus.basisPoints)}>
        <View style={s.bonusLine}>
          <Text style={s.statName} numberOfLines={2}>{label}</Text>
          <Text style={s.value}>{formatBonus(bonus.basisPoints)}</Text>
        </View>
        {!compact&&range?<Text style={s.note}>{gt('Bonus range')}: {formatRange(range)}</Text>:null}
      </View>;
    }):<Text style={s.note}>{gt('Older copy — no recorded bonus')}</Text>}
  </View>;
}

function styles(C:ThemeColors){
  return StyleSheet.create({
    panel:{borderWidth:1,borderColor:C.lineStrong,borderRadius:radii.sm,backgroundColor:C.panel2,overflow:'hidden'},
    heading:{minHeight:48,paddingHorizontal:spacing.sm,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8},
    flex:{flex:1,minWidth:0,gap:2},
    title:{...typography.bodyStrong,color:C.text,fontWeight:'800',fontSize:12},
    subtitle:{...typography.caption,color:C.muted,fontSize:11},
    chevron:{fontSize:19,fontWeight:'700',color:C.muted,minWidth:25,textAlign:'center'},
    content:{borderTopWidth:1,borderTopColor:C.line,gap:3,padding:spacing.sm},
    poolRow:{minHeight:34,flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6,paddingVertical:4,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
    statName:{...typography.bodyStrong,color:C.text,fontSize:12,flexShrink:1},
    range:{...typography.bodyStrong,color:C.good,fontSize:12,fontVariant:['tabular-nums'],textAlign:'right',flexShrink:0},
    note:{...typography.caption,color:C.muted,fontSize:10,lineHeight:15,flexShrink:1},
    details:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,padding:spacing.sm,gap:7},
    detailsHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
    count:{...typography.caption,color:C.muted,fontWeight:'800'},
    detailRow:{gap:4},
    bonusLine:{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'},
    value:{...typography.bodyStrong,color:C.good,fontWeight:'900',fontSize:12,fontVariant:['tabular-nums']},
  });
}

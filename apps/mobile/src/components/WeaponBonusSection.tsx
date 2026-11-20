import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {ItemRarity} from '../core/item-rarity';
import {
  WEAPON_BONUS_LABELS,weaponBonusConfig,weaponBonusRange,weaponBonusRollGrade,
  weaponBonusStrength,type WeaponBonusRoll,type WeaponBonusRollVersion,
} from '../core/weapon-bonus-rolls';
import {useGameplayText} from '../i18n/gameplay';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const formatBonus=(basisPoints:number)=>'+'+(basisPoints/100).toFixed(1)+'%';
const formatRange=(range:readonly [number,number])=>formatBonus(range[0])+'–'+formatBonus(range[1]);

/** Displays actual recipe-specific possibilities. No guessed odds or class-based filtering. */
export function WeaponBonusPool({itemId,initialExpanded=false}:{itemId:string;initialExpanded?:boolean}){
  const C=useGameTheme(),s=useMemo(()=>styles(C),[C]),{gt,gl}=useGameplayText();
  const [expanded,setExpanded]=useState(initialExpanded);
  const base=weaponBonusConfig(itemId,'common'),epic=weaponBonusConfig(itemId,'epic');
  if(!base)return null;
  const twoAtAllRarities=base.count===2;
  return <View style={s.panel}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded}}
      accessibilityLabel={expanded?gt('Hide possible rolls'):gt('View possible rolls')}
      onPress={()=>setExpanded(value=>!value)} style={s.heading}>
      <View style={s.flex}>
        <Text style={s.title}>{gt('Possible bonus stats')}</Text>
        <Text style={s.subtitle}>{base.pool.length} {gt('possible stats')} · {twoAtAllRarities?gt('2 bonuses per weapon'):gt('1 bonus · Epic+ gets 2')}</Text>
      </View>
      <Text style={s.chevron}>{expanded?'−':'+'}</Text>
    </Pressable>
    {expanded?<View style={s.content}>
      <Text style={s.note}>{gt('All eligible weapons share the same bonus pool.')}</Text>
      {base.pool.map(stat=>{
        const range=weaponBonusRange(base.tier,stat);
        if(!range)return null;
        return <View key={stat} style={s.poolRow}>
          <Text style={s.statName}>{gl(WEAPON_BONUS_LABELS[stat])}</Text>
          <Text style={s.range}>{formatRange(range)}</Text>
        </View>;
      })}
      <Text style={s.note}>{gt('Each bonus type can appear only once on a weapon.')}</Text>
      <Text style={s.note}>{twoAtAllRarities?gt('Two different bonuses on every rarity.'):gt('One bonus at any rarity. Epic+ rolls two.')}</Text>
      <Text style={s.note}>{gt('Bonus stats, rarity and quality roll separately on claim.')}</Text>
    </View>:null}
  </View>;
}

/** Exact-copy bonus presentation. A roll grade measures range position, not build strength. */
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
      const range=weaponBonusRange(config.tier,bonus.stat,version);
      const strength=weaponBonusStrength(itemId,rarity,bonus,version);
      const label=gl(WEAPON_BONUS_LABELS[bonus.stat]),grade=gl(weaponBonusRollGrade(strength));
      return <View key={bonus.stat+index} style={s.detailRow}
        accessible accessibilityLabel={label+', '+formatBonus(bonus.basisPoints)+'. '+gt('Roll strength')+' '+strength+'/100'}>
        <View style={s.bonusLine}>
          <Text style={s.statName} numberOfLines={2}>{label}</Text>
          <Text style={s.value}>{formatBonus(bonus.basisPoints)}</Text>
          {!compact?<Text style={s.grade}>{grade}</Text>:null}
        </View>
        {!compact&&range?<View style={s.track}><View style={[s.fill,{width:`${strength}%` as `${number}%`}]}/></View>:null}
        <Text style={s.note}>{range?gt('Bonus range')+': '+formatRange(range)+' · ':''}{gt('Roll strength')}: {strength}/100{compact?' · '+grade:''}</Text>
      </View>;
    }):<Text style={s.note}>{gt('Older copy — no recorded bonus')}</Text>}
    {!compact&&!!rolls?.length?<Text style={s.note}>{gt('Roll strength shows the value within its range, not overall combat value.')}</Text>:null}
  </View>;
}

function styles(C:ThemeColors){
  return StyleSheet.create({
    panel:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,overflow:'hidden'},
    heading:{minHeight:44,paddingHorizontal:spacing.sm,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:8},
    flex:{flex:1,minWidth:0,gap:2},
    title:{...typography.bodyStrong,color:C.text,fontWeight:'800',fontSize:12},
    subtitle:{...typography.caption,color:C.muted,fontSize:11},
    chevron:{fontSize:19,fontWeight:'700',color:C.muted,minWidth:25,textAlign:'center'},
    content:{borderTopWidth:1,borderTopColor:C.line,gap:3,padding:spacing.sm},
    poolRow:{minHeight:29,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line},
    statName:{...typography.bodyStrong,color:C.text,fontSize:12,flexShrink:1},
    range:{...typography.bodyStrong,color:C.good,fontSize:12,fontVariant:['tabular-nums']},
    note:{...typography.caption,color:C.muted,fontSize:10,lineHeight:15,flexShrink:1},
    details:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,padding:spacing.sm,gap:7},
    detailsHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
    count:{...typography.caption,color:C.muted,fontWeight:'800'},
    detailRow:{gap:4},
    bonusLine:{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'space-between'},
    value:{...typography.bodyStrong,color:C.good,fontWeight:'900',fontSize:12,fontVariant:['tabular-nums']},
    grade:{...typography.caption,color:C.good,fontWeight:'800',minWidth:55,textAlign:'right'},
    track:{height:5,borderRadius:3,overflow:'hidden',backgroundColor:C.lineStrong},
    fill:{height:'100%',borderRadius:3,backgroundColor:C.good},
  });
}

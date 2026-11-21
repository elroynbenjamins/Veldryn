import {useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {weaponBonusConfig,weaponBonusRange,WEAPON_BONUS_CURRENT_POOL} from '../core/weapon-bonus-rolls';
import {weaponBonusStatText,weaponBonusUiText} from '../i18n/weapon-bonus-ux';
import {useGameplayText} from '../i18n/gameplay';
import {radii,spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const format=(bps:number)=>'+'+(bps/100).toFixed(1)+'%';

/** A compact, selected-recipe-only disclosure; sourced from the active T1–T9
 * roll config. It does not imply that all equipment slots have weapon affixes. */
export function ForgeWeaponBonusPool({itemId}:{itemId:string}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]),{language}=useGameplayText();
  const {width,fontScale}=useWindowDimensions();
  const stacked=width<330||fontScale>=1.5;
  const [open,setOpen]=useState(false);
  const cfg=weaponBonusConfig(itemId,'common');
  if(!cfg)return null;
  const label=(key:Parameters<typeof weaponBonusUiText>[1])=>weaponBonusUiText(language,key);
  const twoAtEveryRarity=cfg.count===2;
  return <View style={s.panel}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open}}
      accessibilityLabel={label('possible')+', T'+cfg.tier}
      accessibilityHint={open?label('shared'):label(twoAtEveryRarity?'double':'single')}
      onPress={()=>setOpen(value=>!value)} style={({pressed})=>[s.trigger,pressed&&s.pressed]}>
      <View style={s.flex}>
        <Text style={s.heading}>{label('possible')}</Text>
        <Text style={s.summary}>T{cfg.tier} · {cfg.pool.length} {label('possibleCount')} · {label(twoAtEveryRarity?'twoCount':'oneOrTwo')}</Text>
      </View>
      <Text accessible={false} style={s.chevron}>{open?'−':'+'}</Text>
    </Pressable>
    {open?<View style={s.content}>
      <Text style={s.note}>{label('shared')}</Text>
      {WEAPON_BONUS_CURRENT_POOL.map(stat=>{
        const range=weaponBonusRange(cfg.tier,stat);
        if(!range)return null;
        return <View key={stat} accessible accessibilityLabel={weaponBonusStatText(language,stat)+': '+format(range[0])+'–'+format(range[1])} style={[s.statRow,stacked&&s.statRowStack]}>
          <Text style={s.statName}>{weaponBonusStatText(language,stat)}</Text>
          <Text style={s.range}>{format(range[0])}–{format(range[1])}</Text>
        </View>;
      })}
      <Text style={s.explainer}>{label(twoAtEveryRarity?'double':'single')}</Text>
      <Text style={s.note}>{label('claim')}</Text>
    </View>:null}
  </View>;
}

function makeStyles(C:ThemeColors){
  return StyleSheet.create({
    panel:{borderWidth:1,borderColor:C.line,borderRadius:radii.sm,backgroundColor:C.panel2,overflow:'hidden'},
    trigger:{minHeight:46,paddingHorizontal:spacing.sm,paddingVertical:8,flexDirection:'row',alignItems:'center',gap:10},
    flex:{flex:1,minWidth:0,gap:2},
    heading:{...typography.bodyStrong,color:C.text,fontSize:13,fontWeight:'800'},
    summary:{...typography.caption,color:C.muted,fontSize:11},
    chevron:{fontSize:19,fontWeight:'800',color:C.accent,minWidth:24,textAlign:'center'},
    content:{padding:spacing.sm,gap:5,borderTopWidth:1,borderTopColor:C.line},
    statRow:{minHeight:29,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.line,paddingVertical:2},
    statRowStack:{alignItems:'stretch',flexDirection:'column',gap:1},
    statName:{...typography.bodyStrong,color:C.text,fontSize:12,flexShrink:1},
    range:{...typography.bodyStrong,color:C.good,fontSize:12,fontVariant:['tabular-nums'],textAlign:'right'},
    note:{...typography.caption,color:C.muted,fontSize:11,lineHeight:16,flexShrink:1},
    explainer:{...typography.caption,color:C.text,fontSize:11,lineHeight:17,fontWeight:'700'},
    pressed:{opacity:.76},
  });
}

import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {spacing,typography,equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

/** Ornamental live heading shared by Equipment, Inventory and Upgrade surfaces. */
export function EquipmentSectionHeader({title}:{title:string}){
  const C=useGameTheme(),equipmentColors=equipmentTheme(C),s=useMemo(()=>makeStyles(C),[C]);
  return <View accessibilityRole="header" style={s.root}>
    <View style={s.rule}/><Text pointerEvents="none" style={s.diamond}>◆</Text>
    <Text style={s.title}>{title.toUpperCase()}</Text>
    <Text pointerEvents="none" style={s.diamond}>◆</Text><View style={s.rule}/>
  </View>;
}

function makeStyles(C:ThemeColors){const equipmentColors=equipmentTheme(C);return StyleSheet.create({
  root:{minHeight:28,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.xs},
  rule:{height:1,flex:1,backgroundColor:equipmentColors.line,opacity:.85},
  diamond:{fontSize:8,lineHeight:12,color:equipmentColors.gold},
  title:{...typography.title,color:equipmentColors.goldSoft,textAlign:'center',letterSpacing:.8},
});}

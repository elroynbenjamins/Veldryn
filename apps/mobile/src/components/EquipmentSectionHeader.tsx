import {StyleSheet,Text,View} from 'react-native';
import {equipmentColors,spacing,typography} from '../theme/theme';

/** Ornamental live heading shared by Equipment, Inventory and Upgrade surfaces. */
export function EquipmentSectionHeader({title}:{title:string}){
  return <View accessibilityRole="header" style={s.root}>
    <View style={s.rule}/><Text pointerEvents="none" style={s.diamond}>◆</Text>
    <Text style={s.title}>{title.toUpperCase()}</Text>
    <Text pointerEvents="none" style={s.diamond}>◆</Text><View style={s.rule}/>
  </View>;
}

const s=StyleSheet.create({
  root:{minHeight:28,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.xs},
  rule:{height:1,flex:1,backgroundColor:equipmentColors.line,opacity:.85},
  diamond:{fontSize:8,lineHeight:12,color:equipmentColors.gold},
  title:{...typography.title,color:equipmentColors.goldSoft,textAlign:'center',letterSpacing:.8},
});

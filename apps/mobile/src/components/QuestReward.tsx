import {useMemo} from 'react';
import {StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {C,radii,typography} from '../theme/theme';
import {useTheme} from '../theme/ThemeProvider';
import {ItemArtwork} from './ItemArtwork';

/** Reward preview only; claiming remains the screen's explicit action. */
export function QuestReward({gold,xp,itemId,quantity=1,label='Rewards'}:{gold:number;xp?:number;itemId?:string;quantity?:number;label?:string}){
 const {colors:C,equipmentColors}=useTheme();const s=useMemo(()=>createStyles(C,equipmentColors),[C,equipmentColors]);
  return <View style={s.root}>
    <Text style={s.label}>{label}</Text>
    <View style={s.currencies}><Text style={s.gold}>{gold} gold</Text>{xp!==undefined&&<Text style={s.xp}>{xp} XP</Text>}</View>
    {itemId&&<View style={s.item}><View accessible={false} importantForAccessibility="no-hide-descendants"><ItemArtwork itemId={itemId} size={40}/></View><Text style={s.name}>{quantity}× {itemDef(itemId).name}</Text></View>}
  </View>;
}
const createStyles=(C:any,equipmentColors:any)=>StyleSheet.create({root:{gap:8,padding:12,borderRadius:radii.md,backgroundColor:'#101B27',borderWidth:StyleSheet.hairlineWidth,borderColor:C.line},label:{...typography.caption,color:C.muted},currencies:{flexDirection:'row',flexWrap:'wrap',columnGap:16,rowGap:4},gold:{...typography.bodyStrong,color:C.accent},xp:{...typography.bodyStrong,color:C.info},item:{flexDirection:'row',alignItems:'center',gap:12},name:{...typography.body,color:C.text,flex:1,minWidth:0}});

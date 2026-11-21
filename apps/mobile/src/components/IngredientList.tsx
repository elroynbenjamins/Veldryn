import {useGameplayText} from '../i18n/gameplay';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {localizedItemName} from '../i18n/starter-item-names';
import {ItemArtwork} from './ItemArtwork';
import {formatGameNumber} from '../core/number-format';
import {C,typography} from '../theme/theme';
export type IngredientCount={itemId:string;quantity:number;inventory:number;bank:number};
export function IngredientList({inputs,numberMode='abbreviated',showStorage=false,compact=false}:{inputs:IngredientCount[];numberMode?:'abbreviated'|'exact';showStorage?:boolean;compact?:boolean}){
 const {gt,language}=useGameplayText(),{fontScale}=useWindowDimensions();
 const rows=compact?[...inputs].sort((a,b)=>Number(a.inventory+a.bank>=a.quantity)-Number(b.inventory+b.bank>=b.quantity)):inputs;
 return <View style={s.list}>{rows.map(input=>{const owned=input.inventory+input.bank,enough=owned>=input.quantity;return <View key={input.itemId} accessible accessibilityLabel={localizedItemName(language,input.itemId)+', '+formatGameNumber(owned,numberMode,language)+' / '+formatGameNumber(input.quantity,numberMode,language)+', '+gt(enough?'Ready':'Missing')} style={[s.ingredient,compact&&s.compactRow]}><ItemArtwork itemId={input.itemId} size={compact?28:32}/><View style={[s.copy,compact&&fontScale<1.3&&s.compactCopy]}><Text numberOfLines={compact&&fontScale<1.3?1:undefined} style={s.name}>{localizedItemName(language,input.itemId)}</Text><Text style={[s.count,compact&&s.compactCount,{color:enough?C.good:C.warning}]}>{formatGameNumber(owned,numberMode,language)} / {formatGameNumber(input.quantity,numberMode,language)}{compact?(enough?' ✓':' !'):(' · '+gt(enough?'Ready':'Missing'))}</Text>{showStorage&&!compact&&<Text style={s.storage}>{gt('{bag} bag · {bank} bank',{bag:formatGameNumber(input.inventory,numberMode,language),bank:formatGameNumber(input.bank,numberMode,language)})}</Text>}</View></View>})}</View>;
}
const s=StyleSheet.create({list:{gap:8},ingredient:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:4},compactRow:{minHeight:40,gap:8,paddingVertical:3},compactCopy:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},compactCount:{flexShrink:0,textAlign:'right',fontWeight:'800'},copy:{flex:1,minWidth:0},name:{...typography.bodyStrong,color:C.text},count:{...typography.caption},storage:{...typography.caption,color:C.muted}});

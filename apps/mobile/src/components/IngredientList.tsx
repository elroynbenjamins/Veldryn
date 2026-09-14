import {StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {ItemArtwork} from './ItemArtwork';
import {formatGameNumber} from '../core/number-format';
import {C,typography} from '../theme/theme';
export type IngredientCount={itemId:string;quantity:number;inventory:number;bank:number};
export function IngredientList({inputs,numberMode='abbreviated',showStorage=false}:{inputs:IngredientCount[];numberMode?:'abbreviated'|'exact';showStorage?:boolean}){
 return <View style={s.list}>{inputs.map(input=>{const owned=input.inventory+input.bank,enough=owned>=input.quantity;return <View key={input.itemId} style={s.ingredient}><ItemArtwork itemId={input.itemId} size={32}/><View style={s.copy}><Text style={s.name}>{itemDef(input.itemId).name}</Text><Text style={[s.count,{color:enough?C.good:C.warning}]}>{formatGameNumber(owned,numberMode)} / {formatGameNumber(input.quantity,numberMode)}{enough?' · Ready':' · Missing'}</Text>{showStorage&&<Text style={s.storage}>{formatGameNumber(input.inventory,numberMode)} bag · {formatGameNumber(input.bank,numberMode)} bank</Text>}</View></View>})}</View>;
}
const s=StyleSheet.create({list:{gap:8},ingredient:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:4},copy:{flex:1,minWidth:0},name:{...typography.bodyStrong,color:C.text},count:{...typography.caption},storage:{...typography.caption,color:C.muted}});

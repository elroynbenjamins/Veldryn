import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {progressionT,progressionText,type ProgressionKey} from '../i18n/progression';
import {StyleSheet,Text,View} from 'react-native';
import {itemDef} from '../content/items';
import {radii,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {useMemo} from 'react';
import {ItemArtwork} from './ItemArtwork';

/** Reward preview only; claiming remains the screen's explicit action. */
export function QuestReward({gold,xp,itemId,quantity=1,label='Rewards',rarityColor}:{gold:number;xp?:number;itemId?:string;quantity?:number;label?:string;rarityColor?:string}){
  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
  const contextLanguage=useGameLanguage(),language=contextLanguage;
  const t=(key:ProgressionKey,params?:Record<string,string|number>)=>progressionT(language,key,params);
  const p=(text:string)=>progressionText(language,text);

  return <View style={[s.root,rarityColor?{borderColor:rarityColor,borderLeftWidth:3}:undefined]}>
    <Text style={s.label}>{p(label)}</Text>
    <View style={s.currencies}><Text style={s.gold}>{gold} {t("Gold")}</Text>{xp!==undefined&&<Text style={s.xp}>{xp} XP</Text>}</View>
    {itemId&&<View style={s.item}><View accessible={false} importantForAccessibility="no-hide-descendants"><ItemArtwork itemId={itemId} size={40}/></View><Text style={s.name}>{quantity}× {itemDef(itemId).name}</Text></View>}
  </View>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{gap:8,padding:12,borderRadius:radii.md,backgroundColor:C.panel,borderWidth:1,borderColor:C.line},label:{...typography.caption,color:C.muted},currencies:{flexDirection:'row',flexWrap:'wrap',columnGap:16,rowGap:4},gold:{...typography.bodyStrong,color:C.accent},xp:{...typography.bodyStrong,color:C.info},item:{flexDirection:'row',alignItems:'center',gap:12},name:{...typography.body,color:C.text,flex:1,minWidth:0}});}

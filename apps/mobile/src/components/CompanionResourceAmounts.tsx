import {Text,View} from 'react-native';
import {ResourceIcon} from './ResourceIcon';
import {useGameTheme} from '../theme/ThemeContext';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionTranslator} from '../i18n/companions';
import {companionMaterialName} from '../core/companion-presentation';

export function CompanionResourceAmounts({gold,essence,bondstones,materials}:{gold?:number;essence?:number;bondstones?:number;materials?:Record<string,number>}){
 const C=useGameTheme(),language=useGameLanguage(),t=companionTranslator(language);
 const rows=[{id:'gold',label:t('Gold'),amount:gold},{id:'essence',label:t('Essence'),amount:essence},{id:'bondstones',label:t('Bondstones'),amount:bondstones},...Object.entries(materials??{}).map(([id,amount])=>({id,label:companionMaterialName(id),amount}))];
 return <View style={{width:'100%',flexShrink:1,flexDirection:'row',flexWrap:'wrap',gap:10}}>{rows.filter(row=>row.amount!==undefined&&row.amount>0).map(row=><View key={row.id} style={{flexDirection:'row',alignItems:'center',gap:5}}><ResourceIcon resourceId={row.id}/><Text style={{color:C.text,fontSize:12}}>{row.amount!.toLocaleString(language)} {row.label}</Text></View>)}</View>;
}

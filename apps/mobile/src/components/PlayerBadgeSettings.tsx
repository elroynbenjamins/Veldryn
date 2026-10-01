import {accountText,accountError} from '../i18n/account';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {StyleSheet,Switch,Text,View} from 'react-native';
import {usePlayerBadges,type BadgeState} from '../online/PlayerBadgeProvider';
import {PlayerBadges} from './PlayerBadges';
import {useGameTheme} from '../theme/ThemeContext';
import {GameButton} from './GameButton';

export function PlayerBadgeSettings(){
 const badges=usePlayerBadges();
 return <PlayerBadgeSettingsView badges={badges}/>;
}
export function PlayerBadgeSettingsView({language:languageOverride,badges}:{language?:Language;badges:BadgeState}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);

 const C=useGameTheme();
 if(!badges.accountId)return null;
 return <View style={s.root}>
  <Text style={[s.title,{color:C.text}]}>{a("Player badges")}</Text>
  <PlayerBadges identity={badges.identity} showLabels size={28}/>
  <View style={s.row}><Text style={[s.label,{color:C.text}]}>{a("Show Supporter badge")}</Text><Switch accessibilityLabel={a("Show Supporter badge")} value={badges.showSupporter} disabled={badges.loading||badges.busy||!!badges.error} onValueChange={value=>void badges.setVisible(value)}/></View>
  {!badges.supporterAvailable&&!badges.loading?<Text style={[s.note,{color:C.muted}]}>{a("Requires an active Supporter subscription.")}</Text>:null}
  {badges.error?<><Text accessibilityRole="alert" style={[s.note,{color:C.bad}]}>{accountError(language,badges.error,'Could not load badges.')}</Text><GameButton compact title={a("Retry badges")} tone="secondary" onPress={()=>void badges.refresh()}/></>:null}
 </View>;
}
const s=StyleSheet.create({root:{gap:10,paddingVertical:12},title:{fontSize:14,fontWeight:'700'},row:{flexDirection:'row',alignItems:'center',gap:12},label:{flex:1,fontSize:13},note:{fontSize:12,lineHeight:18}});

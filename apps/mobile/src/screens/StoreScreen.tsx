import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text} from 'react-native';
import {GooglePlayCommercePanel} from '../components/GooglePlayCommercePanel';
import {GameButton} from '../components/GameButton';
import type {GameState} from '../core/types';
import {accountText} from '../i18n/account';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';

export function StoreScreen({state,onChange,onOpenAccount}:{state:GameState;onChange:(next:GameState)=>void;onOpenAccount:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const a=(text:string)=>accountText(state.settings.language,text);
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false}>
  <Text accessibilityRole="header" style={s.title}>{a('Store')}</Text>
  <Text style={s.intro}>{a('VIP, VIP+ and Supporter. View benefits and manage your purchases.')}</Text>
  <GooglePlayCommercePanel state={state} onChange={onChange}/>
  <GameButton title={a('Manage account')} tone="secondary" onPress={onOpenAccount}/>
 </ScrollView>;
}
function styles(C:ThemeColors){return StyleSheet.create({root:{padding:spacing.lg,gap:spacing.md,paddingBottom:110},title:{...typography.hero,color:C.text},intro:{...typography.body,color:C.muted,lineHeight:21}});}

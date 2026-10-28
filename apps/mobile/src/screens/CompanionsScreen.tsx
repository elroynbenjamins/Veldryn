import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {companionUnlockRequirement,companionAttentionText,companionContent,companionTranslator} from '../i18n/companions';
import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {GameState} from '../core/types';
import type {GameCommand} from '../core/game-commands';
import type {CompanionMaterialSourceTarget} from '../core/companion-presentation';
import {companionAttentionSummary} from '../core/companion-attention';
import {CombatCompanionPanel} from '../components/CombatCompanionPanel';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import type {Language} from '../i18n';
import {earlyFeatureUnlockProgress} from '../core/feature-unlocks';

export function CompanionsScreen({state,language: _language,now,onCommand,onNavigateSource}:{state:GameState;language:Language;now:number;onCommand:(command:GameCommand)=>Promise<void>;onCreate:()=>void;onNavigateSource?:(source:CompanionMaterialSourceTarget)=>void}){
 const language=useGameLanguage(),t=companionTranslator(language);

  const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const attention=companionAttentionSummary(state,now),labels=companionAttentionText(language,attention),unlock=earlyFeatureUnlockProgress(state,'companions');
 if(!unlock.unlocked)return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text accessibilityRole="header" style={s.heading}>{t("Companions")}</Text><View style={s.locked}><Text style={s.lockIcon}>◆</Text><Text style={s.lockTitle}>{t("Sanctuary locked")}</Text><Text style={s.lockRequirement}>{t("UNLOCK · {value0}", {value0: companionUnlockRequirement(language,unlock.requirement)})}</Text><Text style={s.lockCopy}>{companionContent(language,unlock.description)}</Text></View></ScrollView>;
 return <ScrollView contentContainerStyle={s.root} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}><Text accessibilityRole="header" style={s.heading}>{t("Companions")}</Text>{attention.hasAttention&&labels.length?<View style={s.attention} accessibilityLabel={labels.join(' · ')}><Text numberOfLines={2} style={s.attentionText}>{labels[0]}{labels.length>1?t(" · +{value0} more",{value0:labels.length-1}):''}</Text></View>:null}<CombatCompanionPanel state={state} now={now} onCommand={onCommand} onNavigateSource={onNavigateSource}/></ScrollView>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({root:{padding:spacing.md,gap:spacing.md,paddingBottom:spacing.xl},kicker:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:1.4},heading:{...typography.hero,color:C.text,marginTop:-6},intro:{...typography.body,color:C.muted,maxWidth:460,marginBottom:spacing.xs},attention:{paddingVertical:spacing.xs,paddingHorizontal:spacing.sm,borderWidth:1,borderColor:C.line,borderRadius:8,backgroundColor:C.panel2,gap:2},attentionTitle:{...typography.caption,color:C.good,fontWeight:'700',letterSpacing:.8},attentionText:{...typography.caption,color:C.text},locked:{alignItems:'center',gap:6,padding:18,borderWidth:1,borderColor:C.line,borderRadius:12,backgroundColor:C.panel2},lockIcon:{fontSize:28,color:C.muted},lockTitle:{...typography.title,color:C.text},lockRequirement:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.8},lockCopy:{...typography.caption,color:C.muted,textAlign:'center',maxWidth:420}});}

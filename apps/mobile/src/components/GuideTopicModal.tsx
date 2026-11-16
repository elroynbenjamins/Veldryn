import {accountText} from '../i18n/account';
import {guideHubText} from '../i18n/game-guide-hub';
import type {Language} from '../i18n/languages';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {GAME_GUIDE_CATEGORIES,GAME_GUIDE_STEPS,type GameGuideDestination,type GameGuideDefinition} from '../core/onboarding';
import {GameButton} from './GameButton';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';

const categories={basics:'Basics',progress:'Progress',social:'Social',adventures:'Adventures'} as const;
export function GuideTopicModal({language:languageOverride,definition,visible,onClose,onOpen,onPrevious,onNext,position,canNavigate=true}:{
 language?:Language;
 definition?:GameGuideDefinition;
 visible:boolean;
 onClose:()=>void;
 onOpen?:(destination:GameGuideDestination)=>void;
 onPrevious?:()=>void;
 onNext?:()=>void;
 position?:{index:number;total:number};
 canNavigate?:boolean;
}){
 const contextLanguage=useGameLanguage(),language=languageOverride??contextLanguage;
 const a=(text:string,params?:Record<string,string|number>)=>accountText(language,text,params);
 const t=(label:Parameters<typeof guideHubText>[1])=>guideHubText(language,label);
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 if(!definition)return null;
 const steps=GAME_GUIDE_STEPS[definition.id];
 const category=categories[GAME_GUIDE_CATEGORIES[definition.id]];
 const target=definition.destination==='More'?'Account':definition.destination==='Coop'?'Co-op Dungeons':definition.destination;
 return <GameModalSurface visible={visible} onClose={onClose} backdropLabel={a('Close Game Guide')}>
  <GameModalHeader eyebrow={t(category)} title={a(definition.title)} onClose={onClose}/>
  <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} nestedScrollEnabled>
   {position?<Text style={s.pageCount}>{position.index} / {position.total} {t('Guides').toLocaleLowerCase()}</Text>:null}
   <View style={s.summaryCard}>
    <Text style={s.summary}>{a(definition.summary)}</Text>
   </View>
   {!canNavigate?<View style={s.lockedNotice}>
    <Text style={s.lockedTitle}>{t('Preview only — unlock this feature to use it.')}</Text>
    <Text style={s.lockedCopy}>{t('Unlock requirement')}: {a(definition.unlockHint)}</Text>
   </View>:null}
   <Text style={s.sectionLabel}>{t('How it works').toLocaleUpperCase()}</Text>
   <View style={s.steps}>
    {steps.map((step,index)=><View key={index} style={s.step}>
     <View style={s.stepMarker}><Text style={s.number}>{index+1}</Text></View>
     <Text style={s.detail}>{a(step)}</Text>
    </View>)}
   </View>
  </ScrollView>
  <View style={s.footer}>
   {canNavigate&&onOpen?<GameButton title={t('Open screen')+': '+a(target)} onPress={()=>onOpen(definition.destination)}/>:null}
   {onPrevious||onNext?<View style={s.navigation}>
    {onPrevious?<GameButton compact tone="secondary" title={'‹ '+t('Previous')} onPress={onPrevious} style={s.navigationButton}/>:null}
    {onNext?<GameButton compact tone="secondary" title={t('Next guide')+' ›'} onPress={onNext} style={s.navigationButton}/>:null}
   </View>:null}
  </View>
 </GameModalSurface>;
}
function makeStyles(C:ThemeColors){return StyleSheet.create({
 scroll:{flexShrink:1,minHeight:0},
 content:{gap:13,paddingTop:6,paddingBottom:spacing.md},
 pageCount:{...typography.caption,fontSize:10,fontWeight:'800',color:C.muted,textAlign:'right'},
 summaryCard:{backgroundColor:C.selection,borderWidth:1,borderColor:C.selectionLine,borderRadius:11,padding:12},
 summary:{...typography.bodyStrong,color:C.text,lineHeight:22},
 sectionLabel:{fontSize:11,fontWeight:'900',letterSpacing:1,color:C.accent},
 steps:{gap:12},
 step:{flexDirection:'row',gap:11,alignItems:'flex-start',minHeight:38},
 stepMarker:{width:30,height:30,borderRadius:9,borderWidth:1,borderColor:C.lineStrong,backgroundColor:C.panel2,alignItems:'center',justifyContent:'center'},
 number:{fontSize:13,fontWeight:'900',color:C.accent},
 detail:{...typography.body,color:C.text,lineHeight:22,flex:1},
 lockedNotice:{borderColor:C.warning,borderWidth:1,borderRadius:10,padding:10,gap:5,backgroundColor:C.warningSurface},
 lockedTitle:{fontSize:12,fontWeight:'800',color:C.warning},
 lockedCopy:{fontSize:12,lineHeight:19,color:C.text},
 footer:{gap:8,borderTopColor:C.line,borderTopWidth:1,paddingVertical:10},
 navigation:{flexDirection:'row',gap:8,justifyContent:'space-between'},
 navigationButton:{flexGrow:1,flexBasis:0}
});}

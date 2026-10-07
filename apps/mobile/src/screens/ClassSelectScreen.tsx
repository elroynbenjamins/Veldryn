import {creationT as ct,creationText} from '../i18n/creation';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,Keyboard,KeyboardAvoidingView,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {ConfirmModal} from '../components/ConfirmModal';
import {FixedCharacterPortrait} from '../components/CharacterVisual';
import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {BodyPresentation,ClassId,GameState} from '../core/types';
import {carouselIndex,characterNameError,normalizeCharacterName} from '../core/character-creation';
import {equipmentTheme,UI_THEMES,type ThemeColors,type UiThemeId} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {startupWordmark} from '../theme/startup-art';
import {ClassHeroCarousel} from '../components/creation/ClassHeroCarousel';
import {CreationAction} from '../components/creation/CreationChrome';
import {ClassCombatOverview} from '../components/creation/ClassCombatOverview';
import {CreationLanguagePicker} from '../components/creation/CreationLanguagePicker';
import {StarterWeaponArtwork} from '../components/StarterWeaponArtwork';
import {CLASS_PLAYSTYLE as playStyle} from '../core/class-selection';
import {t} from '../i18n';

type Step='class'|'identity'|'review';
const STEPS:readonly Step[]=['class','identity','review'];
export function ClassSelectScreen({language:languageProp,onLanguage,themeId,onTheme,onSelect,onCancel,cancelLabel,onSignInExisting}:{language?:GameState['settings']['language'];onLanguage?:(language:GameState['settings']['language'])=>void;themeId?:UiThemeId;onTheme?:(themeId:UiThemeId)=>Promise<void>|void;onSelect:(id:ClassId,name:string,body:BodyPresentation)=>Promise<void>|void;onCancel?:()=>void;cancelLabel?:string;onSignInExisting?:()=>void}){
 const gameLanguage=useGameLanguage(),language=languageProp??gameLanguage;
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {height,width,fontScale}=useWindowDimensions();
 const compact=height<720||fontScale>1.2;
 const submitting=useRef(false),scroll=useRef<ScrollView>(null);
 const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
 const [step,setStep]=useState<Step>('class');
 const [index,setIndex]=useState(0),[name,setName]=useState(''),[confirming,setConfirming]=useState(false);
 const [body,setBody]=useState<BodyPresentation>('male');
 const [nameFocused,setNameFocused]=useState(false);
 const selected=CLASSES[index]??CLASSES[0];
 const activeThemeId=themeId??C.id;
 const activeTheme=UI_THEMES[activeThemeId];
 const safeName=normalizeCharacterName(name),nameError=characterNameError(name);
 const starter=itemDef(selected.starterEquipment.weapon);
 const roleColor={Tank:C.info,Support:C.good,Damage:C.warning};
 useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false})},[step]);
 const change=(direction:number)=>{if(!submitting.current)setIndex(current=>carouselIndex(current,direction,CLASSES.length))};
 const swipe=useMemo(()=>PanResponder.create({
  onMoveShouldSetPanResponder:(_,gesture)=>!submitting.current&&Math.abs(gesture.dx)>18&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.5,
  onPanResponderRelease:(_,gesture)=>{if(!submitting.current&&Math.abs(gesture.dx)>40)setIndex(current=>carouselIndex(current,gesture.dx<0?1:-1,CLASSES.length))},
 }),[]);
 const stepLabel=(value:Step)=>t(language,value==='class'?'onboarding.stepClass':value==='identity'?'onboarding.stepIdentity':'onboarding.stepReview');
 const next=()=>{
  if(submitting.current)return;
  if(step==='identity'&&nameError)return;
  Keyboard.dismiss();setNameFocused(false);setSaveError('');
  if(step==='class')setStep('identity');else if(step==='identity')setStep('review');
 };
 async function finish(){
  if(submitting.current)return;
  // Validate again at submission, not only when the previous button was enabled.
  const error=characterNameError(name);
  if(error){setConfirming(false);setSaveError(error);setStep('identity');return;}
  submitting.current=true;setSaving(true);setSaveError('');setConfirming(false);Keyboard.dismiss();
  try{await onSelect(selected.id,normalizeCharacterName(name),body)}
  catch{setSaveError('Your character could not be saved. Your choices are still here; please try again.')}
  finally{submitting.current=false;setSaving(false)}
 }
 const back=()=>{if(submitting.current)return;Keyboard.dismiss();setNameFocused(false);setSaveError('');setStep(step==='review'?'identity':'class')};
 return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS==='ios'?'padding':'height'}>
  <ScrollView ref={scroll} style={s.scroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View pointerEvents={saving?'none':'auto'}>
    <View style={s.brandRow}><Image accessibilityLabel="Veldryn" source={startupWordmark} resizeMode="contain" style={s.wordmark}/>
     {!!onLanguage&&<CreationLanguagePicker language={language} onChange={onLanguage} disabled={saving}/>}
    </View>
    <Text style={s.kicker}>{onCancel?ct(language,'CREATE A CHARACTER'):t(language,'onboarding.createFirst')}</Text>
    {!onCancel&&onSignInExisting?<Pressable accessibilityRole="button" disabled={saving} onPress={onSignInExisting} style={s.existingAccount}><Text style={s.existingAccountText}>{ct(language,"Already played VELDRYN? Sign in to your existing account")}</Text></Pressable>:null}
    <View accessibilityRole="progressbar" accessibilityLabel={ct(language,"Character creation")} accessibilityValue={{min:1,max:STEPS.length,now:STEPS.indexOf(step)+1,text:stepLabel(step)}} style={s.stepRow}>{STEPS.map((item,i)=><View key={item} style={s.stepWrap}><View style={[s.stepDot,STEPS.indexOf(step)>=i&&s.stepDotActive]}><Text style={[s.stepNumber,STEPS.indexOf(step)>=i&&s.stepNumberActive]}>{i+1}</Text></View><Text style={[s.stepLabel,item===step&&s.stepLabelActive]}>{stepLabel(item)}</Text></View>)}</View>
    {step==='class'&&<View style={s.section}>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.chooseCalling')}</Text>
     <ClassHeroCarousel language={language} selected={selected} classes={CLASSES} index={index} onChange={change} onIndex={value=>{if(!submitting.current)setIndex(value)}} panHandlers={swipe.panHandlers}/>
     <View style={s.playStyleCard}><Text style={s.label}>{ct(language,"PLAY STYLE")}</Text><Text style={[s.playStyleText,{color:roleColor[selected.role]}]}>{creationText(language,playStyle[selected.id])}</Text></View>
     <ClassCombatOverview key={selected.id} classId={selected.id} language={language}/>
     <View style={s.loadout}><StarterWeaponArtwork itemId={starter.id} size={52}/><View style={s.flex}><Text style={s.label}>{ct(language,"STARTING WEAPON")}</Text><Text style={s.gearName}>{starter.name}</Text></View><Text style={s.weaponTag}>{ct(language,'Lv. {level}',{level:1})}</Text></View>
     <Text style={s.note}>{ct(language,"Choose a name in the next step. Your class emblem is your first profile icon.")}</Text>
    </View>}
    {step==='identity'&&<View style={s.section}>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.whoEnters')}</Text>
     <View style={s.identityPreview}><FixedCharacterPortrait classId={selected.id} body={body} style={compact?s.compactPortrait:s.creationPortrait}/><Text style={[s.reviewRole,{color:roleColor[selected.role]}]}>{selected.name} · {ct(language,selected.role)}</Text></View>
     <View style={s.nameBlock}><Text style={s.label}>{t(language,'onboarding.characterName')}</Text><View style={[s.nameField,nameFocused&&s.nameFieldFocused,!!nameError&&s.nameFieldError]}>
      <TextInput accessibilityLabel={t(language,'onboarding.characterName')} value={name} editable={!saving} onChangeText={value=>{setName(value);setSaveError('')}} onFocus={()=>setNameFocused(true)} onBlur={()=>setNameFocused(false)} maxLength={20} autoCapitalize="words" autoCorrect={false} returnKeyType="done" onSubmitEditing={next} underlineColorAndroid="transparent" style={s.input} placeholder={ct(language,"Enter character name")} placeholderTextColor={C.muted}/>
     </View><View style={s.inputMeta}><Text accessibilityLiveRegion="polite" style={s.error}>{creationText(language,nameError)}</Text><Text style={s.counter}>{name.length}/20</Text></View></View>
     {!!onTheme&&<View style={s.themeBlock}>
      <Text style={s.label}>{ct(language,"INTERFACE THEME")}</Text>
      <Text style={s.themeHint}>{ct(language,"Choose how VELDRYN feels to use. You can change this anytime in Settings.")}</Text>
      <View style={s.themeGrid}>{(['obsidian','ember','ivory'] as const).map(id=>{const theme=UI_THEMES[id],selectedTheme=activeThemeId===id;return <Pressable key={id} accessibilityRole="button" accessibilityLabel={ct(language,'{name} interface theme',{name:theme.name})} accessibilityState={{selected:selectedTheme}} disabled={saving} onPress={()=>onTheme(id)} style={({pressed})=>[s.themeChoice,{backgroundColor:theme.panel,borderColor:selectedTheme?theme.selectionLine:theme.line},selectedTheme&&s.themeChoiceSelected,pressed&&s.themeChoicePressed]}>
       <View style={s.themeHead}><View style={s.flex}><Text style={[s.themeName,{color:theme.text}]}>{theme.name}</Text><Text style={[s.themeCopy,{color:theme.muted}]}>{id==='obsidian'?ct(language,"Near-black and neutral"):id==='ember'?ct(language,"Dark with warm ember accents"):ct(language,"Light with cool mint accents")}</Text></View>{selectedTheme?<Text style={[s.themeCheck,{color:theme.selectionLine}]}>✓</Text>:null}</View>
       <View style={s.themeSwatches}>{[theme.bg,theme.panelRaised,theme.accent,theme.selectionLine].map((color,swatch)=><View key={swatch} style={[s.themeSwatch,{backgroundColor:color,borderColor:theme.line}]}/>)}</View>
      </Pressable>})}</View>
     </View>}
    </View>}
    {step==='review'&&<View style={s.section}>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.ready')}</Text>
     <View style={[s.reviewCard,(width<360||fontScale>1.2)&&s.reviewCardStacked]}><FixedCharacterPortrait classId={selected.id} body={body} compact/><View style={s.reviewCopy}><Text style={s.reviewName}>{safeName}</Text><Text style={[s.reviewRole,{color:roleColor[selected.role]}]}>{selected.name} · {ct(language,selected.role)}</Text><Text style={s.reviewLine}>{ct(language,'Starting weapon: {name}',{name:starter.name})}</Text><Text style={s.reviewLine}>{ct(language,"Class profile icon · No armor or off-hand equipped")}</Text>{!!onTheme&&<Text style={s.reviewLine}>{ct(language,'Interface theme: {name}',{name:activeTheme.name})}</Text>}</View></View>
     <Text style={s.note}>{ct(language,"To choose a different class, delete or reset this character and start again. You can change your profile icon anytime.")}</Text>
     <View style={s.firstStep}><Text style={s.firstStepLabel}>{ct(language,"WHAT HAPPENS NEXT")}</Text><Text style={s.firstStepText}>{ct(language,"A small first hunt. We will explain each new screen when you need it.")}</Text></View>
    </View>}
   </View>
  </ScrollView>
  <View style={s.footer}>
   {!!saveError&&<View accessibilityRole="alert" style={s.saveErrorCard}><Text style={s.saveErrorLabel}>{ct(language,"CHARACTER SAVE FAILED")}</Text><Text style={s.error}>{creationText(language,saveError)}</Text></View>}
   <View style={s.navigation}>
    {step==='class'&&onCancel&&<View style={s.secondaryAction}><CreationAction title={cancelLabel??t(language,'common.back')} disabled={saving} secondary onPress={onCancel}/></View>}
    {step!=='class'&&<View style={s.secondaryAction}><CreationAction title={t(language,'common.back')} disabled={saving} secondary onPress={back}/></View>}
    <View style={s.primaryAction}><CreationAction title={saving?ct(language,'Saving character…'):step==='review'?ct(language,'Enter Asterfall'):t(language,step==='class'?'onboarding.chooseIdentity':'onboarding.reviewCharacter')} disabled={saving||(step==='identity'&&!!nameError)} onPress={step==='review'?()=>{if(!submitting.current)setConfirming(true)}:next}/></View>
   </View>
  </View>
  <ConfirmModal visible={confirming} title={ct(language,'Create {name}?',{name:safeName})} message={ct(language,'{name} will enter Asterfall as a {className}. Choosing a different class later requires deleting or resetting this character.',{name:safeName,presentation:t(language,body==='male'?'onboarding.male':'onboarding.female'),className:selected.name})} confirmLabel={ct(language,"Enter Asterfall")} onConfirm={finish} onCancel={()=>setConfirming(false)}/>
 </KeyboardAvoidingView>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},scroll:{flex:1},root:{width:'100%',maxWidth:520,alignSelf:'center',padding:16,paddingTop:12,paddingBottom:20},brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},wordmark:{flex:1,maxWidth:184,height:62},kicker:{fontSize:11,lineHeight:16,color:C.accentSoft,fontWeight:'900',letterSpacing:1.5,textAlign:'center',marginVertical:8},languageToggle:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:8},languageCurrent:{fontSize:12,color:C.text,fontWeight:'700',flexShrink:1},languageMark:{fontSize:22,color:C.accent},existingAccount:{minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:12,borderWidth:1,borderColor:C.info,borderRadius:12,backgroundColor:C.infoSurface},existingAccountText:{fontSize:13,lineHeight:18,color:C.info,fontWeight:'900',textAlign:'center'},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8},languageChip:{minWidth:96,minHeight:44,justifyContent:'center',padding:10,borderWidth:1,borderColor:C.line,borderRadius:16},
 stepRow:{flexDirection:'row',paddingVertical:12,marginBottom:8,gap:6},stepWrap:{flexDirection:'row',flex:1,alignItems:'center',justifyContent:'center',gap:5,flexWrap:'wrap'},stepDot:{width:24,height:24,borderRadius:12,alignItems:'center',justifyContent:'center'},stepDotActive:{backgroundColor:C.selection},stepNumber:{fontSize:12,color:C.muted,fontWeight:'900'},stepNumberActive:{color:C.text},stepLabel:{fontSize:12,color:C.muted,fontWeight:'800',flexShrink:1},stepLabelActive:{color:C.accentSoft,fontWeight:'900'},section:{gap:12},heading:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:29,lineHeight:37,fontWeight:'600',color:C.accentSoft,textAlign:'center'},
 identityPreview:{alignItems:'center',backgroundColor:C.stage,borderRadius:24,padding:12,gap:6},creationPortrait:{width:148,height:178},compactPortrait:{width:104,height:126},nameBlock:{gap:6},nameField:{borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.inputBg,paddingHorizontal:16,paddingVertical:12},nameFieldFocused:{borderColor:C.selectionLine},nameFieldError:{borderColor:C.bad},label:{fontSize:10,lineHeight:16,color:C.muted,fontWeight:'800',letterSpacing:1},input:{minHeight:28,color:C.text,padding:0,fontSize:17,fontWeight:'600',textAlignVertical:'center',includeFontPadding:false},inputMeta:{flexDirection:'row',justifyContent:'space-between',gap:8},error:{fontSize:12,lineHeight:18,color:C.bad,flexShrink:1},counter:{fontSize:12,lineHeight:18,color:C.muted},themeBlock:{gap:7,marginTop:4},themeHint:{fontSize:12,lineHeight:18,color:C.muted},themeGrid:{gap:8},themeChoice:{minHeight:72,borderWidth:2,borderRadius:14,padding:10,gap:8},themeChoiceSelected:{shadowColor:C.selectionLine,shadowOpacity:.16,shadowRadius:8,elevation:1},themeChoicePressed:{opacity:.78},themeHead:{flexDirection:'row',alignItems:'center',gap:8},themeName:{fontSize:14,lineHeight:20,fontWeight:'900'},themeCopy:{fontSize:11,lineHeight:16},themeCheck:{fontSize:19,lineHeight:22,fontWeight:'900'},themeSwatches:{flexDirection:'row',gap:6},themeSwatch:{flex:1,height:12,borderWidth:1,borderRadius:4},choiceRow:{flexDirection:'row',gap:8},flex:{flex:1},note:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center'},
 selected:{borderColor:E.selectedLine,backgroundColor:E.selected},playStyleCard:{alignItems:'center',gap:4,paddingVertical:4},playStyleText:{fontSize:16,lineHeight:23,fontWeight:'900',textAlign:'center'},loadout:{borderTopWidth:1,borderColor:C.line,paddingVertical:12,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:12},gearName:{fontSize:17,lineHeight:23,color:C.accentSoft,fontWeight:'800'},weaponTag:{fontSize:12,fontWeight:'900',color:C.info},
 reviewCard:{backgroundColor:C.panel,borderRadius:20,padding:16,flexDirection:'row',alignItems:'center',gap:12},reviewCardStacked:{flexDirection:'column',alignItems:'stretch'},reviewCopy:{flexShrink:1,gap:5},reviewName:{fontSize:20,lineHeight:26,color:C.accentSoft,fontWeight:'900'},reviewRole:{fontSize:14,lineHeight:20,fontWeight:'700'},reviewLine:{fontSize:13,lineHeight:19,color:C.muted},firstStep:{borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel2,padding:14,gap:4},firstStepLabel:{fontSize:10,lineHeight:15,color:C.accent,fontWeight:'900',letterSpacing:1.1},firstStepText:{fontSize:13,lineHeight:19,color:C.text},
 footer:{backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,paddingHorizontal:16,paddingTop:10,paddingBottom:12,gap:8},navigation:{width:'100%',maxWidth:488,alignSelf:'center',flexDirection:'row',gap:8},secondaryAction:{flex:1},primaryAction:{flex:2},saveErrorCard:{width:'100%',maxWidth:488,alignSelf:'center',gap:4,padding:10,borderWidth:1,borderColor:C.bad,borderRadius:12,backgroundColor:C.badSurface},saveErrorLabel:{fontSize:10,lineHeight:14,color:C.bad,fontWeight:'900',letterSpacing:1},
});}

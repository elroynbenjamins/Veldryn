import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,Keyboard,KeyboardAvoidingView,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {ConfirmModal} from '../components/ConfirmModal';
import {FixedCharacterPortrait} from '../components/CharacterVisual';
import {CLASSES} from '../content/classes';
import {itemDef} from '../content/items';
import {BodyPresentation,ClassId,GameState} from '../core/types';
import {carouselIndex,characterNameError,normalizeCharacterName} from '../core/character-creation';
import {equipmentTheme,type ThemeColors} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {startupWordmark} from '../theme/startup-art';
import {ClassHeroCarousel} from '../components/creation/ClassHeroCarousel';
import {CreationAction} from '../components/creation/CreationChrome';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';

type Step='class'|'identity'|'review';
const STEPS:readonly Step[]=['class','identity','review'];
const nameIdeas=['Aelric','Branna','Caelan','Eira','Fenric','Isolde','Orin','Sable'];
// Explain the selected class, not just its shared party role. These are descriptions, not bonuses.
const playStyle:Record<ClassId,string>={
 IRONWARDEN:'Runic defense · Guarding · Counters',
 BASTION:'Barriers · Heavy protection · Holding ground',
 DREADGUARD:'Aggressive control · Threat · Self-sustain',
 WAYFINDER:'Ranged attacks · Precision · Steady damage',
 RAVAGER:'Heavy melee · Pressure · Breaking defenses',
 HEXWEAVER:'Spellcasting · Hexes · Arcane damage',
 KNIFE_DANCER:'Fast melee · Critical hits · Finishers',
 DAWNKEEPER:'Healing · Cleansing · Protection',
 STONECALLER:'Geomancy · Totems · Support',
};

export function ClassSelectScreen({language='en',onLanguage,onSelect,onCancel,cancelLabel,onSignInExisting}:{language?:GameState['settings']['language'];onLanguage?:(language:GameState['settings']['language'])=>void;onSelect:(id:ClassId,name:string,body:BodyPresentation)=>Promise<void>|void;onCancel?:()=>void;cancelLabel?:string;onSignInExisting?:()=>void}){
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {height,width,fontScale}=useWindowDimensions();
 const compact=height<720||fontScale>1.2;
 const submitting=useRef(false),scroll=useRef<ScrollView>(null);
 const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState('');
 const [showLanguages,setShowLanguages]=useState(false),[showNameIdeas,setShowNameIdeas]=useState(false);
 const [step,setStep]=useState<Step>('class');
 const [index,setIndex]=useState(0),[name,setName]=useState('Adventurer'),[confirming,setConfirming]=useState(false);
 const [body,setBody]=useState<BodyPresentation>('male');
 const [nameFocused,setNameFocused]=useState(false);
 const selected=CLASSES[index]??CLASSES[0];
 const safeName=normalizeCharacterName(name),nameError=characterNameError(name);
 const starter=itemDef(selected.starterEquipment.weapon);
 const roleColor={Tank:C.info,Support:C.good,Damage:C.warning};
 useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});setShowNameIdeas(false)},[step]);
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
  <ScrollView ref={scroll} style={s.scroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
   <View pointerEvents={saving?'none':'auto'}>
    <View style={s.brandRow}><Image accessibilityLabel="Veldryn" source={startupWordmark} resizeMode="contain" style={s.wordmark}/>
     {!!onLanguage&&<Pressable accessibilityRole="button" accessibilityLabel="Language" accessibilityState={{expanded:showLanguages,disabled:saving}} disabled={saving} onPress={()=>setShowLanguages(value=>!value)} style={s.languageToggle}><Text style={s.languageCurrent}>{LANGUAGE_NAMES[language]}</Text><Text style={s.languageMark}>{showLanguages?'−':'+'}</Text></Pressable>}
    </View>
    <Text style={s.kicker}>{onCancel?'CREATE A CHARACTER':t(language,'onboarding.createFirst')}</Text>
    {!onCancel&&onSignInExisting?<Pressable accessibilityRole="button" disabled={saving} onPress={onSignInExisting} style={s.existingAccount}><Text style={s.existingAccountText}>Already played VELDRYN? Sign in to your existing account</Text></Pressable>:null}
    {showLanguages&&<View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:language===id,disabled:saving}} disabled={saving} onPress={()=>{onLanguage?.(id);setShowLanguages(false)}} style={[s.languageChip,language===id&&s.selected]}><Text style={s.languageCurrent}>{language===id?'✓ ':''}{LANGUAGE_NAMES[id]}</Text></Pressable>)}</View>}
    <View accessibilityRole="progressbar" accessibilityLabel="Character creation" accessibilityValue={{min:1,max:STEPS.length,now:STEPS.indexOf(step)+1,text:stepLabel(step)}} style={s.stepRow}>{STEPS.map((item,i)=><View key={item} style={s.stepWrap}><View style={[s.stepDot,STEPS.indexOf(step)>=i&&s.stepDotActive]}><Text style={[s.stepNumber,STEPS.indexOf(step)>=i&&s.stepNumberActive]}>{i+1}</Text></View><Text style={[s.stepLabel,item===step&&s.stepLabelActive]}>{stepLabel(item)}</Text></View>)}</View>
    {step==='class'&&<View style={s.section}>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.chooseCalling')}</Text>
     <ClassHeroCarousel selected={selected} classes={CLASSES} index={index} onChange={change} onIndex={value=>{if(!submitting.current)setIndex(value)}} panHandlers={swipe.panHandlers}/>
     <View style={s.playStyleCard}><Text style={s.label}>PLAY STYLE</Text><Text style={[s.playStyleText,{color:roleColor[selected.role]}]}>{playStyle[selected.id]}</Text></View>
     <View style={s.loadout}><View style={s.flex}><Text style={s.label}>STARTING WEAPON</Text><Text style={s.gearName}>{starter.name}</Text></View><Text style={s.weaponTag}>LV. 1</Text></View>
     <Text style={s.note}>Choose your character presentation in the next step. You start with this weapon and a simple, non-stat outfit.</Text>
    </View>}
    {step==='identity'&&<View style={s.section}>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.whoEnters')}</Text>
     <View style={s.identityPreview}><FixedCharacterPortrait classId={selected.id} body={body} style={compact?s.compactPortrait:s.creationPortrait}/><Text style={[s.reviewRole,{color:roleColor[selected.role]}]}>{selected.name} · {selected.role}</Text></View>
     <View style={s.nameBlock}><Text style={s.label}>{t(language,'onboarding.characterName')}</Text><View style={[s.nameField,nameFocused&&s.nameFieldFocused,!!nameError&&s.nameFieldError]}>
      <TextInput accessibilityLabel={t(language,'onboarding.characterName')} value={name} editable={!saving} onChangeText={value=>{setName(value);setSaveError('')}} onFocus={()=>setNameFocused(true)} onBlur={()=>setNameFocused(false)} maxLength={20} autoCapitalize="words" autoCorrect={false} returnKeyType="done" onSubmitEditing={next} underlineColorAndroid="transparent" style={s.input} placeholder="Adventurer" placeholderTextColor={C.muted}/>
     </View><View style={s.inputMeta}><Text accessibilityLiveRegion="polite" style={s.error}>{nameError}</Text><Text style={s.counter}>{name.length}/20</Text></View></View>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:showNameIdeas,disabled:saving}} disabled={saving} onPress={()=>setShowNameIdeas(value=>!value)} style={s.ideasToggle}><Text style={s.ideasText}>{showNameIdeas?'−':'+'} {t(language,'onboarding.nameIdeas')}</Text></Pressable>
     {showNameIdeas&&<ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.chips}>{nameIdeas.map(idea=><Pressable accessibilityRole="button" key={idea} disabled={saving} onPress={()=>{setName(idea);setSaveError('');setShowNameIdeas(false)}} style={s.chip}><Text style={s.chipText}>{idea}</Text></Pressable>)}</ScrollView>}
     <Text style={s.label}>{t(language,'onboarding.bodyPresentation')}</Text><View style={s.choiceRow}>{(['male','female'] as const).map(value=><View key={value} style={s.flex}><CreationAction title={t(language,value==='male'?'onboarding.male':'onboarding.female')} disabled={saving} secondary={body!==value} selected={body===value} onPress={()=>setBody(value)}/></View>)}</View>
    </View>}
    {step==='review'&&<View style={s.section}>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.ready')}</Text>
     <View style={[s.reviewCard,(width<360||fontScale>1.2)&&s.reviewCardStacked]}><FixedCharacterPortrait classId={selected.id} body={body} compact/><View style={s.reviewCopy}><Text style={s.reviewName}>{safeName}</Text><Text style={[s.reviewRole,{color:roleColor[selected.role]}]}>{selected.name} · {selected.role}</Text><Text style={s.reviewLine}>{t(language,body==='male'?'onboarding.male':'onboarding.female')} presentation</Text><Text style={s.reviewLine}>Starting weapon: {starter.name}</Text><Text style={s.reviewLine}>Simple outfit · No armor or off-hand equipped</Text></View></View>
     <Text style={s.note}>Class and presentation are permanent for this character. Check them before entering Asterfall.</Text>
     <View style={s.firstStep}><Text style={s.firstStepLabel}>WHAT HAPPENS NEXT</Text><Text style={s.firstStepText}>A small first hunt. We will explain each new screen when you need it.</Text></View>
    </View>}
   </View>
  </ScrollView>
  <View style={s.footer}>
   {!!saveError&&<View accessibilityRole="alert" style={s.saveErrorCard}><Text style={s.saveErrorLabel}>CHARACTER SAVE FAILED</Text><Text style={s.error}>{saveError}</Text></View>}
   <View style={s.navigation}>
    {step==='class'&&onCancel&&<View style={s.secondaryAction}><CreationAction title={cancelLabel??t(language,'common.back')} disabled={saving} secondary onPress={onCancel}/></View>}
    {step!=='class'&&<View style={s.secondaryAction}><CreationAction title={t(language,'common.back')} disabled={saving} secondary onPress={back}/></View>}
    <View style={s.primaryAction}><CreationAction title={saving?'Saving character…':step==='review'?'Enter Asterfall':t(language,step==='class'?'onboarding.chooseIdentity':'onboarding.reviewCharacter')} disabled={saving||(step==='identity'&&!!nameError)} onPress={step==='review'?()=>{if(!submitting.current)setConfirming(true)}:next}/></View>
   </View>
  </View>
  <ConfirmModal visible={confirming} title={`Create ${safeName}?`} message={`${safeName} will enter Asterfall as a ${body==='male'?'male':'female'} ${selected.name}. Class and presentation cannot be changed for this character.`} confirmLabel="Enter Asterfall" onConfirm={finish} onCancel={()=>setConfirming(false)}/>
 </KeyboardAvoidingView>;
}

function makeStyles(C:ThemeColors){const E=equipmentTheme(C);return StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},scroll:{flex:1},root:{width:'100%',maxWidth:520,alignSelf:'center',padding:16,paddingTop:12,paddingBottom:20},brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},wordmark:{flex:1,maxWidth:184,height:62},kicker:{fontSize:10,lineHeight:14,color:C.muted,fontWeight:'800',letterSpacing:2,textAlign:'center',marginVertical:8},languageToggle:{minHeight:44,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:8},languageCurrent:{fontSize:12,color:C.text,fontWeight:'700',flexShrink:1},languageMark:{fontSize:22,color:C.accent},existingAccount:{minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8},existingAccountText:{fontSize:12,lineHeight:18,color:C.info,fontWeight:'700',textAlign:'center'},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:8},languageChip:{minWidth:96,minHeight:44,justifyContent:'center',padding:10,borderWidth:1,borderColor:C.line,borderRadius:16},
 stepRow:{flexDirection:'row',paddingVertical:12,marginBottom:8,gap:6},stepWrap:{flexDirection:'row',flex:1,alignItems:'center',justifyContent:'center',gap:5,flexWrap:'wrap'},stepDot:{width:24,height:24,borderRadius:12,alignItems:'center',justifyContent:'center'},stepDotActive:{backgroundColor:C.selection},stepNumber:{fontSize:12,color:C.muted,fontWeight:'900'},stepNumberActive:{color:C.text},stepLabel:{fontSize:12,color:C.muted,fontWeight:'800',flexShrink:1},stepLabelActive:{color:C.accentSoft,fontWeight:'900'},section:{gap:12},heading:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:29,lineHeight:37,fontWeight:'600',color:C.accentSoft,textAlign:'center'},
 identityPreview:{alignItems:'center',backgroundColor:C.stage,borderRadius:24,padding:12,gap:6},creationPortrait:{width:148,height:178},compactPortrait:{width:104,height:126},nameBlock:{gap:6},nameField:{borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.inputBg,paddingHorizontal:16,paddingVertical:12},nameFieldFocused:{borderColor:C.selectionLine},nameFieldError:{borderColor:C.bad},label:{fontSize:10,lineHeight:16,color:C.muted,fontWeight:'800',letterSpacing:1},input:{minHeight:28,color:C.text,padding:0,fontSize:17,fontWeight:'600',textAlignVertical:'center',includeFontPadding:false},inputMeta:{flexDirection:'row',justifyContent:'space-between',gap:8},error:{fontSize:12,lineHeight:18,color:C.bad,flexShrink:1},counter:{fontSize:12,lineHeight:18,color:C.muted},ideasToggle:{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:4},ideasText:{fontSize:12,lineHeight:18,color:C.muted,fontWeight:'700'},chips:{gap:8},chip:{minHeight:44,paddingHorizontal:14,borderRadius:18,justifyContent:'center',backgroundColor:C.panel2},chipText:{fontSize:14,fontWeight:'600',color:C.accentSoft},choiceRow:{flexDirection:'row',gap:8},flex:{flex:1},note:{fontSize:12,lineHeight:18,color:C.muted,textAlign:'center'},
 selected:{borderColor:E.selectedLine,backgroundColor:E.selected},playStyleCard:{alignItems:'center',gap:4,paddingVertical:4},playStyleText:{fontSize:16,lineHeight:23,fontWeight:'900',textAlign:'center'},loadout:{borderTopWidth:1,borderColor:C.line,paddingVertical:12,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:12},gearName:{fontSize:17,lineHeight:23,color:C.accentSoft,fontWeight:'800'},weaponTag:{fontSize:12,fontWeight:'900',color:C.info},
 reviewCard:{backgroundColor:C.panel,borderRadius:20,padding:16,flexDirection:'row',alignItems:'center',gap:12},reviewCardStacked:{flexDirection:'column',alignItems:'stretch'},reviewCopy:{flexShrink:1,gap:5},reviewName:{fontSize:20,lineHeight:26,color:C.accentSoft,fontWeight:'900'},reviewRole:{fontSize:14,lineHeight:20,fontWeight:'700'},reviewLine:{fontSize:13,lineHeight:19,color:C.muted},firstStep:{borderWidth:1,borderColor:C.line,borderRadius:14,backgroundColor:C.panel2,padding:14,gap:4},firstStepLabel:{fontSize:10,lineHeight:15,color:C.accent,fontWeight:'900',letterSpacing:1.1},firstStepText:{fontSize:13,lineHeight:19,color:C.text},
 footer:{backgroundColor:C.bg,borderTopWidth:1,borderColor:C.line,paddingHorizontal:16,paddingTop:10,paddingBottom:12,gap:8},navigation:{width:'100%',maxWidth:488,alignSelf:'center',flexDirection:'row',gap:8},secondaryAction:{flex:1},primaryAction:{flex:2},saveErrorCard:{width:'100%',maxWidth:488,alignSelf:'center',gap:4,padding:10,borderWidth:1,borderColor:C.bad,borderRadius:12,backgroundColor:C.badSurface},saveErrorLabel:{fontSize:10,lineHeight:14,color:C.bad,fontWeight:'900',letterSpacing:1},
});}

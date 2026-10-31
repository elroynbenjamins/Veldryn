import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,Keyboard,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {ConfirmModal} from '../components/ConfirmModal';
import {CreationLanguagePicker} from '../components/creation/CreationLanguagePicker';
import {classSkillIcon} from '../theme/class-skill-assets';
import {classEmblemArtwork,classEmblemIconArtwork} from '../theme/class-emblem-assets';
import {CLASSES} from '../content/classes';
import {BodyPresentation,ClassId,GameState} from '../core/types';
import {characterNameError,normalizeCharacterName} from '../core/character-creation';
import {CLASS_COMBAT_TRAITS,CLASS_PLAYSTYLE,classSelectionDetails} from '../core/class-selection';
import {creationT as ct,creationText} from '../i18n/creation';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {t} from '../i18n';
import {UI_THEMES,type ThemeColors,type UiThemeId} from '../theme/theme';
import {useGameTheme} from '../theme/ThemeContext';
import {startupWordmark} from '../theme/startup-art';

type Step='welcome'|'class'|'identity'|'review';
const CREATION_STEPS:readonly Exclude<Step,'welcome'>[]=['class','identity','review'];
const THEME_IDS=['obsidian','ember','ivory'] as const;
// Creation APIs still expect a body value on existing saves and live services.
// Appearance is not a selectable character-creation feature.
const LEGACY_BODY:BodyPresentation='male';

type Props={
 language?:GameState['settings']['language'];
 onLanguage?:(language:GameState['settings']['language'])=>void;
 themeId?:UiThemeId;
 onTheme?:(themeId:UiThemeId)=>Promise<void>|void;
 onSelect:(id:ClassId,name:string,body:BodyPresentation)=>Promise<void>|void;
 onCancel?:()=>void;
 cancelLabel?:string;
 onSignInExisting?:()=>void;
};

export function ClassSelectScreen({language:languageProp,onLanguage,themeId,onTheme,onSelect,onCancel,cancelLabel,onSignInExisting}:Props){
 const gameLanguage=useGameLanguage(),language=languageProp??gameLanguage;
 const C=useGameTheme(),s=useMemo(()=>makeStyles(C),[C]);
 const {width,fontScale}=useWindowDimensions();
 const compact=width<360||fontScale>1.25;
 const classWidth=Math.floor((Math.min(width-32,488)-16)/3);
 const scroll=useRef<ScrollView>(null),submitting=useRef(false);
 const [step,setStep]=useState<Step>(onCancel?'class':'welcome');
 const [index,setIndex]=useState(0);
 const [name,setName]=useState('');
 const [nameTouched,setNameTouched]=useState(false);
 const [nameFocused,setNameFocused]=useState(false);
 const [detailsOpen,setDetailsOpen]=useState(false);
 const [confirming,setConfirming]=useState(false);
 const [saving,setSaving]=useState(false);
 const [saveError,setSaveError]=useState('');
 const selected=CLASSES[index]??CLASSES[0];
 const details=useMemo(()=>classSelectionDetails(selected.id),[selected.id]);
 const activeThemeId=themeId??C.id;
 const activeTheme=UI_THEMES[activeThemeId];
 const safeName=normalizeCharacterName(name),nameError=characterNameError(name);
 const stepIndex=CREATION_STEPS.indexOf(step as Exclude<Step,'welcome'>);
 const roleColors={Tank:C.info,Damage:C.warning,Support:C.special};
 const roleColor=roleColors[selected.role];
 useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false})},[step]);
 const goNext=()=>{
  if(submitting.current)return;
  if(step==='identity'&&nameError){setNameTouched(true);return;}
  Keyboard.dismiss();setNameFocused(false);setSaveError('');
  if(step==='welcome')setStep('class');
  else if(step==='class')setStep('identity');
  else if(step==='identity')setStep('review');
  else setConfirming(true);
 };
 const goBack=()=>{
  if(submitting.current)return;
  Keyboard.dismiss();setSaveError('');setNameFocused(false);
  if(step==='review')setStep('identity');
  else if(step==='identity')setStep('class');
  else if(step==='class'&&!onCancel)setStep('welcome');
  else onCancel?.();
 };
 async function finish(){
  if(submitting.current)return;
  const error=characterNameError(name);
  if(error){setConfirming(false);setNameTouched(true);setSaveError(error);setStep('identity');return;}
  submitting.current=true;setSaving(true);setSaveError('');setConfirming(false);Keyboard.dismiss();
  try{await onSelect(selected.id,normalizeCharacterName(name),LEGACY_BODY);}
  catch{setSaveError(ct(language,'Your character could not be saved. Your choices are still here; please try again.'));}
  finally{submitting.current=false;setSaving(false);}
 }
 const selectClass=(nextIndex:number)=>{
  if(submitting.current)return;
  setIndex(nextIndex);setDetailsOpen(false);
 };
 const stepName=step==='class'?t(language,'onboarding.stepClass'):step==='identity'?t(language,'onboarding.stepIdentity'):t(language,'onboarding.stepReview');
 return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS==='ios'?'padding':'height'}>
  <View style={s.header}>
   <View style={s.brandRow}>
    <Image accessible accessibilityLabel="Veldryn" source={startupWordmark} resizeMode="contain" style={s.wordmark}/>
    {!!onLanguage&&<CreationLanguagePicker language={language} onChange={onLanguage} disabled={saving}/>}
   </View>
   {step!=='welcome'&&<View accessible accessibilityRole="progressbar" accessibilityLabel={ct(language,'Character creation')} accessibilityValue={{min:1,max:3,now:stepIndex+1,text:stepName}} style={s.progress}>
    <View style={s.progressSegments}>{CREATION_STEPS.map((item,i)=><View key={item} style={[s.progressSegment,i<=stepIndex&&s.progressSegmentActive]}/>)}</View>
    <View style={s.progressCaption}><Text style={s.progressText}>{stepName}</Text><Text style={s.progressText}>{stepIndex+1} / 3</Text></View>
   </View>}
  </View>
  <ScrollView ref={scroll} style={s.scroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
   <View pointerEvents={saving?'none':'auto'} style={s.section}>
    {step==='welcome'&&<>
     <Text style={s.eyebrow}>{ct(language,'CREATE A CHARACTER')}</Text>
     <Text accessibilityRole="header" style={s.heading}>{ct(language,'Your adventure begins here.')}</Text>
     <Text style={s.description}>{ct(language,'Choose your class, name your character, and begin your journey through Asterfall.')}</Text>
     <View style={s.welcomeStage}>
      <View pointerEvents="none" style={s.haloLarge}/>
      <View pointerEvents="none" style={s.haloSmall}/>
      <View style={s.welcomeEmblems}>
       <Image accessible={false} source={classEmblemArtwork.DAWNKEEPER} resizeMode="contain" style={[s.welcomeSideArt,compact&&s.welcomeSideCompact]}/>
       <Image accessible={false} source={classEmblemArtwork.IRONWARDEN} resizeMode="contain" style={s.welcomeCenterArt}/>
       <Image accessible={false} source={classEmblemArtwork.WAYFINDER} resizeMode="contain" style={[s.welcomeSideArt,compact&&s.welcomeSideCompact]}/>
      </View>
      <Text style={s.stageTitle}>{ct(language,'Enter Asterfall')}</Text>
     </View>
     <View style={s.welcomeCard}><View style={s.welcomeSymbol}><Text style={s.welcomeSymbolText}>✦</Text></View><View style={s.flex}>
      <Text style={s.welcomeCardTitle}>{t(language,'onboarding.chooseCalling')}</Text>
      <Text style={s.welcomeCardCopy}>{ct(language,'Nine unique classes with different combat styles.')}</Text>
     </View></View>
     <View style={s.welcomeCard}><View style={s.welcomeSymbol}><Text style={s.welcomeSymbolText}>✧</Text></View><View style={s.flex}>
      <Text style={s.welcomeCardTitle}>{t(language,'onboarding.characterName')}</Text>
      <Text style={s.welcomeCardCopy}>{ct(language,'Create a name and choose your interface theme.')}</Text>
     </View></View>
     {!!onSignInExisting&&<Pressable accessibilityRole="button" disabled={saving} onPress={onSignInExisting} style={({pressed})=>[s.signIn,pressed&&s.pressed]}>
      <Text style={s.signInText}>{ct(language,'Already played VELDRYN? Sign in to your existing account')}</Text>
     </Pressable>}
    </>}
    {step==='class'&&<>
     <Text style={s.eyebrow}>{ct(language,'CREATE A CHARACTER')} · 1 / 3</Text>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.chooseCalling')}</Text>
     <Text style={s.description}>{ct(language,'Select one of nine classes to see its strengths.')}</Text>
     <View style={s.hero}>
      <View style={s.heroRow}>
       <View style={s.heroArtFrame}><Image accessible={false} source={classEmblemArtwork[selected.id]} resizeMode="contain" style={s.heroArt}/></View>
       <View style={s.flex}>
        <Text style={[s.roleTag,{color:roleColor}]}>{ct(language,selected.role).toUpperCase()}</Text>
        <Text style={s.heroTitle} numberOfLines={2}>{selected.name}</Text>
        <Text style={s.heroDescription}>{creationText(language,selected.description)}</Text>
       </View>
      </View>
      <View style={s.ratingRow}>{(['Tank','Damage','Support'] as const).map(role=>{
       const rating=selected.roleRatings[role.toLowerCase() as 'tank'|'damage'|'support'];
       return <View key={role} style={s.ratingItem}>
        <Text style={s.ratingLabel}>{ct(language,role)}</Text>
        <View accessibilityLabel={ct(language,'{role} {value} out of 5',{role:ct(language,role),value:rating})} style={s.ratingBars}>{[1,2,3,4,5].map(n=><View key={n} style={[s.ratingBar,n<=rating&&s.ratingBarFilled]}/>)}</View>
       </View>;
      })}</View>
     </View>
     <Text style={s.label}>{ct(language,'AVAILABLE CLASSES')} · {CLASSES.length}</Text>
     <View style={s.classGrid}>{CLASSES.map((item,i)=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={ct(language,'Select {name}',{name:item.name})} accessibilityState={{selected:item.id===selected.id,disabled:saving}} disabled={saving} onPress={()=>selectClass(i)} style={({pressed})=>[s.classCard,{width:classWidth},item.id===selected.id&&s.classCardSelected,pressed&&s.pressed]}>
      {item.id===selected.id&&<Text style={s.classSelectedMark}>✓</Text>}
      <Image accessible={false} source={classEmblemIconArtwork[item.id]} style={s.classIcon} resizeMode="contain"/>
      <Text style={s.className} adjustsFontSizeToFit minimumFontScale={0.8} numberOfLines={2}>{item.name}</Text>
      <Text style={s.classRole}>{ct(language,item.role)}</Text>
     </Pressable>)}</View>
     <Pressable accessibilityRole="button" accessibilityLabel={ct(language,'Ability details')} accessibilityState={{expanded:detailsOpen}} onPress={()=>setDetailsOpen(open=>!open)} style={({pressed})=>[s.disclosure,pressed&&s.pressed]}>
      <Text style={s.disclosureTitle}>{ct(language,'Encounter abilities')} &amp; {ct(language,'Idle hunting')}</Text>
      <Text style={s.disclosureChevron}>{detailsOpen?'−':'+'}</Text>
     </Pressable>
     {detailsOpen&&<View style={s.detailsPanel}>
      <Text style={s.traits}>{creationText(language,CLASS_COMBAT_TRAITS[selected.id])}</Text>
      {details.abilities.map(ability=><View key={ability.id} style={s.abilityRow}>
       <Image accessible={false} source={classSkillIcon(ability.icon)} resizeMode="contain" style={s.abilityIcon}/>
       <View style={s.flex}><Text style={s.abilityName}>{ability.name}</Text><Text style={s.abilityDescription}>{creationText(language,ability.summary)}</Text></View>
      </View>)}
      <View style={s.idlePanel}>
       <Text style={s.abilityName}>{ct(language,'Idle hunting')}</Text>
       <Text style={s.abilityDescription}>{creationText(language,CLASS_PLAYSTYLE[selected.id])}</Text>
       <Text style={s.detailHint}>{ct(language,'Encounter abilities do not activate during idle hunting.')}</Text>
      </View>
     </View>}
     <Text style={s.note}>{ct(language,'Your class cannot be changed after creating this character.')}</Text>
    </>}
    {step==='identity'&&<>
     <Text style={s.eyebrow}>{ct(language,'CREATE A CHARACTER')} · 2 / 3</Text>
     <Text accessibilityRole="header" style={s.heading}>{ct(language,'Name your adventurer')}</Text>
     <Text style={s.description}>{onTheme?ct(language,'Choose your character name and interface theme.'):ct(language,'Choose your character name.')}</Text>
     <View style={s.identityStage}>
      <View style={s.identityHalo}/>
      <Image accessible={false} source={classEmblemArtwork[selected.id]} resizeMode="contain" style={s.identityArt}/>
      <Text style={s.identityClass}>{selected.name}</Text>
      <Text style={[s.identityRole,{color:roleColor}]}>{ct(language,selected.role)}</Text>
     </View>
     <View style={s.nameBlock}>
      <Text style={s.label}>{t(language,'onboarding.characterName')}</Text>
      <View style={[s.nameField,nameFocused&&s.nameFieldFocused,nameTouched&&!!nameError&&s.nameFieldError]}>
       <TextInput accessibilityLabel={t(language,'onboarding.characterName')} value={name} editable={!saving} maxLength={20} autoCapitalize="words" autoCorrect={false} returnKeyType="done" onChangeText={value=>{setName(value);setNameTouched(true);setSaveError('')}} onFocus={()=>setNameFocused(true)} onBlur={()=>setNameFocused(false)} onSubmitEditing={goNext} style={s.nameInput} underlineColorAndroid="transparent" placeholder={creationText(language,'Enter character name')} placeholderTextColor={C.muted}/>
      </View>
      <View style={s.inputMeta}><Text accessibilityLiveRegion="polite" style={[s.nameHint,nameTouched&&!!nameError&&s.invalidName]}>{nameTouched?(nameError?creationText(language,nameError):ct(language,'Valid name')):ct(language,'2–20 characters · Name required')}</Text><Text style={s.counter}>{name.length}/20</Text></View>
     </View>
     {!!onTheme&&<View style={s.themeBlock}>
      <Text style={s.label}>{ct(language,'INTERFACE THEME')}</Text>
      <View style={s.themeGrid}>{THEME_IDS.map(id=>{
       const theme=UI_THEMES[id],isSelected=id===activeThemeId;
       return <Pressable key={id} accessibilityRole="button" accessibilityLabel={creationText(language,'{name} interface theme',{name:theme.name})} accessibilityState={{selected:isSelected,disabled:saving}} disabled={saving} onPress={()=>void onTheme?.(id)} style={({pressed})=>[s.themeCard,isSelected&&s.themeSelected,pressed&&s.pressed]}>
        <View style={[s.themePreview,{backgroundColor:theme.bg,borderColor:theme.line}]}>
         <View style={[s.themePreviewPanel,{backgroundColor:theme.panelRaised}]}/>
         <View style={[s.themePreviewAccent,{backgroundColor:theme.accent}]}/>
        </View>
        <Text style={s.themeName} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1}>{theme.name}{isSelected?' ✓':''}</Text>
       </Pressable>;
      })}</View>
      <Text style={s.note}>{ct(language,'You can change this anytime in Settings.')}</Text>
     </View>}
    </>}
    {step==='review'&&<>
     <Text style={s.eyebrow}>{ct(language,'CREATE A CHARACTER')} · 3 / 3</Text>
     <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.ready')}</Text>
     <Text style={s.description}>{ct(language,'Review your choices before entering Asterfall.')}</Text>
     <View style={s.reviewHero}>
      <View style={s.reviewHalo}/>
      <Image accessible={false} source={classEmblemArtwork[selected.id]} resizeMode="contain" style={s.reviewArt}/>
      <Text style={s.reviewName}>{safeName}</Text>
      <Text style={s.reviewClass}>{selected.name} · {ct(language,selected.role)}</Text>
      <Text style={s.reviewLevel}>{ct(language,'Lv. {level}',{level:1})}</Text>
     </View>
     <View style={s.summary}>
      <View style={s.summaryRow}><Text style={s.summaryLabel}>{t(language,'onboarding.characterName')}</Text><Text style={s.summaryValue}>{safeName}</Text></View>
      <View style={s.summaryRow}><Text style={s.summaryLabel}>{t(language,'onboarding.stepClass')}</Text><Text style={s.summaryValue}>{selected.name}</Text></View>
      <View style={s.summaryRow}><Text style={s.summaryLabel}>{ct(language,'ROLE')}</Text><Text style={[s.summaryValue,{color:roleColor}]}>{ct(language,selected.role)}</Text></View>
      {!!onTheme&&<View style={s.summaryRow}><Text style={s.summaryLabel}>{ct(language,'INTERFACE THEME')}</Text><Text style={s.summaryValue}>{activeTheme.name}</Text></View>}
     </View>
     <View style={s.reviewNote}><Text style={s.reviewNoteText}>{ct(language,'Your class cannot be changed after creating this character.')}</Text></View>
     <View style={s.firstStep}><Text style={s.firstStepTitle}>{ct(language,'WHAT HAPPENS NEXT')}</Text><Text style={s.firstStepDescription}>{ct(language,'A small first hunt. We will explain each new screen when you need it.')}</Text></View>
    </>}
   </View>
  </ScrollView>
  <View style={s.footer}>
   {!!saveError&&<View accessibilityRole="alert" style={s.saveErrorCard}><Text style={s.errorLabel}>{ct(language,'CHARACTER SAVE FAILED')}</Text><Text style={s.errorText}>{saveError}</Text></View>}
   <View style={s.actions}>
    {(step!=='welcome'||!!onCancel)&&<Pressable accessibilityRole="button" disabled={saving} onPress={goBack} style={({pressed})=>[s.secondaryAction,pressed&&s.pressed]}>
     <Text style={s.secondaryText}>{step==='class'&&onCancel?cancelLabel??t(language,'common.back'):t(language,'common.back')}</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" disabled={saving||(step==='identity'&&!!nameError)} onPress={goNext} style={({pressed})=>[s.primaryAction,(saving||(step==='identity'&&!!nameError))&&s.disabled,pressed&&s.pressed]}>
     <Text style={s.primaryText}>{saving?ct(language,'Saving character…'):step==='welcome'?ct(language,'CREATE A CHARACTER'):step==='class'?t(language,'onboarding.chooseIdentity'):step==='identity'?t(language,'onboarding.reviewCharacter'):ct(language,'Enter Asterfall')}</Text>
    </Pressable>
   </View>
  </View>
  <ConfirmModal visible={confirming} title={ct(language,'Create {name}?',{name:safeName})} message={ct(language,'{name} will enter Asterfall as a {className}. Choosing a different class later requires deleting or resetting this character.',{name:safeName,className:selected.name})} confirmLabel={ct(language,'Enter Asterfall')} onConfirm={finish} onCancel={()=>setConfirming(false)}/>
 </KeyboardAvoidingView>;
}

function makeStyles(C:ThemeColors){
 return StyleSheet.create({
 screen:{flex:1,backgroundColor:C.bg},
 header:{backgroundColor:C.panel,borderBottomWidth:1,borderBottomColor:C.line,paddingHorizontal:16,paddingTop:4,paddingBottom:10},
 brandRow:{width:'100%',maxWidth:488,alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
 wordmark:{width:152,height:54,flexShrink:1},
 progress:{width:'100%',maxWidth:488,alignSelf:'center',gap:7},
 progressSegments:{flexDirection:'row',gap:5},
 progressSegment:{flex:1,height:3,borderRadius:2,backgroundColor:C.lineStrong},
 progressSegmentActive:{backgroundColor:C.selectionLine},
 progressCaption:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 progressText:{fontSize:10,lineHeight:15,letterSpacing:1,color:C.muted,fontWeight:'800',textTransform:'uppercase'},
 scroll:{flex:1},root:{width:'100%',maxWidth:520,alignSelf:'center',paddingHorizontal:16,paddingTop:16,paddingBottom:24},
 section:{gap:11},
 eyebrow:{fontSize:10,lineHeight:15,fontWeight:'900',letterSpacing:1.2,color:C.accent,textTransform:'uppercase'},
 heading:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:27,lineHeight:34,color:C.accentSoft,fontWeight:'600'},
 description:{fontSize:13,lineHeight:19,color:C.muted,marginBottom:3},
 flex:{flex:1,minWidth:0},
 welcomeStage:{backgroundColor:C.stage,borderWidth:1,borderColor:C.lineStrong,borderRadius:14,minHeight:208,alignItems:'center',justifyContent:'center',overflow:'hidden',padding:10,gap:7},
 haloLarge:{position:'absolute',width:190,height:190,borderRadius:95,borderWidth:1,borderColor:C.lineStrong,opacity:0.55,top:-17},
 haloSmall:{position:'absolute',width:145,height:145,borderRadius:73,borderWidth:1,borderColor:C.selectionLine,opacity:0.4,top:5},
 welcomeEmblems:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:0,minHeight:129},
 welcomeSideArt:{width:76,height:91,opacity:0.85,marginHorizontal:-4},
 welcomeSideCompact:{width:58,marginHorizontal:-2},
 welcomeCenterArt:{width:130,height:130,zIndex:1},
 stageTitle:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:21,color:C.accentSoft,fontWeight:'700'},
 welcomeCard:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:12,padding:12,minHeight:67},
 welcomeSymbol:{width:38,height:38,borderRadius:8,backgroundColor:C.panelRaised,alignItems:'center',justifyContent:'center'},
 welcomeSymbolText:{fontSize:24,color:C.accentSoft},
 welcomeCardTitle:{fontSize:14,lineHeight:19,color:C.text,fontWeight:'800'},
 welcomeCardCopy:{fontSize:12,lineHeight:18,color:C.muted},
 signIn:{minHeight:44,borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.panel2,paddingHorizontal:12,paddingVertical:11,alignItems:'center',justifyContent:'center',marginTop:6},
 signInText:{fontSize:12,lineHeight:18,fontWeight:'700',color:C.accentSoft,textAlign:'center'},
 hero:{backgroundColor:C.panel,borderColor:C.lineStrong,borderWidth:1,borderRadius:13,padding:13,gap:12},
 heroRow:{flexDirection:'row',alignItems:'center',gap:12},
 heroArtFrame:{width:100,height:107,backgroundColor:C.stage,borderColor:C.line,borderWidth:1,borderRadius:11,alignItems:'center',justifyContent:'center'},
 heroArt:{width:94,height:99},
 roleTag:{fontSize:11,lineHeight:16,fontWeight:'900',letterSpacing:1},
 heroTitle:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:22,lineHeight:27,color:C.accentSoft,fontWeight:'600',marginTop:3,marginBottom:3},
 heroDescription:{fontSize:12,lineHeight:17,color:C.text},
 ratingRow:{flexDirection:'row',borderTopWidth:1,borderTopColor:C.line,paddingTop:11,gap:11},
 ratingItem:{flex:1,gap:6},
 ratingLabel:{fontSize:10,lineHeight:15,color:C.muted,fontWeight:'800'},
 ratingBars:{flexDirection:'row',gap:3},
 ratingBar:{height:5,flex:1,borderRadius:3,backgroundColor:C.lineStrong},
 ratingBarFilled:{backgroundColor:C.selectionLine},
 label:{fontSize:10,lineHeight:16,color:C.muted,fontWeight:'900',letterSpacing:1},
 classGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,justifyContent:'flex-start'},
 classCard:{minHeight:92,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:C.panel,alignItems:'center',justifyContent:'center',paddingHorizontal:4,paddingVertical:7,gap:3,position:'relative'},
 classCardSelected:{borderColor:C.selectionLine,backgroundColor:C.selection,borderWidth:2},
 classSelectedMark:{position:'absolute',right:6,top:3,fontSize:11,fontWeight:'900',color:C.accentSoft},
 classIcon:{width:44,height:44},
 className:{fontSize:11,lineHeight:14,fontWeight:'800',color:C.text,textAlign:'center'},
 classRole:{fontSize:10,lineHeight:13,color:C.muted,textAlign:'center'},
 disclosure:{backgroundColor:C.panel,borderColor:C.lineStrong,borderWidth:1,borderRadius:10,minHeight:46,paddingHorizontal:13,paddingVertical:11,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:3},
 disclosureTitle:{flex:1,fontSize:12,lineHeight:18,color:C.text,fontWeight:'800'},
 disclosureChevron:{fontSize:21,lineHeight:22,color:C.accent,fontWeight:'800'},
 detailsPanel:{borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,padding:12,gap:10},
 traits:{fontSize:12,lineHeight:18,color:C.accentSoft,fontWeight:'800'},
 abilityRow:{flexDirection:'row',alignItems:'center',gap:9},
 abilityIcon:{width:32,height:32},
 abilityName:{fontSize:12,lineHeight:18,color:C.text,fontWeight:'800'},
 abilityDescription:{fontSize:11,lineHeight:17,color:C.muted},
 idlePanel:{borderTopWidth:1,borderTopColor:C.line,paddingTop:10,gap:5},
 detailHint:{fontSize:11,lineHeight:16,color:C.muted,fontStyle:'italic'},
 note:{fontSize:11,lineHeight:17,color:C.muted,textAlign:'center'},
 identityStage:{minHeight:162,alignItems:'center',justifyContent:'center',padding:10,backgroundColor:C.stage,borderWidth:1,borderColor:C.lineStrong,borderRadius:13,overflow:'hidden'},
 identityHalo:{position:'absolute',top:12,width:116,height:116,borderRadius:58,borderWidth:1,borderColor:C.lineStrong},
 identityArt:{width:104,height:104},
 identityClass:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:20,lineHeight:25,color:C.accentSoft,fontWeight:'700'},
 identityRole:{fontSize:12,lineHeight:18,fontWeight:'800'},
 nameBlock:{gap:6,marginTop:5},
 nameField:{borderWidth:1,borderColor:C.lineStrong,borderRadius:10,backgroundColor:C.inputBg,paddingHorizontal:14,paddingVertical:10},
 nameFieldFocused:{borderColor:C.selectionLine},
 nameFieldError:{borderColor:C.bad},
 nameInput:{minHeight:28,fontSize:16,color:C.text,padding:0,fontWeight:'600',includeFontPadding:false},
 inputMeta:{flexDirection:'row',justifyContent:'space-between',gap:6},
 nameHint:{fontSize:11,lineHeight:17,color:C.muted,flexShrink:1},
 invalidName:{color:C.bad},
 counter:{fontSize:11,lineHeight:17,color:C.muted},
 themeBlock:{gap:9,marginTop:9},
 themeGrid:{flexDirection:'row',gap:8},
 themeCard:{flex:1,minWidth:0,padding:7,gap:6,borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel},
 themeSelected:{borderColor:C.selectionLine,borderWidth:2,backgroundColor:C.selection},
 themePreview:{height:37,borderRadius:5,borderWidth:1,padding:6,justifyContent:'flex-end',flexDirection:'row',alignItems:'flex-end',gap:4},
 themePreviewPanel:{height:12,flex:1,borderRadius:2},
 themePreviewAccent:{height:6,flex:1,borderRadius:2},
 themeName:{fontSize:11,lineHeight:16,color:C.text,fontWeight:'800'},
 reviewHero:{backgroundColor:C.stage,borderWidth:1,borderColor:C.lineStrong,borderRadius:13,minHeight:216,padding:14,alignItems:'center',justifyContent:'center',overflow:'hidden',gap:4},
 reviewHalo:{position:'absolute',top:7,width:149,height:149,borderRadius:75,borderColor:C.lineStrong,borderWidth:1},
 reviewArt:{width:121,height:121},
 reviewName:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:25,lineHeight:31,color:C.accentSoft,fontWeight:'700',textAlign:'center'},
 reviewClass:{fontSize:13,lineHeight:19,color:C.text,textAlign:'center'},
 reviewLevel:{fontSize:10,lineHeight:15,color:C.accent,fontWeight:'900',letterSpacing:1},
 summary:{backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:11,paddingHorizontal:12},
 summaryRow:{flexDirection:'row',gap:10,alignItems:'center',justifyContent:'space-between',paddingVertical:11,borderBottomWidth:1,borderBottomColor:C.line},
 summaryLabel:{fontSize:12,lineHeight:18,color:C.muted,flexShrink:1},
 summaryValue:{fontSize:12,lineHeight:18,color:C.text,fontWeight:'800',textAlign:'right',flexShrink:1},
 reviewNote:{borderWidth:1,borderColor:C.warning,borderRadius:10,backgroundColor:C.warningSurface,padding:11},
 reviewNoteText:{fontSize:11,lineHeight:17,color:C.warning},
 firstStep:{borderWidth:1,borderColor:C.line,borderRadius:10,backgroundColor:C.panel2,padding:12,gap:4},
 firstStepTitle:{fontSize:10,lineHeight:16,fontWeight:'900',letterSpacing:1,color:C.accent},
 firstStepDescription:{fontSize:12,lineHeight:18,color:C.text},
 footer:{backgroundColor:C.panel,borderTopColor:C.line,borderTopWidth:1,paddingHorizontal:16,paddingTop:10,paddingBottom:12,gap:8},
 actions:{width:'100%',maxWidth:488,alignSelf:'center',flexDirection:'row',gap:9},
 secondaryAction:{flex:1,minHeight:48,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.secondaryButtonBorder,borderRadius:10,backgroundColor:C.secondaryButton,paddingHorizontal:10},
 secondaryText:{fontSize:13,lineHeight:18,fontWeight:'800',color:C.secondaryButtonText,textAlign:'center'},
 primaryAction:{flex:2,minHeight:48,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.primaryButtonBorder,borderRadius:10,backgroundColor:C.primaryButton,paddingHorizontal:10},
 primaryText:{fontSize:13,lineHeight:19,fontWeight:'900',color:C.primaryButtonText,textAlign:'center'},
 disabled:{opacity:0.4},
 pressed:{opacity:0.75},
 saveErrorCard:{width:'100%',maxWidth:488,alignSelf:'center',borderWidth:1,borderColor:C.bad,borderRadius:10,backgroundColor:C.badSurface,padding:10,gap:4},
 errorLabel:{fontSize:10,lineHeight:15,color:C.bad,fontWeight:'900'},
 errorText:{fontSize:12,lineHeight:18,color:C.bad},
 });
}

import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,KeyboardAvoidingView,PanResponder,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {ConfirmModal} from '../components/ConfirmModal';
import {FixedCharacterPortrait} from '../components/CharacterVisual';
import {GameButton} from '../components/GameButton';
import {CLASSES,ClassDef} from '../content/classes';
import {itemDef} from '../content/items';
import {BodyPresentation,ClassId,GameState} from '../core/types';
import {carouselIndex,characterNameError} from '../core/character-creation';
import {noviceSetFor} from '../content/novice-sets';
import {C,equipmentColors,spacing,typography} from '../theme/theme';
import {startupWordmark} from '../theme/startup-art';
import {creationFrames} from '../theme/creation-ui-assets';
import {ClassHeroCarousel} from '../components/creation/ClassHeroCarousel';
import {CreationAction} from '../components/creation/CreationChrome';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';

type Step='identity'|'class'|'review';
type RoleFilter='All'|ClassDef['role'];
const STEPS:Step[]=['class','identity','review'];
const nameIdeas=['Aelric','Branna','Caelan','Eira','Fenric','Isolde','Orin','Sable'];
const roleColor={Tank:C.info,Support:C.good,Damage:C.warning};
const languageS=StyleSheet.create({toggle:{alignSelf:'center',minWidth:94,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.md,backgroundColor:'transparent',paddingHorizontal:spacing.sm},current:{fontSize:12,fontWeight:'700',maxWidth:74,color:C.text},mark:{fontSize:22,color:C.accent},chip:{minWidth:104,minHeight:40,paddingHorizontal:12,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.bg},chipSelected:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},chipText:{fontSize:12,color:C.muted,fontWeight:'700'},chipTextSelected:{color:'#d9f3ff'},pressed:{opacity:.76}});
function LanguageChip({label,selected,onPress}:{label:string;selected:boolean;onPress:()=>void}){return <Pressable accessibilityRole="button" accessibilityState={{selected}} onPress={onPress} style={({pressed})=>[languageS.chip,selected&&languageS.chipSelected,pressed&&languageS.pressed]}><Text style={[languageS.chipText,selected&&languageS.chipTextSelected]}>{selected?'✓ ':''}{label}</Text></Pressable>}

export function ClassSelectScreen({language='en',onLanguage,onSelect,onCancel,cancelLabel}:{language?:GameState['settings']['language'];onLanguage?:(language:GameState['settings']['language'])=>void;onSelect:(id:ClassId,name:string,body:BodyPresentation)=>Promise<void>|void;onCancel?:()=>void;cancelLabel?:string}){
  const submitting=useRef(false);
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState(''),[showLanguages,setShowLanguages]=useState(false);
  const [step,setStep]=useState<Step>('class');
  const scroll=useRef<ScrollView>(null);
  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false})},[step]);
  const [index,setIndex]=useState(0),[name,setName]=useState('Adventurer'),[confirming,setConfirming]=useState(false);
  const [body,setBody]=useState<BodyPresentation>('male');
  const [nameFocused,setNameFocused]=useState(false);
  const [role,setRole]=useState<RoleFilter>('All');
  const filtered=useMemo(()=>role==='All'?CLASSES:CLASSES.filter(item=>item.role===role),[role]);
  const selected=filtered[index]??filtered[0];
  const safeName=name.trim(),nameError=characterNameError(name);
  const starter=itemDef(selected.starterEquipment.weapon);
  const change=(direction:number)=>setIndex(current=>carouselIndex(current,direction,filtered.length));
  const swipe=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,gesture)=>Math.abs(gesture.dx)>18&&Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.5,
    onPanResponderRelease:(_,gesture)=>{if(Math.abs(gesture.dx)>40)setIndex(current=>carouselIndex(current,gesture.dx<0?1:-1,filtered.length))},
  }),[filtered.length]);
  const chooseRole=(next:RoleFilter)=>{const nextClasses=next==='All'?CLASSES:CLASSES.filter(item=>item.role===next);setRole(next);setIndex(Math.max(0,nextClasses.findIndex(item=>item.id===selected.id)))};
  const stepLabel=(value:Step)=>t(language,value==='class'?'onboarding.stepClass':value==='identity'?'onboarding.stepIdentity':'onboarding.stepReview');
  const next=()=>{if(step==='identity'&&!nameError)setStep('review');else if(step==='class')setStep('identity')};
  async function finish(){
    if(submitting.current)return;
    submitting.current=true;setSaving(true);setSaveError('');setConfirming(false);
    try{await onSelect(selected.id,safeName,body)}
    catch{setSaveError('Your character could not be saved. Your choices are still here; please try again.')}
    finally{submitting.current=false;setSaving(false)}
  }
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView ref={scroll} style={s.scroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <View style={s.brandRow}><Image accessibilityLabel="Veldryn" source={startupWordmark} resizeMode="contain" style={s.wordmark}/>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showLanguages}} onPress={()=>setShowLanguages(value=>!value)} style={languageS.toggle}><Text style={languageS.current}>{LANGUAGE_NAMES[language]}</Text><Text style={languageS.mark}>{showLanguages?'−':'+'}</Text></Pressable></View><Text style={s.kicker}>{t(language,'onboarding.createFirst')}</Text>{showLanguages&&<View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><LanguageChip key={id} label={LANGUAGE_NAMES[id]} selected={language===id} onPress={()=>{onLanguage?.(id);setShowLanguages(false)}}/>)}</View>}
    <View accessibilityRole="progressbar" accessibilityValue={{min:1,max:STEPS.length,now:STEPS.indexOf(step)+1}} style={s.stepRow}>{STEPS.map((item,i)=><View key={item} style={s.stepWrap}><View style={[s.stepDot,STEPS.indexOf(step)>=i&&s.stepDotActive]}><Text style={[s.stepNumber,STEPS.indexOf(step)>=i&&s.stepNumberActive]}>{i+1}</Text></View><Text style={[s.stepLabel,item===step&&s.stepLabelActive]}>{stepLabel(item)}</Text></View>)}</View>
    {step==='identity'&&<View style={s.section}>
      <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.whoEnters')}</Text><Text style={s.description}>{t(language,'onboarding.identityHelp')}</Text>
      <View style={[s.creationPreview,s.creationPreviewContent]}><FixedCharacterPortrait classId={selected.id} body={body} style={s.creationPortrait}/><Text style={s.creationBadgeText}>{t(language,'onboarding.universalSkin')}</Text></View>
      <View style={s.nameBlock}><Text style={s.label}>{t(language,'onboarding.characterName')}</Text><View style={[s.nameField,nameFocused&&s.nameFieldFocused,!!nameError&&s.nameFieldError]}><TextInput accessibilityLabel={t(language,'onboarding.characterName')} accessibilityHint="Two to twenty letters" value={name} onChangeText={setName} onFocus={()=>setNameFocused(true)} onBlur={()=>setNameFocused(false)} maxLength={20} autoCapitalize="words" underlineColorAndroid="transparent" style={s.input} placeholder="Adventurer" placeholderTextColor={C.muted}/></View><View style={s.inputMeta}><Text style={s.error}>{nameError}</Text><Text style={s.counter}>{name.length}/20</Text></View></View>
      <Text style={s.label}>{t(language,'onboarding.nameIdeas')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{nameIdeas.map(idea=><Pressable accessibilityRole="button" key={idea} onPress={()=>setName(idea)} style={s.chip}><Text style={s.chipText}>{idea}</Text></Pressable>)}</ScrollView>
      <Text style={s.label}>{t(language,'onboarding.bodyPresentation')}</Text><View style={s.choiceRow}>{(['male','female'] as const).map(value=><View key={value} style={s.flex}><CreationAction title={t(language,value==='male'?'onboarding.male':'onboarding.female')} secondary={body!==value} selected={body===value} onPress={()=>setBody(value)}/></View>)}</View>
    </View>}
    {step==='class'&&<View style={s.section}>
      <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.chooseCalling')}</Text>
      <View style={s.filterRow}>{(['All','Tank','Damage','Support'] as const).map(value=><Pressable accessibilityRole="button" accessibilityState={{selected:role===value}} key={value} onPress={()=>chooseRole(value)} style={[s.filter,role===value&&s.filterActive]}><Text style={[s.filterText,role===value&&s.filterTextActive]}>{value}</Text></Pressable>)}</View>
      <ClassHeroCarousel selected={selected} classes={filtered} index={index} body={body} onBody={setBody} onChange={change} onIndex={setIndex} panHandlers={swipe.panHandlers}/>
      <View style={s.loadout}><View style={s.flex}><Text style={s.label}>STARTING WEAPON</Text><Text style={s.gearName}>{starter.name}</Text></View><Text style={s.weaponTag}>LV. 1</Text></View><Text style={s.note}>Class equipment illustration. You begin with a neutral outfit and earn your armor through play.</Text>
    </View>}
    {step==='review'&&<View style={s.section}>
      <Text accessibilityRole="header" style={s.heading}>{t(language,'onboarding.ready')}</Text><Text style={s.description}>{t(language,'onboarding.reviewPermanent')}</Text><Text style={s.note}>Your first crafting goal: {noviceSetFor(selected.id).name}. Start with the chest piece in Skills → Novice set. The set is earned, not granted at creation.</Text>
      <View style={s.reviewCard}><FixedCharacterPortrait classId={selected.id} body={body} compact/><View style={s.reviewCopy}><Text style={s.reviewName}>{safeName}</Text><Text style={[s.reviewRole,{color:roleColor[selected.role]}]}>{selected.name} · {selected.role}</Text><Text style={s.reviewLine}>{body==='male'?'Male':'Female'} presentation</Text><Text style={s.reviewLine}>Starting weapon: {starter.name}</Text><Text style={s.reviewLine}>Armor and offhand: Unequipped</Text></View></View>
      <Text style={s.note}>Every class starts in the same neutral underlayer. Full equipment-set appearances become permanent skin unlocks later.</Text>
      {!!saveError&&<View accessibilityRole="alert" style={s.saveErrorCard}><Text style={s.saveErrorLabel}>CHARACTER SAVE FAILED</Text><Text style={s.error}>{saveError}</Text></View>}
      <CreationAction title={saving?'Saving character…':`Create ${safeName}`} disabled={saving} onPress={()=>setConfirming(true)}/>
    </View>}
  </ScrollView><View style={s.footer}><View style={s.navigation}>{onCancel&&<View style={s.flex}><CreationAction title={cancelLabel??t(language,'common.back')} disabled={saving} secondary onPress={onCancel}/></View>}{step!=='class'&&<View style={s.flex}><CreationAction title={t(language,'common.back')} disabled={saving} secondary onPress={()=>setStep(step==='review'?'identity':'class')}/></View>}{step!=='review'&&<View style={s.flex}><CreationAction title={t(language,step==='class'?'onboarding.chooseIdentity':'onboarding.reviewCharacter')} disabled={saving||(step==='identity'&&!!nameError)} onPress={next}/></View>}</View></View><ConfirmModal visible={confirming} title={`Create ${safeName}?`} message={`${safeName} will enter Asterfall as a ${body==='male'?'male':'female'} ${selected.name}, carrying only the ${starter.name}. The class and presentation cannot be changed.`} confirmLabel="Enter Asterfall" onConfirm={finish} onCancel={()=>setConfirming(false)}/></KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:'#080E17'},scroll:{flex:1},root:{width:'100%',maxWidth:520,alignSelf:'center',padding:16,paddingTop:12,gap:12,backgroundColor:'#080E17'},brandRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},wordmark:{flex:1,maxWidth:184,height:62},kicker:{fontSize:10,lineHeight:14,color:'#A5B2C4',fontWeight:'800',letterSpacing:2,textAlign:'center'},
  languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},languageChoice:{minWidth:96,flexGrow:1},stepRow:{flexDirection:'row',justifyContent:'space-around',paddingVertical:8},stepWrap:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,flex:1},stepDot:{width:24,height:24,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:'transparent'},stepDotActive:{backgroundColor:'#183042'},stepNumber:{fontSize:12,color:'#A5B2C4',fontWeight:'900',includeFontPadding:false},stepNumberActive:{color:'#DFEFF5'},stepLabel:{fontSize:10,color:'#8F9CAE',fontWeight:'700'},stepLabelActive:{color:'#E9C782'},
  section:{gap:12},heading:{fontFamily:Platform.OS==='ios'?'Georgia':'serif',fontSize:25,lineHeight:32,fontWeight:'500',color:'#F1D89F',textAlign:'center'},creationPreview:{backgroundColor:'#05070A',borderTopLeftRadius:70,borderTopRightRadius:70,borderBottomLeftRadius:24,borderBottomRightRadius:24,overflow:'hidden'},creationPreviewContent:{alignItems:'center',paddingHorizontal:24,paddingVertical:24,gap:10},creationPortrait:{width:190,height:230},creationBadgeText:{fontSize:11,lineHeight:16,color:'#E9C782',fontWeight:'700',textAlign:'center'},nameBlock:{gap:6},nameField:{borderWidth:1,borderColor:'#354352',borderRadius:14,backgroundColor:'#0F1A26',paddingHorizontal:18,paddingVertical:12},nameFieldFocused:{borderColor:'#8BAFC2'},nameFieldError:{borderColor:C.bad},label:{fontSize:10,lineHeight:16,color:'#A5B2C4',fontWeight:'800',letterSpacing:1},input:{minHeight:28,color:'#EEF4FF',padding:0,margin:0,fontSize:17,fontWeight:'600',textAlignVertical:'center',includeFontPadding:false},inputMeta:{flexDirection:'row',justifyContent:'space-between',gap:8},saveErrorCard:{gap:4,padding:12,borderWidth:1,borderColor:C.bad,borderRadius:12,backgroundColor:'#2a1b20'},saveErrorLabel:{fontSize:10,lineHeight:14,color:C.bad,fontWeight:'900',letterSpacing:1},error:{fontSize:12,lineHeight:18,color:'#F4D9DD',flex:1},counter:{fontSize:12,lineHeight:18,color:'#A5B2C4'},chips:{gap:8},chip:{minHeight:44,paddingHorizontal:14,borderRadius:18,justifyContent:'center',backgroundColor:'#101C28'},chipText:{fontSize:14,fontWeight:'600',color:'#E9C782'},choiceRow:{flexDirection:'row',gap:8},flex:{flex:1},note:{fontSize:12,lineHeight:18,color:'#A5B2C4',textAlign:'center'},description:{fontSize:14,lineHeight:21,color:'#BCC8D5',textAlign:'center'},
  filterRow:{flexDirection:'row',gap:6},filter:{flex:1,minHeight:40,paddingHorizontal:8,borderWidth:1,borderColor:'#314259',borderRadius:99,backgroundColor:'#0b1018',justifyContent:'center',alignItems:'center'},filterActive:{borderColor:equipmentColors.selectedLine,backgroundColor:equipmentColors.selected},filterText:{fontSize:12,fontWeight:'700',color:'#A5B2C4'},filterTextActive:{color:'#d9f3ff'},loadout:{borderTopWidth:1,borderColor:'#25323D',paddingVertical:16,paddingHorizontal:8,flexDirection:'row',alignItems:'center',gap:12},gearName:{fontSize:15,lineHeight:21,color:'#E9C782',fontWeight:'700'},weaponTag:{fontSize:11,fontWeight:'800',color:'#96B9D1'},reviewCard:{backgroundColor:'#101B27',borderRadius:20,padding:16,flexDirection:'row',alignItems:'center',gap:12},reviewCopy:{flex:1,gap:5},reviewName:{fontSize:20,lineHeight:26,color:'#F1D89F',fontWeight:'900'},reviewRole:{fontSize:14,lineHeight:20,fontWeight:'700'},reviewLine:{fontSize:13,lineHeight:19,color:'#BAC6D5'},footer:{backgroundColor:'#080E17',paddingHorizontal:20,paddingTop:8,paddingBottom:12},navigation:{width:'100%',maxWidth:488,alignSelf:'center',flexDirection:'row',gap:8},
});

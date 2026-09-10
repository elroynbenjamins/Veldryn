import {useEffect,useMemo,useRef,useState} from 'react';
import {Image,PanResponder,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {ConfirmModal} from '../components/ConfirmModal';
import {FixedCharacterPortrait} from '../components/CharacterVisual';
import {GameButton} from '../components/GameButton';
import {CLASSES,ClassDef} from '../content/classes';
import {itemDef} from '../content/items';
import {BodyPresentation,ClassId,GameState} from '../core/types';
import {carouselIndex,characterNameError} from '../core/character-creation';
import {noviceSetFor} from '../content/novice-sets';
import {C,radii,spacing,touchTargetPreferred,typography} from '../theme/theme';
import {classArtwork} from '../theme/character-assets';
import {LANGUAGE_NAMES,SUPPORTED_LANGUAGES,t} from '../i18n';

type Step='identity'|'class'|'review';
type RoleFilter='All'|ClassDef['role'];
const STEPS:Step[]=['class','identity','review'];
const nameIdeas=['Aelric','Branna','Caelan','Eira','Fenric','Isolde','Orin','Sable'];
const roleColor={Tank:C.info,Support:C.good,Damage:C.warning};
const languageS=StyleSheet.create({toggle:{alignSelf:'center',minWidth:150,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:99,backgroundColor:C.panel,paddingHorizontal:spacing.md},current:{...typography.bodyStrong,color:C.text},mark:{fontSize:22,color:C.accent}});

export function ClassSelectScreen({language='en',onLanguage,onSelect}:{language?:GameState['settings']['language'];onLanguage?:(language:GameState['settings']['language'])=>void;onSelect:(id:ClassId,name:string,body:BodyPresentation)=>Promise<void>|void}){
  const submitting=useRef(false);
  const [saving,setSaving]=useState(false),[saveError,setSaveError]=useState(''),[showLanguages,setShowLanguages]=useState(false);
  const [step,setStep]=useState<Step>('class');
  const scroll=useRef<ScrollView>(null);
  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false})},[step]);
  const [index,setIndex]=useState(0),[name,setName]=useState('Adventurer'),[confirming,setConfirming]=useState(false);
  const [body,setBody]=useState<BodyPresentation>('male');
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
  const chooseRole=(next:RoleFilter)=>{setRole(next);setIndex(0)};
  const stepLabel=(value:Step)=>t(language,value==='class'?'onboarding.stepClass':value==='identity'?'onboarding.stepIdentity':'onboarding.stepReview');
  const next=()=>{if(step==='identity'&&!nameError)setStep('review');else if(step==='class')setStep('identity')};
  async function finish(){
    if(submitting.current)return;
    submitting.current=true;setSaving(true);setSaveError('');setConfirming(false);
    try{await onSelect(selected.id,safeName,body)}
    catch{setSaveError('Your character could not be saved. Your choices are still here; please try again.')}
    finally{submitting.current=false;setSaving(false)}
  }
  return <><ScrollView ref={scroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <Text style={s.logo}>VELDRYN</Text><Text style={s.kicker}>{t(language,'onboarding.createFirst')}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showLanguages}} onPress={()=>setShowLanguages(value=>!value)} style={languageS.toggle}><Text style={languageS.current}>{LANGUAGE_NAMES[language]}</Text><Text style={languageS.mark}>{showLanguages?'−':'+'}</Text></Pressable>{showLanguages&&<View style={s.languageGrid}>{SUPPORTED_LANGUAGES.map(id=><View key={id} style={s.languageChoice}><GameButton title={LANGUAGE_NAMES[id]} tone={language===id?'primary':'secondary'} onPress={()=>{onLanguage?.(id);setShowLanguages(false)}}/></View>)}</View>}
    <View accessibilityRole="progressbar" accessibilityValue={{min:1,max:STEPS.length,now:STEPS.indexOf(step)+1}} style={s.stepRow}>{STEPS.map((item,i)=><View key={item} style={s.stepWrap}><View style={[s.stepDot,STEPS.indexOf(step)>=i&&s.stepDotActive]}><Text style={[s.stepNumber,STEPS.indexOf(step)>=i&&s.stepNumberActive]}>{i+1}</Text></View><Text style={[s.stepLabel,item===step&&s.stepLabelActive]}>{stepLabel(item)}</Text></View>)}</View>
    {step==='identity'&&<View style={s.section}>
      <Text style={s.heading}>{t(language,'onboarding.whoEnters')}</Text><Text style={s.description}>{t(language,'onboarding.identityHelp')}</Text>
      <View style={s.creationPreview}><FixedCharacterPortrait classId={selected.id} body={body} style={s.creationPortrait}/><View style={s.creationBadge}><Text style={s.creationBadgeText}>{t(language,'onboarding.universalSkin')}</Text></View></View>
      <View style={s.nameBlock}><Text style={s.label}>{t(language,'onboarding.characterName')}</Text><TextInput accessibilityLabel={t(language,'onboarding.characterName')} accessibilityHint="Two to twenty letters" value={name} onChangeText={setName} maxLength={20} autoCapitalize="words" style={[s.input,!!nameError&&s.inputError]} placeholder="Adventurer" placeholderTextColor={C.disabled}/><View style={s.inputMeta}><Text style={s.error}>{nameError}</Text><Text style={s.counter}>{name.length}/20</Text></View></View>
      <Text style={s.label}>{t(language,'onboarding.nameIdeas')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{nameIdeas.map(idea=><Pressable accessibilityRole="button" key={idea} onPress={()=>setName(idea)} style={s.chip}><Text style={s.chipText}>{idea}</Text></Pressable>)}</ScrollView>
      <Text style={s.label}>{t(language,'onboarding.bodyPresentation')}</Text><View style={s.choiceRow}>{(['male','female'] as const).map(value=><View key={value} style={s.flex}><GameButton title={t(language,value==='male'?'onboarding.male':'onboarding.female')} tone={body===value?'primary':'secondary'} onPress={()=>setBody(value)}/></View>)}</View>
    </View>}
    {step==='class'&&<View style={s.section}>
      <Text style={s.heading}>{t(language,'onboarding.chooseCalling')}</Text><Text style={s.description}>{t(language,'onboarding.callingHelp')}</Text>
      <View style={s.filterRow}>{(['All','Tank','Support','Damage'] as const).map(value=><Pressable accessibilityRole="button" accessibilityState={{selected:role===value}} key={value} onPress={()=>chooseRole(value)} style={[s.filter,role===value&&s.filterActive]}><Text style={[s.filterText,role===value&&s.filterTextActive]}>{value}</Text></Pressable>)}</View>
      <View style={s.carousel}><Pressable accessibilityRole="button" accessibilityLabel="Previous class" onPress={()=>change(-1)} style={s.arrow}><Text style={s.arrowText}>‹</Text></Pressable><View {...swipe.panHandlers} style={s.portraitFrame}><Image accessibilityLabel={`${selected.name} class emblem`} source={classArtwork[selected.id]} resizeMode="contain" style={s.portrait}/><View style={[s.roleBadge,{borderColor:roleColor[selected.role]}]}><Text style={[s.roleText,{color:roleColor[selected.role]}]}>{selected.role.toUpperCase()}</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel="Next class" onPress={()=>change(1)} style={s.arrow}><Text style={s.arrowText}>›</Text></Pressable></View>
      <View style={s.identity}><Text style={s.className}>{selected.name}</Text><Text style={s.count}>{index+1} / {filtered.length}</Text></View><Text style={s.description}>{selected.description}</Text>
      <View style={s.loadout}><View><Text style={s.label}>STARTING WEAPON</Text><Text style={s.gearName}>{starter.name}</Text></View><View style={s.weaponBadge}><Text style={s.weaponBadgeText}>PRIMARY</Text></View></View><Text style={s.note}>You begin with this weapon. The class emblem remains visible until a correct full-set skin is unlocked.</Text>
    </View>}
    {step==='review'&&<View style={s.section}>
      <Text style={s.heading}>{t(language,'onboarding.ready')}</Text><Text style={s.description}>{t(language,'onboarding.reviewPermanent')}</Text><Text style={s.note}>Your first crafting goal: {noviceSetFor(selected.id).name}. Start with the chest piece in Skills → Novice set. The set is earned, not granted at creation.</Text>
      <View style={s.reviewCard}><FixedCharacterPortrait classId={selected.id} body={body} compact/><View style={s.reviewCopy}><Text style={s.reviewName}>{safeName}</Text><Text style={[s.reviewRole,{color:roleColor[selected.role]}]}>{selected.name} · {selected.role}</Text><Text style={s.reviewLine}>{body==='male'?'Male':'Female'} presentation</Text><Text style={s.reviewLine}>Starting weapon: {starter.name}</Text><Text style={s.reviewLine}>Armor and offhand: Unequipped</Text></View></View>
      <Text style={s.note}>Every class starts in the same neutral underlayer. Full equipment-set appearances become permanent skin unlocks later.</Text>
      {!!saveError&&<Text accessibilityRole="alert" style={s.error}>{saveError}</Text>}
      <GameButton title={saving?'Saving character…':`Create ${safeName}`} disabled={saving} onPress={()=>setConfirming(true)}/>
    </View>}
    <View style={s.navigation}>{step!=='class'&&<View style={s.flex}><GameButton title={t(language,'common.back')} disabled={saving} tone="secondary" onPress={()=>setStep(step==='review'?'identity':'class')}/></View>}{step!=='review'&&<View style={s.flex}><GameButton title={t(language,step==='class'?'onboarding.chooseIdentity':'onboarding.reviewCharacter')} disabled={step==='identity'&&!!nameError} onPress={next}/></View>}</View>
  </ScrollView><ConfirmModal visible={confirming} title={`Create ${safeName}?`} message={`${safeName} will enter Asterfall as a ${body==='male'?'male':'female'} ${selected.name}, carrying only the ${starter.name}. The class and presentation cannot be changed.`} confirmLabel="Enter Asterfall" onConfirm={finish} onCancel={()=>setConfirming(false)}/></>;
}

const s=StyleSheet.create({root:{padding:spacing.lg,paddingTop:spacing.xl,gap:spacing.lg,backgroundColor:C.bg},logo:{fontSize:32,fontWeight:'900',letterSpacing:4,color:C.accent,textAlign:'center'},kicker:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1,textAlign:'center'},languageGrid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},languageChoice:{minWidth:96,flexGrow:1},stepRow:{flexDirection:'row',justifyContent:'space-around'},stepWrap:{alignItems:'center',gap:spacing.xs,flex:1},stepDot:{width:30,height:30,borderRadius:15,borderWidth:1,borderColor:C.line,alignItems:'center',justifyContent:'center',backgroundColor:C.panel},stepDotActive:{backgroundColor:C.accent,borderColor:C.accent},stepNumber:{...typography.caption,color:C.muted,fontWeight:'900'},stepNumberActive:{color:C.bg},stepLabel:{fontSize:10,color:C.disabled,fontWeight:'800'},stepLabelActive:{color:C.accent},section:{gap:spacing.md},heading:{...typography.title,color:C.text,textAlign:'center'},creationPreview:{height:250,backgroundColor:C.panel,borderWidth:1,borderColor:C.accent,borderRadius:radii.lg,alignItems:'center',justifyContent:'center',overflow:'hidden'},creationPortrait:{width:170,height:215},creationBadge:{position:'absolute',bottom:spacing.sm,backgroundColor:'rgba(11,16,24,.92)',borderWidth:1,borderColor:C.line,borderRadius:99,paddingHorizontal:spacing.md,paddingVertical:spacing.xs},creationBadgeText:{...typography.caption,color:C.accent,fontWeight:'900',letterSpacing:.7},nameBlock:{gap:spacing.xs},label:{...typography.caption,color:C.muted,fontWeight:'900',letterSpacing:1},input:{minHeight:touchTargetPreferred,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel,color:C.text,paddingHorizontal:spacing.md,fontSize:17,fontWeight:'800'},inputError:{borderColor:C.bad},inputMeta:{flexDirection:'row',justifyContent:'space-between'},error:{...typography.caption,color:C.bad,flex:1},counter:{...typography.caption,color:C.disabled},chips:{gap:spacing.sm},chip:{minHeight:44,paddingHorizontal:spacing.md,borderWidth:1,borderColor:C.line,borderRadius:99,justifyContent:'center',backgroundColor:C.panel},chipText:{...typography.bodyStrong,color:C.text},choiceRow:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},previewFrame:{height:230,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,alignItems:'center',justifyContent:'center'},preview:{width:'95%',height:'95%'},note:{...typography.caption,color:C.muted,textAlign:'center'},description:{...typography.body,color:C.muted,textAlign:'center'},filterRow:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,justifyContent:'center'},filter:{minHeight:44,paddingHorizontal:spacing.md,borderRadius:99,borderWidth:1,borderColor:C.line,justifyContent:'center'},filterActive:{borderColor:C.accent,backgroundColor:C.panel2},filterText:{...typography.bodyStrong,color:C.muted},filterTextActive:{color:C.accent},carousel:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},arrow:{width:touchTargetPreferred,height:touchTargetPreferred,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel},arrowText:{fontSize:38,lineHeight:40,color:C.accent},portraitFrame:{flex:1,maxWidth:280,aspectRatio:1,marginHorizontal:spacing.sm,backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.lg,overflow:'hidden',alignItems:'center',justifyContent:'center'},portrait:{width:'94%',height:'94%'},roleBadge:{position:'absolute',right:spacing.sm,bottom:spacing.sm,backgroundColor:'rgba(11,16,24,.9)',borderWidth:1,borderRadius:99,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},roleText:{...typography.caption,fontWeight:'900'},identity:{flexDirection:'row',justifyContent:'center',alignItems:'baseline',gap:spacing.sm},className:{...typography.hero,color:C.text,textAlign:'center'},count:{...typography.caption,color:C.muted},loadout:{backgroundColor:C.panel,borderWidth:1,borderColor:C.line,borderRadius:radii.md,padding:spacing.md,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:spacing.md},gearName:{...typography.bodyStrong,color:C.text},weaponBadge:{borderRadius:99,backgroundColor:C.panel2,paddingHorizontal:spacing.sm,paddingVertical:spacing.xs},weaponBadgeText:{...typography.caption,color:C.accent,fontWeight:'900'},thumbs:{gap:spacing.sm,paddingVertical:spacing.xs},thumb:{width:56,height:56,borderWidth:1,borderColor:C.line,borderRadius:radii.md,backgroundColor:C.panel,alignItems:'center',justifyContent:'center'},thumbActive:{borderColor:C.accent,borderWidth:2},thumbImage:{width:50,height:50},reviewCard:{backgroundColor:C.panel,borderWidth:1,borderColor:C.accent,borderRadius:radii.lg,padding:spacing.md,flexDirection:'row',alignItems:'center',gap:spacing.md},reviewImage:{width:120,height:160},reviewCopy:{flex:1,gap:spacing.xs},reviewName:{...typography.title,color:C.text},reviewRole:{...typography.bodyStrong},reviewLine:{...typography.body,color:C.muted},navigation:{flexDirection:'row',gap:spacing.sm}});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassSelectScreen = ClassSelectScreen;
const react_1 = require("react");
const react_native_1 = require("react-native");
const ConfirmModal_1 = require("../components/ConfirmModal");
const CharacterVisual_1 = require("../components/CharacterVisual");
const GameButton_1 = require("../components/GameButton");
const classes_1 = require("../content/classes");
const items_1 = require("../content/items");
const character_creation_1 = require("../core/character-creation");
const novice_sets_1 = require("../content/novice-sets");
const theme_1 = require("../theme/theme");
const startup_art_1 = require("../theme/startup-art");
const ClassHeroCarousel_1 = require("../components/creation/ClassHeroCarousel");
const CreationChrome_1 = require("../components/creation/CreationChrome");
const i18n_1 = require("../i18n");
const STEPS = ['class', 'identity', 'review'];
const nameIdeas = ['Aelric', 'Branna', 'Caelan', 'Eira', 'Fenric', 'Isolde', 'Orin', 'Sable'];
const roleColor = { Tank: theme_1.C.info, Support: theme_1.C.good, Damage: theme_1.C.warning };
const languageS = react_native_1.StyleSheet.create({ toggle: { alignSelf: 'center', minWidth: 94, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme_1.spacing.md, backgroundColor: 'transparent', paddingHorizontal: theme_1.spacing.sm }, current: { fontSize: 12, fontWeight: '700', maxWidth: 74, color: theme_1.C.text }, mark: { fontSize: 22, color: theme_1.C.accent } });
function ClassSelectScreen({ language = 'en', onLanguage, onSelect, onCancel, cancelLabel }) {
    const submitting = (0, react_1.useRef)(false);
    const [saving, setSaving] = (0, react_1.useState)(false), [saveError, setSaveError] = (0, react_1.useState)(''), [showLanguages, setShowLanguages] = (0, react_1.useState)(false);
    const [step, setStep] = (0, react_1.useState)('class');
    const scroll = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [step]);
    const [index, setIndex] = (0, react_1.useState)(0), [name, setName] = (0, react_1.useState)('Adventurer'), [confirming, setConfirming] = (0, react_1.useState)(false);
    const [body, setBody] = (0, react_1.useState)('male');
    const [nameFocused, setNameFocused] = (0, react_1.useState)(false);
    const [role, setRole] = (0, react_1.useState)('All');
    const filtered = (0, react_1.useMemo)(() => role === 'All' ? classes_1.CLASSES : classes_1.CLASSES.filter(item => item.role === role), [role]);
    const selected = filtered[index] ?? filtered[0];
    const safeName = name.trim(), nameError = (0, character_creation_1.characterNameError)(name);
    const starter = (0, items_1.itemDef)(selected.starterEquipment.weapon);
    const change = (direction) => setIndex(current => (0, character_creation_1.carouselIndex)(current, direction, filtered.length));
    const swipe = (0, react_1.useMemo)(() => react_native_1.PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_, gesture) => { if (Math.abs(gesture.dx) > 40)
            setIndex(current => (0, character_creation_1.carouselIndex)(current, gesture.dx < 0 ? 1 : -1, filtered.length)); },
    }), [filtered.length]);
    const chooseRole = (next) => { const nextClasses = next === 'All' ? classes_1.CLASSES : classes_1.CLASSES.filter(item => item.role === next); setRole(next); setIndex(Math.max(0, nextClasses.findIndex(item => item.id === selected.id))); };
    const stepLabel = (value) => (0, i18n_1.t)(language, value === 'class' ? 'onboarding.stepClass' : value === 'identity' ? 'onboarding.stepIdentity' : 'onboarding.stepReview');
    const next = () => { if (step === 'identity' && !nameError)
        setStep('review');
    else if (step === 'class')
        setStep('identity'); };
    async function finish() {
        if (submitting.current)
            return;
        submitting.current = true;
        setSaving(true);
        setSaveError('');
        setConfirming(false);
        try {
            await onSelect(selected.id, safeName, body);
        }
        catch {
            setSaveError('Your character could not be saved. Your choices are still here; please try again.');
        }
        finally {
            submitting.current = false;
            setSaving(false);
        }
    }
    return <react_native_1.KeyboardAvoidingView style={s.screen} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}><react_native_1.ScrollView ref={scroll} style={s.scroll} contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <react_native_1.View style={s.brandRow}><react_native_1.Image accessibilityLabel="Veldryn" source={startup_art_1.startupWordmark} resizeMode="contain" style={s.wordmark}/>
    <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded: showLanguages }} onPress={() => setShowLanguages(value => !value)} style={languageS.toggle}><react_native_1.Text style={languageS.current}>{i18n_1.LANGUAGE_NAMES[language]}</react_native_1.Text><react_native_1.Text style={languageS.mark}>{showLanguages ? '−' : '+'}</react_native_1.Text></react_native_1.Pressable></react_native_1.View><react_native_1.Text style={s.kicker}>{(0, i18n_1.t)(language, 'onboarding.createFirst')}</react_native_1.Text>{showLanguages && <react_native_1.View style={s.languageGrid}>{i18n_1.SUPPORTED_LANGUAGES.map(id => <react_native_1.View key={id} style={s.languageChoice}><GameButton_1.GameButton title={i18n_1.LANGUAGE_NAMES[id]} tone={language === id ? 'primary' : 'secondary'} onPress={() => { onLanguage?.(id); setShowLanguages(false); }}/></react_native_1.View>)}</react_native_1.View>}
    <react_native_1.View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEPS.length, now: STEPS.indexOf(step) + 1 }} style={s.stepRow}>{STEPS.map((item, i) => <react_native_1.View key={item} style={s.stepWrap}><react_native_1.View style={[s.stepDot, STEPS.indexOf(step) >= i && s.stepDotActive]}><react_native_1.Text style={[s.stepNumber, STEPS.indexOf(step) >= i && s.stepNumberActive]}>{i + 1}</react_native_1.Text></react_native_1.View><react_native_1.Text style={[s.stepLabel, item === step && s.stepLabelActive]}>{stepLabel(item)}</react_native_1.Text></react_native_1.View>)}</react_native_1.View>
    {step === 'identity' && <react_native_1.View style={s.section}>
      <react_native_1.Text style={s.heading}>{(0, i18n_1.t)(language, 'onboarding.whoEnters')}</react_native_1.Text><react_native_1.Text style={s.description}>{(0, i18n_1.t)(language, 'onboarding.identityHelp')}</react_native_1.Text>
      <react_native_1.View style={[s.creationPreview, s.creationPreviewContent]}><CharacterVisual_1.FixedCharacterPortrait classId={selected.id} body={body} style={s.creationPortrait}/><react_native_1.Text style={s.creationBadgeText}>{(0, i18n_1.t)(language, 'onboarding.universalSkin')}</react_native_1.Text></react_native_1.View>
      <react_native_1.View style={s.nameBlock}><react_native_1.Text style={s.label}>{(0, i18n_1.t)(language, 'onboarding.characterName')}</react_native_1.Text><react_native_1.View style={[s.nameField, nameFocused && s.nameFieldFocused, !!nameError && s.nameFieldError]}><react_native_1.TextInput accessibilityLabel={(0, i18n_1.t)(language, 'onboarding.characterName')} accessibilityHint="Two to twenty letters" value={name} onChangeText={setName} onFocus={() => setNameFocused(true)} onBlur={() => setNameFocused(false)} maxLength={20} autoCapitalize="words" underlineColorAndroid="transparent" style={s.input} placeholder="Adventurer" placeholderTextColor={theme_1.C.muted}/></react_native_1.View><react_native_1.View style={s.inputMeta}><react_native_1.Text style={s.error}>{nameError}</react_native_1.Text><react_native_1.Text style={s.counter}>{name.length}/20</react_native_1.Text></react_native_1.View></react_native_1.View>
      <react_native_1.Text style={s.label}>{(0, i18n_1.t)(language, 'onboarding.nameIdeas')}</react_native_1.Text><react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{nameIdeas.map(idea => <react_native_1.Pressable accessibilityRole="button" key={idea} onPress={() => setName(idea)} style={s.chip}><react_native_1.Text style={s.chipText}>{idea}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.ScrollView>
      <react_native_1.Text style={s.label}>{(0, i18n_1.t)(language, 'onboarding.bodyPresentation')}</react_native_1.Text><react_native_1.View style={s.choiceRow}>{['male', 'female'].map(value => <react_native_1.View key={value} style={s.flex}><CreationChrome_1.CreationAction title={(0, i18n_1.t)(language, value === 'male' ? 'onboarding.male' : 'onboarding.female')} secondary={body !== value} selected={body === value} onPress={() => setBody(value)}/></react_native_1.View>)}</react_native_1.View>
    </react_native_1.View>}
    {step === 'class' && <react_native_1.View style={s.section}>
      <react_native_1.Text style={s.heading}>{(0, i18n_1.t)(language, 'onboarding.chooseCalling')}</react_native_1.Text>
      <react_native_1.View style={s.filterRow}>{['All', 'Tank', 'Damage', 'Support'].map(value => <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ selected: role === value }} key={value} onPress={() => chooseRole(value)} style={[s.filter, role === value && s.filterActive]}><react_native_1.Text style={[s.filterText, role === value && s.filterTextActive]}>{value}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.View>
      <ClassHeroCarousel_1.ClassHeroCarousel selected={selected} classes={filtered} index={index} body={body} onBody={setBody} onChange={change} onIndex={setIndex} panHandlers={swipe.panHandlers}/>
      <react_native_1.View style={s.loadout}><react_native_1.View style={s.flex}><react_native_1.Text style={s.label}>STARTING WEAPON</react_native_1.Text><react_native_1.Text style={s.gearName}>{starter.name}</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.weaponTag}>LV. 1</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.note}>Class equipment illustration. You begin with a neutral outfit and earn your armor through play.</react_native_1.Text>
    </react_native_1.View>}
    {step === 'review' && <react_native_1.View style={s.section}>
      <react_native_1.Text style={s.heading}>{(0, i18n_1.t)(language, 'onboarding.ready')}</react_native_1.Text><react_native_1.Text style={s.description}>{(0, i18n_1.t)(language, 'onboarding.reviewPermanent')}</react_native_1.Text><react_native_1.Text style={s.note}>Your first crafting goal: {(0, novice_sets_1.noviceSetFor)(selected.id).name}. Start with the chest piece in Skills → Novice set. The set is earned, not granted at creation.</react_native_1.Text>
      <react_native_1.View style={s.reviewCard}><CharacterVisual_1.FixedCharacterPortrait classId={selected.id} body={body} compact/><react_native_1.View style={s.reviewCopy}><react_native_1.Text style={s.reviewName}>{safeName}</react_native_1.Text><react_native_1.Text style={[s.reviewRole, { color: roleColor[selected.role] }]}>{selected.name} · {selected.role}</react_native_1.Text><react_native_1.Text style={s.reviewLine}>{body === 'male' ? 'Male' : 'Female'} presentation</react_native_1.Text><react_native_1.Text style={s.reviewLine}>Starting weapon: {starter.name}</react_native_1.Text><react_native_1.Text style={s.reviewLine}>Armor and offhand: Unequipped</react_native_1.Text></react_native_1.View></react_native_1.View>
      <react_native_1.Text style={s.note}>Every class starts in the same neutral underlayer. Full equipment-set appearances become permanent skin unlocks later.</react_native_1.Text>
      {!!saveError && <react_native_1.Text accessibilityRole="alert" style={s.error}>{saveError}</react_native_1.Text>}
      <CreationChrome_1.CreationAction title={saving ? 'Saving character…' : `Create ${safeName}`} disabled={saving} onPress={() => setConfirming(true)}/>
    </react_native_1.View>}
  </react_native_1.ScrollView><react_native_1.View style={s.footer}><react_native_1.View style={s.navigation}>{onCancel && <react_native_1.View style={s.flex}><CreationChrome_1.CreationAction title={cancelLabel ?? (0, i18n_1.t)(language, 'common.back')} disabled={saving} secondary onPress={onCancel}/></react_native_1.View>}{step !== 'class' && <react_native_1.View style={s.flex}><CreationChrome_1.CreationAction title={(0, i18n_1.t)(language, 'common.back')} disabled={saving} secondary onPress={() => setStep(step === 'review' ? 'identity' : 'class')}/></react_native_1.View>}{step !== 'review' && <react_native_1.View style={s.flex}><CreationChrome_1.CreationAction title={(0, i18n_1.t)(language, step === 'class' ? 'onboarding.chooseIdentity' : 'onboarding.reviewCharacter')} disabled={saving || (step === 'identity' && !!nameError)} onPress={next}/></react_native_1.View>}</react_native_1.View></react_native_1.View><ConfirmModal_1.ConfirmModal visible={confirming} title={`Create ${safeName}?`} message={`${safeName} will enter Asterfall as a ${body === 'male' ? 'male' : 'female'} ${selected.name}, carrying only the ${starter.name}. The class and presentation cannot be changed.`} confirmLabel="Enter Asterfall" onConfirm={finish} onCancel={() => setConfirming(false)}/></react_native_1.KeyboardAvoidingView>;
}
const s = react_native_1.StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#080E17' }, scroll: { flex: 1 }, root: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 16, paddingTop: 12, gap: 12, backgroundColor: '#080E17' }, brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, wordmark: { flex: 1, maxWidth: 184, height: 62 }, kicker: { fontSize: 10, lineHeight: 14, color: '#A5B2C4', fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
    languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, languageChoice: { minWidth: 96, flexGrow: 1 }, stepRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }, stepWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 }, stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }, stepDotActive: { backgroundColor: '#183042' }, stepNumber: { fontSize: 12, color: '#A5B2C4', fontWeight: '900', includeFontPadding: false }, stepNumberActive: { color: '#DFEFF5' }, stepLabel: { fontSize: 10, color: '#8F9CAE', fontWeight: '700' }, stepLabelActive: { color: '#E9C782' },
    section: { gap: 12 }, heading: { fontFamily: react_native_1.Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 25, lineHeight: 32, fontWeight: '500', color: '#F1D89F', textAlign: 'center' }, creationPreview: { backgroundColor: '#05070A', borderTopLeftRadius: 70, borderTopRightRadius: 70, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' }, creationPreviewContent: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 24, gap: 10 }, creationPortrait: { width: 190, height: 230 }, creationBadgeText: { fontSize: 11, lineHeight: 16, color: '#E9C782', fontWeight: '700', textAlign: 'center' }, nameBlock: { gap: 6 }, nameField: { borderWidth: 1, borderColor: '#354352', borderRadius: 14, backgroundColor: '#0F1A26', paddingHorizontal: 18, paddingVertical: 12 }, nameFieldFocused: { borderColor: '#8BAFC2' }, nameFieldError: { borderColor: theme_1.C.bad }, label: { fontSize: 10, lineHeight: 16, color: '#A5B2C4', fontWeight: '800', letterSpacing: 1 }, input: { minHeight: 28, color: '#EEF4FF', padding: 0, margin: 0, fontSize: 17, fontWeight: '600', textAlignVertical: 'center', includeFontPadding: false }, inputMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, error: { fontSize: 12, lineHeight: 18, color: theme_1.C.bad, flex: 1 }, counter: { fontSize: 12, lineHeight: 18, color: '#A5B2C4' }, chips: { gap: 8 }, chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: '#101C28' }, chipText: { fontSize: 14, fontWeight: '600', color: '#E9C782' }, choiceRow: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 }, note: { fontSize: 12, lineHeight: 18, color: '#A5B2C4', textAlign: 'center' }, description: { fontSize: 14, lineHeight: 21, color: '#BCC8D5', textAlign: 'center' },
    filterRow: { flexDirection: 'row', gap: 6 }, filter: { flex: 1, minHeight: 44, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' }, filterActive: { borderColor: '#8BAFC2' }, filterText: { fontSize: 12, fontWeight: '500', color: '#A5B2C4' }, filterTextActive: { color: '#E1F4FA' }, loadout: { borderTopWidth: 1, borderColor: '#25323D', paddingVertical: 16, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }, gearName: { fontSize: 15, lineHeight: 21, color: '#E9C782', fontWeight: '700' }, weaponTag: { fontSize: 11, fontWeight: '800', color: '#96B9D1' }, reviewCard: { backgroundColor: '#101B27', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, reviewCopy: { flex: 1, gap: 5 }, reviewName: { fontSize: 20, lineHeight: 26, color: '#F1D89F', fontWeight: '900' }, reviewRole: { fontSize: 14, lineHeight: 20, fontWeight: '700' }, reviewLine: { fontSize: 13, lineHeight: 19, color: '#BAC6D5' }, footer: { backgroundColor: '#080E17', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }, navigation: { width: '100%', maxWidth: 488, alignSelf: 'center', flexDirection: 'row', gap: 8 },
});

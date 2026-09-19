"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedCharacterPortrait = FixedCharacterPortrait;
exports.CharacterPortrait = CharacterPortrait;
exports.EquipmentCharacterPortrait = EquipmentCharacterPortrait;
exports.CharacterVisual = CharacterVisual;
const react_native_1 = require("react-native");
const character_skin_sets_1 = require("../content/character-skin-sets");
const character_skins_1 = require("../core/character-skins");
const character_assets_1 = require("../theme/character-assets");
const theme_1 = require("../theme/theme");
const equipmentShowcaseSkin = {
    IRONWARDEN: 'accepted-front-aster-iron', BASTION: 'accepted-front-lastwall-panoply', DREADGUARD: 'accepted-front-mournchain-harness',
    DAWNKEEPER: 'accepted-front-thread-of-dawn', WAYFINDER: 'accepted-front-regretwalker', RAVAGER: 'accepted-front-lanternsteel-array',
    HEXWEAVER: 'accepted-front-runespark-adept', KNIFE_DANCER: 'accepted-front-gloamstep-regalia', STONECALLER: 'accepted-front-resonant-tempest',
};
function FixedCharacterPortrait({ classId, body = 'male', view = 'front', compact = false, style }) {
    return <react_native_1.View accessibilityLabel={`${body} ${classId.replace('_', ' ')} starting character, ${view} view`} style={[compact ? s.compact : s.portrait, style]}>
    <react_native_1.Image source={character_assets_1.startingCharacterArtwork[body][view]} resizeMode="contain" style={s.layer}/>
  </react_native_1.View>;
}
function selectedSkin(state) {
    const selectedId = state.character?.selectedSkinId ?? 'starting';
    const set = character_skin_sets_1.CHARACTER_SKIN_SETS.find(candidate => (0, character_skins_1.equipmentSetSkinId)(candidate.id) === selectedId);
    const artwork = set?.appearanceId ? character_assets_1.approvedCharacterSkinArtwork[set.appearanceId] : undefined;
    return { name: artwork && set ? set.name : 'Starting skin', artwork };
}
function CharacterPortrait({ state, view = 'front', compact = false, style }) {
    const character = state.character, body = character.bodyPresentation ?? 'male', skin = selectedSkin(state);
    if (!skin.artwork)
        return <FixedCharacterPortrait classId={character.classId} body={body} view={view} compact={compact} style={style}/>;
    const source = skin.artwork[body][view] ?? skin.artwork[body].front;
    return <react_native_1.View accessibilityLabel={`${body} ${character.classId.replace('_', ' ')} character wearing ${skin.name}, ${view} view`} style={[compact ? s.compact : s.portrait, style]}>
    <react_native_1.Image source={source} resizeMode="contain" style={s.layer}/>
  </react_native_1.View>;
}
/** Equipment uses a complete class figure. A starting cosmetic falls back to approved class showcase art. */
function EquipmentCharacterPortrait({ state, style }) {
    const character = state.character, body = character.bodyPresentation ?? 'male', skin = selectedSkin(state);
    const artwork = skin.artwork ?? character_assets_1.approvedCharacterSkinArtwork[equipmentShowcaseSkin[character.classId]];
    const source = artwork?.[body]?.front;
    if (!source)
        return <FixedCharacterPortrait classId={character.classId} body={body} style={style}/>;
    const label = skin.artwork ? `${body} ${character.classId.replace('_', ' ')} character wearing ${skin.name}` : `${body} ${character.classId.replace('_', ' ')} approved class equipment preview`;
    return <react_native_1.View accessibilityLabel={label} style={[s.equipmentPortrait, style]}><react_native_1.Image source={source} resizeMode="contain" fadeDuration={0} style={s.layer}/></react_native_1.View>;
}
function CharacterVisual({ state, compact = false }) {
    const character = state.character, skin = selectedSkin(state);
    return <react_native_1.View style={s.frame}>
    <react_native_1.Text style={s.label}>{character.classId.replace('_', ' ')} · {skin.name}</react_native_1.Text>
    <CharacterPortrait state={state} compact={compact}/>
    <react_native_1.Text style={s.note}>Skin choice is cosmetic. Equipping or removing individual items never changes this appearance.</react_native_1.Text>
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ frame: { backgroundColor: theme_1.C.panel2, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 12, padding: theme_1.spacing.md, gap: theme_1.spacing.sm, alignItems: 'center' }, label: { ...theme_1.typography.bodyStrong, color: theme_1.C.accent, textAlign: 'center' }, portrait: { width: 240, height: 300, maxWidth: '100%' }, equipmentPortrait: { width: '100%', maxWidth: 330, aspectRatio: 128 / 160 }, compact: { width: 96, height: 120 }, layer: { ...react_native_1.StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, note: { ...theme_1.typography.caption, color: theme_1.C.muted, textAlign: 'center' } });

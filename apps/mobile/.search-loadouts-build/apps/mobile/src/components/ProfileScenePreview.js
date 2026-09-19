"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileScenePreview = ProfileScenePreview;
const react_native_1 = require("react-native");
const classes_1 = require("../content/classes");
const CharacterVisual_1 = require("./CharacterVisual");
const profile_background_assets_1 = require("../theme/profile-background-assets");
const profile_border_assets_1 = require("../theme/profile-border-assets");
const event_pet_assets_1 = require("../theme/event-pet-assets");
const profile_cosmetics_1 = require("../core/profile-cosmetics");
const RegionArtwork_1 = require("./RegionArtwork");
const theme_1 = require("../theme/theme");
const live_events_1 = require("../content/live-events");
function ProfileScenePreview({ state, backgroundId }) {
    const character = state.character, background = profile_background_assets_1.profileBackgroundPreviewById.get(backgroundId), base = profile_cosmetics_1.BASE_PROFILE_BACKGROUNDS.find(item => item.id === backgroundId);
    if (!background && !base)
        return null;
    const className = classes_1.CLASSES.find(item => item.id === character.classId)?.name ?? character.classId;
    const rewards = live_events_1.LIVE_EVENT_CATALOG.flatMap(event => [...event.milestones(character.classId).map(m => m.reward), ...event.shop.map(o => o.reward)]);
    const pet = rewards.find(reward => reward.id === character.selectedCosmeticPetId), petSource = event_pet_assets_1.eventPetSourceById.get(character.selectedCosmeticPetId ?? ''), borderSource = profile_border_assets_1.profileBorderSourceById.get(character.profileBorderId ?? '');
    return <react_native_1.View accessibilityLabel={`${character.name}'s profile preview with ${background?.name ?? base?.name}`} style={s.frame}>
  <react_native_1.View style={s.scene}>
   {background ? <react_native_1.Image source={background.source} resizeMode="cover" style={react_native_1.StyleSheet.absoluteFill}/> : <RegionArtwork_1.RegionArtwork regionId={base.region}/>}
   <CharacterVisual_1.CharacterPortrait state={state} style={s.character}/>
   {petSource && <react_native_1.View style={s.petBadge}><react_native_1.Image source={petSource} accessibilityLabel={pet?.name ?? 'Companion preview'} resizeMode="contain" style={s.petImage}/></react_native_1.View>}
   {borderSource && <react_native_1.Image accessible={false} source={borderSource} resizeMode="contain" style={s.borderOverlay}/>}
  </react_native_1.View>
  <react_native_1.View style={s.info}><react_native_1.Text style={s.name}>{character.name}</react_native_1.Text><react_native_1.Text style={s.meta}>Lv. {character.level} · {className}</react_native_1.Text><react_native_1.Text style={s.title}>{character.profileTitle ?? 'New Adventurer'}</react_native_1.Text>{pet && <react_native_1.Text style={s.meta}>{pet.name}</react_native_1.Text>}</react_native_1.View>
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ frame: { width: '100%', maxWidth: 480, alignSelf: 'center', borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 14, overflow: 'hidden', backgroundColor: theme_1.C.bg }, scene: { width: '100%', aspectRatio: 16 / 9, alignItems: 'center', overflow: 'hidden' }, character: { position: 'absolute', bottom: 0, width: 128, height: '94%' }, petBadge: { position: 'absolute', right: 16, bottom: 12 }, petImage: { width: 56, height: 56 }, borderOverlay: { ...react_native_1.StyleSheet.absoluteFillObject, width: '100%', height: '100%' }, info: { width: '100%', padding: 12, gap: 3, backgroundColor: '#101b29' }, name: { ...theme_1.typography.title, color: theme_1.C.text, textAlign: 'center' }, meta: { ...theme_1.typography.caption, color: theme_1.C.muted, textAlign: 'center' }, title: { ...theme_1.typography.bodyStrong, color: theme_1.C.accent, textAlign: 'center' } });

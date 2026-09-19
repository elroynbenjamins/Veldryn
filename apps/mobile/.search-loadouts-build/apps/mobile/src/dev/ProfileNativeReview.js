"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProfileNativeReview;
const react_1 = require("react");
const react_native_1 = require("react-native");
const ProfileEditor_1 = require("../components/ProfileEditor");
const theme_1 = require("../theme/theme");
const initial = {
    version: 6, createdAtMs: Date.now(), inventory: { stacks: [], capacity: 120 }, bank: { stacks: [], capacity: 200 }, overflow: { stacks: [], expiresAtMs: null }, activity: null, currentRegionId: 'KINGS_ROAD', quests: [], unlockedMonsterIds: [], defeatedBossIds: [], skills: [],
    character: { id: 'profile-review', name: 'Aster Nightfall', classId: 'IRONWARDEN', level: 25, xp: 0, gold: 4500, hp: 100, currentHp: 100, attack: 10, defense: 10, equipment: {}, bodyPresentation: 'female', selectedSkinId: 'starting', profileTitle: 'Warden of the First Light', profileBackgroundId: 'bg_harvestwake', profileBorderId: 'frame_amber_vine', selectedCosmeticPetId: 'pet_harvest_fox' },
    account: { createdCharacterCount: 1, guildMember: false, patronTier: 'none', unlockedProfileBackgroundIds: ['bg_harvestwake'], unlockedProfileBorderIds: ['frame_amber_vine'], unlockedCosmeticPetIds: ['pet_harvest_fox'], unlockedTitleIds: [] },
    settings: { language: 'en', numberMode: 'abbreviated', reduceMotion: true, textScale: 1, autoEatThresholdPct: 40, stopCombatWhenOutOfFood: true },
};
function ProfileNativeReview() {
    const [state, setState] = (0, react_1.useState)(initial);
    return <react_native_1.SafeAreaView style={s.root}><react_native_1.View style={s.qa}><react_native_1.Text style={s.qaText}>NATIVE QA · PROFILE MEMORY FIXTURE</react_native_1.Text></react_native_1.View><react_native_1.ScrollView contentContainerStyle={s.content}><ProfileEditor_1.ProfileEditor state={state} onChange={setState}/></react_native_1.ScrollView></react_native_1.SafeAreaView>;
}
const s = react_native_1.StyleSheet.create({ root: { flex: 1, backgroundColor: theme_1.C.bg, paddingTop: react_native_1.StatusBar.currentHeight ?? 24 }, qa: { backgroundColor: '#26334a', paddingHorizontal: 10, paddingVertical: 6 }, qaText: { color: theme_1.C.text, fontSize: 11 }, content: { padding: 16 } });

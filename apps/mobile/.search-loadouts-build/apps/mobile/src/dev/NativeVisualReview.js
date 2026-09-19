"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NativeVisualReview;
const QuestScreen_1 = require("../screens/QuestScreen");
const SettingsScreen_1 = require("../screens/SettingsScreen");
const EventScreen_1 = require("../screens/EventScreen");
const live_events_1 = require("../core/live-events");
const ProfileEditor_1 = require("../components/ProfileEditor");
const ItemCard_1 = require("../components/ItemCard");
const items_1 = require("../content/items");
const IngredientList_1 = require("../components/IngredientList");
const ingredient_assets_1 = require("../theme/ingredient-assets");
/** Opt-in native visual QA. Fixtures live only in memory; never mounts auth or save providers. */
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const game_1 = require("../core/game");
const HomeScreen_1 = require("../screens/HomeScreen");
const SkillsScreen_1 = require("../screens/SkillsScreen");
const SkillDashboard_1 = require("../components/SkillDashboard");
const BattleStage_1 = require("../components/BattleStage");
const BossEncounterIntro_1 = require("../components/BossEncounterIntro");
const PartyHubPanel_1 = require("../components/PartyHubPanel");
const RecruitmentListing_1 = require("../components/RecruitmentListing");
const PrimaryNavigation_1 = require("../components/PrimaryNavigation");
const GameTopBar_1 = require("../components/GameTopBar");
const OnlineAccountPanel_1 = require("../components/OnlineAccountPanel");
const AccountWelcomeScreen_1 = require("../components/AccountWelcomeScreen");
const startup_art_1 = require("../theme/startup-art");
const monsters_1 = require("../content/monsters");
const items_2 = require("../content/items");
const theme_1 = require("../theme/theme");
const now = Date.now();
function fixture() {
    const state = (0, game_1.createCharacter)((0, game_1.newGame)(now), 'IRONWARDEN', 'Aster Nightfall', 'female');
    state.character.gold = 4500;
    state.character.level = 25;
    state.inventory.stacks = items_2.ITEMS.filter(i => i.type === 'material').slice(0, 100).map(i => ({ itemId: i.id, quantity: 100 }));
    state.inventory.capacity = 120;
    state.skills = state.skills.map(s => ({ ...s, level: 25, xp: 4000 }));
    state.settings.reduceMotion = true;
    const review = (0, game_1.startCombat)(state, 'MOSS_RAT', now - 600000);
    if (process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN === 'topbar-idle')
        return { ...review, activity: null };
    if (process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN === 'topbar-skill')
        return { ...review, activity: { kind: 'mining', targetId: 'COPPER_VEIN', startedAtMs: now - 147000, lastClaimAtMs: now - 147000 } };
    if (process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN === 'journal')
        review.quests = review.quests.map((q, index) => index === 0 ? { ...q, status: 'complete', progress: 5 } : q);
    if (process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN === 'events')
        return (0, live_events_1.setLocalEventEnabled)(review, true, now);
    if (process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN === 'profile')
        return { ...review, character: { ...review.character, profileBackgroundId: 'bg_harvestwake', profileBorderId: 'frame_amber_vine', selectedCosmeticPetId: 'pet_harvest_fox', profileTitle: 'Warden of the First Light' }, account: { ...review.account, unlockedProfileBackgroundIds: ['bg_harvestwake'], unlockedProfileBorderIds: ['frame_amber_vine'], unlockedCosmeticPetIds: ['pet_harvest_fox'] } };
    return review;
}
const party = { id: 'qa-party', maxMembers: 4, focus: 'mixed', members: [
        { accountId: 'qa', characterId: 'qa1', characterName: 'Aster Nightfall', className: 'Ironwarden', role: 'tank', isLeader: true },
        { accountId: 'qa2', characterId: 'qa2', characterName: 'Longname Dawnkeeper', className: 'Dawnkeeper', role: 'support', isLeader: false },
        { accountId: 'qa3', characterId: 'qa3', characterName: 'Wandering Wayfinder', className: 'Wayfinder', role: 'damage', isLeader: false }
    ] };
const post = { id: 'qa-post', postType: 'party_recruiting', ownerName: 'Aster Nightfall', title: 'Preparing for the Fallen Knight', body: 'A relaxed party for hunting, gathering, and the next Asterfall challenge.', roles: ['damage', 'support'], focus: 'mixed', activityTags: ['Bosses'], playstyleTags: ['Relaxed'], availabilityTags: [], guildInterestTags: [], currentObjective: 'The Fallen Knight', openSpots: 1, expiresAtMs: now + 3600000 };
const sections = ['Home', 'Skills', 'Crafting', 'Combat', 'Social', 'Guild', 'Login', 'Ingredients', 'Settings', 'Journal', 'Events', 'Profile'];
const destinations = ['Character', 'Skills', 'World', 'Inventory', 'More'];
function NativeVisualReview() {
    const [section, setSection] = (0, react_1.useState)(sections.find(name => name.toLowerCase() === process.env.EXPO_PUBLIC_VISUAL_QA_SCREEN) ?? 'Home'), [state, setState] = (0, react_1.useState)(fixture), [active, setActive] = (0, react_1.useState)('Character');
    const noop = () => { };
    return <react_native_1.SafeAreaView style={s.root}><react_native_1.View style={s.qa}><react_native_1.Text style={s.qaLabel}>NATIVE QA · MEMORY FIXTURES</react_native_1.Text><react_native_1.ScrollView horizontal contentContainerStyle={s.selector}>{sections.map(name => <react_native_1.Pressable key={name} accessibilityRole="button" accessibilityLabel={'QA ' + name} onPress={() => setSection(name)} style={s.pick}><react_native_1.Text style={{ color: section === name ? theme_1.C.accent : theme_1.C.text }}>{name}</react_native_1.Text></react_native_1.Pressable>)}</react_native_1.ScrollView></react_native_1.View>
 <react_native_1.View style={s.flex}>
 {section === 'Login' ? <AccountWelcomeScreen_1.AccountWelcomeScreen scene={startup_art_1.STARTUP_SCENES[0]}><OnlineAccountPanel_1.OnlineAccountPanel state={(0, game_1.newGame)(now)}/></AccountWelcomeScreen_1.AccountWelcomeScreen> : <>
 <GameTopBar_1.GameTopBar state={state} nowMs={now} labelForDestination={x => x} onNavigate={noop} onChangeDestinations={noop} onOpenActivity={() => setSection(state.activity?.kind === 'combat' ? 'Combat' : 'Skills')}/>
 {section === 'Home' && <HomeScreen_1.HomeScreen state={state} preview={(0, game_1.previewActivityReward)(state, now)} onClaim={() => setState(s => (0, game_1.claimActivity)(s, now).state)} onStop={() => setState(game_1.stopActivity)} onNavigate={noop} onOpenCombat={() => setSection('Combat')} onOpenSkill={() => setSection('Skills')}/>}
 {section === 'Journal' && <QuestScreen_1.QuestScreen state={state} onClaim={noop} onClaimContract={noop} onNavigate={noop}/>} 
 {section === 'Events' && <EventScreen_1.EventScreen state={state} onChange={setState}/>} 
 {section === 'Profile' && <react_native_1.ScrollView contentContainerStyle={s.content}><ProfileEditor_1.ProfileEditor state={state} onChange={setState}/></react_native_1.ScrollView>} 
 {section === 'Settings' && <SettingsScreen_1.SettingsScreen state={state} onLanguage={language => setState(s => ({ ...s, settings: { ...s.settings, language } }))} onReset={noop} onChange={setState} onExport={async () => { }} onImport={async () => { }}/>}
 {section === 'Ingredients' && <react_native_1.ScrollView contentContainerStyle={s.content}><react_native_1.Text style={{ color: theme_1.C.text, fontSize: 22 }}>Crafting ingredient artwork</react_native_1.Text><IngredientList_1.IngredientList inputs={Object.keys(ingredient_assets_1.ingredientIcons).map((itemId, index) => ({ itemId, quantity: 5, inventory: index % 3 === 0 ? 2 : 12, bank: 1 }))} showStorage/><react_native_1.Text style={{ color: theme_1.C.text, fontSize: 22 }}>Inventory card preview</react_native_1.Text><ItemCard_1.ItemCard item={(0, items_1.itemDef)('ASTRAL_SCRIPT')} quantity={12} onSell={noop}/></react_native_1.ScrollView>}
 {section === 'Skills' && <react_native_1.ScrollView contentContainerStyle={s.content}><SkillDashboard_1.SkillDashboard state={state} onCombat={() => setSection('Combat')} onSkill={noop}/></react_native_1.ScrollView>}
 {section === 'Crafting' && <SkillsScreen_1.SkillsScreen state={state} initialMode="crafting" onCraft={id => setState(s => (0, game_1.craftRecipe)(s, id, now))} onGather={noop} onEquipTool={noop} onCharacter={noop} onInventory={noop} onViewToolRecipes={noop}/>}
 {section === 'Combat' && <react_native_1.ScrollView contentContainerStyle={s.content}><BattleStage_1.BattleStage state={state} monster={monsters_1.MONSTERS.find(m => m.id === 'MOSS_RAT')} elapsedSeconds={7} cycleSeconds={12}/><BossEncounterIntro_1.BossEncounterIntro monster={monsters_1.MONSTERS.find(m => m.id === 'FALLEN_KNIGHT')}/></react_native_1.ScrollView>}
 {section === 'Social' && <react_native_1.ScrollView contentContainerStyle={s.content}><PartyHubPanel_1.PartyHubPanel accountId="qa" party={party} contracts={[]} recruitment={[post]} nowMs={now} onOpenPartyChat={noop} onLeaveParty={noop} onCreateRecruitmentPost={noop}/></react_native_1.ScrollView>}
 {section === 'Guild' && <react_native_1.ScrollView contentContainerStyle={s.content}><RecruitmentListing_1.RecruitmentListing card={{ ...post, postType: 'guild_recruiting', guildName: 'The Lanterns of Asterfall', title: 'A home for wandering adventurers', guildInterestTags: ['Weekly contracts'] }} nowMs={now} onPress={noop}/></react_native_1.ScrollView>}
 <PrimaryNavigation_1.PrimaryNavigation destinations={destinations} active={active} labelFor={x => x} onNavigate={setActive}/>
 </>}
 </react_native_1.View></react_native_1.SafeAreaView>;
}
const s = react_native_1.StyleSheet.create({ root: { flex: 1, backgroundColor: theme_1.C.bg, paddingTop: react_native_1.Platform.OS === 'android' ? react_native_1.StatusBar.currentHeight ?? 24 : 0 }, flex: { flex: 1 }, qa: { backgroundColor: '#26334a' }, qaLabel: { color: '#fff', fontSize: 10, paddingHorizontal: 10 }, selector: { gap: 4, padding: 4 }, pick: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' }, content: { padding: 16, gap: 16 } });

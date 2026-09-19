"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestScreen = QuestScreen;
const QuestReward_1 = require("../components/QuestReward");
const UiIcon_1 = require("../components/UiIcon");
const ActionFeedback_1 = require("../components/ActionFeedback");
const visual_feedback_1 = require("../core/visual-feedback");
const SearchField_1 = require("../components/SearchField");
const react_1 = require("react");
const react_native_1 = require("react-native");
const quests_1 = require("../content/quests");
const quest_journal_1 = require("../core/quest-journal");
const Panel_1 = require("../components/Panel");
const GameButton_1 = require("../components/GameButton");
const StatBar_1 = require("../components/StatBar");
const theme_1 = require("../theme/theme");
const seasonal_quests_1 = require("../core/seasonal-quests");
function QuestScreen({ state, onClaim, onClaimContract, onNavigate }) {
    const [filter, setFilter] = (0, react_1.useState)('current'), [query, setQuery] = (0, react_1.useState)('');
    const [notice, setNotice] = (0, react_1.useState)(''), [error, setError] = (0, react_1.useState)('');
    const [showContracts, setShowContracts] = (0, react_1.useState)(false);
    const confirmed = (0, react_1.useRef)({ characterId: state.character?.id, quests: state.quests.filter(q => q.status === 'claimed').map(q => q.questId), contracts: state.account.seasonalContractClaimIds ?? [] });
    (0, react_1.useEffect)(() => {
        const next = { characterId: state.character?.id, quests: state.quests.filter(q => q.status === 'claimed').map(q => q.questId), contracts: state.account.seasonalContractClaimIds ?? [] };
        const previous = confirmed.current;
        confirmed.current = next;
        if (previous.characterId !== next.characterId) {
            setNotice('');
            setError('');
            return;
        }
        const chapters = (0, visual_feedback_1.newlyConfirmedIds)(previous.quests, next.quests), contracts = (0, visual_feedback_1.newlyConfirmedIds)(previous.contracts, next.contracts);
        if (chapters.length) {
            setNotice(chapters.map(id => 'Rewards received: ' + (quests_1.QUESTS.find(q => q.id === id)?.name ?? 'chapter') + '.').join(' '));
            setError('');
        }
        else if (contracts.length) {
            setNotice('Contract rewards received.');
            setError('');
        }
    }, [state.quests, state.account.seasonalContractClaimIds, state.character?.id]);
    const entries = (0, quest_journal_1.journalEntries)(state, filter, query);
    const daily = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'daily'), weekly = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'weekly'), monthly = (0, seasonal_quests_1.seasonalQuestBoard)(state, 'monthly');
    const claimed = quests_1.QUESTS.filter(def => state.quests.some(q => q.questId === def.id && q.status === 'claimed')).length;
    const ready = state.quests.filter(q => q.status === 'complete').length;
    function claim(id) {
        try {
            setNotice('');
            setError('');
            onClaim(id);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to claim this quest.');
            setNotice('');
        }
    }
    return <react_native_1.ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
    <react_native_1.View style={s.journalHeading}><UiIcon_1.UiIcon name="quests" size={40}/><react_native_1.Text accessibilityRole="header" style={[s.h, s.flex]}>Asterfall Journal</react_native_1.Text></react_native_1.View>
    <Panel_1.Panel><react_native_1.Text style={s.title}>{claimed === quests_1.QUESTS.length ? 'Asterfall campaign complete' : 'Your Asterfall journey'}</react_native_1.Text><StatBar_1.StatBar reduceMotion={state.settings.reduceMotion} label="Chapters claimed" current={claimed} max={quests_1.QUESTS.length}/><react_native_1.Text style={s.sub}>{claimed === quests_1.QUESTS.length ? 'Every chapter reward has been claimed. You can revisit hunts, crafting, and equipment upgrades.' : `${ready} reward${ready === 1 ? '' : 's'} ready to claim. Claim each chapter to unlock the next.`}</react_native_1.Text></Panel_1.Panel>
    <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{['current', 'all', 'claimed', 'locked'].map(value => <GameButton_1.GameButton key={value} title={value === 'current' ? 'Current' : value === 'all' ? 'All' : value === 'claimed' ? 'Completed' : 'Locked'} selected={filter === value} tone={filter === value ? 'primary' : 'secondary'} onPress={() => setFilter(value)}/>)}</react_native_1.ScrollView>
    <SearchField_1.SearchField accessibilityLabel="Search quests" placeholder="Search quest names or objectives…" placeholderTextColor={theme_1.C.muted} value={query} onChangeText={setQuery}/>
    <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded: showContracts }} onPress={() => setShowContracts(value => !value)} style={s.disclosure}><react_native_1.View style={s.flex}><react_native_1.Text style={s.chapter}>ROTATING CONTRACTS</react_native_1.Text><react_native_1.Text style={s.title}>{daily.length + weekly.length + monthly.length} daily, weekly & monthly objectives</react_native_1.Text></react_native_1.View><react_native_1.Text style={s.disclosureMark}>{showContracts ? '−' : '+'}</react_native_1.Text></react_native_1.Pressable>
    {showContracts && <Panel_1.Panel><react_native_1.Text style={s.sub}>Class-aligned contracts award progressively stronger rarity caches.</react_native_1.Text><ContractRows state={state} label={`DAILY · ${daily[0]?.className ?? ''}`} quests={daily} onClaim={onClaimContract}/><ContractRows state={state} label="WEEKLY" quests={weekly} onClaim={onClaimContract}/><ContractRows state={state} label="MONTHLY" quests={monthly} onClaim={onClaimContract}/></Panel_1.Panel>}
    {!!notice && <ActionFeedback_1.ActionFeedback message={notice} reduceMotion={state.settings.reduceMotion}/>}{!!error && <ActionFeedback_1.ActionFeedback message={error} tone="error" reduceMotion={state.settings.reduceMotion}/>}
    {entries.length === 0 && <Panel_1.Panel><react_native_1.Text style={s.title}>No matching chapters</react_native_1.Text><react_native_1.Text style={s.sub}>{filter === 'current' && claimed === quests_1.QUESTS.length ? 'You have completed this journal. View Completed to revisit it.' : 'Try another search or view all chapters.'}</react_native_1.Text><GameButton_1.GameButton title="Show all chapters" onPress={() => { setQuery(''); setFilter('all'); }}/></Panel_1.Panel>}
    {entries.map(({ def, quest, chapter, remaining, previous }) => {
            const destination = (0, quest_journal_1.questDestination)(def);
            return <Panel_1.Panel key={def.id} accentColor={quest.status === 'complete' ? theme_1.C.good : undefined} accentSurface={quest.status === 'complete' ? '#14272A' : undefined}>
        <react_native_1.Text style={s.chapter}>CHAPTER {chapter} · {quest.status === 'complete' ? 'REWARD READY' : quest.status === 'claimed' ? 'CLAIMED' : quest.status.toUpperCase()}</react_native_1.Text>
        <react_native_1.Text style={s.title}>{def.name}</react_native_1.Text><react_native_1.Text style={s.sub}>{def.description}</react_native_1.Text>
        {quest.status === 'locked' ? <react_native_1.Text style={s.hint}>Claim “{previous ?? 'the previous chapter'}” to unlock this objective. Progress is not tracked while locked.</react_native_1.Text> : <><StatBar_1.StatBar reduceMotion={state.settings.reduceMotion} label="Objective progress" current={Math.min(def.required, quest.progress)} max={def.required}/><react_native_1.Text style={s.hint}>{quest.status === 'claimed' ? 'Reward already collected' : quest.status === 'complete' ? 'Objective complete — claim your reward' : `${remaining} remaining`}</react_native_1.Text></>}
        <QuestReward_1.QuestReward gold={def.rewardGold} itemId={def.rewardItemId} quantity={def.rewardItemQty ?? 1} label={quest.status === 'claimed' ? 'Rewards collected' : 'Chapter rewards'}/>
        {quest.status === 'active' && <><react_native_1.Text style={s.sub}>{destination.hint}</react_native_1.Text><GameButton_1.GameButton title={destination.label} tone="secondary" onPress={() => onNavigate(destination)}/></>}
        {quest.status === 'complete' && <GameButton_1.GameButton title="Claim chapter rewards" onPress={() => claim(def.id)}/>}
      </Panel_1.Panel>;
        })}
  </react_native_1.ScrollView>;
}
function ContractRows({ state, label, quests, onClaim }) { return <><react_native_1.Text style={s.seasonLabel}>{label}</react_native_1.Text>{quests.map(quest => { const rarity = seasonal_quests_1.QUEST_RARITIES[quest.rarity], claimed = (state.account.seasonalContractClaimIds ?? []).includes(quest.id), ready = quest.progress >= quest.required; return <react_native_1.View key={quest.id} style={s.seasonQuest}><react_native_1.View style={s.contractHead}><react_native_1.Text style={s.seasonName}>{quest.name}</react_native_1.Text><react_native_1.View style={[s.rarity, { borderColor: rarity.color }]}><react_native_1.Text style={[s.rarityText, { color: rarity.color }]}>{rarity.label.toUpperCase()}</react_native_1.Text></react_native_1.View></react_native_1.View><react_native_1.Text style={s.sub}>{quest.description}</react_native_1.Text><StatBar_1.StatBar reduceMotion={state.settings.reduceMotion} label={`${quest.progress}/${quest.required} progress · ${quest.tag.toUpperCase()}`} current={quest.progress} max={quest.required}/><QuestReward_1.QuestReward gold={quest.rewardGold} xp={quest.rewardXp} itemId={quest.rewardItemId} quantity={quest.rewardItemQty} label={rarity.cache}/>{claimed ? <react_native_1.Text style={s.claimed}>✓ Cache claimed</react_native_1.Text> : ready ? <GameButton_1.GameButton title={`Claim ${rarity.label} cache`} onPress={() => onClaim(quest.period, quest.id)}/> : <react_native_1.Text style={s.contractHint}>{quest.required - quest.progress} progress remaining</react_native_1.Text>}</react_native_1.View>; })}</>; }
const s = react_native_1.StyleSheet.create({ root: { padding: theme_1.spacing.lg, gap: theme_1.spacing.md }, journalHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, h: { ...theme_1.typography.hero, color: theme_1.C.text }, title: { ...theme_1.typography.title, color: theme_1.C.text }, sub: { ...theme_1.typography.body, color: theme_1.C.muted }, chapter: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900' }, hint: { ...theme_1.typography.body, color: theme_1.C.info }, reward: { ...theme_1.typography.bodyStrong, color: theme_1.C.accent }, notice: { ...theme_1.typography.bodyStrong, color: theme_1.C.good }, error: { ...theme_1.typography.body, color: theme_1.C.bad }, disclosure: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: theme_1.spacing.sm, padding: theme_1.spacing.md, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 10, backgroundColor: theme_1.C.panel }, disclosureMark: { width: 28, color: theme_1.C.accent, fontSize: 25, textAlign: 'center' }, flex: { flex: 1, minWidth: 0 }, seasonLabel: { ...theme_1.typography.caption, color: theme_1.C.accent, fontWeight: '900', letterSpacing: 1, marginTop: theme_1.spacing.sm }, seasonQuest: { gap: theme_1.spacing.xs, borderTopWidth: 1, borderColor: theme_1.C.line, paddingTop: theme_1.spacing.sm }, contractHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme_1.spacing.sm }, seasonName: { ...theme_1.typography.bodyStrong, color: theme_1.C.text, flexGrow: 1, flexBasis: 180 }, rarity: { borderWidth: 1, borderRadius: 99, paddingHorizontal: theme_1.spacing.sm, paddingVertical: 2 }, rarityText: { fontSize: 10, fontWeight: '900' }, cache: { ...theme_1.typography.caption, fontWeight: '800' }, claimed: { ...theme_1.typography.caption, color: theme_1.C.good, fontWeight: '900' }, contractHint: { ...theme_1.typography.caption, color: theme_1.C.muted }, row: { flexDirection: 'row', gap: theme_1.spacing.sm }, input: { minHeight: 48, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: 10, paddingHorizontal: theme_1.spacing.md, color: theme_1.C.text, backgroundColor: theme_1.C.panel, fontSize: 16 } });

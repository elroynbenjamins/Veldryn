"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialScreen = SocialScreen;
const react_1 = require("react");
const react_native_1 = require("react-native");
const PartyHubPanel_1 = require("../components/PartyHubPanel");
const SocialHubPanel_1 = require("../components/SocialHubPanel");
const GuildSeekerPanel_1 = require("../components/GuildSeekerPanel");
const RecruitmentComposer_1 = require("../components/RecruitmentComposer");
const RecruitmentFiltersPanel_1 = require("../components/RecruitmentFiltersPanel");
const OnlinePartyChat_1 = require("../components/OnlinePartyChat");
const GameButton_1 = require("../components/GameButton");
const Panel_1 = require("../components/Panel");
const PartySocialProvider_1 = require("../online/PartySocialProvider");
const party_social_1 = require("../online/party-social");
const social_1 = require("../online/social");
const party_social_2 = require("../core/party-social");
const theme_1 = require("../theme/theme");
function SocialScreen({ onGuild, onFriends, onAccount }) {
    const social = (0, PartySocialProvider_1.usePartySocial)();
    const [tab, setTab] = (0, react_1.useState)('party');
    const [filters, setFilters] = (0, react_1.useState)({ ...party_social_2.EMPTY_RECRUITMENT_FILTERS });
    const [cards, setCards] = (0, react_1.useState)([]), [own, setOwn] = (0, react_1.useState)([]), [rankings, setRankings] = (0, react_1.useState)([]);
    const [draft, setDraft] = (0, react_1.useState)(null), [selected, setSelected] = (0, react_1.useState)(null), [busy, setBusy] = (0, react_1.useState)(false), [error, setError] = (0, react_1.useState)('');
    const [focus, setFocus] = (0, react_1.useState)('mixed'), [role, setRole] = (0, react_1.useState)('damage'), [help, setHelp] = (0, react_1.useState)(false), [now, setNow] = (0, react_1.useState)(Date.now());
    const requestGeneration = (0, react_1.useRef)(0);
    const command = (0, react_1.useRef)(null);
    const key = (signature) => { if (command.current?.signature !== signature)
        command.current = { signature, key: (0, party_social_1.partyCommandKey)() }; return command.current.key; };
    const load = (0, react_1.useCallback)(async () => {
        const generation = ++requestGeneration.current;
        if (!social.accountId) {
            setCards([]);
            setOwn([]);
            setRankings([]);
            return;
        }
        try {
            const browse = tab === 'guild' ? { ...filters, postTypes: ['looking_for_guild'] } : filters;
            const [next, mine, board] = await Promise.all([party_social_1.partySocialRepository.browseRecruitment(browse), (0, party_social_1.ownRecruitmentPosts)(), (0, party_social_1.partyRankings)()]);
            if (generation === requestGeneration.current) {
                setCards(next);
                setOwn(mine);
                setRankings(board);
                setError('');
            }
        }
        catch (e) {
            if (generation === requestGeneration.current) {
                setCards([]);
                setError(e instanceof Error ? e.message : 'Social service unavailable.');
            }
        }
    }, [filters, tab, social.accountId]);
    (0, react_1.useEffect)(() => { const timer = setTimeout(() => void load(), 250); return () => { clearTimeout(timer); requestGeneration.current++; }; }, [load, social.party?.id]);
    (0, react_1.useEffect)(() => { const timer = setInterval(() => { setNow(Date.now()); void load(); }, 30000); return () => clearInterval(timer); }, [load]);
    const run = async (action) => { if (busy)
        return; setBusy(true); setError(''); try {
        await action();
        command.current = null;
        await social.refresh();
        await load();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
        await social.refresh();
    }
    finally {
        setBusy(false);
    } };
    const character = () => { if (!social.characterId)
        throw new Error('Sync your character in Account settings first.'); return social.characterId; };
    const post = (postType) => void run(async () => { const guild = postType === 'guild_recruiting' ? await (0, social_1.myGuild)() : null; setDraft({ postType, title: '', body: '', focus, roles: [role], ownerCharacterId: character(), durationDays: postType.includes('guild') ? 3 : 1, ...(postType === 'party_recruiting' ? { partyId: social.party?.id, openSpots: Math.max(0, 4 - (social.party?.members.length ?? 0)) } : {}), ...(guild ? { guildId: guild.guild_id } : {}) }); });
    // Local countdown advances between snapshots; expiry is also enforced by the database query.
    const clock = (0, react_1.useRef)({ server: now, local: now });
    (0, react_1.useEffect)(() => { if (social.serverTime)
        clock.current = { server: Date.parse(social.serverTime), local: Date.now() }; }, [social.serverTime]);
    const at = clock.current.server + (now - clock.current.local);
    return <SocialHubPanel_1.SocialHubPanel active={tab} onChange={next => { setTab(next); setSelected(null); setDraft(null); }}><react_native_1.ScrollView contentContainerStyle={s.content}>
  <react_native_1.View style={s.row}><GameButton_1.GameButton title="Friends" tone="secondary" onPress={onFriends}/><GameButton_1.GameButton title="Social help" tone="secondary" onPress={() => setHelp(!help)}/><GameButton_1.GameButton title={busy ? 'Working…' : 'Refresh'} tone="secondary" disabled={busy} onPress={() => void run(async () => { })}/></react_native_1.View>
  {help && <Panel_1.Panel>{party_social_2.PARTY_SOCIAL_TUTORIAL_STEPS.map(step => <react_native_1.Text key={step} style={s.text}>{step}</react_native_1.Text>)}</Panel_1.Panel>}
  {!!(error || social.error) && <react_native_1.Text accessibilityRole="alert" style={s.error}>{error || social.error}</react_native_1.Text>}
  {!social.accountId ? <Panel_1.Panel><react_native_1.Text style={s.text}>{social.loading ? 'Loading account…' : 'Sign in and sync a character to use Parties and Recruitment.'}</react_native_1.Text><GameButton_1.GameButton title="Account settings" onPress={onAccount}/></Panel_1.Panel> : <>
   <react_native_1.View style={s.row}>{['damage', 'tank', 'support'].map(value => <GameButton_1.GameButton key={value} title={`${role === value ? '✓ ' : ''}${value}`} tone="secondary" onPress={() => setRole(value)}/>)}</react_native_1.View>
   {!social.party && <react_native_1.View style={s.row}>{['combat', 'skilling', 'mixed'].map(value => <GameButton_1.GameButton key={value} title={`${focus === value ? '✓ ' : ''}${value}`} tone="secondary" onPress={() => setFocus(value)}/>)}</react_native_1.View>}
   {draft && <RecruitmentComposer_1.RecruitmentComposer key={draft.postType} initial={draft} busy={busy} onCancel={() => setDraft(null)} onPublish={input => void run(async () => { await party_social_1.partySocialRepository.publishRecruitment(input); setDraft(null); })}/>}
   {selected && <Panel_1.Panel><react_native_1.Text style={s.title}>{selected.title}</react_native_1.Text><react_native_1.Text style={s.text}>{selected.body}</react_native_1.Text><react_native_1.Text style={s.text}>{(0, party_social_2.recruitmentTimeLabel)(selected.expiresAtMs, at).text}</react_native_1.Text>
    {selected.partyId && !social.party && <GameButton_1.GameButton title="Join Party" disabled={busy || selected.expiresAtMs <= at} onPress={() => void run(async () => { await party_social_1.partySocialRepository.joinParty({ partyId: selected.partyId, characterId: character(), role, idempotencyKey: key(`join:${selected.partyId}`) }); setSelected(null); })}/>}
    {selected.guildId && <GameButton_1.GameButton title="Join / apply to Guild" disabled={busy} onPress={() => void run(async () => { const result = await (0, social_1.requestGuildMembership)(selected.guildId); react_native_1.Alert.alert('Guild', result); })}/>}
    {selected.ownerAccountId && selected.ownerAccountId !== social.accountId && <GameButton_1.GameButton title="Send friend request" disabled={busy} onPress={() => void run(() => (0, social_1.sendFriendRequest)(selected.ownerAccountId))}/>}
    <GameButton_1.GameButton title="Close details" tone="secondary" onPress={() => setSelected(null)}/></Panel_1.Panel>}
   {tab === 'party' && <PartyHubPanel_1.PartyHubPanel accountId={social.accountId} party={social.party} contracts={social.contracts} recruitment={cards} nowMs={at} filters={filters} onFiltersChange={setFilters} onCreateParty={busy ? undefined : () => void run(() => party_social_1.partySocialRepository.createParty({ characterId: character(), role, focus, idempotencyKey: key(`create:${focus}:${role}`) }))} onLeaveParty={busy ? undefined : () => void run(async () => { await party_social_1.partySocialRepository.leaveParty({ partyId: social.party.id, idempotencyKey: key(`leave:${social.party.id}`) }); await social.refresh(); })} onOpenPartyChat={() => setTab('chat')} onOpenRecruitmentPost={id => setSelected(cards.find(card => card.id === id) ?? null)} onCreateRecruitmentPost={post} onClaimReward={busy ? undefined : id => void run(() => (0, party_social_1.claimPartyContractReward)(id, character()))}/>}
   {tab === 'guild' && <><GameButton_1.GameButton title="Open Guild directory and management" onPress={onGuild}/><GameButton_1.GameButton title="Post Guild recruiting advert" tone="secondary" disabled={busy} onPress={() => post('guild_recruiting')}/><RecruitmentFiltersPanel_1.RecruitmentFiltersPanel value={filters} onChange={setFilters}/><GuildSeekerPanel_1.GuildSeekerPanel seekers={cards} nowMs={at} onOpen={id => setSelected(cards.find(card => card.id === id) ?? null)} onPostMyAd={() => post('looking_for_guild')}/></>}
   {tab === 'chat' && (social.party ? <OnlinePartyChat_1.OnlinePartyChat /> : <react_native_1.Text style={s.text}>Join a Party to use Party Chat. World and Guild chat remain available in the chat overlay.</react_native_1.Text>)}
   {tab === 'rankings' && <Panel_1.Panel><react_native_1.Text style={s.title}>Ranked Party events</react_native_1.Text><react_native_1.Text style={s.text}>Normalized points, then completion time. Ties use a stable Party ID order.</react_native_1.Text>{rankings.map(row => <react_native_1.Text style={s.text} key={`${row.event_key}:${row.party_id}`}>#{row.rank} · {row.name} · {row.party_id.slice(0, 8)} · {row.normalized_points} pts</react_native_1.Text>)}{!rankings.length && <react_native_1.Text style={s.text}>No ranked contributions yet.</react_native_1.Text>}</Panel_1.Panel>}
   {(tab === 'party' || tab === 'guild') && <Panel_1.Panel><react_native_1.Text style={s.title}>Your adverts</react_native_1.Text>{own.map(item => <react_native_1.View style={s.ad} key={item.id}><react_native_1.Text style={s.text}>{item.title} · {item.status === 'closed' ? 'Closed' : (0, party_social_2.recruitmentTimeLabel)(item.expiresAtMs, at).text}</react_native_1.Text>{item.status !== 'closed' && <react_native_1.View style={s.row}><GameButton_1.GameButton title="Refresh" tone="secondary" disabled={busy} onPress={() => void run(() => party_social_1.partySocialRepository.refreshRecruitment(item.id))}/><GameButton_1.GameButton title="Close advert" tone="secondary" disabled={busy} onPress={() => void run(() => party_social_1.partySocialRepository.closeRecruitment(item.id))}/></react_native_1.View>}</react_native_1.View>)}{!own.length && <react_native_1.Text style={s.text}>No adverts published yet.</react_native_1.Text>}</Panel_1.Panel>}
  </>}
 </react_native_1.ScrollView></SocialHubPanel_1.SocialHubPanel>;
}
const s = react_native_1.StyleSheet.create({ content: { padding: theme_1.spacing.md, gap: theme_1.spacing.md, paddingBottom: 32 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme_1.spacing.sm }, title: { color: theme_1.C.accent, fontSize: 18, fontWeight: '800' }, text: { color: theme_1.C.text, lineHeight: 21 }, error: { color: theme_1.C.bad }, ad: { gap: theme_1.spacing.sm, paddingVertical: theme_1.spacing.sm } });

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyHubPanel = PartyHubPanel;
const SocialIdentity_1 = require("./SocialIdentity");
const RecruitmentListing_1 = require("./RecruitmentListing");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const party_social_1 = require("../core/party-social");
const RecruitmentFiltersPanel_1 = require("./RecruitmentFiltersPanel");
function PartyHubPanel(props) {
    const [localFilters, setLocalFilters] = react_1.default.useState(party_social_1.EMPTY_RECRUITMENT_FILTERS);
    const filters = props.filters ?? localFilters;
    const setFilters = (next) => { const result = typeof next === 'function' ? next(filters) : next; setLocalFilters(result); props.onFiltersChange?.(result); };
    const cards = react_1.default.useMemo(() => (0, party_social_1.filterRecruitmentCards)(props.recruitment, filters, props.nowMs), [props.recruitment, filters, props.nowMs]);
    return <react_native_1.View style={styles.content}>
    <react_native_1.View style={styles.heroPanel}>
      <react_native_1.Text style={styles.eyebrow}>PARTY</react_native_1.Text>
      <react_native_1.Text style={styles.title}>{props.party ? `Party • ${props.party.members.length}/4` : 'Adventure Together'}</react_native_1.Text>
      <react_native_1.Text style={styles.muted}>{props.party ? `${(0, party_social_1.partyOpenSpots)(props.party)} open spot${(0, party_social_1.partyOpenSpots)(props.party) === 1 ? '' : 's'} • ${props.party.focus}` : 'Create a persistent Party or find people without needing the same quest.'}</react_native_1.Text>
      <react_native_1.View style={styles.rowWrap}>
        {!props.party && <PixelButton label="Create Party" onPress={props.onCreateParty}/>}
        {props.party && <PixelButton label="Party Chat" onPress={props.onOpenPartyChat}/>}
        {props.party && <PixelButton label="Leave" secondary onPress={props.onLeaveParty}/>}
        <PixelButton label={props.party ? 'Find Members' : 'Find Party'} secondary onPress={() => props.onCreateRecruitmentPost?.(props.party ? 'party_recruiting' : 'looking_for_party')}/>
      </react_native_1.View>
    </react_native_1.View>

    {props.party && <react_native_1.View style={styles.panel}>
      <react_native_1.Text style={styles.sectionTitle}>PARTY MEMBERS</react_native_1.Text>
      {props.party.members.map(member => <react_native_1.View key={member.accountId} style={styles.memberRow}>
        <SocialIdentity_1.IdentityArtwork name={member.characterName} className={member.className}/>
        <react_native_1.View style={styles.grow}><react_native_1.Text style={styles.bodyStrong}>{member.characterName}</react_native_1.Text><react_native_1.Text style={styles.muted}>{member.className}{member.isLeader ? ' · Leader' : ''}</react_native_1.Text><SocialIdentity_1.RoleBadge role={member.role}/></react_native_1.View>
      </react_native_1.View>)}
    </react_native_1.View>}

    {props.party && <react_native_1.View style={styles.panel}>
      <react_native_1.Text style={styles.sectionTitle}>PARTY CONTRACTS</react_native_1.Text>
      <react_native_1.Text style={styles.muted}>Shared weekly progress. Personal minimums prevent zero-contribution rewards.</react_native_1.Text>
      {props.contracts.map(contract => <react_native_1.View key={contract.id}><ContractCard contract={contract} nowMs={props.nowMs}/>{contract.rewards?.map(reward => <PixelButton key={reward.id} label={reward.claimed ? 'Reward claimed' : `Claim ${reward.reward.gold} Gold`} onPress={!reward.claimed && props.onClaimReward ? () => props.onClaimReward(reward.id) : undefined}/>)}</react_native_1.View>)}
      {!props.contracts.length && <react_native_1.Text style={styles.empty}>No active Contract right now.</react_native_1.Text>}
    </react_native_1.View>}

    <react_native_1.View style={styles.panel}>
      <react_native_1.Text style={styles.sectionTitle}>FIND PLAYERS</react_native_1.Text>
      <RecruitmentFiltersPanel_1.RecruitmentFiltersPanel value={filters} onChange={setFilters}/>
      <react_native_1.View style={styles.quickActions}>
        <PixelButton label="Post LFG" secondary onPress={() => props.onCreateRecruitmentPost?.('looking_for_party')}/>
        {props.party && <PixelButton label="Post LFM" secondary onPress={() => props.onCreateRecruitmentPost?.('party_recruiting')}/>}
      </react_native_1.View>
      {cards.map(card => <RecruitmentListing_1.RecruitmentListing key={card.id} card={card} nowMs={props.nowMs} onPress={() => props.onOpenRecruitmentPost?.(card.id)}/>)}
      {!cards.length && <react_native_1.Text style={styles.empty}>No fresh posts match these filters.</react_native_1.Text>}
    </react_native_1.View>
  </react_native_1.View>;
}
function ContractCard({ contract, nowMs }) {
    const ratio = (0, party_social_1.contractProgressRatio)(contract);
    const eligible = (0, party_social_1.personalContributionEligible)(contract);
    const hours = Math.max(0, Math.ceil((contract.endsAtMs - nowMs) / 3_600_000));
    return <react_native_1.View style={styles.contractCard}>
    <react_native_1.View style={styles.between}><react_native_1.Text style={styles.bodyStrong}>{contract.name}</react_native_1.Text><react_native_1.Text style={styles.badge}>{contract.category.toUpperCase()}</react_native_1.Text></react_native_1.View>
    <react_native_1.Text style={styles.muted}>{contract.cadence === 'weekly' ? 'Weekly Contract' : 'Ranked Mini-Event'} • {hours}h left</react_native_1.Text>
    <react_native_1.View style={styles.progressTrack}><react_native_1.View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]}/></react_native_1.View>
    <react_native_1.Text style={styles.small}>{contract.totalPoints} / {contract.targetPoints} normalized pts</react_native_1.Text>
    <react_native_1.Text style={eligible ? styles.good : styles.warning}>Your contribution: {contract.personalPoints} / {contract.minimumPersonalPoints} minimum {eligible ? '✓' : ''}</react_native_1.Text>
    {contract.objectives.map(objective => <react_native_1.Text key={objective.id} style={styles.objective}>• {objective.label}: {objective.progressUnits}/{objective.targetUnits}</react_native_1.Text>)}
  </react_native_1.View>;
}
function PixelButton({ label, secondary, onPress }) {
    return <GameButton_1.GameButton title={label} tone={secondary ? 'secondary' : 'primary'} disabled={!onPress} onPress={onPress ?? (() => { })}/>;
}
const styles = react_native_1.StyleSheet.create({
    root: { flex: 1, backgroundColor: theme_1.C.bg }, content: { padding: 12, gap: 12, paddingBottom: 28 },
    heroPanel: { borderRadius: theme_1.radii.lg, borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.C.panel, padding: 14, gap: 8 },
    panel: { borderRadius: theme_1.radii.md, borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.C.panel, padding: 12, gap: 9 },
    eyebrow: { color: theme_1.equipmentColors.selectedLine, fontSize: 11, fontWeight: '800', letterSpacing: 2 }, title: { ...theme_1.typography.hero, color: theme_1.equipmentColors.goldSoft },
    sectionTitle: { ...theme_1.typography.title, color: theme_1.equipmentColors.goldSoft }, bodyStrong: { color: theme_1.C.text, fontWeight: '800', fontSize: 14 },
    body: { color: theme_1.C.text, fontSize: 13, lineHeight: 18 }, muted: { color: theme_1.C.muted, fontSize: 12, lineHeight: 17 }, small: { color: theme_1.C.muted, fontSize: 11 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, grow: { flex: 1, minWidth: 0 },
    button: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 2, borderColor: theme_1.equipmentColors.lineStrong, backgroundColor: theme_1.equipmentColors.selected },
    buttonSecondary: { backgroundColor: theme_1.C.panel2, borderColor: theme_1.C.line }, buttonText: { color: theme_1.C.text, fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
    pressed: { opacity: 0.76 }, disabled: { opacity: 0.4 },
    memberRow: { paddingVertical: 10, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: theme_1.C.line },
    avatar: { width: 38, height: 38, borderWidth: 2, borderColor: theme_1.C.line, backgroundColor: theme_1.C.panel2, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: theme_1.equipmentColors.goldSoft, fontWeight: '900' },
    contractCard: { borderRadius: theme_1.radii.md, borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.equipmentColors.panel, padding: 10, gap: 6 }, badge: { color: theme_1.equipmentColors.selectedLine, fontWeight: '900', fontSize: 10 },
    progressTrack: { height: 10, borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.C.bg }, progressFill: { height: '100%', backgroundColor: theme_1.equipmentColors.selectedLine },
    good: { color: theme_1.C.good, fontSize: 11, fontWeight: '700' }, warning: { color: theme_1.C.warning, fontSize: 11, fontWeight: '700' }, objective: { color: theme_1.C.text, fontSize: 11 },
    search: { minHeight: 46, color: theme_1.C.text, backgroundColor: theme_1.C.bg, borderWidth: 1, borderColor: theme_1.C.line, paddingHorizontal: 12 },
    chip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.C.panel, paddingHorizontal: 11 }, chipSelected: { borderColor: theme_1.equipmentColors.selectedLine, backgroundColor: theme_1.equipmentColors.selected },
    chipText: { color: theme_1.C.muted, fontWeight: '700', textTransform: 'capitalize' }, chipTextSelected: { color: theme_1.C.text, fontWeight: '900', textTransform: 'capitalize' },
    quickActions: { flexDirection: 'row', gap: 8 }, recruitCard: { borderWidth: 1, borderColor: theme_1.C.line, backgroundColor: theme_1.C.panel, padding: 10, gap: 6 },
    time: { color: theme_1.C.muted, fontSize: 11, fontWeight: '700' }, timeSoon: { color: theme_1.C.warning, fontSize: 11, fontWeight: '900' }, context: { color: theme_1.C.info, fontSize: 11 },
    tag: { color: theme_1.C.text, backgroundColor: theme_1.C.panel2, borderWidth: 1, borderColor: theme_1.C.line, paddingHorizontal: 6, paddingVertical: 3, fontSize: 10 },
    empty: { color: theme_1.C.muted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});

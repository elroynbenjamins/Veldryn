"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestReward = QuestReward;
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const theme_1 = require("../theme/theme");
const ItemArtwork_1 = require("./ItemArtwork");
/** Reward preview only; claiming remains the screen's explicit action. */
function QuestReward({ gold, xp, itemId, quantity = 1, label = 'Rewards' }) {
    return <react_native_1.View style={s.root}>
    <react_native_1.Text style={s.label}>{label}</react_native_1.Text>
    <react_native_1.View style={s.currencies}><react_native_1.Text style={s.gold}>{gold} gold</react_native_1.Text>{xp !== undefined && <react_native_1.Text style={s.xp}>{xp} XP</react_native_1.Text>}</react_native_1.View>
    {itemId && <react_native_1.View style={s.item}><react_native_1.View accessible={false} importantForAccessibility="no-hide-descendants"><ItemArtwork_1.ItemArtwork itemId={itemId} size={40}/></react_native_1.View><react_native_1.Text style={s.name}>{quantity}× {(0, items_1.itemDef)(itemId).name}</react_native_1.Text></react_native_1.View>}
  </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ root: { gap: 8, padding: 12, borderRadius: theme_1.radii.md, backgroundColor: '#101B27', borderWidth: react_native_1.StyleSheet.hairlineWidth, borderColor: theme_1.C.line }, label: { ...theme_1.typography.caption, color: theme_1.C.muted }, currencies: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 }, gold: { ...theme_1.typography.bodyStrong, color: theme_1.C.accent }, xp: { ...theme_1.typography.bodyStrong, color: theme_1.C.info }, item: { flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { ...theme_1.typography.body, color: theme_1.C.text, flex: 1, minWidth: 0 } });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecipeCard = RecipeCard;
const react_1 = require("react");
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const number_format_1 = require("../core/number-format");
const theme_1 = require("../theme/theme");
const ItemArtwork_1 = require("./ItemArtwork");
const IngredientList_1 = require("./IngredientList");
const GameButton_1 = require("./GameButton");
const UiIcon_1 = require("./UiIcon");
function RecipeCard({ state, recipe, status, onCraft }) {
    const [expanded, setExpanded] = (0, react_1.useState)(false), output = (0, items_1.itemDef)(recipe.output.itemId);
    const f = (value) => (0, number_format_1.formatGameNumber)(value, state.settings.numberMode);
    const readyInputs = status.inputs.filter(i => i.inventory + i.bank >= i.quantity).length;
    return <react_native_1.View style={s.card}>
  <react_native_1.Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={recipe.name + (status.ready ? ', ready to craft' : ', requirements missing')} onPress={() => setExpanded(v => !v)} style={s.head}>
   <ItemArtwork_1.ItemArtwork itemId={output.id} size={48}/><react_native_1.View style={s.copy}><react_native_1.Text style={s.title}>{output.name}</react_native_1.Text><react_native_1.Text style={s.sub}>Makes {f(recipe.output.quantity)} · {recipe.skillId} Lv. {recipe.level}</react_native_1.Text><react_native_1.Text style={status.ready ? s.ready : s.sub}>{status.ready ? 'Ready to craft' : `${readyInputs}/${status.inputs.length} materials ready`}</react_native_1.Text></react_native_1.View><UiIcon_1.UiIcon name={expanded ? 'close' : 'next'} size={24}/>
  </react_native_1.Pressable>
  {expanded && <react_native_1.View style={s.details}><react_native_1.Text style={s.sub}>{f(recipe.gold)} gold · +{f(recipe.xp)} skill XP</react_native_1.Text>{output.type === 'food' && <react_native_1.Text style={s.ready}>Restores {f(output.heal ?? 0)} HP</react_native_1.Text>}{output.type === 'gear' && <react_native_1.Text style={s.sub}>ATK {output.attack ?? 0} · DEF {output.defense ?? 0} · HP {output.hp ?? 0}</react_native_1.Text>}{output.type === 'tool' && <react_native_1.Text style={s.sub}>Tier {output.toolTier} · {Math.round((1 - (output.actionTimeMultiplier ?? 1)) * 100)}% shorter action time</react_native_1.Text>}
   <IngredientList_1.IngredientList inputs={status.inputs} numberMode={state.settings.numberMode} showStorage/>
   <react_native_1.Text style={status.ready ? s.ready : s.reason}>{status.reason}</react_native_1.Text><GameButton_1.GameButton title={`Craft ${f(recipe.output.quantity)}× ${output.name}`} disabled={!status.ready} onPress={() => onCraft(recipe.id)}/>
  </react_native_1.View>}
 </react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ card: { backgroundColor: theme_1.C.panel, borderWidth: 1, borderColor: theme_1.C.line, borderRadius: theme_1.radii.md, overflow: 'hidden' }, head: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }, copy: { flex: 1, minWidth: 0, gap: 3 }, title: { ...theme_1.typography.bodyStrong, fontSize: 16, lineHeight: 23, color: theme_1.C.text }, sub: { ...theme_1.typography.caption, color: theme_1.C.muted }, ready: { ...theme_1.typography.caption, color: theme_1.C.good }, reason: { ...theme_1.typography.body, color: theme_1.C.warning }, details: { padding: 16, gap: 10, borderTopWidth: 1, borderColor: theme_1.C.line } });

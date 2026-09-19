"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngredientList = IngredientList;
const react_native_1 = require("react-native");
const items_1 = require("../content/items");
const ItemArtwork_1 = require("./ItemArtwork");
const number_format_1 = require("../core/number-format");
const theme_1 = require("../theme/theme");
function IngredientList({ inputs, numberMode = 'abbreviated', showStorage = false }) {
    return <react_native_1.View style={s.list}>{inputs.map(input => { const owned = input.inventory + input.bank, enough = owned >= input.quantity; return <react_native_1.View key={input.itemId} style={s.ingredient}><ItemArtwork_1.ItemArtwork itemId={input.itemId} size={32}/><react_native_1.View style={s.copy}><react_native_1.Text style={s.name}>{(0, items_1.itemDef)(input.itemId).name}</react_native_1.Text><react_native_1.Text style={[s.count, { color: enough ? theme_1.C.good : theme_1.C.warning }]}>{(0, number_format_1.formatGameNumber)(owned, numberMode)} / {(0, number_format_1.formatGameNumber)(input.quantity, numberMode)}{enough ? ' · Ready' : ' · Missing'}</react_native_1.Text>{showStorage && <react_native_1.Text style={s.storage}>{(0, number_format_1.formatGameNumber)(input.inventory, numberMode)} bag · {(0, number_format_1.formatGameNumber)(input.bank, numberMode)} bank</react_native_1.Text>}</react_native_1.View></react_native_1.View>; })}</react_native_1.View>;
}
const s = react_native_1.StyleSheet.create({ list: { gap: 8 }, ingredient: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }, copy: { flex: 1, minWidth: 0 }, name: { ...theme_1.typography.bodyStrong, color: theme_1.C.text }, count: { ...theme_1.typography.caption }, storage: { ...theme_1.typography.caption, color: theme_1.C.muted } });

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountRosterPanel = AccountRosterPanel;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const account_roster_1 = require("../core/account-roster");
const Panel_1 = require("./Panel");
const GameButton_1 = require("./GameButton");
const theme_1 = require("../theme/theme");
const i18n_1 = require("../i18n");
function AccountRosterPanel({ state, language, onCommand, onCreate }) { const entries = (0, account_roster_1.accountCharacters)(state), slots = (0, account_roster_1.unlockedCharacterSlots)(state); return <Panel_1.Panel><react_native_1.Text style={s.title}>{(0, i18n_1.t)(language, 'roster.title')}</react_native_1.Text><react_native_1.Text style={s.body}>{(0, i18n_1.t)(language, 'roster.skillsSlots')} {(0, account_roster_1.accountSkillLevel)(state)} · slots {entries.length}/{slots}</react_native_1.Text>{entries.map(entry => <react_native_1.View key={entry.character.id} style={s.row}><react_native_1.Text style={s.body}>{entry.character.name} · {entry.character.classId}{entry.character.id === state.character?.id ? ` · ${(0, i18n_1.t)(language, 'roster.active')}` : ''}</react_native_1.Text>{entry.character.id !== state.character?.id && <GameButton_1.GameButton compact title={(0, i18n_1.t)(language, 'roster.switch')} onPress={() => void onCommand({ type: 'roster_switch', args: { id: entry.character.id } })}/>}</react_native_1.View>)}{entries.length < slots && <GameButton_1.GameButton title={(0, i18n_1.t)(language, 'roster.create')} tone="secondary" onPress={onCreate}/>}</Panel_1.Panel>; }
const s = react_native_1.StyleSheet.create({ title: { ...theme_1.typography.title, color: theme_1.C.text }, body: { ...theme_1.typography.body, color: theme_1.C.muted }, row: { gap: 4, paddingVertical: 4 } });

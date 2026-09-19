"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const quest_journal_1 = require("../src/core/quest-journal");
const quests_1 = require("../src/content/quests");
function ok(value, message) { if (!value)
    throw new Error(message); }
const state = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN');
ok((0, quest_journal_1.journalEntries)(state, 'current', '').length === 1, 'One current chapter initially');
ok((0, quest_journal_1.journalEntries)(state, 'locked', '').length === 14, 'Remaining chapters locked');
ok((0, quest_journal_1.journalEntries)(state, 'all', ' MOSS ').length === 1, 'Search descriptions, trim and ignore case');
ok((0, quest_journal_1.journalEntries)(state, 'claimed', '').length === 0, 'Empty completed filter');
ok((0, quest_journal_1.questDestination)(quests_1.QUESTS[0]).zoneId === 'GREENFIELDS', 'Rat quest navigates to region');
ok((0, quest_journal_1.questDestination)(quests_1.QUESTS[3]).tab === 'Inventory', 'Equip quest destination');
ok((0, quest_journal_1.questDestination)(quests_1.QUESTS[6]).tab === 'Skills', 'Gatherable item destination');
ok((0, quest_journal_1.questDestination)(quests_1.QUESTS[13]).zoneId === 'KINGS_ROAD', 'Boss destination');
for (const def of quests_1.QUESTS)
    ok(!!(0, quest_journal_1.questDestination)(def).label && !!(0, quest_journal_1.questDestination)(def).hint, 'Every quest has guidance');
const completed = (0, game_1.refreshQuests)(state, 'MOSS_RAT', 5);
ok((0, quest_journal_1.journalEntries)(completed, 'current', '')[0].remaining === 0, 'Ready quest has no remainder');
const claimed = (0, game_1.claimQuest)(completed, 'QST_001');
ok((0, quest_journal_1.journalEntries)(claimed, 'claimed', '').length === 1, 'Claimed chapter archived');
ok((0, quest_journal_1.journalEntries)(claimed, 'current', '')[0].def.id === 'QST_002', 'Claim advances journal');
ok((0, quest_journal_1.journalEntries)(claimed, 'locked', '')[0].previous === quests_1.QUESTS[1].name, 'Locked prerequisite uses source order');
const finished = { ...state, quests: state.quests.map(q => ({ ...q, status: 'claimed' })) };
ok((0, quest_journal_1.journalEntries)(finished, 'current', '').length === 0, 'Completed campaign has no current quests');
ok((0, quest_journal_1.journalEntries)(finished, 'claimed', '').length === 15, 'All chapters remain browsable');
console.log('PASS: quest filters, search, destinations, claim advancement and finished campaign');

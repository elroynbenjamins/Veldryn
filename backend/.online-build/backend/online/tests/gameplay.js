"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const gameplay_1 = require("../gameplay");
async function main() {
    let state = null, version = 0, commits = 0, clock = 1700000000000, transportFailure = false, generatedIds = 0;
    const receipts = new Map();
    const services = { authenticate: async (token) => token === 'alice-token' ? 'alice' : null, randomId: () => ['11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'][generatedIds++] ?? '44444444-4444-4444-8444-444444444444', randomRoll: () => .25,
        rpc: async (name, args) => {
            if (name === 'read_online_game_receipt_server_v1')
                return (receipts.get(args.p_request_id) ?? null);
            if (name === 'load_online_game_server_v1')
                return { state: structuredClone(state), version, serverNow: clock, characterId: state?.character?.id ?? null, walletGold: state?.character?.gold ?? null, guildMember: false, communityProgress: {} };
            if (name === 'commit_online_game_server_v1') {
                if (args.p_expected_version !== version)
                    throw new gameplay_1.GameplayError('stale_state');
                const response = args.p_response;
                state = response.state;
                version = response.version;
                commits++;
                receipts.set(args.p_request_id, { response, requestHash: args.p_request_hash });
                if (transportFailure) {
                    transportFailure = false;
                    throw new Error('lost response after commit');
                }
                return response;
            }
            throw new Error('unexpected RPC');
        } };
    const handle = (0, gameplay_1.gameplayHandler)(services);
    const request = (command, requestId, expectedVersion, token = 'alice-token') => handle(new Request('https://example.invalid/gameplay', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ command, requestId, expectedVersion }) }));
    strict_1.default.equal((await handle(new Request('https://example.invalid/gameplay'))).status, 401);
    strict_1.default.equal((await request({ type: 'claim' }, 'bad-auth-000', 0, 'forged')).status, 401);
    strict_1.default.equal((await request({ type: 'claim', args: { xp: 100000 } }, 'inject-xp-01', 0)).status, 400);
    strict_1.default.equal((await request({ type: 'create', args: { classId: 'IRONWARDEN', name: 'Alice Hero' } }, 'create-00001', 0)).status, 200);
    strict_1.default.equal((await request({ args: { name: 'Alice Hero', classId: 'IRONWARDEN' }, type: 'create' }, 'create-00001', 0)).status, 200);
    strict_1.default.equal(commits, 1, 'canonical replay');
    state = { ...state, inventory: { ...state.inventory, stacks: [...state.inventory.stacks, { itemId: 'HOLY_WATER', quantity: 1 }] }, character: { ...state.character, gold: 100 }, skills: state.skills.map(skill => skill.skillId === 'alchemy' || skill.skillId === 'herbalism' ? { ...skill, xp: 0, level: 1 } : skill) };
    strict_1.default.equal((await request({ type: 'faith_practice', args: { tierId: 'FAITH_QUIET', count: 1 } }, 'faith-00001', 1)).status, 200, 'Faith reservation persists through online command');
    strict_1.default.equal((await request({ type: 'stop' }, 'faith-stop-01', 2)).status, 200, 'Faith refund persists through online command');
    strict_1.default.equal((await request({ type: 'start', args: { kind: 'gathering', id: 'DEWLEAF_PATCH' } }, 'herb-start-01', 3)).status, 200, 'Herbalism activity starts online');
    clock += 60000;
    const herbClaim = await request({ type: 'claim' }, 'herb-claim-01', 4);
    strict_1.default.equal(herbClaim.status, 200, 'Herbalism settlement persists online');
    state = { ...state, inventory: { ...state.inventory, stacks: state.inventory.stacks.map(stack => stack.itemId === 'DEWLEAF' ? { ...stack, quantity: 2 } : stack) } };
    strict_1.default.equal((await request({ type: 'stop' }, 'herb-stop-01', 5)).status, 200, 'Herbalism activity stops online');
    strict_1.default.equal((await request({ type: 'alchemy_start', args: { id: 'BREW_DEWLEAF_DRAUGHT', batches: 1 } }, 'brew-start-01', 6)).status, 200, 'Alchemy reservation persists online');
    clock += 60000;
    const brewClaim = await request({ type: 'claim' }, 'brew-claim-01', 7);
    strict_1.default.equal(brewClaim.status, 200, 'Alchemy settlement persists online');
    const persisted = await brewClaim.json();
    strict_1.default.equal(persisted.state.activity, null, 'Completed alchemy batch is cleared');
    state = { ...state, character: { ...state.character, level: 30 }, skills: state.skills.map(skill => skill.skillId === 'herbalism' ? { ...skill, xp: 999999, level: 26 } : skill.skillId === 'alchemy' ? { ...skill, xp: 999999, level: 35 } : skill), inventory: { ...state.inventory, stacks: [...state.inventory.stacks, { itemId: 'SUNSCALE', quantity: 2 }, { itemId: 'RIVER_MINT', quantity: 2 }] } };
    strict_1.default.equal((await request({ type: 'travel', args: { id: 'SUNSCAR' } }, 'sunscar-travel-01', 8)).status, 200, 'Later-region travel persists online');
    strict_1.default.equal((await request({ type: 'explore', args: { id: 'SCOUT_SUNSCAR' } }, 'sunscar-scout-01', 9)).status, 200, 'Later-region scouting starts online');
    clock += 210000;
    const sunscarScout = await request({ type: 'claim' }, 'sunscar-scout-claim-01', 10);
    strict_1.default.equal(sunscarScout.status, 200, 'Later-region scouting settles online');
    const sunscarState = await sunscarScout.json();
    strict_1.default.ok(sunscarState.state.unlockedMonsterIds.includes('SUNSCAR_SCORPION'), 'Scouting unlock persists online');
    strict_1.default.equal((await request({ type: 'stop' }, 'sunscar-scout-stop-01', 11)).status, 200, 'Later-region scouting lane stops online');
    strict_1.default.equal((await request({ type: 'start', args: { kind: 'gathering', id: 'SUNSCALE_BLOOM' } }, 'sunscale-start-01', 12)).status, 200, 'Later-region Herbalism starts online');
    strict_1.default.equal((await request({ type: 'stop' }, 'sunscale-stop-01', 13)).status, 200, 'Later-region Herbalism stops online');
    strict_1.default.equal((await request({ type: 'alchemy_start', args: { id: 'BREW_GREATER_VIGOR_TONIC_SUNSCAR', batches: 1 } }, 'sunscar-brew-start-01', 14)).status, 200, 'Regional Alchemy reservation persists online');
    clock += 132000;
    const regionalBrew = await request({ type: 'claim' }, 'sunscar-brew-claim-01', 15);
    strict_1.default.equal(regionalBrew.status, 200, 'Regional Alchemy settlement persists online');
    strict_1.default.equal((await request({ type: 'claim' }, 'create-00001', 1)).status, 409, 'same key different command');
    strict_1.default.equal((await request({ type: 'claim' }, 'stale-00001', 0)).status, 409);
    strict_1.default.equal((await request({ type: 'start', args: { kind: 'combat', id: 'SUNSCAR_SCORPION' } }, 'start-00001', 16)).status, 200);
    clock += 120000;
    transportFailure = true;
    strict_1.default.equal((await request({ type: 'claim' }, 'claim-00001', 17)).status, 503, 'uncertain commit is retryable');
    const count = commits;
    const retried = await request({ type: 'claim' }, 'claim-00001', 17);
    strict_1.default.equal(retried.status, 200);
    strict_1.default.equal(commits, count, 'no second commit on retry');
    const result = await retried.json();
    strict_1.default.ok(result.reward.kills > 0);
    strict_1.default.ok(result.state.character.xp > 0);
    strict_1.default.ok(!result.state.unlockedMonsterIds.includes('BLACKGLASS_MIRELING'), 'Sunscar combat cannot bypass Ashlands scouting online');
    let receiptReads = 0;
    const raced = (0, gameplay_1.gameplayHandler)({ ...services, rpc: async (name, args) => {
            if (name === 'read_online_game_receipt_server_v1' && receiptReads++ === 0)
                return null;
            return services.rpc(name, args);
        } });
    const late = await raced(new Request('https://example.invalid/gameplay', { method: 'POST', headers: { Authorization: 'Bearer alice-token' }, body: JSON.stringify({ command: { type: 'claim' }, requestId: 'claim-00001', expectedVersion: 17 }) }));
    strict_1.default.equal(late.status, 200, 'a commit between receipt and state reads replays successfully');
    strict_1.default.equal(commits, count);
    const rosterId = '22222222-2222-4222-8222-222222222222';
    state = { ...state, account: { ...state.account, unlockedCharacterSlots: 2 }, otherCharacters: [{ character: { ...state.character, id: rosterId, name: 'Second Hero', classId: 'BASTION' }, inventory: state.inventory, overflow: state.overflow, activity: null, skills: state.skills, quests: state.quests, currentRegionId: state.currentRegionId }] };
    const switched = await request({ type: 'roster_switch', args: { id: rosterId } }, 'roster-switch-01', 18);
    strict_1.default.equal(switched.status, 200, 'roster switch routes through authenticated gameplay');
    const switchedPayload = await switched.json();
    strict_1.default.equal(switchedPayload.state.character.id, rosterId, 'roster switch persists active identity');
    state = { ...state, account: { ...state.account, unlockedCharacterSlots: 3 } };
    const created = await request({ type: 'roster_create', args: { classId: 'WAYFINDER', name: 'Third Hero', body: 'male' } }, 'roster-create-01', 19);
    strict_1.default.equal(created.status, 200, 'roster creation routes through authenticated gameplay');
    const createdPayload = await created.json();
    strict_1.default.equal(createdPayload.state.character.id, '33333333-3333-4333-8333-333333333333', 'roster creation persists server identity');
    console.log('PASS authenticated gameplay HTTP, input authority, canonical replay, stale version and lost-response recovery');
}
void main().catch(error => { console.error(error); process.exitCode = 1; });

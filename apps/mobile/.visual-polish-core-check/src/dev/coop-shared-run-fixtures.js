"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boonOfferFixture = exports.qDecisionFixture = exports.liveDecisionFixture = exports.coopRouteFixture = void 0;
const kinds = ['battle', 'battle', 'camp', 'elite', 'event'];
const nodes = [{ nodeId: 'entry', depth: 0, kind: 'entry', title: 'Vault threshold', nextNodeIds: ['d1-a', 'd1-b', 'd1-c'], status: 'completed' }];
for (let depth = 1; depth <= 5; depth++)
    for (let choice = 0; choice < 3; choice++)
        nodes.push({ nodeId: `d${depth}-${'abc'[choice]}`, depth, kind: kinds[(depth + choice) % kinds.length], title: ['Root scouts', 'Warding grove', 'Whispering hollow'][choice], summary: choice === 0 ? 'Direct combat route' : choice === 1 ? 'Recovery or defense opportunity' : 'Unknown roots stir ahead', riskLabel: ['Steady', 'Guarded', 'Uncertain'][choice], rewardLabel: ['Relics', 'Recovery', 'Boons'][choice], nextNodeIds: depth === 5 ? ['boss'] : [`d${depth + 1}-a`, `d${depth + 1}-b`, `d${depth + 1}-c`], status: depth < 3 && choice === 0 ? 'completed' : depth === 3 ? 'available' : 'locked' });
nodes.push({ nodeId: 'boss', depth: 6, kind: 'boss', title: 'Rootbound Warden', summary: 'Final guardian', riskLabel: 'Boss', rewardLabel: 'Expedition settlement', nextNodeIds: [], status: 'locked' });
exports.coopRouteFixture = { runId: 'gallery-run', revision: 7, preBossNodeCount: 5, entryNodeId: 'entry', bossNodeId: 'boss', nodes, completedNodeIds: ['d1-a', 'd2-a'] };
const options = nodes.filter(node => node.depth === 3);
exports.liveDecisionFixture = { runId: 'gallery-run', decisionId: 'decision-3', revision: 4, mode: 'live', status: 'open', options, localOptionId: 'd3-a', eligibleVoterIds: ['p1', 'p2', 'p3', 'p4'], votes: [{ participantId: 'p1', displayName: 'You', optionId: 'd3-a' }, { participantId: 'p2', displayName: 'Mira', optionId: 'd3-a' }, { participantId: 'p3', displayName: 'Tor', optionId: 'd3-b' }, { participantId: 'p4', displayName: 'Sela', optionId: 'd3-c' }], expiresAt: '2099-01-01T00:00:00.000Z' };
exports.qDecisionFixture = { runId: 'gallery-run', decisionId: 'decision-3', revision: 4, mode: 'qmode', status: 'open', options, isController: true };
exports.boonOfferFixture = { offerId: 'offer-gallery', revision: 2, kind: 'boon', scope: 'personal', status: 'open', ownedEffects: ['Root Ward · +8% defense for this run'], options: [{ id: 'growth', name: 'Living Growth', rarity: 'Rare', effectText: '+12% maximum health for this run', artId: 'boon_growth' }, { id: 'resilience', name: 'Barkskin', rarity: 'Uncommon', effectText: '+10% defense for 2 rooms', artId: 'boon_resilience' }, { id: 'rooted', name: 'Rooted Oath', rarity: 'Epic', effectText: 'First down each room restores 20% health', artId: 'boon_rooted' }] };

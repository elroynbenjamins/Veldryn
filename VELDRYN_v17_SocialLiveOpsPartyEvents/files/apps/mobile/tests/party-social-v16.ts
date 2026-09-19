import { contractEligibilityLabel, contractProgressPercent, type PartyContractView } from '../src/core/party-social';

function assert(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

const contract: PartyContractView = {
  id: 'c', name: 'Test', focus: 'mixed', description: '', targetPoints: 4000, totalPoints: 2100,
  combatPoints: 1200, skillingPoints: 900, personalPoints: 400, eligible: true, complete: false, expiresAt: '2026-09-14T00:00:00Z',
};
assert(contractProgressPercent(contract) === 53, 'progress percent');
assert(contractEligibilityLabel(contract) === 'Reward eligible', 'eligibility label');
console.log('mobile-party-social-v16 ok');

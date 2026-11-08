/**
 * Hidden Party Events v2 — deterministic Day 8 reward offers.
 *
 * This calculates offers only. Actual gold, XP, Companion Essence, Bondstones
 * and Renown must be granted atomically by trusted economy/Inbox code.
 * Never treat a preview as a grant and never derive a band from client input.
 */
import type {WeeklyPartyDifficulty} from './weekly-party-events-v2';

export const PARTY_EVENT_REWARD_MODEL_VERSION='party-event-rewards-v2';
export type PartyEventCacheChoice='warrior'|'artisan'|'companion';
export type PartyEventRewardKind=PartyEventCacheChoice|'participation';
export const PARTY_EVENT_CACHE_CHOICES:readonly PartyEventCacheChoice[]=[
  'warrior','artisan','companion',
];

export interface PartyEventRewardBundle {
  version:typeof PARTY_EVENT_REWARD_MODEL_VERSION;
  kind:PartyEventRewardKind;
  performanceBand:1|2|3|4|5|6;
  personalPoints:number;
  gold:number;
  combatXp:number;
  skillXp:number;
  companionEssence:number;
  bondstones:number;
  partyRenown:number;
  materials:Record<string,number>;
}

export type PartyEventRewardEligibility='none'|'participation'|'full';

export function partyEventRewardEligibility(personalPoints:number):PartyEventRewardEligibility {
  if(!Number.isInteger(personalPoints)||personalPoints<0||personalPoints>60)
    throw new Error('invalid_party_event_personal_points');
  return personalPoints>=15?'full':personalPoints>=5?'participation':'none';
}

/** Applies diminishing returns to higher damage tiers, never per-player DPS. */
export function partyEventRewardBundle(input:{
  difficulty:WeeklyPartyDifficulty;
  performanceBand:number;
  personalPoints:number;
  choice?:PartyEventCacheChoice;
}):PartyEventRewardBundle {
  const {difficulty,performanceBand,personalPoints}=input;
  const eligibility=partyEventRewardEligibility(personalPoints);
  if(eligibility==='none')throw new Error('party_event_reward_not_eligible');
  if(!Number.isInteger(performanceBand)||performanceBand<1||performanceBand>6)
    throw new Error('party_event_invalid_reward_band');
  const multiplier={standard:1,veteran:1.2,heroic:1.35}[difficulty];
  if(!multiplier)throw new Error('party_event_invalid_reward_difficulty');
  if(eligibility==='full'&&!input.choice)
    throw new Error('party_event_reward_choice_required');
  if(input.choice&&!PARTY_EVENT_CACHE_CHOICES.includes(input.choice))
    throw new Error('party_event_invalid_reward_choice');
  if(eligibility==='participation'&&input.choice)
    throw new Error('party_event_participation_has_no_cache');

  const band=performanceBand as 1|2|3|4|5|6;
  const kind=eligibility==='participation'?'participation':input.choice!;
  const scale=(value:number)=>Math.round(value*multiplier);
  const empty={
    version:PARTY_EVENT_REWARD_MODEL_VERSION,kind,performanceBand:band,
    personalPoints,gold:0,combatXp:0,skillXp:0,companionEssence:0,
    bondstones:0,partyRenown:0,materials:{} as Record<string,number>,
  };
  if(kind==='participation')return {
    ...empty,gold:scale(300+band*120),
  };
  const base=scale(1250+band*450);
  const partyRenown={standard:10,veteran:12,heroic:14}[difficulty];
  switch(kind) {
    case 'warrior':
      return {...empty,gold:base,partyRenown,
        combatXp:scale(1300+band*350),
        materials:{GEM_DUST:Math.max(1,Math.round(3+band*.7))}};
    case 'artisan':
      return {...empty,gold:base,partyRenown,
        skillXp:scale(1800+band*450),
        materials:{GEM_DUST:Math.max(1,Math.round(3+band*.7))}};
    case 'companion':
      return {...empty,gold:base,partyRenown,
        companionEssence:scale(80+band*45),
        bondstones:band>=5?2:band>=3?1:0};
  }
}

/** Display-only choices, based on the locked account-week entitlement. */
export function partyEventRewardOffers(input:{
  difficulty:WeeklyPartyDifficulty;
  performanceBand:number;
  personalPoints:number;
}):PartyEventRewardBundle[] {
  const eligibility=partyEventRewardEligibility(input.personalPoints);
  if(eligibility==='none')return [];
  if(eligibility==='participation')return [partyEventRewardBundle(input)];
  return PARTY_EVENT_CACHE_CHOICES.map(choice=>partyEventRewardBundle({...input,choice}));
}

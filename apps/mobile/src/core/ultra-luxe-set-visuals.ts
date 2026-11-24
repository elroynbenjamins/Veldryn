/** Cosmetic-only synchronization: a matching equipped set, not mere ownership.
 * Caller supplies the verified title ID and displayed badge IDs. No gameplay bonuses. */
type Collection={background:string;border:string;pet:string;title:string;badge:string};
type Equipped={background?:string|null;border?:string|null;pet?:string|null;verifiedTitleId?:string|null;displayedBadges:readonly string[]};
export function ultraLuxeVisualTier(expected:Collection,actual:Equipped):'individual'|'paired'|'awakened'|'ascendant'{
 if(actual.background!==expected.background||actual.border!==expected.border)return 'individual';
 if(actual.pet!==expected.pet)return 'paired';
 return actual.verifiedTitleId===expected.title&&actual.displayedBadges.includes(expected.badge)?'ascendant':'awakened';
}

/** Presentation-only bridge for already-owned main-branch tester pieces.
 * Never use these aliases for grants, save mutation, equip validation or blessings.
 * The caller supplies per-piece eligibility from the existing tester projection.
 * Abyssal and Paradox, ordinary items, and unverified aliases stay unchanged. */
const TESTER_RENDER_ALIASES={
 background:new Map<string,string>([['premium:celestial-sovereign:astral-sanctum','ascendant-celestial-astral-sanctum'],['premium:draconic-dominion:dominion-of-ash','ascendant-draconic-dominion-of-ash']]),
 border:new Map<string,string>([['premium:celestial-sovereign:crown-of-cosmos','ascendant-celestial-crown-of-the-cosmos'],['premium:draconic-dominion:throne-of-embers','ascendant-draconic-throne-of-embers']]),
 pet:new Map<string,string>([['premium:celestial-sovereign:aetherion-starborn','ascendant-celestial-aetherion'],['premium:draconic-dominion:vharaxis-eternal-flame','ascendant-draconic-vharaxis']]),
} as const;
type VisualPiece=keyof typeof TESTER_RENDER_ALIASES;
export function resolveTesterUltraLuxeVisuals(actual:Equipped,allowed:Readonly<Record<VisualPiece,boolean>>):Equipped{
 const resolve=(kind:VisualPiece,id:string|null|undefined)=>allowed[kind]&&id?TESTER_RENDER_ALIASES[kind].get(id)??id:id;
 return {...actual,background:resolve('background',actual.background),border:resolve('border',actual.border),pet:resolve('pet',actual.pet)};
}

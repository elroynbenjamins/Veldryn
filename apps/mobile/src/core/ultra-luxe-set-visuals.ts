/** Cosmetic-only synchronization: a matching equipped set, not mere ownership.
 * Caller supplies the verified title ID and displayed badge IDs. No gameplay bonuses. */
type Collection={background:string;border:string;pet:string;title:string;badge:string};
type Equipped={background?:string|null;border?:string|null;pet?:string|null;verifiedTitleId?:string|null;displayedBadges:readonly string[]};
export function ultraLuxeVisualTier(expected:Collection,actual:Equipped):'individual'|'paired'|'awakened'|'ascendant'{
 if(actual.background!==expected.background||actual.border!==expected.border)return 'individual';
 if(actual.pet!==expected.pet)return 'paired';
 return actual.verifiedTitleId===expected.title&&actual.displayedBadges.includes(expected.badge)?'ascendant':'awakened';
}

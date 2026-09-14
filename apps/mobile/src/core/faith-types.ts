export interface FaithPracticeReservation { tierId:string; remainingPractices:number; lastClaimAtMs:number; progressFraction:number; }
export interface CharacterFaithState { xp?:number; practice?:import('./faith').FaithPractice; selectedBlessingId?:string; favoriteBlessingIds:string[]; hideWeakerBlessings:boolean; }

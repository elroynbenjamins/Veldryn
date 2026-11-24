/** Coordinated 2.0 release guard. Review-only and fail-closed. */
export const SCOUTING_2_RELEASE_GUARD_VERSION='scouting-2-gate-v1' as const;
export type Scouting2ReleaseEvidence={
 accountMigrationPersisted:boolean;legacyAccessPersisted:boolean;sharedXpServerAuthoritative:boolean;characterSlotsExcludeExploration:boolean;
 atomicDispatchClaim:boolean;legacyClaimsDrained:boolean;companionCustodyUnified:boolean;weeklyRareCapUnified:boolean;achievementPersistenceReady:boolean;
 tutorialUpdated:boolean;translationsComplete:boolean;mobileDeviceApproved:boolean;economyApproved:boolean;coordinated2LaunchEnabled:boolean;
};
export const SCOUTING_2_REQUIRED_GATES:ReadonlyArray<keyof Scouting2ReleaseEvidence>=[
 'accountMigrationPersisted','legacyAccessPersisted','sharedXpServerAuthoritative','characterSlotsExcludeExploration','atomicDispatchClaim',
 'legacyClaimsDrained','companionCustodyUnified','weeklyRareCapUnified','achievementPersistenceReady','tutorialUpdated','translationsComplete',
 'mobileDeviceApproved','economyApproved','coordinated2LaunchEnabled'
];
export function scouting2ReleaseGuard(e:Scouting2ReleaseEvidence){
 const missing=SCOUTING_2_REQUIRED_GATES.filter(k=>e[k]!==true);
 return {ready:missing.length===0,missing,version:SCOUTING_2_RELEASE_GUARD_VERSION};
}
export const SCOUTING_2_REVIEW_EVIDENCE:Scouting2ReleaseEvidence={
 accountMigrationPersisted:false,legacyAccessPersisted:false,sharedXpServerAuthoritative:false,characterSlotsExcludeExploration:false,
 atomicDispatchClaim:false,legacyClaimsDrained:false,companionCustodyUnified:false,weeklyRareCapUnified:false,achievementPersistenceReady:false,
 tutorialUpdated:false,translationsComplete:false,mobileDeviceApproved:false,economyApproved:false,coordinated2LaunchEnabled:false,
};

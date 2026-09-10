import type {CoopQModeMemberView,CoopQModeTeamView} from '../core/coop-qmode';
const members:CoopQModeMemberView[]=[{memberId:'controller',displayName:'You',role:'support',kind:'controller',effectiveLevel:25,status:'ready'},{memberId:'echo-tank',displayName:'Aster Guard',role:'tank',kind:'echo',effectiveLevel:25,status:'ready'},{memberId:'echo-damage-1',displayName:'Trail Arrow',role:'damage',kind:'echo',effectiveLevel:25,status:'ready'},{memberId:'echo-damage-2',displayName:'Gloam Step',role:'damage',kind:'echo',effectiveLevel:25,status:'ready'}];
export const qModeReadyFixture:CoopQModeTeamView={runId:'q-gallery-run',requestId:'q-gallery-request',status:'ready',members};
export const qModeResumeFixture:CoopQModeTeamView={...qModeReadyFixture,status:'resuming',stateVersion:7};
export const qModeShortageFixture:CoopQModeTeamView={requestId:'q-shortage-request',status:'candidate_shortage',members:members.slice(0,3),message:'No current Damage candidate matches this content version.'};
export const qModeConflictFixture:CoopQModeTeamView={requestId:'q-conflict-request',status:'content_conflict',members:[],message:'Saved build content version no longer matches the expedition.'};

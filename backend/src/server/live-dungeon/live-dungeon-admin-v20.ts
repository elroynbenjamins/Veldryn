export const LIVE_DUNGEON_ADMIN_COMMANDS_V20=[
 {key:'live_dungeon.recover_run_from_checkpoint',risk:'critical',ownerApproval:true,reasonRequired:true,handler:'recoverLiveDungeonRunFromCheckpoint'},
 {key:'live_dungeon.release_stale_account_slot',risk:'high',ownerApproval:false,reasonRequired:true,handler:'releaseStaleLiveDungeonAccountSlot'},
 {key:'live_dungeon.cancel_ready_match',risk:'high',ownerApproval:false,reasonRequired:true,handler:'cancelLiveDungeonReadyMatch'},
 {key:'live_dungeon.recalculate_reward_eligibility',risk:'high',ownerApproval:false,reasonRequired:true,handler:'recalculateLiveDungeonRewardEligibility'},
 {key:'live_dungeon.end_stuck_run',risk:'critical',ownerApproval:true,reasonRequired:true,handler:'endStuckLiveDungeonRun'},
] as const;
export const LIVE_DUNGEON_REMOTE_CONFIG_V20=[
 {key:'feature.live_dungeons.enabled',type:'boolean',defaultValue:true,critical:true},
 {key:'content.sunscar.enabled',type:'boolean',defaultValue:true,critical:false},
 {key:'live_dungeon.ready_check_seconds',type:'integer',defaultValue:20,min:10,max:45,critical:false},
 {key:'live_dungeon.route_vote_seconds',type:'integer',defaultValue:8,min:5,max:15,critical:false},
 {key:'live_dungeon.disconnect_grace_seconds',type:'integer',defaultValue:30,min:15,max:60,critical:false},
 {key:'live_dungeon.safety_ai_until_seconds',type:'integer',defaultValue:150,min:60,max:240,critical:false},
] as const;

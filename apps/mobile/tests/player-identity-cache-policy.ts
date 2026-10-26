import {identityFieldExpired,mergeSocialWithCachedIcon,PLAYER_ICON_REFRESH_MS,PLAYER_SOCIAL_REFRESH_MS} from '../src/core/player-identity-cache-policy';
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const now=1_800_000_000_000;
ok(!identityFieldExpired(now-PLAYER_ICON_REFRESH_MS+1,PLAYER_ICON_REFRESH_MS,now),'unchanged icon remains fresh for 24h');
ok(identityFieldExpired(now-PLAYER_ICON_REFRESH_MS,PLAYER_ICON_REFRESH_MS,now),'icon expires after 24h');
ok(identityFieldExpired(0,PLAYER_ICON_REFRESH_MS,now),'invalidated icon refreshes');
ok(identityFieldExpired(now+1,PLAYER_ICON_REFRESH_MS,now),'clock rollback refreshes');
ok(!identityFieldExpired(now-PLAYER_SOCIAL_REFRESH_MS+1,PLAYER_SOCIAL_REFRESH_MS,now),'social data stays fresh five minutes');
ok(identityFieldExpired(now-PLAYER_SOCIAL_REFRESH_MS,PLAYER_SOCIAL_REFRESH_MS,now),'social details refresh independently');
const icon:{profile_icon_id:string|null;class_id:string|null;guild_tag:string}={profile_icon_id:'icon_17',class_id:'IRONWARDEN',guild_tag:'OLD'};
const social={profile_icon_id:null,class_id:null,guild_tag:'NEW'};
const combined=mergeSocialWithCachedIcon(icon,social,false);
ok(combined.profile_icon_id==='icon_17'&&combined.class_id==='IRONWARDEN','lightweight fetch must retain cached appearance');
ok(combined.guild_tag==='NEW','guild metadata must update');
ok(mergeSocialWithCachedIcon(icon,social,true).profile_icon_id===null,'full appearance lookup may clear removed icon');
console.log('PASS profile icon 24h cache, social 5m TTL, invalidation, clock rollback and safe metadata merge');

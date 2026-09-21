export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const app=read('App.tsx');
const screen=read('src/screens/GuildScreen.tsx');
const board=read('src/components/OnlineGuildNoticeBoardPanel.tsx');
const management=read('src/components/OnlineGuildManagement.tsx');
const social=read('src/online/social.ts');
const sql=read('../../backend/supabase/migrations/20260921113500_guild_notice_board_v1.sql');

ok(app.includes("import {OnlineGuildNoticeBoardPanel}"),'App must import the online Guild Notice Board');
ok(app.includes('onlineBoard={<OnlineGuildNoticeBoardPanel/>}'),'App must wire the Notice Board into the Guild screen');

ok(screen.includes("'Board'"),'Online Guild sections must include Board');
ok(screen.includes("onlineSection==='Board'?onlineBoard:null"),'Board tab must render member Notice Board content');
ok(screen.includes('the member Notice Board'),'Guild hub description must acknowledge the Notice Board');

ok(board.includes('MEMBER NOTICE BOARD'),'Notice Board must have clear Guild-member context');
ok(board.includes('<StatusPill label="MEMBERS ONLY" tone="good"/>'),'Notice Board must clearly communicate its private audience');
ok(board.includes('maxLength={280}'),'Notice Board editor must enforce the 280-character UI cap');
ok(board.includes('blank text clears the notice'),'Notice Board editor must explain clear behavior');
ok(board.includes("board.canEdit&&!editing"),'Only server-authorized Guild roles may see edit controls');
ok(board.includes("Read-only · Your Guild role cannot edit"),'Ordinary members must get a clear read-only state');
ok(board.includes('LoadingState'),'Notice Board must use the shared loading pattern');

ok(social.includes('GuildNoticeBoardState'),'Online social client must expose Notice Board state');
ok(social.includes("client.rpc('guild_notice_board_state_v1')"),'Notice Board reads must go through the membership-gated RPC');
ok(social.includes("client.rpc('update_guild_notice_board_v1'"),'Notice Board writes must go through the server-authoritative RPC');
ok(social.includes("clean.length>280"),'Client must reject overlong notices before transport');

ok(sql.includes('security definer'),'Notice Board RPCs must enforce access server-side');
ok(sql.includes("where gm.account_id=v_uid"),'Notice Board RPCs must resolve Guild membership from authenticated user');
ok(sql.includes("v_role in('leader','guild_master','co_leader','officer','quartermaster')"),'Notice Board editing must match the existing bulletin-edit leadership roles');
ok(sql.includes("GUILD_OFFICER_REQUIRED"),'Unauthorized Notice Board edits must fail explicitly');
ok(sql.includes("LINK_ACCOUNT_REQUIRED"),'Guest accounts must not edit the Notice Board');
ok(sql.includes("char_length(v_body)>280"),'Server must enforce the 280-character Notice Board cap');
ok(sql.includes('guild_bulletin_revisions'),'Notice Board edits must preserve revision history');
ok(sql.includes('guild_activity_feed'),'Notice Board edits must create Guild activity');
ok(sql.includes("'bulletin_updated'"),'Notice Board activity must use a stable activity kind');
ok(sql.includes('grant execute on function public.guild_notice_board_state_v1() to authenticated'),'Notice Board read RPC must only be executable by authenticated users');
ok(sql.includes('grant execute on function public.update_guild_notice_board_v1(text) to authenticated'),'Notice Board edit RPC must only be executable by authenticated users');

ok(management.includes('function joinedGuildLabel(value:string)'),'Guild roster must format authoritative joined dates');
ok(management.includes('member.joined_at'),'Guild roster must use the server-provided joined_at value');
ok(management.includes('status={joinedGuildLabel(member.joined_at)}'),'Joined Guild date must be visible in each compact member identity');
ok(management.includes('statusTone="muted"'),'Joined Guild date must remain secondary to player/role identity');

console.log('PASS: Guild Notice Board is member-only, server-authoritative, revisioned, and roster joined dates are visible');

export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const screen=read('src/screens/GuildScreen.tsx');
const panel=read('src/components/OnlineGuildMusterPanel.tsx');
const client=read('src/online/guild-muster.ts');
const core=read('src/core/guild-muster.ts');
const sql=read('../../backend/supabase/migrations/20261018000155_guild_muster_v1.sql');
const activitySql=read('../../backend/supabase/migrations/20261018000156_active_guild_meter_v1.sql');
const activitySqlV2=read('../../backend/supabase/migrations/20261018000157_active_guild_meter_v2.sql');
const activitySummary=read('src/components/GuildActivitySummaryPanel.tsx');
const activityCore=read('src/core/guild-activity.ts');

ok(screen.includes("'Activities'"),'Consolidated online Guild sections must include Activities');
ok(screen.includes("onlineSection==='Activities'?<View")&&screen.includes('<OnlineGuildMusterPanel/>'),'Guild Muster must remain reachable inside the Activities destination');
ok(screen.includes('title="Muster & Rally"')&&screen.includes('Daily participation rolls into the shared weekly Rally'),'Activities must explain Muster and Rally clearly after consolidation');
ok(screen.includes('<GuildOnlineHome onNavigate={setOnlineSection} board={onlineBoard}/>'),'Guild Home must keep the member Notice Board reachable');

ok(panel.includes('GUILD MUSTER'),'Muster must have a clear player-facing identity');
ok(panel.includes('not a consecutive login streak'),'Muster must explicitly avoid punitive consecutive streaks');
ok(panel.includes('35% / 70% / 100%'),'Rally tier milestones must be visible');
ok(panel.includes('+5% / +10% / +15% Hall Progress'),'Rally rewards must stay tied to communal Hall progression');
ok(panel.includes('there is no manual point button to spam'),'Muster must explain that contribution is automatic and verified');
ok(panel.includes('Refresh Muster'),'Muster needs explicit refresh feedback');
ok(panel.includes('ACTIVE GUILD')&&panel.includes('Guild Activity'),'Guild Activities must surface the persistent Active Guild meter');
ok(panel.includes('Guild Quests, Muster and completed shared Projects'),'Active Guild meter must explain its cooperative sources');
ok(panel.includes('There is no weekly hard reset.'),'Active Guild meter must explain the non-punitive persistence model');
ok(panel.includes('relative rare materials'),'100% activity reward must be visible');

ok(client.includes("db.rpc('guild_muster_state_v1')"),'Muster summary must come from a membership-gated server RPC');
ok(client.includes("db.rpc('guild_muster_roster_v1')"),'Muster roster must come from a membership-gated server RPC');
ok(client.includes("db.rpc('guild_activity_state_v2')"),'Active Guild meter must come from the v2 authoritative server RPC');
ok(core.includes('GUILD_MUSTER_DAILY_CAP=100'),'Daily contribution must be capped');
ok(core.includes('GUILD_MUSTER_PERSONAL_WEEKLY_GOAL=4'),'Personal weekly cadence must be four meaningful days');
ok(core.includes('GUILD_MUSTER_RALLY_ACTIVE_SHARE=0.60'),'Shared target must scale around sixty percent roster participation');

ok(sql.includes('after insert on public.player_activity_daily'),'Daily attendance must derive from trusted activity');
ok(sql.includes('after insert on public.guild_pve_receipts'),'Contribution must derive from trusted Guild PvE receipts');
ok(sql.includes('private.guild_muster_day_bindings'),'One UTC day must bind contribution to one Guild to prevent Guild-hopping double credit');
ok(sql.includes('least(100'),'Server must enforce the daily Muster cap');
ok(sql.includes("v_threshold integer:=25"),'Server must enforce the Rally Mark threshold');
ok(sql.includes("v_personal_goal integer:=4"),'Server must enforce the non-consecutive four-day cadence');
ok(sql.includes("v_active_share numeric:=0.60"),'Server must scale the Rally target to the current roster');
ok(sql.includes("v_bonus_bps:=case v_tier when 3 then 1500 when 2 then 1000 when 1 then 500 else 0 end"),'Hall bonus tiers must be server-authoritative');
ok(sql.includes('private.guild_hall_receipts'),'Hall bonus settlement must be idempotent');
ok(sql.includes('revoke all on table public.guild_muster_daily from public,anon,authenticated'),'Clients must not write Muster totals directly');
ok(sql.includes('grant select on table public.guild_muster_daily to authenticated'),'Members may only read Muster data under RLS');
ok(sql.includes('guild_muster_member_read_v1'),'Muster daily rows must have member-only RLS');
ok(sql.includes('if v_gid is null then return; end if;'),'Muster RPCs must return no Guild data for non-members');
ok(activityCore.includes('GUILD_ACTIVITY_MILESTONES=[20,40,60,80,100]'),'Active Guild rewards must unlock every 20%');
ok(activityCore.includes('GUILD_ACTIVITY_DAILY_DECAY_PERCENT=10'),'Active Guild must decay 10 percentage points per inactive day');
ok(activitySql.includes('meter_bps'),'Active Guild v1 must establish persisted meter state');
ok(activitySqlV2.includes("return 0")&&activitySqlV2.includes("return 500")&&activitySqlV2.includes("return 1000"),'Active Guild v2 must support protected, partial and inactive day decay');
ok(activitySqlV2.includes('player_activity_daily')&&activitySqlV2.includes('p_date-13'),'Active Guild target must use a trailing 14-day active-member snapshot');
ok(activitySqlV2.includes("source_kind<>'muster_day'"),'Activity-day accounting must avoid double-counting Muster receipts');
ok(activitySqlV2.includes("'guild_project'"),'Completed Guild Projects must feed Guild Activity');
ok(activitySqlV2.includes('guild_activity_state_v2'),'Client-facing Activity state must use the v2 projection');
ok(activitySql.includes('guild_activity_award_v1'),'Active Guild awards must use one server-owned idempotent path');
ok(activitySql.includes('private.guild_activity_receipts'),'Active Guild awards must be protected from duplicate source settlement');
ok(activitySql.includes("'muster_day'"),'Verified Muster qualification must temporarily sustain activity before Guild Quests ship');
ok(activitySql.includes('grant execute on function public.guild_activity_award_v1')&&activitySql.includes('to service_role'),'Clients must not directly award Guild Activity');
ok(screen.includes('<GuildActivitySummaryPanel compact/>'),'Guild Home must surface the Active Guild meter');
ok(activitySummary.includes('GUILD_ACTIVITY_MILESTONE_DEFS')&&activitySummary.includes('milestones active')&&activitySummary.includes('Guild Activity'),'Guild Home Activity card must expose milestone progress from authoritative definitions');
ok(activitySummary.includes('Protected today')&&activitySummary.includes('if inactive'),'Guild Home must explain current decay protection state');

console.log('PASS: Guild Muster is automatic, verified, capped, member-only, forgiving and tied to Hall progression');

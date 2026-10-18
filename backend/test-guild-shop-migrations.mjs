import {strict as assert} from 'node:assert';
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PGlite} from '@electric-sql/pglite';

const here=path.dirname(fileURLToPath(import.meta.url));
const db=new PGlite();
const account='11111111-1111-4111-8111-111111111111';
const character='22222222-2222-4222-8222-222222222222';
const guild='33333333-3333-4333-8333-333333333333';
const single=async(sql,params=[])=>{const result=await db.query(sql,params);return result.rows[0];};
const fail=async(sql,params=[])=>{
 let rejected=false;
 try{await db.query(sql,params);}catch{rejected=true;}
 assert.ok(rejected,`Expected database rejection: ${sql.slice(0,90)}`);
};
try{
 // Minimal canonical VELDRYN tables. Never connects to a real Supabase project.
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key);
 create table public.guilds(id uuid primary key,level integer not null);
 create table public.guild_members(guild_id uuid references public.guilds(id),
  account_id uuid references auth.users(id),primary key(account_id));
 create table public.guild_muster_daily(
  guild_id uuid not null,account_id uuid not null,activity_date date not null,
  check_in_points integer not null default 0,combat_points integer not null default 0,
  skilling_points integer not null default 0);
 create table public.guild_project_instances(
  id uuid primary key,guild_id uuid not null,started_at timestamptz not null,
  meaningful_contributor_threshold integer);
 create table public.guild_project_member_progress(
  project_instance_id uuid,account_id uuid,raw_points bigint,last_contribution_at timestamptz);
 create table public.guild_pve_encounters_v1(id uuid primary key,guild_id uuid,kind text not null);
 create table public.guild_pve_claims_v1(account_id uuid,encounter_id uuid,claimed_at timestamptz);
 create table public.event_community_claims(
  account_id uuid not null,event_id text not null,milestone_percent smallint not null,
  claimed_at timestamptz default now());
 create table public.online_game_states(
  account_id uuid primary key,character_id uuid,state jsonb,revision bigint not null default 1,
  updated_at timestamptz not null default now());
 create table public.chat_messages(account_id uuid not null, body text not null);
 create table public.character_wallets(
  character_id uuid primary key,gold bigint not null,
  updated_at timestamptz not null default now());
 `);
 const migrations=path.join(here,'supabase','migrations');
 const guildFiles=readdirSync(migrations)
  .filter(name=>/^2026101809\d{4}_guild.*\.sql$/.test(name)).sort();
 assert.ok(guildFiles.length>=18,`Expected complete Guild Shop migration chain; got ${guildFiles.length}`);
 for(const file of guildFiles){
  try{await db.exec(readFileSync(path.join(migrations,file),'utf8'));}
  catch(error){throw new Error(`Guild migration ${file} failed: ${String(error)}`);}
 }
 try{
  await db.exec(readFileSync(path.join(here,'supabase','tests','guild_shop_security.sql'),'utf8'));
 }catch(error){throw new Error(`Guild Shop role grants or RLS gate failed: ${String(error)}`);}
 assert.equal((await single(`select has_function_privilege('service_role',
  'public.guild_shop_purchase_server_v4(uuid,text)','EXECUTE') as permitted`)).permitted,false);
 assert.equal((await single(`select has_function_privilege('service_role',
  'public.guild_shop_grant_tokens_server_v1(uuid,text,bigint,boolean)','EXECUTE') as permitted`)).permitted,false);
 assert.equal((await single(`select has_function_privilege('service_role',
  'public.guild_construction_donate_server_v2(uuid,text,text,integer,text)','EXECUTE') as permitted`)).permitted,false);
 assert.equal((await single(`select has_function_privilege('authenticated',
  'public.guild_shop_claim_daily_server_v1(uuid,text)','EXECUTE') as permitted`)).permitted,false);
 await db.query('insert into auth.users(id) values ($1)',[account]);
 await db.query('insert into public.guilds(id,level) values ($1,20)',[guild]);
 await db.query('insert into public.guild_members(guild_id,account_id) values ($1,$2)',[guild,account]);
 await db.query(`insert into public.guild_muster_daily(guild_id,account_id,activity_date,
  check_in_points,combat_points) values($1,$2,(now() at time zone 'utc')::date,10,5)`,[guild,account]);
 await db.query(`insert into public.event_community_claims(account_id,event_id,milestone_percent)
  values($1,'veilbreak',100)`,[account]);
 await db.query(`insert into public.online_game_states(account_id,character_id,state)
  values($1,$2,$3::jsonb)`,[account,character,JSON.stringify({
  inventory:{stacks:[{itemId:'GREENWOOD_LOG',quantity:80},{itemId:'ASTER_IRON_INGOT',quantity:2},{itemId:'MOSS_FIBER',quantity:2}]},
  account:{unlockedCosmeticPetIds:[],unlockedCombatCompanionIds:[],
   unlockedProfileIconIds:[],unlockedProfileBorderIds:[],combatCompanionProgress:{}}
 })]);
 await db.query('insert into public.character_wallets(character_id,gold) values ($1,1000)',[character]);
 // Server accepts starter art, but never premium Guild emotes before unlock.
 await db.query('insert into public.chat_messages(account_id,body) values ($1,$2)',[account,'Hello :male_01:']);
 await fail('insert into public.chat_messages(account_id,body) values ($1,$2)',[account,'Hello :pet_set_a_01:']);
 await fail('insert into public.chat_messages(account_id,body) values ($1,$2)',[account,':male_01::male_02::male_03:']);
 assert.equal(Number((await single('select public.guild_shop_claim_daily_server_v1($1,\'attendance\') as n',[account])).n),10);
 assert.equal(Number((await single('select public.guild_shop_claim_daily_server_v1($1,\'attendance\') as n',[account])).n),0);
 assert.equal(Number((await single('select public.guild_shop_claim_daily_server_v1($1,\'contribution\') as n',[account])).n),10);
 assert.equal(Number((await single(`select public.guild_shop_claim_event_community_server_v1($1,'veilbreak',100) as n`,[account])).n),350);
 assert.equal(Number((await single(`select public.guild_shop_claim_event_community_server_v1($1,'veilbreak',100) as n`,[account])).n),0);
 assert.equal(Number((await single('select balance from public.guild_shop_wallets where account_id=$1',[account])).balance),370);
 assert.equal(Number((await single('select earned from public.guild_shop_weekly where account_id=$1',[account])).earned),20);
 await fail(`select public.guild_shop_claim_event_community_server_v1($1,'veilbreak',25)`,[account]);
 // Weekly rewards use existing validated project/encounter records, never user
 // input. The 250 standard cap remains independent of event bonus Tokens.
 await fail(`select public.guild_shop_claim_weekly_server_v1($1,'project')`,[account]);
 const projectId='44444444-4444-4444-8444-444444444444';
 const encounterId='55555555-5555-4555-8555-555555555555';
 await db.query(`insert into public.guild_project_instances(id,guild_id,started_at,meaningful_contributor_threshold)
  values($1,$2,now(),10)`,[projectId,guild]);
 await db.query(`insert into public.guild_project_member_progress
  (project_instance_id,account_id,raw_points,last_contribution_at)
  values($1,$2,20,now())`,[projectId,account]);
 await db.query(`insert into public.guild_pve_encounters_v1(id,guild_id,kind)
  values($1,$2,'weekly')`,[encounterId,guild]);
 await db.query(`insert into public.guild_pve_claims_v1(account_id,encounter_id,claimed_at)
  values($1,$2,now())`,[account,encounterId]);
 assert.equal(Number((await single(`select public.guild_shop_claim_weekly_server_v1($1,'project') as n`,[account])).n),40);
 assert.equal(Number((await single(`select public.guild_shop_claim_weekly_server_v1($1,'project') as n`,[account])).n),0);
 assert.equal(Number((await single(`select public.guild_shop_claim_weekly_server_v1($1,'boss') as n`,[account])).n),30);
 assert.equal(Number((await single('select earned from public.guild_shop_weekly where account_id=$1',[account])).earned),90);



 // Separate test account verifies cap rounding, event bonuses and replay.
 // Token wallets are bound to an account, not an individual character.
 const cappedAccount='66666666-6666-4666-8666-666666666666';
 await db.query('insert into auth.users(id) values ($1)',[cappedAccount]);
 await db.query('insert into public.guild_members(guild_id,account_id) values($1,$2)',[guild,cappedAccount]);
 await db.query(`insert into public.guild_muster_daily(guild_id,account_id,activity_date,check_in_points)
  values($1,$2,(now() at time zone 'utc')::date,10)`,[guild,cappedAccount]);
 await db.query(`insert into public.event_community_claims(account_id,event_id,milestone_percent)
  values($1,'veilbreak',25)`,[cappedAccount]);
 await db.query(`insert into public.guild_shop_weekly(account_id,week_start,earned)
  values($1,date_trunc('week',now() at time zone 'utc')::date,248)`,[cappedAccount]);
 const firstCap=await single(`select public.guild_shop_claim_daily_server_v1($1,'attendance') as credited`,[cappedAccount]);
 assert.equal(Number(firstCap.credited),2,'normal grant stops exactly at 250 weekly cap');
 const capReplay=await single(`select public.guild_shop_claim_daily_server_v1($1,'attendance') as credited`,[cappedAccount]);
 assert.equal(Number(capReplay.credited),0,'capped request cannot replay');
 const eventAboveCap=await single(`select public.guild_shop_claim_event_community_server_v1($1,'veilbreak',25) as credited`,[cappedAccount]);
 assert.equal(Number(eventAboveCap.credited),100,'limited event milestone bypasses regular weekly cap');
 assert.equal(Number((await single('select earned from public.guild_shop_weekly where account_id=$1',[cappedAccount])).earned),250,'weekly tracker is not affected by event claim');
 assert.equal(Number((await single('select balance from public.guild_shop_wallets where account_id=$1',[cappedAccount])).balance),102,'token wallet sums capped standard plus extra event rewards');
 assert.equal(Number((await single(`select public.guild_shop_claim_event_community_server_v1($1,'veilbreak',25) as credited`,[cappedAccount])).credited),0,'event milestone never doubles');

 // These controlled test-only writes simulate the release switch and earned balance.
 await db.query('update public.guild_shop_wallets set balance=10000 where account_id=$1',[account]);
 await db.exec(`update public.guild_shop_reward_catalogue
  set enabled=true where item_id in ('guild_pet_01','guild_companion_01','emotes_fellowship');`);
 const pet=await single(`select public.guild_shop_purchase_server_v4($1,'guild_pet_01') as result`,[account]);
 assert.equal(pet.result.status,'purchased');
 assert.equal((await single(`select public.guild_shop_purchase_server_v4($1,'guild_pet_01') as result`,[account])).result.status,'already_owned');
 const companion=await single(`select public.guild_shop_purchase_server_v4($1,'guild_companion_01') as result`,[account]);
 assert.equal(companion.result.status,'purchased');
 // A five-emote bundle is one token debit with five permanent entitlements.
 await db.query('update public.guild_shop_wallets set balance=5000 where account_id=$1',[account]);
 const emotes=await single(`select public.guild_shop_purchase_server_v4($1,'emotes_fellowship') as result`,[account]);
 assert.equal(emotes.result.status,'purchased');
 assert.equal(emotes.result.rewardIds.length,5);
 const emoteReplay=await single(`select public.guild_shop_purchase_server_v4($1,'emotes_fellowship') as result`,[account]);
 assert.equal(emoteReplay.result.status,'already_owned');
 const saved=await single('select state,revision from public.online_game_states where account_id=$1',[account]);
 assert.ok(saved.state.account.unlockedCosmeticPetIds.includes('GUILD_PET_001'));
 assert.ok(saved.state.account.unlockedCombatCompanionIds.includes('GUILD_UNIT_001'));
 assert.equal(saved.state.account.combatCompanionProgress.GUILD_UNIT_001.level,1);
 assert.deepEqual(saved.state.account.unlockedEmoteIds,['pet_set_a_01','pet_set_a_02','pet_set_a_03','pet_set_a_04','pet_set_a_05']);
 await db.query('insert into public.chat_messages(account_id,body) values ($1,$2)',[account,'Guild cheers :pet_set_a_01:']);
 assert.equal(Number((await single('select balance from public.guild_shop_wallets where account_id=$1',[account])).balance),3750);
 await fail(`select public.guild_shop_purchase_server_v4($1,'guild_pet_02')`,[account]);

 // Construction requires explicit per-project release even with full SQL privileges.
 const enabledBefore=await single('select public.guild_construction_enabled_server_v1($1) as enabled',[account]);
 assert.deepEqual(enabledBefore.enabled,[]);
 await fail(`select public.guild_construction_donate_server_v2($1,'stormwatch_banner','gold',100,'donation_gold_one')`,[account]);
 await db.exec(`update public.guild_construction_templates set enabled=true where template_id='stormwatch_banner';`);
 const enabledAfter=await single('select public.guild_construction_enabled_server_v1($1) as enabled',[account]);
 assert.deepEqual(enabledAfter.enabled,['stormwatch_banner']);
 // Construction donation checks same-row replay and inventory/gold deduction.
 const donate=(resource,amount,key)=>single(
  'select public.guild_construction_donate_server_v2($1,$2,$3,$4,$5) as result',
  [account,'stormwatch_banner',resource,amount,key]);
 const donation=await donate('gold',100,'donation_gold_one');
 assert.equal(donation.result.alreadyProcessed,false);
 assert.equal((await donate('gold',100,'donation_gold_one')).result.alreadyProcessed,true);
 assert.equal(Number((await single('select gold from public.character_wallets where character_id=$1',[character])).gold),900);
 await donate('GREENWOOD_LOG',25,'donation_logs_one');
 const after=await single('select state from public.online_game_states where account_id=$1',[account]);
 assert.equal(after.state.inventory.stacks[0].quantity,55);
 await fail('select public.guild_construction_donate_server_v2($1,\'stormwatch_banner\',\'GREENWOOD_LOG\',999999,\'donation_logs_two\')',[account]);
 const project=await single(`select public.guild_construction_snapshot_server_v1($1) as snapshot`,[account]);
 assert.equal(project.snapshot[0].resources.GREENWOOD_LOG,25);
 // Rebalance only the isolated fixture's project targets to test completion.
 await db.exec(`update public.guild_construction_requirements set required_amount=
  case resource_id when 'gold' then 100 when 'GREENWOOD_LOG' then 25 else 1 end
  where template_id='stormwatch_banner';`);
 await donate('ASTER_IRON_INGOT',1,'donation_iron_one');
 const completed=await donate('MOSS_FIBER',1,'donation_fiber_one');
 assert.equal(completed.result.completed,true,'last contribution completes project');
 const unlock=await single('select unlock_id from public.guild_construction_unlocks where guild_id=$1',[guild]);
 assert.equal(unlock.unlock_id,'guild_banner_stormwatch','cosmetic unlock issued once for guild');
 assert.equal((await donate('MOSS_FIBER',1,'donation_fiber_one')).result.alreadyProcessed,true);
 await fail(`select public.guild_construction_donate_server_v2($1,'stormwatch_banner','gold',100,'donation_gold_two')`,[account]);
 console.log(`Guild Shop database migrations and transactional invariants passed (${guildFiles.length} migrations).`);
}finally{await db.close();}

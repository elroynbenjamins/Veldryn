import {readFile} from 'node:fs/promises';
const path=new URL('../backend/supabase/migrations/20260929000000_squad_arena_runtime_v5.sql',import.meta.url);
const sql=await readFile(path,'utf8');
const checks=[
  ['request id uniqueness',/uq_squad_arena_request/],
  ['frozen snapshot hash',/snapshot_hash/],
  ['versioned reward entitlements',/squad_arena_reward_entitlements/],
  ['reward tier function',/arena_reward_tier_v1/],
  ['server season function',/arena_season_server_v1/],
  ['reward RLS',/arena_rewards_read_self/],
  ['service-only execution',/grant execute on function public\.arena_season_server_v1[\s\S]*service_role/],
];
const failures=checks.filter(([,pattern])=>!pattern.test(sql));
if(failures.length)throw new Error(`Arena migration checks failed: ${failures.map(([name])=>name).join(', ')}`);
console.log(`Arena migration checks passed (${checks.length})`);

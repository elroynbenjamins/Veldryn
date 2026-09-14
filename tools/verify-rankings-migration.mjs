import {readFileSync} from 'node:fs';
const path=new URL('../backend/supabase/migrations/20261005000000_rankings_v1.sql',import.meta.url);
const sql=readFileSync(path,'utf8').toLowerCase();
const checks=[
  ['visibility',/profile_visibility/],['visibility check',/profile_visibility in \('public','friends','private'\)/],['xp level',/ranking_skill_level_from_xp_v1/],['server rpc',/rankings_board_server_v1/],
  ['profession total',/profession_total/],['arena rating',/arena_rating/],['arena wins',/arena_wins/],['dungeon tier',/dungeon_tier/],['dungeon clears',/dungeon_clears/],['achievement score',/achievement_score/],['guild',/p_board='guild'/],
  ['block filter',/player_blocks/],['public profile filter',/profile_visibility='public'/],['prestige marker',/prestigeonly/],['service revoke',/revoke all on function public\.rankings_board_server_v1/],['service grant',/grant execute on function public\.rankings_board_server_v1[^\n]*service_role/]
];
const failed=checks.filter(([,rx])=>!rx.test(sql)); if(failed.length) throw new Error(`Rankings migration failed: ${failed.map(([name])=>name).join(', ')}`); console.log(`Rankings migration checks passed (${checks.length})`);

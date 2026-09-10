import {buildCoopLoadoutIntent,presentCoopLoadout,type CoopLoadoutProjection} from '../src/core/coop-loadout-presentation';
import {COOP_LOADOUT_MESSAGE_COUNT,translatedCoopLoadoutMessageCount} from '../src/i18n/coop-loadout';
import {SUPPORTED_LANGUAGES} from '../src/i18n/languages';

const stats={maxHp:4000,attackPower:600,healingPower:200,defense:900};
function equal(actual:unknown,expected:unknown,message='values differ'){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: ${JSON.stringify(actual)}`)}
function throws(work:()=>unknown,pattern:RegExp){let message='';try{work()}catch(error){message=error instanceof Error?error.message:String(error)}if(!pattern.test(message))throw new Error(`Expected ${pattern}, received ${message}`)}
function loadout(role:'tank'|'damage'|'support',overrides:Partial<CoopLoadoutProjection>={}):CoopLoadoutProjection{return{id:`load-${role}`,characterId:'current',revision:2,verifiedRevision:2,name:`${role} build`,characterName:'Hero',className:role==='tank'?'Ironwarden':role==='support'?'Dawnkeeper':'Wayfinder',role,status:'verified',ready:true,failures:[],level:30,effectiveLevel:25,beforeStats:stats,effectiveStats:{...stats,attackPower:550},skills:['One'],equipment:['Set'],...overrides}}
for(const role of ['tank','damage','support'] as const)equal(presentCoopLoadout(loadout(role),'current').selectable,true,`${role} server projection should be selectable`);
equal(presentCoopLoadout(loadout('tank',{status:'ineligible',ready:false,failures:['missing_tank_capability']}),'current').blockingReasons,['missing_tank_capability']);
equal(presentCoopLoadout(loadout('damage',{status:'ineligible',ready:false,failures:['character_below_min_level']}),'current').selectable,false);
equal(presentCoopLoadout(loadout('support',{revision:3,verifiedRevision:2,status:'stale'}),'current').blockingReasons.includes('stale_revision'),true);
equal(presentCoopLoadout(loadout('damage'),'other-character').blockingReasons.includes('different_character'),true);
equal(presentCoopLoadout(loadout('support',{status:'failed',ready:false,effectiveLevel:undefined,effectiveStats:undefined}),'current').blockingReasons.includes('verification_failed'),true);
throws(()=>buildCoopLoadoutIntent({mode:'live',dungeonId:'EXP_001',tier:1,loadout:presentCoopLoadout(loadout('tank',{ready:false,status:'ineligible'}),'current')}),/loadout_not_server_verified/);
const intent=buildCoopLoadoutIntent({mode:'qmode',dungeonId:'EXP_001',tier:1,loadout:presentCoopLoadout(loadout('damage'),'current')});
equal(intent,{mode:'qmode',dungeonId:'EXP_001',tier:1,characterId:'current',loadoutId:'load-damage',loadoutRevision:2});
equal('role' in intent,false);equal('stats' in intent,false);
for(const language of SUPPORTED_LANGUAGES)equal(translatedCoopLoadoutMessageCount(language),COOP_LOADOUT_MESSAGE_COUNT,`${language} loadout catalog incomplete`);
console.log('coop loadout presentation OK');

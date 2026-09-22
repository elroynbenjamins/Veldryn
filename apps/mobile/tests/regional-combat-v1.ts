import {regionalGemIntelV1,SUNSCAR_REGIONAL_ENCOUNTERS_V1} from '../src/core/regional-combat-catalog-v1';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function deepEqual(actual:unknown,expected:unknown,message:string){if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)}

equal(SUNSCAR_REGIONAL_ENCOUNTERS_V1.length,5,'Five Sunscar regional combat lanes should be exposed');
equal(new Set(SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(row=>row.id)).size,5,'Regional combat encounter IDs must be unique');
deepEqual(SUNSCAR_REGIONAL_ENCOUNTERS_V1.map(row=>row.zoneId),['ZONE_006','ZONE_007','ZONE_008','ZONE_009','ZONE_010'],'Regional combat lanes must follow Sunscar zone order');
equal(SUNSCAR_REGIONAL_ENCOUNTERS_V1.filter(row=>row.kind==='regional_boss').length,1,'Exactly one Sunscar regional boss should be exposed');
equal(SUNSCAR_REGIONAL_ENCOUNTERS_V1.find(row=>row.kind==='regional_boss')?.contentId,'BOSS_002','The regional boss lane must target the Sand Tyrant');
ok(SUNSCAR_REGIONAL_ENCOUNTERS_V1.every(row=>row.level>=25&&row.level<=45),'Regional encounter level gates must stay inside Sunscar');
ok(SUNSCAR_REGIONAL_ENCOUNTERS_V1.filter(row=>row.kind==='elite').every(row=>row.zoneId!=='ZONE_006'&&row.zoneId!=='ZONE_010'),'Elite lanes must remain isolated from standard and boss pity sources');
const patrol=SUNSCAR_REGIONAL_ENCOUNTERS_V1[0],elite=SUNSCAR_REGIONAL_ENCOUNTERS_V1[1],boss=SUNSCAR_REGIONAL_ENCOUNTERS_V1[4];
equal(patrol.gemGrade,1,'Standard Sunscar combat should award Grade I gems');
equal(patrol.gemChance,.0075,'Standard Sunscar gem chance must match backend acquisition tuning');
equal(elite.pityAt,60,'Sunscar elite pity threshold must match backend settlement');
equal(boss.gemGrade,3,'Sand Tyrant should award Grade III gems');
equal(boss.pityAt,25,'Sand Tyrant pity threshold must match backend settlement');
equal(boss.recipeChance,.02,'Sand Tyrant recipe chance must match backend settlement');
equal(boss.catalystChance,.05,'Sand Tyrant catalyst chance must match backend settlement');
const eliteIntel=regionalGemIntelV1(elite,{ZONE_007:59});
equal(eliteIntel.misses,59,'Regional pity UI should read persisted account misses');
equal(eliteIntel.remaining,1,'59/60 elite pity must guarantee the next eligible victory');
equal(eliteIntel.progress,59/60,'Regional pity progress should be proportional to source threshold');
const noPity=regionalGemIntelV1(patrol,{ZONE_006:99});
equal(noPity.pityAt,undefined,'Standard encounter must remain independent-roll only');
equal(noPity.remaining,undefined,'Standard encounter must not show a fake guarantee');

console.log('PASS: Sunscar regional combat mobile catalog matches server encounter lanes');

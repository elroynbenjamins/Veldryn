import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=path.join(root,'apps/mobile');
function run(file,args=[],cwd=root){
 const result=spawnSync(process.execPath,[file,...args],{cwd,stdio:'inherit',windowsHide:true});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
run(path.join(app,'node_modules/typescript/lib/tsc.js'),['--noEmit'],app);
run(path.join(root,'tools/validate-localization-catalogs.mjs'));
run(path.join(root,'tools/validate-localization-boundaries.mjs'));
run(path.join(root,'tools/run-mobile-tests.mjs'),['localization','localization-foundation']);
for(const file of ['german-expedition-shop-localization.cjs','german-sanctuary-missions-localization.cjs','russian-sanctuary-missions-localization.cjs','german-companion-combat-names-localization.cjs','german-party-event-content-localization.cjs','german-party-surface-localization.cjs','german-social-management-localization.cjs','german-guild-identity-localization.cjs','russian-focus-localization.cjs','turkish-coverage.cjs','account-localization.cjs','recent-ui-localization.cjs','localization-creation-profile-focused.mjs','gameplay-localization-focused.mjs','progression-localization.cjs','quest-chapter-one-localization.cjs','quest-act-two-localization.cjs','quest-act-three-localization.cjs','quest-journal-ui-localization.cjs','seasonal-challenge-copy-localization.cjs','weekly-contract-copy-localization.cjs','quest-unlock-guidance-localization.cjs','companions-localization.cjs','coop-ru-tr-localization.cjs','guild-ru-tr-localization.cjs','guild-activity-ui-localization.cjs','guild-quest-authored-localization.cjs','guild-project-authored-localization.cjs','dungeon-encounter-preview-localization.cjs','seasonal-dungeon-localization.cjs','seasonal-dungeon-effects-localization.cjs','seasonal-dungeon-preview-route-localization.cjs','guild-flow-combat-ui-localization.cjs','party-progress-localization.cjs','live-dungeon-online-guild-localization.cjs','guild-hall-construction-localization.cjs','guild-bank-token-shop-localization.cjs','dungeon-dynamic-replay-localization.cjs','equipment-metadata-localization.cjs','starter-item-names-localization.cjs','gem-pouch-ui-localization.cjs','equipment-pouch-ui-localization.cjs','extended-item-names-localization.cjs','alchemy-item-names-localization.cjs','crafting-recipe-names-localization.cjs','localization-social.mjs']){
 run(path.join(app,'tests',file),[],app);
}
console.log('PASS: mobile localization checks');

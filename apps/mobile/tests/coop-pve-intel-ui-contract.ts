export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const choices=fs.readFileSync('src/components/coop/DungeonRouteChoices.tsx','utf8');
const overview=fs.readFileSync('src/components/coop/CoopRunOverview.tsx','utf8');
const presentation=fs.readFileSync('src/core/coop-presentation.ts','utf8');
const qmode=fs.readFileSync('src/core/coop-qmode.ts','utf8');
const events=fs.readFileSync('src/core/coop-event-expeditions.ts','utf8');

ok(overview.includes('DungeonRouteChoices')&&choices.includes('option.encounterPreview?.summary'),'Route choices must show authoritative PvE intel in the shared route card');
ok(choices.includes('numberOfLines={2}')&&choices.includes('s.preview'),'PvE intel must stay a compact limited-lines route hint');
ok(!choices.includes('option.encounterPreview.mechanics.map'),'Route list must not expand every mechanic into tutorial clutter');
ok(presentation.includes('rawArchetypes.length>2')&&presentation.includes('rawMechanics.length>4'),'Mobile preview parser must enforce compact payload limits');
ok(presentation.includes("throw new Error('invalid_encounter_preview')"),'Malformed PvE intel must fail closed');
ok(qmode.includes('parseCoopEncounterPreview(node.encounterPreview)'),'Q-Mode must parse sanitized server PvE intel');
ok(events.includes('parseCoopEncounterPreview(option.encounterPreview)'),'Seasonal runs must parse sanitized server PvE intel');
console.log('PASS compact authoritative PvE route intel UI');

import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';

const root='C:/Users/elroy/.codex/visualizations/2026/09/08/01a08101-ea0d-73a0-a05f-be723ad1a876';
const workbookPath=`${root}/Veldryn_Current_Classes_and_Equipment_Visuals.xlsx`;
const input=await FileBlob.load(workbookPath);
const workbook=await SpreadsheetFile.importXlsx(input);

if(!process.argv.includes('--edit')){
  const before=await workbook.render({sheetName:'Overview',range:'A1:C28',scale:1.5,format:'png'});
  await fs.writeFile(`${root}/catalog-before-retirement.png`,new Uint8Array(await before.arrayBuffer()));
  console.log((await workbook.inspect({kind:'table',range:'Overview!A1:C28',include:'values,formulas',tableMaxRows:28,tableMaxCols:3})).ndjson);
  console.log((await workbook.inspect({kind:'table',range:'Equipment Sets!A1:N36',include:'values,formulas',tableMaxRows:36,tableMaxCols:14})).ndjson);
  process.exit(0);
}

const overview=workbook.worksheets.getItem('Overview');
overview.getRange('B10').values=[[0]];
overview.getRange('C10').values=[['Retired because the character identities were incorrect; class emblems are the fallback']];
overview.getRange('B12').values=[[0]];
overview.getRange('C12').values=[['No complete character skin is currently approved for runtime']];
overview.getRange('B14').values=[[0]];
overview.getRange('C14').values=[['All previous character skins are retired; future skins require correct user-confirmed male and female references']];
overview.getRange('A17').values=[['“UI visual” means a runtime-registered class emblem or equipment icon sheet. “Skin appearance” means a full-body set appearance unlocked only after owning every required item in that set. Individual equipment never changes appearance. First-crafted sets are gameplay equipment only and grant no character skin.']];
overview.getRange('A21').values=[['Primary sources: apps/mobile/src/content/classes.ts; novice-sets.ts; equipment-sets.ts; theme/character-assets.ts; equipment-assets.ts; progression-set-assets.ts; docs/implementation/NOVICE_CHARACTER_SYSTEM.md']];
overview.getRange('B24').values=[[3]];
overview.getRange('B25').values=[[1]];
overview.getRange('C25').values=[['Correct male/female character references and full-skin remastering']];
overview.getRange('B27').values=[[0]];
overview.getRange('C27').values=[['No character skins are registered; equipment and UI visuals remain']];

const sets=workbook.worksheets.getItem('Equipment Sets');
const rows=sets.getRange('A6:N35').values;
sets.getRange('J6:J35').values=rows.map(()=>['No']);
sets.getRange('K6:K35').values=rows.map(()=>['—']);
sets.getRange('M6:M35').values=rows.map(()=>['Retired / not bundled']);
sets.getRange('N6:N35').values=rows.map((row,index)=>{
  if(index<9)return ['Gameplay equipment remains. Earlier first-crafted character art was retired because its identity was incorrect.'];
  return ['Equipment and UI artwork remain. Character skin is retired until rebuilt from correct user-confirmed male and female references.'];
});
sets.getRange('J36:N36').clear({applyTo:'contents'});

const gaps=workbook.worksheets.getItem('Gaps');
const gap009=['GAP-009','Balance','Starter and novice equipment','Prototype values','Dedicated balance review for basic weapons, recipe costs, and novice stats','Medium','Review pending','Progression values may not match the final economy','Review level 1-25 solo progression and approve or revise the provisional budgets'];
const gap010=['GAP-010','Asset metadata','16 non-novice set families','Availability recorded; provenance unknown','Per-asset source/generation method, version, approval owner, and approval date','Low','Documentation gap','The catalog cannot distinguish generated, extracted, or hand-edited visuals','Add a small asset manifest and link each full-skin and UI visual to its provenance record'];
gaps.getRange('A7:I9').values=[[
  'GAP-008','Visual identity','19 class sets and 2 shared progression skins',
  'All previous character skins are retired because their character references were incorrect. The corrected Rimewall female source is retained for a future rebuild.',
  'Obtain correct male and female references, then remaster and approve one complete set at a time.',
  'High','Remediation required','No full character skin is currently available.',
  'Require user-confirmed male/female references and a four-view identity check before runtime registration.'
],gap009,gap010];
gaps.getRange('A10:I13').clear({applyTo:'contents'});

workbook.recalculate();
for(const [sheetName,range,fileName] of [
  ['Overview','A1:C28','catalog-overview-retired.png'],
  ['Equipment Sets','A24:N35','catalog-equipment-retired.png'],
  ['Gaps','A1:I10','catalog-gaps-retired.png'],
]){
  const image=await workbook.render({sheetName,range,scale:1.5,format:'png'});
  await fs.writeFile(`${root}/${fileName}`,new Uint8Array(await image.arrayBuffer()));
}
console.log((await workbook.inspect({kind:'table',range:'Overview!A1:C28',include:'values,formulas',tableMaxRows:28,tableMaxCols:3})).ndjson);
console.log((await workbook.inspect({kind:'table',range:'Gaps!A1:I10',include:'values,formulas',tableMaxRows:10,tableMaxCols:9})).ndjson);
console.log((await workbook.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:300},summary:'final formula error scan'})).ndjson);
const output=await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);

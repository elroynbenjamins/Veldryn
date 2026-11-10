'use strict';
// Design-only World Boss round-script validator.
// This is NOT combat, server-authoritative event HP or a world boss activation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const base = path.join(root, 'docs/roadmap/spreadsheets');

function parseRow(line) {
  const fields=[]; let value='', quoted=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c==='"'){
      if(quoted && line[i+1]==='"'){ value+='"'; i++; }
      else quoted=!quoted;
    }else if(c===',' && !quoted){ fields.push(value); value=''; }
    else value+=c;
  }
  assert.equal(quoted,false,'unterminated CSV quote');
  fields.push(value);
  return fields;
}
function readCsv(filename){
  const lines=fs.readFileSync(path.join(base,filename),'utf8')
    .replace(/^\uFEFF/,'').trim().split(/\r?\n/);
  const keys=parseRow(lines.shift());
  return lines.map((line,i)=>{
    const cells=parseRow(line);
    assert.equal(cells.length,keys.length,filename+' CSV width at data line '+(i+2));
    return Object.fromEntries(keys.map((key,j)=>[key,cells[j]]));
  });
}

const specs=[
  {
    file:'world-bosses-hollowroot-rounds-v3.csv',
    phases:['I 100-70%','II 70-30%','III 30-0%'],
    phaseKey:'Phase', roundKey:'Round',kindKey:'Action type',
    actionKey:'Action', boss:'Hollowroot Colossus',version:3
  },
  {
    file:'world-bosses-sunscar-rounds-v5.csv',
    phases:['I Armored','II Exposed','III Enraged'],
    phaseKey:'Phase',roundKey:'Round',kindKey:'Type',
    actionKey:'Action ID',boss:'Sunscar Devourer',version:5
  },
  {
    file:'world-bosses-frostmarch-rounds-v5.csv',
    phases:['I Armored','II Exposed','III Enraged'],
    phaseKey:'Phase',roundKey:'Round',kindKey:'Type',
    actionKey:'Action ID',boss:'Frostmarch Warden',version:5
  },
];
let total=0,specialCount=0;
for(const spec of specs){
  const rows=readCsv(spec.file);
  assert.equal(rows.length,42,spec.boss+' must author 14 × 3 = 42 rounds');
  if(spec.version===5)for(const row of rows){
    assert.equal(row.Boss,spec.boss,'boss identity mismatch');
    assert.match(row.Status,/Proposed v5/, 'never label unimplemented v5 as released');
    assert.ok(row['Server effect proposal']?.length>15,'script needs server-effect description');
  }
  for(const phase of spec.phases){
    const entries=rows.filter(row=>row[spec.phaseKey]===phase);
    assert.equal(entries.length,14,spec.boss+' '+phase+' must have 14 authored rounds');
    for(let r=1;r<=14;r++){
      const item=entries[r-1];
      assert.equal(Number(item[spec.roundKey]),r,spec.boss+' '+phase+' wrong round index');
      const kind=item[spec.kindKey], name=item[spec.actionKey];
      assert.ok(name,'every round needs an action');
      if(kind==='Telegraph')assert.ok(r<14,'round 14 cannot open unresolved telegraph');
      if(kind==='Special'){
        assert.ok(r>1,'special cannot occur without an earlier cue');
        const prior=entries[r-2];
        assert.equal(prior[spec.kindKey],'Telegraph',name+' requires prior-round telegraph');
        if(spec.version===5)assert.equal(prior[spec.actionKey],name+'_TELL',name+' mismatched telegraph');
        specialCount++;
      }
      if(r===14)assert.equal(kind,'Finish',spec.boss+' last round must close encounter');
    }
  }
  total+=rows.length;
}
assert.equal(total,126,'three bosses × three phases × fourteen rounds');
console.log('WB_ROUND_SCRIPT_V5_OK='+JSON.stringify({bosses:3,phases:9,rounds:total,telegraphedSpecials:specialCount,designOnly:true}));

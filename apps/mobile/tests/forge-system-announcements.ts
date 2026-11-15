import {readForgeSystemAnnouncement} from '../src/core/forge-system-announcements';

function expect(actual:unknown,expected:unknown,label:string){
 if(actual!==expected)throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}
const base={display_name:'Drai',subject_name:'Sunvault Helm',detail:'Q87/100'};
for(const rarity of ['epic','legendary','mythic'] as const){
 const parsed=readForgeSystemAnnouncement({...base,kind:'forge_'+rarity});
 expect(parsed?.characterName,'Drai',rarity+' character name');
 expect(parsed?.equipmentName,'Sunvault Helm',rarity+' item name');
 expect(parsed?.rarity,rarity,rarity+' rarity');
 expect(parsed?.quality,87,rarity+' exact quality');
}
for(const rarity of ['common','uncommon','rare','unknown','']){
 expect(readForgeSystemAnnouncement({...base,kind:'forge_'+rarity}),null,rarity+' never gets an exceptional card');
}
expect(readForgeSystemAnnouncement({...base,kind:'forge_epic',detail:'Q0/100'})?.quality,0,'minimum quality');
expect(readForgeSystemAnnouncement({...base,kind:'forge_mythic',detail:'Q100/100'})?.quality,100,'perfect quality');
for(const detail of ['Q101/100','Q-1/100','Q1.5/100','Q05/100','87/100',null]){
 expect(readForgeSystemAnnouncement({...base,kind:'forge_epic',detail}),null,'invalid quality '+String(detail));
}
expect(readForgeSystemAnnouncement({...base,kind:'forge_epic',display_name:'  '}),null,'no anonymous forge entries');
expect(readForgeSystemAnnouncement({...base,kind:'forge_epic',subject_name:'  '}),null,'no unnamed equipment');
console.log('PASS exceptional forged equipment display parser');

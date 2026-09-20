import {profileAchievementPrestige,profileCollectionPrestige,profileRecordPrestige} from '../src/core/profile-prestige';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}
function ok(value:unknown,message:string){if(!value)fail(message)}

equal(profileAchievementPrestige('combatant_novice').tone,'standard','novice achievement uses standard presentation');
equal(profileAchievementPrestige('combatant_master').tone,'elite','master achievement uses elite presentation');
equal(profileAchievementPrestige('combatant_grandmaster').tone,'prestige','grandmaster achievement uses prestige presentation');
equal(profileAchievementPrestige('combatant_grandmaster').badge,'GRANDMASTER','achievement badge exposes authored tier');

const prestigeCompanion=profileCollectionPrestige({kind:'companion',id:'UNIT_012'});
equal(prestigeCompanion.tone,'prestige','prestige companion receives prestige presentation');
ok(prestigeCompanion.badge.includes('PRESTIGE'),'prestige companion badge names rarity');

const rareCompanion=profileCollectionPrestige({kind:'companion',id:'UNIT_004'});
equal(rareCompanion.tone,'rare','rare companion receives rare presentation');

const legendaryBackground=profileCollectionPrestige({kind:'background',id:'bg_grand_storehouse'});
equal(legendaryBackground.tone,'prestige','legendary event background receives prestige presentation');
ok(legendaryBackground.badge.includes('LEGENDARY'),'legendary background badge names rarity');

const epicBorder=profileCollectionPrestige({kind:'border',id:'frame_amber_vine'});
equal(epicBorder.tone,'elite','epic event border receives elite presentation');
ok(epicBorder.badge.includes('EPIC'),'epic border badge names rarity');

const standardItem=profileCollectionPrestige({kind:'item',id:'unknown_item'});
equal(standardItem.tone,'standard','unknown item safely falls back to standard presentation');

equal(profileRecordPrestige().tone,'record','personal records use record presentation');
equal(profileRecordPrestige().badge,'PERSONAL BEST','personal record badge is explicit');

console.log('PASS: profile showcase prestige presentation');

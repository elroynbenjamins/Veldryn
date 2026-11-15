import type {Language} from './languages';
import {accountText} from './account';
import {interpolateTranslation} from './translator';

/**
 * Source-checked German presentation for the server-authoritative Expedition Shop.
 * Never localize arbitrary server responses, player names or persisted offer IDs.
 */
export const germanDungeonShopCopy:Readonly<Record<string,string>>={
 'Expedition Marks':'Expeditionsmarken',
 'Permanent account currency':'Dauerhafte Kontowährung',
 'Shop not available yet':'Shop derzeit nicht verfügbar',
 'Refresh':'Aktualisieren',
 'Weekly supplies reset Monday 00:00 UTC. Permanent collectibles do not rotate.':'Wöchentliche Vorräte werden montags um 00:00 UTC zurückgesetzt. Dauerhafte Sammlerstücke wechseln nicht.',
 'Supplies':'Vorräte',
 'Collections':'Sammlerstücke',
 'Owned':'Im Besitz',
 'Unable to refresh the Dungeon Shop. Please retry.':'Dungeon-Shop konnte nicht aktualisiert werden. Bitte versuche es erneut.',
 'Purchase confirmed. Refresh to view your balance and reward.':'Kauf bestätigt. Aktualisiere den Shop, um dein Guthaben und deine Belohnung zu sehen.',
 'Already owned. No Marks spent.':'Bereits im Besitz. Keine Marken ausgegeben.',
 'Purchase confirmed, but refresh failed. Reopen the shop to synchronize your account.':'Kauf bestätigt, aber die Aktualisierung ist fehlgeschlagen. Öffne den Shop erneut, um dein Konto zu synchronisieren.',
 'Unable to confirm purchase. Refresh before retrying.':'Kauf konnte nicht bestätigt werden. Aktualisiere den Shop vor einem erneuten Versuch.',
 'The server has not supplied a verified Dungeon Shop catalogue.':'Der Server hat noch keinen bestätigten Dungeon-Shop-Katalog bereitgestellt.',
 'Dungeon Shop is being prepared. Purchases are unavailable.':'Der Dungeon-Shop wird vorbereitet. Käufe sind derzeit nicht möglich.',
 'Processing purchase':'Kauf wird verarbeitet',
 'Not available yet':'Noch nicht verfügbar',
 'Available':'Verfügbar',
 'Preview only':'Nur Vorschau',
 'Need more Marks':'Mehr Marken benötigt',
 'Region locked':'Region gesperrt',
 'Weekly limit reached':'Wochenlimit erreicht',
 'Coming soon':'Demnächst verfügbar',
 'Owned permanently':'Dauerhaft im Besitz',
 '{count} purchases left this UTC week':'Diese UTC-Woche noch {count} Käufe möglich',
 'Processing…':'Wird verarbeitet …',
 'Confirm purchase · {marks} Marks':'Kauf bestätigen · {marks} Marken',
 'Not enough Expedition Marks.':'Nicht genügend Expeditionsmarken.',
 'No offers in this category yet.':'In dieser Kategorie gibt es noch keine Angebote.',
 '{name}, {marks} Expedition Marks, {status}':'{name}, {marks} Expeditionsmarken, {status}',
 'Shop preview only — no purchases are available.':'Nur Shop-Vorschau – Käufe sind nicht möglich.',
 'Not yet released — no Marks can be spent on this offer.':'Noch nicht freigeschaltet – für dieses Angebot können keine Marken ausgegeben werden.',
 'The Expedition Shop is temporarily unavailable.':'Der Expeditionsshop ist vorübergehend nicht verfügbar.',
 'Purchase confirmed. Reopen your inventory to refresh rewards.':'Kauf bestätigt. Öffne dein Inventar erneut, um die Belohnungen zu aktualisieren.',
 '‹ Back to Dungeons':'‹ Zurück zu den Dungeons',
 'Loading Expedition Shop…':'Expeditionsshop wird geladen …',
 'Rare':'Selten',
 'Epic':'Episch',
 'supply':'Vorrat',
 'companion':'Begleiter',
 'icon':'Profilsymbol',
 'border':'Rahmen',
 'background':'Hintergrund',
 'pet':'Haustier',
 'Profile icon · visual only':'Profilsymbol · nur optisch',
};

/** Translate only the exact English name tied to its immutable catalogue ID. */
export const germanDungeonShopOfferNames:Readonly<Record<string,readonly [string,string]>>={
 dshop_tempering_satchel:['Delver Tempering Satchel','Härtestaubbeutel des Erkunders'],
 dshop_gem_dust_cache:['Gem Dust Cache','Edelsteinstaub-Vorrat'],
 dshop_tempering_core_cache:['Tempering Core Cache','Härtekern-Vorrat'],
 dshop_companion_essence:['Companion Essence Cache','Begleiteressenz-Vorrat'],
 dshop_bondstone:['Bondstone','Bindungsstein'],
 dshop_asterfall_icon:["Warden's Lantern",'Wächterlaterne'],
 dshop_asterfall_border:['Briarbound Frame','Dornengebundener Rahmen'],
 dshop_asterfall_background:['Rootbound Sanctuary','Wurzelgebundenes Heiligtum'],
 dshop_asterfall_pet:['Oathroot Seedling','Eidwurzel-Spross'],
 dshop_sunscar_icon:['Solar Vault Key','Schlüssel zum Sonnengewölbe'],
 dshop_sunscar_border:['Amberglass Loop','Bernsteinglas-Rahmen'],
 dshop_sunscar_background:['Buried Observatory','Verschüttetes Observatorium'],
 dshop_sunscar_pet:['Vaultscarab','Gewölbeskarabäus'],
 dshop_frostmarch_icon:['Resonant Bell','Resonanzglocke'],
 dshop_frostmarch_border:['Frostbound Chime','Frostgebundenes Glockenspiel'],
 dshop_frostmarch_background:['Shiverlake Reflections','Spiegelungen des Zittersees'],
 dshop_frostmarch_pet:['Choirbell Sprite','Chorglocken-Wicht'],
};

export function dungeonShopText(language:Language,source:string,params:Record<string,string|number>={}):string{
 if(language==='de'&&Object.prototype.hasOwnProperty.call(germanDungeonShopCopy,source))
  return interpolateTranslation(germanDungeonShopCopy[source],params);
 return accountText(language,source,params);
}

export function dungeonShopOfferName(language:Language,id:string,source:string):string{
 const known=germanDungeonShopOfferNames[id];
 return language==='de'&&known?.[0]===source?known[1]:source;
}

const materialNames:Readonly<Record<string,string>>={
 'TEMPERING DUST':'Härtungsstaub',
 'GEM DUST':'Edelsteinstaub',
 'TEMPERING CORE':'Härtekern',
};
/** Only these reviewed server bonus identifiers are converted to display labels. */
const bonusNames:Readonly<Record<string,Readonly<Record<Language,string>>>>={
 craftingSpeed:{en:'Crafting speed',de:'Herstellungsgeschwindigkeit',es:'Velocidad de fabricación',nl:'Productiesnelheid',it:'Velocità di creazione',fr:'Vitesse de fabrication',ru:'Скорость изготовления',tr:'Üretim hızı'},
 skillXp:{en:'Skill XP',de:'Fertigkeits-EP',es:'Experiencia de habilidades',nl:'Vaardigheids-XP',it:'PE abilità',fr:'XP de compétence',ru:'Опыт навыков',tr:'Beceri XP'},
 dropChance:{en:'Drop chance',de:'Beutechance',es:'Probabilidad de botín',nl:'Dropkans',it:'Probabilità di bottino',fr:'Chances de butin',ru:'Шанс добычи',tr:'Düşürme şansı'},
 gatheringYield:{en:'Gathering yield',de:'Sammelertrag',es:'Rendimiento de recolección',nl:'Verzamelopbrengst',it:'Resa di raccolta',fr:'Rendement de récolte',ru:'Объём сбора',tr:'Toplama verimi'},
 hp:{en:'Health',de:'Lebenspunkte',es:'Salud',nl:'Levenspunten',it:'Salute',fr:'Points de vie',ru:'Здоровье',tr:'Can'},
 healingEffectiveness:{en:'Healing effectiveness',de:'Heilwirkung',es:'Eficacia de curación',nl:'Genezingseffectiviteit',it:'Efficacia delle cure',fr:'Efficacité des soins',ru:'Эффективность лечения',tr:'İyileştirme etkisi'},
 fishingSpeed:{en:'Fishing speed',de:'Angelgeschwindigkeit',es:'Velocidad de pesca',nl:'Vissnelheid',it:'Velocità di pesca',fr:'Vitesse de pêche',ru:'Скорость рыбалки',tr:'Balık tutma hızı'},
 defense:{en:'Defense',de:'Verteidigung',es:'Defensa',nl:'Verdediging',it:'Difesa',fr:'Défense',ru:'Защита',tr:'Savunma'},
 actionSpeed:{en:'Action speed',de:'Aktionsgeschwindigkeit',es:'Velocidad de acción',nl:'Actiesnelheid',it:"Velocità d'azione",fr:"Vitesse d'action",ru:'Скорость действий',tr:'Eylem hızı'},
};
const bonusContext:Readonly<Record<Language,Readonly<{equipped:string;owned:string}>>>={
 en:{equipped:'when equipped',owned:'while owned'},
 de:{equipped:'ausgerüstet',owned:'im Besitz'},
 es:{equipped:'al equipar',owned:'al poseer'},
 nl:{equipped:'uitgerust',owned:'in bezit'},
 it:{equipped:'quando equipaggiato',owned:'quando posseduto'},
 fr:{equipped:'si équipé',owned:'si possédé'},
 ru:{equipped:'при экипировке',owned:'при владении'},
 tr:{equipped:'kuşanıldığında',owned:'sahip olunduğunda'},
};
const bonusSummaryPattern=/^\+ ([0-9]+(?:\.[0-9]{1,2})?)% (craftingSpeed|skillXp|dropChance|gatheringYield|hp|healingEffectiveness|fishingSpeed|defense|actionSpeed) equipped; \+([0-9]+(?:\.[0-9]{1,2})?)% owned$/;

/** Decode only reviewed catalogue summary formats; raw stat IDs are never UI copy. */
export function dungeonShopOfferSummary(language:Language,source:string):string{
 const bonus=bonusSummaryPattern.exec(source);
 if(bonus){
  const label=bonusNames[bonus[2]]?.[language];
  if(label){
   const percent=(value:string)=>language==='en'?value:value.replace('.',',');
   const context=bonusContext[language];
   return '+'+percent(bonus[1])+'% '+label+' ('+context.equipped+'); +'+percent(bonus[3])+'% ('+context.owned+')';
  }
 }
 if(language==='de'){
  const material=/^(\d+) × (TEMPERING DUST|GEM DUST|TEMPERING CORE)$/.exec(source);
  if(material)return material[1]+' × '+materialNames[material[2]];
  const essence=/^(\d+) (Bondstones|Companion Essence)$/.exec(source);
  if(essence)return essence[1]+' '+(essence[2]==='Bondstones'?(essence[1]==='1'?'Bindungsstein':'Bindungssteine'):'Begleiteressenz');
 }
 return dungeonShopText(language,source);
}

/** Preserve unknown server lock reasons verbatim. */
export function dungeonShopLockReason(language:Language,source:string):string{
 if(language!=='de')return source;
 const region=/^Clear a (Asterfall|Sunscar|Frostmarch) dungeon first\.$/.exec(source);
 return region?'Schließe zuerst einen Dungeon in '+region[1]+' ab.':dungeonShopText(language,source);
}

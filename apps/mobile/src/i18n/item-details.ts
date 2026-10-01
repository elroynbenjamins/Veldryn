import {createSourceTranslator,type TranslationRow} from './source-catalog';
import type {Language} from './languages';

export const itemDetailRows={
 'gear':['Ausrüstung','Equipo','Uitrusting','Equipaggiamento','Équipement'],
 'tool':['Werkzeug','Herramienta','Gereedschap','Attrezzo','Outil'],
 'food':['Nahrung','Comida','Voedsel','Cibo','Nourriture'],
 'gem':['Edelstein','Gema','Edelsteen','Gemma','Gemme'],
 'material':['Material','Material','Materiaal','Materiale','Matériau'],
 'weapon':['Waffe','Arma','Wapen','Arma','Arme'],
 'equipment':['Ausrüstung','Equipo','Uitrusting','Equipaggiamento','Équipement'],
 'common':['Gewöhnlich','Común','Gewoon','Comune','Commun'],
 'uncommon':['Ungewöhnlich','Poco común','Ongewoon','Non comune','Peu commun'],
 'rare':['Selten','Raro','Zeldzaam','Raro','Rare'],
 'epic':['Episch','Épico','Episch','Epico','Épique'],
 'legendary':['Legendär','Legendario','Legendarisch','Leggendario','Légendaire'],
 'mythic':['Mythisch','Mítico','Mythisch','Mitico','Mythique'],
 'Attack':['Angriff','Ataque','Aanval','Attacco','Attaque'],
 'Defense':['Verteidigung','Defensa','Verdediging','Difesa','Défense'],
 'Hp':['LP','PV','LP','PV','PV'],
 'ATK':['ANG','ATQ','AAN','ATT','ATQ'],
 'DEF':['VER','DEF','VER','DIF','DÉF'],
 'HP':['LP','PV','LP','PV','PV'],
 'PWR':['KRAFT','POD','KRACHT','POT','PUIS'],
 'Owned · {total} total · {carried} carried · {banked} banked':['Besitz · {total} gesamt · {carried} im Inventar · {banked} in der Bank','En propiedad · {total} en total · {carried} en inventario · {banked} en el banco','In bezit · {total} totaal · {carried} bij je · {banked} in de bank','Posseduti · {total} totali · {carried} in inventario · {banked} in banca','Possédés · {total} au total · {carried} en inventaire · {banked} en banque'],
 'Empty {slot} slot':['Leerer Platz: {slot}','Espacio vacío: {slot}','Leeg vak: {slot}','Slot vuoto: {slot}','Emplacement vide : {slot}'],
 'After equip · ATK {attack} · DEF {defense} · HP {hp} · PWR {power}':['Nach Ausrüsten · ANG {attack} · VER {defense} · LP {hp} · KRAFT {power}','Al equipar · ATQ {attack} · DEF {defense} · PV {hp} · POD {power}','Na uitrusten · AAN {attack} · VER {defense} · LP {hp} · KRACHT {power}','Dopo equipaggiamento · ATT {attack} · DIF {defense} · PV {hp} · POT {power}','Après équipement · ATQ {attack} · DÉF {defense} · PV {hp} · PUIS {power}'],
 'TO +{rank} FROM CURRENT RANK':['VOM AKTUELLEN RANG AUF +{rank}','DEL RANGO ACTUAL A +{rank}','VAN HUIDIGE RANG NAAR +{rank}','DAL GRADO ATTUALE A +{rank}','DU RANG ACTUEL À +{rank}'],
 '{pieces} pieces · {bonus}':['{pieces} Teile · {bonus}','{pieces} piezas · {bonus}','{pieces} delen · {bonus}','{pieces} pezzi · {bonus}','{pieces} pièces · {bonus}'],
 'Next · {pieces} pieces · {bonus}':['Nächster Bonus · {pieces} Teile · {bonus}','Siguiente · {pieces} piezas · {bonus}','Volgende · {pieces} delen · {bonus}','Prossimo · {pieces} pezzi · {bonus}','Suivant · {pieces} pièces · {bonus}'],
 'HOOK':['AUSLÖSER','ACTIVADOR','TRIGGER','ATTIVATORE','DÉCLENCHEUR'],
 '2/4/8/10 always-on V33 bonuses are live in stats/combat. 6pc conditional text is preserved as a trigger hook until its exact skill/ally/barrier event exists.':['Die dauerhaften V33-Boni für 2/4/8/10 Teile wirken auf Werte und Kampf. Der bedingte 6-Teile-Bonus ist vorgemerkt, bis das passende Fertigkeits-, Verbündeten- oder Barrierenereignis verfügbar ist.','Los bonos permanentes V33 de 2/4/8/10 piezas se aplican a estadísticas y combate. El bono condicional de 6 piezas queda pendiente hasta que exista su evento de habilidad, aliado o barrera.','De permanente V33-bonussen voor 2/4/8/10 delen werken in statistieken en gevechten. De voorwaardelijke bonus voor 6 delen wacht op de bijbehorende vaardigheids-, bondgenoot- of barrièregebeurtenis.','I bonus permanenti V33 da 2/4/8/10 pezzi sono attivi nelle statistiche e in combattimento. Il bonus condizionale da 6 pezzi resta in attesa del relativo evento di abilità, alleato o barriera.','Les bonus permanents V33 de 2/4/8/10 pièces sont actifs dans les statistiques et les combats. Le bonus conditionnel de 6 pièces reste en attente de son événement de compétence, allié ou barrière.'],
 '{skill} · Character Lv {level} · {gold} gold':['{skill} · Charakterstufe {level} · {gold} Gold','{skill} · Personaje niv. {level} · {gold} de oro','{skill} · Personageniveau {level} · {gold} goud','{skill} · Personaggio liv. {level} · {gold} oro','{skill} · Personnage niv. {level} · {gold} or'],
 'BLOCKERS: {count}':['HINDERNISSE: {count}','OBSTÁCULOS: {count}','BLOKKADES: {count}','OSTACOLI: {count}','OBSTACLES : {count}'],
 'Find {item}':['{item} finden','Buscar {item}','{item} vinden','Trova {item}','Trouver {item}'],
 '{count} missing · {source}':['{count} fehlen · {source}','Faltan {count} · {source}','{count} ontbreken · {source}','Ne mancano {count} · {source}','{count} manquants · {source}'],
 '{owned}/{required} owned':['{owned}/{required} im Besitz','{owned}/{required} en propiedad','{owned}/{required} in bezit','{owned}/{required} posseduti','{owned}/{required} possédés'],
 'Current +{rank}':['Aktuell +{rank}','Actual +{rank}','Huidig +{rank}','Attuale +{rank}','Actuel +{rank}'],
 'Next attempt · {gold} gold · {dust} × Tempering Dust':['Nächster Versuch · {gold} Gold · {dust} × Tempering Dust','Siguiente intento · {gold} de oro · {dust} × Tempering Dust','Volgende poging · {gold} goud · {dust} × Tempering Dust','Prossimo tentativo · {gold} oro · {dust} × Tempering Dust','Prochaine tentative · {gold} or · {dust} × Tempering Dust'],
 'Pity bonus active · failed attempts: {count}.':['Ausgleichsbonus aktiv · Fehlversuche: {count}.','Bono de compensación activo · intentos fallidos: {count}.','Compensatiebonus actief · mislukte pogingen: {count}.','Bonus di compensazione attivo · tentativi falliti: {count}.','Bonus de compensation actif · tentatives échouées : {count}.'],
 '{filled}/{capacity} filled · 1 Stat + 1 Effect':['{filled}/{capacity} belegt · 1 Wert + 1 Effekt','{filled}/{capacity} ocupados · 1 estadística + 1 efecto','{filled}/{capacity} gevuld · 1 statistiek + 1 effect','{filled}/{capacity} occupati · 1 statistica + 1 effetto','{filled}/{capacity} occupés · 1 statistique + 1 effet'],
 'Stat · {gem}':['Wert · {gem}','Estadística · {gem}','Statistiek · {gem}','Statistica · {gem}','Statistique · {gem}'],
 'Effect · {gem}':['Effekt · {gem}','Efecto · {gem}','Effect · {gem}','Effetto · {gem}','Effet · {gem}'],
 'Hide other sources for {item}':['Weitere Quellen für {item} ausblenden','Ocultar otras fuentes de {item}','Andere bronnen voor {item} verbergen','Nascondi altre fonti di {item}','Masquer les autres sources de {item}'],
 'Show other sources for {item}':['Weitere Quellen für {item} anzeigen','Mostrar otras fuentes de {item}','Andere bronnen voor {item} tonen','Mostra altre fonti di {item}','Afficher les autres sources de {item}'],
 'Other sources · {count}':['Weitere Quellen · {count}','Otras fuentes · {count}','Andere bronnen · {count}','Altre fonti · {count}','Autres sources · {count}'],
 'Open {name}':['{name} öffnen','Abrir {name}','{name} openen','Apri {name}','Ouvrir {name}'],
 '{skill} Lv {level} · needs {quantity}':['{skill} St. {level} · benötigt {quantity}','{skill} niv. {level} · requiere {quantity}','{skill} niv. {level} · vereist {quantity}','{skill} liv. {level} · richiede {quantity}','{skill} niv. {level} · nécessite {quantity}'],
 'More recipes: {count}':['Weitere Rezepte: {count}','Más recetas: {count}','Meer recepten: {count}','Altre ricette: {count}','Autres recettes : {count}'],
 'Sell value · {gold} gold each':['Verkaufswert · je {gold} Gold','Valor de venta · {gold} de oro por unidad','Verkoopwaarde · {gold} goud per stuk','Valore di vendita · {gold} oro ciascuno','Valeur de vente · {gold} or par unité'],
 'PRIMARY':['HAUPTQUELLE','PRINCIPAL','PRIMAIR','PRINCIPALE','PRINCIPALE'],
 '{type} source: {name}':['Quelle ({type}): {name}','Fuente ({type}): {name}','Bron ({type}): {name}','Fonte ({type}): {name}','Source ({type}) : {name}'],
 'Starting equipment':['Startausrüstung','Equipo inicial','Beginuitrusting','Equipaggiamento iniziale','Équipement de départ'],
 'Granted by a matching class loadout.':['Teil der Startausrüstung einer passenden Klasse.','Se otorga con el equipo de una clase compatible.','Onderdeel van de uitrusting van een passende klasse.','Fornito con l’equipaggiamento di una classe compatibile.','Fourni avec l’équipement d’une classe compatible.'],
 'Requires character Lv {level}':['Erfordert Charakterstufe {level}','Requiere personaje de niv. {level}','Vereist personageniveau {level}','Richiede personaggio di liv. {level}','Nécessite un personnage de niv. {level}'],
 'Readiness +{value}':['Bereitschaft +{value}','Preparación +{value}','Paraatheid +{value}','Preparazione +{value}','Préparation +{value}'],
 'Restores {value} HP':['Stellt {value} LP wieder her','Restaura {value} PV','Herstelt {value} LP','Ripristina {value} PV','Restaure {value} PV'],
 '{skill} tool · Tier {tier}':['Werkzeug für {skill} · Stufe {tier}','Herramienta de {skill} · Categoría {tier}','Gereedschap voor {skill} · Klasse {tier}','Attrezzo per {skill} · Fascia {tier}','Outil de {skill} · Palier {tier}'],
 '{value}% shorter base action time':['{value}% kürzere Basisaktionszeit','Tiempo base de acción un {value}% menor','{value}% kortere basisactietijd','Tempo base d’azione ridotto del {value}%','Durée de base des actions réduite de {value} %'],
 'Baseline action time':['Basisaktionszeit','Tiempo base de acción','Basisactietijd','Tempo base d’azione','Durée de base des actions'],
 'Stat Gem · +{value}% {stat} when socketed':['Werteedelstein · +{value}% {stat} beim Einsetzen','Gema de estadística · +{value}% {stat} al engarzar','Statistiekedelsteen · +{value}% {stat} na plaatsen','Gemma statistica · +{value}% {stat} se incastonata','Gemme de statistique · +{value} % {stat} une fois sertie'],
 'Effect Gem · {effect}':['Effektedelstein · {effect}','Gema de efecto · {effect}','Effectedelsteen · {effect}','Gemma effetto · {effect}','Gemme d’effet · {effect}'],
 'Salvage: {quantity}× {item}':['Verwertung: {quantity}× {item}','Desguace: {quantity}× {item}','Ontmantelen: {quantity}× {item}','Recupero: {quantity}× {item}','Recyclage : {quantity}× {item}'],
 '{skill} Lv {level} · {gold} gold':['{skill} St. {level} · {gold} Gold','{skill} niv. {level} · {gold} de oro','{skill} niv. {level} · {gold} goud','{skill} liv. {level} · {gold} oro','{skill} niv. {level} · {gold} or'],
 '{skill} Lv {level} · {region}':['{skill} St. {level} · {region}','{skill} niv. {level} · {region}','{skill} niv. {level} · {region}','{skill} liv. {level} · {region}','{skill} niv. {level} · {region}'],
 '{region} · Lv {level} · {chance} drop':['{region} · St. {level} · {chance} Beutechance','{region} · niv. {level} · {chance} de botín','{region} · niv. {level} · {chance} buitkans','{region} · liv. {level} · {chance} bottino','{region} · niv. {level} · {chance} de butin'],
 'Open {name} in {region}.':['{name} in {region} öffnen.','Abrir {name} en {region}.','{name} in {region} openen.','Apri {name} in {region}.','Ouvrir {name} dans {region}.'],
 'Open {name}.':['{name} öffnen.','Abrir {name}.','{name} openen.','Apri {name}.','Ouvrir {name}.'],
} as const satisfies Record<string,TranslationRow>;

export const itemDetailText=createSourceTranslator(itemDetailRows);

// These patterns apply only to authored inspector descriptions, never item names.
const patterns:ReadonlyArray<readonly [RegExp,keyof typeof itemDetailRows,readonly string[]]>=[
 [/^Requires character Lv (\d+)$/,'Requires character Lv {level}',['level']],
 [/^Readiness \+(\d+)$/,'Readiness +{value}',['value']],
 [/^Restores (\d+) HP$/,'Restores {value} HP',['value']],
 [/^(.+) tool · Tier (\d+)$/,'{skill} tool · Tier {tier}',['skill','tier']],
 [/^(\d+)% shorter base action time$/,'{value}% shorter base action time',['value']],
 [/^Stat Gem · \+(\d+)% (.+) when socketed$/,'Stat Gem · +{value}% {stat} when socketed',['value','stat']],
 [/^Effect Gem · (.+)$/,'Effect Gem · {effect}',['effect']],
 [/^Salvage: (\d+)× (.+)$/,'Salvage: {quantity}× {item}',['quantity','item']],
 [/^(.+) Lv (\d+) · (\d+) gold$/,'{skill} Lv {level} · {gold} gold',['skill','level','gold']],
 [/^(.+) · Lv (\d+) · ([\d.]+%) drop$/,'{region} · Lv {level} · {chance} drop',['region','level','chance']],
 [/^(.+) Lv (\d+) · (.+)$/,'{skill} Lv {level} · {region}',['skill','level','region']],
 [/^Open (.+) in (.+)\.$/,'Open {name} in {region}.',['name','region']],
 [/^Open (.+)\.$/,'Open {name}.',['name']],
];
export function itemDetailContent(language:Language,value:string,localize:(value:string)=>string):string{
 if(Object.prototype.hasOwnProperty.call(itemDetailRows,value))return itemDetailText(language,value);
 const label=Object.keys(itemDetailRows).find(key=>!key.includes('{')&&key.toLowerCase()===value.toLowerCase());
 if(label)return itemDetailText(language,label);
 for(const [pattern,key,names] of patterns){
  const match=pattern.exec(value);
  if(!match)continue;
  const params:Record<string,string>={};
  names.forEach((name,index)=>{params[name]=['skill','stat','effect'].includes(name)?itemDetailContent(language,match[index+1],localize):match[index+1];});
  return itemDetailText(language,key,params);
 }
 return localize(value);
}

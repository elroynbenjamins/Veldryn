import {createSourceTranslator,type TranslationRow} from './source-catalog';
import type {Language} from './languages';
import type {MealBonusDefinition} from '../core/meal-buffs';

export const craftingDetailRows={
 'Same meal extends duration up to {hours}h.':["Dieselbe Mahlzeit verlängert die Dauer auf bis zu {hours} Std.","La misma comida prolonga la duración hasta {hours} h.","Dezelfde maaltijd verlengt de duur tot {hours}u.","Lo stesso pasto estende la durata fino a {hours} ore.","Le même repas prolonge la durée jusqu’à {hours} h."],
 'After eating: {minutes} min':["Nach dem Essen: {minutes} Min.","Tras comer: {minutes} min","Na het eten: {minutes} min","Dopo il pasto: {minutes} min","Après le repas : {minutes} min"],
 'Meal duration full':["Mahlzeitdauer voll","Duración de comida al máximo","Maaltijdduur maximaal","Durata pasto al massimo","Durée du repas maximale"],
 'Next equipment tier':['Nächste Ausrüstungsstufe','Siguiente nivel de equipo','Volgende uitrustingsniveau','Prossimo livello di equipaggiamento','Prochain palier d’équipement'],
 'No active mastery bonus yet':['Noch kein aktiver Meisterschaftsbonus','Aún no hay bonos de maestría activos','Nog geen actieve meesterschapsbonus','Nessun bonus maestria attivo','Aucun bonus de maîtrise actif'],
 '+{value}% skill XP':['+{value}% Fertigkeits-EP','+{value}% EXP de habilidad','+{value}% vaardigheids-XP','+{value}% ESP abilità','+{value} % EXP de compétence'],
 '+{value}% XP':['+{value}% EP','+{value}% EXP','+{value}% XP','+{value}% ESP','+{value} % EXP'],
 '+{value}% yield':['+{value}% Ertrag','+{value}% rendimiento','+{value}% opbrengst','+{value}% resa','+{value} % rendement'],
 '+{value}% speed':['+{value}% Tempo','+{value}% velocidad','+{value}% snelheid','+{value}% velocità','+{value} % vitesse'],
 '+{value}% action speed':['+{value}% Aktionstempo','+{value}% velocidad de acción','+{value}% actiesnelheid','+{value}% velocità d’azione','+{value} % vitesse d’action'],
 'Unlocks at {skill} level {level}':['Wird mit {skill} Stufe {level} freigeschaltet','Se desbloquea con {skill} nivel {level}','Ontgrendeld bij {skill} niveau {level}','Si sblocca con {skill} livello {level}','Débloqué avec {skill} niveau {level}'],
 'Requires character level {level}':['Erfordert Charakterstufe {level}','Requiere personaje de nivel {level}','Vereist personageniveau {level}','Richiede personaggio di livello {level}','Nécessite un personnage de niveau {level}'],
 'Makes {count} · Costs {gold} Gold':['Ergibt {count} · Kostet {gold} Gold','Produce {count} · Cuesta {gold} de oro','Maakt {count} · Kost {gold} goud','Produce {count} · Costa {gold} oro','Produit {count} · Coûte {gold} or'],
 '+{value}% Gathering speed':['+{value}% Sammeltempo','+{value}% velocidad de recolección','+{value}% verzamelsnelheid','+{value}% velocità di raccolta','+{value} % vitesse de récolte'],
 '+{value}% Crafting speed':['+{value}% Herstellungstempo','+{value}% velocidad de fabricación','+{value}% productiesnelheid','+{value}% velocità di creazione','+{value} % vitesse de fabrication'],
 '+{value}% Combat XP':['+{value}% Kampf-EP','+{value}% EXP de combate','+{value}% gevechts-XP','+{value}% ESP combattimento','+{value} % EXP de combat'],
 '+{value}% Non-combat skill speed':['+{value}% Tempo für Nichtkampf-Fertigkeiten','+{value}% velocidad de habilidades no bélicas','+{value}% snelheid buiten gevecht','+{value}% velocità delle abilità non di combattimento','+{value} % vitesse des compétences hors combat'],
 'Cooking mastered · no more XP':['Kochen gemeistert · keine weiteren EP','Cocina al máximo · sin más EXP','Koken maximaal · geen XP meer','Cucina al massimo · niente più ESP','Cuisine maîtrisée · plus d’EXP'],
 'Current cooking run uses the XP rate reserved when it started.':['Der aktuelle Kochdurchlauf verwendet die beim Start festgelegte EP-Rate.','La tanda actual utiliza la EXP fijada al iniciarla.','De huidige kookronde gebruikt de XP die bij de start is vastgelegd.','Il lotto in corso usa l’ESP fissata all’avvio.','La préparation en cours utilise le taux d’EXP fixé au démarrage.'],
 'Activate meal buffs from Inventory. Auto-eat only restores HP.':['Mahlzeitenboni im Inventar aktivieren. Automatisches Essen stellt nur LP wieder her.','Activa los bonos de comida en el inventario. Comer automáticamente solo restaura PV.','Activeer maaltijdbonussen in Inventaris. Automatisch eten herstelt alleen HP.','Attiva i bonus pasto dall’inventario. Il cibo automatico ripristina solo i PS.','Activez les bonus de repas depuis l’inventaire. L’alimentation automatique ne soigne que les PV.'],
 '+{xp} Cooking XP per batch':['+{xp} Koch-EP pro Durchgang','+{xp} EXP de cocina por tanda','+{xp} Kook-XP per batch','+{xp} ESP cucina per lotto','+{xp} EXP de cuisine par lot'],
 'Cost {gold} Gold':['Kosten: {gold} Gold','Coste: {gold} de oro','Kosten: {gold} goud','Costo: {gold} oro','Coût : {gold} or'],
 'Makes {count} · +{xp} XP · {gold} Gold':['Ergibt {count} · +{xp} EP · {gold} Gold','Produce {count} · +{xp} EXP · {gold} oro','Maakt {count} · +{xp} XP · {gold} goud','Produce {count} · +{xp} ESP · {gold} oro','Produit {count} · +{xp} EXP · {gold} or'],
 '{ready}/{total} materials ready':['{ready}/{total} Materialien bereit','{ready}/{total} materiales listos','{ready}/{total} materialen gereed','{ready}/{total} materiali pronti','{ready}/{total} matériaux prêts'],
 'Cost {gold} Gold · +{xp} skill XP':['Kosten: {gold} Gold · +{xp} Fertigkeits-EP','Coste: {gold} oro · +{xp} EXP de habilidad','Kosten: {gold} goud · +{xp} vaardigheids-XP','Costo: {gold} oro · +{xp} ESP abilità','Coût : {gold} or · +{xp} EXP de compétence'],
 'NEXT LV ~{time}':['NÄCHSTE ST. ~{time}','SIGUIENTE NIV. ~{time}','VOLGEND NIV. ~{time}','PROSSIMO LIV. ~{time}','PROCHAIN NIV. ~{time}'],
 '~{batches} actions/hr · {output} {item}/hr · {xp} XP/hr':['~{batches} Aktionen/Std. · {output} {item}/Std. · {xp} EP/Std.','~{batches} acciones/h · {output} {item}/h · {xp} EXP/h','~{batches} acties/uur · {output} {item}/uur · {xp} XP/uur','~{batches} azioni/h · {output} {item}/h · {xp} ESP/h','~{batches} actions/h · {output} {item}/h · {xp} EXP/h'],
 '{xp} XP to {skill} {level}':['{xp} EP bis {skill} {level}','{xp} EXP hasta {skill} {level}','{xp} XP tot {skill} {level}','{xp} ESP a {skill} {level}','{xp} EXP avant {skill} {level}'],
 '{points}/{required} actions to next rank':['{points}/{required} Aktionen zum nächsten Rang','{points}/{required} acciones para el siguiente rango','{points}/{required} acties tot de volgende rang','{points}/{required} azioni al prossimo grado','{points}/{required} actions avant le prochain rang'],
 'Next bonus · R{rank} {bonus}':['Nächster Bonus · R{rank} {bonus}','Siguiente bono · R{rank} {bonus}','Volgende bonus · R{rank} {bonus}','Prossimo bonus · R{rank} {bonus}','Prochain bonus · R{rank} {bonus}'],
 'Sustain +{hp} HP':['Regeneration +{hp} LP','Sustento +{hp} PV','Herstel +{hp} LP','Recupero +{hp} PV','Récupération +{hp} PV'],
 'Recipe known':['Rezept bekannt','Receta conocida','Recept bekend','Ricetta conosciuta','Recette connue'],
 'Standard recipe':['Standardrezept','Receta estándar','Standaardrecept','Ricetta standard','Recette standard'],
 'Recycled recipe':['Recyclingrezept','Receta reciclada','Recyclingrecept','Ricetta riciclata','Recette recyclée'],
 'Reclaimed recipe':['Rückgewinnungsrezept','Receta recuperada','Hergebruikrecept','Ricetta di recupero','Recette de récupération'],
 'CRAFTING METHOD':['HERSTELLUNGSART','MÉTODO DE FABRICACIÓN','MAAKMETHODE','METODO DI CREAZIONE','MÉTHODE DE FABRICATION'],
 'Same item, different materials':['Gleicher Gegenstand, andere Materialien','Mismo objeto, otros materiales','Zelfde item, andere materialen','Stesso oggetto, altri materiali','Même objet, autres matériaux'],
 'Standard':['Standard','Estándar','Standaard','Standard','Standard'],
 'Recycled':['Recycelt','Reciclada','Gerecycled','Riciclata','Recyclée'],
 'Reclaimed':['Wiederverwertet','Recuperada','Hergebruikt','Recuperata','Récupérée'],
 'Craft prerequisites · {count}':['Vorprodukte herstellen · {count}','Fabricar requisitos previos · {count}','Benodigdheden maken · {count}','Crea prerequisiti · {count}','Fabriquer les prérequis · {count}'],
 'All {active} active slots and all {waiting} waiting spaces are occupied':['Alle {active} aktiven Plätze und {waiting} Warteplätze sind belegt','Los {active} espacios activos y los {waiting} espacios de espera están ocupados','Alle {active} actieve plekken en {waiting} wachtplekken zijn bezet','Tutti i {active} slot attivi e i {waiting} posti in attesa sono occupati','Les {active} emplacements actifs et les {waiting} places d’attente sont occupés'],
 'Active slots are busy · reserves materials and joins waiting {position}/{capacity}':['Aktive Plätze belegt · reserviert Materialien und belegt Warteplatz {position}/{capacity}','Espacios activos ocupados · reserva materiales y entra en espera {position}/{capacity}','Actieve plekken bezet · reserveert materialen en gaat in de wachtrij {position}/{capacity}','Slot attivi occupati · riserva materiali ed entra in attesa {position}/{capacity}','Emplacements actifs occupés · réserve les matériaux et rejoint l’attente {position}/{capacity}'],
 'Uses one account-wide slot for {time}':['Belegt einen kontoweiten Platz für {time}','Usa un espacio de la cuenta durante {time}','Gebruikt één accountbrede plek voor {time}','Occupa uno slot dell’account per {time}','Occupe un emplacement du compte pendant {time}'],
 'Brew · {time}':['Brauen · {time}','Preparar · {time}','Brouwen · {time}','Prepara · {time}','Préparer · {time}'],
 'Process · {time}':['Verarbeiten · {time}','Procesar · {time}','Verwerken · {time}','Lavora · {time}','Transformer · {time}'],
 'Queue craft · {time}':['Herstellung einreihen · {time}','Encolar fabricación · {time}','Maken in wachtrij · {time}','Accoda creazione · {time}','Mettre en file · {time}'],
 'Start craft · {time}':['Herstellung starten · {time}','Iniciar fabricación · {time}','Maken starten · {time}','Avvia creazione · {time}','Lancer la fabrication · {time}'],
 'Craft {count}× {item}':['{count}× {item} herstellen','Fabricar {count}× {item}','{count}× {item} maken','Crea {count}× {item}','Fabriquer {count}× {item}'],
} as const satisfies Record<string,TranslationRow>;
export const craftingDetailText=createSourceTranslator(craftingDetailRows);
export function craftingDetailContent(language:Language,value:string|undefined,fallback:(value:string|undefined)=>string):string{
 if(!value)return '';
 if(Object.prototype.hasOwnProperty.call(craftingDetailRows,value))return craftingDetailText(language,value);
 const parts=value.split(' · ');
 const bonus=parts.map(part=>/^\+(\d+)% (skill XP|XP|yield|speed|action speed)$/.exec(part));
 if(bonus.every(Boolean))return bonus.map(match=>craftingDetailText(language,'+{value}% '+match![2],{value:match![1]})).join(' · ');
 return fallback(value);
}

/** Shared translation for special meal effects shown in both Cooking views. */
export function cookingMealEffectText(language:Language,meal:Pick<MealBonusDefinition,'kind'|'percent'>):string{
 const key=meal.kind==='gathering_speed'?'+{value}% Gathering speed'
  :meal.kind==='crafting_speed'?'+{value}% Crafting speed'
  :meal.kind==='combat_xp'?'+{value}% Combat XP'
  :'+{value}% Non-combat skill speed';
 return craftingDetailText(language,key,{value:meal.percent});
}

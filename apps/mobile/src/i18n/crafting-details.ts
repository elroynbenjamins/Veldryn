import {createSourceTranslator,type TranslationRow} from './source-catalog';
import type {Language} from './languages';

export const craftingDetailRows={
 'No active mastery bonus yet':['Noch kein aktiver Meisterschaftsbonus','Aún no hay bonos de maestría activos','Nog geen actieve meesterschapsbonus','Nessun bonus maestria attivo','Aucun bonus de maîtrise actif'],
 'Timed alchemy recipes must be started as a batch.':['Zeitbasierte Alchemierezepte müssen als Charge gestartet werden.','Las recetas de alquimia con duración deben iniciarse como lote.','Alchemierecepten met een duur moeten als partij worden gestart.','Le ricette alchemiche a tempo devono essere avviate come lotto.','Les recettes d’alchimie chronométrées doivent être lancées par lot.'],
 '+{value}% skill XP':['+{value}% Fertigkeits-EP','+{value}% EXP de habilidad','+{value}% vaardigheids-XP','+{value}% ESP abilità','+{value} % EXP de compétence'],
 '+{value}% XP':['+{value}% EP','+{value}% EXP','+{value}% XP','+{value}% ESP','+{value} % EXP'],
 '+{value}% yield':['+{value}% Ertrag','+{value}% rendimiento','+{value}% opbrengst','+{value}% resa','+{value} % rendement'],
 '+{value}% speed':['+{value}% Tempo','+{value}% velocidad','+{value}% snelheid','+{value}% velocità','+{value} % vitesse'],
 '+{value}% action speed':['+{value}% Aktionstempo','+{value}% velocidad de acción','+{value}% actiesnelheid','+{value}% velocità d’azione','+{value} % vitesse d’action'],
 'Unlocks at {skill} level {level}':['Wird mit {skill} Stufe {level} freigeschaltet','Se desbloquea con {skill} nivel {level}','Ontgrendeld bij {skill} niveau {level}','Si sblocca con {skill} livello {level}','Débloqué avec {skill} niveau {level}'],
 'Requires character level {level}':['Erfordert Charakterstufe {level}','Requiere personaje de nivel {level}','Vereist personageniveau {level}','Richiede personaggio di livello {level}','Nécessite un personnage de niveau {level}'],
 'Ready to brew ×{count}':['Bereit zum Brauen ×{count}','Listo para preparar ×{count}','Gereed om te brouwen ×{count}','Pronto a preparare ×{count}','Prêt à préparer ×{count}'],
 'Ready to process ×{count}':['Bereit zum Verarbeiten ×{count}','Listo para procesar ×{count}','Gereed om te verwerken ×{count}','Pronto a lavorare ×{count}','Prêt à transformer ×{count}'],
 'Makes {count} · +{xp} XP · {gold} Gold':['Ergibt {count} · +{xp} EP · {gold} Gold','Produce {count} · +{xp} EXP · {gold} oro','Maakt {count} · +{xp} XP · {gold} goud','Produce {count} · +{xp} ESP · {gold} oro','Produit {count} · +{xp} EXP · {gold} or'],
 '{ready}/{total} materials ready':['{ready}/{total} Materialien bereit','{ready}/{total} materiales listos','{ready}/{total} materialen gereed','{ready}/{total} materiali pronti','{ready}/{total} matériaux prêts'],
 'Reserve ingredients and Gold up front · up to {max} currently affordable. Progress continues offline.':['Zutaten und Gold werden vorab reserviert · aktuell bis zu {max} bezahlbar. Der Fortschritt läuft offline weiter.','Los ingredientes y el oro se reservan al inicio · puedes pagar hasta {max}. El progreso continúa sin conexión.','Ingrediënten en goud worden vooraf gereserveerd · momenteel tot {max} betaalbaar. Voortgang gaat offline verder.','Ingredienti e oro vengono riservati in anticipo · puoi permettertene fino a {max}. I progressi continuano offline.','Les ingrédients et l’or sont réservés au départ · jusqu’à {max} actuellement abordables. La progression continue hors ligne.'],
 'Cost {gold} Gold · +{xp} skill XP':['Kosten: {gold} Gold · +{xp} Fertigkeits-EP','Coste: {gold} oro · +{xp} EXP de habilidad','Kosten: {gold} goud · +{xp} vaardigheids-XP','Costo: {gold} oro · +{xp} ESP abilità','Coût : {gold} or · +{xp} EXP de compétence'],
 'NEXT LV ~{time}':['NÄCHSTE ST. ~{time}','SIGUIENTE NIV. ~{time}','VOLGEND NIV. ~{time}','PROSSIMO LIV. ~{time}','PROCHAIN NIV. ~{time}'],
 '~{batches} batches/hr · {output} {item}/hr · {xp} XP/hr':['~{batches} Chargen/Std. · {output} {item}/Std. · {xp} EP/Std.','~{batches} lotes/h · {output} {item}/h · {xp} EXP/h','~{batches} partijen/uur · {output} {item}/uur · {xp} XP/uur','~{batches} lotti/ora · {output} {item}/ora · {xp} ESP/ora','~{batches} lots/h · {output} {item}/h · {xp} EXP/h'],
 '{xp} XP to {skill} {level}':['{xp} EP bis {skill} {level}','{xp} EXP hasta {skill} {level}','{xp} XP tot {skill} {level}','{xp} ESP a {skill} {level}','{xp} EXP avant {skill} {level}'],
 '{points}/{required} actions to next rank':['{points}/{required} Aktionen zum nächsten Rang','{points}/{required} acciones para el siguiente rango','{points}/{required} acties tot de volgende rang','{points}/{required} azioni al prossimo grado','{points}/{required} actions avant le prochain rang'],
 'Next bonus · R{rank} {bonus}':['Nächster Bonus · R{rank} {bonus}','Siguiente bono · R{rank} {bonus}','Volgende bonus · R{rank} {bonus}','Prossimo bonus · R{rank} {bonus}','Prochain bonus · R{rank} {bonus}'],
 'Sustain +{hp} HP':['Regeneration +{hp} LP','Sustento +{hp} PV','Herstel +{hp} LP','Recupero +{hp} PV','Récupération +{hp} PV'],
 'Recipe known':['Rezept bekannt','Receta conocida','Recept bekend','Ricetta conosciuta','Recette connue'],
 'Craft prerequisites · {count}':['Vorprodukte herstellen · {count}','Fabricar requisitos previos · {count}','Benodigdheden maken · {count}','Crea prerequisiti · {count}','Fabriquer les prérequis · {count}'],
 'All {active} active slots and all {waiting} waiting spaces are occupied':['Alle {active} aktiven Plätze und {waiting} Warteplätze sind belegt','Los {active} espacios activos y los {waiting} espacios de espera están ocupados','Alle {active} actieve plekken en {waiting} wachtplekken zijn bezet','Tutti i {active} slot attivi e i {waiting} posti in attesa sono occupati','Les {active} emplacements actifs et les {waiting} places d’attente sont occupés'],
 'Active slots are busy · reserves materials and joins waiting {position}/{capacity}':['Aktive Plätze belegt · reserviert Materialien und belegt Warteplatz {position}/{capacity}','Espacios activos ocupados · reserva materiales y entra en espera {position}/{capacity}','Actieve plekken bezet · reserveert materialen en gaat in de wachtrij {position}/{capacity}','Slot attivi occupati · riserva materiali ed entra in attesa {position}/{capacity}','Emplacements actifs occupés · réserve les matériaux et rejoint l’attente {position}/{capacity}'],
 'Uses one account-wide slot for {time}':['Belegt einen kontoweiten Platz für {time}','Usa un espacio de la cuenta durante {time}','Gebruikt één accountbrede plek voor {time}','Occupa uno slot dell’account per {time}','Occupe un emplacement du compte pendant {time}'],
 'Brew ×{count} · {time}':['Brauen ×{count} · {time}','Preparar ×{count} · {time}','Brouwen ×{count} · {time}','Prepara ×{count} · {time}','Préparer ×{count} · {time}'],
 'Process ×{count} · {time}':['Verarbeiten ×{count} · {time}','Procesar ×{count} · {time}','Verwerken ×{count} · {time}','Lavora ×{count} · {time}','Transformer ×{count} · {time}'],
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

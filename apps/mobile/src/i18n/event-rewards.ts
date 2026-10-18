import {SUPPORTED_LANGUAGES,type Language} from './languages';
import {createTranslator} from './translator';

export const eventRewardRows={
 'Claim window':['Claim window','Abholzeitraum','Plazo de reclamación','Claimperiode','Periodo di riscossione','Période de récupération'],
 '1 reward ready':['1 reward ready','1 Belohnung bereit','1 recompensa lista','1 beloning klaar','1 ricompensa pronta','1 récompense disponible'],
 'Reward trail':['Reward trail','Belohnungspfad','Ruta de recompensas','Beloningspad','Percorso ricompense','Parcours de récompenses'],
 'Festival reputation':['Festival reputation','Festivalruf','Reputación del festival','Festivalreputatie','Reputazione del festival','Réputation du festival'],
 '{year} edition':['{year} edition','Ausgabe {year}','Edición {year}','Editie {year}','Edizione {year}','Édition {year}'],
 '{points} reputation':['{points} reputation','{points} Ruf','{points} de reputación','{points} reputatie','{points} reputazione','{points} de réputation'],
 '{points} reputation to {reward}':['{points} reputation to {reward}','Noch {points} Ruf bis {reward}','{points} de reputación para {reward}','Nog {points} reputatie tot {reward}','{points} reputazione per {reward}','Encore {points} de réputation pour {reward}'],
 'Claimed':['Claimed','Abgeholt','Reclamado','Geclaimd','Riscattato','Récupéré'],
 'Ready to claim':['Ready to claim','Bereit zum Abholen','Listo para reclamar','Klaar om te claimen','Pronto da riscattare','Prêt à récupérer'],
 'Up next':['Up next','Als Nächstes','A continuación','Hierna','Prossimamente','À suivre'],
 'Locked':['Locked','Gesperrt','Bloqueado','Vergrendeld','Bloccato','Verrouillé'],
 'Claim reward':['Claim reward','Belohnung abholen','Reclamar recompensa','Claim beloning','Riscatta ricompensa','Récupérer la récompense'],
 'Claiming…':['Claiming…','Wird abgeholt…','Reclamando…','Claimen…','Riscatto…','Récupération…'],
 '{reward} claimed.':['{reward} claimed.','{reward} abgeholt.','{reward} reclamado.','{reward} geclaimd.','{reward} riscattato.','{reward} récupéré.'],
 'Reward could not be confirmed. Please retry.':['Reward could not be confirmed. Please retry.','Belohnung konnte nicht bestätigt werden. Bitte erneut versuchen.','No se pudo confirmar la recompensa. Inténtalo de nuevo.','Beloning kon niet worden bevestigd. Probeer opnieuw.','Impossibile confermare la ricompensa. Riprova.','La récompense n’a pas pu être confirmée. Réessayez.'],
 '{count} rewards ready':['{count} rewards ready','{count} Belohnungen bereit','{count} recompensas listas','{count} beloningen klaar','{count} ricompense pronte','{count} récompenses disponibles'],
 '{claimed} / {total} claimed':['{claimed} / {total} claimed','{claimed} / {total} abgeholt','{claimed} / {total} reclamadas','{claimed} / {total} geclaimd','{claimed} / {total} riscattate','{claimed} / {total} récupérées'],
 'All personal rewards unlocked':['All personal rewards unlocked','Alle persönlichen Belohnungen freigeschaltet','Todas las recompensas personales desbloqueadas','Alle persoonlijke beloningen ontgrendeld','Tutte le ricompense personali sbloccate','Toutes les récompenses personnelles débloquées'],
 'Your collection is complete':['Your collection is complete','Deine Sammlung ist vollständig','Tu colección está completa','Je verzameling is compleet','La tua collezione è completa','Votre collection est complète'],
 'Claim available rewards before {date}.':['Claim available rewards before {date}.','Verfügbare Belohnungen vor dem {date} abholen.','Reclama las recompensas disponibles antes del {date}.','Claim beschikbare beloningen vóór {date}.','Riscatta le ricompense disponibili entro il {date}.','Récupérez les récompenses disponibles avant le {date}.'],
 'Reputation earning has ended.':['Reputation earning has ended.','Es kann kein Ruf mehr verdient werden.','Ya no se puede ganar reputación.','Je kunt geen reputatie meer verdienen.','Non è più possibile ottenere reputazione.','Il n’est plus possible de gagner de la réputation.'],
 'No personal milestone rewards for this event.':['No personal milestone rewards for this event.','Keine persönlichen Meilensteinbelohnungen für dieses Event.','Este evento no tiene recompensas de hitos personales.','Dit evenement heeft geen persoonlijke mijlpaalbeloningen.','Nessuna ricompensa traguardo personale per questo evento.','Aucune récompense personnelle de palier pour cet événement.'],
 'Guild rewards are separate · Guild → PvE':['Guild rewards are separate · Guild → PvE','Gildenbelohnungen sind separat · Gilde → PvE','Recompensas de gremio aparte · Gremio → PvE','Gildebeloningen staan apart · Gilde → PvE','Ricompense gilda separate · Gilda → PvE','Récompenses de guilde séparées · Guilde → JcE'],
 'Profile icon':['Profile icon','Profilsymbol','Icono de perfil','Profielicoon','Icona profilo','Icône de profil'],
 'Cosmetic pet':['Cosmetic pet','Kosmetisches Haustier','Mascota cosmética','Cosmetisch huisdier','Animaletto cosmetico','Familier cosmétique'],
 'Combat companion':['Combat companion','Kampfbegleiter','Compañero de combate','Gevechtsmetgezel','Compagno di combattimento','Compagnon de combat'],
 'Profile background':['Profile background','Profilhintergrund','Fondo de perfil','Profielachtergrond','Sfondo profilo','Arrière-plan de profil'],
 'Profile frame':['Profile frame','Profilrahmen','Marco de perfil','Profielkader','Cornice profilo','Cadre de profil'],
 'Emote':['Emote','Emote','Emoticono','Emote','Emote','Émoticône'],
 'Profile title':['Profile title','Profiltitel','Título de perfil','Profieltitel','Titolo profilo','Titre de profil'],
 'Consumable':['Consumable','Verbrauchsgegenstand','Consumible','Verbruiksvoorwerp','Consumabile','Consommable'],
 'Gold':['Gold','Gold','Oro','Goud','Oro','Or'],
 'Companion Essence':['Companion Essence','Begleiteressenz','Esencia de compañero','Metgezelessentie','Essenza compagno','Essence de compagnon'],
} as const satisfies Record<string,readonly [string,string,string,string,string,string]>;
export type EventRewardMessage=keyof typeof eventRewardRows;
export const eventRewardCatalogs=Object.fromEntries(SUPPORTED_LANGUAGES.map((language,index)=>[language,Object.fromEntries(Object.entries(eventRewardRows).map(([key,row])=>[key,row[index]]))])) as Record<Language,Record<EventRewardMessage,string>>;
export const eventRewardText=createTranslator(eventRewardCatalogs);

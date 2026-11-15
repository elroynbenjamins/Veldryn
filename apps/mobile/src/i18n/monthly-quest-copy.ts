import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Fixed monthly quest milestone UI copy, ordered DE / ES / NL / IT / FR / RU / TR. */
type SevenLocales=readonly [string,string,string,string,string,string,string];
const rows={
 "MONTHLY QUEST MILESTONES":["MONATLICHE QUEST-MEILENSTEINE","HITOS MENSUALES DE MISIONES","MAANDELIJKSE MISSIEMIJLPALEN","TRAGUARDI MENSILI DELLE MISSIONI","PALIERS MENSUELS DE QUÊTES","ЕЖЕМЕСЯЧНЫЕ ЭТАПЫ ЗАДАНИЙ","AYLIK GÖREV AŞAMALARI"],
 "Choose your Skill XP rewards":["Wähle deine Fertigkeits-EP-Belohnungen","Elige tus recompensas de EXP de habilidad","Kies je vaardigheids-XP-beloningen","Scegli le ricompense PE abilità","Choisissez vos récompenses d'XP de compétence","Выберите награды опыта навыков","Beceri XP ödüllerini seç"],
 "Daily +1 · Weekly +3 · Monthly +5 Quest Points · Account-wide.":["Täglich +1 · Wöchentlich +3 · Monatlich +5 Questpunkte · Für das ganze Konto.","Diaria +1 · Semanal +3 · Mensual +5 puntos de misión · Para toda la cuenta.","Dagelijks +1 · Wekelijks +3 · Maandelijks +5 missiepunten · Accountbreed.","Giornaliera +1 · Settimanale +3 · Mensile +5 punti missione · Per account.","Quotidienne +1 · Hebdomadaire +3 · Mensuelle +5 points de quête · Par compte.","Ежедневное +1 · Еженедельное +3 · Ежемесячное +5 очков заданий · На весь аккаунт.","Günlük +1 · Haftalık +3 · Aylık +5 görev puanı · Hesap genelinde."],
 "This month":["Dieser Monat","Este mes","Deze maand","Questo mese","Ce mois-ci","Этот месяц","Bu ay"],
 "Previous month":["Letzter Monat","Mes anterior","Vorige maand","Mese precedente","Mois précédent","Прошлый месяц","Önceki ay"],
 "pts":["Pkt.","pts","pnt","pt","pts","очк.","puan"],
 "Skill XP":["Fertigkeits-EP","EXP de habilidad","Vaardigheids-XP","PE abilità","XP de compétence","Опыт навыка","Beceri XP"],
 "✓ Claimed":["✓ Abgeholt","✓ Reclamado","✓ Geclaimd","✓ Riscattato","✓ Récupéré","✓ Получено","✓ Alındı"],
 "Choose skill":["Fertigkeit wählen","Elegir habilidad","Kies vaardigheid","Scegli abilità","Choisir la compétence","Выбрать навык","Beceri seç"],
 "Locked":["Gesperrt","Bloqueado","Vergrendeld","Bloccato","Verrouillé","Заблокировано","Kilitli"],
 "Earned rewards can be claimed during the first 7 UTC days of the next month.":["Verdiente Belohnungen sind in den ersten 7 UTC-Tagen des Folgemonats abholbar.","Las recompensas obtenidas se pueden reclamar durante los primeros 7 días UTC del mes siguiente.","Verdiende beloningen zijn de eerste 7 UTC-dagen van de volgende maand te claimen.","Le ricompense ottenute si possono riscattare nei primi 7 giorni UTC del mese seguente.","Les récompenses gagnées peuvent être récupérées durant les 7 premiers jours UTC du mois suivant.","Заработанные награды можно получить в первые 7 дней следующего месяца по UTC.","Kazanılan ödüller sonraki ayın ilk 7 UTC gününde alınabilir."],
 "MONTHLY MILESTONE":["MONATLICHER MEILENSTEIN","HITO MENSUAL","MAANDELIJKSE MIJLPAAL","TRAGUARDO MENSILE","PALIER MENSUEL","ЕЖЕМЕСЯЧНЫЙ ЭТАП","AYLIK AŞAMA"],
 "Choose one character and an eligible skill. The reward is granted immediately and cannot be reassigned.":["Wähle einen Charakter und eine verfügbare Fertigkeit. Die Belohnung wird sofort vergeben und kann nicht verschoben werden.","Elige un personaje y una habilidad disponible. La recompensa se concede de inmediato y no puede reasignarse.","Kies een personage en een beschikbare vaardigheid. De beloning wordt direct toegekend en kan niet worden verplaatst.","Scegli un personaggio e un'abilità disponibile. La ricompensa viene assegnata subito e non può essere spostata.","Choisissez un personnage et une compétence éligible. La récompense est immédiate et ne peut être réattribuée.","Выберите персонажа и доступный навык. Награда начисляется сразу, изменить выбор нельзя.","Bir karakter ve uygun beceri seç. Ödül hemen verilir ve başka yere aktarılamaz."],
 "Character":["Charakter","Personaje","Personage","Personaggio","Personnage","Персонаж","Karakter"],
 "Skill":["Fertigkeit","Habilidad","Vaardigheid","Abilità","Compétence","Навык","Beceri"],
 "All skills for this character have reached the XP cap. Select another character.":["Alle Fertigkeiten dieses Charakters haben das EP-Limit erreicht. Wähle einen anderen Charakter.","Todas las habilidades de este personaje alcanzaron el límite de EXP. Elige otro personaje.","Alle vaardigheden van dit personage zitten op de XP-limiet. Kies een ander personage.","Tutte le abilità del personaggio hanno raggiunto il limite PE. Scegli un altro personaggio.","Toutes les compétences de ce personnage ont atteint leur limite d'XP. Choisissez un autre personnage.","Все навыки этого персонажа достигли предела опыта. Выберите другого персонажа.","Bu karakterin tüm becerileri XP sınırına ulaştı. Başka karakter seç."],
 "Claim Skill XP":["Fertigkeits-EP abholen","Reclamar EXP de habilidad","Claim vaardigheids-XP","Riscatta PE abilità","Récupérer l'XP de compétence","Получить опыт навыка","Beceri XP'sini al"],
 "Could not claim reward. Please try again.":["Belohnung konnte nicht abgeholt werden. Bitte erneut versuchen.","No se pudo reclamar la recompensa. Inténtalo de nuevo.","Beloning claimen mislukt. Probeer het opnieuw.","Impossibile riscattare la ricompensa. Riprova.","Impossible de récupérer la récompense. Réessayez.","Не удалось получить награду. Повторите попытку.","Ödül alınamadı. Tekrar dene."],
 "Reward confirmation failed. Please try again.":["Belohnung konnte nicht bestätigt werden. Bitte erneut versuchen.","No se pudo confirmar la recompensa. Inténtalo de nuevo.","Beloning niet bevestigd. Probeer het opnieuw.","Conferma della ricompensa non riuscita. Riprova.","La récompense n'a pas pu être confirmée. Réessayez.","Не удалось подтвердить награду. Повторите попытку.","Ödül onaylanamadı. Tekrar dene."],
 "Near level 100: only {amount} of {total} XP will be applied. Choose another skill for the full reward.":["Nahe Stufe 100: Nur {amount} von {total} EP werden vergeben. Wähle eine andere Fertigkeit für die volle Belohnung.","Cerca del nivel 100: solo se aplicarán {amount} de {total} EXP. Elige otra habilidad para la recompensa completa.","Dicht bij niveau 100: slechts {amount} van {total} XP wordt toegekend. Kies een andere vaardigheid voor de volledige beloning.","Vicino al livello 100: verranno assegnati solo {amount} di {total} PE. Scegli un'altra abilità per la ricompensa completa.","Près du niveau 100 : seulement {amount} sur {total} XP seront attribués. Choisissez une autre compétence pour la récompense complète.","Близко к 100 уровню: будет начислено только {amount} из {total} опыта. Для полной награды выберите другой навык.","100. seviyeye yakın: {total} XP'nin yalnızca {amount} kadarı verilir. Tam ödül için başka beceri seç."],
 "Milestone":["Meilenstein","Hito","Mijlpaal","Traguardo","Palier","Этап","Aşama"],
 "ready to claim":["abholbereit","listo para reclamar","klaar om te claimen","pronto da riscattare","prêt à récupérer","можно получить","alınmaya hazır"],
 "points":["Punkte","puntos","punten","punti","points","очки","puan"],
 "claimed":["abgeholt","reclamado","geclaimd","riscattato","récupéré","получено","alındı"],
 "Lv":["St.","Nv.","Lv","Lv","Niv.","ур.","Sv."],
} as const satisfies Record<string,SevenLocales>;

export function monthlyQuestText(language:Language,source:keyof typeof rows,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const translated=index>=0?rows[source][index]:source;
 return interpolateTranslation(translated??source,params);
}

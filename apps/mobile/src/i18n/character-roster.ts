import type {Language} from './languages';
import {accountText} from './account';
import {interpolateTranslation} from './translator';

/** Focused Character Roster copy. New labels use the same eight supported languages
 * without changing the shared character deletion/confirmation translations.
 * Interpolated values are application-owned; player names never enter translation keys.
 */
const rows:Record<string,Partial<Record<Language,string>>>={
 'Currently playing':{en:'Currently playing',de:'Aktuell gespielt',es:'Jugando ahora',nl:'Nu actief',it:'Personaggio attivo',fr:'Personnage actuel',ru:'Текущий персонаж',tr:'Şu an oynanan'},
 'Character roster':{en:'Character roster',de:'Charakterliste',es:'Lista de personajes',nl:'Personagelijst',it:'Elenco personaggi',fr:'Liste des personnages',ru:'Список персонажей',tr:'Karakter listesi'},
 '{count} characters · {working} working':{en:'{count} characters · {working} working',de:'{count} Charaktere · {working} aktiv',es:'{count} personajes · {working} activos',nl:'{count} personages · {working} bezig',it:'{count} personaggi · {working} attivi',fr:'{count} personnages · {working} actifs',ru:'Персонажей: {count} · заняты: {working}',tr:'{count} karakter · {working} çalışıyor'},
 '{count}/{total} slots':{en:'{count}/{total} slots',de:'{count}/{total} Plätze',es:'{count}/{total} espacios',nl:'{count}/{total} plekken',it:'{count}/{total} slot',fr:'{count}/{total} emplacements',ru:'Мест: {count}/{total}',tr:'{count}/{total} yuva'},
 'Next slot at {count}':{en:'Next slot at {count}',de:'Nächster Platz bei {count}',es:'Próximo espacio al llegar a {count}',nl:'Volgende plek bij {count}',it:'Prossimo slot a {count}',fr:'Prochain emplacement à {count}',ru:'Следующее место при {count}',tr:'Sonraki yuva: {count}'},
 'Role slots':{en:'Role slots',de:'Rollenplätze',es:'Espacios por rol',nl:'Rolplekken',it:'Slot dei ruoli',fr:'Emplacements de rôle',ru:'Места по ролям',tr:'Rol yuvaları'},
 'Tank':{en:'Tank',de:'Tank',es:'Tanque',nl:'Tank',it:'Difensore',fr:'Tank',ru:'Танк',tr:'Tank'},
 'Damage':{en:'Damage',de:'Schaden',es:'Daño',nl:'Schade',it:'Danno',fr:'Dégâts',ru:'Урон',tr:'Hasar'},
 'Support':{en:'Support',de:'Unterstützung',es:'Apoyo',nl:'Ondersteuning',it:'Supporto',fr:'Soutien',ru:'Поддержка',tr:'Destek'},
 'Playing':{en:'Playing',de:'Gespielt',es:'En juego',nl:'Actief',it:'In gioco',fr:'En jeu',ru:'В игре',tr:'Oynanıyor'},
 'Review deletion options':{en:'Review deletion options',de:'Löschoptionen prüfen',es:'Revisar opciones de eliminación',nl:'Verwijderopties bekijken',it:'Esamina opzioni di eliminazione',fr:'Examiner les options de suppression',ru:'Просмотреть варианты удаления',tr:'Silme seçeneklerini incele'},
 'Back to character':{en:'Back to character',de:'Zurück zum Charakter',es:'Volver al personaje',nl:'Terug naar personage',it:'Torna al personaggio',fr:'Retour au personnage',ru:'Назад к персонажу',tr:'Karaktere dön'},
 'Legacy roster preserved':{en:'Legacy roster preserved',de:'Bisherige Charakterliste bleibt erhalten',es:'Se conserva la lista anterior',nl:'Bestaande personages behouden',it:'Elenco precedente conservato',fr:'Ancienne liste conservée',ru:'Прежние персонажи сохранены',tr:'Eski karakter listesi korundu'},
 'Three role slots unlocked':{en:'Three role slots unlocked',de:'Drei Rollenplätze freigeschaltet',es:'Tres espacios de rol desbloqueados',nl:'Drie rolplekken ontgrendeld',it:'Tre slot di ruolo sbloccati',fr:'Trois emplacements de rôle débloqués',ru:'Открыты три ролевых места',tr:'Üç rol yuvası açıldı'},
 'Class and role cannot be changed on an existing character.':{en:'Class and role cannot be changed on an existing character.',de:'Klasse und Rolle eines bestehenden Charakters können nicht geändert werden.',es:'La clase y el rol de un personaje existente no se pueden cambiar.',nl:'Klasse en rol van een bestaand personage kunnen niet worden gewijzigd.',it:'Classe e ruolo di un personaggio esistente non possono essere modificati.',fr:'La classe et le rôle d’un personnage existant ne peuvent pas être modifiés.',ru:'Класс и роль существующего персонажа изменить нельзя.',tr:'Mevcut bir karakterin sınıfı ve rolü değiştirilemez.'},
};

export function characterRosterText(language:Language,text:string,params?:Record<string,string|number>):string{
 const row=rows[text];
 return row?interpolateTranslation(row[language]??row.en??text,params):accountText(language,text,params);
}

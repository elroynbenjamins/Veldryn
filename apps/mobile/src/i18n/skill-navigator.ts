import type {Language} from './languages';

/** Small independent catalog for navigator-only presentation.
 * Does not translate technical category ids or ability route identifiers.
 */
const rows={
 'Filter':{en:'Filter',de:'Filter',es:'Filtrar',nl:'Filter',it:'Filtra',fr:'Filtrer',ru:'Фильтр',tr:'Filtre'},
 'Other':{en:'Other',de:'Sonstige',es:'Otros',nl:'Overig',it:'Altro',fr:'Autres',ru:'Другое',tr:'Diğer'},
 'No matching skills':{en:'No matching skills',de:'Keine passenden Fertigkeiten',es:'No hay habilidades coincidentes',nl:'Geen overeenkomende vaardigheden',it:'Nessuna abilità corrispondente',fr:'Aucune compétence correspondante',ru:'Подходящие навыки не найдены',tr:'Eşleşen beceri bulunamadı'},
 'Account-wide companion skill':{en:'Account-wide companion skill',de:'Accountweite Begleiterfertigkeit',es:'Habilidad de compañero de toda la cuenta',nl:'Accountbrede metgezelvaardigheid',it:'Abilità compagno condivisa dall’account',fr:'Compétence de compagnon partagée sur le compte',ru:'Навык спутников для всего аккаунта',tr:'Hesap genelinde yoldaş becerisi'},
 'Sanctuary facility':{en:'Sanctuary facility',de:'Heiligtumseinrichtung',es:'Instalación del santuario',nl:'Heiligdomvoorziening',it:'Struttura del santuario',fr:'Installation du sanctuaire',ru:'Сооружение святилища',tr:'Sığınak tesisi'}
} satisfies Record<string,Record<Language,string>>;

export function skillNavigatorText(language:Language,key:keyof typeof rows):string{
 return rows[key][language];
}

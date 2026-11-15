import type {Language} from './languages';
import {SUPPORTED_LANGUAGES} from './languages';
import {equipmentPouchText} from './equipment-pouch-ui';
import {interpolateTranslation,type TranslationParams} from './translator';

/** Sell/salvage receipts are shared by Inventory, Bank and Equipment Pouch.
 * All visible copy is available in the eight supported languages. */
type SevenLanguages=readonly [string,string,string,string,string,string,string];
export const disposalPreviewUiRows={
 'SELLING':['VERKAUF','VENTA','VERKOPEN','VENDITA','VENTE','ПРОДАЖА','SATIŞ'],
 'SALVAGING':['ZERLEGEN','DESGUACE','ONTMANTELEN','RICICLO','RÉCUPÉRATION','РАЗБОР','PARÇALAMA'],
 '{count} item':['{count} Gegenstand','{count} objeto','{count} voorwerp','{count} oggetto','{count} objet','{count} предмет','{count} eşya'],
 '{count} items':['{count} Gegenstände','{count} objetos','{count} voorwerpen','{count} oggetti','{count} objets','{count} предметов','{count} eşya'],
 '+{count} more stacks':['+{count} weitere Stapel','+{count} pilas más','+{count} extra stapels','+{count} altre pile','+{count} piles supplémentaires','+{count} стопок','+{count} yığın daha'],
 'GOLD TO RECEIVE':['GOLD-ERTRAG','ORO A RECIBIR','TE ONTVANGEN GOUD','ORO DA RICEVERE','OR À RECEVOIR','БУДЕТ ПОЛУЧЕНО ЗОЛОТО','ALINACAK ALTIN'],
 'MATERIALS TO RECEIVE':['MATERIAL-ERTRAG','MATERIALES A RECIBIR','TE ONTVANGEN MATERIALEN','MATERIALI DA RICEVERE','MATÉRIAUX À RECEVOIR','БУДУТ ПОЛУЧЕНЫ МАТЕРИАЛЫ','ALINACAK MALZEMELER'],
 'Gold':['Gold','Oro','Goud','Oro','Or','Золото','Altın'],
 'No recoverable materials':['Keine verwertbaren Materialien','No se pueden recuperar materiales','Geen materialen terug te winnen','Nessun materiale recuperabile','Aucun matériau récupérable','Нет извлекаемых материалов','Geri kazanılabilir malzeme yok'],
 'This action cannot be undone.':['Diese Aktion kann nicht rückgängig gemacht werden.','Esta acción no se puede deshacer.','Deze actie kan niet ongedaan worden gemaakt.','Questa azione non può essere annullata.','Cette action est irréversible.','Это действие нельзя отменить.','Bu işlem geri alınamaz.'],
 'PREVIEW':['VORSCHAU','VISTA PREVIA','VOORBEELD','ANTEPRIMA','APERÇU','ПРЕДПРОСМОТР','ÖNİZLEME'],
} as const satisfies Record<string,SevenLanguages>;

export function disposalPreviewText(language:Language,source:string,params:TranslationParams={}):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language)-1;
 const entry=Object.prototype.hasOwnProperty.call(disposalPreviewUiRows,source)
  ?disposalPreviewUiRows[source as keyof typeof disposalPreviewUiRows]:undefined;
 if(entry&&index>=0)return interpolateTranslation(entry[index],params);
 return equipmentPouchText(language,source,params);
}

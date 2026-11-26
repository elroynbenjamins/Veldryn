import {SUPPORTED_LANGUAGES,type Language} from './languages';

/** Localized account identity / hero-showcase copy in en,de,es,nl,it,fr,ru,tr order. */
const COPY={
 'ACCOUNT SOCIAL NAME':[
  'ACCOUNT SOCIAL NAME','SOZIALER KONTONAME','NOMBRE SOCIAL DE CUENTA','SOCIALE ACCOUNTNAAM',
  'NOME SOCIAL ACCOUNT','NOM SOCIAL DU COMPTE','ИМЯ АККАУНТА','HESAP GÖRÜNÜR ADI'],
 'One name for chat, guilds, parties and rankings. Your heroes keep their own names and showcases.':[
  'One name for chat, guilds, parties and rankings. Your heroes keep their own names and showcases.',
  'Ein Name für Chat, Gilden, Gruppen und Ranglisten. Deine Helden behalten eigene Namen und Profile.',
  'Un nombre para chats, gremios, grupos y clasificaciones. Tus héroes conservan sus nombres y perfiles.',
  'Eén naam voor chat, gilden, groepen en ranglijsten. Je helden houden hun eigen namen en profielen.',
  'Un nome per chat, gilde, gruppi e classifiche. Gli eroi mantengono nomi e profili distinti.',
  'Un nom pour les discussions, guildes, groupes et classements. Vos héros gardent leurs noms et profils.',
  'Одно имя для чата, гильдий, групп и рейтингов. У героев остаются собственные имена и профили.',
  'Sohbet, lonca, grup ve sıralamalar için tek ad. Kahramanların kendi adları ve profilleri kalır.'],
 'Social name':[
  'Social name','Sozialer Name','Nombre social','Sociale naam','Nome sociale','Nom social','Отображаемое имя','Görünür ad'],
 'Choose your social name':[
  'Choose your social name','Wähle deinen sozialen Namen','Elige tu nombre social','Kies je sociale naam',
  'Scegli il tuo nome sociale','Choisissez votre nom social','Выберите отображаемое имя','Görünür adını seç'],
 'Choose name':[
  'Choose name','Namen wählen','Elegir nombre','Naam kiezen','Scegli nome','Choisir un nom','Выбрать имя','Ad seç'],
 'Change name':[
  'Change name','Namen ändern','Cambiar nombre','Naam wijzigen','Cambia nome','Modifier le nom','Изменить имя','Adı değiştir'],
 'Loading social identity…':[
  'Loading social identity…','Soziales Profil wird geladen…','Cargando identidad social…','Sociale identiteit laden…',
  'Caricamento identità…','Chargement de l’identité…','Загрузка имени…','Görünür ad yükleniyor…'],
 'Social identity unavailable.':[
  'Social identity unavailable.','Soziale Identität nicht verfügbar.','Identidad social no disponible.','Sociale identiteit niet beschikbaar.',
  'Identità sociale non disponibile.','Identité sociale indisponible.','Имя недоступно.','Görünür ad kullanılamıyor.'],
 'Your first choice is free. Later changes have a 30-day cooldown.':[
  'Your first choice is free. Later changes have a 30-day cooldown.',
  'Die erste Wahl ist kostenlos. Danach gilt eine Wartezeit von 30 Tagen.',
  'La primera elección es gratuita. Después deberás esperar 30 días para cambiarlo.',
  'Je eerste keuze is gratis. Daarna geldt een wachttijd van 30 dagen.',
  'La prima scelta è gratuita. Poi dovrai attendere 30 giorni.',
  'Le premier choix est gratuit. Ensuite, un délai de 30 jours s’applique.',
  'Первый выбор бесплатный. Затем имя можно менять раз в 30 дней.',
  'İlk seçim ücretsizdir. Sonraki değişiklikler için 30 gün beklenir.'],
 'You can change your name again on {date}.':[
  'You can change your name again on {date}.',
  'Du kannst deinen Namen ab {date} wieder ändern.',
  'Podrás volver a cambiar tu nombre el {date}.',
  'Je kunt je naam opnieuw wijzigen op {date}.',
  'Potrai cambiare di nuovo il nome il {date}.',
  'Vous pourrez modifier votre nom le {date}.',
  'Следующий раз имя можно изменить {date}.',
  'Adını yeniden {date} tarihinde değiştirebilirsin.'],
 'Social name updated.':[
  'Social name updated.','Sozialer Name aktualisiert.','Nombre social actualizado.','Sociale naam bijgewerkt.',
  'Nome sociale aggiornato.','Nom social mis à jour.','Имя обновлено.','Görünür ad güncellendi.'],
 'Unable to load your social name.':[
  'Unable to load your social name.','Dein sozialer Name konnte nicht geladen werden.',
  'No se pudo cargar tu nombre social.','Je sociale naam kon niet worden geladen.',
  'Impossibile caricare il nome sociale.','Impossible de charger votre nom social.',
  'Не удалось загрузить имя.','Görünür adın yüklenemedi.'],
 'Checking name availability…':[
  'Checking name availability…','Name wird geprüft…','Comprobando disponibilidad…','Naam wordt gecontroleerd…',
  'Verifica disponibilità…','Vérification du nom…','Проверка имени…','Ad uygunluğu kontrol ediliyor…'],
 'Name available.':[
  'Name available.','Name ist verfügbar.','Nombre disponible.','Naam beschikbaar.',
  'Nome disponibile.','Nom disponible.','Имя свободно.','Ad kullanılabilir.'],
 'Name already taken.':[
  'Name already taken.','Name bereits vergeben.','Nombre ya ocupado.','Naam al in gebruik.',
  'Nome già in uso.','Nom déjà pris.','Имя уже занято.','Ad zaten alınmış.'],
 'Unable to check availability. Tap to retry.':[
  'Unable to check availability. Tap to retry.','Prüfung fehlgeschlagen. Tippe zum Wiederholen.',
  'No se pudo comprobar. Toca para reintentar.','Controleren mislukt. Tik om opnieuw te proberen.',
  'Verifica non riuscita. Tocca per riprovare.','Vérification impossible. Touchez pour réessayer.',
  'Не удалось проверить. Нажмите для повтора.','Kontrol edilemedi. Tekrar denemek için dokun.'],
 'This name is already used by another player.':[
  'This name is already used by another player.',
  'Dieser Name wird bereits verwendet.','Otro jugador ya usa este nombre.','Deze naam is al in gebruik.',
  'Questo nome è già in uso.','Ce nom est déjà utilisé.','Это имя уже занято.','Bu ad başka bir oyuncu tarafından kullanılıyor.'],
 'You can change your social name once every 30 days.':[
  'You can change your social name once every 30 days.',
  'Du kannst deinen sozialen Namen nur alle 30 Tage ändern.','Solo puedes cambiar tu nombre social cada 30 días.','Je kunt je sociale naam eens per 30 dagen wijzigen.',
  'Puoi cambiare il nome sociale ogni 30 giorni.','Vous pouvez modifier votre nom social tous les 30 jours.','Социальное имя можно менять раз в 30 дней.','Sosyal adını 30 günde bir değiştirebilirsin.'],
 'Choose a different social name.':[
  'Choose a different social name.','Wähle einen anderen sozialen Namen.','Elige otro nombre social.','Kies een andere sociale naam.',
  'Scegli un altro nome sociale.','Choisissez un autre nom social.','Выберите другое социальное имя.','Farklı bir sosyal ad seç.'],
 'Complete account setup before choosing a social name.':[
  'Complete account setup before choosing a social name.',
  'Schließe die Kontoeinrichtung ab, bevor du einen Namen wählst.','Completa la configuración de tu cuenta antes de elegir un nombre.','Rond je accountinstelling af voordat je een naam kiest.',
  'Completa la configurazione dell’account prima di scegliere un nome.','Terminez la configuration du compte avant de choisir un nom.','Завершите настройку аккаунта, прежде чем выбрать имя.','Ad seçmeden önce hesap kurulumunu tamamla.'],
 'Could not update your social name. Please try again.':[
  'Could not update your social name. Please try again.',
  'Der soziale Name konnte nicht geändert werden. Versuche es erneut.','No se pudo actualizar tu nombre social. Inténtalo de nuevo.','Je sociale naam kon niet worden bijgewerkt. Probeer het opnieuw.',
  'Impossibile aggiornare il nome sociale. Riprova.','Impossible de modifier le nom social. Réessayez.','Не удалось обновить социальное имя. Попробуйте снова.','Sosyal ad güncellenemedi. Tekrar dene.'],
 'Use 2–20 letters. Spaces, hyphens and apostrophes are allowed.':[
  'Use 2–20 letters. Spaces, hyphens and apostrophes are allowed.',
  '2–20 Buchstaben; Leerzeichen, Bindestriche und Apostrophe sind erlaubt.',
  'Entre 2 y 20 letras; se permiten espacios, guiones y apóstrofes.',
  '2–20 letters; spaties, koppeltekens en apostrofs zijn toegestaan.',
  'Da 2 a 20 lettere; sono ammessi spazi, trattini e apostrofi.',
  'De 2 à 20 lettres; espaces, traits d’union et apostrophes autorisés.',
  'От 2 до 20 букв; допустимы пробелы, дефисы и апострофы.',
  '2–20 harf; boşluk, kısa çizgi ve kesme işareti kullanılabilir.'],
 'CHARACTER SHOWCASES':[
  'CHARACTER SHOWCASES','HELDENPROFILE','PERFILES DE HÉROES','HELDENPROFIELEN',
  'PROFILI DEGLI EROI','PROFILS DES HÉROS','ПРОФИЛИ ГЕРОЕВ','KAHRAMAN PROFİLLERİ'],
 'Show {name} profile':[
  'Show {name} profile','Profil von {name} zeigen','Ver perfil de {name}','Profiel van {name} bekijken',
  'Mostra il profilo di {name}','Voir le profil de {name}','Открыть профиль {name}','{name} profilini göster'],
 'CHARACTER SHOWCASE':[
  'CHARACTER SHOWCASE','HELDENPROFIL','PERFIL DE HÉROE','HELDENPROFIEL',
  'PROFILO EROE','PROFIL DU HÉROS','ПРОФИЛЬ ГЕРОЯ','KAHRAMAN PROFİLİ'],
 'This hero’s own display':[
  'This hero’s own display','Individuelles Heldenprofil','Aspecto propio de este héroe','Eigen uiterlijk van deze held',
  'Presentazione di questo eroe','Présentation de ce héros','Личный профиль героя','Bu kahramanın görünümü'],
 'Tap to edit another hero':[
  'Tap to edit another hero','Tippen, um einen anderen Helden zu bearbeiten','Toca para editar otro héroe',
  'Tik om een andere held te bewerken','Tocca per modificare un altro eroe',
  'Touchez pour modifier un autre héros','Нажмите, чтобы выбрать другого героя',
  'Başka bir kahramanı düzenlemek için dokun'],
 'Featured public hero':[
  'Featured public hero','Öffentlich vorgestellter Held','Héroe destacado públicamente','Publiek uitgelichte held',
  'Eroe in evidenza','Héros présenté en public','Главный герой профиля','Öne çıkan kahraman'],
 'Editing another hero':[
  'Editing another hero','Anderer Held wird bearbeitet','Editando otro héroe','Andere held bewerken',
  'Modifica di un altro eroe','Modification d’un autre héros','Редактируется другой герой','Başka kahraman düzenleniyor'],
 'Feature this hero':[
  'Feature this hero','Diesen Helden hervorheben','Destacar este héroe','Deze held uitlichten',
  'Metti in evidenza','Présenter ce héros','Сделать главным','Bu kahramanı öne çıkar'],
 'Editing a showcase never switches your active character.':[
  'Editing a showcase never switches your active character.',
  'Das Bearbeiten eines Profils wechselt niemals deinen aktiven Helden.',
  'Editar un perfil nunca cambia tu personaje activo.',
  'Een profiel bewerken wisselt nooit je actieve held.',
  'Modificare un profilo non cambia il personaggio attivo.',
  'Modifier un profil ne change jamais votre héros actif.',
  'Изменение профиля не переключает активного героя.',
  'Profil düzenlemek aktif kahramanını değiştirmez.'],
 'Choose a hero to edit. This does not switch gameplay characters.':[
  'Choose a hero to edit. This does not switch gameplay characters.',
  'Wähle einen Helden zum Bearbeiten. Der aktive Held bleibt unverändert.',
  'Elige un héroe para editar. El personaje activo no cambiará.',
  'Kies een held om te bewerken. Je actieve held blijft hetzelfde.',
  'Scegli l’eroe da modificare. L’eroe attivo non cambia.',
  'Choisissez un héros à modifier. Le héros actif ne change pas.',
  'Выберите героя для редактирования. Активный герой не изменится.',
  'Düzenlenecek kahramanı seç. Aktif kahraman değişmez.'],
 'featured':[
  'featured','hervorgehoben','destacado','uitgelicht','in evidenza','à la une','главный','öne çıkan'],
 'Edit character showcase':[
  'Edit character showcase','Heldenprofil bearbeiten','Editar perfil de héroe','Heldenprofiel bewerken',
  'Modifica profilo eroe','Modifier le profil du héros','Редактировать профиль героя','Kahraman profilini düzenle'],
} as const;

export type SocialIdentityCopyKey=keyof typeof COPY;

/** Translate only authored UI copy, never player-supplied names. */
export function socialIdentityT(language:Language,key:SocialIdentityCopyKey,params?:Record<string,string|number>):string{
 const index=SUPPORTED_LANGUAGES.indexOf(language);
 const template=COPY[key][index>=0?index:0]??COPY[key][0];
 return template.replace(/\{([a-z]+)\}/gi,(literal,name)=>
  params&&Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):literal);
}

import type {SocialMessageKey} from './social';

/** Player-facing Russian/Turkish Social, Guild and Dungeon copy. Unknown keys retain English fallback. */
export const socialEarlyRows={
  "Guild Tokens": ["Жетоны гильдии","Lonca Jetonları"],
  // Short Party identity, six-month name cooldown and ranking-ready labels.
  "Party name": ["Название группы","Parti adı"],
  "Choose Party name": ["Выбрать название группы","Parti adı seç"],
  "PARTY IDENTITY": ["НАЗВАНИЕ ГРУППЫ","PARTİ KİMLİĞİ"],
  "3–5 letters, unique across active Parties. The name can only be changed once every six months.": ["3–5 букв, уникально среди активных групп. Менять можно лишь раз в шесть месяцев.","3–5 harf, etkin partiler arasında benzersiz. Altı ayda bir değiştirilebilir."],
  "Choose a unique Party name in Party options.": ["Выберите уникальное название в настройках группы.","Parti seçeneklerinden benzersiz bir ad seç."],
  "Choose 3–5 letters (A–Z). Names must be unique across active Parties. Your Party keeps the same members and ranking history.": ["Выберите 3–5 букв (A–Z). Название должно быть уникальным. Участники и история рейтинга сохраняются.","3–5 harf seç (A–Z). Ad, etkin partiler arasında benzersiz olmalı. Üyeler ve sıralama geçmişi korunur."],
  "Letters only": ["Только буквы","Yalnızca harfler"],
  "After saving, this name is locked for six months.": ["После сохранения название нельзя менять шесть месяцев.","Kaydedildikten sonra bu ad altı ay kilitlenir."],
  "Existing Parties can claim their first name now. It is then locked for six months.": ["Существующие группы могут выбрать первое название сейчас. Затем оно блокируется на шесть месяцев.","Mevcut partiler ilk adını şimdi seçebilir. Ardından altı ay kilitlenir."],
  "Next name change:": ["Следующая смена названия:","Sonraki ad değişikliği:"],
  "That Party name is already taken.": ["Это название группы уже занято.","Bu parti adı zaten alınmış."],
  "This Party name cannot be changed yet.": ["Название группы пока нельзя изменить.","Bu parti adı henüz değiştirilemez."],
  "Use 3–5 letters and choose a different name.": ["Используйте 3–5 букв и выберите другое название.","3–5 harf kullan ve başka bir ad seç."],
  "Save new name": ["Сохранить новое название","Yeni adı kaydet"],
  "Claim Party name": ["Закрепить название группы","Parti adını al"],
  // Compact victory receipt labels (Russian and Turkish).
  "To claim": ["К получению","Alınacak"],
  "Already earned": ["Уже начислено","Zaten kazanıldı"],
  "Total from this run": ["Всего за этот поход","Bu seferden toplam"],
  "Estimated until claimed.": ["Предварительно до получения награды.","Ödül alınana kadar tahminidir."],
  "Reward details": ["Сведения о награде","Ödül ayrıntıları"],
  "{count} claims remaining": ["Осталось наград: {count}","Alınacak {count} ödül kaldı"],
  "Claimed": ["Получено","Alındı"],
  "Reward pending": ["Награда ожидается","Ödül bekleniyor"],
  "No companion": ["Без спутника","Yoldaş yok"],
  "Combat Marks capped": ["Лимит боевых знаков достигнут","Savaş Nişanı sınırına ulaşıldı"],
  // Dungeon Endurance screen translations (Russian/Turkish).
  "Boon gained": ["Получено благословение","Lütuf kazanıldı"],
  "Choose an artifact": ["Выберите артефакт","Bir eser seç"],
  "BOSS EXIT AVAILABLE": ["ДОСТУПЕН ВЫХОД К БОССУ","BOSS ÇIKIŞI AÇILDI"],
  "Choose your artifact above to continue.": ["Выберите артефакт выше, чтобы продолжить.","Devam etmek için yukarıdan eserini seç."],
  "Vote to finish with the boss, or continue deeper together.": ["Проголосуйте: завершить поход боем с боссом или идти дальше вместе.","Boss ile bitirmek veya birlikte daha derine inmek için oy verin."],
  "Fight the boss to finish now, or continue deeper for a harder challenge.": ["Сразитесь с боссом, чтобы закончить сейчас, или идите глубже ради более сложного испытания.","Şimdi bitirmek için boss ile savaş veya daha zorlu bir mücadele için ilerle."],
  "Combat Marks": ["Боевые знаки","Savaş Nişanları"],
  "Run Build": ["Усиления похода","Sefer geliştirmeleri"],
  "boons": ["благословения","lütuflar"],
  "artifacts": ["артефакты","eserler"],
  "final capped award": ["последняя награда с учётом лимита","son sınırlı ödül"],
  // Online roster additions.
  "VELDRYN COMMUNITY": ["СООБЩЕСТВО VELDRYN","VELDRYN TOPLULUĞU"],
  "Online players": ["Игроки в сети","Çevrimiçi oyuncular"],
  "Total character level": ["Суммарный уровень персонажей","Toplam karakter seviyesi"],
  "Active (30m)": ["Активны (30 мин)","Etkin (30 dk)"],
  "Active in Last 30 Minutes": ["Активны за последние 30 минут","Son 30 dakikada aktif"],
  "View players active in the last 30 minutes": ["Посмотреть игроков, активных за последние 30 минут","Son 30 dakikada aktif oyuncuları gör"],
  "Close active players": ["Закрыть список активных игроков","Aktif oyuncu listesini kapat"],
  "Search active players": ["Поиск активных игроков","Aktif oyuncu ara"],
  "Recently active, not necessarily online now": ["Недавно были активны, но сейчас могут быть не в сети","Yakın zamanda aktif; şu an çevrimdışı olabilir"],
  "Unable to refresh active players.": ["Не удалось обновить список активных игроков.","Aktif oyuncular yenilenemedi."],
  "Active list unavailable": ["Список активных игроков недоступен","Aktif oyuncu listesi kullanılamıyor"],
  "No recently active players": ["Нет недавно активных игроков","Son zamanlarda aktif oyuncu yok"],
  "Players appear here after activity within the last 30 minutes.": ["Здесь появляются игроки, активные за последние 30 минут.","Oyuncular son 30 dakikada etkinlik gösterdiklerinde burada görünür."],
  "Online": ["В сети","Çevrimiçi"],
  "loading": ["загрузка","yükleniyor"],
  "View the list of players online": ["Посмотреть список игроков в сети","Çevrimiçi oyuncuları gör"],
  "Close online players": ["Закрыть список игроков","Oyuncu listesini kapat"],
  "Search online players": ["Поиск игроков в сети","Çevrimiçi oyuncu ara"],
  "Search players...": ["Поиск игроков...","Oyuncu ara..."],
  "Clear search": ["Очистить поиск","Aramayı temizle"],
  "Active within the last few minutes": ["Активны за последние минуты","Son birkaç dakikada aktif"],
  "Unable to refresh online players.": ["Не удалось обновить список игроков.","Çevrimiçi oyuncular yenilenemedi."],
  "View player profile and social actions": ["Открыть профиль и действия","Profili ve sosyal işlemleri gör"],
  " (You)": [" (Вы)"," (Sen)"],
  "Lv.": ["Ур.","Sv."],
  "Friend": ["Друг","Arkadaş"],
  "Loading players...": ["Загрузка игроков...","Oyuncular yükleniyor..."],
  "Online list unavailable": ["Список недоступен","Çevrimiçi liste kullanılamıyor"],
  "No matching players": ["Игроки не найдены","Eşleşen oyuncu yok"],
  "No players online": ["Нет игроков в сети","Çevrimiçi oyuncu yok"],
  "Try another search or filter.": ["Попробуйте другой поиск или фильтр.","Başka bir arama veya filtre deneyin."],
  "Players appear here when they are active in Veldryn.": ["Здесь появятся активные игроки Veldryn.","Veldryn'de aktif oyuncular burada görünür."],
  "Showing the first {count} players.": ["Показаны первые {count} игроков.","İlk {count} oyuncu gösteriliyor."],
  // Hidden Rankings guided help.
  "Showing last verified standings. Retry to update.": ["Показан последний подтверждённый рейтинг. Повторите попытку обновления.","Son doğrulanmış sıralama gösteriliyor. Güncellemek için yeniden deneyin."],
  "Updated {time}": ["Обновлено {time}","Güncellendi {time}"],
  "Privacy and tied ranks": ["Приватность и равные места","Gizlilik ve eşit sıralar"],
  "Equal scores may share a rank. Hidden or blocked players never promote other players into a higher official rank.": ["При равных результатах место может совпадать. Скрытые и заблокированные игроки не повышают официальные места других.","Eşit puanlar aynı sırayı paylaşabilir. Gizli veya engellenen oyuncular başkalarının resmi sırasını yükseltmez."],
  "HALL OF RENOWN": ["ЗАЛ СЛАВЫ","ŞÖHRET SALONU"],
  "LEADER": ["ЛИДЕР","LİDER"],
  "GLOBAL": ["ОБЩИЙ","GENEL"],
  "Current rank": ["Текущее место","Güncel sıra"],
  "Verified score": ["Проверенный результат","Doğrulanmış puan"],
  "RANKED PLAYERS": ["ИГРОКИ В РЕЙТИНГЕ","SIRALAMADAKİ OYUNCULAR"],
  "Server-ranked · Privacy protected": ["Рейтинг сервера · Приватность защищена","Sunucu sıralaması · Gizlilik korumalı"],
  "Rankings guide": ["Справка по рейтингу","Sıralama rehberi"],
  // Read-only Rankings pagination.
  "No further ranked entries": ["Больше записей в рейтинге нет","Başka sıralama kaydı yok"],
  "Return to the previous page to view ranked entries.": ["Вернитесь на предыдущую страницу, чтобы увидеть рейтинг.","Sıralamayı görmek için önceki sayfaya dön."],
  "Previous": ["Назад","Önceki"],
  "Next": ["Далее","Sonraki"],
  "Page": ["Страница","Sayfa"],
  "Entries {first}–{last}": ["Строки {first}–{last}","Kayıtlar {first}–{last}"],
  "Live rankings can change while players progress.": ["Рейтинг может измениться по мере развития игроков.","Oyuncular ilerledikçe canlı sıralamalar değişebilir."],
  // RU/TR Dungeon tonic, healing and companion setup.
  "Choose the healing potion type to use in this dungeon.": ["Выберите тип лечебного зелья для этого подземелья.","Bu zindan için iyileştirme iksiri türünü seç."],
  "Tap to choose potion ›": ["Нажмите, чтобы выбрать зелье ›","İksir seçmek için dokun ›"],
  "Choose one buff tonic for the run. It is spent before the first room, never while queueing.": ["Выберите тоник. Он расходуется перед первой комнатой, но не в очереди.","Bir tonik seç. İlk odadan önce tüketilir, sırada beklerken değil."],
  "Tap to choose your dungeon tonic": ["Выбрать тоник подземелья","Zindan toniğini seç"],
  "Select one buff tonic for your dungeon. It is consumed before the first room, lasts the whole run, and is not refunded on failure.": ["Выберите тоник. Он расходуется перед первой комнатой, действует весь поход и не возвращается при поражении.","Bir tonik seç. İlk odadan önce tüketilir, tüm sefer sürer ve başarısızlıkta iade edilmez."],
  "No tonic for this run": ["Без тоника в этом походе","Bu sefer tonik yok"],
  "No buff tonic will be consumed. You can still prepare one manually before the first room.": ["Тоник не будет израсходован. Его можно подготовить перед первой комнатой.","Tonik tüketilmeyecek. İlk odadan önce hazırlayabilirsin."],
  "One buff tonic per run, plus one selected healing potion type. You can use multiple carried healing potions between rooms.": ["Один тоник на поход и один тип лечебного зелья. Между комнатами можно использовать несколько зелий.","Sefer başına bir tonik ve bir iyileştirme iksiri türü. Odalar arasında birden fazla iksir kullanabilirsin."],
  "Choose healing potion": ["Выбрать лечебное зелье","İyileştirme iksiri seç"],
  "Select one healing potion type. Potions are only consumed when you heal during the dungeon; choosing one is free.": ["Выберите тип лечебного зелья. Оно расходуется только при лечении; выбор бесплатен.","İyileştirme iksiri türünü seç. Yalnızca iyileşirken tüketilir; seçim ücretsizdir."],
  "Restores {percent}% maximum HP": ["Восстанавливает {percent}% максимальных ОЗ","Azami canın %{percent} kadarını yeniler"],
  "No healing potion": ["Без лечебного зелья","İyileştirme iksiri yok"],
  "Keep your healing potion slot empty for this dungeon.": ["Оставьте ячейку лечебного зелья пустой.","İyileştirme iksiri yuvasını boş bırak."],
  "Saving healing potion selection…": ["Сохранение выбора лечебного зелья…","İyileştirme iksiri seçimi kaydediliyor…"],
  "Healing potion charges still follow dungeon difficulty limits. Food is disabled.": ["Число применений зелий ограничено сложностью. Еда отключена.","İksir kullanımları zindan zorluğuyla sınırlıdır. Yemek devre dışıdır."],
  "Dungeon Finder": ["Поиск подземелий","Zindan Bulucu"],
  "Shop": ["Магазин","Mağaza"],
  "World Chat": ["Мировой чат","Dünya sohbeti"],
  "Back to Dungeons": ["Назад к подземельям","Zindanlara dön"],
  "Only your Party leader can invite other players.": ["Только лидер вашей группы может приглашать игроков.","Diğer oyuncuları yalnızca grup liderin davet edebilir."],
  "This player already belongs to another Party.": ["Этот игрок уже состоит в другой группе.","Bu oyuncu zaten başka bir grupta."],
  "Your Party recruitment post expired": ["Объявление вашей группы о наборе истекло","Grubunun üye arama ilanının süresi doldu"],
  "Your Party is hidden from recruitment until the post is renewed.": ["Ваша группа скрыта из поиска, пока объявление не обновлено.","İlan yenilenene kadar grubun üye aramada görünmez."],
  "Renew post": ["Обновить объявление","İlanı yenile"],
  "Your recruitment posts": ["Ваши объявления о наборе","Üye arama ilanların"],
  "EXPIRED": ["ИСТЕКЛО","SÜRESİ DOLDU"],
  "This post is no longer visible in Recruitment. Renew it to reopen.": ["Объявление больше не видно в поиске группы. Обновите его, чтобы снова открыть.","Bu ilan artık üye aramada görünmüyor. Yeniden açmak için yenile."],
  "Renewal is available only while you can recruit for this group.": ["Обновление доступно, только если вы можете набирать игроков в эту группу.","Yenileme yalnızca bu gruba üye alma yetkin varsa kullanılabilir."],
  "No recruitment posts": ["Нет объявлений о наборе","Üye arama ilanı yok"],
  "Selected tonic prepared automatically for this dungeon.": ["Выбранный тоник автоматически подготовлен для этого подземелья.","Seçilen tonik bu zindan için otomatik hazırlandı."],
  "Invalid active dungeon run response.": ["Недопустимый ответ об активном походе.","Aktif zindan koşusu için geçersiz yanıt."],
  "This dungeon run cannot be restarted.": ["Этот поход в подземелье нельзя начать заново.","Bu zindan koşusu yeniden başlatılamaz."],
  "This dungeon or difficulty is no longer available.": ["Это подземелье или уровень сложности больше недоступны.","Bu zindan veya zorluk seviyesi artık mevcut değil."],
  "Your dungeon loadout changed. Refresh your equipment before running again.": ["Снаряжение для подземелья изменилось. Обновите его перед новым заходом.","Zindan ekipmanın değişti. Yeniden başlamadan önce ekipmanını yenile."],
  "Could not create a fresh dungeon run.": ["Не удалось создать новый поход в подземелье.","Yeni bir zindan koşusu başlatılamadı."],
  "Choose dungeon tonic": ["Выбрать тоник подземелья","Zindan toniği seç"],
  "Select a tonic from your inventory. Selection does not spend it.": ["Выберите тоник из инвентаря. Сам выбор его не расходует.","Envanterinden bir tonik seç. Seçmek onu tüketmez."],
  "Choose enhancement tonic": ["Выбрать усиливающий тоник","Güçlendirme toniği seç"],
  "Select a tonic for this dungeon": ["Выберите тоник для подземелья","Bu zindan için tonik seç"],
  "{count} total": ["Всего: {count}","Toplam {count}"],
  "Auto-use selected tonic": ["Автоматически применить выбранный тоник","Seçilen toniği otomatik kullan"],
  "Out of stock — select or craft more before the run.": ["Нет в наличии — выберите другой или изготовьте ещё до похода.","Stokta yok — koşudan önce başka birini seç veya üret."],
  "Uses one before the first room, never while queueing.": ["Расходуется один перед первой комнатой, но не во время поиска группы.","İlk odadan önce bir tane tüketilir; sırada beklerken tüketilmez."],
  "Select a tonic now; it will not be consumed until the dungeon begins.": ["Выберите тоник сейчас; он будет потрачен только при начале подземелья.","Şimdi tonik seç; zindan başlamadan tüketilmez."],
  "No automatic tonic": ["Без автоматического тоника","Otomatik tonik yok"],
  "You can still prepare a tonic manually during the run.": ["Во время похода тоник всё ещё можно подготовить вручную.","Koşu sırasında toniği yine elle hazırlayabilirsin."],
  "One tonic per run. Availability is verified when used.": ["Один тоник на поход. Наличие проверяется при применении.","Her koşuda bir tonik. Kullanılırken stok doğrulanır."],
  "On Expedition": ["В экспедиции","Seferde"],
  "In Trial · Available": ["На испытании · доступен","Denemede · Kullanılabilir"],
  "Trial companions can assist. Expedition companions remain unavailable.": ["Спутники в испытаниях могут помогать. Спутники в экспедициях недоступны.","Denemedeki yoldaşlar yardım edebilir. Seferdekiler kullanılamaz."],
  "Open party chat": ["Открыть чат группы","Grup sohbetini aç"],
  "Live": ["Вживую","Canlı"],
  "Message could not be sent. Try again.": ["Не удалось отправить сообщение. Повторите попытку.","Mesaj gönderilemedi. Tekrar dene."],
  "Visual preview · calculating battle": ["Предпросмотр · рассчитывается бой","Görsel önizleme · savaş hesaplanıyor"],
  "Marks": ["Знаки","Nişanlar"],
  "You are already friends with {name}.": ["Вы уже друзья с {name}.","{name} ile zaten arkadaşsın."],
  "You already have a friend request from {name}. Check Requests.": ["У вас уже есть заявка в друзья от {name}. Проверьте запросы.","{name} sana zaten arkadaşlık isteği gönderdi. İstekleri kontrol et."],
  "Your friend request is already pending.": ["Ваш запрос в друзья уже ожидает ответа.","Arkadaşlık isteğin zaten beklemede."],
  "Already friends": ["Уже друзья","Zaten arkadaş"],
  "+{marks} Expedition Marks earned": ["Получено +{marks} знаков экспедиции","+{marks} Sefer Nişanı kazanıldı"],
  "Reward amount is being prepared.": ["Количество награды рассчитывается.","Ödül miktarı hazırlanıyor."],
  "Estimated · final Marks confirmed when claimed.": ["Оценка · окончательное число знаков подтверждается при получении.","Tahmini · kesin Nişan miktarı ödül alınırken onaylanır."],
  "Refresh battle status": ["Обновить состояние боя","Savaş durumunu yenile"],
  "Echo sharing unlocks at character level 10.": ["Публикация Эха открывается на 10-м уровне персонажа.","Yankı paylaşımı 10. karakter seviyesinde açılır."],
  "Echo sharing requires 2,500 Combat Power.": ["Для публикации Эха нужно 2 500 боевой мощи.","Yankı paylaşımı için 2.500 Savaş Gücü gerekir."],
  "{points} shared points left": ["Осталось {points} общих очков","{points} ortak puan kaldı"],
  "No failed-run reward receipt yet. Weekly consolation rewards may be exhausted; refresh to check.": ["Пока нет записи о награде за неудачный поход. Еженедельные утешительные награды могли закончиться — обновите данные.","Başarısız sefer ödül kaydı henüz yok. Haftalık teselli ödülleri bitmiş olabilir; yenileyip kontrol et."],
  "Choose a boon": ["Выберите благословение","Bir lütuf seç"],
  "Select one reward before entering the next room.": ["Выберите одну награду перед переходом в следующую комнату.","Sonraki odaya geçmeden önce bir ödül seç."],
  "Choose your boon above to continue.": ["Для продолжения выберите благословение выше.","Devam etmek için yukarıdan bir lütuf seç."],
  "Continue dungeon": ["Продолжить подземелье","Zindana devam et"],
  "Opening exchange": ["Начало боя","Çatışma başlangıcı"],
  "Your week": [
    "Ваша неделя",
    "Bu hafta"
  ],
  "Boss room": [
    "Комната босса",
    "Boss odası"
  ],
  "Party ready check": [
    "Проверка готовности группы",
    "Grup hazır kontrolü"
  ],
  "Vote ends in {seconds}s": [
    "Голосование завершится через {seconds} с",
    "Oylama {seconds} sn sonra bitiyor"
  ],
  "Enhanced: {charges} charges · {weekly} weekly rewards left": [
    "Усиленные заряды: {charges} · Недельных наград осталось: {weekly}",
    "Güçlendirilmiş: {charges} hak · Bu hafta {weekly} ödül kaldı"
  ],
  "Your vote is saved. Waiting for your party…": [
    "Ваш голос сохранён. Ожидаем группу…",
    "Verdiğin oy kaydedildi. Grubun bekleniyor…"
  ],
  "A verified Live-ready loadout is required.": [
    "Нужен подтверждённый набор снаряжения для живого похода.",
    "Doğrulanmış Canlı sefere hazır dizilim gerekli."
  ],
  "Update Echo from current gear": [
    "Обновить Эхо с текущим снаряжением",
    "Yankıyı mevcut ekipmanla güncelle"
  ],
  "Room cleared": [
    "Комната пройдена",
    "Oda tamamlandı"
  ],
  "Preferred language": [
    "Предпочитаемый язык",
    "Tercih edilen dil"
  ],
  "My Posts": [
    "Мои объявления",
    "İlanlarım"
  ],
  "{count} results": [
    "Результатов: {count}",
    "{count} sonuç"
  ],
  "{count} compatible recruitment adverts": [
    "Подходящих объявлений: {count}",
    "{count} uygun ilan"
  ],
  "{count} open slots": [
    "Свободно мест: {count}",
    "{count} boş yer"
  ],
  "PRIVATE PARTY INVITATIONS": [
    "ЛИЧНЫЕ ПРИГЛАШЕНИЯ В ГРУППУ",
    "ÖZEL GRUP DAVETLERİ"
  ],
  "{current} OF {goal}": [
    "{current} ИЗ {goal}",
    "{current}/{goal}"
  ],
  "Earn 1 Rally Mark at {count} points today.": [
    "Получите 1 знак сбора за {count} очков сегодня.",
    "Bugün {count} puanda 1 Ralli İşareti kazan."
  ],
  "Your combat setup": [
    "Ваша боевая подготовка",
    "Savaş hazırlığın"
  ],
  "Current selection": [
    "Текущий выбор",
    "Mevcut seçim"
  ],
  "Companion": [
    "Спутник",
    "Yoldaş"
  ],
  "Healing potion": [
    "Лечебное зелье",
    "İyileştirme iksiri"
  ],
  "Enhancement tonics": [
    "Усиливающие настойки",
    "Güçlendirme tonikleri"
  ],
  "None equipped": [
    "Ничего не экипировано",
    "Hiçbiri kuşanılmadı"
  ],
  "Equipped": [
    "Экипировано",
    "Kuşanıldı"
  ],
  "None selected": [
    "Ничего не выбрано",
    "Seçilmedi"
  ],
  "Select in HP menu": [
    "Выбрать в меню здоровья",
    "Sağlık menüsünden seç"
  ],
  "No potion is spent while queueing": [
    "Зелья не расходуются во время ожидания",
    "Sırada beklerken iksir harcanmaz"
  ],
  "Healing uses carried potions; food is disabled in dungeons.": [
    "Лечение использует взятые с собой зелья. Еда в подземельях недоступна.",
    "İyileştirme taşınan iksirleri kullanır; zindanlarda yemek devre dışıdır."
  ],
  "Choose your healing potion in the HP menu before queuing.": [
    "Перед поиском группы выберите лечебное зелье в меню здоровья.",
    "Sıraya girmeden önce sağlık menüsünden iyileştirme iksirini seç."
  ],
  "Companion assist": [
    "Помощь спутника",
    "Yoldaş yardımı"
  ],
  "Dungeons": [
    "Подземелья",
    "Zindanlar"
  ],
  "Quick Match": [
    "Быстрый подбор",
    "Hızlı Eşleşme"
  ],
  "Find Party": [
    "Найти группу",
    "Grup bul"
  ],
  "LIVE QUICK MATCH": [
    "БЫСТРЫЙ ПОДБОР LIVE",
    "CANLI HIZLI EŞLEŞME"
  ],
  "Any eligible dungeon": [
    "Любое доступное подземелье",
    "Uygun herhangi bir zindan"
  ],
  "FASTEST POOL": [
    "САМЫЙ БЫСТРЫЙ ПОДБОР",
    "EN HIZLI EŞLEŞME"
  ],
  "LIVE GROUP BOARD": [
    "ДОСКА ГРУПП LIVE",
    "CANLI GRUP PANOSU"
  ],
  "30-minute LFG posts": [
    "Объявления на 30 минут",
    "30 dakikalık grup ilanları"
  ],
  "Refresh": [
    "Обновить",
    "Yenile"
  ],
  "Replace my post": [
    "Заменить объявление",
    "İlanımı değiştir"
  ],
  "Post LFG": [
    "Создать объявление",
    "Grup ilanı yayımla"
  ],
  "DUNGEON": [
    "ПОДЗЕМЕЛЬЕ",
    "ZİNDAN"
  ],
  "OPTIONAL NOTE": [
    "НЕОБЯЗАТЕЛЬНАЯ ЗАМЕТКА",
    "İSTEĞE BAĞLI NOT"
  ],
  "Co-op LFG note": [
    "Заметка для поиска группы",
    "Ortak sefer ilan notu"
  ],
  "Starting now, chill run, learning boss…": [
    "Начинаем сейчас, спокойный поход, учимся боссу…",
    "Hemen başlıyoruz, rahat sefer, patronu öğreniyoruz…"
  ],
  "Remove": [
    "Удалить",
    "Kaldır"
  ],
  "Join this search": [
    "Присоединиться к поиску",
    "Bu aramaya katıl"
  ],
  "No other Live LFG posts right now. Quick Match is still available.": [
    "Сейчас нет других объявлений Live. Быстрый подбор доступен.",
    "Şu an başka Canlı ilan yok. Hızlı Eşleşme kullanılabilir."
  ],
  "Guild": [
    "Гильдия",
    "Lonca"
  ],
  "Guild Hall": [
    "Зал гильдии",
    "Lonca Salonu"
  ],
  "Guild Quests": [
    "Задания гильдии",
    "Lonca Görevleri"
  ],
  "Claim": [
    "Забрать",
    "Al"
  ],
  "Progress": [
    "Прогресс",
    "İlerleme"
  ],
  "Members": [
    "Участники",
    "Üyeler"
  ],
  "Available": [
    "Доступно",
    "Kullanılabilir"
  ],
  "Locked": [
    "Закрыто",
    "Kilitli"
  ],
  "Ready": [
    "Готово",
    "Hazır"
  ],
  "COMBAT INSPECT": [
    "ОСМОТР БОЯ",
    "SAVAŞ İNCELEMESİ"
  ],
  "HP": [
    "ЗД",
    "CAN"
  ],
  "BARRIER": [
    "БАРЬЕР",
    "BARİYER"
  ],
  "PHASE": [
    "ФАЗА",
    "AŞAMA"
  ],
  "COMPANION": [
    "СПУТНИК",
    "YOLDAŞ"
  ],
  "ACTIVE EFFECTS": [
    "АКТИВНЫЕ ЭФФЕКТЫ",
    "ETKİN ETKİLER"
  ],
  "ACTIVE CAST": [
    "ПРИМЕНЕНИЕ УМЕНИЯ",
    "AKTİF BÜYÜ"
  ],
  "INTERRUPTIBLE CAST": [
    "ПРЕРЫВАЕМОЕ УМЕНИЕ",
    "KESİLEBİLİR BÜYÜ"
  ],
  "Vote on a route": [
    "Голосуйте за маршрут",
    "Rotaya oy ver"
  ],
  "Choose a room": [
    "Выберите комнату",
    "Oda seç"
  ],
  "Battle in progress": [
    "Бой идёт",
    "Savaş sürüyor"
  ],
  "Encounter cleared": [
    "Противник побеждён",
    "Karşılaşma tamamlandı"
  ],
  "Party defeated": [
    "Группа побеждена",
    "Grup yenildi"
  ],
  "Battle complete": [
    "Бой завершён",
    "Savaş tamamlandı"
  ],
  "EXPEDITION CLEARED": [
    "ЭКСПЕДИЦИЯ ПРОЙДЕНА",
    "SEFER TAMAMLANDI"
  ],
  "EXPEDITION ENDED": [
    "ЭКСПЕДИЦИЯ ЗАВЕРШЕНА",
    "SEFER SONA ERDİ"
  ],
  "Victory secured!": [
    "Победа!",
    "Zafer kazanıldı!"
  ],
  "Run complete": [
    "Поход завершён",
    "Sefer tamamlandı"
  ],
  "Uses your verified role and sends you to the eligible dungeon where your role helps matchmaking most. The matched party still uses Auto Tier.": [
    "Подбор направит вас в подходящее подземелье, где ваша подтверждённая роль нужнее всего. Уровень группы выбирается автоматически.",
    "Doğrulanmış rolün en çok ihtiyaç duyulan uygun zindana yönlendirilir. Grup otomatik kademe kullanır."
  ],
  "Short-lived dungeon adverts only. Posts disappear after 30 minutes and never create a second Party system.": [
    "Только временные объявления о подземельях. Они исчезают через 30 минут и не создают вторую систему групп.",
    "Yalnızca kısa süreli zindan ilanları. 30 dakika sonra kaybolur; ikinci bir grup sistemi oluşturmaz."
  ],
  "{count} LIVE": [
    "{count} В СЕТИ",
    "{count} CANLI"
  ],
  "{count}/140 · expires 30 minutes after posting": [
    "{count}/140 · исчезнет через 30 минут после публикации",
    "{count}/140 · yayımlandıktan 30 dakika sonra sona erer"
  ],
  "Your post · {name} · {time}": [
    "Ваше объявление · {name} · {time}",
    "İlanın · {name} · {time}"
  ],
  "Auto Tier ≤ {tier}": [
    "Автоуровень ≤ {tier}",
    "Otomatik kademe ≤ {tier}"
  ],
  "Combat details for {name}": [
    "Сведения о бое: {name}",
    "{name} savaş ayrıntıları"
  ],
  "Focus → {name}": [
    "Цель → {name}",
    "Hedef → {name}"
  ],
  "+{count} more active effects": [
    "Ещё активных эффектов: {count}",
    "+{count} ek etkin etki"
  ],
  "Effect Gem": [
    "Камень эффекта",
    "Etki Taşı"
  ],
  "Damage over time": [
    "Периодический урон",
    "Zamanla hasar"
  ],
  "Healing over time": [
    "Периодическое лечение",
    "Zamanla iyileştirme"
  ],
  "Debuff": [
    "Ослабление",
    "Zayıflatma"
  ],
  "Buff": [
    "Усиление",
    "Güçlendirme"
  ],
  "Final Boss": [
    "Финальный босс",
    "Son patron"
  ],
  "Dungeon Enemy": [
    "Противник подземелья",
    "Zindan düşmanı"
  ],
    "NEW EFFECT RECIPE UNLOCKED": ["ОТКРЫТ НОВЫЙ РЕЦЕПТ ЭФФЕКТА","YENİ ETKİ TARİFİ AÇILDI"],
  "Effect Gem Recipe": ["Рецепт самоцвета эффекта","Etki Mücevheri Tarifi"],
  "Permanently learned. Combine this Effect Gem family in Enchanting; this unlock is not a gem item.": ["Рецепт изучен навсегда. Объединяйте самоцветы этого семейства в Зачаровании. Открытие рецепта не выдаёт самоцвет.","Kalıcı olarak öğrenildi. Bu Etki Mücevheri ailesini Büyüleme'de birleştir. Tarifin açılması sana bir mücevher eşyası vermez."],
  "Any additional gems or catalysts are delivered directly to your account on claim. Check your Gem Pouch and Enchanting.": ["Дополнительные самоцветы и катализаторы после получения награды поступают прямо на аккаунт. Проверьте сумку самоцветов и Зачарование.","Ek mücevherler veya katalizörler ödülü aldığında doğrudan hesabına eklenir. Mücevher Keseni ve Büyüleme'yi kontrol et."],
  "Your expedition rewards are secured. Return when you are ready.": [
    "Награды за экспедицию сохранены. Возвращайтесь, когда будете готовы.",
    "Sefer ödüllerin güvence altında. Hazır olduğunda geri dön."
  ],
  "Final encounter cleared. Collect the expedition reward below.": [
    "Последний бой пройден. Заберите награду за экспедицию ниже.",
    "Son karşılaşma tamamlandı. Sefer ödülünü aşağıdan al."
  ],
  "Final encounter cleared. Your reward entitlement is being prepared.": [
    "Последний бой пройден. Награда готовится к выдаче.",
    "Son karşılaşma tamamlandı. Ödülün hazırlanıyor."
  ],
  "This expedition has ended. Review any available rewards before returning.": [
    "Экспедиция завершена. Перед возвращением проверьте доступные награды.",
    "Sefer sona erdi. Dönmeden önce alınabilecek ödülleri kontrol et."
  ],
  "Room in progress": ["Комната проходится","Oda devam ediyor"],
  "Resolving the selected room": ["Выбранная комната завершается","Seçilen oda tamamlanıyor"],
  "Saving room progress": ["Сохранение прогресса комнаты","Oda ilerlemesi kaydediliyor"],
  "Sealed boon": ["Запечатанное благословение","Mühürlü lütuf"],
  "Run artifact": ["Артефакт похода","Sefer eseri"],
  "Restorative salve": ["Целебная мазь","İyileştirici merhem"],
  "Bought {item}": ["Куплено: {item}","{item} satın alındı"],
  "Restored {amount} HP": ["Восстановлено {amount} ОЗ","{amount} Can yenilendi"],
  "Revived {count}": ["Возрождено: {count}","{count} kişi canlandırıldı"],
  "{count} boon gained": ["Получено благословений: {count}","{count} lütuf kazanıldı"],
  "{count} artifact gained": ["Получено артефактов: {count}","{count} eser kazanıldı"],
  "{count} curse gained": ["Получено проклятий: {count}","{count} lanet edinildi"],
  "{amount} resources": ["Ресурсы: {amount}","{amount} kaynak"],
  "Grants a dungeon boon": ["Даёт благословение подземелья","Zindan lütfu verir"],
  "Grants a dungeon artifact": ["Даёт артефакт подземелья","Zindan eseri verir"],
  "Restores 35% HP": ["Восстанавливает 35% ОЗ","%35 Can yeniler"],
  "Merchant offers": ["Товары торговца","Tüccar teklifleri"],
  "Random passive effect for your party. Identity revealed on pickup.": ["Случайный пассивный эффект для группы. Он откроется после получения.","Grubun için rastgele pasif etki. Alındığında ortaya çıkar."],
  "Persistent run item. Effect triggers in combat.": ["Предмет на весь поход. Эффект срабатывает в бою.","Sefer boyunca kalan eşya. Etkisi savaşta tetiklenir."],
  "Instantly heals the chosen ally. No mystery here.": ["Мгновенно исцеляет выбранного союзника. Без сюрпризов.","Seçilen müttefiki anında iyileştirir. Sürpriz yok."],
  "Spend at Expedition Shop": ["Потратить в магазине экспедиций","Sefer Mağazasında harca"],
  "Dungeon resources": ["Ресурсы подземелья","Zindan kaynakları"],
  "Purchased": ["Куплено","Satın alındı"],
  "Buy": ["Купить","Satın al"],
  "DUNGEON COMBAT": ["БОЙ В ПОДЗЕМЕЛЬЕ","ZİNDAN SAVAŞI"],
  "View battle": ["Посмотреть бой","Savaşı izle"],
  "Vote for the next path": ["Голосовать за следующий путь","Sonraki rotaya oy ver"],
  "Choose the next room": ["Выбрать следующую комнату","Sonraki odayı seç"],
  "The route with the most votes will be selected.": ["Будет выбран путь с наибольшим числом голосов.","En çok oy alan rota seçilir."],
  "Party & formation": ["Группа и построение","Grup ve diziliş"],
  "NPC": ["НПС","NPC"],
  "Frozen Echo companion": ["Спутник сохранённого Эха","Kaydedilmiş Yankı yoldaşı"],
  "Party companion": ["Спутник группы","Grup yoldaşı"],
  "Echo companions use the published snapshot.": ["Спутники Эха используют сохранённый снимок.","Yankı yoldaşları paylaşılan kaydı kullanır."],
  "LIVE LINK": ["ЖИВОЕ СОЕДИНЕНИЕ","CANLI BAĞLANTI"],
  "SAFETY AI": ["ЗАЩИТНЫЙ ИИ","KORUMA YZ"],
  "ALL CONNECTED": ["ВСЕ НА СВЯЗИ","HERKES BAĞLI"],
  "Objectives & mechanics": ["Цели и механики","Hedefler ve mekanikler"],
  "Party Chat": ["Чат группы","Grup sohbeti"],
  "View rewards": ["Посмотреть награды","Ödülleri gör"],
  "Preparing expedition rewards. You can retry if they have not appeared yet.": ["Подготавливаются награды за экспедицию. Если они пока не появились, попробуйте снова.","Sefer ödülleri hazırlanıyor. Henüz görünmüyorsa tekrar deneyebilirsin."],
  "Expedition Marks": ["Знаки экспедиции","Sefer Nişanları"],
  "Live Fellowship bonus: +{marks} Marks": ["Бонус боевого товарищества: +{marks} знаков","Canlı Yoldaşlık bonusu: +{marks} Nişan"],
  "Consolation reward · No enhanced charge spent.": ["Утешительная награда · Усиленный заряд не потрачен.","Teselli ödülü · Güçlendirilmiş hak harcanmadı."],
  "CLAIMED": ["ПОЛУЧЕНО","ALINDI"],
  "READY": ["ГОТОВО","HAZIR"],
  "Claim rewards": ["Забрать награды","Ödülleri al"],
  "Seasonal reward collected.": ["Сезонная награда получена.","Sezon ödülü alındı."],
  "Rematch with this party": ["Повторить бой с этой группой","Bu grupla tekrar oyna"],
  "Refresh rewards": ["Обновить награды","Ödülleri yenile"],
  "Return to dungeon list": ["К списку подземелий","Zindan listesine dön"],
  "FINAL BOSS": ["ФИНАЛЬНЫЙ БОСС","SON BOSS"],
  "BOSS OUTLOOK": ["ОБЗОР БОССА","BOSS ÖZETİ"],
  "phase": ["фаза","aşama"],
  "phases": ["фазы","aşamalar"],
  "INTERRUPT": ["ПРЕРВАТЬ","KES"],
  "WATCH": ["СЛЕДИТЬ","İZLE"],
  "Hide boss details": ["Скрыть сведения о боссе","Boss ayrıntılarını gizle"],
  "Boss details": ["Сведения о боссе","Boss ayrıntıları"],
  "PHASES": ["ФАЗЫ","AŞAMALAR"],
  "Objective-sensitive": ["Зависит от цели","Hedefe duyarlı"],
  "ABILITIES": ["СПОСОБНОСТИ","YETENEKLER"],
  "cast": ["применение","hazırlık"],
  "cooldown": ["перезарядка","bekleme"],
  "SUPPRESSED": ["ПОДАВЛЕНО","ENGELLENDİ"],
  "Hide boss recap": ["Скрыть итог боя с боссом","Boss özetini gizle"],
  "Boss recap": ["Итоги боя с боссом","Boss özeti"],
  "BOSS RECAP": ["ИТОГИ БОЯ С БОССОМ","BOSS ÖZETİ"],
  "down": ["нокаут","düşüş"],
  "downs": ["нокаутов","düşüş"],
  "Phases triggered": ["Активированные фазы","Tetiklenen aşamalar"],
  "No threshold phases triggered.": ["Ни одна фаза по порогу здоровья не сработала.","Can eşiğine bağlı aşama tetiklenmedi."],
  "Boss casts seen": ["Применённые умения босса","Görülen boss büyüleri"],
  "No boss casts started before the fight ended.": ["До конца боя босс не начал применять умения.","Savaş bitmeden boss yeteneği başlamadı."],
  // Dungeon Marks: distinguish already-credited combat from claimable completion.
  "This run · Expedition Marks": ["Этот поход · Знаки экспедиции","Bu sefer · Sefer Nişanları"],
  "Enemy encounters · already credited": ["Сражения с врагами · уже начислено","Düşman karşılaşmaları · zaten eklendi"],
  "Normal: {normal} × 3 · Elite: {elite} × 5": ["Обычные: {normal} × 3 · Элитные: {elite} × 5","Normal: {normal} × 3 · Elit: {elite} × 5"],
  "Combat Marks breakdown unavailable. Refresh to retry.": ["Сведения о боевых знаках недоступны. Обновите и повторите.","Savaş Nişanı dökümü kullanılamıyor. Tekrar denemek için yenile."],
  "Completion reward · claim below": ["Награда за завершение · заберите ниже","Tamamlama ödülü · aşağıdan al"],
  "Total Marks from this run": ["Всего знаков за этот поход","Bu seferin toplam Nişanı"],
  "Combat Marks are already in your wallet. Completion Marks are added only when claimed.": ["Боевые знаки уже на вашем счёте. Знаки за завершение начисляются только после получения награды.","Savaş Nişanları bakiyene zaten eklendi. Tamamlama Nişanları yalnızca ödülü aldığında eklenir."],
  "Total is estimated until the claim is complete.": ["Сумма приблизительная, пока награда не получена.","Ödül alınana kadar toplam tahminidir."],
} as const satisfies Partial<Record<SocialMessageKey,readonly [string,string]>>;

export function socialEarlyText(language:'ru'|'tr',key:string):string|undefined{
 const row=Object.prototype.hasOwnProperty.call(socialEarlyRows,key)
  ? socialEarlyRows[key as keyof typeof socialEarlyRows]:undefined;
 return row?.[language==='ru'?0:1];
}

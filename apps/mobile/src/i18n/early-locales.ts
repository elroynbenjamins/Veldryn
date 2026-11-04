import type {Language} from './languages';

// Starter-only RU/TR copy; missing phrases deliberately fall back to English.
const EARLY_LOCALE_ROWS={
  "Home": [
    "Главная",
    "Ana Sayfa"
  ],
  "World": [
    "Мир",
    "Dünya"
  ],
  "Character": [
    "Персонаж",
    "Karakter"
  ],
  "Skills": [
    "Навыки",
    "Beceriler"
  ],
  "Inventory": [
    "Инвентарь",
    "Envanter"
  ],
  "Account": [
    "Аккаунт",
    "Hesap"
  ],
  "More": [
    "Ещё",
    "Diğer"
  ],
  "Settings": [
    "Настройки",
    "Ayarlar"
  ],
  "Language": [
    "Язык",
    "Dil"
  ],
  "Guild": [
    "Гильдия",
    "Lonca"
  ],
  "Party": [
    "Группа",
    "Grup"
  ],
  "Dungeon": [
    "Подземелье",
    "Zindan"
  ],
  "Quests": [
    "Задания",
    "Görevler"
  ],
  "Events": [
    "События",
    "Etkinlikler"
  ],
  "Friends": [
    "Друзья",
    "Arkadaşlar"
  ],
  "Profile": [
    "Профиль",
    "Profil"
  ],
  "Companions": [
    "Спутники",
    "Yoldaşlar"
  ],
  "Combat": [
    "Бой",
    "Savaş"
  ],
  "Arena": [
    "Арена",
    "Arena"
  ],
  "Rankings": [
    "Рейтинг",
    "Sıralamalar"
  ],
  "Collections": [
    "Коллекции",
    "Koleksiyonlar"
  ],
  "Characters": [
    "Персонажи",
    "Karakterler"
  ],
  "Achievements": [
    "Достижения",
    "Başarılar"
  ],
  "Recruitment": [
    "Набор",
    "Oyuncu Arama"
  ],
  "Bank": [
    "Банк",
    "Banka"
  ],
  "Crafting": [
    "Ремесло",
    "Üretim"
  ],
  "Gathering": [
    "Сбор ресурсов",
    "Toplama"
  ],
  "Alchemy": [
    "Алхимия",
    "Simya"
  ],
  "Forge": [
    "Кузница",
    "Demirhane"
  ],
  "Shop": [
    "Магазин",
    "Mağaza"
  ],
  "Store": [
    "Магазин",
    "Mağaza"
  ],
  "Gold": [
    "Золото",
    "Altın"
  ],
  "GOLD": [
    "ЗОЛОТО",
    "ALTIN"
  ],
  "Back": [
    "Назад",
    "Geri"
  ],
  "Continue": [
    "Продолжить",
    "Devam et"
  ],
  "Next": [
    "Далее",
    "İleri"
  ],
  "Previous": [
    "Назад",
    "Önceki"
  ],
  "Cancel": [
    "Отмена",
    "İptal"
  ],
  "Close": [
    "Закрыть",
    "Kapat"
  ],
  "Close dialog": [
    "Закрыть окно",
    "Pencereyi kapat"
  ],
  "Confirm": [
    "Подтвердить",
    "Onayla"
  ],
  "Done": [
    "Готово",
    "Bitti"
  ],
  "Save": [
    "Сохранить",
    "Kaydet"
  ],
  "Edit": [
    "Изменить",
    "Düzenle"
  ],
  "Delete": [
    "Удалить",
    "Sil"
  ],
  "Retry": [
    "Повторить",
    "Yeniden dene"
  ],
  "Search": [
    "Поиск",
    "Ara"
  ],
  "Clear search": [
    "Очистить поиск",
    "Aramayı temizle"
  ],
  "Loading…": [
    "Загрузка…",
    "Yükleniyor…"
  ],
  "Loading": [
    "Загрузка",
    "Yükleniyor"
  ],
  "Ready": [
    "Готово",
    "Hazır"
  ],
  "Available": [
    "Доступно",
    "Kullanılabilir"
  ],
  "Locked": [
    "Заблокировано",
    "Kilitli"
  ],
  "Claim": [
    "Получить",
    "Al"
  ],
  "Claim all": [
    "Получить всё",
    "Tümünü al"
  ],
  "Reward claimed.": [
    "Награда получена.",
    "Ödül alındı."
  ],
  "Rewards": [
    "Награды",
    "Ödüller"
  ],
  "Send": [
    "Отправить",
    "Gönder"
  ],
  "Refresh": [
    "Обновить",
    "Yenile"
  ],
  "Online": [
    "В сети",
    "Çevrimiçi"
  ],
  "Start": [
    "Начать",
    "Başlat"
  ],
  "Stop": [
    "Остановить",
    "Durdur"
  ],
  "Equip": [
    "Надеть",
    "Kuşan"
  ],
  "Unequip": [
    "Снять",
    "Çıkar"
  ],
  "Compare": [
    "Сравнить",
    "Karşılaştır"
  ],
  "Open": [
    "Открыть",
    "Aç"
  ],
  "Details": [
    "Подробнее",
    "Ayrıntılar"
  ],
  "Active": [
    "Активно",
    "Etkin"
  ],
  "Inactive": [
    "Неактивно",
    "Etkin değil"
  ],
  "Damage": [
    "Урон",
    "Hasar"
  ],
  "Defense": [
    "Защита",
    "Savunma"
  ],
  "Healing": [
    "Исцеление",
    "İyileştirme"
  ],
  "Tank": [
    "Танк",
    "Tank"
  ],
  "Support": [
    "Поддержка",
    "Destek"
  ],
  "Victory": [
    "Победа",
    "Zafer"
  ],
  "Not ready": [
    "Не готово",
    "Hazır değil"
  ],
  "LIVE ENCOUNTER": [
    "БОЙ В РЕАЛЬНОМ ВРЕМЕНИ",
    "CANLI KARŞILAŞMA"
  ],
  "damage": [
    "урон",
    "hasar"
  ],
  "Choose your calling": [
    "Выберите класс",
    "Sınıfını seç"
  ],
  "Choose your character name.": [
    "Выберите имя персонажа.",
    "Karakterinin adını seç."
  ],
  "Your adventure begins here.": [
    "Ваше приключение начинается здесь.",
    "Maceran burada başlıyor."
  ],
  "CREATE YOUR FIRST CHARACTER": [
    "СОЗДАЙТЕ ПЕРВОГО ПЕРСОНАЖА",
    "İLK KARAKTERİNİ OLUŞTUR"
  ],
  "CREATE A CHARACTER": [
    "СОЗДАТЬ ПЕРСОНАЖА",
    "KARAKTER OLUŞTUR"
  ],
  "CHARACTER NAME": [
    "ИМЯ ПЕРСОНАЖА",
    "KARAKTER ADI"
  ],
  "NAME IDEAS": [
    "ВАРИАНТЫ ИМЕНИ",
    "İSİM ÖNERİLERİ"
  ],
  "Character identity": [
    "Данные персонажа",
    "Karakter kimliği"
  ],
  "Choose a name. Your class emblem is your first profile icon.": [
    "Выберите имя. Эмблема класса станет первым значком профиля.",
    "Bir isim seç. Sınıf amblemin ilk profil simgen olacak."
  ],
  "Who enters Asterfall?": [
    "Кто вступит в Астерфолл?",
    "Asterfall'a kim adım atıyor?"
  ],
  "CLASS": [
    "КЛАСС",
    "SINIF"
  ],
  "IDENTITY": [
    "ПЕРСОНАЖ",
    "KİMLİK"
  ],
  "REVIEW": [
    "ПРОВЕРКА",
    "KONTROL"
  ],
  "Choose identity": [
    "Выбрать персонажа",
    "Kimlik seç"
  ],
  "Review character": [
    "Проверить персонажа",
    "Karakteri gözden geçir"
  ],
  "Ready to begin?": [
    "Готовы начать?",
    "Başlamaya hazır mısın?"
  ],
  "Create character": [
    "Создать персонажа",
    "Karakter oluştur"
  ],
  "Character creation": [
    "Создание персонажа",
    "Karakter oluşturma"
  ],
  "Name your adventurer": [
    "Назовите героя",
    "Maceracına ad ver"
  ],
  "Enter character name": [
    "Введите имя персонажа",
    "Karakter adını gir"
  ],
  "Valid name": [
    "Допустимое имя",
    "Geçerli ad"
  ],
  "AVAILABLE CLASSES": [
    "ДОСТУПНЫЕ КЛАССЫ",
    "MEVCUT SINIFLAR"
  ],
  "Your class cannot be changed after creating this character.": [
    "После создания персонажа изменить класс нельзя.",
    "Bu karakter oluşturulduktan sonra sınıfı değiştirilemez."
  ],
  "You can change this anytime in Settings.": [
    "Это можно изменить в настройках в любое время.",
    "Bunu istediğin zaman Ayarlar'dan değiştirebilirsin."
  ],
  "Account roster": [
    "Персонажи аккаунта",
    "Hesap karakterleri"
  ],
  "Account skills": [
    "Навыки аккаунта",
    "Hesap becerileri"
  ],
  "active": [
    "активен",
    "etkin"
  ],
  "Switch": [
    "Переключить",
    "Değiştir"
  ],
  "Notifications": [
    "Уведомления",
    "Bildirimler"
  ],
  "Account & profile": [
    "Аккаунт и профиль",
    "Hesap ve profil"
  ],
  "Gameplay": [
    "Игровой процесс",
    "Oynanış"
  ],
  "Display & accessibility": [
    "Экран и доступность",
    "Görünüm ve erişilebilirlik"
  ],
  "Session controls": [
    "Управление сеансом",
    "Oturum kontrolleri"
  ],
  "Privacy & data": [
    "Конфиденциальность и данные",
    "Gizlilik ve veriler"
  ],
  "Core navigation and setup are translated. Untranslated gameplay text falls back to English.": [
    "Основные разделы и настройка переведены. Остальной текст пока отображается на английском.",
    "Ana menü ve kurulum çevrildi. Henüz çevrilmemiş oyun metinleri İngilizce gösterilir."
  ],
  "Tune your local prototype experience. Changes save automatically.": [
    "Настройте игру. Изменения сохраняются автоматически.",
    "Oyunu özelleştir. Değişiklikler otomatik kaydedilir."
  ],
  "Craft complete": [
    "Предмет создан",
    "Üretim tamamlandı"
  ],
  "Cannot craft": [
    "Не удалось создать предмет",
    "Üretilemiyor"
  ],
  "Skills & Crafting": [
    "Навыки и ремесло",
    "Beceriler ve üretim"
  ],
  "World chat": [
    "Мировой чат",
    "Dünya sohbeti"
  ],
  "Guild chat": [
    "Чат гильдии",
    "Lonca sohbeti"
  ],
  "Open World chat": [
    "Открыть мировой чат",
    "Dünya sohbetini aç"
  ],
  "Close chat": [
    "Закрыть чат",
    "Sohbeti kapat"
  ],
  "Message this world…": [
    "Написать в мировой чат…",
    "Bu dünyaya mesaj yaz…"
  ],
  "No messages yet.": [
    "Сообщений пока нет.",
    "Henüz mesaj yok."
  ],
  "SAVE RECOVERY": [
    "ВОССТАНОВЛЕНИЕ СОХРАНЕНИЯ",
    "KAYIT KURTARMA"
  ],
  "Retry loading": [
    "Повторить загрузку",
    "Yüklemeyi yeniden dene"
  ],
  "Start fresh…": [
    "Начать заново…",
    "Baştan başla…"
  ],
  "Overflow Chest": [
    "Сундук переполнения",
    "Taşan eşya sandığı"
  ],
  "Move {count} items to Bank": [
    "Переместить {count} предметов в банк",
    "{count} eşyayı bankaya taşı"
  ],
  "{count} notifications": [
    "Уведомления: {count}",
    "{count} bildirim"
  ],
  "{amount} gold": [
    "Золото: {amount}",
    "{amount} altın"
  ],
  "{current} of {max} health": [
    "Здоровье: {current} из {max}",
    "{max} candan {current}"
  ],
  "UPDATE REQUIRED": [
    "ТРЕБУЕТСЯ ОБНОВЛЕНИЕ",
    "GÜNCELLEME GEREKLİ"
  ],
  "Update VELDRYN": [
    "Обновить VELDRYN",
    "VELDRYN'i güncelle"
  ],
  "Unable to check for updates": [
    "Не удалось проверить обновления",
    "Güncellemeler denetlenemedi"
  ],
  "Connect to the internet and retry to verify this version of VELDRYN.": [
    "Подключитесь к интернету и повторите проверку версии VELDRYN.",
    "VELDRYN sürümünü doğrulamak için internete bağlanıp yeniden deneyin."
  ],
  "Cancel confirmation": [
    "Отменить подтверждение",
    "Onayı iptal et"
  ],
  "SERVICE STATUS": [
    "СОСТОЯНИЕ СЕРВИСА",
    "HİZMET DURUMU"
  ],
  "Installed": [
    "Установлено",
    "Yüklü"
  ],
  "Required": [
    "Требуется",
    "Gerekli"
  ],
  "The game will continue normally after the supported version is installed.": [
    "После установки поддерживаемой версии игра продолжится как обычно.",
    "Desteklenen sürüm yüklendiğinde oyuna normal şekilde devam edebilirsiniz."
  ],
  "Try again after maintenance has finished.": [
    "Повторите попытку после завершения обслуживания.",
    "Bakım bittikten sonra tekrar deneyin."
  ],
  "The local save could not be read.": [
    "Не удалось прочитать локальное сохранение.",
    "Yerel kayıt okunamadı."
  ],
  "No readable save state was returned.": [
    "Не найдено доступное сохранение.",
    "Okunabilir bir kayıt bulunamadı."
  ],
  "Working Toward": [
    "Текущая цель",
    "Hedeflerim"
  ],
  "Daily Supplies": [
    "Ежедневные припасы",
    "Günlük Malzemeler"
  ],
  "Account Bonuses": [
    "Бонусы аккаунта",
    "Hesap Bonusları"
  ],
  "Mastery Hall": [
    "Зал мастерства",
    "Ustalık Salonu"
  ],
  "Empty": [
    "Пусто",
    "Boş"
  ],
  "Social": [
    "Общение",
    "Sosyal"
  ],
  "Customize Profile": [
    "Настроить профиль",
    "Profili özelleştir"
  ],
  "Discard profile changes?": [
    "Отменить изменения профиля?",
    "Profil değişiklikleri silinsin mi?"
  ],
  "Keep editing": [
    "Продолжить редактирование",
    "Düzenlemeye devam et"
  ],
  "Discard changes": [
    "Отменить изменения",
    "Değişiklikleri sil"
  ],
  "Locked for now": [
    "Пока недоступно",
    "Şimdilik kilitli"
  ],
  "Save upgrade pending": [
    "Обновление сохранения ожидает записи",
    "Kayıt güncellemesi bekliyor"
  ],
  "Save pending": [
    "Сохранение ожидает записи",
    "Kayıt bekliyor"
  ],
  "Online action": [
    "Сетевое действие",
    "Çevrimiçi işlem"
  ],
  "Please retry.": [
    "Повторите попытку.",
    "Lütfen yeniden deneyin."
  ],
  "Please try again.": [
    "Пожалуйста, попробуйте снова.",
    "Lütfen tekrar deneyin."
  ],
  "Save imported": [
    "Сохранение импортировано",
    "Kayıt içe aktarıldı"
  ],
  "Action queue": [
    "Очередь действий",
    "İşlem kuyruğu"
  ],
  "Idle Rules": [
    "Правила бездействия",
    "Boşta Kalma Kuralları"
  ],
  "VELDRYN maintenance": [
    "Обслуживание VELDRYN",
    "VELDRYN bakımı"
  ],
  "Retry connection": [
    "Повторить подключение",
    "Bağlantıyı yeniden dene"
  ],
  "Connecting…": [
    "Подключение…",
    "Bağlanılıyor…"
  ],
  "Start fresh": [
    "Начать заново",
    "Baştan başla"
  ],
  "Retry pending action": [
    "Повторить действие",
    "Bekleyen işlemi yeniden dene"
  ],
  "Cannot travel": [
    "Переход недоступен",
    "Yolculuk yapılamıyor"
  ],
  "Cannot claim contract": [
    "Нельзя получить награду задания",
    "Sözleşme ödülü alınamıyor"
  ],
  "Cancel forge job?": [
    "Отменить работу кузницы?",
    "Demirhane işi iptal edilsin mi?"
  ],
  "Keep crafting": [
    "Продолжить создание",
    "Üretime devam et"
  ],
  "Cancel craft": [
    "Отменить создание",
    "Üretimi iptal et"
  ],
  "Forge complete": [
    "Ковка завершена",
    "Demirhane işi tamamlandı"
  ],
  "Gem combined": [
    "Самоцветы объединены",
    "Mücevherler birleştirildi"
  ],
  "Cannot claim forge job": [
    "Не удалось получить изделие",
    "Üretilen eşya alınamıyor"
  ],
  "Gem combines ready": [
    "Объединённые самоцветы готовы",
    "Birleştirilmiş mücevherler hazır"
  ],
  "Cannot equip tool": [
    "Нельзя экипировать инструмент",
    "Alet kuşanılamıyor"
  ],
  "Forge updated": [
    "Кузница обновлена",
    "Demirhane güncellendi"
  ],
  "Added to forge backlog": [
    "Добавлено в очередь кузницы",
    "Demirhane sırasına eklendi"
  ],
  "Crafting started": [
    "Создание началось",
    "Üretim başladı"
  ],
  "View character": [
    "Открыть персонажа",
    "Karakteri görüntüle"
  ],
  "Cannot upgrade": [
    "Нельзя улучшить",
    "Yükseltme yapılamıyor"
  ],
  "Cannot socket gem": [
    "Нельзя вставить самоцвет",
    "Mücevher yerleştirilemiyor"
  ],
  "Cannot replace gem": [
    "Нельзя заменить самоцвет",
    "Mücevher değiştirilemiyor"
  ],
  "Cannot extract gem": [
    "Нельзя извлечь самоцвет",
    "Mücevher çıkarılamıyor"
  ],
  "Cannot refine gem": [
    "Нельзя улучшить самоцвет",
    "Mücevher geliştirilemiyor"
  ],
  "Cannot combine gems": [
    "Нельзя объединить самоцветы",
    "Mücevherler birleştirilemiyor"
  ],
  "Cannot dismantle gem": [
    "Нельзя разобрать самоцвет",
    "Mücevher parçalanamıyor"
  ],
  "Online save": [
    "Облачное сохранение",
    "Çevrimiçi kayıt"
  ],
  "Reset local save?": [
    "Сбросить локальное сохранение?",
    "Yerel kayıt sıfırlansın mı?"
  ],
  "Reset": [
    "Сбросить",
    "Sıfırla"
  ],
  "{name} is ready.": [
    "{name} готов.",
    "{name} hazır."
  ],
  "Gem combines ready: {count}": [
    "Готовых объединений самоцветов: {count}",
    "Hazır mücevher birleşimi: {count}"
  ],
  "new activity": [
    "новое действие",
    "yeni etkinlik"
  ],
  "HP": [
    "ЗД",
    "CAN"
  ],
  "Open quick navigation": [
    "Открыть быстрый переход",
    "Hızlı gezinmeyi aç"
  ],
  "Open quick navigation, {count} need attention": [
    "Открыть быстрый переход, требуют внимания: {count}",
    "Hızlı gezinmeyi aç, {count} bildirim var"
  ],
  "Close quick navigation": [
    "Закрыть быстрый переход",
    "Hızlı gezinmeyi kapat"
  ],
  "PLAYER SHORTCUTS": [
    "БЫСТРЫЕ ПЕРЕХОДЫ",
    "OYUNCU KISAYOLLARI"
  ],
  "Choose five destinations": [
    "Выберите пять разделов",
    "Beş hedef seç"
  ],
  "Quick navigation": [
    "Быстрый переход",
    "Hızlı gezinme"
  ],
  "{count}/5 selected": [
    "Выбрано: {count}/5",
    "{count}/5 seçildi"
  ],
  "Save five": [
    "Сохранить пять",
    "Beşini kaydet"
  ],
  "NEEDS ATTENTION": [
    "ТРЕБУЕТ ВНИМАНИЯ",
    "İLGİ GEREKİYOR"
  ],
  "Customize shortcuts": [
    "Настроить ярлыки",
    "Kısayolları düzenle"
  ],
  "No system notices right now.": [
    "Системных уведомлений пока нет.",
    "Şu anda sistem bildirimi yok."
  ],
  "Forge ready": [
    "Кузница готова",
    "Demirhane hazır"
  ],
  "Weekly rewards ready": [
    "Недельные награды готовы",
    "Haftalık ödüller hazır"
  ],
  "Storage attention": [
    "Проверьте хранилище",
    "Depoyu kontrol et"
  ],
  "Event rewards remain": [
    "Остались награды события",
    "Etkinlik ödülleri bekliyor"
  ],
  "Event approaching": [
    "Скоро событие",
    "Etkinlik yaklaşıyor"
  ],
  "ROLE": [
    "РОЛЬ",
    "ROL"
  ],
  "Choose your class, name your character, and begin your journey through Asterfall.": [
    "Выберите класс и имя персонажа, чтобы начать путешествие по Астерфоллу.",
    "Sınıfını ve karakterinin adını seçerek Asterfall yolculuğuna başla."
  ],
  "Nine unique classes with different combat styles.": [
    "Девять классов с разными стилями боя.",
    "Farklı savaş tarzlarına sahip dokuz sınıf."
  ],
  "Create a name and choose your interface theme.": [
    "Выберите имя и тему интерфейса.",
    "Bir ad ve arayüz teması seç."
  ],
  "Select one of nine classes to see its strengths.": [
    "Выберите один из девяти классов, чтобы увидеть его сильные стороны.",
    "Güçlü yönlerini görmek için dokuz sınıftan birini seç."
  ],
  "Choose your character name and interface theme.": [
    "Выберите имя персонажа и тему интерфейса.",
    "Karakter adını ve arayüz temasını seç."
  ],
  "2–20 characters · Name required": [
    "2–20 символов · Имя обязательно",
    "2–20 karakter · Ad gerekli"
  ],
  "INTERFACE THEME": [
    "ТЕМА ИНТЕРФЕЙСА",
    "ARAYÜZ TEMASI"
  ],
  "{name} interface theme": [
    "Тема интерфейса: {name}",
    "{name} arayüz teması"
  ],
  "Review your choices before entering Asterfall.": [
    "Проверьте выбор перед входом в Астерфолл.",
    "Asterfall'a girmeden önce seçimlerini gözden geçir."
  ],
  "Plan your next goal": [
    "Выбрать следующую цель",
    "Sonraki hedefini planla"
  ],
  "Working Toward and Daily Supplies are now available.": [
    "Теперь доступны цели и ежедневные припасы.",
    "Hedeflerim ve Günlük Malzemeler artık kullanılabilir."
  ],
  "Choose a goal": [
    "Выбрать цель",
    "Hedef seç"
  ],
  "Open Asterfall Journal": [
    "Открыть дневник Астерфолла",
    "Asterfall Günlüğünü aç"
  ],
  "Already played VELDRYN? Sign in to your existing account": [
    "Уже играли в VELDRYN? Войдите в свой аккаунт",
    "VELDRYN'i daha önce oynadın mı? Hesabına giriş yap"
  ],
  "PLAY STYLE": [
    "СТИЛЬ ИГРЫ",
    "OYUN TARZI"
  ],
  "Lv. {level}": [
    "Ур. {level}",
    "Sv. {level}"
  ],
  "Adventurer": [
    "Искатель приключений",
    "Maceracı"
  ],
  "WHAT HAPPENS NEXT": [
    "ЧТО ДАЛЬШЕ",
    "SONRA NE OLACAK"
  ],
  "CHARACTER SAVE FAILED": [
    "ОШИБКА СОХРАНЕНИЯ ПЕРСОНАЖА",
    "KARAKTER KAYDEDİLEMEDİ"
  ],
  "Your character could not be saved. Your choices are still here; please try again.": [
    "Не удалось сохранить персонажа. Ваш выбор не потерян. Повторите попытку.",
    "Karakterin kaydedilemedi. Seçimlerin korunuyor, lütfen yeniden dene."
  ],
  "Saving character…": [
    "Сохранение персонажа…",
    "Karakter kaydediliyor…"
  ],
  "Enter Asterfall": [
    "Войти в Астерфолл",
    "Asterfall'a gir"
  ],
  "Create {name}?": [
    "Создать персонажа {name}?",
    "{name} oluşturulsun mu?"
  ],
  "Use at least 2 characters.": [
    "Введите не менее 2 символов.",
    "En az 2 karakter kullan."
  ],
  "Use no more than 20 characters.": [
    "Введите не более 20 символов.",
    "En fazla 20 karakter kullan."
  ],
  "Use Latin letters, single spaces, apostrophes, or hyphens for character names.": [
    "Для имени используйте латинские буквы, одиночные пробелы, апострофы и дефисы.",
    "Karakter adlarında Latin harfleri, tek boşluk, kesme işareti veya kısa çizgi kullan."
  ],
  "Previous class": [
    "Предыдущий класс",
    "Önceki sınıf"
  ],
  "Next class": [
    "Следующий класс",
    "Sonraki sınıf"
  ],
  "Select {name}": [
    "Выбрать {name}",
    "{name} seç"
  ],
  "Encounter abilities": [
    "Боевые умения",
    "Karşılaşma yetenekleri"
  ],
  "Automatic": [
    "Автоматически",
    "Otomatik"
  ],
  "Ability details": [
    "Описание умения",
    "Yetenek ayrıntıları"
  ],
  "Hide ability details": [
    "Скрыть описание умений",
    "Yetenek ayrıntılarını gizle"
  ],
  "Idle hunting": [
    "Охота без участия",
    "Boşta avlanma"
  ],
  "Hunt speed": [
    "Скорость охоты",
    "Av hızı"
  ],
  "Damage taken": [
    "Полученный урон",
    "Alınan hasar"
  ]
} satisfies Record<string,readonly [string,string]>;

export function earlyLocaleText(language:Language,source:string):string|undefined{
  if(language!=='ru'&&language!=='tr')return undefined;
  const row=Object.prototype.hasOwnProperty.call(EARLY_LOCALE_ROWS,source)
    ? EARLY_LOCALE_ROWS[source as keyof typeof EARLY_LOCALE_ROWS]:undefined;
  return row?.[language==='ru'?0:1];
}

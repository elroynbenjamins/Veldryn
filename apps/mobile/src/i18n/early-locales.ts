import type {Language} from './languages';
import {TURKISH_COVERAGE} from './turkish-coverage';
import {RUSSIAN_FOCUS_ROWS} from './russian-focus';

// Extended RU/TR copy; missing phrases deliberately fall back to English.
export const EARLY_LOCALE_ROWS={
  // Profile showcase empty states and selection guidance.
  "Choose an earned achievement": ["Выберите полученное достижение","Kazanılmış bir başarı seçin"],
  "Choose a personal record": ["Выберите личный рекорд","Bir kişisel rekor seçin"],
  "Choose a collectible": ["Выберите коллекционный предмет","Bir koleksiyon eşyası seçin"],
  "Master a profession action at R50": ["Достигните мастерства R50 в одном из ремёсел","Bir meslek eyleminde R50 ustalığına ulaşın"],
  "Selected R50 profession records": ["Выбранные рекорды мастерства R50","Seçilen R50 meslek kayıtları"],
  "Selected by player": ["Выбрано игроком","Oyuncunun seçimleri"],
  "No selections yet": ["Пока ничего не выбрано","Henüz seçim yapılmadı"],
  "{label} · choose up to 3 from Customize Profile.": ["{label} · выберите до 3 в настройках профиля.","{label} · Profil Özelleştirme bölümünden en fazla 3 tane seçin."],
  "Nothing featured yet": ["Пока ничего не показано","Henüz öne çıkarılan yok"],
  "SLOT {number}": ["ЯЧЕЙКА {number}","YUVA {number}"],
  "OPEN": ["СВОБОДНО","BOŞ"],
  // Character and Combat Power details for Russian and Turkish.
  "Edit profile": ["Изменить профиль","Profili düzenle"],
  "Combat Power": ["Боевая мощь","Savaş gücü"],
  "CLASS SKILLS · PASSIVE": ["НАВЫКИ КЛАССА · ПАССИВНО","SINIF BECERİLERİ · PASİF"],
  "COMBAT STYLE · PASSIVE": ["СТИЛЬ БОЯ · ПАССИВНО","SAVAŞ STİLİ · PASİF"],
  "COMPANION · PASSIVE BONUS": ["СПУТНИК · ПАССИВНЫЙ БОНУС","YOLDAŞ · PASİF BONUS"],
  "Combat bonus active": ["Боевой бонус активен","Savaş bonusu etkin"],
  "Show breakdown": ["Показать подробности","Ayrıntıları göster"],
  "Hide breakdown": ["Скрыть подробности","Ayrıntıları gizle"],
  "Combat Power breakdown": ["Подробности боевой мощи","Savaş gücü ayrıntıları"],
  "All stats": ["Все характеристики","Tüm özellikler"],
  "Class base": ["Основа класса","Sınıf temeli"],
  "Gear, sets & gems": ["Снаряжение, комплекты и самоцветы","Ekipman, setler ve taşlar"],
  "Other character bonuses": ["Другие бонусы персонажа","Diğer karakter bonusları"],
  "Combat companion": ["Боевой спутник","Savaş yoldaşı"],
  "Level {level} base stats": ["Базовые характеристики ур. {level}","Seviye {level} temel özellikleri"],
  "Equipped stat gains and build effects": ["Бонусы характеристик и эффекты снаряжения","Kuşanılan ekipmanın özellik ve yapı etkileri"],
  "Class training, Faith, preparation and permanent boosts": ["Тренировка класса, Вера, подготовка и постоянные бонусы","Sınıf eğitimi, İnanç, hazırlık ve kalıcı güçlendirmeler"],
  "No combat companion equipped": ["Боевой спутник не назначен","Savaş yoldaşı kuşanılmamış"],
  "{name} · Lv. {level} · Bond {bond}": ["{name} · Ур. {level} · Связь {bond}","{name} · Sv. {level} · Bağ {bond}"],
  "Combat Power is a comparison score from your live stats and equipped build. Encounter mechanics, target traits, and temporary effects can still change actual results.": ["Боевая мощь — сравнительная оценка ваших текущих характеристик и снаряжения. Механики боя, свойства врага и временные эффекты могут изменить реальный результат.","Savaş gücü, mevcut özellikleriniz ve ekipmanınıza dayalı karşılaştırmalı bir puandır. Karşılaşma mekanikleri, hedef özellikleri ve geçici etkiler gerçek sonucu değiştirebilir."],
  "Compare & Swap": ["Сравнить и заменить","Karşılaştır ve değiştir"],
  "crafted": ["создано","üretildi"],
  "Choose an equipped slot to compare its rarity and stats with gear you own.": ["Выберите ячейку с экипировкой, чтобы сравнить редкость и характеристики с другими предметами.","Kuşanılmış bir yuvayı seçerek nadirliğini ve özelliklerini sahip olduğunuz ekipmanlarla karşılaştırın."],
  "No Combat Companion": ["Нет боевого спутника","Savaş yoldaşı yok"],
  "Manage": ["Управлять","Yönet"],
  "Icon · background · border · title · Pet": ["Значок · фон · рамка · титул · питомец","Simge · arka plan · çerçeve · unvan · evcil hayvan"],
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
  ],
  "Your week": [
    "Ваша неделя",
    "Bu hafta"
  ],
  "Play together. Earn rewards.": [
    "Играйте вместе. Получайте награды.",
    "Birlikte oyna. Ödüller kazan."
  ],
  "Progress and rewards": [
    "Прогресс и награды",
    "İlerleme ve ödüller"
  ],
  "Dungeon resources": [
    "Ресурсы подземелья",
    "Zindan kaynakları"
  ],
  "Grants a dungeon boon": [
    "Даёт благословение подземелья",
    "Zindan lütfu verir"
  ],
  "Grants a dungeon artifact": [
    "Даёт артефакт подземелья",
    "Zindan eseri verir"
  ],
  "Room cleared": [
    "Комната пройдена",
    "Oda tamamlandı"
  ],
  "Battle room": [
    "Боевая комната",
    "Savaş odası"
  ],
  "Elite room": [
    "Элитный бой",
    "Seçkin oda"
  ],
  "Face the final encounter.": [
    "Сразитесь с финальным противником.",
    "Son karşılaşmaya hazırlan."
  ],
  "Restore your party's health.": [
    "Восстановите здоровье группы.",
    "Grubunun sağlığını yenile."
  ],
  "Gain resources, but take a curse.": [
    "Получите ресурсы, но примите проклятие.",
    "Kaynak kazan ama bir lanet al."
  ],
  "Earn resources for your run.": [
    "Получите ресурсы для текущей экспедиции.",
    "Seferin için kaynak kazan."
  ],
  "Boss room": [
    "Комната босса",
    "Boss odası"
  ],
  "Camp room": [
    "Лагерь",
    "Kamp odası"
  ],
  "Shrine room": [
    "Святилище",
    "Tapınak odası"
  ],
  "Forge room": [
    "Кузница",
    "Demirhane odası"
  ],
  "Treasure room": [
    "Сокровищница",
    "Hazine odası"
  ],
  "Merchant room": [
    "Торговец",
    "Tüccar odası"
  ],
  "Echo room": [
    "Комната Эха",
    "Yankı odası"
  ],
  "Risk room": [
    "Комната риска",
    "Risk odası"
  ],
  "Event room": [
    "Комната события",
    "Etkinlik odası"
  ],
  "Secret room": [
    "Тайная комната",
    "Gizli oda"
  ],
  "Fight the enemies ahead.": [
    "Сразитесь с врагами впереди.",
    "Önündeki düşmanlarla savaş."
  ],
  "Expect a tougher fight.": [
    "Впереди более сложный бой.",
    "Daha zorlu bir savaşa hazırlan."
  ],
  "Receive a dungeon boon.": [
    "Получите благословение подземелья.",
    "Zindan lütfu kazan."
  ],
  "Discover a dungeon artifact.": [
    "Найдите артефакт подземелья.",
    "Bir zindan eseri keşfet."
  ],
  "Visit a dungeon merchant.": [
    "Посетите торговца подземелья.",
    "Zindan tüccarını ziyaret et."
  ],
  "Saving room progress": [
    "Сохранение прогресса комнаты",
    "Oda ilerlemesi kaydediliyor"
  ],
  "Choose a room": [
    "Выберите комнату",
    "Bir oda seç"
  ],
  "Vote on a route": [
    "Голосовать за маршрут",
    "Rota için oy ver"
  ],
  "BOSS OUTLOOK": [
    "СВЕДЕНИЯ О БОССЕ",
    "BOSS BİLGİSİ"
  ],
  "Boss details": [
    "Подробности о боссе",
    "Boss ayrıntıları"
  ],
  "Hide boss details": [
    "Скрыть подробности о боссе",
    "Boss ayrıntılarını gizle"
  ],
  "Boss recap": [
    "Итоги боя с боссом",
    "Boss özeti"
  ],
  "Hide boss recap": [
    "Скрыть итоги боя",
    "Boss özetini gizle"
  ],
  "LIVE DUNGEON · REMATCH": [
    "ЖИВОЕ ПОДЗЕМЕЛЬЕ · РЕВАНШ",
    "CANLI ZİNDAN · YENİDEN"
  ],
  "Keep the party together": [
    "Сохранить группу",
    "Grubu birlikte tut"
  ],
  "Party ready check": [
    "Проверка готовности группы",
    "Grup hazır kontrolü"
  ],
  "Party member": [
    "Участник группы",
    "Grup üyesi"
  ],
  "All four members approved a new dungeon run.": [
    "Все четверо участников согласились на новый поход.",
    "Dört üyenin tamamı yeni zindan seferini onayladı."
  ],
  "Everyone must agree. Leaving or declining never starts a run. This ready check expires automatically.": [
    "Все должны согласиться. При выходе или отказе поход не начнётся. Проверка завершится автоматически.",
    "Herkes onaylamalı. Ayrılmak veya reddetmek seferi başlatmaz. Hazır kontrolü otomatik olarak sona erer."
  ],
  "Enter new dungeon": [
    "Войти в новое подземелье",
    "Yeni zindana gir"
  ],
  "Your vote is saved. Waiting for your party…": [
    "Голос учтён. Ожидание группы…",
    "Verdiğin oy kaydedildi. Grubun bekleniyor…"
  ],
  "Room in progress": [
    "Прохождение комнаты",
    "Oda devam ediyor"
  ],
  "Resolving the selected room": [
    "Завершение выбранной комнаты",
    "Seçilen oda sonuçlandırılıyor"
  ],
  "Resolving room · Progress is saved online.": [
    "Обработка комнаты · Прогресс сохранён на сервере.",
    "Oda sonuçlandırılıyor · İlerleme çevrimiçi kaydedildi."
  ],
  "Your encounter is running. Combat results will appear when the server settles this room.": [
    "Бой продолжается. Результат появится после обработки комнаты сервером.",
    "Karşılaşma sürüyor. Sunucu odayı sonuçlandırdığında savaş sonucu görünecek."
  ],
  "View rewards": [
    "Посмотреть награды",
    "Ödülleri görüntüle"
  ],
  "Rematch with this party": [
    "Повторить поход с этой группой",
    "Bu grupla yeniden dene"
  ],
  "Refresh rewards": [
    "Обновить награды",
    "Ödülleri yenile"
  ],
  "YOUR PARTY": [
    "ВАША ГРУППА",
    "GRUBUN"
  ],
  "Find new Live party": [
    "Найти новую живую группу",
    "Yeni canlı grup bul"
  ],
  "A verified Live-ready loadout is required.": [
    "Нужен подтверждённый набор снаряжения для живого похода.",
    "Canlı sefer için doğrulanmış bir ekipman düzeni gerekiyor."
  ],
  "Failed runs do not spend charges. {remaining} of 12 weekly consolation rewards left.": [
    "Неудачные походы не тратят заряды. Осталось утешительных наград за неделю: {remaining} из 12.",
    "Başarısız seferler hak tüketmez. Haftalık 12 teselli ödülünden kalan: {remaining}."
  ],
  "Consolation reward · No enhanced charge spent.": [
    "Утешительная награда · Усиленный заряд не потрачен.",
    "Teselli ödülü · Geliştirilmiş hak harcanmadı."
  ],
  "Enhanced: {charges} charges · {weekly} weekly rewards left": [
    "Усиленные заряды: {charges} · Недельных наград осталось: {weekly}",
    "Geliştirilmiş hak: {charges} · Kalan haftalık ödül: {weekly}"
  ],
  "Estimated clear reward · Tier {tier}": [
    "Ожидаемая награда · Ранг {tier}",
    "Tahmini tamamlama ödülü · Kademe {tier}"
  ],
  "weekly rewards": [
    "недельных наград",
    "haftalık ödüller"
  ],
  "After enhanced rewards: 20% Marks. Unlimited entries.": [
    "После усиленных наград: 20% знаков. Число входов не ограничено.",
    "Geliştirilmiş ödüllerden sonra: %20 İşaret. Giriş sınırsız."
  ],
  "One reward charge replenishes every 8 hours.": [
    "Один заряд награды восстанавливается каждые 8 часов.",
    "Her 8 saatte bir ödül hakkı yenilenir."
  ],
  "Vote ends in {seconds}s": [
    "Голосование завершится через {seconds} с",
    "Oylama {seconds} sn sonra bitiyor"
  ],
  "Vote for the next path": [
    "Голосовать за следующий путь",
    "Sonraki rota için oy ver"
  ],
  "Choose the next room": [
    "Выберите следующую комнату",
    "Sonraki odayı seç"
  ],
  "The route with the most votes will be selected.": [
    "Будет выбран маршрут с большинством голосов.",
    "En çok oyu alan rota seçilecek."
  ],
  "Party & formation": [
    "Группа и построение",
    "Grup ve diziliş"
  ],
  "Your vote": [
    "Ваш голос",
    "Oyun"
  ],
  "Your party": [
    "Ваша группа",
    "Grubun"
  ],
  "Recruitment & members": [
    "Набор и участники",
    "Oyuncu arama ve üyeler"
  ],
  "Guild recruitment": [
    "Набор в гильдию",
    "Lonca üye alımı"
  ],
  "LIVE COMBAT": [
    "ЖИВОЙ БОЙ",
    "CANLI SAVAŞ"
  ],
  "Opening Party Chat…": [
    "Открытие чата группы…",
    "Grup sohbeti açılıyor…"
  ],
  "Checking your Party…": [
    "Проверка группы…",
    "Grubun kontrol ediliyor…"
  ],
  "Choose room": [
    "Выбрать комнату",
    "Oda seç"
  ],
  "votes": [
    "голосов",
    "oy"
  ],
  "My Echo · Current equipment": [
    "Моё Эхо · Текущее снаряжение",
    "Yankım · Mevcut ekipman"
  ],
  "Your character Echo is shared with other adventurers.": [
    "Эхо персонажа доступно другим искателям приключений.",
    "Karakter Yankın diğer maceracılarla paylaşılır."
  ],
  "Prepare a snapshot of your current dungeon loadout for other players.": [
    "Создайте снимок текущего набора снаряжения для других игроков.",
    "Mevcut zindan ekipmanının diğer oyunculara yönelik bir kopyasını hazırla."
  ],
  "READY TO SHARE": [
    "ГОТОВО К ПУБЛИКАЦИИ",
    "PAYLAŞMAYA HAZIR"
  ],
  "NOT READY": [
    "НЕ ГОТОВО",
    "HAZIR DEĞİL"
  ],
  "Echo sharing unlocks at character level 15.": [
    "Обмен Эхом откроется на 15-м уровне персонажа.",
    "Yankı paylaşımı karakter seviyesi 15'te açılır."
  ],
  "Update Echo from current gear": [
    "Обновить Эхо по текущему снаряжению",
    "Yankıyı mevcut ekipmanla güncelle"
  ],
  "DUNGEONS": [
    "ПОДЗЕМЕЛЬЯ",
    "ZİNDANLAR"
  ],
  "DUNGEON": [
    "ПОДЗЕМЕЛЬЕ",
    "ZİNDAN"
  ],
  "Open Dungeons": [
    "Открыть подземелья",
    "Zindanları aç"
  ],
  "Dungeons are available when online play is configured.": [
    "Подземелья доступны при настроенной сетевой игре.",
    "Çevrimiçi oyun yapılandırıldığında zindanlar kullanılabilir."
  ],
  "REWARD": [
    "НАГРАДА",
    "ÖDÜL"
  ],
  "REWARDS": [
    "НАГРАДЫ",
    "ÖDÜLLER"
  ],
  "REWARD READY": [
    "НАГРАДА ГОТОВА",
    "ÖDÜL HAZIR"
  ],
  "Reward already collected": [
    "Награда уже получена",
    "Ödül zaten alındı"
  ],
  "Rewards collected": [
    "Награды получены",
    "Ödüller alındı"
  ],
  "NEXT REWARD": [
    "СЛЕДУЮЩАЯ НАГРАДА",
    "SONRAKİ ÖDÜL"
  ],
  "DAMAGE": [
    "УРОН",
    "HASAR"
  ],
  "SUPPORT": [
    "ПОДДЕРЖКА",
    "DESTEK"
  ],
  "BOSS HEALING POTIONS": [
    "ЛЕЧЕБНЫЕ ЗЕЛЬЯ ДЛЯ БОССОВ",
    "BOSS İYİLEŞTİRME İKSİRLERİ"
  ],
  "Selected for bosses": [
    "Выбрано для боссов",
    "Bosslar için seçildi"
  ],
  "Select for bosses": [
    "Выбрать для боссов",
    "Bosslar için seç"
  ],
  "No healing potions carried. Brew them in Alchemy or withdraw from Bank.": [
    "При себе нет лечебных зелий. Создайте их в Алхимии или возьмите из банка.",
    "Yanında iyileştirme iksiri yok. Simya ile üret veya Bankadan al."
  ],
  "Clear boss potion choice": [
    "Сбросить выбор зелья для босса",
    "Boss iksiri seçimini temizle"
  ],
  "Health is full": [
    "Здоровье полное",
    "Can dolu"
  ],
  "Combat stopped": [
    "Бой остановлен",
    "Savaş durduruldu"
  ],
  "Combat stopped. Too injured. Open food.": [
    "Бой остановлен. Мало здоровья. Откройте еду.",
    "Savaş durdu. Can çok az. Yiyecekleri aç."
  ],
  "Combat stopped. View results.": [
    "Бой остановлен. Посмотрите результаты.",
    "Savaş durdu. Sonuçları görüntüle."
  ],
  "Loot & encounter details": [
    "Добыча и подробности боя",
    "Ganimet ve karşılaşma ayrıntıları"
  ],
  "Attack": [
    "Атака",
    "Saldırı"
  ],
  "Combat XP": [
    "Опыт боя",
    "Savaş TP"
  ],
  "Skill level": [
    "Уровень навыка",
    "Beceri seviyesi"
  ],
  "Reward ready": [
    "Награда готова",
    "Ödül hazır"
  ],
  "Ready only": [
    "Только готовые",
    "Yalnızca hazır olanlar"
  ],
  "Queue full": [
    "Очередь заполнена",
    "Kuyruk dolu"
  ],
  "Ready to brew": [
    "Готово к варке",
    "İksir hazırlamaya hazır"
  ],
  "Ready to process": [
    "Готово к обработке",
    "İşlemeye hazır"
  ],
  "Stop combat when out of food": [
    "Останавливать бой, когда закончится еда",
    "Yiyecek bitince savaşı durdur"
  ],
  "NEW PARTY": [
    "НОВАЯ ГРУППА",
    "YENİ GRUP"
  ],
  "PARTY SETTINGS": [
    "НАСТРОЙКИ ГРУППЫ",
    "GRUP AYARLARI"
  ],
  "Party preferences": [
    "Настройки группы",
    "Grup tercihleri"
  ],
  "Change how other players discover your Party. Existing members stay.": [
    "Измените, как другие игроки находят вашу группу. Участники останутся.",
    "Diğer oyuncuların grubunu nasıl bulduğunu değiştir. Mevcut üyeler kalır."
  ],
  "Choose the kind of teammates you want to play with.": [
    "Выберите, с какими игроками хотите играть.",
    "Birlikte oynamak istediğin takım arkadaşlarını seç."
  ],
  "Activity level": [
    "Уровень активности",
    "Etkinlik düzeyi"
  ],
  "Tryhard": [
    "Упорная игра",
    "Rekabetçi"
  ],
  "Regular": [
    "Регулярно",
    "Düzenli"
  ],
  "Casual": [
    "Неспешно",
    "Rahat"
  ],
  "Active play": [
    "Активная игра",
    "Aktif oyun"
  ],
  "Play whenever you like": [
    "Играйте, когда удобно",
    "İstediğin zaman oyna"
  ],
  "Regular play and group activities": [
    "Регулярная игра и групповые занятия",
    "Düzenli oyun ve grup etkinlikleri"
  ],
  "Push progression and efficiency": [
    "Упор на прогресс и эффективность",
    "İlerlemeye ve verimliliğe odaklan"
  ],
  "Preferred language": [
    "Предпочитаемый язык",
    "Tercih edilen dil"
  ],
  "Any language": [
    "Любой язык",
    "Herhangi bir dil"
  ],
  "For discovery and communication only. Players are not blocked by language.": [
    "Только для поиска и общения. Язык не ограничивает вступление.",
    "Yalnızca arama ve iletişim içindir. Dil, katılmayı engellemez."
  ],
  "Minimum combat level": [
    "Минимальный боевой уровень",
    "Asgari savaş seviyesi"
  ],
  "Optional · all levels welcome by default": [
    "Необязательно · По умолчанию любой уровень",
    "İsteğe bağlı · Varsayılan olarak tüm seviyeler kabul edilir"
  ],
  "Required level": [
    "Требуемый уровень",
    "Gerekli seviye"
  ],
  "Up to 4 players · All classes welcome": [
    "До 4 игроков · Любые классы",
    "En fazla 4 oyuncu · Tüm sınıflar kabul edilir"
  ],
  "Save preferences": [
    "Сохранить настройки",
    "Tercihleri kaydet"
  ],
  "PARTY RECRUITMENT": [
    "НАБОР В ГРУППУ",
    "GRUP OYUNCU ARAMA"
  ],
  "Find teammates": [
    "Найти соратников",
    "Takım arkadaşları bul"
  ],
  "Looking for a Party": [
    "Ищу группу",
    "Grup arıyorum"
  ],
  "Make your Party easy for others to find.": [
    "Помогите другим игрокам найти вашу группу.",
    "Diğer oyuncuların grubunu kolayca bulmasını sağla."
  ],
  "Tell Party leaders what you are looking for.": [
    "Расскажите лидерам групп, что вы ищете.",
    "Grup liderlerine ne aradığını anlat."
  ],
  "Your Party": [
    "Ваша группа",
    "Grubun"
  ],
  "{count} open": [
    "Свободно: {count}",
    "{count} boş yer"
  ],
  "Language and minimum level follow your Party settings.": [
    "Язык и минимальный уровень берутся из настроек группы.",
    "Dil ve asgari seviye grup ayarlarından alınır."
  ],
  "How active is your Party?": [
    "Насколько активна ваша группа?",
    "Grubun ne kadar aktif?"
  ],
  "How active are you?": [
    "Насколько вы активны?",
    "Ne kadar aktifsin?"
  ],
  "Choose how often you plan to play together.": [
    "Укажите, как часто планируете играть вместе.",
    "Birlikte ne sıklıkta oynayacağınızı seçin."
  ],
  "Post title": [
    "Название объявления",
    "İlan başlığı"
  ],
  "Recruitment title": [
    "Название объявления о наборе",
    "Oyuncu arama başlığı"
  ],
  "Looking for active teammates": [
    "Ищем активных игроков",
    "Aktif takım arkadaşları aranıyor"
  ],
  "Description": [
    "Описание",
    "Açıklama"
  ],
  "Recruitment description": [
    "Описание объявления о наборе",
    "Oyuncu arama açıklaması"
  ],
  "What would you like to do together?": [
    "Чем хотите заниматься вместе?",
    "Birlikte ne yapmak istersiniz?"
  ],
  "Expires automatically after 24 hours": [
    "Срок действия — 24 часа",
    "24 saat sonra otomatik sona erer"
  ],
  "Publish recruitment post": [
    "Опубликовать объявление",
    "Oyuncu arama ilanını yayımla"
  ],
  "Create a Party": [
    "Создать группу",
    "Grup oluştur"
  ],
  "Create Party": [
    "Создать группу",
    "Grup oluştur"
  ],
  "Publishing…": [
    "Публикация…",
    "Yayımlanıyor…"
  ],
  "FIND YOUR FELLOWSHIP": [
    "НАЙДИТЕ СОЮЗНИКОВ",
    "YOLDAŞLARINI BUL"
  ],
  "Find players, Parties and Guilds": [
    "Ищите игроков, группы и гильдии",
    "Oyuncular, gruplar ve loncalar bul"
  ],
  "Browse": [
    "Обзор",
    "Göz at"
  ],
  "My Posts": [
    "Мои объявления",
    "İlanlarım"
  ],
  "Hide": [
    "Скрыть",
    "Gizle"
  ],
  "View": [
    "Просмотр",
    "Görüntüle"
  ],
  "GUILD RECRUITMENT": [
    "НАБОР В ГИЛЬДИЮ",
    "LONCA OYUNCU ARAMA"
  ],
  "Find the right teammates": [
    "Найдите подходящих соратников",
    "Uygun takım arkadaşlarını bul"
  ],
  "Find your Guild connection": [
    "Найдите подходящую гильдию",
    "Sana uygun loncayı bul"
  ],
  "Find a Party or teammates.": [
    "Найдите группу или соратников.",
    "Grup veya takım arkadaşları bul."
  ],
  "Find a Guild or recruit players.": [
    "Найдите гильдию или пригласите игроков.",
    "Lonca bul veya oyuncu al."
  ],
  "+ Post for Party": [
    "+ Объявление для группы",
    "+ Grup ilanı"
  ],
  "+ Create advert": [
    "+ Создать объявление",
    "+ İlan oluştur"
  ],
  "Invite friends privately": [
    "Пригласить друзей лично",
    "Arkadaşları özel olarak davet et"
  ],
  "Guilds recruiting": [
    "Гильдии набирают участников",
    "Üye arayan loncalar"
  ],
  "Recruiting groups": [
    "Группы с набором",
    "Oyuncu arayan gruplar"
  ],
  "Available players": [
    "Свободные игроки",
    "Müsait oyuncular"
  ],
  "Checking Recruitment…": [
    "Поиск объявлений…",
    "Oyuncu arama ilanları kontrol ediliyor…"
  ],
  "No matching adverts": [
    "Подходящих объявлений нет",
    "Eşleşen ilan yok"
  ],
  "Try different filters or publish your own advert.": [
    "Измените фильтры или создайте объявление.",
    "Filtreleri değiştir veya kendi ilanını yayımla."
  ],
  "Create advert": [
    "Создать объявление",
    "İlan oluştur"
  ],
  "Party posts: 1 day · Guild posts: 1–3 days.": [
    "Группы: 1 день · Гильдии: 1–3 дня.",
    "Grup: 1 gün · Lonca: 1–3 gün."
  ],
  "Your active adverts": [
    "Ваши активные объявления",
    "Aktif ilanların"
  ],
  "+ New post": [
    "+ Новое объявление",
    "+ Yeni ilan"
  ],
  "Invite friends": [
    "Пригласить друзей",
    "Arkadaşları davet et"
  ],
  "No active adverts": [
    "Нет активных объявлений",
    "Aktif ilan yok"
  ],
  "Create a post to find players.": [
    "Создайте объявление, чтобы найти игроков.",
    "Oyuncu bulmak için ilan oluştur."
  ],
  "One active post per type · 6h refresh cooldown.": [
    "Одно объявление каждого типа · Обновление раз в 6 часов.",
    "Her türden bir aktif ilan · 6 saat yenileme süresi."
  ],
  "Open my Party": [
    "Открыть мою группу",
    "Grubumu aç"
  ],
  "Open Guild": [
    "Открыть гильдию",
    "Loncayı aç"
  ],
  "What are you looking for?": [
    "Что вы ищете?",
    "Ne arıyorsun?"
  ],
  "Choose a post type.": [
    "Выберите тип объявления.",
    "İlan türünü seç."
  ],
  "Looking for a Guild": [
    "Ищу гильдию",
    "Lonca arıyorum"
  ],
  "Recruit for my Party": [
    "Набор в мою группу",
    "Grubuma oyuncu al"
  ],
  "Recruit for my Guild": [
    "Набор в мою гильдию",
    "Loncama oyuncu al"
  ],
  "Find a persistent team": [
    "Найти постоянную группу",
    "Kalıcı bir ekip bul"
  ],
  "Find members for open Party slots": [
    "Найти участников на свободные места",
    "Boş grup yerlerine üye bul"
  ],
  "Your Party has no open slots": [
    "В вашей группе нет свободных мест",
    "Grubunda boş yer yok"
  ],
  "Let Guilds discover you": [
    "Пусть гильдии найдут вас",
    "Loncalar seni bulabilsin"
  ],
  "Leader or Officer access": [
    "Только лидер или офицер",
    "Yalnızca lider veya yetkili"
  ],
  "{count} compatible recruitment adverts": [
    "Подходящих объявлений: {count}",
    "{count} uygun ilan"
  ],
  "{count} results": [
    "Результатов: {count}",
    "{count} sonuç"
  ],
  "You are no longer in a Party.": [
    "Вы больше не состоите в группе.",
    "Artık bir grupta değilsin."
  ],
  "Only the Party leader can invite friends.": [
    "Только лидер группы может приглашать друзей.",
    "Yalnızca grup lideri arkadaş davet edebilir."
  ],
  "Your Party is full.": [
    "Ваша группа заполнена.",
    "Grubun dolu."
  ],
  "This friend is already in a Party.": [
    "Этот друг уже состоит в группе.",
    "Bu arkadaş zaten bir grupta."
  ],
  "This friend already has a pending invitation.": [
    "У этого друга уже есть ожидающее приглашение.",
    "Bu arkadaşın zaten bekleyen bir daveti var."
  ],
  "This player is unavailable for invitations.": [
    "Этот игрок недоступен для приглашений.",
    "Bu oyuncuya davet gönderilemiyor."
  ],
  "This friend cannot receive a Party invitation right now.": [
    "Сейчас этому другу нельзя отправить приглашение в группу.",
    "Bu arkadaş şu anda grup daveti alamıyor."
  ],
  "Your Party changed. Reopen the invitation list.": [
    "Ваша группа изменилась. Откройте приглашения заново.",
    "Grubun değişti. Davet listesini yeniden aç."
  ],
  "Could not send the invitation.": [
    "Не удалось отправить приглашение.",
    "Davet gönderilemedi."
  ],
  "PRIVATE PARTY INVITATIONS": [
    "ЛИЧНЫЕ ПРИГЛАШЕНИЯ В ГРУППУ",
    "ÖZEL GRUP DAVETLERİ"
  ],
  "Choose a friend to send a Party invitation. It appears with their Party invites, not in public chat. Expires after 24 hours.": [
    "Выберите друга. Приглашение появится в его списке, а не в общем чате. Срок действия — 24 часа.",
    "Davet göndermek için arkadaş seç. Davet, genel sohbette değil grup davetlerinde görünür. 24 saatte sona erer."
  ],
  "{count} open slot": [
    "Свободно мест: {count}",
    "{count} boş yer"
  ],
  "{count} open slots": [
    "Свободно мест: {count}",
    "{count} boş yer"
  ],
  "Party leader only": [
    "Только лидер группы",
    "Yalnızca grup lideri"
  ],
  "Loading friends…": [
    "Загрузка друзей…",
    "Arkadaşlar yükleniyor…"
  ],
  "Search friends for Party invites": [
    "Поиск друзей для приглашения",
    "Grup daveti için arkadaş ara"
  ],
  "Search friends": [
    "Найти друзей",
    "Arkadaş ara"
  ],
  "No friends yet. Add friends through the Friends screen to invite them privately.": [
    "Пока нет друзей. Добавьте их в разделе «Друзья», чтобы отправлять личные приглашения.",
    "Henüz arkadaşın yok. Özel davet göndermek için Arkadaşlar bölümünden arkadaş ekle."
  ],
  "No matching friends.": [
    "Подходящих друзей нет.",
    "Eşleşen arkadaş yok."
  ],
  "Invited": [
    "Приглашён",
    "Davet edildi"
  ],
  "Invite": [
    "Пригласить",
    "Davet et"
  ],
  "Join a Guild to take part in daily Muster and the shared weekly Rally.": [
    "Вступите в гильдию для участия в ежедневном сборе и недельном состязании.",
    "Günlük yoklama ve haftalık rallide yer almak için bir loncaya katıl."
  ],
  "Check in by playing. Combat and Skilling add progress automatically.": [
    "Играйте, чтобы отмечаться. Бой и навыки учитываются автоматически.",
    "Oynayarak katıl. Savaş ve beceri etkinlikleri otomatik sayılır."
  ],
  "{current}/{max} contribution": [
    "Вклад: {current}/{max}",
    "Katkı: {current}/{max}"
  ],
  "Earn 1 Rally Mark at {count} points today.": [
    "Сегодня 1 знак ралли за {count} очков.",
    "Bugün {count} puanda 1 Ralli İşareti kazan."
  ],
  "{current}/{max} Rally days · {points} points": [
    "Дней ралли: {current}/{max} · Очки: {points}",
    "Ralli günü: {current}/{max} · {points} puan"
  ],
  "Play on {days} days this week. No daily streak required.": [
    "Играйте {days} дней на этой неделе. Серия не нужна.",
    "Bu hafta {days} gün oyna. Günlük seri gerekmez."
  ],
  "{current} OF {goal}": [
    "{current} ИЗ {goal}",
    "{current} / {goal}"
  ],
  "Rally tiers: 35% / 70% / 100%. Guild Projects earn +5% / +10% / +15% Hall Progress.": [
    "Этапы ралли: 35% / 70% / 100%. Проекты дают +5% / +10% / +15% прогресса зала.",
    "Ralli kademeleri: %35 / %70 / %100. Projeler salon ilerlemesine +%5 / +%10 / +%15 verir."
  ],
  "{percent}% Guild Activity": [
    "Активность гильдии: {percent}%",
    "Lonca etkinliği: %{percent}"
  ],
  "{percent}% NEXT": [
    "ДАЛЕЕ: {percent}%",
    "SONRAKİ: %{percent}"
  ],
  "Complete Guild Quests, Muster and Projects to raise activity.": [
    "Выполняйте задания, сборы и проекты гильдии для роста активности.",
    "Etkinliği artırmak için lonca görevlerini, yoklamayı ve projeleri tamamla."
  ],
  "Activity secured today.": [
    "Активность сегодня сохранена.",
    "Bugünkü etkinlik korundu."
  ],
  "More activity helps prevent a drop.": [
    "Больше активности предотвратит спад.",
    "Daha fazla etkinlik düşüşü önler."
  ],
  "Stay active to avoid losing progress.": [
    "Оставайтесь активны, чтобы не терять прогресс.",
    "İlerleme kaybetmemek için etkin kal."
  ],
  "{count} members": [
    "Участников: {count}",
    "{count} üye"
  ],
  "{role} · {days}/{goal} Rally days": [
    "{role} · Дней ралли: {days}/{goal}",
    "{role} · Ralli günü: {days}/{goal}"
  ],
  "today {count}": [
    "сегодня {count}",
    "bugün {count}"
  ],
  "+{count} more contributors": [
    "Ещё участников: {count}",
    "+{count} katkıda bulunan"
  ],
  "RALLY I": [
    "РАЛЛИ I",
    "RALLİ I"
  ],
  "RALLY II": [
    "РАЛЛИ II",
    "RALLİ II"
  ],
  "RALLY III": [
    "РАЛЛИ III",
    "RALLİ III"
  ],
  "Gathering Momentum": [
    "Импульс сбора",
    "Toplama İvmesi"
  ],
  "Workshop Momentum": [
    "Импульс мастерской",
    "Atölye İvmesi"
  ],
  "Learning Momentum": [
    "Импульс обучения",
    "Öğrenme İvmesi"
  ],
  "Mastery Momentum": [
    "Импульс мастерства",
    "Ustalık İvmesi"
  ],
  "Guild Momentum": [
    "Импульс гильдии",
    "Lonca İvmesi"
  ],
  "+5% gathering speed while the Guild remains active.": [
    "+5% к скорости сбора, пока гильдия активна.",
    "Lonca etkinken toplama hızı +%5."
  ],
  "+5% crafting and processing speed.": [
    "+5% к скорости создания и обработки.",
    "Üretim ve işleme hızı +%5."
  ],
  "+5% non-combat Skill XP.": [
    "+5% к опыту мирных навыков.",
    "Savaş dışı beceri TP'si +%5."
  ],
  "+5% non-combat Mastery XP.": [
    "+5% к опыту мирного мастерства.",
    "Savaş dışı ustalık TP'si +%5."
  ],
  "+5% relative rare-material chance from eligible non-combat activities.": [
    "+5% относительного шанса редких материалов в мирных занятиях.",
    "Uygun savaş dışı etkinliklerde nadir malzeme şansına göreli +%5."
  ],
  "Bonuses: +{gather}% Gathering · +{production}% Production · +{skill}% Skill XP · +{mastery}% Mastery XP · +{rare}% Rare Materials.": [
    "Бонусы: сбор +{gather}% · производство +{production}% · опыт навыков +{skill}% · мастерство +{mastery}% · редкие материалы +{rare}%.",
    "Bonuslar: Toplama +%{gather} · Üretim +%{production} · Beceri TP +%{skill} · Ustalık TP +%{mastery} · Nadir Malzeme +%{rare}."
  ],
  "Leader": [
    "Лидер",
    "Lider"
  ],
  "Officer": [
    "Офицер",
    "Yetkili"
  ],
  "Member": [
    "Участник",
    "Üye"
  ],
  "Restores {percent}% maximum HP in boss fights or between dungeon rooms.": [
    "Восстанавливает {percent}% максимального здоровья в бою с боссом или между комнатами подземелья.",
    "Boss savaşında veya zindan odaları arasında azami canın %{percent} kadarını yeniler."
  ],
  "Deals {percent}% more damage for {count} ordinary encounters.": [
    "Урон +{percent}% на {count} обычных боёв.",
    "{count} normal karşılaşma boyunca %{percent} daha fazla hasar verir."
  ],
  "Takes {percent}% less damage for {count} ordinary encounters.": [
    "Получаемый урон −{percent}% на {count} обычных боёв.",
    "{count} normal karşılaşma boyunca alınan hasarı %{percent} azaltır."
  ],
  "+{damage}% damage · +{strength}% healing and shielding for {count} ordinary encounters.": [
    "Урон +{damage}% · Лечение и щиты +{strength}% на {count} обычных боёв.",
    "{count} normal karşılaşma boyunca hasar +%{damage} · İyileştirme ve kalkanlar +%{strength}."
  ],
  "Healing potions work in boss fights and between dungeon rooms. Food is disabled there. Choose a potion from the HP menu.": [
    "Лечебные зелья используются в боях с боссами и между комнатами подземелий. Еда там не лечит. Выберите зелье в меню здоровья.",
    "İyileştirme iksirleri boss savaşlarında ve zindan odaları arasında kullanılabilir. Yiyecek orada iyileştirmez. İksiri Can menüsünden seç."
  ],
  "Restores {hp} HP per food": [
    "Восстанавливает {hp} здоровья за порцию",
    "Porsiyon başına {hp} can yeniler"
  ],
  "Equipment infusion material": [
    "Материал для улучшения снаряжения",
    "Ekipman infüzyon malzemesi"
  ],
  "Lv {level}": [
    "Ур. {level}",
    "Sv. {level}"
  ],
  "A dewleaf resin that binds early regional gear.": [
    "Смола из росолиста для начального регионального снаряжения.",
    "Başlangıç bölge ekipmanları için çiy yaprağı reçinesi."
  ],
  "A crystalline solvent for Oathstone-era gear.": [
    "Кристаллический растворитель для снаряжения эпохи Клятвенного камня.",
    "Yemin Taşı dönemi ekipmanları için kristal çözücü."
  ],
  "A heat-stable fixative for Sunscar equipment.": [
    "Термостойкий закрепитель для снаряжения Санскара.",
    "Sunscar ekipmanları için ısıya dayanıklı sabitleyici."
  ],
  "A frostbound distillate for Frostmarch equipment.": [
    "Морозный дистиллят для снаряжения Фростмарша.",
    "Frostmarch ekipmanları için buzla güçlendirilmiş distilat."
  ],
  "A volatile Ashlands elixir for capstone equipment.": [
    "Нестабильный эликсир Эшлендса для лучшего снаряжения.",
    "Üst seviye ekipmanlar için uçucu Ashlands iksiri."
  ],
  "Requires {skill} level {level}.": [
    "Требуется уровень навыка «{skill}»: {level}.",
    "{skill} becerisi için seviye {level} gerekli."
  ],
  "Requires character level {level}.": [
    "Требуется уровень персонажа {level}.",
    "Karakter seviyesi {level} gerekli."
  ],
  "Show how to unlock or obtain materials for this recipe": [
    "Показать, как открыть рецепт или получить материалы",
    "Bu tarifin nasıl açılacağını veya malzemelerin nereden alınacağını göster"
  ],
  "See requirements and where to get materials": [
    "Посмотреть условия и источники материалов",
    "Gereksinimleri ve malzemelerin nereden alınacağını gör"
  ],
  "NPC or Echo allies fill the missing roles": [
    "Недостающие роли заполнят НИП или союзники-Эхо.",
    "Eksik roller NPC veya Yankı müttefikleriyle doldurulur."
  ],
  "Find an eligible party automatically": [
    "Автоматически найти подходящую группу",
    "Uygun bir grubu otomatik bul"
  ],
  "Group finder & options": [
    "Поиск группы и настройки",
    "Grup bulma ve seçenekler"
  ],
  "My Echo & sharing": [
    "Моё Эхо и публикация",
    "Yankım ve paylaşım"
  ],
  "Solo": [
    "В одиночку",
    "Tek başına"
  ],
  "Live": [
    "Живой режим",
    "Canlı"
  ],
  "Play with three other players": [
    "Играть с тремя другими игроками",
    "Üç başka oyuncuyla oyna"
  ],
  "Play with three Echo allies": [
    "Играть с тремя союзниками-Эхо",
    "Üç Yankı müttefikiyle oyna"
  ],
  "Locked dungeons": [
    "Недоступные подземелья",
    "Kilitli zindanlar"
  ],
  "Hide locked dungeons": [
    "Скрыть недоступные подземелья",
    "Kilitli zindanları gizle"
  ],
  "Find Party": [
    "Найти группу",
    "Grup bul"
  ],
  "Start Dungeon": [
    "Начать подземелье",
    "Zindanı başlat"
  ],
  "Prepare Loadout": [
    "Подготовить снаряжение",
    "Ekipmanı hazırla"
  ],
  "More information": [
    "Подробнее",
    "Daha fazla bilgi"
  ],
  "Recommended power": [
    "Рекомендуемая сила",
    "Önerilen güç"
  ],
  "rooms before the boss": [
    "комнат до босса",
    "bosstan önceki odalar"
  ],
  "Prepare expedition": [
    "Подготовить поход",
    "Seferi hazırla"
  ],
  "View expedition": [
    "Посмотреть поход",
    "Seferi görüntüle"
  ],
  "Base completion reward": [
    "Базовая награда за прохождение",
    "Temel tamamlama ödülü"
  ],
  "Expedition preparation": [
    "Подготовка к походу",
    "Sefer hazırlığı"
  ],
  "Mechanics & objectives": [
    "Механики и задачи",
    "Mekanikler ve hedefler"
  ],
  "Rewards & entry rules": [
    "Награды и условия входа",
    "Ödüller ve giriş kuralları"
  ],
  "Reward rules": [
    "Правила наград",
    "Ödül kuralları"
  ],
  "Route & encounters": [
    "Маршрут и встречи",
    "Rota ve karşılaşmalar"
  ],
  "Expedition Marks": [
    "Знаки похода",
    "Sefer İşaretleri"
  ],
  "Enhanced rewards · unlimited runs": [
    "Усиленные награды · Неограниченные походы",
    "Geliştirilmiş ödüller · Sınırsız sefer"
  ],
  "Choose a difficulty to continue.": [
    "Выберите сложность для продолжения.",
    "Devam etmek için zorluk seç."
  ],
  "themed stages + final boss": [
    "тематические этапы и финальный босс",
    "temalı aşamalar ve son boss"
  ],
  "non-boss rooms · final boss follows": [
    "комнаты без босса · Далее финальный босс",
    "boss olmayan odalar · Sonra final bossu"
  ],
  "Your verified character + three eligible Echo recruits": [
    "Ваш подтверждённый персонаж и три подходящих Эхо",
    "Doğrulanmış karakterin ve üç uygun Yankı üyesi"
  ],
  "Defeat 250 Old Mines enemies": [
    "Победите 250 врагов в Old Mines",
    "Old Mines bölgesinde 250 düşman yen"
  ],
  "Defeat the Fallen Knight 3 times": [
    "Победите Fallen Knight 3 раза",
    "Fallen Knight'ı 3 kez yen"
  ],
  "Reach Faith 30": [
    "Достигните 30-го уровня Веры",
    "İnanç becerisini 30. seviyeye çıkar"
  ],
  "Reach Fishing 16": [
    "Достигните 16-го уровня Рыбалки",
    "Balıkçılık becerisini 16. seviyeye çıkar"
  ],
  "Reach Smithing 30": [
    "Достигните 30-го уровня Кузнечного дела",
    "Demircilik becerisini 30. seviyeye çıkar"
  ],
  "Rare discovery while charting the Sunscar glasslands": [
    "Редкая находка при исследовании стеклянных равнин Sunscar",
    "Sunscar cam düzlüklerini haritalarken nadir keşif"
  ],
  "Rare discovery while following the Frostmarch bells": [
    "Редкая находка по следам колоколов Frostmarch",
    "Frostmarch çanlarını takip ederken nadir keşif"
  ],
  "Rare discovery while mapping Silverbrook": [
    "Редкая находка при составлении карты Silverbrook",
    "Silverbrook haritasını çıkarırken nadir keşif"
  ],
  "Rare discovery while reading the Ashlands smoke": [
    "Редкая находка по следам дыма Ashlands",
    "Ashlands dumanını izlerken nadir keşif"
  ],
  "Rare discovery while scouting the Greenfields": [
    "Редкая находка при разведке Greenfields",
    "Greenfields bölgesini keşfederken nadir buluş"
  ],
  "Rare discovery while surveying the King's Road": [
    "Редкая находка при изучении King's Road",
    "King's Road bölgesini araştırırken nadir keşif"
  ],
  "Rare discovery while surveying the Old Mines": [
    "Редкая находка при разведке Old Mines",
    "Old Mines bölgesini araştırırken nadir keşif"
  ],
  "Rare discovery while tracing Ironwood paths": [
    "Редкая находка при исследовании троп Ironwood",
    "Ironwood patikalarını takip ederken nadir keşif"
  ],
  "below 50% HP": [
    "меньше 50% здоровья",
    "can %50'nin altındayken"
  ],
  "damage boost": [
    "усиление урона",
    "hasar artışı"
  ],
  "defensive brace": [
    "защитная подготовка",
    "savunma hazırlığı"
  ],
  "focused damage": [
    "сосредоточенный урон",
    "odaklı hasar"
  ],
  "team damage": [
    "урон группы",
    "takım hasarı"
  ],
  "vulnerability": [
    "уязвимость",
    "savunmasızlık"
  ],
  "burst damage": [
    "взрывной урон",
    "ani yüksek hasar"
  ],
  "defensive stance": [
    "оборонительная стойка",
    "savunma duruşu"
  ],
  "Essence": [
    "Эссенция",
    "Öz"
  ],
  "BOND REWARD CLAIMED": [
    "НАГРАДА ЗА СВЯЗЬ ПОЛУЧЕНА",
    "BAĞ ÖDÜLÜ ALINDI"
  ],
  "TRAINING COMPLETE": [
    "ТРЕНИРОВКА ЗАВЕРШЕНА",
    "EĞİTİM TAMAMLANDI"
  ],
  "ASCENSION COMPLETE": [
    "ВОЗВЫШЕНИЕ ЗАВЕРШЕНО",
    "YÜKSELİŞ TAMAMLANDI"
  ],
  "PRESTIGE MASTERY COMPLETE": [
    "ВЫСШЕЕ МАСТЕРСТВО ДОСТИГНУТО",
    "PRESTİJ USTALIĞI TAMAMLANDI"
  ],
  "TECHNIQUE UPDATED": [
    "ПРИЁМ ОБНОВЛЁН",
    "TEKNİK GÜNCELLENDİ"
  ],
  "{name} · Bond {level} · {reward}.": [
    "{name} · Связь {level} · {reward}.",
    "{name} · Bağ {level} · {reward}."
  ],
  "{name} reached Level {level}.": [
    "{name}: достигнут уровень {level}.",
    "{name}, seviye {level} düzeyine ulaştı."
  ],
  "{name} reached Tier {tier}.": [
    "{name}: достигнут ранг {tier}.",
    "{name}, kademe {tier} düzeyine ulaştı."
  ],
  "{name} reached its final mastery milestone.": [
    "{name}: достигнута последняя ступень мастерства.",
    "{name}, son ustalık aşamasına ulaştı."
  ],
  "{name}'s combat choice is ready.": [
    "Боевой приём спутника {name} готов.",
    "{name} için savaş seçimi hazır."
  ],
  "Companion progress saved.": [
    "Прогресс спутника сохранён.",
    "Yoldaş ilerlemesi kaydedildi."
  ],
  "Bond reward": [
    "Награда за связь",
    "Bağ ödülü"
  ],
  "Companion": [
    "Спутник",
    "Yoldaş"
  ],
  "FIRST COMPANION": [
    "ПЕРВЫЙ СПУТНИК",
    "İLK YOLDAŞ"
  ],
  "Choose your combat partner": [
    "Выберите боевого спутника",
    "Savaş yoldaşını seç"
  ],
  "Choose a companion outside your class role. Your other two starter roles will join through Silverbrook and Old Mines progress.": [
    "Выберите спутника с ролью, отличной от вашей. Два других стартовых спутника откроются по мере продвижения в Silverbrook и Old Mines.",
    "Sınıfının rolünden farklı bir yoldaş seç. Diğer iki başlangıç rolü Silverbrook ve Old Mines ilerlemesiyle açılacak."
  ],
  "Choose {name}, {role}": [
    "Выбрать {name}, роль: {role}",
    "{name} seç, rol: {role}"
  ],
  "Recruiting…": [
    "Приглашение…",
    "Katılıyor…"
  ],
  "Choose companion": [
    "Выбрать спутника",
    "Yoldaş seç"
  ],
  // Item inspector: source-matched RU/TR copy (item IDs and names are never translated).
  "gear": ["Снаряжение","Ekipman"],
  "tool": ["Инструмент","Alet"],
  "food": ["Еда","Yiyecek"],
  "gem": ["Самоцвет","Mücevher"],
  "material": ["Материал","Malzeme"],
  "weapon": ["Оружие","Silah"],
  "equipment": ["Снаряжение","Ekipman"],
  "common": ["Обычный","Yaygın"],
  "uncommon": ["Необычный","Sıradışı"],
  "rare": ["Редкий","Nadir"],
  "epic": ["Эпический","Destansı"],
  "legendary": ["Легендарный","Efsanevi"],
  "mythic": ["Мифический","Mitik"],
  "Hp": ["ОЗ","Can"],
  "ATK": ["АТК","SAL"],
  "DEF": ["ЗАЩ","SAV"],
  "PWR": ["СИЛ","GÜÇ"],
  "Owned · {total} total · {carried} carried · {banked} banked": ["В собственности: {total} · с собой: {carried} · в банке: {banked}","Sahip olunan: {total} · yanında: {carried} · bankada: {banked}"],
  "Empty {slot} slot": ["Пустой слот: {slot}","Boş {slot} yuvası"],
  "After equip · ATK {attack} · DEF {defense} · HP {hp} · PWR {power}": ["После экипировки · АТК {attack} · ЗАЩ {defense} · ОЗ {hp} · СИЛ {power}","Kuşanınca · SAL {attack} · SAV {defense} · CAN {hp} · GÜÇ {power}"],
  "TO +{rank} FROM CURRENT RANK": ["ОТ ТЕКУЩЕГО РАНГА ДО +{rank}","MEVCUT RÜTBEDEN +{rank} SEVİYESİNE"],
  "{pieces} pieces · {bonus}": ["{pieces} предметов · {bonus}","{pieces} parça · {bonus}"],
  "Next · {pieces} pieces · {bonus}": ["Далее · {pieces} предметов · {bonus}","Sonraki · {pieces} parça · {bonus}"],
  "HOOK": ["УСЛОВИЕ","KOŞUL"],
  "2/4/8/10 always-on V33 bonuses are live in stats/combat. 6pc conditional text is preserved as a trigger hook until its exact skill/ally/barrier event exists.": ["Постоянные бонусы V33 за 2/4/8/10 предметов действуют в характеристиках и бою. Условный бонус за 6 предметов пока остаётся описанием условия до появления соответствующего события умения, союзника или барьера.","V33'ün 2/4/8/10 parçalık kalıcı bonusları istatistiklerde ve savaşta etkin. 6 parçalık koşullu bonus, ilgili beceri, müttefik veya bariyer olayı eklenene kadar yalnızca tetikleme koşulu olarak gösterilir."],
  "{skill} · Character Lv {level} · {gold} gold": ["{skill} · персонаж ур. {level} · {gold} золота","{skill} · karakter Sv. {level} · {gold} altın"],
  "BLOCKERS: {count}": ["ПРЕПЯТСТВИЯ: {count}","ENGELLER: {count}"],
  "Find {item}": ["Найти {item}","{item} bul"],
  "{count} missing · {source}": ["Не хватает: {count} · {source}","{count} eksik · {source}"],
  "{owned}/{required} owned": ["В наличии: {owned}/{required}","Sahip olunan: {owned}/{required}"],
  "Current +{rank}": ["Текущий +{rank}","Mevcut +{rank}"],
  "Next attempt · {gold} gold · {dust} × Tempering Dust": ["Следующая попытка · {gold} золота · {dust} × Tempering Dust","Sonraki deneme · {gold} altın · {dust} × Tempering Dust"],
  "Pity bonus active · failed attempts: {count}.": ["Бонус за неудачи активен · неудачных попыток: {count}.","Telafi bonusu etkin · başarısız deneme: {count}."],
  "{filled}/{capacity} filled · 1 Stat + 1 Effect": ["Заполнено {filled}/{capacity} · 1 характеристика + 1 эффект","{filled}/{capacity} dolu · 1 İstatistik + 1 Etki"],
  "Stat · {gem}": ["Характеристика · {gem}","İstatistik · {gem}"],
  "Effect · {gem}": ["Эффект · {gem}","Etki · {gem}"],
  "Hide other sources for {item}": ["Скрыть другие источники {item}","{item} için diğer kaynakları gizle"],
  "Show other sources for {item}": ["Показать другие источники {item}","{item} için diğer kaynakları göster"],
  "Other sources · {count}": ["Другие источники · {count}","Diğer kaynaklar · {count}"],
  "Open {name}": ["Открыть {name}","{name} aç"],
  "{skill} Lv {level} · needs {quantity}": ["{skill} ур. {level} · нужно {quantity}","{skill} Sv. {level} · {quantity} gerekli"],
  "More recipes: {count}": ["Другие рецепты: {count}","Diğer tarifler: {count}"],
  "Sell value · {gold} gold each": ["Цена продажи · {gold} золота за штуку","Satış değeri · adet başına {gold} altın"],
  "PRIMARY": ["ОСНОВНОЙ","BİRİNCİL"],
  "{type} source: {name}": ["Источник ({type}): {name}","{type} kaynağı: {name}"],
  "Starting equipment": ["Начальное снаряжение","Başlangıç ekipmanı"],
  "Granted by a matching class loadout.": ["Выдаётся со стартовым набором подходящего класса.","Uygun sınıfın başlangıç donanımıyla verilir."],
  "Requires character Lv {level}": ["Требуется персонаж ур. {level}","Karakter Sv. {level} gerekli"],
  "Readiness +{value}": ["Готовность +{value}","Hazırlık +{value}"],
  "Restores {value} HP": ["Восстанавливает {value} ОЗ","{value} Can yeniler"],
  "{skill} tool · Tier {tier}": ["Инструмент для {skill} · ранг {tier}","{skill} aleti · Kademe {tier}"],
  "{value}% shorter base action time": ["Базовое время действия сокращено на {value}%","Temel eylem süresi %{value} daha kısa"],
  "Baseline action time": ["Базовое время действия","Temel eylem süresi"],
  "Stat Gem · +{value}% {stat} when socketed": ["Самоцвет характеристик · +{value}% к {stat} при установке","İstatistik Taşı · yuvalandığında +%{value} {stat}"],
  "Effect Gem · {effect}": ["Самоцвет эффекта · {effect}","Etki Taşı · {effect}"],
  "Salvage: {quantity}× {item}": ["Разобрать: {quantity}× {item}","Geri dönüşüm: {quantity}× {item}"],
  "{skill} Lv {level} · {gold} gold": ["{skill} ур. {level} · {gold} золота","{skill} Sv. {level} · {gold} altın"],
  "{skill} Lv {level} · {region}": ["{skill} ур. {level} · {region}","{skill} Sv. {level} · {region}"],
  "{region} · Lv {level} · {chance} drop": ["{region} · ур. {level} · шанс добычи {chance}","{region} · Sv. {level} · düşme olasılığı {chance}"],
  "Open {name} in {region}.": ["Открыть {name} в {region}.","{region} bölgesinde {name} aç."],
  "Open {name}.": ["Открыть {name}.","{name} aç."],
  "ATTENTION": ["ВНИМАНИЕ","DİKKAT"],
  "NEXT STEP": ["СЛЕДУЮЩИЙ ШАГ","SONRAKİ ADIM"],
  "NOW": ["СЕЙЧАС","ŞİMDİ"],
  "RECOMMENDED": ["РЕКОМЕНДУЕТСЯ","ÖNERİLEN"],
  "Your next adventure": ["Ваше следующее приключение","Sonraki maceran"],
  "Choose a hunt or gathering activity to start earning.": ["Начните охоту или сбор ресурсов, чтобы получать награды.","Ödül kazanmaya başlamak için avlanma veya toplama etkinliği seç."],
  "Explore activities": ["Выбрать занятие","Etkinlikleri keşfet"],
  "Encounter preview": ["Предпросмотр боя","Karşılaşma önizlemesi"],
  "Character, campaign & skills": ["Персонаж, сюжет и навыки","Karakter, hikâye ve beceriler"],
  "Contract Board": ["Доска контрактов","Sözleşme panosu"],
  "skill snapshot": ["обзор навыков","beceri özeti"],
  "{className} · Level {level}": ["{className} · ур. {level}","{className} · Sv. {level}"],
  "LV {level}": ["УР. {level}","SV. {level}"],
  "Experience": ["Опыт","Deneyim"],
  "ASTERFALL CAMPAIGN · CHAPTER {chapter}/{total}": ["ИСТОРИЯ АСТЕРФОЛЛА · ГЛАВА {chapter}/{total}","ASTERFALL HİKÂYESİ · BÖLÜM {chapter}/{total}"],
  "{claimed}/{total} claimed": ["Получено: {claimed}/{total}","Alınan: {claimed}/{total}"],
  "{count} rewards ready": ["Наград готово: {count}","{count} ödül hazır"],
  "defeated": ["побеждён","yenildi"],
  "Lv. {level}/25": ["ур. {level}/25","Sv. {level}/25"],
  "Claim {count}": ["Забрать ({count})","{count} ödülü al"],
  "Journal": ["Журнал","Günlük"],
  "Storage, AFK reserve & milestones": ["Хранилище, запас AFK и этапы","Depo, AFK süresi ve aşamalar"],
  "Bag {count}/{capacity}": ["Сумка {count}/{capacity}","Çanta {count}/{capacity}"],
  "Bank {count}/{capacity}": ["Банк {count}/{capacity}","Banka {count}/{capacity}"],
  "Bestiary {count}/{total}": ["Бестиарий {count}/{total}","Yaratık rehberi {count}/{total}"],
  "AFK reserve · {hours}/{max} hours": ["Запас AFK · {hours}/{max} ч","AFK süresi · {hours}/{max} saat"],
  "Base {hours}h · {count}/{total} upgrades earned": ["База {hours} ч · улучшений {count}/{total}","Temel {hours} sa · {count}/{total} yükseltme kazanıldı"],
  "Asterfall milestone complete.": ["Этап Астерфолла пройден.","Asterfall aşaması tamamlandı."],
  "Reach level 25, prepare your gear, then challenge the Fallen Knight.": ["Достигните 25-го уровня, подготовьте снаряжение и сразитесь с Павшим рыцарем.","25. seviyeye ulaş, ekipmanını hazırla ve Düşmüş Şövalye'ye meydan oku."],
  "Level {level} / 25": ["Уровень {level} / 25","Seviye {level} / 25"],
  "ROSTER": ["ПЕРСОНАЖИ","KADRO"],
  "ACTIVE": ["АКТИВНО","AKTİF"],
  "ACCOUNT SKILL": ["НАВЫКИ АКК.","HESAP BEC."],
  "Next character slot unlocks at {count} combined account skill levels.": ["Следующая ячейка персонажа откроется при суммарном уровне навыков аккаунта {count}.","Sonraki karakter yuvası, hesabın toplam beceri seviyesi {count} olduğunda açılır."],
  "All 5 character slots are permanently unlocked.": ["Все 5 ячеек персонажей открыты навсегда.","5 karakter yuvasının tamamı kalıcı olarak açıldı."],
  "ACTIVE CHARACTER": ["АКТИВНЫЙ ПЕРСОНАЖ","AKTİF KARAKTER"],
  "Idle": ["Бездействует","Boşta"],
  "Running for {time}": ["Занятие длится {time}","{time} süredir etkin"],
  "No activity is currently running.": ["Сейчас нет активного занятия.","Şu anda devam eden etkinlik yok."],
  "Create another character": ["Создать ещё персонажа","Başka karakter oluştur"],
  "Close character management": ["Закрыть управление персонажем","Karakter yönetimini kapat"],
  "CHARACTER MANAGEMENT": ["УПРАВЛЕНИЕ ПЕРСОНАЖЕМ","KARAKTER YÖNETİMİ"],
  "What you lose": ["Что вы потеряете","Kaybedeceklerin"],
  "Your character, levels, Gold, skills, quests, loadouts and equipment upgrades are permanently removed.": ["Персонаж, его уровни, золото, навыки, задания, наборы снаряжения и улучшения экипировки будут удалены навсегда.","Karakterin, seviyelerin, altının, becerilerin, görevlerin, kayıtlı ekipman setlerin ve ekipman geliştirmelerin kalıcı olarak silinir."],
  "Equipment and items return to the shared Bank or Overflow, with upgrades removed.": ["Экипировка и предметы вернутся в общий Банк или резервное хранилище, но без улучшений.","Ekipman ve eşyalar geliştirmeleri kaldırılmış hâlde ortak Bankaya veya Taşma Deposuna iade edilir."],
  "Hide deletion details": ["Скрыть сведения об удалении","Silme ayrıntılarını gizle"],
  "Read full deletion details": ["Подробнее об удалении","Tüm silme ayrıntılarını oku"],
  "Levels, XP, Gold, skills, quests, class progress, saved loadouts and character-bound appearance progress are removed. Equipment enhancement/temper ranks and pity progress are also removed; recovered gear returns as its base item. Inventory, overflow items, equipped gear, gathering tools and socketed gems are recovered to the shared Bank, then Overflow if needed.": ["Уровни, опыт, золото, навыки, задания, прогресс класса, сохранённые наборы снаряжения и привязанные к персонажу изменения внешнего вида удаляются. Уровни улучшения и закалки экипировки, а также накопленный прогресс гарантированного результата также теряются; возвращённая экипировка будет базовой. Предметы из инвентаря, резервного хранилища, надетая экипировка, инструменты сбора и вставленные самоцветы перемещаются в общий Банк, а при нехватке места — в резервное хранилище.","Seviyeler, XP, altın, beceriler, görevler, sınıf ilerlemesi, kayıtlı ekipman setleri ve karaktere bağlı görünüm ilerlemesi silinir. Ekipman geliştirme ve sertleştirme dereceleri ile garanti birikimi de silinir; geri alınan ekipman temel hâline döner. Envanter, taşma deposu, kuşanılmış ekipman, toplama aletleri ve takılı taşlar ortak Bankaya; yer kalmazsa Taşma Deposuna aktarılır."],
  "ACCOUNT PROGRESS STAYS": ["ПРОГРЕСС АККАУНТА СОХРАНИТСЯ","HESAP İLERLEMESİ KORUNUR"],
  "What you keep": ["Что сохранится","Koruyacakların"],
  "Earned character slots, premium currency, companions, Guild membership and account collectibles are preserved.": ["Открытые ячейки персонажей, премиальная валюта, спутники, членство в гильдии и коллекционные предметы аккаунта сохраняются.","Açılmış karakter yuvaları, premium para birimi, yoldaşlar, Lonca üyeliği ve hesaba ait koleksiyonlar korunur."],
  "Finish before deleting": ["Завершите перед удалением","Silmeden önce tamamla"],
  "{count} equipment crafts are still linked to this character.": ["С этим персонажем связано {count} незавершённых заказов на экипировку.","Bu karaktere bağlı {count} ekipman üretimi hâlâ devam ediyor."],
  "Type {confirmation} to unlock the delete actions.": ["Введите {confirmation}, чтобы разблокировать удаление.","Silme seçeneklerini açmak için {confirmation} yaz."],
  "Character deletion confirmation": ["Подтверждение удаления персонажа","Karakter silme onayı"],
  "Deleting…": ["Удаление…","Siliniyor…"],
  "Delete & choose new class": ["Удалить и выбрать новый класс","Sil ve yeni sınıf seç"],
  "Delete character only": ["Только удалить персонажа","Yalnızca karakteri sil"],
  "This is your only character. After deletion you return to class creation.": ["Это ваш единственный персонаж. После удаления откроется создание персонажа.","Bu tek karakterin. Sildikten sonra karakter oluşturma ekranına dönersin."],
  "Choosing a new class deletes this character first, frees the slot, and then opens class creation. Plain delete keeps you on the remaining roster.": ["Выбор нового класса сначала удалит этого персонажа и освободит ячейку, затем откроет создание персонажа. Простое удаление оставит вас в списке остальных персонажей.","Yeni sınıf seçmek önce bu karakteri siler, yuvayı boşaltır ve karakter oluşturmayı açar. Yalnızca silmek ise seni kalan karakter listesinde tutar."],
  "ACCOUNT & CHARACTER": ["АККАУНТ И ПЕРСОНАЖ","HESAP VE KARAKTER"],
  "Bonuses": ["Бонусы","Bonuslar"],
  "A single view of modifiers that are actually active in gameplay right now. Collection ownership is account-wide; selected Faith and permanent boost sources follow the active character.": ["Здесь показаны только бонусы, которые сейчас реально действуют в игре. Коллекции общие для аккаунта, а выбранные бонусы Веры и постоянные усиления зависят от активного персонажа.","Şu anda oyunda gerçekten etkin olan bonusların tek görünümü. Koleksiyon sahipliği hesap genelindedir; seçilen İnanç ve kalıcı güçlendirme kaynakları etkin karaktere bağlıdır."],
  "TEMPORARY BOOST": ["ВРЕМЕННОЕ УСИЛЕНИЕ","GEÇİCİ GÜÇLENDİRME"],
  "{time} qualifying activity time remaining. The timer only consumes time from eligible activities.": ["Осталось {time} подходящих занятий. Время расходуется только во время занятий, на которые действует бонус.","{time} uygun etkinlik süresi kaldı. Sayaç yalnızca bonusun geçerli olduğu etkinliklerde ilerler."],
  "EFFECTIVE PERMANENT MODIFIERS": ["ДЕЙСТВУЮЩИЕ ПОСТОЯННЫЕ БОНУСЫ","ETKİN KALICI BONUSLAR"],
  "Less taken / consumed": ["Меньше урона / затрат","Daha az hasar / tüketim"],
  "Effective increase": ["Фактическое увеличение","Geçerli artış"],
  "No permanent gameplay modifiers are active on this character yet.": ["У этого персонажа пока нет действующих постоянных бонусов.","Bu karakterde henüz etkin kalıcı oyun bonusu yok."],
  "ACTIVE SOURCES": ["АКТИВНЫЕ ИСТОЧНИКИ","ETKİN KAYNAKLAR"],
  "ACCOUNT": ["АККАУНТ","HESAP"],
  "CHARACTER": ["ПЕРСОНАЖ","KARAKTER"],
  "No permanent source is contributing a bonus yet.": ["Ни один постоянный источник пока не даёт бонуса.","Henüz hiçbir kalıcı kaynak bonus sağlamıyor."],
  "WHAT COUNTS HERE": ["ЧТО УЧИТЫВАЕТСЯ","BURADA NELER SAYILIR"],
  "This screen reflects the same runtime multiplier calculation used by combat, skilling, rewards and other supported systems. Locked collectibles and inactive entitlements are not counted. Collection caps are already applied before the totals are shown.": ["Здесь используются те же расчёты множителей, что и в бою, навыках, наградах и других системах. Закрытые коллекционные предметы и неактивные привилегии не учитываются. Ограничения бонусов коллекций применяются до показа итогов.","Bu ekran savaşta, becerilerde, ödüllerde ve diğer desteklenen sistemlerde kullanılan gerçek bonus çarpanı hesabını gösterir. Kilitli koleksiyon eşyaları ve etkin olmayan haklar sayılmaz. Koleksiyon bonus sınırları toplamlar gösterilmeden önce uygulanır."],
  "{count} story": ["Сюжет: {count}","Hikâye: {count}"],
  "daily claim": ["ежедневная награда","günlük ödül"],
  "{count} event": ["События: {count}","Etkinlik: {count}"],
  "{count} forge": ["Кузница: {count}","Demirhane: {count}"],
  "{count} contract": ["Контракты: {count}","Sözleşme: {count}"],
  "{count} companion": ["Спутники: {count}","Yoldaş: {count}"],
  "READY": ["ГОТОВО","HAZIR"],
  "SESSION OVERVIEW": ["ОБЗОР СЕССИИ","OTURUM ÖZETİ"],
  "{count} READY": ["ГОТОВО: {count}","{count} HAZIR"],
  "CLEAR": ["ПУСТО","TEMİZ"],
  "WEEKLY": ["ЕЖЕНЕДЕЛЬНО","HAFTALIK"],
  "{count} ready": ["Готово: {count}","{count} hazır"],
  "LOCKED": ["ЗАКРЫТО","KİLİTLİ"],
  "NEW": ["НОВОЕ","YENİ"],
  "Ready now · {items}{more}": ["Готово сейчас · {items}{more}","Şimdi hazır · {items}{more}"],
  " · +{count} more": [" · ещё {count}"," · +{count} daha"],
} satisfies Record<string,readonly [string,string]>;

export function earlyLocaleText(language:Language,source:string):string|undefined{
  if(language!=='ru'&&language!=='tr')return undefined;
  if(language==='ru'&&Object.prototype.hasOwnProperty.call(RUSSIAN_FOCUS_ROWS,source))
    return RUSSIAN_FOCUS_ROWS[source as keyof typeof RUSSIAN_FOCUS_ROWS];
  const row=Object.prototype.hasOwnProperty.call(EARLY_LOCALE_ROWS,source)
    ? EARLY_LOCALE_ROWS[source as keyof typeof EARLY_LOCALE_ROWS]:undefined;
  return row?.[language==='ru'?0:1]??(language==='tr'?TURKISH_COVERAGE[source as keyof typeof TURKISH_COVERAGE]:undefined);
}

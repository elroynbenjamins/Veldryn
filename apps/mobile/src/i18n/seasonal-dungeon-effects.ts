import type {Language} from './languages';
import type {CoopRunMechanicView,CoopRunObjectiveView} from '../core/coop-presentation';

/** Authored event-expedition definitions, matched against exact English server copy. */
export const SEASONAL_MECHANIC_ROWS={
  "champion_favor": {
    "label": "Champion Favor",
    "description": "Win difficult trials and honor the island rites to build favor before facing the First Champion.",
    "labels": [
      "Championgunst",
      "Favor del campeón",
      "Gunst van de kampioen",
      "Favore del campione",
      "Faveur du champion",
      "Благосклонность чемпиона",
      "Şampiyonun Takdiri"
    ],
    "descriptions": [
      "Bestehe schwere Prüfungen und ehre die Inselriten, um vor dem Kampf gegen den Ersten Champion Gunst zu gewinnen.",
      "Supera pruebas difíciles y honra los ritos de la isla para ganar favor antes de enfrentarte al Primer Campeón.",
      "Doorsta zware proeven en eer de eilandrituelen om gunst te winnen voordat je de Eerste Kampioen ontmoet.",
      "Supera prove difficili e onora i riti dell'isola per ottenere favore prima di affrontare il Primo Campione.",
      "Réussissez des épreuves difficiles et honorez les rites de l'île pour gagner des faveurs avant d'affronter le Premier Champion.",
      "Пройдите сложные испытания и почтите островные обряды, чтобы заслужить расположение перед боем с Первым чемпионом.",
      "İlk Şampiyon'la yüzleşmeden önce zorlu sınavları geçip ada törenlerine saygı göstererek takdir kazanın."
    ]
  },
  "rift_stability": {
    "label": "Rift Stability",
    "description": "Anchor unstable tears as you advance. A stable rift weakens the Constellation Eater; a collapsing one empowers it.",
    "labels": [
      "Rissstabilität",
      "Estabilidad de la grieta",
      "Scheurstabiliteit",
      "Stabilità del varco",
      "Stabilité de la faille",
      "Стабильность разлома",
      "Yarık Dengesi"
    ],
    "descriptions": [
      "Verankere instabile Risse auf deinem Weg. Ein stabiler Riss schwächt den Sternbildverschlinger, ein einstürzender stärkt ihn.",
      "Ancla las grietas inestables al avanzar. Una grieta estable debilita al Devorador de Constelaciones; una que colapsa lo fortalece.",
      "Veranker instabiele scheuren onderweg. Een stabiele scheur verzwakt de Sterrenbeeldverslinder; een instortende versterkt hem.",
      "Stabilizza i varchi instabili lungo il percorso. Un varco stabile indebolisce il Divoratore di Costellazioni; uno che crolla lo potenzia.",
      "Stabilisez les failles sur votre route. Une faille stable affaiblit le Dévoreur de constellations ; son effondrement le renforce.",
      "Закрепляйте нестабильные разломы по пути. Устойчивый разлом ослабляет Пожирателя созвездий, а разрушающийся усиливает его.",
      "İlerlerken kararsız yarıkları sabitleyin. Sabit bir yarık Takımyıldız Yiyen'i zayıflatır; çöken bir yarık onu güçlendirir."
    ]
  },
  "lantern_light": {
    "label": "Lantern Light",
    "description": "Relight ward lanterns to keep the Gloam pushed back. Low light strengthens the Hollow Regent at the end of the breach.",
    "labels": [
      "Laternenlicht",
      "Luz de los faroles",
      "Lantaarnlicht",
      "Luce delle lanterne",
      "Lumière des lanternes",
      "Свет фонарей",
      "Fener Işığı"
    ],
    "descriptions": [
      "Entzünde die Schutzlaternen erneut, um die Dämmerung zurückzudrängen. Wenig Licht stärkt den Hohlen Regenten am Ende der Bresche.",
      "Vuelve a encender los faroles protectores para contener la penumbra. La poca luz fortalece al Regente Hueco al final de la brecha.",
      "Ontsteek de beschermlantaarns opnieuw om de schemer terug te dringen. Weinig licht versterkt de Holle Regent aan het einde van de breuk.",
      "Riaccendi le lanterne protettive per respingere il Crepuscolo. Poca luce rafforza il Reggente Cavo alla fine della breccia.",
      "Rallumez les lanternes protectrices pour repousser les ténèbres. Une faible lumière renforce le Régent creux au bout de la brèche.",
      "Снова зажигайте защитные фонари, чтобы сдерживать Мрак. Недостаток света усиливает Полого регента в конце прорыва.",
      "Kasveti geri püskürtmek için koruma fenerlerini yeniden yakın. Az ışık, yarığın sonunda Boş Naip'i güçlendirir."
    ]
  },
  "caravan_integrity": {
    "label": "Caravan Integrity",
    "description": "Protect and repair the guild caravan. A battered caravan makes the final assault harder; a pristine convoy earns a delivery bonus.",
    "labels": [
      "Karawanenzustand",
      "Estado de la caravana",
      "Staat van de karavaan",
      "Integrità della carovana",
      "État de la caravane",
      "Состояние каравана",
      "Kervanın Durumu"
    ],
    "descriptions": [
      "Schütze und repariere die Gildenkarawane. Eine beschädigte Karawane erschwert den Endkampf; ein unversehrter Konvoi bringt einen Lieferbonus.",
      "Protege y repara la caravana del gremio. Una caravana dañada dificulta el asalto final; un convoy intacto otorga una bonificación de entrega.",
      "Bescherm en repareer de gildekaravaan. Een beschadigde karavaan maakt de eindstrijd zwaarder; een ongeschonden konvooi levert een bezorgbonus op.",
      "Proteggi e ripara la carovana della gilda. Una carovana danneggiata rende più difficile l'assalto finale; un convoglio intatto dà un bonus di consegna.",
      "Protégez et réparez la caravane de guilde. Une caravane endommagée complique l'assaut final ; un convoi intact accorde un bonus de livraison.",
      "Защищайте и чините караван гильдии. Повреждённый караван усложняет финальный бой, а невредимый даёт бонус к доставке.",
      "Lonca kervanını koruyup onarın. Hasarlı bir kervan son saldırıyı zorlaştırır; sağlam bir konvoy teslimat bonusu sağlar."
    ]
  },
  "warmth": {
    "label": "Warmth",
    "description": "Maintain the party’s warmth with hearths, shelter and festival magic. Deep cold empowers the Rimebell Colossus.",
    "labels": [
      "Wärme",
      "Calor",
      "Warmte",
      "Calore",
      "Chaleur",
      "Тепло",
      "Sıcaklık"
    ],
    "descriptions": [
      "Halte die Gruppe mit Feuerstellen, Unterschlupf und Festmagie warm. Tiefe Kälte stärkt den Reifglocken-Koloss.",
      "Mantén al grupo caliente con hogares, refugios y magia festiva. El frío intenso fortalece al Coloso de la Campana Helada.",
      "Houd je groep warm met haarden, beschutting en feestmagie. Extreme kou versterkt de Rijpklokkolos.",
      "Mantieni caldo il gruppo con focolari, ripari e magia festiva. Il gelo intenso potenzia il Colosso della Campana Gelata.",
      "Gardez votre groupe au chaud grâce aux foyers, aux abris et à la magie des fêtes. Le froid intense renforce le Colosse du Givre.",
      "Поддерживайте тепло отряда с помощью очагов, укрытий и праздничной магии. Сильный холод усиливает Колосса инеевого колокола.",
      "Ocaklar, sığınaklar ve festival büyüsüyle grubunuzu sıcak tutun. Şiddetli soğuk Kırağı Çanı Devi'ni güçlendirir."
    ]
  },
  "chronicle_stability": {
    "label": "Chronicle Stability",
    "description": "Repair fractured records and anchor the timeline. Unstable history makes The Last Hour more dangerous.",
    "labels": [
      "Chronikstabilität",
      "Estabilidad de la crónica",
      "Kroniekstabiliteit",
      "Stabilità della cronaca",
      "Stabilité des chroniques",
      "Стабильность хроники",
      "Kronik Dengesi"
    ],
    "descriptions": [
      "Repariere zerrissene Aufzeichnungen und stabilisiere die Zeitlinie. Instabile Geschichte macht Die Letzte Stunde gefährlicher.",
      "Repara los registros fracturados y estabiliza la línea temporal. Una historia inestable vuelve más peligrosa a La Última Hora.",
      "Herstel gebroken archieven en veranker de tijdlijn. Een instabiele geschiedenis maakt Het Laatste Uur gevaarlijker.",
      "Ripara i documenti infranti e stabilizza la linea temporale. Una storia instabile rende più pericolosa L'Ultima Ora.",
      "Réparez les archives brisées et stabilisez la chronologie. Une histoire instable rend La Dernière Heure plus dangereuse.",
      "Восстанавливайте повреждённые записи и закрепляйте временную линию. Нестабильная история делает Последний Час опаснее.",
      "Parçalanmış kayıtları onarın ve zaman çizelgesini sabitleyin. Dengesiz tarih Son Saat'i daha tehlikeli kılar."
    ]
  },
  "vow_harmony": {
    "label": "Vow Harmony",
    "description": "Mend broken vows and restore festival bonds. Strong harmony weakens the Severed Vow and improves the clear payout.",
    "labels": [
      "Schwurharmonie",
      "Armonía de los votos",
      "Geloftenharmonie",
      "Armonia dei voti",
      "Harmonie des vœux",
      "Гармония клятв",
      "Yemin Uyumu"
    ],
    "descriptions": [
      "Heile gebrochene Schwüre und erneuere die Festbande. Starke Harmonie schwächt den Gebrochenen Schwur und erhöht die Abschlussbelohnung.",
      "Repara los votos rotos y restablece los lazos del festival. Una fuerte armonía debilita al Voto Roto y aumenta la recompensa al completar la ruta.",
      "Herstel verbroken geloften en feestbanden. Sterke harmonie verzwakt de Verbroken Gelofte en verhoogt de eindbeloning.",
      "Ripara i voti infranti e i legami della festa. Una forte armonia indebolisce il Voto Spezzato e migliora la ricompensa finale.",
      "Réparez les serments brisés et les liens de la fête. Une forte harmonie affaiblit le Serment Brisé et améliore la récompense finale.",
      "Восстанавливайте нарушенные клятвы и праздничные узы. Сильная гармония ослабляет Разорванную клятву и повышает награду за прохождение.",
      "Bozulmuş yeminleri ve festival bağlarını onarın. Güçlü uyum Kopmuş Yemin'i zayıflatır ve tamamlama ödülünü artırır."
    ]
  },
  "grove_balance": {
    "label": "Grove Balance",
    "description": "Prune feral growth without starving the sacred grove. Balanced spring magic weakens the Thornheart Ancient.",
    "labels": [
      "Hainbalance",
      "Equilibrio del bosque",
      "Bosbalans",
      "Equilibrio del bosco",
      "Équilibre du bosquet",
      "Равновесие рощи",
      "Koru Dengesi"
    ],
    "descriptions": [
      "Stutze wildes Wachstum, ohne den heiligen Hain auszuhungern. Ausgewogene Frühlingsmagie schwächt den Dornherz-Uralten.",
      "Poda el crecimiento salvaje sin agotar la arboleda sagrada. La magia primaveral equilibrada debilita al Ancestro Corazón de Espinas.",
      "Snoei wilde groei zonder het heilige bos uit te putten. Evenwichtige lentemagie verzwakt de Oude Doornhart.",
      "Pota la crescita selvaggia senza impoverire il bosco sacro. La magia primaverile equilibrata indebolisce l'Antico Cuorspina.",
      "Taillez la végétation sauvage sans épuiser le bosquet sacré. Une magie printanière équilibrée affaiblit l'Ancien Cœur-d'Épines.",
      "Сдерживайте дикие заросли, не истощая священную рощу. Равновесие весенней магии ослабляет Древнего Терносердца.",
      "Kutsal koruyu tüketmeden yabani büyümeyi budayın. Dengeli bahar büyüsü Dikenyürek Kadim'i zayıflatır."
    ]
  }
} as const;
export const SEASONAL_OBJECTIVE_ROWS={
  "champion_laurels": {
    "label": "Champion Laurels",
    "description": "Earn laurels from prestigious trials. Each laurel adds bonus event currency when Aureon falls.",
    "effect": "reward_bonus",
    "labels": [
      "Championlorbeer",
      "Laureles del campeón",
      "Kampioenslauweren",
      "Allori del campione",
      "Lauriers du champion",
      "Лавры чемпиона",
      "Şampiyon Defneleri"
    ],
    "descriptions": [
      "Verdiene Lorbeer bei angesehenen Prüfungen. Jeder Lorbeer bringt zusätzliche Eventwährung, wenn Aureon fällt.",
      "Obtén laureles en pruebas prestigiosas. Cada laurel añade monedas de evento cuando Aureon cae.",
      "Verdien lauweren in prestigieuze proeven. Elke lauwer levert extra evenementvaluta op als Aureon valt.",
      "Ottieni allori dalle prove prestigiose. Ogni alloro aggiunge valuta evento quando Aureon cade.",
      "Gagnez des lauriers lors d'épreuves prestigieuses. Chaque laurier ajoute de la monnaie d'événement lorsque Aureon tombe.",
      "Зарабатывайте лавры в престижных испытаниях. Каждый лавр даёт дополнительную валюту события после победы над Авреоном.",
      "Seçkin sınavlardan defne kazanın. Aureon yenildiğinde her defne ek etkinlik parası sağlar."
    ]
  },
  "rift_anchors": {
    "label": "Rift Anchors",
    "description": "Seal up to three major tears. Each active anchor reduces the Constellation Eater’s attack by 4%.",
    "effect": "boss_attack_down",
    "labels": [
      "Rissanker",
      "Anclajes de la grieta",
      "Scheurankers",
      "Ancore del varco",
      "Ancres de faille",
      "Якоря разлома",
      "Yarık Çapaları"
    ],
    "descriptions": [
      "Versiegle bis zu drei große Risse. Jeder aktive Anker senkt den Angriff des Sternbildverschlingers um 4 %.",
      "Sella hasta tres grietas mayores. Cada anclaje activo reduce el ataque del Devorador de Constelaciones un 4 %.",
      "Verzegel tot drie grote scheuren. Elk actief anker vermindert de aanval van de Sterrenbeeldverslinder met 4%.",
      "Sigilla fino a tre grandi varchi. Ogni ancora attiva riduce del 4% l'attacco del Divoratore di Costellazioni.",
      "Scellez jusqu'à trois grandes failles. Chaque ancre active réduit de 4 % l'attaque du Dévoreur de constellations.",
      "Запечатайте до трёх крупных разломов. Каждый активный якорь снижает атаку Пожирателя созвездий на 4%.",
      "En fazla üç büyük yarığı mühürleyin. Her etkin çapa, Takımyıldız Yiyen'in saldırısını %4 azaltır."
    ]
  },
  "ward_lanterns": {
    "label": "Ward Lanterns",
    "description": "Restore three key ward lanterns. Each lit ward exposes the Hollow Regent and removes 5% of its maximum health.",
    "effect": "boss_hp_down",
    "labels": [
      "Schutzlaternen",
      "Faroles protectores",
      "Beschermlantaarns",
      "Lanterne protettive",
      "Lanternes protectrices",
      "Защитные фонари",
      "Koruma Fenerleri"
    ],
    "descriptions": [
      "Stelle drei wichtige Schutzlaternen wieder her. Jede brennende Laterne entblößt den Hohlen Regenten und verringert seine maximalen Lebenspunkte um 5 %.",
      "Restaura tres faroles protectores clave. Cada farol encendido expone al Regente Hueco y reduce su salud máxima un 5 %.",
      "Herstel drie belangrijke beschermlantaarns. Elke brandende lantaarn maakt de Holle Regent kwetsbaar en vermindert zijn maximale gezondheid met 5%.",
      "Ripristina tre lanterne protettive. Ogni lanterna accesa espone il Reggente Cavo e riduce del 5% la sua salute massima.",
      "Restaurez trois lanternes protectrices. Chaque lanterne allumée expose le Régent creux et réduit sa santé maximale de 5 %.",
      "Восстановите три ключевых защитных фонаря. Каждый зажжённый фонарь раскрывает Полого регента и снижает его максимальное здоровье на 5%.",
      "Üç önemli koruma fenerini onarın. Yanan her fener Boş Naip'i savunmasız bırakır ve azami sağlığını %5 azaltır."
    ]
  },
  "cargo_crates": {
    "label": "Protected Cargo",
    "description": "The caravan begins with three valuable cargo lots. Dangerous routes can lose them; each delivered lot adds 3 event currency.",
    "effect": "reward_bonus",
    "labels": [
      "Geschützte Fracht",
      "Carga protegida",
      "Beschermde lading",
      "Carico protetto",
      "Cargaison protégée",
      "Защищённый груз",
      "Korunan Yük"
    ],
    "descriptions": [
      "Die Karawane startet mit drei wertvollen Frachtposten. Auf gefährlichen Routen können sie verloren gehen; jeder gelieferte Posten bringt 3 Eventwährung.",
      "La caravana empieza con tres lotes de carga valiosa. Las rutas peligrosas pueden hacerte perderlos; cada lote entregado añade 3 monedas de evento.",
      "De karavaan begint met drie waardevolle ladingpartijen. Gevaarlijke routes kunnen ze kosten; elke afgeleverde partij levert 3 evenementvaluta op.",
      "La carovana parte con tre lotti di carico preziosi. I percorsi pericolosi possono farli perdere; ogni lotto consegnato aggiunge 3 valuta evento.",
      "La caravane commence avec trois cargaisons précieuses. Les routes dangereuses peuvent les faire perdre ; chaque livraison ajoute 3 unités de monnaie d'événement.",
      "Караван начинает путь с тремя ценными партиями груза. На опасных маршрутах их можно потерять; каждая доставленная партия даёт 3 валюты события.",
      "Kervan üç değerli yük partisiyle başlar. Tehlikeli rotalarda bunlar kaybedilebilir; teslim edilen her parti 3 etkinlik parası sağlar."
    ]
  },
  "lit_hearths": {
    "label": "Festival Hearths",
    "description": "Light up to three festival hearths. Each hearth restores 8% maximum health to surviving party members before the final boss.",
    "effect": "preboss_heal",
    "labels": [
      "Festherde",
      "Hogares del festival",
      "Feesthaarden",
      "Focolari festivi",
      "Foyers du festival",
      "Праздничные очаги",
      "Festival Ocakları"
    ],
    "descriptions": [
      "Entzünde bis zu drei Festherde. Jeder Herd stellt vor dem Endboss 8 % der maximalen Lebenspunkte überlebender Gruppenmitglieder wieder her.",
      "Enciende hasta tres hogares del festival. Cada uno recupera un 8 % de la salud máxima de los miembros supervivientes antes del jefe final.",
      "Steek maximaal drie feesthaarden aan. Elke haard herstelt vóór de eindbaas 8% van de maximale gezondheid van overlevende groepsleden.",
      "Accendi fino a tre focolari festivi. Ognuno ripristina l'8% della salute massima dei membri sopravvissuti prima del boss finale.",
      "Allumez jusqu'à trois foyers du festival. Chacun rend 8 % de leur santé maximale aux survivants du groupe avant le boss final.",
      "Зажгите до трёх праздничных очагов. Каждый очаг восстанавливает выжившим членам отряда 8% максимального здоровья перед финальным боссом.",
      "En fazla üç festival ocağı yakın. Her ocak, son boss öncesinde hayatta kalan grup üyelerinin azami sağlığının %8'ini yeniler."
    ]
  },
  "chronicle_seals": {
    "label": "Chronicle Seals",
    "description": "Recover three intact seals from the fractured archive. Each seal reduces The Last Hour’s defense by 4%.",
    "effect": "boss_defense_down",
    "labels": [
      "Chroniksiegel",
      "Sellos de la crónica",
      "Kroniekzegels",
      "Sigilli della cronaca",
      "Sceaux des chroniques",
      "Печати хроники",
      "Kronik Mühürleri"
    ],
    "descriptions": [
      "Berge drei intakte Siegel aus dem zerstörten Archiv. Jedes Siegel senkt die Verteidigung der Letzten Stunde um 4 %.",
      "Recupera tres sellos intactos del archivo fracturado. Cada sello reduce la defensa de La Última Hora un 4 %.",
      "Verzamel drie intacte zegels uit het gebroken archief. Elk zegel verlaagt de verdediging van Het Laatste Uur met 4%.",
      "Recupera tre sigilli integri dall'archivio infranto. Ogni sigillo riduce del 4% la difesa dell'Ultima Ora.",
      "Récupérez trois sceaux intacts dans les archives brisées. Chaque sceau réduit de 4 % la défense de La Dernière Heure.",
      "Найдите три целые печати в разрушенном архиве. Каждая снижает защиту Последнего Часа на 4%.",
      "Parçalanmış arşivden üç sağlam mühür alın. Her mühür Son Saat'in savunmasını %4 azaltır."
    ]
  },
  "restored_vows": {
    "label": "Restored Vows",
    "description": "Restore three ceremonial vows. Each completed vow heals surviving party members for 8% maximum health before the final confrontation.",
    "effect": "preboss_heal",
    "labels": [
      "Erneuerte Schwüre",
      "Votos restaurados",
      "Herstelde geloften",
      "Voti ripristinati",
      "Serments restaurés",
      "Восстановленные клятвы",
      "Yenilenen Yeminler"
    ],
    "descriptions": [
      "Erneuere drei zeremonielle Schwüre. Jeder erneuerte Schwur heilt überlebende Gruppenmitglieder vor dem Endkampf um 8 % ihrer maximalen Lebenspunkte.",
      "Restaura tres votos ceremoniales. Cada voto recupera el 8 % de la salud máxima de los supervivientes antes del enfrentamiento final.",
      "Herstel drie ceremoniële geloften. Elke gelofte geneest overlevende groepsleden vóór het eindgevecht voor 8% van hun maximale gezondheid.",
      "Ripristina tre voti cerimoniali. Ogni voto cura i membri sopravvissuti dell'8% della loro salute massima prima dello scontro finale.",
      "Restaurez trois serments cérémoniels. Chaque serment soigne les survivants du groupe de 8 % de leur santé maximale avant le combat final.",
      "Восстановите три церемониальные клятвы. Каждая исцеляет выживших членов отряда на 8% максимального здоровья перед финальным боем.",
      "Üç törensel yemini yenileyin. Her yemin, son çatışmadan önce hayatta kalan grup üyelerinin azami sağlığının %8'ini iyileştirir."
    ]
  },
  "heartroot_bonds": {
    "label": "Heartroot Bonds",
    "description": "Bind three unstable Heartroot knots. Each bond removes 5% of the Thornheart Ancient’s maximum health.",
    "effect": "boss_hp_down",
    "labels": [
      "Herzwurzelbindungen",
      "Vínculos de raíz del corazón",
      "Hartwortelbanden",
      "Legami della radice del cuore",
      "Liens de racine-cœur",
      "Связи сердечного корня",
      "Kalp Kökü Bağları"
    ],
    "descriptions": [
      "Binde drei instabile Herzwurzelknoten. Jede Bindung verringert die maximalen Lebenspunkte des Dornherz-Uralten um 5 %.",
      "Ata tres nudos inestables de raíz del corazón. Cada vínculo reduce la salud máxima del Ancestro Corazón de Espinas un 5 %.",
      "Bind drie instabiele hartwortelknopen. Elke binding vermindert de maximale gezondheid van de Oude Doornhart met 5%.",
      "Lega tre nodi instabili della radice del cuore. Ogni legame riduce del 5% la salute massima dell'Antico Cuorspina.",
      "Liez trois nœuds instables de racine-cœur. Chaque lien réduit de 5 % la santé maximale de l'Ancien Cœur-d'Épines.",
      "Свяжите три нестабильных узла сердечного корня. Каждый снижает максимальное здоровье Древнего Терносердца на 5%.",
      "Üç dengesiz Kalp Kökü düğümünü bağlayın. Her bağ Dikenyürek Kadim'in azami sağlığını %5 azaltır."
    ]
  }
} as const;
export const SEASONAL_BOSS_EFFECT_TEMPLATES={
  "critical": [
    "Bossangriff +{pct}%, solange {label} kritisch ist.",
    "Ataque del jefe +{pct}% mientras {label} esté en estado crítico.",
    "Baasaanval +{pct}% zolang {label} kritiek is.",
    "Attacco del boss +{pct}% finché {label} è in stato critico.",
    "Attaque du boss +{pct} % tant que {label} est critique.",
    "Атака босса +{pct}%, пока показатель «{label}» критический.",
    "Boss saldırısı +%{pct}; {label} kritik düzeydeyken."
  ],
  "strong": [
    "Bossangriff −{pct}% · +{bonus} Eventwährung beim Sieg.",
    "Ataque del jefe −{pct}% · +{bonus} monedas de evento al vencer.",
    "Baasaanval −{pct}% · +{bonus} evenementvaluta bij winst.",
    "Attacco del boss −{pct}% · +{bonus} valuta evento alla vittoria.",
    "Attaque du boss −{pct} % · +{bonus} monnaie d'événement à la victoire.",
    "Атака босса −{pct}% · +{bonus} валюты события за победу.",
    "Boss saldırısı −%{pct} · zaferde +{bonus} etkinlik parası."
  ],
  "steady": [
    "Erreiche {threshold}+ für einen Bossvorteil und +{bonus} Eventwährung.",
    "Alcanza {threshold}+ para obtener ventaja frente al jefe y +{bonus} monedas de evento.",
    "Bereik {threshold}+ voor een voordeel tegen de baas en +{bonus} evenementvaluta.",
    "Raggiungi {threshold}+ per un vantaggio contro il boss e +{bonus} valuta evento.",
    "Atteignez {threshold}+ pour un avantage contre le boss et +{bonus} monnaie d'événement.",
    "Достигните {threshold}+, чтобы ослабить босса и получить +{bonus} валюты события.",
    "Boss avantajı ve +{bonus} etkinlik parası için {threshold}+ seviyesine ulaşın."
  ]
} as const;
export const SEASONAL_OBJECTIVE_EFFECT_TEMPLATES={
  "boss_attack_down": [
    "Bossangriff −{pct}% durch {count}/{max} {label}.",
    "Ataque del jefe −{pct}% por {count}/{max} {label}.",
    "Baasaanval −{pct}% door {count}/{max} {label}.",
    "Attacco del boss −{pct}% grazie a {count}/{max} {label}.",
    "Attaque du boss −{pct} % grâce à {count}/{max} {label}.",
    "Атака босса −{pct}% благодаря {count}/{max} «{label}».",
    "Boss saldırısı −%{pct}; {count}/{max} {label} sayesinde."
  ],
  "boss_hp_down": [
    "Maximale Boss-LP −{pct}% durch {count}/{max} {label}.",
    "Salud máxima del jefe −{pct}% por {count}/{max} {label}.",
    "Maximale baasgezondheid −{pct}% door {count}/{max} {label}.",
    "Salute massima del boss −{pct}% grazie a {count}/{max} {label}.",
    "Santé maximale du boss −{pct} % grâce à {count}/{max} {label}.",
    "Максимальное здоровье босса −{pct}% благодаря {count}/{max} «{label}».",
    "Boss azami sağlığı −%{pct}; {count}/{max} {label} sayesinde."
  ],
  "boss_defense_down": [
    "Bossverteidigung −{pct}% durch {count}/{max} {label}.",
    "Defensa del jefe −{pct}% por {count}/{max} {label}.",
    "Baasverdediging −{pct}% door {count}/{max} {label}.",
    "Difesa del boss −{pct}% grazie a {count}/{max} {label}.",
    "Défense du boss −{pct} % grâce à {count}/{max} {label}.",
    "Защита босса −{pct}% благодаря {count}/{max} «{label}».",
    "Boss savunması −%{pct}; {count}/{max} {label} sayesinde."
  ],
  "reward_bonus": [
    "+{bonus} Eventwährung beim Sieg mit {count}/{max} {label}.",
    "+{bonus} monedas de evento al vencer con {count}/{max} {label}.",
    "+{bonus} evenementvaluta bij winst met {count}/{max} {label}.",
    "+{bonus} valuta evento alla vittoria con {count}/{max} {label}.",
    "+{bonus} monnaie d'événement à la victoire avec {count}/{max} {label}.",
    "+{bonus} валюты события за победу при {count}/{max} «{label}».",
    "+{bonus} etkinlik parası; {count}/{max} {label} ile kazanılırsa."
  ],
  "preboss_heal": [
    "Überlebende Gruppenmitglieder erhalten vor dem Endboss {pct}% ihrer maximalen LP zurück.",
    "Los supervivientes del grupo recuperan un {pct}% de su salud máxima antes del jefe final.",
    "Overlevende groepsleden herstellen {pct}% van hun maximale gezondheid vóór de eindbaas.",
    "I membri sopravvissuti recuperano il {pct}% della salute massima prima del boss finale.",
    "Les survivants du groupe récupèrent {pct} % de leur santé maximale avant le boss final.",
    "Выжившие члены отряда восстанавливают {pct}% максимального здоровья перед финальным боссом.",
    "Hayatta kalan grup üyeleri son boss öncesi azami sağlıklarının %{pct}'ini yeniler."
  ]
} as const;
const LANGUAGE_COLUMN:Record<Language,number>={en:-1,de:0,es:1,nl:2,it:3,fr:4,ru:5,tr:6};
const interpolate=(template:string,values:Record<string,string|number>)=>template.replace(/\{(\w+)\}/g,(_match,key:string)=>String(values[key]??'{'+key+'}'));
const rowFor=<T extends {label:string;description:string}>(rows:Record<string,T>,label:string,description:string):T|undefined=>
 Object.values(rows).find(row=>row.label===label&&row.description===description);

/** Do not reinterpret unrecognized warnings or a changed backend copy contract. */
export function localizedSeasonalDungeonMechanic(language:Language,view:CoopRunMechanicView):CoopRunMechanicView{
 if(language==='en')return view;
 const row=rowFor(SEASONAL_MECHANIC_ROWS,view.label,view.description);
 if(!row)return view;
 const index=LANGUAGE_COLUMN[language],label=row.labels[index];
 let effect:string|undefined;
 if(view.status==='critical'){
  const m=/^Boss attack \+(\d+)% while (.+) is critical\.$/.exec(view.bossEffect);
  if(!m||m[2]!==view.label.toLowerCase())return view;
  effect=interpolate(SEASONAL_BOSS_EFFECT_TEMPLATES.critical[index],{pct:m[1],label:label.toLocaleLowerCase(language)});
 }else if(view.status==='strong'){
  const m=/^Boss attack -(\d+)% · \+(\d+) event currency on clear\.$/.exec(view.bossEffect);
  if(!m)return view;
  effect=interpolate(SEASONAL_BOSS_EFFECT_TEMPLATES.strong[index],{pct:m[1],bonus:m[2]});
 }else{
  const m=/^Reach (\d+)\+ for a boss advantage and \+(\d+) event currency\.$/.exec(view.bossEffect);
  if(!m)return view;
  effect=interpolate(SEASONAL_BOSS_EFFECT_TEMPLATES.steady[index],{threshold:m[1],bonus:m[2]});
 }
 return {...view,label,description:row.descriptions[index],bossEffect:effect};
}

/** Numeric boss consequences, counters and server rule outcomes remain authoritative. */
export function localizedSeasonalDungeonObjective(language:Language,view:CoopRunObjectiveView):CoopRunObjectiveView{
 if(language==='en')return view;
 const row=rowFor(SEASONAL_OBJECTIVE_ROWS,view.label,view.description);
 if(!row)return view;
 const index=LANGUAGE_COLUMN[language],label=row.labels[index].toLocaleLowerCase(language);
 let values:Record<string,string|number>={count:view.count,max:view.maxCount,label};
 const effect=row.effect;
 if(effect==='preboss_heal'){
  const m=/^Surviving party members recover (\d+)% max health before the final boss\.$/.exec(view.effectText);
  if(!m)return view;
  values={...values,pct:m[1]};
 }else if(effect==='reward_bonus'){
  const m=/^\+(\d+) event currency if the run clears with (\d+)\/(\d+) (.+)\.$/.exec(view.effectText);
  if(!m||Number(m[2])!==view.count||Number(m[3])!==view.maxCount||m[4]!==row.label.toLowerCase())return view;
  values={...values,bonus:m[1]};
 }else{
  const heading=effect==='boss_attack_down'?'Boss attack':effect==='boss_hp_down'?'Boss maximum health':'Boss defense';
  const m=/^(.+) -(\d+)% from (\d+)\/(\d+) (.+)\.$/.exec(view.effectText);
  if(!m||m[1]!==heading||Number(m[3])!==view.count||Number(m[4])!==view.maxCount||m[5]!==row.label.toLowerCase())return view;
  values={...values,pct:m[2]};
 }
 const template=SEASONAL_OBJECTIVE_EFFECT_TEMPLATES[effect][index];
 return {...view,label:row.labels[index],description:row.descriptions[index],effectText:interpolate(template,values)};
}

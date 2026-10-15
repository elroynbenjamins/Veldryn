import {useMemo} from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {APP_BUILD_INFO} from '../app-build';
import {useGameLanguage} from '../i18n/GameLanguageProvider';
import {useGameplayText} from '../i18n/gameplay';
import type {Language} from '../i18n/languages';
import {useGameTheme} from '../theme/ThemeContext';
import {spacing,typography,type ThemeColors} from '../theme/theme';
import {GameModalHeader,GameModalSurface} from './GameModalSurface';
import {GameButton} from './GameButton';

// Update the release marker and localized notes only when publishing player-facing changes.
// The server-controlled version gate remains authoritative for mandatory updates and maintenance.
export const WHATS_NEW_RELEASE_ID=[APP_BUILD_INFO.version,APP_BUILD_INFO.buildNumber??'dev','2026-10-ux-reliability'].join(':');
const ENGLISH_NOTES=[
 'Cooking, Alchemy and Enchanting handle unavailable recipes more safely.',
 'Crafting recipe lists do less work until you open the details.',
 'Supported actions show loading progress and resist repeated taps.',
 'Your active activity shows its remaining AFK reward reserve.',
 'Release notes are available any time under Settings.',
] as const;

const notesByLanguage:Record<Language,readonly string[]>={
 en:ENGLISH_NOTES,
 de:[
  'Kochen, Alchemie und Verzauberung behandeln nicht verfügbare Rezepte sicherer.',
  'Handwerkslisten laden zusätzliche Informationen erst beim Öffnen.',
  'Unterstützte Aktionen zeigen Ladefortschritt und verhindern wiederholte Eingaben.',
  'Deine laufende Aktivität zeigt die verbleibende AFK-Belohnungsreserve.',
  'Versionshinweise sind jederzeit unter Einstellungen verfügbar.',
 ],
 es:[
  'Cocina, Alquimia y Encantamiento gestionan mejor las recetas no disponibles.',
  'Las recetas calculan menos información hasta abrir sus detalles.',
  'Las acciones compatibles muestran el progreso y evitan pulsaciones repetidas.',
  'Tu actividad muestra la reserva AFK de recompensas restante.',
  'Las novedades se pueden consultar en Ajustes.',
 ],
 nl:[
  'Koken, Alchemie en Betoveren gaan veiliger om met niet-beschikbare recepten.',
  'Receptlijsten berekenen minder informatie totdat je de details opent.',
  'Ondersteunde acties tonen een laadindicator en voorkomen herhaald tikken.',
  'Je actieve bezigheid toont de resterende AFK-beloningenreserve.',
  'Release-informatie is altijd beschikbaar onder Instellingen.',
 ],
 it:[
  'Cucina, Alchimia e Incantamento gestiscono meglio le ricette non disponibili.',
  'Gli elenchi delle ricette elaborano meno informazioni finché non apri i dettagli.',
  'Le azioni supportate mostrano l’attesa e impediscono tocchi ripetuti.',
  'L’attività in corso mostra la riserva AFK di ricompense rimanente.',
  'Le novità sono sempre disponibili in Impostazioni.',
 ],
 fr:[
  'Cuisine, Alchimie et Enchantement gèrent mieux les recettes indisponibles.',
  'Les listes de recettes effectuent moins de calculs avant l’ouverture des détails.',
  'Les actions compatibles affichent leur progression et évitent les doubles clics.',
  'Votre activité affiche la réserve AFK de récompenses restante.',
  'Les nouveautés sont accessibles à tout moment dans Paramètres.',
 ],
};

export function WhatsNewContent({latestVersion,onUpdate}:{latestVersion?:string;onUpdate?:()=>void}){
 const language=useGameLanguage(),{gt}=useGameplayText();
 const C=useGameTheme(),s=useMemo(()=>styles(C),[C]);
 const notes=notesByLanguage[language]??ENGLISH_NOTES;
 return <View style={s.body}>
  <Text style={s.version}>VELDRYN · {APP_BUILD_INFO.version}{APP_BUILD_INFO.buildNumber?' ('+APP_BUILD_INFO.buildNumber+')':''}</Text>
  {notes.map((item,index)=><View key={index} style={s.row}><Text style={s.bullet}>✦</Text><Text style={s.item}>{item}</Text></View>)}
  {latestVersion&&onUpdate?<View style={s.update} accessibilityLiveRegion="polite">
   <Text style={s.updateTitle}>{gt('New version available')}</Text>
   <Text style={s.item}>{gt('VELDRYN {version} is available on Google Play.',{version:latestVersion})}</Text>
   <GameButton compact title={gt('Update now')} onPress={onUpdate}/>
  </View>:null}
 </View>;
}
export function WhatsNewPanel({visible,onClose,reduceMotion=false,latestVersion,onUpdate}:{visible:boolean;onClose:()=>void;reduceMotion?:boolean;latestVersion?:string;onUpdate?:()=>void}){
 const {gt}=useGameplayText();
 return <GameModalSurface visible={visible} onClose={onClose} reduceMotion={reduceMotion} presentation="dialog">
   <GameModalHeader eyebrow={gt('LATEST UPDATE')} title={gt("What's New")} onClose={onClose}/>
   <ScrollView style={{flexGrow:0,maxHeight:'75%'}} showsVerticalScrollIndicator={false}>
    <WhatsNewContent latestVersion={latestVersion} onUpdate={onUpdate}/>
   </ScrollView>
   <GameButton title={gt('Continue')} onPress={onClose}/>
 </GameModalSurface>;
}
function styles(C:ThemeColors){return StyleSheet.create({
 body:{gap:spacing.sm,paddingVertical:spacing.md},
 version:{...typography.caption,color:C.accent,fontWeight:'900'},
 row:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm},
 bullet:{...typography.bodyStrong,color:C.accent},
 item:{...typography.body,color:C.text,flex:1},
 update:{gap:8,padding:spacing.sm,borderWidth:1,borderColor:C.info,borderRadius:10,backgroundColor:C.infoSurface,marginTop:spacing.sm},
 updateTitle:{...typography.bodyStrong,color:C.info},
});}

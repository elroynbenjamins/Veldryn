import {createSourceTranslator,type TranslationRow} from './source-catalog';
export const VISUAL_MESSAGES={
 '{name} equipment artwork':['Ausrüstungsbild: {name}','Ilustración del equipo {name}','Uitrustingsafbeelding van {name}','Illustrazione dell’equipaggiamento {name}','Illustration d’équipement : {name}'],
 '{name} equipment marker':['Ausrüstungssymbol: {name}','Marcador del equipo {name}','Uitrustingsmarkering van {name}','Indicatore dell’equipaggiamento {name}','Repère d’équipement : {name}'],
 'Gem artwork':['Edelsteinbild','Ilustración de gema','Edelsteenafbeelding','Illustrazione gemma','Illustration de gemme'],
 '{name} pixel portrait':['Pixelporträt: {name}','Retrato de píxeles de {name}','Pixelportret van {name}','Ritratto pixel di {name}','Portrait pixel de {name}'],
 'BOSS':['BOSS','JEFE','BAAS','BOSS','BOSS'],
 'LV {level}':['ST {level}','NV {level}','NV {level}','LV {level}','NV {level}'],
 '{name} identity icon':['Identitätssymbol: {name}','Icono de identidad de {name}','Identiteitspictogram van {name}','Icona identità di {name}','Icône d’identité : {name}'],
 '{banner} guild banner':['Gildenbanner {banner}','Estandarte de gremio {banner}','Gildebanner {banner}','Stendardo di gilda {banner}','Bannière de guilde {banner}'],
 '{banner} guild crest with {frame} frame':['Gildenwappen {banner} mit Rahmen {frame}','Emblema de gremio {banner} con marco {frame}','Gildewapen {banner} met omlijsting {frame}','Stemma gilda {banner} con cornice {frame}','Emblème de guilde {banner} avec cadre {frame}'],
 'tank':['Tank','Tanque','Tank','Difensore','Tank'],
 'damage':['Schaden','Daño','Schade','Danni','Dégâts'],
 'support':['Unterstützung','Apoyo','Ondersteuning','Supporto','Soutien'],
 'male':['männlich','masculino','mannelijk','maschile','masculin'],
 'female':['weiblich','femenino','vrouwelijk','femminile','féminin'],
 'front':['von vorne','frontal','voorkant','frontale','de face'],
 'back':['von hinten','trasera','achterkant','posteriore','de dos'],
 '{body} {className} starting character, {view} view':['Startcharakter {className}, {body}, Ansicht {view}','Personaje inicial {className}, {body}, vista {view}','Startpersonage {className}, {body}, aanzicht {view}','Personaggio iniziale {className}, {body}, vista {view}','Personnage initial {className}, {body}, vue {view}'],
} satisfies Record<string,TranslationRow>;
export const visualText=createSourceTranslator(VISUAL_MESSAGES);

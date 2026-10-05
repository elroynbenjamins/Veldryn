import type {Language} from './languages';
import {createTranslator} from './translator';

type Catalog={version:string;build:string;channel:string};

export const appBuildCatalogs:Record<Language,Catalog>={
  en:{version:'Version {version}',build:'Build {build}',channel:'Release channel: {channel}'},
  de:{version:'Version {version}',build:'Build {build}',channel:'Veröffentlichungskanal: {channel}'},
  es:{version:'Versión {version}',build:'Compilación {build}',channel:'Canal de lanzamiento: {channel}'},
  nl:{version:'Versie {version}',build:'Build {build}',channel:'Releasekanaal: {channel}'},
  it:{version:'Versione {version}',build:'Build {build}',channel:'Canale di rilascio: {channel}'},
  fr:{version:'Version {version}',build:'Compilation {build}',channel:'Canal de diffusion : {channel}'},
};

export const appBuildText=createTranslator(appBuildCatalogs);

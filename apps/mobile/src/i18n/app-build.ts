import type {Language} from './languages';
import {createTranslator} from './translator';

type Catalog={version:string;build:string;channel:string;source:string};

export const appBuildCatalogs:Record<Language,Catalog>={
  en:{version:'Version {version}',build:'Build {build}',channel:'Release channel: {channel}',source:'Source: {source}'},
  de:{version:'Version {version}',build:'Build {build}',channel:'Veröffentlichungskanal: {channel}',source:'Quelle: {source}'},
  es:{version:'Versión {version}',build:'Compilación {build}',channel:'Canal de lanzamiento: {channel}',source:'Origen: {source}'},
  nl:{version:'Versie {version}',build:'Build {build}',channel:'Releasekanaal: {channel}',source:'Bron: {source}'},
  it:{version:'Versione {version}',build:'Build {build}',channel:'Canale di rilascio: {channel}',source:'Sorgente: {source}'},
  fr:{version:'Version {version}',build:'Compilation {build}',channel:'Canal de diffusion : {channel}',source:'Source : {source}'},
};

export const appBuildText=createTranslator(appBuildCatalogs);

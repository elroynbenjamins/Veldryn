import React,{createContext,useContext,useMemo} from 'react';
import type {PropsWithChildren} from 'react';

export type ThemeId='veldryn'|'obsidian'|'ivory';

export type ThemePalette={
  id:ThemeId;
  label:string;
  dark:boolean;
  bg:string;
  panel:string;
  panel2:string;
  stage:string;
  line:string;
  lineStrong:string;
  text:string;
  muted:string;
  disabled:string;
  accent:string;
  accentSoft:string;
  action:string;
  actionSurface:string;
  actionText:string;
  good:string;
  bad:string;
  warning:string;
  info:string;
  nav:string;
  overlay:string;
};

export const THEMES:Record<ThemeId,ThemePalette>={
  veldryn:{
    id:'veldryn',label:'VELDRYN',dark:true,
    bg:'#07111C',panel:'#0D1E2D',panel2:'#14283A',stage:'#081827',
    line:'#38506A',lineStrong:'#B58A35',
    text:'#F3F7FC',muted:'#9BAFC4',disabled:'#66798C',
    accent:'#E2B74D',accentSoft:'#F0D58C',
    action:'#3EA6D8',actionSurface:'#123B56',actionText:'#F6FBFF',
    good:'#57C98A',bad:'#EC7D83',warning:'#E9B95D',info:'#67BDE8',
    nav:'#081522',overlay:'rgba(0,0,0,.70)',
  },
  obsidian:{
    id:'obsidian',label:'Obsidian Contrast',dark:true,
    bg:'#030507',panel:'#0B0F14',panel2:'#141B23',stage:'#05090D',
    line:'#607080',lineStrong:'#E4AA3F',
    text:'#FFFFFF',muted:'#C3CED8',disabled:'#77838E',
    accent:'#FFC857',accentSoft:'#FFE2A0',
    action:'#37C7FF',actionSurface:'#063D55',actionText:'#FFFFFF',
    good:'#65E69A',bad:'#FF727A',warning:'#FFD166',info:'#63D1FF',
    nav:'#05080C',overlay:'rgba(0,0,0,.80)',
  },
  ivory:{
    id:'ivory',label:'Ivory Contrast',dark:false,
    bg:'#F5F2EA',panel:'#FFFFFF',panel2:'#E8EEF4',stage:'#EEF2F5',
    line:'#708090',lineStrong:'#8A641B',
    text:'#101820',muted:'#485A6B',disabled:'#7A8792',
    accent:'#8A641B',accentSoft:'#6B4D14',
    action:'#006EA8',actionSurface:'#D8ECF7',actionText:'#062033',
    good:'#137A46',bad:'#B4232D',warning:'#8A5A00',info:'#006EA8',
    nav:'#FFFFFF',overlay:'rgba(16,24,32,.46)',
  },
};

export function normalizeThemeId(value:unknown):ThemeId{
  return value==='obsidian'||value==='ivory'||value==='veldryn'?value:'veldryn';
}

const ThemeContext=createContext<ThemePalette>(THEMES.veldryn);

export function ThemeProvider({themeId,children}:PropsWithChildren<{themeId:ThemeId}>){
  const palette=useMemo(()=>THEMES[normalizeThemeId(themeId)],[themeId]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}

export function useGameTheme(){return useContext(ThemeContext)}

import {writable} from 'svelte/store';

type ApplyText=(value:string)=>boolean;

export type LanguageRequest={
 text:string;
 mode:'text'|'voice';
 apply?:ApplyText;
};

export const languagePanel=writable<LanguageRequest|null>(null);

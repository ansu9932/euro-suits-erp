import {get,writable} from 'svelte/store';
import {api} from './api';
import {isLocalLanguage,isSpeechLanguage,type Language,type LocalLanguage} from './chatLanguage';

type Preferences={translation:LocalLanguage;speech:Language};
export const defaultLanguagePreferences:Preferences={translation:'kn',speech:'en'};
export const languagePreferences=writable<Preferences>(defaultLanguagePreferences);
export const languagePreferenceNotice=writable('');
let active=0,revision=0,sequence=Promise.resolve();

function read(value:unknown):Preferences|null{
 if(!value||typeof value!=='object')return null;
 const saved=value as Record<string,unknown>;
 const translation=saved.translation==='ta'?'te':saved.translation;
 const speech=saved.speech==='ta'?'te':saved.speech;
 return isLocalLanguage(translation)&&isSpeechLanguage(speech)?{translation,speech}:null;
}

export function loadLanguagePreferences(userId:number){
 active=userId;
 const started=++revision,key='erp-language-'+userId;
 let local:Preferences|null=null;
 try{local=read(JSON.parse(localStorage.getItem(key)||'null'));}catch{/* Browser storage is optional. */}
 languagePreferenceNotice.set('');
 languagePreferences.set(local??defaultLanguagePreferences);
 void api('/language/preferences').then(result=>{
  if(active!==userId||started!==revision)return;
  const saved=read(result);
  if(saved){languagePreferences.set(saved);cache(key,saved);}
 }).catch(()=>{});
 return ()=>{if(active===userId){active=0;revision++;}};
}

function cache(key:string,preferences:Preferences){
 try{localStorage.setItem(key,JSON.stringify(preferences));}catch{/* The session can still use the new choice. */}
}

export function saveLanguagePreferences(update:Partial<Preferences>){
 const userId=active;
 if(!userId)return;
 const next={...get(languagePreferences),...update};
 languagePreferences.set(next);
 cache('erp-language-'+userId,next);
 const ticket=++revision;
 languagePreferenceNotice.set('');
 sequence=sequence.catch(()=>{}).then(async()=>{
  if(active!==userId||ticket!==revision)return;
  try{await api('/language/preferences',next,'PATCH');}
  catch{if(active===userId&&ticket===revision)languagePreferenceNotice.set('Using your selection on this device. Account sync is temporarily unavailable.');}
 });
}

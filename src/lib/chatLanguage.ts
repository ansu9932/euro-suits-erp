export type Language='en'|'kn'|'ta';
export type LocalLanguage=Exclude<Language,'en'>;
export const languageNames={en:'English',kn:'Kannada',ta:'Tamil'} as const;
export const localNames={kn:'ಕನ್ನಡ',ta:'தமிழ்'} as const;
export const localLanguages=['kn','ta'] as const;
export const speechLanguages=['en',...localLanguages] as const;
export const isLocalLanguage=(value:unknown):value is LocalLanguage=>value==='kn'||value==='ta';
export const isSpeechLanguage=(value:unknown):value is Language=>value==='en'||isLocalLanguage(value);
const speechTags={en:'en-IN',kn:'kn-IN',ta:'ta-IN'} as const;

type TranslationProgress=Event&{loaded:number};
type TranslatorEngine={
 translate(text:string,options:{signal:AbortSignal}):Promise<string>;
 destroy():void;
};
type TranslationAPI={
 create(options:{
  sourceLanguage:Language;
  targetLanguage:Language;
  signal:AbortSignal;
  monitor(target:EventTarget):void;
 }):Promise<TranslatorEngine>;
};

type SpeechResult={isFinal:boolean;0:{transcript:string}};
type Recognition={
 lang:string;
 continuous:boolean;
 interimResults:boolean;
 onresult:((event:{resultIndex:number;results:ArrayLike<SpeechResult>})=>void)|null;
 onerror:((event:{error:string})=>void)|null;
 onend:(()=>void)|null;
 start():void;
 stop():void;
 abort():void;
};
type ChatBrowser=Window&{
 Translator?:TranslationAPI;
 SpeechRecognition?:new()=>Recognition;
 webkitSpeechRecognition?:new()=>Recognition;
};

// Share warm engines across forms and chat for the current signed-in session.
const engines=new Map<string,TranslatorEngine>();
const downloading=new Map<string,{controller:AbortController;ready:Promise<TranslatorEngine>}>();
let session=0;

function engine(source:Language,target:Language,onProgress:(value:number)=>void){
 const api=(window as ChatBrowser).Translator;
 if(!api)throw new Error('Open the ERP in a current desktop version of Chrome for text translation.');
 const key=source+':'+target,ready=engines.get(key);
 if(ready)return Promise.resolve(ready);
 const pending=downloading.get(key);
 if(pending)return pending.ready;
 const controller=new AbortController(),version=session;
 const timer=setTimeout(()=>controller.abort(),120_000);
 // Called directly from the user's click. Chrome needs it to start a download.
 const promise=api.create({
  sourceLanguage:source,
  targetLanguage:target,
  signal:controller.signal,
  monitor(events){
   events.addEventListener('downloadprogress',event=>onProgress(Math.round((event as TranslationProgress).loaded*100)));
  }
 }).then(translator=>{
  if(version!==session||controller.signal.aborted){
   translator.destroy();
   throw new DOMException('Translation cancelled','AbortError');
  }
  engines.set(key,translator);
  return translator;
 }).finally(()=>{
  clearTimeout(timer);
  if(downloading.get(key)?.controller===controller)downloading.delete(key);
 });
 downloading.set(key,{controller,ready:promise});
 return promise;
}

export function prepareTranslation(source:Language,target:Language,onProgress:(value:number)=>void=()=>{}){
 if(source===target)return Promise.resolve(null);
 try{return engine(source,target,onProgress);}
 catch(error){return Promise.reject(error);}
}

export async function translateText(text:string,source:Language,target:Language,signal:AbortSignal,onProgress:(value:number)=>void=()=>{}){
 try{
  signal.throwIfAborted();
  const translator=await prepareTranslation(source,target,onProgress);
  signal.throwIfAborted();
  return translator?(await translator.translate(text,{signal:AbortSignal.any([signal,AbortSignal.timeout(35_000)])})).trim():text.trim();
 }catch(error){
  if(signal.aborted)throw error;
  if(!(window as ChatBrowser).Translator)throw error;
  throw new Error('Translation could not finish. Check your connection and try again.');
 }
}

export function resetTranslationSession(){
 session++;
 for(const pending of downloading.values())pending.controller.abort();
 downloading.clear();
 for(const translator of engines.values())translator.destroy();
 engines.clear();
}

export function speechError(reason:string,language:Language){
 if(reason==='not-allowed'||reason==='service-not-allowed')return 'Allow microphone access in your browser.';
 if(reason==='no-speech')return 'No speech was detected. Try again.';
 if(reason==='language-not-supported')return languageNames[language]+' voice typing is unavailable in this browser.';
 return 'Voice typing is unavailable. Check the microphone and your connection.';
}

export type {Recognition};

export function createChatRecognition(language:Language='en'){
 const browser=window as ChatBrowser;
 const SpeechRecognition=browser.SpeechRecognition??browser.webkitSpeechRecognition;
 if(!SpeechRecognition)throw new Error('Voice typing is available in supported desktop browsers such as Chrome.');
 const recognition=new SpeechRecognition();
 recognition.lang=speechTags[language];
 recognition.continuous=true;
 recognition.interimResults=false;
 return recognition;
}

type TranslationProgress=Event&{loaded:number};
type KannadaTranslator={
 translate(text:string,options:{signal:AbortSignal}):Promise<string>;
 destroy():void;
};
type TranslationAPI={
 create(options:{
  sourceLanguage:'en';
  targetLanguage:'kn';
  signal:AbortSignal;
  monitor(target:EventTarget):void;
 }):Promise<KannadaTranslator>;
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

export async function translateKannada(text:string,signal:AbortSignal,onProgress:(progress:number)=>void){
 const api=(window as ChatBrowser).Translator;
 if(!api)throw new Error('Open ERP Chat in a current desktop version of Chrome to translate to Kannada.');
 const work=AbortSignal.any([signal,AbortSignal.timeout(120_000)]);
 let translator:KannadaTranslator|undefined;
 try{
  // Call during the user's click so the browser can download a language pack.
  translator=await api.create({
   sourceLanguage:'en',
   targetLanguage:'kn',
   signal:work,
   monitor(target){
    target.addEventListener('downloadprogress',event=>onProgress(Math.round((event as TranslationProgress).loaded*100)));
   }
  });
  return (await translator.translate(text,{signal:work})).trim();
 }catch(e){
  if(signal.aborted)throw e;
  throw new Error('Kannada translation could not start. Check your connection and try again.');
 }finally{
  translator?.destroy();
 }
}

export type {Recognition};

export function createChatRecognition(){
 const browser=window as ChatBrowser;
 const SpeechRecognition=browser.SpeechRecognition??browser.webkitSpeechRecognition;
 if(!SpeechRecognition)throw new Error('Voice typing is available in supported desktop browsers such as Chrome.');
 const recognition=new SpeechRecognition();
 recognition.lang='en-IN';
 recognition.continuous=true;
 recognition.interimResults=false;
 return recognition;
}

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

export function createKannadaTranslation(){
 let ready:KannadaTranslator|undefined;
 let opening:AbortController|undefined;
 return {
  async translate(text:string,signal:AbortSignal,onProgress:(progress:number)=>void){
   const api=(window as ChatBrowser).Translator;
   if(!api)throw new Error('Open ERP Chat in a current desktop version of Chrome to translate to Kannada.');
   try{
    if(!ready){
     const start=new AbortController();
     opening=start;
     const cancel=()=>start.abort();
     const deadline=setTimeout(cancel,120_000);
     signal.addEventListener('abort',cancel,{once:true});
     try{
      // The first click can download language data. Keep the ready engine for
      // later messages and create a new one only after teardown.
      const created=await api.create({
       sourceLanguage:'en',
       targetLanguage:'kn',
       signal:start.signal,
       monitor(target){
        target.addEventListener('downloadprogress',event=>onProgress(Math.round((event as TranslationProgress).loaded*100)));
       }
      });
      if(signal.aborted||start.signal.aborted){created.destroy();throw new DOMException('Translation cancelled','AbortError');}
      ready=created;
     }finally{
      clearTimeout(deadline);
      signal.removeEventListener('abort',cancel);
      if(opening===start)opening=undefined;
     }
    }
    return (await ready.translate(text,{signal:AbortSignal.any([signal,AbortSignal.timeout(35_000)])})).trim();
   }catch(e){
    if(signal.aborted)throw e;
    ready?.destroy();ready=undefined;
    throw new Error('Kannada translation could not complete. Check your connection and try again.');
   }
  },
  destroy(){
   opening?.abort();
   ready?.destroy();ready=undefined;
  }
 };
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

<script lang="ts">
 import {onDestroy,tick} from 'svelte';
 import {afterNavigate} from '$app/navigation';
 import {Check,Copy,Languages,Mic,Square,X} from '@lucide/svelte';
 import {languagePanel,type LanguageRequest} from './languagePanel';
 import {languagePreferences,languagePreferenceNotice,saveLanguagePreferences} from './languagePreferences';
 import {createChatRecognition,languageNames,localLanguages,localNames,prepareTranslation,speechError,speechLanguages,translateText,type Language,type LocalLanguage,type Recognition} from './chatLanguage';

 const maximum=4000;
 const inputTypes=['text','search','tel'];
 let lastField:HTMLInputElement|HTMLTextAreaElement|undefined;
 
 let current:LanguageRequest|null=null;
 let mode=$state<'text'|'voice'>('text'),source=$state(''),result=$state(''),resultLang=$state<Language>('en');
 let status=$state(''),error=$state(''),copied=$state(false),phase=$state<'idle'|'recording'|'finishing'|'translating'>('idle');
 let operation:AbortController|undefined,recognition:Recognition|undefined,deadline:ReturnType<typeof setTimeout>|undefined;
 let translatedSource=$state('');
 const busy=$derived(phase!=='idle');

 function captureField(event:FocusEvent){
  const element=event.target;
  if(!(element instanceof HTMLInputElement||element instanceof HTMLTextAreaElement))return;
  if(element.closest('.erp-language,.erp-chat-root,.erp-login')||element.disabled||element.readOnly)return;
  if(element instanceof HTMLInputElement&&!inputTypes.includes(element.type))return;
  if(element.autocomplete.match(/password|one-time-code/i))return;
  lastField=element;
 }
 function workspaceRequest(mode:'text'|'voice'):LanguageRequest{
  const field=lastField?.isConnected?lastField:undefined;
  const active=document.activeElement;
  const selection=window.getSelection();
  let chosen=(selection?.toString()??'').trim();
  let apply:LanguageRequest['apply'];
  if(field&&active===field){
   const start=field.selectionStart??field.value.length,end=field.selectionEnd??start;
   const original=field.value;
   chosen=original.slice(start,end)||chosen;
   apply=value=>{
    if(!field.isConnected||field.disabled||field.readOnly||field.value!==original)return false;
    const length=original.length-(end-start)+value.length;
    if(field.maxLength>=0&&length>field.maxLength)return false;
    field.setRangeText(value,start,end,'end');
    field.dispatchEvent(new Event('input',{bubbles:true}));
    void tick().then(()=>field.focus({preventScroll:true}));
    return true;
   };
  }
  return {mode,text:chosen.slice(0,maximum),apply};
 }
 function openWorkspace(){
  languagePanel.set(workspaceRequest('text'));
 }
 function shortcut(event:KeyboardEvent){
  if(event.altKey&&event.shiftKey&&event.code==='KeyL'&&!$languagePanel){
   event.preventDefault();
   openWorkspace();
  }
 }
 function stopWork(){
  clearTimeout(deadline);
  const active=recognition;
  recognition=undefined;operation?.abort();operation=undefined;phase='idle';
  if(active)active.abort();
 }
 function close(){
  stopWork();
  languagePanel.set(null);
 }
 function show(node:HTMLDialogElement){
  node.showModal();
  return {destroy(){node.close();}};
 }
 $effect(()=>{
  const request=$languagePanel;
  if(request===current)return;
  current=request;
  stopWork();
  if(request){
   mode=request.mode;source=request.text;result='';error='';status='';copied=false;translatedSource='';
  }
 });
 afterNavigate(({from,to})=>{
  if(from?.url.pathname===to?.url.pathname)return;
  lastField=undefined;
  if(current)close();
 });
 onDestroy(stopWork);

 function changeMode(next:'text'|'voice'){
  stopWork();mode=next;source=next==='text'?current?.text??'':'';result='';status='';error='';copied=false;translatedSource='';
 }
 const errorText=(value:unknown)=>value instanceof Error?value.message:'Please try again.';
 function progress(task:AbortController,value:number){
  if(operation===task)status=value<100?'Preparing the language pack · '+value+'%':'Translating…';
 }
 async function convert(from:Language,to:Language,task=new AbortController()){
  const text=source.trim();
  if(!text)return;
  operation=task;phase='translating';status='Translating…';error='';result='';copied=false;
  try{
   const output=await translateText(text,from,to,task.signal,value=>progress(task,value));
   if(operation!==task||task.signal.aborted)return;
   if(!output)throw new Error('The translation was empty. Try again.');
   result=output;resultLang=to;translatedSource=text;status='';
  }catch(problem){
   if(operation===task){error=errorText(problem);status='';}
  }finally{
   if(operation===task){phase='idle';operation=undefined;}
  }
 }
 function record(){
  if(busy)return;
  const language=$languagePreferences.speech;
  error='';result='';copied=false;source='';translatedSource='';
  let mic:Recognition;
  try{mic=createChatRecognition(language);}
  catch(problem){error=errorText(problem);return;}
  const task=new AbortController();
  operation=task;recognition=mic;phase='recording';status='Listening in '+languageNames[language]+'…';
  // Starting the translator while this click is active lets the language pack
  // download while the user speaks. Recognition proceeds independently.
  if(language!=='en')void prepareTranslation(language,'en').catch(()=>{});
  let failure='';
  mic.onresult=event=>{
   if(recognition!==mic||task.signal.aborted)return;
   const words:string[]=[];
   for(let i=event.resultIndex;i<event.results.length;i++){
    const part=event.results[i];
    if(part.isFinal)words.push(part[0].transcript.trim());
   }
   if(words.length)source=[source,words.join(' ')].filter(Boolean).join(' ').slice(0,maximum);
   if(source.length>=maximum)stopRecording();
  };
  mic.onerror=event=>{
   if(recognition===mic&&event.error!=='aborted')failure=speechError(event.error,language);
  };
  mic.onend=()=>{
   if(recognition!==mic||task.signal.aborted)return;
   clearTimeout(deadline);
   recognition=undefined;phase='idle';status='';
   if(source.trim()){void convert(language,'en',task);}
   else{operation=undefined;error=failure||'No speech was detected. Try again.';}
  };
  try{
   mic.start();
   deadline=setTimeout(stopRecording,60000);
  }catch(problem){
   stopWork();status='';error=errorText(problem);
  }
 }
 function stopRecording(){
  if(!recognition||phase!=='recording')return;
  phase='finishing';status='Finishing speech recognition…';
  const mic=recognition,task=operation,language=$languagePreferences.speech;
  clearTimeout(deadline);
  deadline=setTimeout(()=>{
   if(recognition!==mic)return;
   recognition=undefined;mic.abort();phase='idle';status='';
   if(source.trim()&&task){void convert(language,'en',task);}
   else{operation=undefined;error='No speech was detected. Try again.';}
  },12000);
  try{mic.stop();}
  catch{stopWork();status='';error='Could not finish recording. Try again.';}
 }
 async function copy(){
  try{await navigator.clipboard.writeText(result);copied=true;}
  catch{error='Copy the result using your browser’s text selection.';}
 }
 function apply(){
  if(current?.apply?.(result)){close();return;}
  error='The field changed or the result is too long. You can copy the text.';
 }
 function targetChanged(value:string){
  saveLanguagePreferences({translation:value as LocalLanguage});
  result='';copied=false;
 }
 function speechChanged(value:string){
  saveLanguagePreferences({speech:value as Language});
  source='';result='';copied=false;error='';
 }
</script>

<svelte:window onfocusin={captureField} onkeydown={shortcut}/>

<div class="erp-language">
 <button class="language-launch" type="button" title="Language tools (Alt+Shift+L)" aria-label="Open language tools" aria-keyshortcuts="Alt+Shift+L"
  onmousedown={event=>event.preventDefault()} onclick={openWorkspace}><Languages size={19}/><span>Language</span></button>

 {#if $languagePanel}
 <dialog class="language-dialog" use:show aria-labelledby="erp-language-title" oncancel={event=>{event.preventDefault();close();}}>
  <header><div><Languages size={20}/><h2 id="erp-language-title">Language tools</h2></div><button type="button" class="language-icon" aria-label="Close language tools" onclick={close}><X size={20}/></button></header>
  <div class="language-body">
   <div class="language-segment" aria-label="Language mode">
    <button type="button" aria-pressed={mode==='text'} onclick={()=>changeMode('text')}>Translate text</button>
    <button type="button" aria-pressed={mode==='voice'} onclick={()=>changeMode('voice')}>Voice to English</button>
   </div>
   {#if mode==='text'}
    <div class="language-direction">
     <span>English</span><span aria-hidden="true">→</span>
     <label class="language-picker"><span>Translate to</span>
      <select aria-label="Translation language" value={$languagePreferences.translation} disabled={busy} onchange={event=>targetChanged(event.currentTarget.value)}>
       {#each localLanguages as language}<option value={language}>{languageNames[language]} · {localNames[language]}</option>{/each}
      </select>
     </label>
    </div>
    <label class="language-field">English text<textarea rows="4" bind:value={source} maxlength={maximum} readonly={busy} placeholder="Enter, paste, or select English text in the ERP"></textarea></label>
    <button type="button" class="language-primary" disabled={busy||!source.trim()} onclick={()=>convert('en',$languagePreferences.translation)}>Translate</button>
   {:else}
    <div class="language-direction">
     <label class="language-picker"><span>Speak in</span>
      <select aria-label="Speech language" value={$languagePreferences.speech} disabled={busy} onchange={event=>speechChanged(event.currentTarget.value)}>
       {#each speechLanguages as language}<option value={language}>{languageNames[language]}{language==='en'?'':' · '+localNames[language]}</option>{/each}
      </select>
     </label><span aria-hidden="true">→</span><span>English</span>
    </div>
    <p class="language-note">Your browser handles speech recognition. It may use its online speech service.</p>
    <div class="language-voice">
     {#if phase==='recording'}<button type="button" class="language-primary recording" onclick={stopRecording}><Square size={16}/>Stop recording</button>
     {:else}<button type="button" class="language-primary" disabled={busy} onclick={record}><Mic size={17}/>Start speaking</button>{/if}
    </div>
    <label class="language-field">Transcript<textarea rows="2" bind:value={source} maxlength={maximum} readonly={busy} lang={$languagePreferences.speech} placeholder="Your words appear here. You can also type or paste."></textarea></label>
    {#if !busy&&source.trim()&&translatedSource!==source.trim()}
     <button type="button" class="language-secondary" onclick={()=>convert($languagePreferences.speech,'en')}>Convert transcript</button>
    {/if}
   {/if}
   {#if status}<p class="language-note" role="status">{status}</p>{/if}
   {#if error}<p class="language-error" role="alert">{error}</p>{/if}
   {#if $languagePreferenceNotice}<p class="language-note" role="status">{$languagePreferenceNotice}</p>{/if}
   {#if result&&translatedSource===source.trim()}
    <label class="language-field">{languageNames[resultLang]} result<textarea rows="3" readonly value={result} lang={resultLang}></textarea></label>
    <div class="language-result-actions">
     <button type="button" class="language-secondary" onclick={copy}>{#if copied}<Check size={17}/>Copied{:else}<Copy size={17}/>Copy{/if}</button>
     {#if $languagePanel.apply}<button type="button" class="language-primary" onclick={apply}>{resultLang==='en'?'Use English text':'Insert translation'}</button>{/if}
    </div>
   {/if}
  </div>
 </dialog>
 {/if}
</div>

<style>
 .erp-language{--ink:#192f44;--muted:#52677a;--line:#dce5ec;--teal:#08736c;--navy:#14283b}
 .language-launch{position:fixed;z-index:941;right:20px;bottom:78px;display:flex;align-items:center;gap:7px;padding:8px 12px;min-height:40px;background:#fff;color:var(--ink);border:1px solid #cad8e2;border-radius:10px;box-shadow:0 4px 12px #14283b24;font-size:13px;font-weight:700;cursor:pointer}
 :global(body:has(.erp-chat-root:not([hidden]) .chat-window)) .language-launch{display:none}
 .language-dialog{position:fixed;inset:0;margin:auto;width:min(520px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;border:1px solid var(--line);border-radius:15px;padding:0;background:#fff;color:var(--ink);box-shadow:0 20px 60px #14283b40;text-align:left}
 .language-dialog::backdrop{background:#14283b66}
 header,header>div{display:flex;align-items:center;gap:9px}
 header{justify-content:space-between;background:var(--navy);color:white;padding:12px 16px}
 h2{font:700 16px/1.35 system-ui;margin:0;color:inherit}
 .language-icon{display:grid;place-items:center;width:34px;height:34px;background:transparent;color:inherit;border:0;border-radius:7px;cursor:pointer}
 .language-icon:hover{background:#ffffff22}
 .language-body{display:grid;gap:12px;padding:16px;font:14px/1.45 system-ui}
 .language-segment{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#eff4f7;border-radius:8px;padding:4px}
 .language-segment button{min-height:38px;border:1px solid transparent;border-radius:6px;background:none;color:var(--ink);font:inherit;font-weight:700;cursor:pointer}
 .language-segment [aria-pressed=true]{background:white;border-color:#d2e0e8;color:#075f58}
 .language-direction{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
 .language-direction>span{font-weight:700}
 .language-picker{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 .language-picker select,.language-field textarea{border:1px solid #cbd8e2;border-radius:8px;background:#f8fafb;color:var(--ink);font:inherit;padding:8px 10px;min-width:0}
 .language-picker select{min-height:40px}
 .language-field{display:grid;gap:5px;font-weight:700}
 .language-field textarea{width:100%;font-weight:400;resize:vertical}
 .language-primary,.language-secondary{display:inline-flex;align-items:center;justify-content:center;gap:6px;justify-self:start;min-height:40px;padding:7px 13px;border-radius:8px;font:inherit;font-weight:700;cursor:pointer}
 .language-primary{background:var(--teal);border:1px solid var(--teal);color:white}
 .language-secondary{background:white;border:1px solid #cbd8e2;color:var(--ink)}
 .language-primary.recording{background:#a22339;border-color:#a22339}
 .language-primary:disabled,.language-secondary:disabled{opacity:.55;cursor:default}
 .language-note,.language-error{margin:0;color:var(--muted);font-size:13px}
 .language-error{color:#97253b}
 .language-result-actions{display:flex;gap:8px;flex-wrap:wrap}
 @media(max-width:610px){.language-launch{right:12px;bottom:70px}.language-field textarea,.language-picker select{font-size:16px}}
</style>

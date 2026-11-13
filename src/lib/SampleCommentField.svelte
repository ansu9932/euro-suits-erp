<script lang="ts">
 import {Check,LoaderCircle,Mic,Sparkles,Square} from '@lucide/svelte';
 import {onMount,tick} from 'svelte';
 import {csrf} from './api';
 import {startDictationMeter} from './dictationMeter';
 import {enter} from './motion';

 let {value=$bindable(),dictating=$bindable(false),label,hint='',required=false,disabled=false,indentId,action,stage='',updateId,requestId,companyId,buyerId,maxLength=2000,placeholder=''}:{
  value?:string;dictating?:boolean;label:string;hint?:string;required?:boolean;disabled?:boolean;
  indentId?:number;action:string;stage?:string;updateId?:number;
  requestId?:number;companyId?:number;buyerId?:number;maxLength?:number;placeholder?:string;
 }=$props();
 const id=$props.id();
 const utf8=new TextEncoder();
 const maxAudioBytes=3*1024*1024;
 const recordingLimitMs=30_000;
 const types=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'];
 type Phase='idle'|'starting'|'recording'|'transcribing';
 type Recording={
  request:AbortController;
  stream?:MediaStream;
  recorder?:MediaRecorder;
  timer?:ReturnType<typeof setTimeout>;
  stopMeter?:()=>void;
 };
 let enabled=$state(false);
 let phase=$state<Phase>('idle');
 let message=$state('');
 let failed=$state(false);
 let insertedCount=$state(0);
 let completed=$state(false);
 let elapsed=$state(0);
 let meter=$state<HTMLSpanElement>();
 const bars=[0,1,2,3,4,5,6];
 const elapsedLabel=$derived('00:'+String(elapsed).padStart(2,'0'));
 let textarea:HTMLTextAreaElement;
 let stopButton=$state<HTMLButtonElement>();
 let cancelButton=$state<HTMLButtonElement>();
 let active:Recording|undefined;

 const endpoint=$derived.by(()=>{
  const params=new URLSearchParams({action});
  if(action==='special_remark'){
   if(!companyId||!buyerId)return '';
   params.set('company_id',String(companyId));
   params.set('buyer_id',String(buyerId));
   if(requestId)params.set('request_id',String(requestId));
  }else{
   if(!indentId)return '';
   params.set('indent_id',String(indentId));
   if(stage)params.set('stage',stage);
   if(updateId)params.set('update_id',String(updateId));
  }
  return '/api/sample-dictation?'+params.toString();
 });

 onMount(()=>{
  const endRecording=()=>{if(active)finish('Dictation cancelled.')};
  window.addEventListener('pagehide',endRecording);
  return ()=>window.removeEventListener('pagehide',endRecording);
 });

 $effect(()=>{
  const url=endpoint;
  enabled=false;
  message='';
  failed=false;
  completed=false;
  if(!url)return;
  const probe=new AbortController();
  fetch(url,{credentials:'same-origin',cache:'no-store',signal:probe.signal})
   .then(response=>response.ok?response.json():null)
   .then(data=>{if(!probe.signal.aborted)enabled=data?.enabled===true})
   .catch(()=>{});
  return ()=>{
   probe.abort();
   reset();
  };
 });

 function release(recording:Recording){
  clearTimeout(recording.timer);
  recording.stopMeter?.();
  recording.stopMeter=undefined;
  if(recording.recorder){
   recording.recorder.ondataavailable=null;
   recording.recorder.onstop=null;
   recording.recorder.onerror=null;
   try{if(recording.recorder.state!=='inactive')recording.recorder.stop()}catch{/* The stream may already have ended. */}
  }
  recording.stream?.getTracks().forEach(track=>track.stop());
  recording.stream=undefined;
  recording.recorder=undefined;
 }

 function reset(){
  if(active){
   active.request.abort();
   release(active);
   active=undefined;
  }
  phase='idle';
  dictating=false;
 }

 function finish(text:string,isError=false){
  reset();
  message=text;
  failed=isError;
  completed=false;
 }

 async function start(){
  if(!enabled||!endpoint||disabled||active)return;
  if(utf8.encode(value).length>=maxLength){
   finish('The comment is full. Shorten it to add dictation.',true);
   return;
  }
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
   finish('This browser cannot record here. You can still type your comment.',true);
   return;
  }
  const recording:Recording={request:new AbortController()};
  const url=endpoint;
  active=recording;
  dictating=true;
  phase='starting';
  completed=false;
  elapsed=0;
  message='Allow microphone access when your browser asks.';
  failed=false;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   if(active!==recording){
    stream.getTracks().forEach(track=>track.stop());
    return;
   }
   recording.stream=stream;
   const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
   const recorder=new MediaRecorder(stream,{mimeType,audioBitsPerSecond:64_000});
   recording.recorder=recorder;
   const chunks:Blob[]=[];
   let size=0;
   recorder.ondataavailable=({data})=>{
    if(active!==recording||!data.size)return;
    size+=data.size;
    if(size>maxAudioBytes){
     finish('The recording is too large. Try a shorter comment.',true);
     return;
    }
    chunks.push(data);
   };
   recorder.onerror=()=>{
    if(active===recording)finish('Recording stopped unexpectedly. Try again or type your comment.',true);
   };
   recorder.onstop=()=>{
    if(active!==recording)return;
    const clip=new Blob(chunks,{type:chunks[0]?.type||recorder.mimeType});
    release(recording);
    void transcribe(recording,url,clip);
   };
   recorder.start(1000);
   phase='recording';
   message='Listening… Speak now.';
   recording.timer=setTimeout(stop,recordingLimitMs);
   await tick();
   if(active!==recording||phase!=='recording')return;
   if(document.activeElement===document.body||document.activeElement===cancelButton)stopButton?.focus();
   const started=performance.now();
   const tickTimer=setInterval(()=>{elapsed=Math.min(30,Math.floor((performance.now()-started)/1000))},250);
   const barNodes=Array.from(meter?.children??[]) as HTMLElement[];
   const stopMeter=startDictationMeter(stream,levels=>{
    barNodes.forEach((bar,index)=>bar.style.setProperty('--level',String(levels[index])));
   });
   recording.stopMeter=()=>{clearInterval(tickTimer);stopMeter()};

  }catch(error){
   if(active!==recording)return;
   const denied=error instanceof DOMException&&['NotAllowedError','SecurityError'].includes(error.name);
   finish(denied?'Microphone access was blocked. Allow it in your browser or type your comment.':'Could not start the microphone. Try again or type your comment.',true);
  }
 }

 async function stop(){
  const recording=active;
  if(!recording?.recorder||recording.recorder.state==='inactive')return;
  clearTimeout(recording.timer);
  recording.stopMeter?.();
  recording.stopMeter=undefined;
  phase='transcribing';
  message='Preparing your recording…';
  try{recording.recorder.stop()}catch{
   finish('Could not finish recording. Try again or type your comment.',true);
   return;
  }
  recording.timer=setTimeout(()=>{
   if(active===recording)finish('Could not finish recording. Try again or type your comment.',true);
  },3000);
  await tick();
  if(active===recording&&document.activeElement===document.body)textarea?.focus();
 }

 async function transcribe(recording:Recording,url:string,clip:Blob){
  if(!clip.size||!clip.type.startsWith('audio/')){
   finish('No usable audio was recorded. Try again or type your comment.',true);
   return;
  }
  phase='transcribing';
  message='Transcribing…';
  recording.timer=setTimeout(()=>{
   if(active===recording)finish('Transcription timed out. Try again or type your comment.',true);
  },32_000);
  try{
   const response=await fetch(url,{
    method:'POST',credentials:'same-origin',cache:'no-store',signal:recording.request.signal,
    headers:{'Content-Type':clip.type,'X-CSRF-Token':csrf,'Idempotency-Key':crypto.randomUUID()},
    body:clip,
   });
   if(active!==recording)return;
   if(response.status===401){
    finish('Your session expired. Sign in to use dictation.',true);
    window.dispatchEvent(new Event('erp:session-expired'));
    return;
   }
   const data=await response.json().catch(()=>null);
   if(active!==recording)return;
   if(!response.ok){
    const error=typeof data?.error==='string'?data.error:'Could not transcribe the recording. Try again or type your comment.';
    finish(error,true);
    return;
   }
   const transcript=typeof data?.text==='string'?data.text.trim():'';
   if(!transcript){
    finish('No speech was detected. Try again or type your comment.',true);
    return;
   }
   const separator=value&&!/\s$/.test(value)?' ':'';
   // Workflow comments are limited by UTF-8 bytes, including pre-existing text.
   let remaining=maxLength-utf8.encode((value??'')+separator).length;
   let inserted='';
   for(const char of transcript){
    remaining-=utf8.encode(char).length;
    if(remaining<0)break;
    inserted+=char;
   }
   if(!inserted){
    finish('The comment is full. Shorten it to add dictation.',true);
    return;
   }
   value=(value??'')+separator+inserted;
   finish(inserted===transcript?'Text added. Review it before saving.':'Text added up to the comment limit. Review it before saving.');
   completed=true;
   insertedCount++;
  }catch{
   if(active===recording)finish('Could not transcribe the recording. Try again or type your comment.',true);
  }
 }

 async function cancel(){
  finish('Dictation cancelled.');
  await tick();
  textarea?.focus();
 }
</script>

<div class="sample-comment" data-phase={phase}>
 <div class="sample-comment__heading">
  <label for={id}>{label}{#if required} <b aria-hidden="true">*</b>{/if}{#if hint} <small>{hint}</small>{/if}</label>
  {#if enabled}
   <div class="sample-comment__actions">
    {#if phase==='idle'}
     {#if completed}<span class="sample-comment__pill sample-comment__done" aria-hidden="true" use:enter><Check size={15}/>Transcribed</span>{/if}
     <button type="button" class="sample-comment__dictate" onclick={start} {disabled}><Mic size={15} aria-hidden="true"/>Dictate</button>
    {:else}
     {#if phase==='recording'}
      <div class="sample-comment__pill sample-comment__recording" use:enter>
       <span class="sample-comment__dot" aria-hidden="true"></span>
       <span class="sample-comment__meter" aria-hidden="true" bind:this={meter}>
        {#each bars as bar (bar)}<span></span>{/each}
       </span>
       <span class="sample-comment__time" aria-hidden="true">{elapsedLabel}</span>
       <button type="button" class="sample-comment__stop" bind:this={stopButton} onclick={stop}><Square size={12} aria-hidden="true"/>Stop</button>
      </div>
     {:else}
      <span class="sample-comment__pill sample-comment__processing" aria-hidden="true" use:enter>
       <span class="sample-comment__orbit"><LoaderCircle size={17}/>{#if phase==='transcribing'}<Sparkles size={9}/>{/if}</span>
       {phase==='starting'?'Microphone access':'Transforming to text…'}
      </span>
     {/if}
     <button type="button" class="sample-comment__cancel" bind:this={cancelButton} onclick={cancel}>Cancel dictation</button>
    {/if}
   </div>
  {/if}
 </div>
 <div class="sample-comment__input">
  <textarea {id} bind:this={textarea} bind:value rows="3" maxlength={maxLength} {required} placeholder={placeholder||(enabled?'Type or dictate '+label.toLowerCase()+'…':'')} aria-describedby={enabled?id+'-dictation':undefined}></textarea>
  {#if phase==='transcribing'}
   <div class="sample-comment__conversion" class:sample-comment__conversion--empty={!value} aria-hidden="true">
    {#if !value}<span>Converting speech to text…</span>{/if}
   </div>
  {:else if completed}
   {#key insertedCount}<span class="sample-comment__arrival" aria-hidden="true"></span>{/key}
  {/if}
 </div>
 {#if enabled}
  <p id={id+'-dictation'} class:sample-comment__feedback--error={failed} class="sample-comment__feedback" role="status">{message||'Ready for voice or keyboard input'}</p>
 {/if}
</div>

<style>
 .sample-comment{display:grid;gap:10px;min-width:0}
 .sample-comment__heading,.sample-comment__actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
 .sample-comment__heading{justify-content:space-between}
 .sample-comment label{font-size:13px;font-weight:650;color:#405166}
 .sample-comment label b{color:#a12435}
 .sample-comment small{font-size:12px;font-weight:550}
 .sample-comment textarea{
  --ui-field:#fff;
  --ui-border:#d4dde6;
  display:block;width:100%;min-width:0;min-height:92px;margin:0;padding:11px 13px;box-sizing:border-box;
  border:1px solid #d4dde6;border-radius:12px;background:#fff;color:#172536;font:inherit;font-weight:500;
  line-height:1.55;resize:vertical;transition:border-color .24s,box-shadow .24s,background-color .24s
 }
 .sample-comment textarea::placeholder{color:#627188}
 .sample-comment__actions button{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:5px 11px;
  border:1px solid #b2ded6;border-radius:12px;background:#f2faf8;color:#075e54;
  font-size:12px;font-weight:700;cursor:pointer;transition:background-color .2s,transform .2s
 }
 .sample-comment__actions button:hover:enabled{background:#e2f4ef}
 .sample-comment__actions button:active:enabled{transform:scale(.97)}
 .sample-comment__actions button:focus-visible{outline:2px solid #08746f;outline-offset:2px}
 .sample-comment textarea:focus-visible{outline:2px solid #08746f;outline-offset:2px}
 .sample-comment__actions button:disabled{cursor:default;opacity:.6}
 .sample-comment__pill{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 11px;border:1px solid;border-radius:12px;font-size:12px;font-weight:700}
 .sample-comment__recording{padding:3px 4px 3px 10px;color:#9a1e3a;background:#fff1f3;border-color:#f3b9c5}
 .sample-comment__actions .sample-comment__stop{padding:0 9px;background:#aa153c;border-color:#aa153c;color:#fff}
 .sample-comment__actions .sample-comment__stop:hover:enabled{background:#891332}
 .sample-comment__dot{width:9px;height:9px;border-radius:50%;background:#ce244c;animation:dictation-dot 1.6s ease-in-out infinite}
 .sample-comment__meter{display:flex;align-items:center;gap:3px;height:19px}
 .sample-comment__meter span{width:3px;height:100%;border-radius:3px;background:#ce244c;transform:scaleY(var(--level,.22));transition:transform 80ms ease-out}
 .sample-comment__time{min-width:36px;font:700 12px ui-monospace,monospace;font-variant-numeric:tabular-nums}
 .sample-comment__processing{color:#075e54;background:#edf8f5;border-color:#9ddbd1}
 .sample-comment__orbit{display:grid;place-items:center;width:17px;height:17px}
 .sample-comment__orbit :global(svg){grid-area:1/1}
 .sample-comment[data-phase='transcribing'] .sample-comment__orbit :global(svg:first-child){animation:dictation-spin 1s linear infinite}
 .sample-comment__done{color:#145f45;background:#edf8f2;border-color:#badcca}
 .sample-comment__input{position:relative}
 .sample-comment[data-phase='recording'] textarea:not([aria-invalid='true']){
  --ui-border:#c44965;--ui-focus:#c44965;--ui-focus-shadow:0 0 0 3px #f8dbe3;
  border-color:var(--ui-border);box-shadow:var(--ui-focus-shadow)
 }
 .sample-comment[data-phase='transcribing'] textarea:not([aria-invalid='true']){
  --ui-field:#f4fbf9;--ui-border:#278d80;--ui-focus:#278d80;--ui-focus-shadow:0 0 0 3px #d9efea;
  border-color:var(--ui-border);background:var(--ui-field);box-shadow:var(--ui-focus-shadow)
 }
 .sample-comment__arrival{
  position:absolute;inset:1px;border-radius:11px;background:#8ed3c154;opacity:0;
  pointer-events:none;animation:dictation-arrival .4s ease-out
 }
 .sample-comment__conversion{
  position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;isolation:isolate;
  pointer-events:none;border-radius:12px
 }
 .sample-comment__conversion--empty{background:#f8fcfb80;backdrop-filter:blur(2px)}
 .sample-comment__conversion::before{
  content:'';position:absolute;inset:0 auto 0 0;width:48%;z-index:-1;
  background:linear-gradient(90deg,transparent,#a8e4d944,transparent);
  animation:dictation-sweep 1.15s ease-in-out infinite
 }
 .sample-comment__conversion span{
  padding:5px 12px;border:1px solid #b2ded6;border-radius:99px;background:#fff;
  color:#075e54;font-size:12px;font-weight:650
 }
 .sample-comment__actions .sample-comment__cancel{border-color:#d4dde6;background:#fff;color:#32475b}
 .sample-comment__actions .sample-comment__cancel:hover:enabled{background:#f1f5f8}
 .sample-comment__feedback{margin:0;color:#4e6176;font-size:12px;font-weight:550}
 .sample-comment[data-phase='recording'] .sample-comment__feedback,.sample-comment__feedback--error{color:#9a1e3a}
 .sample-comment[data-phase='transcribing'] .sample-comment__feedback{color:#075e54}
 @keyframes dictation-arrival{from{opacity:1}to{opacity:0}}
 @keyframes dictation-dot{50%{opacity:.58;transform:scale(.84)}}
 @keyframes dictation-spin{to{transform:rotate(360deg)}}
 @keyframes dictation-sweep{from{transform:translateX(-100%)}to{transform:translateX(310%)}}
 @media (prefers-reduced-motion: reduce){
  .sample-comment *,.sample-comment__conversion::before,
  .sample-comment[data-phase='transcribing'] .sample-comment__orbit :global(svg:first-child){animation:none;transition:none}
 }
</style>

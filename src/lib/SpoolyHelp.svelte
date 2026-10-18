<script lang="ts">
 import {onDestroy,onMount,tick} from 'svelte';
 import {X,ArrowLeft,ArrowUpRight,Search,Languages,MessageCircle,LoaderCircle} from '@lucide/svelte';
 import {api} from './api';
 import {enter} from './motion';
 import {findHelp,type HelpGuide,type HelpContext,type HelpReply} from './spoolyHelp';
 let {context='',onclose}:{context?:string;onclose:()=>void}=$props();
 let panel=$state<HTMLElement>();
 let search=$state<HTMLInputElement>();
 let loading=$state(true),busy=$state(false),query=$state(''),language=$state('en'),error=$state('');
 let data=$state<HelpContext|null>(null),selected=$state<HelpGuide|null>(null),reply=$state<HelpReply|null>(null);
 let generation=0,alive=true;
 const guides=$derived(findHelp(data?.guides||[],query,context));
 function bodyPortal(node:HTMLElement){document.body.append(node);return{destroy(){node.remove()}};}
 async function load(){
  const ticket=++generation;loading=true;error='';data=null;
  try{const result=await api('/assistant/context');if(alive&&ticket===generation)data=result;}
  catch(e){if(alive&&ticket===generation)error=(e as Error).message;}
  finally{if(alive&&ticket===generation){loading=false;await tick();search?.focus({preventScroll:true});}}
 }
 async function choose(guide:HelpGuide){generation++;busy=false;selected=guide;reply=null;error='';await tick();panel?.querySelector<HTMLElement>('.spooly-guide-title')?.focus({preventScroll:true});}
 async function back(){generation++;busy=false;selected=null;reply=null;error='';await tick();search?.focus({preventScroll:true});}
 async function explain(){
  if(busy||!selected||!data?.ai_available)return;
  const ticket=++generation;const topic=selected.id;busy=true;error='';reply=null;
  try{const result=await api('/assistant/explain',{topic,language});if(alive&&ticket===generation&&selected?.id===topic)reply=result;}
  catch(e){if(alive&&ticket===generation)error=(e as Error).message;}
  finally{if(alive&&ticket===generation)busy=false;}
 }
 function keydown(event:KeyboardEvent){if(event.key==='Escape'&&panel?.contains(document.activeElement)){event.preventDefault();event.stopPropagation();onclose();}}
 onMount(()=>{load();document.addEventListener('keydown',keydown);return()=>document.removeEventListener('keydown',keydown)});
 onDestroy(()=>{alive=false;generation++});
</script>

<aside class="spooly-help" aria-labelledby="spooly-help-title" bind:this={panel} use:bodyPortal use:enter>
 <header class="spooly-help-heading">
  <div><h2 id="spooly-help-title"><MessageCircle size={19}/>Spooly</h2><p>Your ERP task guide</p></div>
  <button type="button" class="spooly-icon" aria-label="Close Spooly help" onclick={onclose}><X size={19}/></button>
 </header>
 <div class="spooly-help-content">
  {#if loading}<p class="spooly-feedback" role="status">Finding your permitted guides…</p>
  {:else if !data}
   <p class="spooly-error" role="alert">{error||'Help could not load.'}</p><button type="button" class="spooly-primary" onclick={load}>Retry help</button>
  {:else if selected}
   <button type="button" class="spooly-back" onclick={back}><ArrowLeft size={16}/>All guides</button>
   <h3 class="spooly-guide-title" tabindex="-1">{selected.title}</h3>
   <ol class="spooly-steps">{#each selected.steps as step}<li>{step}</li>{/each}</ol>
   {#if selected.url}<a class="spooly-workspace-link" href={selected.url} target="_blank" rel="noopener">Open workspace in new tab<ArrowUpRight size={15}/></a>{/if}
   <section class="spooly-explain" aria-label="AI explanation">
    {#if data.ai_available}
     <div class="spooly-explain-controls">
      <label><span><Languages size={15}/>Explain in</span><select bind:value={language} disabled={busy} onchange={()=>{reply=null;error=''}}><option value="en">English</option><option value="hi">हिन्दी</option><option value="kn">ಕನ್ನಡ</option><option value="bn">বাংলা</option></select></label>
      <button type="button" class="spooly-primary" disabled={busy} onclick={explain}>{#if busy}<LoaderCircle size={16}/>Explaining…{:else}Explain with AI{/if}</button>
     </div>
    {:else}<p class="spooly-feedback">AI is not connected yet. These ERP guides are ready to use.</p>{/if}
    {#if error}<p class="spooly-error" role="alert">{error}</p>{/if}
    {#if reply}<div class="spooly-answer" aria-live="polite"><p class="spooly-feedback">{reply.notice}</p>{#if reply.explanation}<p class="spooly-answer-text">{reply.explanation}</p>{/if}</div>{/if}
   </section>
  {:else}
   <label class="spooly-search-label" for="spooly-help-search">What are you working on?</label>
   <div class="spooly-search"><Search size={17}/><input id="spooly-help-search" bind:this={search} bind:value={query} maxlength="160" placeholder="Try invoice, bank advice or documents" autocomplete="off"/></div>
   <p class="spooly-feedback">Choose a guide. Search stays in your browser.</p>
   <div class="spooly-topic-list">{#each guides as guide}<button type="button" onclick={()=>choose(guide)}><span>{guide.title}</span><ArrowUpRight size={16}/></button>{:else}<p class="spooly-feedback">No matching guide in your access. Try a shorter topic, such as “save” or “invoice”.</p>{/each}</div>
  {/if}
 </div>
 <footer class="spooly-help-footer">{data?.ai_available?'Google Gemini · limited free usage':'Verified ERP guidance'}<span>Only guide text goes to AI. Your records stay in the ERP.</span></footer>
</aside>

<style>
 .spooly-help{position:fixed;right:20px;bottom:20px;z-index:10000;width:min(420px,calc(100vw - 40px));max-height:min(700px,calc(100dvh - 40px));display:flex;flex-direction:column;background:#fff;color:#172f43;border-radius:14px;box-shadow:0 14px 42px rgb(14 37 55 / .22);font:400 14px/1.55 'DM Sans',sans-serif;overflow:hidden;text-align:left;isolation:isolate}
 .spooly-help :global(*){box-sizing:border-box}.spooly-help :global(::selection){background:#bce8e2;color:#123346}.spooly-help :global(:focus-visible){outline:3px solid #0b817b;outline-offset:3px}.spooly-help :global(button),.spooly-help :global(input),.spooly-help :global(select){font:inherit}.spooly-help :global(button){cursor:pointer}.spooly-help :global(button:disabled){cursor:wait;opacity:.65}.spooly-help-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:17px 20px;background:#142d40;color:#fff;flex:none}.spooly-help-heading h2{display:flex;align-items:center;gap:9px;margin:0;color:#fff;font-size:20px;font-weight:750}.spooly-help-heading p{margin:2px 0 0;color:#c9e3ec;font-size:12px}.spooly-icon{display:grid;place-items:center;width:36px;height:36px;border:1px solid #587387;background:#254559;color:#fff;border-radius:7px}.spooly-icon:hover{background:#34596e}.spooly-help-content{padding:20px;overflow:auto;overscroll-behavior:contain;scrollbar-color:#9cb8c5 #edf3f6;scrollbar-width:thin;min-height:120px}.spooly-search-label{display:block;font-weight:700;margin-bottom:8px}.spooly-search{display:flex;align-items:center;gap:8px;padding:0 10px;background:#edf4f8;border:1px solid #b7cbd7;border-radius:7px}.spooly-search input{width:100%;min-width:0;height:42px;border:0;background:transparent;color:#173449;caret-color:#087e78;outline:none}.spooly-search:focus-within{outline:2px solid #0b817b;outline-offset:2px}.spooly-search input::placeholder{color:#536b7b;font-size:12px}.spooly-feedback{color:#4a6373;font-size:12px;margin:10px 0;line-height:1.55}.spooly-topic-list{margin-top:16px;border-top:1px solid #dbe5eb}.spooly-topic-list button{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:46px;text-align:left;border:0;border-bottom:1px solid #dbe5eb;background:#fff;color:#1a3b50;padding:11px 2px;font-weight:650}.spooly-topic-list button:hover{background:#edf7f5;color:#086c66}.spooly-topic-list button :global(svg){flex:none}.spooly-back,.spooly-workspace-link{display:inline-flex;align-items:center;gap:6px;padding:5px 0;color:#087770;background:transparent;border:0;text-decoration:none;font-weight:650;font-size:12px}.spooly-back:hover,.spooly-workspace-link:hover{text-decoration:underline;text-underline-offset:3px}.spooly-guide-title{margin:12px 0 14px;font-size:20px;line-height:1.3;letter-spacing:-.02em;color:#173449}.spooly-steps{padding-left:21px;margin:0 0 16px}.spooly-steps li{padding-left:4px;margin-bottom:13px;overflow-wrap:anywhere}.spooly-steps li::marker{font-weight:750;color:#087770}.spooly-explain{border-top:1px solid #dbe5eb;margin-top:18px;padding-top:16px}.spooly-explain-controls{display:flex;align-items:flex-end;gap:10px}.spooly-explain-controls label{flex:1;min-width:0}.spooly-explain-controls label>span{display:flex;align-items:center;gap:6px;font-weight:650;font-size:12px;margin-bottom:6px}.spooly-explain-controls select{height:40px;width:100%;background:#edf4f8;border:1px solid #b7cbd7;border-radius:6px;padding:0 8px;color:#173449}.spooly-primary{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:8px 13px;background:#087e78;border:1px solid #087e78;border-radius:6px;color:#fff;font-weight:700;font-size:13px;white-space:nowrap}.spooly-primary:hover{background:#06635e}.spooly-error{color:#a12c32;font-size:13px;overflow-wrap:anywhere}.spooly-answer{margin-top:16px}.spooly-answer-text{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0 0}.spooly-help-footer{flex:none;padding:12px 20px;background:#edf5f4;color:#305b59;font-size:11px;font-weight:650}.spooly-help-footer span{display:block;font-weight:400;margin-top:2px}
</style>

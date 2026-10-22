<script lang="ts">
 import {onDestroy,tick} from 'svelte';
 import {Send,ArrowUpRight,RotateCcw} from '@lucide/svelte';
 import {api} from './api';
 import {enter} from './motion';
 import {chatHistory,type HelpContext,type HelpGuide,type ChatExchange,type ChatReply} from './spoolyHelp';
 let {data,onGuide}:{data:HelpContext;onGuide:(guide:HelpGuide)=>void}=$props();
 let question=$state(''),language=$state('en'),busy=$state(false),error=$state(''),pendingQuestion=$state('');
 let exchanges=$state<ChatExchange[]>([]),transcript=$state<HTMLDivElement>(),composer=$state<HTMLTextAreaElement>();
 let alive=true,generation=0;
 async function scroll(){await tick();if(alive&&transcript)transcript.scrollTop=transcript.scrollHeight}
 async function send(event:SubmitEvent){
  event.preventDefault();const text=question.trim();if(busy||!text||!data.chat_available)return;
  busy=true;error='';pendingQuestion=text;const ticket=++generation;await scroll();
  try{
   const reply:ChatReply=await api('/assistant/chat',{message:text,language,privacy:data.chat_privacy,history:chatHistory(exchanges)});
   if(!alive||generation!==ticket)return;
   exchanges=[...exchanges.slice(-9),{question:text,reply}];question='';
  }catch(e){if(alive&&generation===ticket)error=(e as Error).message;}
  finally{if(alive&&generation===ticket){busy=false;pendingQuestion='';await scroll();composer?.focus({preventScroll:true})}}
 }
 function clear(){if(busy)return;generation++;exchanges=[];question='';pendingQuestion='';error='';composer?.focus({preventScroll:true})}
 function suggest(text:string){question=text;composer?.focus({preventScroll:true})}
 onDestroy(()=>{alive=false;generation++});
</script>

<section class="spooly-chat" aria-label="Chat with Spooly">
 <div class="spooly-chat__tools"><label>Reply in<select aria-label="Reply language" bind:value={language} disabled={busy}><option value="en">English</option><option value="hi">हिन्दी</option><option value="kn">ಕನ್ನಡ</option><option value="bn">বাংলা</option></select></label><button type="button" class="spooly-chat__clear" disabled={busy||(!exchanges.length&&!question)} onclick={clear}><RotateCcw size={15}/>New chat</button></div>
 <div class="spooly-chat__availability">Free chat · Live Search / Maps unavailable</div>
 <!-- svelte-ignore a11y_no_noninteractive_tabindex (The scrollable conversation needs keyboard focus for reading older messages.) -->
 <div class="spooly-chat__transcript" bind:this={transcript} role="log" aria-label="Spooly conversation" aria-live="polite" aria-relevant="additions text" tabindex="0">
  {#if !exchanges.length&&!pendingQuestion}<div class="spooly-chat__welcome"><h3>Ask a question. Get a short answer.</h3><p>Ask about your ERP workflow or a general topic. You can ask follow-up questions too.</p><div class="spooly-chat__suggestions"><button type="button" onclick={()=>suggest('What is the difference between a sea port and an ICD?')}>Sea port vs ICD</button><button type="button" onclick={()=>suggest('How do I save a draft?')}>Saving a draft</button></div></div>{/if}
  {#each exchanges as exchange}<div class="spooly-chat__exchange" use:enter><div class="spooly-chat__question"><strong>You</strong><p>{exchange.question}</p></div><div class="spooly-chat__answer"><strong>Spooly{exchange.reply.kind==='answer'?' · AI answer':''}</strong><p>{exchange.reply.answer}</p>{#each exchange.reply.guides||[] as guide}<button type="button" class="spooly-chat__guide" onclick={()=>onGuide(guide)}>Guide: {guide.title}<ArrowUpRight size={14}/></button>{/each}</div></div>{/each}
  {#if pendingQuestion}<div class="spooly-chat__question"><strong>You</strong><p>{pendingQuestion}</p></div><p class="spooly-chat__status" role="status">Spooly is thinking…</p>{/if}
 </div>
 {#if error}<p class="spooly-chat__error" role="alert">{error} Your question is still below.</p>{/if}
 {#if !data.chat_available}<p class="spooly-chat__error" role="status">Chat is unavailable. You can still use the Guides tab.</p>{/if}
 <form class="spooly-chat__composer" onsubmit={send}>
  <label for="spooly-chat-question">Your question</label>
  <textarea id="spooly-chat-question" bind:this={composer} bind:value={question} maxlength="1000" rows="2" disabled={busy||!data.chat_available} placeholder="Ask a short question…" aria-describedby="spooly-chat-privacy"></textarea>
  <div class="spooly-chat__send"><small>{question.length}/1,000</small><button type="submit" disabled={busy||!question.trim()||!data.chat_available}><Send size={16}/>{busy?'Sending…':'Send'}</button></div>
  <p id="spooly-chat-privacy" class="spooly-chat__privacy ui-help">Send shares your question and recent chat with Google Gemini. Use public, non-confidential information only; no passwords, ERP records or personal details. Google’s free service may use messages to improve its products.</p>
 </form>
</section>

<style>
 .spooly-chat{display:flex;flex-direction:column;gap:10px;min-width:0;height:100%;min-height:0}
 .spooly-chat__tools{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
 .spooly-chat__tools label{display:grid;gap:4px;font-size:12px;font-weight:650;color:#243f51}
 .spooly-chat__tools select{min-height:44px;border:1px solid #b7cbd7;border-radius:6px;background:#edf4f8;color:#173449;padding:6px 10px}
 .spooly-chat__clear{display:flex;align-items:center;gap:6px;min-height:44px;padding:6px 8px;background:#fff;border:1px solid #c6d6df;border-radius:6px;color:#305369;font-size:12px}
 .spooly-chat__availability{font-size:11px;color:#76531c;background:#fff5df;padding:6px 9px;border-radius:5px;margin:0}
 .spooly-chat__transcript{overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#9cb8c5 #edf3f6;flex:1;min-height:80px;padding:3px;outline-offset:-3px}
 .spooly-chat__welcome h3{font-size:17px;line-height:1.4;margin:4px 0 8px;color:#173449}
 .spooly-chat__welcome p{font-size:13px;color:#4a6373;margin:0 0 10px}
 .spooly-chat__suggestions{display:flex;flex-wrap:wrap;gap:6px}
 .spooly-chat__suggestions button{min-height:44px;border:1px solid #bedbd5;background:#f0f8f5;color:#1b6053;border-radius:6px;padding:6px 9px;font-size:12px}
 .spooly-chat__exchange{margin-bottom:16px}
 .spooly-chat__question{margin:0 0 12px 22px;padding:9px 12px;background:#edf5f8;border-radius:8px;color:#203e52}
 .spooly-chat__answer{padding:0 0 12px;border-bottom:1px solid #dbe5eb}
 .spooly-chat__question strong,.spooly-chat__answer>strong{display:block;font-size:11px;color:#365c6f;margin-bottom:4px}
 .spooly-chat__question p,.spooly-chat__answer p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.6;margin:0;color:#173449}
 .spooly-chat__guide{display:flex;align-items:center;gap:6px;text-align:left;min-height:44px;background:transparent;border:0;padding:7px 0;color:#08716a;font-size:12px;font-weight:650}
 .spooly-chat__guide:hover{text-decoration:underline;text-underline-offset:3px}
 .spooly-chat__status{font-size:12px;color:#4a6373;margin:0 0 10px}
 .spooly-chat__composer{flex:none;display:grid;gap:6px;padding-top:10px;border-top:1px solid #dbe5eb}
 .spooly-chat__composer>label{font-size:13px;font-weight:650;color:#243f51}
 .spooly-chat__composer textarea{width:100%;min-height:64px;max-height:150px;resize:vertical;box-sizing:border-box;font:inherit;font-size:13px;color:#173449;background:#f3f7f9;border:1px solid #b7cbd7;border-radius:7px;padding:10px;caret-color:#087e78}
 .spooly-chat__composer textarea::placeholder{color:#536b7b}
 .spooly-chat__send{display:flex;align-items:center;justify-content:space-between;gap:12px}
 .spooly-chat__send small{font-size:11px;color:#526574;font-variant-numeric:tabular-nums}
 .spooly-chat__send button{display:flex;align-items:center;gap:7px;min-height:44px;border:0;border-radius:6px;padding:8px 15px;background:#087e78;color:#fff;font-weight:700}
 .spooly-chat__send button:hover:not(:disabled){background:#06635e}
 .spooly-chat__privacy{font-size:11px;line-height:1.5;color:#526574;margin:2px 0 0}
 .spooly-chat__error{font-size:12px;color:#a12c32;margin:0}
 .spooly-chat button:disabled{opacity:.65;cursor:default}
</style>

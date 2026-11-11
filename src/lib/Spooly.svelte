<script lang="ts">
 import {onMount, tick} from 'svelte';
 import SpoolyHelp from './SpoolyHelp.svelte';
 import {MessageCircle} from '@lucide/svelte';
 import {mascotGesture} from './motion';
 import {registerMascot, resolveMascotContext} from './mascot/garment-erp-mascot.js';

 let {userId, role='', portal='', page=''}:{userId:number|string;role?:string;portal?:string;page?:string}=$props();
 let mascot=$state<HTMLElement|null>(null);
 let helpOpen=$state(false),compactHelp=$state(false),helpBottom=$state(20);
 function bodyPortal(node:HTMLElement){document.body.append(node);return{destroy(){node.remove()}};}
 function closeHelp(){helpOpen=false;tick().then(()=>{const control=document.querySelector<HTMLButtonElement>('[data-inline-spooly]')||document.getElementById('spooly-compact-help')||mascot?.shadowRoot?.querySelector<HTMLButtonElement>('#character');control?.focus({preventScroll:true})});}
 const module=$derived(resolveMascotContext(page,role,portal));

 // The visual element receives no ERP records or API credentials.
 // The separate help panel uses authenticated, permission-filtered endpoints.
 $effect(()=>{
  if(!mascot)return;
  mascot.setAttribute('user-key',String(userId));
  mascot.setAttribute('user-role',role);
  mascot.setAttribute('dashboard-module',module);
 });

 onMount(()=>{
  registerMascot({gesture:mascotGesture});
  const element=document.createElement('garment-erp-mascot');
  element.setAttribute('user-key',String(userId));
  element.setAttribute('user-role',role);
  element.setAttribute('dashboard-module',module);
  element.setAttribute('assistant-enabled','');
  const openHelp=()=>{helpOpen=true;};
  element.addEventListener('spooly:help',openHelp);
  // Body placement avoids transforms or overflow in any role's workspace.
  document.body.append(element);
  mascot=element;
  let actionbar:Element|null=null;
  let positionFrame=0;
  const position=()=>{
   positionFrame=0;
   const rect=actionbar?.getBoundingClientRect();
   const bottom=rect&&rect.top<window.innerHeight&&rect.bottom>0
    ?Math.max(20,window.innerHeight-rect.top+12):20;
   element.style.bottom=`${bottom}px`;
   helpBottom=bottom;
  };
  const schedulePosition=()=>{if(!positionFrame)positionFrame=requestAnimationFrame(position)};
  const barObserver=new ResizeObserver(schedulePosition);
  const suspend=()=>{
   const nextBar=document.querySelector('.sample-dialog footer, .company-actionbar, .ex-task-footer');
   if(nextBar!==actionbar){
    barObserver.disconnect();
    actionbar=nextBar;
    if(actionbar)barObserver.observe(actionbar);
   }
   schedulePosition();
   const editing=document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')
    ||Array.from(document.querySelectorAll('.ex-editor')).some(node=>node.getClientRects().length>0);
   const dialog=Array.from(document.querySelectorAll(
    'dialog[open],[aria-modal="true"],.drawer-backdrop,.company-modal-backdrop,.sample-overlay'
   )).some(node=>node.getClientRects().length>0);
   const inlineHelp=!!document.querySelector('[data-inline-spooly]');
   compactHelp=!inlineHelp&&(!!editing||dialog);
   element.toggleAttribute('suspended',compactHelp||inlineHelp);
  };
  // Observe only the ERP DOM, never the mascot's isolated shadow tree.
  const observer=new MutationObserver(suspend);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','aria-modal']});
  const afterFocus=()=>queueMicrotask(()=>{if(element.isConnected)suspend()});
  document.addEventListener('focusin',suspend);
  document.addEventListener('focusout',afterFocus);
  window.addEventListener('resize',schedulePosition);
  document.addEventListener('scroll',schedulePosition,{passive:true,capture:true});
  suspend();
  return()=>{
   observer.disconnect();
   barObserver.disconnect();
   cancelAnimationFrame(positionFrame);
   document.removeEventListener('focusin',suspend);
   document.removeEventListener('focusout',afterFocus);
   window.removeEventListener('resize',schedulePosition);
   document.removeEventListener('scroll',schedulePosition,true);
   element.removeEventListener('spooly:help',openHelp);
   element.remove();
  };
 });
</script>

{#if helpOpen}{#key userId}<SpoolyHelp context={page+' '+portal} onclose={closeHelp}/>{/key}{/if}

{#if compactHelp&&!helpOpen}<button id="spooly-compact-help" class="spooly-compact-help" style:bottom={helpBottom+'px'} type="button" aria-label="Open Spooly task help" title="Spooly task help" onclick={()=>helpOpen=true} use:bodyPortal><MessageCircle size={18}/></button>{/if}
<style>
 .spooly-compact-help{position:fixed;right:20px;z-index:9999;display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid #2e6172;border-radius:9px;color:#fff;background:#173f51;cursor:pointer}.spooly-compact-help:hover{background:#086f6a}.spooly-compact-help:focus-visible{outline:3px solid #0b817b;outline-offset:3px}
</style>

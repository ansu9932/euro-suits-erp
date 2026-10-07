<script lang="ts">
 import {onMount} from 'svelte';
 import {mascotGesture} from './motion';
 import {registerMascot, resolveMascotContext} from './mascot/garment-erp-mascot.js';

 let {userId, role='', portal='', page=''}:{userId:number|string;role?:string;portal?:string;page?:string}=$props();
 let mascot=$state<HTMLElement|null>(null);
 const module=$derived(resolveMascotContext(page,role,portal));

 // Only visual context and a local preference key cross this boundary.
 // The element never receives ERP records, permissions, credentials or API access.
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
  // Body placement avoids transforms or overflow in any role's workspace.
  document.body.append(element);
  mascot=element;
  const suspend=()=>{
   const editing=document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
   const dialog=Array.from(document.querySelectorAll(
    'dialog[open],[aria-modal="true"],.drawer-backdrop,.company-modal-backdrop,.sample-overlay'
   )).some(node=>node.getClientRects().length>0);
   element.toggleAttribute('suspended',!!editing||dialog);
  };
  // Observe only the ERP DOM, never the mascot's isolated shadow tree.
  const observer=new MutationObserver(suspend);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','aria-modal']});
  const afterFocus=()=>queueMicrotask(()=>{if(element.isConnected)suspend()});
  document.addEventListener('focusin',suspend);
  document.addEventListener('focusout',afterFocus);
  suspend();
  return()=>{
   observer.disconnect();
   document.removeEventListener('focusin',suspend);
   document.removeEventListener('focusout',afterFocus);
   element.remove();
  };
 });
</script>

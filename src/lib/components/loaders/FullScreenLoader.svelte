<script lang="ts">
 import {onMount} from 'svelte';
 import {enter} from '../../motion';
 import SpinnerLoader from './SpinnerLoader.svelte';
 let {open=false,label='Preparing your workspace…',description='Please keep this page open.'}:{open?:boolean;label?:string;description?:string}=$props();
 let dialog:HTMLDialogElement;
 let mounted=$state(false);
 let previousFocus:HTMLElement|null=null;
 onMount(()=>{mounted=true;return()=>{mounted=false;if(dialog?.open)dialog.close();}});
 $effect(()=>{
  if(!mounted||!dialog)return;
  if(open&&!dialog.open){
   previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
   dialog.showModal();
   dialog.focus({preventScroll:true});
  }else if(!open&&dialog.open){
   dialog.close();
   if(previousFocus?.isConnected&&!previousFocus.matches(':disabled'))previousFocus.focus({preventScroll:true});
   previousFocus=null;
  }
 });
</script>

<!-- Native top-layer modality also covers a report launched from an open form. -->
<dialog bind:this={dialog} class="erp-fullscreen-loader" aria-label={label} aria-busy="true" tabindex="-1" oncancel={event=>event.preventDefault()}>
 {#if open}
  <div class="erp-fullscreen-loader__panel" use:enter>
   <div class="erp-fullscreen-loader__orbit" aria-hidden="true"><SpinnerLoader size={64} label=""/><span class="erp-fullscreen-loader__monogram">ES</span></div>
   <div class="erp-fullscreen-loader__status" role="status" aria-live="polite"><h2>{label}</h2>{#if description}<p>{description}</p>{/if}</div>
  </div>
 {/if}
</dialog>

<style>
 dialog.erp-fullscreen-loader{position:fixed;inset:0;width:100vw;max-width:none;height:100dvh;max-height:none;margin:0;padding:24px;border:0!important;border-radius:0!important;background:transparent!important;color:var(--hig-text,#111827);overflow:hidden;font-family:var(--hig-font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);box-shadow:none!important;outline:none}
 dialog.erp-fullscreen-loader[open]{display:grid;place-items:center}
 .erp-fullscreen-loader::backdrop{background:rgba(244,247,246,.88);backdrop-filter:blur(8px)}
 .erp-fullscreen-loader__panel{display:flex;flex-direction:column;align-items:center;gap:24px;width:min(100%,360px);padding:32px 24px;border:1px solid var(--hig-border,#e1e6ec);border-radius:16px;background:#fff;box-shadow:0 12px 36px rgba(19,42,58,.12);text-align:center}
 .erp-fullscreen-loader__orbit{position:relative;display:grid;place-items:center;width:64px;height:64px;flex:none;color:var(--hig-primary,#0a7a6b)}
 .erp-fullscreen-loader__monogram{position:absolute;display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#eff9f5;color:#086356;font-size:12px;font-weight:700;animation:erp-orbital-pulse 1.8s ease-in-out infinite}
 .erp-fullscreen-loader__status{width:100%;min-width:0}.erp-fullscreen-loader__status h2{margin:0;font-size:16px!important;font-weight:700!important;line-height:1.4;letter-spacing:0;overflow-wrap:anywhere;color:#111827}
 .erp-fullscreen-loader__status p{margin:8px 0 0;font-size:13px;line-height:1.5;color:#3f4b5b;font-weight:500}
 @keyframes erp-orbital-pulse{0%,100%{transform:scale(.96);opacity:.85}50%{transform:scale(1.04);opacity:1}}
 @media(prefers-reduced-motion:reduce){.erp-fullscreen-loader__monogram{animation:none}.erp-fullscreen-loader::backdrop{backdrop-filter:none}}
 @media(prefers-contrast:more){.erp-fullscreen-loader__panel{border:2px solid #132a3a}.erp-fullscreen-loader::backdrop{background:#f4f7f6}}
 @media(forced-colors:active){.erp-fullscreen-loader__panel{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}.erp-fullscreen-loader::backdrop{background:Canvas}.erp-fullscreen-loader__status h2,.erp-fullscreen-loader__status p{color:CanvasText}}
 @media print{dialog.erp-fullscreen-loader{display:none!important}}
</style>

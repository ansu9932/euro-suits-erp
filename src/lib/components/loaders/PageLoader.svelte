<script lang="ts">
 import SpinnerLoader from './SpinnerLoader.svelte';
 import {enter} from '../../motion';
 /** Initial workspace loading owns the viewport, not the register's geometry. */
 let {isLoading=true,label='Opening your workspace…',enhanced=false}:{isLoading?:boolean;label?:string;enhanced?:boolean}=$props();
</script>

{#if isLoading}
<main class="erp-page-loader" class:erp-page-loader--enhanced={enhanced} role="status" aria-label={label} aria-live="polite" aria-busy="true">
 <div class="erp-page-loader__group" use:enter>
  <svg class="erp-page-loader__crest" width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
   <path d="M42.5 17.5C39.6 14.7 35.7 13 31.4 13C22.3 13 15 20.6 15 30C15 39.4 22.3 47 31.4 47C36.4 47 40.9 44.7 43.9 41.1" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
   <path d="M11 26.8H32.5M11 32.8H29.5" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>
   <path d="M45.5 15.5C43.2 23.5 43.8 34.5 48.2 46.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
  </svg>
  <div class="erp-page-loader__spinner"><SpinnerLoader size={22} label=""/></div>
  <div class="erp-page-loader__cards" aria-hidden="true">
   {#each Array(3) as _}<div class="erp-page-loader__card"><span class="erp-page-loader__line erp-page-loader__line--caption"></span><span class="erp-page-loader__line erp-page-loader__line--value"></span><span class="erp-page-loader__line erp-page-loader__line--footer"></span></div>{/each}
  </div>
  <div class="erp-page-loader__progress" aria-hidden="true"><span></span></div>
  {#if enhanced}<p class="erp-page-loader__message">{label}</p>{/if}
 </div>
</main>
{/if}

<style>
 /* Deliberately independent of the legacy .loading-screen and table skeletons. */
 .erp-page-loader{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;box-sizing:border-box;width:100%;height:100dvh;min-height:0;margin:0;padding:24px;background:#fff;color:#475569;font-family:var(--hig-font,-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",sans-serif);overflow:auto}
 .erp-page-loader--enhanced{background:#f9fbfb}
 .erp-page-loader__group{display:flex;flex-direction:column;align-items:center;box-sizing:border-box;width:min(100%,680px);max-width:680px;margin:auto}
 .erp-page-loader__crest{display:block;flex:none;width:56px;height:56px;color:#aab3ba;filter:drop-shadow(0 1px 0 #fff)}
 .erp-page-loader__spinner{display:flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;margin-top:20px;--loader-color:#0a7a6b}
 .erp-page-loader__message{max-width:100%;margin:14px 0 0;padding:0;text-align:center;font-size:11px;font-weight:600;line-height:1.4;color:#475569;overflow-wrap:anywhere}
 .erp-page-loader__cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;box-sizing:border-box;width:100%;min-width:0;margin-top:32px}
 .erp-page-loader__card{display:flex;flex-direction:column;gap:8px;box-sizing:border-box;min-width:0;padding:16px;border:1px solid #e5ebed;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgb(19 42 58 / 3%)}
 .erp-page-loader__line{display:block;flex:none;max-width:100%;border-radius:4px;background:#e8edef}
 .erp-page-loader__line--caption{width:56px;height:8px;background:#edf1f3}
 .erp-page-loader__line--value{width:128px;height:14px;background:#e3e9ed}
 .erp-page-loader__line--footer{width:100%;height:6px;margin-top:2px;background:#f0f3f4}
 .erp-page-loader__progress{position:relative;box-sizing:border-box;flex:none;width:112px;height:3px;margin-top:28px;overflow:hidden;border-radius:3px;background:#e5efec}
 .erp-page-loader__progress>span{position:absolute;inset-block:0;left:0;width:40%;border-radius:inherit;background:#0a7a6b;transform:translateX(-120%);animation:erp-page-progress 1.5s cubic-bezier(.4,0,.2,1) infinite}
 @keyframes erp-page-progress{to{transform:translateX(370%)}}
 @media(prefers-reduced-motion:reduce){.erp-page-loader__progress>span{animation:none;left:30%;transform:none}}
 @media(prefers-contrast:more){.erp-page-loader__crest{color:#475569}.erp-page-loader__card{border-color:#64748b;box-shadow:none}.erp-page-loader__line{background:#cbd5e1}}
 @media(forced-colors:active){.erp-page-loader,.erp-page-loader--enhanced,.erp-page-loader__card{background:Canvas;color:CanvasText}.erp-page-loader__crest,.erp-page-loader__message{color:CanvasText}.erp-page-loader__crest{filter:none}.erp-page-loader__card{border-color:CanvasText;box-shadow:none}.erp-page-loader__line{background:GrayText;opacity:.25}.erp-page-loader__progress{background:Canvas;border:1px solid CanvasText}.erp-page-loader__progress>span{background:Highlight}}
 @media print{.erp-page-loader{display:none!important}}
</style>

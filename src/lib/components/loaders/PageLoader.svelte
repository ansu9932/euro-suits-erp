<script lang="ts">
 import SpinnerLoader from './SpinnerLoader.svelte';
 import {enter} from '../../motion';
 /** Initial workspace loading owns the viewport, not the register's geometry. */
 let {isLoading=true,label='Opening your workspace…',enhanced=false}:{isLoading?:boolean;label?:string;enhanced?:boolean}=$props();
</script>

{#if isLoading}
<main class="erp-page-loader" class:erp-page-loader--enhanced={enhanced} role="status" aria-label={label} aria-live="polite" aria-busy="true">
 <div class="erp-page-loader__group" use:enter>
  <div class="erp-page-loader__brand">
   <img src="/logo.png" alt="Euro Suits" width="56" height="56"/>
  </div>
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
 .erp-page-loader__brand{display:grid;place-items:center;flex:none;width:76px;height:76px;border-radius:16px;background:#142b3a}
 .erp-page-loader__brand img{display:block;object-fit:contain}
 .erp-page-loader__spinner{display:flex;align-items:center;justify-content:center;flex:none;width:22px;height:22px;margin-top:20px;--loader-color:#0a7a6b}
 .erp-page-loader__message{max-width:100%;margin:14px 0 0;padding:0;text-align:center;font-size:11px;font-weight:600;line-height:1.4;color:#475569;overflow-wrap:anywhere}
 .erp-page-loader__cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;box-sizing:border-box;width:100%;min-width:0;margin-top:32px}
 .erp-page-loader__card{display:flex;flex-direction:column;gap:8px;box-sizing:border-box;min-width:0;padding:16px;border:1px solid #e5ebed;border-radius:12px;background:#fff;box-shadow:0 1px 2px rgb(19 42 58 / 3%)}
 .erp-page-loader__line{position:relative;overflow:hidden;display:block;flex:none;max-width:100%;border-radius:4px;background:#e8edef}
 .erp-page-loader__line::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent,#ffffffa6,transparent);transform:translateX(-100%);animation:erp-page-shimmer 1.45s ease-in-out infinite}
 @keyframes erp-page-shimmer{to{transform:translateX(100%)}}
 .erp-page-loader__line--caption{width:56px;height:8px;background:#edf1f3}
 .erp-page-loader__line--value{width:128px;height:14px;background:#e3e9ed}
 .erp-page-loader__line--footer{width:100%;height:6px;margin-top:2px;background:#f0f3f4}
 .erp-page-loader__progress{position:relative;box-sizing:border-box;flex:none;width:112px;height:3px;margin-top:28px;overflow:hidden;border-radius:3px;background:#e5efec}
 .erp-page-loader__progress>span{position:absolute;inset-block:0;left:0;width:40%;border-radius:inherit;background:#0a7a6b;transform:translateX(-120%);animation:erp-page-progress 1.5s cubic-bezier(.4,0,.2,1) infinite}
 @keyframes erp-page-progress{to{transform:translateX(370%)}}
 @media(prefers-reduced-motion:reduce){.erp-page-loader__line::after{display:none}.erp-page-loader__progress>span{animation:none;left:30%;transform:none}}
 @media(prefers-contrast:more){.erp-page-loader__card{border-color:#64748b;box-shadow:none}.erp-page-loader__line{background:#cbd5e1}}
 @media(forced-colors:active){.erp-page-loader,.erp-page-loader--enhanced,.erp-page-loader__card{background:Canvas;color:CanvasText}.erp-page-loader__message{color:CanvasText}.erp-page-loader__brand{forced-color-adjust:none}.erp-page-loader__line::after{display:none}.erp-page-loader__card{border-color:CanvasText;box-shadow:none}.erp-page-loader__line{background:GrayText;opacity:.25}.erp-page-loader__progress{background:Canvas;border:1px solid CanvasText}.erp-page-loader__progress>span{background:Highlight}}
 @media print{.erp-page-loader{display:none!important}}
</style>

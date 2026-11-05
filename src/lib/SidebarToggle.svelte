<script lang="ts">
 import {onMount} from 'svelte';
 let hidden=$state(false);
 function apply(){document.body.classList.toggle('sidebar-collapsed',hidden)}
 function toggle(){hidden=!hidden;apply();try{localStorage.setItem('erp-sidebar-hidden',String(hidden))}catch{}}
 onMount(()=>{const tablet=window.matchMedia('(min-width:768px) and (max-width:1100px)').matches;try{const saved=localStorage.getItem('erp-sidebar-hidden');hidden=saved===null?tablet:saved==='true'}catch{hidden=tablet}apply();return()=>document.body.classList.remove('sidebar-collapsed')});
</script>
<button type="button" class="sidebar-toggle" onclick={toggle} aria-label={hidden?'Show sidebar':'Hide sidebar'} aria-expanded={!hidden} title={hidden?'Show sidebar':'Hide sidebar'}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg><span>{hidden?'Show menu':'Hide menu'}</span></button>
<style>
 .sidebar-toggle{display:inline-flex;align-items:center;gap:7px;flex-shrink:0;border:1px solid #c6d2da;border-radius:6px;background:#f1f6fa;color:#172d3c;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer}.sidebar-toggle:focus-visible{outline:3px solid #087f7c;outline-offset:2px}
 /* Desktop rail stays navigable while labels fade and slide; no business action waits for motion. */
 @media(min-width:1024px){
 :global(body .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar)){width:240px!important;overflow-x:hidden;transition:width 300ms ease-in-out,padding 300ms ease-in-out}
 :global(body .erp-workspace :is(.main-shell,.company-main,.dev-main)){margin-left:240px!important;width:calc(100% - 240px)!important;transition:margin-left 300ms ease-in-out,width 300ms ease-in-out}
 :global(body .erp-workspace :is(.brand,.dev-brand)){min-height:64px;align-items:center;white-space:nowrap;overflow:hidden}
 :global(body .erp-workspace :is(.brand,.dev-brand) img){flex-shrink:0;transition:width 300ms ease-in-out,height 300ms ease-in-out}
 :global(body .erp-workspace :is(.brand,.dev-brand)>div),:global(body .erp-workspace .sidebar-label){opacity:1;transform:translateX(0);transition:opacity 180ms ease,transform 300ms ease-in-out,max-width 300ms ease-in-out;max-width:220px;white-space:nowrap}
 :global(body .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar) nav :is(button,a)){overflow:hidden}
 :global(body .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar) nav svg){flex-shrink:0}
 :global(body.sidebar-collapsed .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar)){display:flex!important;width:68px!important;padding-inline:12px!important}
 :global(body.sidebar-collapsed .erp-workspace :is(.main-shell,.company-main,.dev-main)){margin-left:68px!important;width:calc(100% - 68px)!important}
 :global(body.sidebar-collapsed .erp-workspace :is(.brand,.dev-brand)){padding-inline:6px!important;gap:0}
 :global(body.sidebar-collapsed .erp-workspace :is(.brand,.dev-brand) img){width:32px!important;height:32px!important}
 :global(body.sidebar-collapsed .erp-workspace :is(.brand,.dev-brand)>div),:global(body.sidebar-collapsed .erp-workspace .sidebar-label){max-width:0;opacity:0;transform:translateX(-8px);pointer-events:none;overflow:hidden}
 :global(body.sidebar-collapsed .erp-workspace :is(.phase-pill,.company-sidebar-note,.workspace-label,.dev-caption,.nav-group>p,.demo-label)){height:0;min-height:0;margin:0!important;padding:0!important;overflow:hidden;opacity:0;border:0}
 :global(body.sidebar-collapsed .erp-workspace :is(.company-sidebar footer,.dev-owner)>:is(strong,small)){display:none}
 :global(body.sidebar-collapsed .erp-workspace .profile-button>span:not(.avatar)){display:none}
 :global(body.sidebar-collapsed .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar) nav :is(button,a)){width:44px;min-width:44px;height:44px;min-height:44px;padding:12px!important;gap:0!important;white-space:nowrap}
 :global(body.sidebar-collapsed .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar) nav b){display:none}
 :global(body.sidebar-collapsed .erp-workspace .sidebar nav>a){font-size:0!important}
 :global(body.sidebar-collapsed .erp-workspace .sidebar nav>a)::before{content:'ES';font-size:11px;font-weight:700}
 :global(body.sidebar-collapsed .erp-workspace :is(.logout,.company-sidebar footer button,.dev-owner button)){justify-content:center;gap:0;width:44px;min-height:44px;padding:10px!important}
 :global(body.sidebar-collapsed .erp-workspace .profile-button){padding:0;justify-content:center}
 :global(body.sidebar-collapsed .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar) nav){padding:6px 0 16px!important;margin-inline:0!important}
 :global(body.sidebar-collapsed .erp-workspace :is(.sidebar-bottom,.company-sidebar footer,.dev-owner)){padding:18px 0!important;margin-top:auto!important}
 }
 @media(max-width:1023px){:global(body.sidebar-collapsed :is(.sidebar,.company-sidebar,.dev-sidebar)){display:none!important}:global(body.sidebar-collapsed :is(.main-shell,.company-main,.dev-main)){margin-left:0!important;width:100%!important;flex:1}}
 @media(prefers-reduced-motion:reduce){:global(body .erp-workspace :is(.sidebar,.company-sidebar,.dev-sidebar,.main-shell,.company-main,.dev-main,.brand>div,.dev-brand>div,.sidebar-label,.brand img,.dev-brand img)){transition:none!important}}
 @media(max-width:700px){.sidebar-toggle span{display:none}}
</style>

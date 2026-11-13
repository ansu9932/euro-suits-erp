<script lang="ts">
 import type {Snippet} from 'svelte';
 import type {HTMLButtonAttributes} from 'svelte/elements';
 import SpinnerLoader from './SpinnerLoader.svelte';
 type ClickEvent=MouseEvent&{currentTarget:EventTarget&HTMLButtonElement};
 type Props=Omit<HTMLButtonAttributes,'children'|'onclick'> & {loading?:boolean;label?:string;loadingLabel?:string;children?:Snippet;onclick?:(event:ClickEvent)=>unknown};
 let {loading=false,disabled=false,type='button',label='Save',loadingLabel='Saving…',children,class:className='',onclick,...attributes}:Props=$props();
 let pending=$state(false);
 const active=$derived(loading||pending);
 async function click(event:ClickEvent){
  if(active||disabled){event.preventDefault();return;}
  const result=onclick?.(event);
  if(result&&typeof (result as PromiseLike<unknown>).then==='function'){
   pending=true;
   try{await result;}finally{pending=false;}
  }
 }
</script>

<!-- Both layers occupy one grid cell; neither label changes the button width. -->
<button {...attributes} {type} class={`erp-loader-button ${className}`} class:erp-loader-button--loading={active} disabled={disabled||active} aria-busy={active} data-loader-owned onclick={click}>
 <span class="erp-loader-button__idle" aria-hidden={active}>{#if children}{@render children()}{:else}{label}{/if}</span>
 <span class="erp-loader-button__busy" aria-hidden={!active}>
  {#if active}<SpinnerLoader size={16} label=""/>{:else}<span class="erp-loader-button__space"></span>{/if}
  {loadingLabel}
 </span>
</button>

<style>
 .erp-loader-button{display:inline-grid;grid-template-columns:1fr;grid-template-rows:1fr;align-items:center;justify-items:center;gap:0;position:relative;min-height:44px;max-width:100%;padding:10px 16px;border:1px solid var(--hig-primary,#0a7a6b);border-radius:12px;background:var(--hig-primary,#0a7a6b);color:#fff;font:600 13px/1.4 var(--hig-font,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);cursor:pointer;vertical-align:middle;transition:background-color 160ms,border-color 160ms}
 .erp-loader-button:hover:not(:disabled){background:var(--hig-primary-hover,#086356);border-color:var(--hig-primary-hover,#086356)}
 .erp-loader-button:focus-visible{outline:3px solid var(--hig-primary,#0a7a6b);outline-offset:3px}
 .erp-loader-button:disabled{cursor:not-allowed;opacity:.65}.erp-loader-button--loading:disabled{cursor:wait;opacity:.88}
 .erp-loader-button__idle,.erp-loader-button__busy{grid-area:1/1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:0;white-space:nowrap;transition:opacity 180ms cubic-bezier(.22,1,.36,1),transform 180ms cubic-bezier(.22,1,.36,1)}
 .erp-loader-button__busy{--loader-color:currentColor;opacity:0;visibility:hidden;transform:translateY(3px)}
 .erp-loader-button__space{width:16px;height:16px;flex:none}
 .erp-loader-button--loading .erp-loader-button__idle{opacity:0;visibility:hidden;transform:translateY(-3px)}
 .erp-loader-button--loading .erp-loader-button__busy{opacity:1;visibility:visible;transform:none}
 @media(prefers-reduced-motion:reduce){.erp-loader-button,.erp-loader-button__idle,.erp-loader-button__busy{transition:none;transform:none!important}}
 @media(forced-colors:active){.erp-loader-button{background:ButtonFace;color:ButtonText;border-color:ButtonText}.erp-loader-button:disabled{color:GrayText;opacity:1}}
</style>

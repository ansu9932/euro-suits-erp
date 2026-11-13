<script lang="ts">
 import {onMount,type Snippet} from 'svelte';
 import {X} from '@lucide/svelte';
 import {enter} from './motion';

 let {title,close,busy=false,wide=false,children}:{title:string;close:()=>void;busy?:boolean;wide?:boolean;children:Snippet}=$props();
 let dialog:HTMLDialogElement;
 onMount(()=>{
  const node=dialog;
  node.showModal();
  return ()=>{if(node.open)node.close()};
 });
</script>

<dialog bind:this={dialog} aria-label={title} class:wide onclose={close} oncancel={event=>{if(busy)event.preventDefault()}}>
 <header>
  <h3>{title}</h3>
  <button class="button secondary" type="button" disabled={busy} onclick={()=>dialog.close()}><X size={16} aria-hidden="true"/>Close</button>
 </header>
 <div class="stage-body" use:enter>{@render children()}</div>
</dialog>

<style>
 dialog{width:min(540px,calc(100% - 32px));max-width:none;max-height:calc(100dvh - 32px);margin:auto;padding:0;border:1px solid #dce3e9;border-radius:16px;background:#fff;color:#172536;box-shadow:0 20px 55px #10243640;overflow:hidden;font-family:inherit}
 dialog.wide{width:min(1000px,calc(100% - 32px))}
 dialog[open]{display:flex;flex-direction:column}
 dialog::backdrop{background:#15253755;backdrop-filter:blur(4px)}
 header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 24px;background:#102939;color:#fff;flex:none}
 h3{margin:0;color:inherit;font-size:17px;font-weight:750;overflow-wrap:anywhere}
 header .button.secondary{flex:none;min-height:44px;padding-inline:12px;border-radius:10px;background:#ffffff12;border-color:#ffffff30;color:#fff}
 header .button.secondary:hover{background:#ffffff25}
 .stage-body{min-height:0;padding:22px 24px;overflow:auto;overscroll-behavior:contain;font-size:14px;font-weight:550;line-height:1.5}
 @media(max-width:600px){header,.stage-body{padding:12px 16px}}
</style>

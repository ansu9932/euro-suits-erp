<script lang="ts">
 import {activeOperations,downloadError} from './loading';
 import {FullScreenLoader} from './components/loaders';
 let failure=$state<HTMLDialogElement>();
 const active=$derived($activeOperations.at(-1));
 $effect(()=>{if(!failure)return;if($downloadError&&!failure.open)failure.showModal();else if(!$downloadError&&failure.open)failure.close()});
</script>
<FullScreenLoader open={!!active} label={active?.label||'Loading your workspace…'}/>
<dialog bind:this={failure} class="download-error" aria-label="Export unavailable" oncancel={()=>downloadError.set('')}>
 <p role="alert">{$downloadError}</p><button type="button" onclick={()=>downloadError.set('')} aria-label="Dismiss export error">Dismiss</button>
</dialog>
<style>
 .download-error{position:fixed;inset:0;margin:auto;max-width:min(500px,calc(100vw - 48px));padding:16px 20px;background:#fff6f5;color:#882b26;border:1px solid #d9a29b;border-radius:16px;box-shadow:0 4px 16px #142b4014;font:600 14px/1.5 var(--hig-font,system-ui)}
 .download-error[open]{display:flex;align-items:center;gap:16px}.download-error::backdrop{background:#142b4055}
 p{margin:0}button{min-height:44px;padding:8px 12px;background:white;color:#882b26;border:1px solid #d9a29b;border-radius:8px;font:inherit;cursor:pointer}
 @media print{.download-error{display:none}}
</style>

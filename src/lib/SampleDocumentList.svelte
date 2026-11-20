<script lang="ts">
 import {FileText} from '@lucide/svelte';
 import type {Row} from './types';

 let {files,disabled=false,onpreview,onremove}:{
  files:Row[];
  disabled?:boolean;
  onpreview:(file:Row)=>void;
  onremove:(file:Row)=>void;
 }=$props();
 const dateTime=new Intl.DateTimeFormat('en-IN',{
  dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'
 });
 function uploadedAt(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':dateTime.format(date)+' IST';
 }
</script>

{#if files.length}
 <ul class="documents" aria-label="Saved attachments">
  {#each files as file (file.id)}
   <li>
    <span class="file-icon"><FileText size={17} aria-hidden="true"/></span>
    <div class="file-info">
     <strong>{file.name}</strong>
     <small>{file.category==='EST'?'Mail':file.category}
      · {file.indent_reference?'Indent '+file.indent_reference:'Whole request'}
      {#if file.uploaded_by} · {file.uploaded_by}{/if}
      {#if file.created_at} · {uploadedAt(file.created_at)}{/if}
     </small>
    </div>
    <div class="file-actions">
     <button type="button" class="button secondary" {disabled} aria-label={'Preview '+file.name} onclick={()=>onpreview(file)}>Preview</button>
     {#if file.can_remove}
      <button type="button" class="button remove" {disabled} aria-label={'Remove '+file.name} onclick={()=>onremove(file)}>Remove</button>
     {/if}
    </div>
   </li>
  {/each}
 </ul>
{:else}
 <p class="empty">No documents attached.</p>
{/if}

<style>
 .documents{margin:8px 0;padding:0;list-style:none;border:1px solid #dce5ec;border-radius:10px;background:#fff}
 li{display:flex;align-items:center;gap:12px;padding:10px 12px}
 li+li{border-top:1px solid #e8edf2}
 .file-icon{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:8px;background:#edf5f6;color:#226763}
 .file-info{flex:1;min-width:0;color:#172f40;overflow-wrap:anywhere}
 .file-info strong,.file-info small{display:block}
 .file-info small{margin-top:3px;color:#526170;font-size:12px}
 .file-actions{display:flex;flex:none;flex-wrap:wrap;gap:6px}
 .file-actions .button{padding:5px 10px;font-size:12px}
 .file-actions .remove{border-color:#edc5c4;color:#8a232a;background:#fff7f6}
 .file-actions .remove:hover:enabled{border-color:#da9b99;color:#751c24;background:#fde9e7}
 .empty{margin:8px 0;padding:10px 12px;border:1px dashed #d6e3eb;border-radius:8px;color:#526170}
</style>

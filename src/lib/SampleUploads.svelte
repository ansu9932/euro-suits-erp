<script lang="ts">
 import {Check, FileText, Upload, X} from '@lucide/svelte';
 import {SpinnerLoader} from './components/loaders';
 import {enter} from './motion';
 import SampleFilePreview from './SampleFilePreview.svelte';

 const extensions = ['.eml', '.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.zip', '.txt', '.csv', '.dxf', '.plt', '.dwg', '.ai'];
 const accept = extensions.join(',');
 const maxSize = 10 * 1024 * 1024;
 let {title, files, onfiles, disabled = false, existing = 0, canUpload = true, uploading = null, uploadError = ''}: {
  title: string;
  files: File[];
  onfiles: (files: File[]) => void;
  disabled?: boolean;
  existing?: number;
  canUpload?: boolean;
  uploading?: File | null;
  uploadError?: string;
 } = $props();

 const uid = $props.id();
 let picker: HTMLInputElement;
 let preview = $state<File | null>(null);
 let error = $state('');
 let dragDepth = $state(0);
 const full = $derived(existing + files.length >= 10);
 const available = $derived(canUpload && !disabled && !full);
 const dragging = $derived(available && dragDepth > 0);

 function add(items: File[]) {
  if (!items.length) return;
  const next = [...files];
  const problems = new Set<string>();
  for (const file of items) {
   const suffix = /\.[^.]+$/.exec(file.name)?.[0].toLowerCase();
   if (!file.size) problems.add(`${file.name} is empty. Choose a file with content.`);
   else if (file.size > maxSize) problems.add(`${file.name} exceeds 10 MB.`);
   else if (!suffix || !extensions.includes(suffix)) {
    problems.add(`${file.name} is an unsupported file type. Use a supported format listed below.`);
   } else if (next.length + existing >= 10) {
    problems.add('This section can hold up to 10 files. Remove a queued file to add another.');
    break;
   } else next.push(file);
  }
  error = [...problems].join(' ');
  if (next.length !== files.length) onfiles(next);
 }

 function fromPicker(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const chosen = Array.from(input.files ?? []);
  input.value = '';
  if (available) add(chosen);
 }

 function dragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = available ? 'copy' : 'none';
 }

 function drop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  dragDepth = 0;
  if (!available) return;
  const transfer = event.dataTransfer;
  const dropped = Array.from(transfer?.files ?? []);
  if (!dropped.length && transfer?.items) {
   for (const item of Array.from(transfer.items)) {
    const file = item.kind === 'file' ? item.getAsFile() : null;
    if (file) dropped.push(file);
   }
  }
  if (dropped.length) add(dropped);
  else error = 'No file was received. Save it to your computer first, then choose it here.';
 }

 function remove(index: number) {
  error = '';
  onfiles(files.filter((_, i) => i !== index));
 }

 function sizeLabel(bytes: number) {
  return bytes >= 1024 * 1024 ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : Math.ceil(bytes / 1024) + ' KB';
 }
</script>

<svelte:window onblur={() => dragDepth = 0} ondragend={() => dragDepth = 0}/>

<section class="upload" aria-labelledby={uid + '-title'}>
 <h3 id={uid + '-title'}>{title} <span class="count">{existing + files.length}/10 files</span></h3>
 <input type="file" bind:this={picker} multiple {accept} hidden disabled={!available} onchange={fromPicker}/>
 <button type="button" class="drop" class:dragging aria-disabled={!available}
  aria-label={'Choose files for ' + title} aria-describedby={uid + '-help'}
  onclick={() => { if (available) picker.click(); }}
  ondragenter={event => { dragOver(event); dragDepth++; }}
  ondragover={dragOver}
  ondragleave={() => dragDepth = Math.max(0, dragDepth - 1)}
  ondrop={drop}>
  <svg class="drop-border" aria-hidden="true"><rect x="1" y="1" rx="15"/></svg>
  <span class="icon"><Upload size={20} aria-hidden="true"/></span>
  <span class="prompt">{dragging ? 'Drop files here' : !canUpload ? 'Attachments unavailable' : full ? 'File limit reached' : disabled ? 'Saving…' : 'Drag and drop files'}</span>
  {#if canUpload && !full && !disabled}<span class="choose">Choose files</span>{/if}
 </button>
 <p id={uid + '-help'} class="help">{canUpload ? 'Up to 10 MB each · PDF, images, Office, email, CAD, text or ZIP' : 'Your account does not have document upload access.'}</p>
 {#if uploadError}<p class="upload-error" role="alert">{uploadError}</p>{:else if error}<p class="upload-error" role="alert">{error}</p>{/if}
 {#if files.length}
  <ul aria-label={title + ' files ready to attach'}>
   {#each files as file, index (file)}
    <li use:enter>
     <span class="file-icon"><FileText size={16} aria-hidden="true"/></span>
     <div class="file-name"><strong>{file.name}</strong><small>{sizeLabel(file.size)} · {file === uploading ? 'Uploading…' : 'Ready to attach'}</small></div>
     <span class="file-state" aria-hidden="true">{#if file === uploading}<SpinnerLoader size={16}/>{:else}<Check size={16}/>{/if}</span>
     <button type="button" class="file-action" disabled={disabled} onclick={() => preview = file} aria-label={'Preview ' + file.name}>Preview</button>
     <button type="button" class="file-action remove" disabled={disabled} onclick={() => remove(index)} aria-label={'Remove ' + file.name}><X size={16} aria-hidden="true"/></button>
    </li>
   {/each}
  </ul>
 {/if}
 <span class="sr-status" aria-live="polite">{files.length ? `${files.length} ${title} files ready to attach` : ''}</span>
</section>
{#if preview}
 {#key preview}<SampleFilePreview file={preview} name={preview.name} onclose={() => preview = null}/>{/key}
{/if}

<style>
 .upload {min-width:0}
 h3 {display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;margin:0 0 8px;font-size:16px;color:#172f40}
 .count {padding:2px 8px;border-radius:8px;background:#edf3f6;color:#3d5367;font-size:12px;font-weight:650;font-variant-numeric:tabular-nums}
 .drop {position:relative;display:grid;justify-items:center;gap:8px;width:100%;min-height:132px;padding:14px 12px;border:0;border-radius:16px;background:#f6f8fa;color:#172f40;text-align:center;cursor:pointer;font:inherit}
 .drop[aria-disabled="true"] {cursor:default}
 .drop-border {position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
 .drop-border rect {width:calc(100% - 2px);height:calc(100% - 2px);fill:none;stroke:#748999;stroke-width:1.5;stroke-dasharray:6 6}
 .drop:not([aria-disabled="true"]):hover,.drop.dragging {background:#eaf6f3}
 .drop:not([aria-disabled="true"]):hover rect,.drop.dragging rect {stroke:#0a7a6b}
 .drop.dragging rect {stroke-width:2;animation:march .7s linear infinite}
 .drop:focus-visible,.file-action:focus-visible {outline:2px solid #0a7a6b;outline-offset:3px}
 .icon {position:relative;display:grid;place-items:center;width:40px;height:40px;border:1px solid #d9e4e9;border-radius:12px;background:#fff;color:#0a6a5e}
 .drop.dragging .icon {animation:lift .85s ease-in-out infinite}
 .prompt {font-size:13px;font-weight:650}
 .choose {padding:4px 10px;border:1px solid #b8d5cd;border-radius:8px;background:#fff;color:#086356;font-size:13px;font-weight:700}
 .help,.upload-error {margin:7px 0 0;font-size:12px;color:#42566a}
 .upload-error {color:#9f2828;overflow-wrap:anywhere}
 ul {list-style:none;display:grid;gap:6px;padding:0;margin:8px 0 0}
 li {display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:5px 6px;border:1px solid #dce5ea;border-radius:10px;background:#fff}
 .file-icon,.file-state {display:grid;place-items:center;flex:none;width:26px;height:26px;border-radius:8px;background:#eaf6f3;color:#086356}
 .file-name {display:grid;flex:1 1 72px;min-width:0;overflow-wrap:anywhere;font-size:13px;color:#172f40}
 .file-name small {font-size:12px;color:#42566a}
 .file-action {display:grid;place-items:center;min-height:44px;padding:0 7px;border:0;border-radius:8px;background:transparent;color:#086356;font-size:12px;font-weight:700;cursor:pointer}
 .file-action:hover:not(:disabled) {background:#eaf6f3}
 .file-action:disabled {opacity:.6;cursor:default}
 .remove {min-width:44px;color:#42566a}
 .sr-status {position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 @keyframes march {to {stroke-dashoffset:-24}}
 @keyframes lift {50% {transform:translateY(-4px)}}
 @media (prefers-reduced-motion:reduce) {.drop.dragging rect,.drop.dragging .icon {animation:none}}
 @media (forced-colors:active) {.drop-border rect {stroke:ButtonText}.drop.dragging rect {stroke:Highlight}}
</style>

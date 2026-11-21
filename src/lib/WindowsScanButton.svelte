<script lang="ts">
 import {onDestroy, onMount, tick} from 'svelte';
 import {ScanLine, X} from '@lucide/svelte';
 import {createScannedDocument, documentScanPageLimit, getScannerCode, saveScannerCode, scanDocumentPages, type ScannerSource} from './windowsScan';

 let {label, destination, disabled = false, maxBytes = 10 * 1024 * 1024, onreceive}: {
  label: string;
  destination?: string | number;
  disabled?: boolean;
  maxBytes?: number;
  onreceive: (file: File) => void | Promise<void>;
 } = $props();

 const id = $props.id();
 let windows = $state(false);
 let dialog = $state<HTMLDialogElement>();
 let open = $state(false);
 let code = $state('');
 let showCode = $state(false);
 let source = $state<ScannerSource>('feeder');
 let pages = $state<string[]>([]);
 let selected = $state(0);
 let busy = $state<'scan' | 'add' | null>(null);
 let problem = $state('');
 let warning = $state('');
 let scanController: AbortController | undefined;
 let scanDestination = $state<typeof destination>();

 onMount(() => {windows = /^Win/.test(navigator.platform);});
 onDestroy(() => scanController?.abort());

 $effect(() => {
  if (open && scanDestination !== destination) close();
 });

 async function start() {
  if (open) return;
  code = getScannerCode();
  showCode = !code;
  scanDestination = destination;
  open = true;
  await tick();
  if (open) dialog?.showModal();
 }

 function close() {
  scanController?.abort();
  dialog?.close();
  open = false;
  busy = null;
  pages = [];
  selected = 0;
  problem = '';
  warning = '';
 }

 async function scan(batch: boolean) {
  if (busy || disabled || scanDestination !== destination || pages.length >= documentScanPageLimit) return;
  const pairingCode = code.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(pairingCode)) {
   showCode = true;
   problem = 'Enter the pairing code from the scanner connector window.';
   return;
  }
  const controller = new AbortController();
  scanController = controller;
  busy = 'scan';
  problem = '';
  warning = '';
  try {
   const count = batch ? documentScanPageLimit - pages.length : 1;
   const result = await scanDocumentPages(pairingCode, source, count, controller.signal);
   if (controller.signal.aborted || scanDestination !== destination) return;
   saveScannerCode(pairingCode);
   showCode = false;
   warning = result.warning || '';
   selected = pages.length;
   pages = [...pages, ...result.pages];
  } catch (error) {
   if (!controller.signal.aborted) {
    problem = error instanceof Error ? error.message : 'The scan failed. Try again.';
    showCode = true;
   }
  } finally {
   if (!controller.signal.aborted) busy = null;
  }
 }

 function removeSelected() {
  pages = pages.filter((_, index) => index !== selected);
  selected = Math.max(0, Math.min(selected, pages.length - 1));
  problem = '';
 }

 async function add() {
  if (busy || disabled || !pages.length || scanDestination !== destination) return;
  busy = 'add';
  problem = '';
  try {
   const file = await createScannedDocument(pages);
   if (!open || scanDestination !== destination) return;
   if (file.size > maxBytes) {
    throw new Error(`This PDF exceeds ${maxBytes / 1024 / 1024} MB. Remove some pages and attach them in a separate scan.`);
   }
   if (disabled) throw new Error('This field is busy. Try adding the PDF again.');
   await onreceive(file);
   close();
  } catch (error) {
   problem = error instanceof Error ? error.message : 'The PDF could not be added.';
  } finally {
   busy = null;
  }
 }
</script>

{#if windows}
 <button type="button" class="scan-trigger" {disabled} onclick={start} aria-label={'Scan document for ' + label}>
  <ScanLine size={16} aria-hidden="true"/> Scan document
 </button>
 <dialog bind:this={dialog} aria-labelledby={id + '-title'}
  oncancel={event => {event.preventDefault(); if (busy !== 'add') close();}}>
  {#if open}
   <header>
    <h2 id={id + '-title'}>Scan document</h2>
    <button type="button" class="close" aria-label="Close document scanner" disabled={busy === 'add'} onclick={close}><X size={20}/></button>
   </header>
   <div class="body">
    <div class="controls">
     <label>Paper source
      <select bind:value={source} disabled={!!busy}>
       <option value="feeder">Document feeder</option>
       <option value="flatbed">Scanner glass</option>
      </select>
     </label>
     <button type="button" class="button secondary" disabled={!!busy} onclick={() => showCode = !showCode}>{showCode ? 'Hide pairing' : 'Pair scanner'}</button>
    </div>
    {#if showCode}
     <label>Scanner pairing code
      <input type="password" autocomplete="off" spellcheck="false" bind:value={code} disabled={!!busy} />
     </label>
     <p class="help">Open Euro Suits Scanner on this Windows PC and enter its pairing code. Chrome may ask to connect to apps on this device when you first scan.</p>
    {/if}
    <div class="controls">
     <button type="button" class="button secondary" disabled={disabled || !!busy || pages.length >= documentScanPageLimit} onclick={() => scan(false)}>Scan one page</button>
     {#if source === 'feeder'}
      <button type="button" class="button secondary" disabled={disabled || !!busy || pages.length >= documentScanPageLimit} onclick={() => scan(true)}>Scan feeder</button>
     {/if}
    </div>
    {#if busy}<p role="status">{busy === 'scan' ? 'Scanning from the Canon…' : 'Creating and adding the PDF…'}</p>{/if}
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
    {#if warning}<p class="problem" role="status">{warning}</p>{/if}
    {#if pages.length}
     <div class="preview">
      <img src={pages[selected]} alt={'Scanned page ' + (selected + 1)} />
     </div>
     <div class="controls page-controls">
      <button class="button secondary" type="button" disabled={selected === 0 || !!busy} onclick={() => selected--}>Previous</button>
      <span>Page {selected + 1} of {pages.length}</span>
      <button class="button secondary" type="button" disabled={selected >= pages.length - 1 || !!busy} onclick={() => selected++}>Next</button>
      <button class="button secondary remove" type="button" disabled={!!busy} onclick={removeSelected}>Remove page</button>
     </div>
     {#if pages.length === documentScanPageLimit}<p class="help">This PDF can hold up to {documentScanPageLimit} pages. Add it before scanning the next batch.</p>{/if}
    {/if}
    <div class="actions">
     <button class="button secondary" type="button" disabled={busy === 'add'} onclick={close}>Cancel</button>
     <button class="button primary" type="button" disabled={disabled || !!busy || !pages.length} onclick={add}>Add PDF</button>
    </div>
   </div>
  {/if}
 </dialog>
{/if}

<style>
 .scan-trigger {display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:7px 10px;color:#0a645b;background:#edf7f4;border:1px solid #b7d8d0;border-radius:8px;font-size:13px;font-weight:700;white-space:nowrap}
 .scan-trigger:hover:not(:disabled) {background:#dcefea}
 dialog {position:fixed;inset:0;margin:auto;width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:0;overflow:auto;background:white;color:#142b40;border:1px solid #cbd9e4;border-radius:16px;box-shadow:0 20px 60px #142b4044}
 dialog::backdrop {background:#142b4066}
 header {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px 12px 20px;background:#142b40;color:white}
 h2 {margin:0;color:inherit;font-size:18px}
 .close {display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:8px;background:#ffffff17;color:inherit}
 .body {display:grid;gap:12px;padding:20px}
 .controls,.actions {display:flex;align-items:flex-end;flex-wrap:wrap;gap:8px}
 .actions {justify-content:flex-end}
 .page-controls {align-items:center}
 .remove {margin-left:auto}
 label {display:grid;gap:4px;font-size:13px;font-weight:650}
 input,select {min-height:40px;padding:6px 10px;border:1px solid #cbd9e4;border-radius:8px;font:inherit;color:inherit;background:#fff}
 p {margin:0}
 .help {font-size:13px;color:#42566a}
 .problem {color:#9f2828}
 .preview {display:grid;justify-items:center;background:#edf2f6;border:1px solid #dce5ea;border-radius:8px;padding:8px}
 img {display:block;max-width:100%;max-height:45vh;object-fit:contain;background:white}
</style>

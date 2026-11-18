<script lang="ts">
 import {onDestroy} from 'svelte';
 import {CheckCircle2, QrCode, X} from '@lucide/svelte';
 import {csrf} from './api';
 import {scanCountdown, scanFileLimit, scanHeaders, scanResponse, type ScanFormat, type ScanStatus} from './phoneScan';

 let {label = 'documents', destination = '', disabled = false, format = 'pdf', maxBytes = scanFileLimit, onreceive}: {
  label?: string;
  destination?: string | number;
  disabled?: boolean;
  format?: ScanFormat;
  maxBytes?: number;
  onreceive: (file: File) => void | Promise<void>;
 } = $props();

 const endpoint = '/api/phone-scan/desktop';
 let open = $state(false), phase = $state<'starting' | 'waiting' | 'receiving' | 'attaching' | 'error' | 'expired' | 'done'>('starting');
 let qr = $state(''), problem = $state(''), remaining = $state(0), phoneUploading = $state(false);
 let token = '', capturedDestination: string | number, expires = 0, generation = 0;
 let file = $state.raw<File>();
 let canRetry = $state(false);
 let timer: ReturnType<typeof setTimeout>, clock: ReturnType<typeof setInterval>;
 let controller = $state.raw<AbortController>();
 let sessionCSRF = '';

 function remove(active: string, security: string) {
  if (!active) return;
  void fetch(endpoint, {method: 'DELETE', headers: {...scanHeaders(active), 'X-CSRF-Token': security, 'Content-Type': 'application/json'}, keepalive: true}).catch(() => {});
 }
 function reset() {
  generation++;
  controller?.abort();
  clearTimeout(timer);
  clearInterval(clock);
  remove(token, sessionCSRF);
  token = '';
  file = undefined;
  canRetry = false;
 }
 onDestroy(reset);

 $effect(() => {
  if (open && capturedDestination !== destination) close();
 });

 function show(node: HTMLDialogElement) {
  node.showModal();
  return {destroy() {node.close();}};
 }
 function close() {
  open = false;
  reset();
 }
 const message = (error: unknown) => error instanceof Error ? error.message : 'Try again.';

 async function start() {
  reset();
  const revision = generation;
  const work = new AbortController();
  controller = work;
  capturedDestination = destination;
  sessionCSRF = csrf;
  open = true;
  phase = 'starting';
  problem = '';
  qr = '';
  phoneUploading = false;
  try {
   // Finish creating the transfer even if the dialog closes while the server
   // responds, so the unused token can be cancelled immediately.
   const security = sessionCSRF;
   const [data, code] = await Promise.all([
    fetch(endpoint, {method: 'POST', headers: {'X-CSRF-Token': security, 'Content-Type': 'application/json'}, body: JSON.stringify({format, maxBytes})})
     .then(scanResponse<ScanStatus & {token: string}>).then(data => {
      if (work.signal.aborted) remove(data.token, security);
      else token = data.token;
      return data;
     }),
    import('qrcode')
   ]);
   if (work.signal.aborted) return;
   expires = Date.now() + data.expiresAt - data.now;
   const url = new URL('/scan', location.origin);
   url.hash = data.token;
   const image = await code.default.toDataURL(url.href, {width: 288, margin: 4, errorCorrectionLevel: 'M'});
   if (work.signal.aborted) return;
   qr = image;
   phase = 'waiting';
   remaining = expires - Date.now();
   clock = setInterval(() => {remaining = expires - Date.now();}, 250);
   void poll(revision, work.signal);
  } catch (error) {
   if (work.signal.aborted) return;
   phase = 'error';
   problem = message(error);
  }
 }

 async function poll(revision: number, signal: AbortSignal) {
  if (signal.aborted) return;
  try {
   const response = await fetch(endpoint, {headers: scanHeaders(token), signal, cache: 'no-store'});
   const state = await scanResponse<ScanStatus>(response);
   if (signal.aborted) return;
   if (state.state === 'submitted') {
    clearInterval(clock);
    await receive(revision, signal);
    return;
   }
   phoneUploading = state.state === 'uploading';
  } catch (error) {
   if (signal.aborted) return;
   if ([401, 403, 410, 423].includes((error as {status?: number}).status ?? 0)) {
    phase = 'expired';
    problem = 'This QR has closed. Generate a new QR to continue.';
    clearInterval(clock);
    return;
   }
  }
  if (remaining <= -15000) {
   phase = 'expired';
   problem = 'This QR has expired. Generate a new one to continue.';
   clearInterval(clock);
   return;
  }
  timer = setTimeout(() => void poll(revision, signal), document.hidden ? 4500 : 1400);
 }

 async function receive(revision: number, signal: AbortSignal) {
  if (signal.aborted || capturedDestination !== destination) return;
  canRetry = true;
  phase = file ? 'attaching' : 'receiving';
  problem = '';
  try {
   if (!file) {
    const response = await fetch(endpoint + '/file', {headers: scanHeaders(token), signal, cache: 'no-store'});
    if (!response.ok) await scanResponse(response);
    const name = /filename="?([^";]+)"?/i.exec(response.headers.get('Content-Disposition') || '')?.[1] || (format === 'jpeg' ? 'Phone scan.jpg' : 'Phone scan.pdf');
    const blob = await response.blob();
    if (signal.aborted) return;
    file = new File([blob], name, {type: blob.type});
   }
   if (disabled || capturedDestination !== destination) throw new Error('This field is busy. Try attaching the scan again.');
   phase = 'attaching';
   await onreceive(file);
   if (revision !== generation) return;
   phase = 'done';
   remove(token, sessionCSRF);
   token = '';
   file = undefined;
  } catch (error) {
   if (signal.aborted) return;
   phase = 'error';
   canRetry = (error as {status?:number}).status !== 410;
   problem = message(error);
  }
 }
</script>

<button class="scan-trigger" type="button" {disabled} onclick={start} aria-label={'Generate QR for ' + label}>
 <QrCode size={16} aria-hidden="true"/> Generate QR
</button>

{#if open}
 <dialog class="scan-dialog" use:show aria-label={'Scan ' + label + ' from your phone'}
  oncancel={event => {event.preventDefault(); if (phase !== 'attaching') close();}}>
  <header>
   <h2>Scan from your phone</h2>
   <button class="scan-close" type="button" aria-label="Close QR scanner" disabled={phase === 'attaching'} onclick={close}><X size={20}/></button>
  </header>
  <div class="scan-body">
   {#if phase === 'waiting'}
    <img src={qr} width="240" height="240" alt="QR code to open the phone camera page" />
    <p>Scan this QR with your phone’s camera. Keep this window open to receive the {format === 'jpeg' ? 'photo' : 'PDF'}.</p>
    <p class="scan-time"><span>{remaining > 0 ? 'QR expires in' : 'Checking scan'}</span><strong>{scanCountdown(remaining)}</strong></p>
    {#if phoneUploading}<p role="status">Receiving photos from your phone…</p>{/if}
   {:else if phase === 'starting' || phase === 'receiving' || phase === 'attaching'}
    <p role="status">{phase === 'starting' ? 'Generating QR…' : phase === 'receiving' ? 'Receiving your scan…' : 'Adding your scan to ' + label + '…'}</p>
   {:else if phase === 'done'}
    <CheckCircle2 size={34} class="scan-check"/>
    <p role="status">Scan added to {label}.</p>
    <button class="scan-action" type="button" onclick={close}>Done</button>
   {:else}
    <p role="alert">{problem}</p>
    {#if phase === 'error' && canRetry && controller}
     <button class="scan-action" type="button" onclick={() => controller && receive(generation, controller.signal)}>Retry attachment</button>
    {:else}
     <button class="scan-action" type="button" {disabled} onclick={start}>Generate new QR</button>
    {/if}
   {/if}
  </div>
 </dialog>
{/if}

<style>
 .scan-trigger {display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:7px 10px;color:#0a645b;background:#edf7f4;border:1px solid #b7d8d0;border-radius:8px;font-size:13px;font-weight:700;vertical-align:middle;white-space:nowrap}
 .scan-trigger:hover:not(:disabled) {background:#dcefea}
 .scan-dialog {position:fixed;inset:0;margin:auto;width:min(420px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:0;background:#fff;color:#142b40;border:1px solid #cbd9e4;border-radius:16px;box-shadow:0 20px 60px #142b4044}
 .scan-dialog::backdrop {background:#142b4066}
 header {display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px 12px 20px;background:#142b40;color:#fff}
 header h2 {margin:0;color:inherit;font-size:18px}
 .scan-close {display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:8px;background:#ffffff17;color:inherit}
 .scan-body {display:grid;justify-items:center;gap:12px;padding:20px;text-align:center;color:#2e4559}
 .scan-body img {display:block;max-width:100%;height:auto;border:1px solid #d9e5eb;border-radius:10px}
 .scan-body p {margin:0;line-height:1.45}
 .scan-time {display:flex;align-items:center;justify-content:center;gap:10px;padding:6px 12px;border-radius:8px;background:#eef4f7}
 .scan-time strong {min-width:4ch;font-variant-numeric:tabular-nums}
 .scan-action {min-height:44px;padding:8px 14px;background:#08786b;color:#fff;border:0;border-radius:8px;font-weight:700}
 .scan-body :global(.scan-check) {color:#08786b}
</style>

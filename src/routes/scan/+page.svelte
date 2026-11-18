<script lang="ts">
 import {onMount, tick} from 'svelte';
 import {Camera, Check, Clock3, ScanLine} from '@lucide/svelte';
 import {scanCountdown, scanHeaders, scanResponse, type ScanStatus} from '$lib/phoneScan';

 type PagePhoto = {blob: Blob; preview: string};
 const endpoint = '/api/phone-scan/mobile';
 let token = '';
 let expires = 0;
 let interval: ReturnType<typeof setInterval>;
 let stream: MediaStream | undefined;
 let video = $state<HTMLVideoElement>(null!), nativeInput = $state<HTMLInputElement>(null!), photoInput = $state<HTMLInputElement>(null!);
 let work: XMLHttpRequest | undefined;
 let disposed = false;
 let session = $state<ScanStatus>();
 let remaining = $state(0), camera = $state(false), requesting = $state(false);
 let cameraFallback = $state(false);
 let processing = $state(false), submitting = $state(false), sent = $state(false), closed = $state(false);
 let progress = $state(0), status = $state(''), error = $state(''), previewRatio = $state('4 / 3');
 let pages = $state.raw<PagePhoto[]>([]);
 const limit = $derived(session?.format === 'jpeg' ? 1 : 50);
 const canCapture = $derived(!processing && !submitting && !closed && pages.length < limit);

 function updateClock() {
  remaining = expires - Date.now();
  if (remaining <= 0 && !submitting && !sent) {
   closed = true;
   stopCamera();
  }
 }

 async function load() {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {closed = true; return;}
  error = '';
  try {
   const data = await scanResponse<ScanStatus>(await fetch(endpoint, {credentials: 'omit', headers: scanHeaders(token), cache: 'no-store'}));
   if (disposed) return;
   session = data;
   sent = data.state === 'submitted';
   expires = Date.now() + data.expiresAt - data.now;
   updateClock();
  } catch (reason) {
   if ((reason as {status?: number}).status === 410) closed = true;
   else error = reason instanceof Error ? reason.message : 'The scan could not be opened.';
  }
 }

 onMount(() => {
  token = location.hash.slice(1);
  void load();
  interval = setInterval(() => {if (session && !sent) updateClock();}, 250);
  const pause = () => {if (document.hidden) stopCamera();};
  document.addEventListener('visibilitychange', pause);
  return () => {
   disposed = true;
   clearInterval(interval);
   document.removeEventListener('visibilitychange', pause);
   stopCamera();
   work?.abort();
   for (const page of pages) URL.revokeObjectURL(page.preview);
  };
 });

 function stopCamera() {
  for (const track of stream?.getTracks() ?? []) track.stop();
  stream = undefined;
  camera = false;
 }
 async function enableCamera() {
  if (!canCapture || requesting) return;
  if (!navigator.mediaDevices?.getUserMedia) {nativeInput.click(); return;}
  requesting = true;
  cameraFallback = false;
  error = '';
  try {
   const feed = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: 'environment'}, width: {ideal: 1920}, height: {ideal: 1440}}});
   if (disposed || closed || document.hidden) {feed.getTracks().forEach(track => track.stop()); return;}
   stream = feed;
   camera = true;
   await tick();
   video.srcObject = feed;
   await video.play();
  } catch {
   stopCamera();
   cameraFallback = true;
   error = 'Camera access is unavailable.';
  } finally {
   requesting = false;
  }
 }

 function encode(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
   canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The photo could not be prepared. Take it again.')), 'image/jpeg', quality);
  });
 }
 async function compress(source: CanvasImageSource, width: number, height: number, target: number) {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d', {alpha: false});
  if (!context || !width || !height) throw new Error('The photo could not be opened. Take it again.');
  let edge = Math.min(1800, Math.max(width, height));
  try {
   for (let attempt = 0; attempt < 6; attempt++) {
    const scale = edge / Math.max(width, height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const blob = await encode(canvas, attempt === 0 ? 0.82 : 0.72);
    if (blob.size <= target) return blob;
    edge *= 0.78;
   }
   throw new Error('This photo is too large. Retake it with the document filling the frame.');
  } finally {
   canvas.width = canvas.height = 0;
  }
 }
 async function fromPhoto(blob: Blob, target: number) {
  const url = URL.createObjectURL(blob);
  try {
   const img = new Image();
   img.src = url;
   await img.decode();
   return await compress(img, img.naturalWidth, img.naturalHeight, target);
  } finally {
   URL.revokeObjectURL(url);
  }
 }
 function add(blob: Blob) {
  if (disposed || closed || pages.length >= limit) return;
  pages = [...pages, {blob, preview: URL.createObjectURL(blob)}];
 }
 async function capture() {
  if (!canCapture || !video?.videoWidth) return;
  processing = true;
  error = '';
  try {add(await compress(video, video.videoWidth, video.videoHeight, 280 * 1024));}
  catch (reason) {error = (reason as Error).message;}
  finally {processing = false;}
 }
 async function pick(event: Event) {
  const input = event.currentTarget as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  if (!canCapture || !files.length) return;
  processing = true;
  error = '';
  try {
   const capacity = limit - pages.length;
   for (const photo of files.slice(0, capacity)) {
    if (disposed || closed) break;
    add(await fromPhoto(photo, 280 * 1024));
   }
   if (files.length > capacity) error = 'This scan has reached its photo limit.';
  } catch (reason) {
   error = (reason as Error).message || 'This photo format could not be opened. Take the photo again with the camera.';
  } finally {processing = false;}
 }
 function remove(index: number) {
  URL.revokeObjectURL(pages[index].preview);
  pages = pages.filter((_, position) => position !== index);
 }
 function upload(form: FormData): Promise<void> {
  return new Promise((resolve, reject) => {
   const request = new XMLHttpRequest();
   work = request;
   request.open('POST', endpoint);
   request.setRequestHeader('X-Phone-Scan', token);
   request.timeout = 90000;
   request.upload.onprogress = event => {if (event.lengthComputable) progress = Math.round(event.loaded * 100 / event.total);};
   request.onload = () => {
    if (request.status >= 200 && request.status < 300) {resolve(); return;}
    let detail = 'The scan could not be submitted. Try again.';
    try {detail = JSON.parse(request.responseText).error || detail;} catch { /* response unavailable */ }
    reject(Object.assign(new Error(detail), {status: request.status}));
   };
   request.onerror = request.ontimeout = request.onabort = () => reject(new Error('The connection was interrupted. Check whether the ERP received the scan before retrying.'));
   request.send(form);
  });
 }
 async function submit() {
  if (!session || !pages.length || processing || submitting || closed || remaining <= 0) return;
  submitting = true;
  progress = 0;
  error = '';
  status = 'Preparing ' + (session.format === 'jpeg' ? 'photo' : 'PDF') + '…';
  stopCamera();
  try {
   const form = new FormData();
   const budget = session.maxBytes - (session.format === 'pdf' ? 48 * 1024 : 0);
   const resize = pages.reduce((total, page) => total + page.blob.size, 0) > budget;
   const target = Math.floor(budget / pages.length);
   for (const page of pages) {
    if (disposed) return;
    const blob = resize && page.blob.size > target ? await fromPhoto(page.blob, target) : page.blob;
    form.append('page', blob, 'page.jpg');
   }
   status = 'Sending scan…';
   await upload(form);
   sent = true;
   for (const page of pages) URL.revokeObjectURL(page.preview);
   pages = [];
  } catch (reason) {
   if (!disposed) {
    const detail = reason instanceof Error ? reason.message : 'The scan could not be submitted.';
    if ((reason as {status?: number}).status === 413 || (reason as {status?: number}).status === 400) error = detail;
    else {
     await load();
     if (!sent) error = detail;
    }
   }
  } finally {
   work = undefined;
   submitting = false;
   status = '';
   if (!sent) updateClock();
  }
 }
</script>

<svelte:head>
 <title>Scan from your phone · Euro Suits ERP</title>
 <meta name="robots" content="noindex, nofollow, noarchive"/>
</svelte:head>

<main class="scanner">
 <header>
  <a class="brand" href="/" aria-label="Euro Suits ERP home"><img src="/logo.png" alt="" width="38" height="38"/><span>EURO SUITS</span></a>
  {#if session && !sent && !closed}
   <div class="time" class:urgent={remaining < 60000} role="timer" aria-label={'Time remaining ' + scanCountdown(remaining)}><Clock3 size={16} aria-hidden="true"/><strong aria-hidden="true">{scanCountdown(remaining)}</strong></div>
  {/if}
 </header>

 {#if sent || closed || !session}
  <section class="state">
   <div class="state-icon">{#if sent}<Check size={28}/>{:else if closed}<Clock3 size={28}/>{:else}<ScanLine size={28}/>{/if}</div>
   <h1>{sent ? 'Scan sent' : closed ? 'This QR has closed' : 'Opening your scan'}</h1>
   <p>{sent ? 'Return to the ERP to see the attachment in the upload field.' : closed ? 'Generate a new QR from the upload field and scan it again.' : error || 'Checking your secure scan link…'}</p>
   {#if !session && error && !closed}<button class="primary" type="button" onclick={load}>Try again</button>{/if}
  </section>
 {:else}
  <section class="content">
   <div class="intro">
    <h1>{limit === 1 ? 'Take a photo' : 'Scan documents'}</h1>
    <span class="page-count"><span aria-live="polite">{pages.length} of {limit}</span> {limit === 1 ? 'photo' : 'pages'}</span>
   </div>
   <input type="file" accept="image/*" capture="environment" bind:this={nativeInput} onchange={pick} hidden/>
   <input type="file" accept="image/*" multiple={limit > 1} bind:this={photoInput} onchange={pick} hidden/>

   {#if camera}
    <div class="viewfinder" style:aspect-ratio={previewRatio}>
     <!-- svelte-ignore a11y_media_has_caption -->
     <video bind:this={video} autoplay playsinline muted onloadedmetadata={() => {if (video.videoWidth && video.videoHeight) previewRatio = video.videoWidth + ' / ' + video.videoHeight;}}></video>
     <div class="frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    </div>
    {#if pages.length < limit}<button class="primary capture" type="button" disabled={!canCapture} onclick={capture}><Camera size={20}/>{processing ? 'Preparing photo…' : limit === 1 ? 'Capture photo' : 'Capture page'}</button>{/if}
   {:else if !submitting && pages.length < limit}
    <div class="camera-card">
     {#if cameraFallback}
      <button class="primary" type="button" disabled={!canCapture} onclick={() => nativeInput.click()}><Camera size={20}/>Take photo</button>
     {:else}
      <button class="primary" type="button" disabled={!canCapture || requesting} onclick={enableCamera}><Camera size={20}/>{requesting ? 'Waiting for permission…' : 'Enable camera'}</button>
     {/if}
     <button class="secondary" type="button" disabled={!canCapture} onclick={() => photoInput.click()}>Choose photos</button>
    </div>
   {/if}

   {#if error}<p class="error" role="alert">{error}</p>{/if}
   {#if pages.length}
    <ol class="pages" aria-label="Captured photos">
     {#each pages as page, index (page.preview)}
      <li><img src={page.preview} alt={'Captured page ' + (index + 1)} loading="lazy" width="110" height="110"/>
       <div><span>{index + 1}</span><button type="button" disabled={submitting || processing} aria-label={'Remove page ' + (index + 1)} onclick={() => remove(index)}>Remove</button></div>
      </li>
     {/each}
    </ol>
   {/if}
  </section>
  {#if pages.length}<footer>
   {#if submitting}<div class="progress" role="status"><span>{status}</span>{#if progress > 0}<progress max="100" value={progress} aria-label="Upload progress"></progress>{/if}</div>{/if}
   <button class="primary submit" type="button" disabled={!pages.length || processing || submitting || remaining <= 0} onclick={submit}>{submitting ? 'Submitting…' : limit === 1 ? 'Submit photo' : 'Submit PDF'}</button>
  </footer>{/if}
 {/if}
</main>

<style>
 .scanner {--ink:#142b40;--muted:#486075;--line:#d8e5ec;--teal:#08695d;--surface:#f2f7fa;min-height:100dvh;max-width:660px;margin:auto;padding:0 clamp(16px,4vw,28px) env(safe-area-inset-bottom);color:var(--ink);font-family:'DM Sans',system-ui,sans-serif}
 header {display:flex;justify-content:space-between;align-items:center;gap:8px;padding:calc(env(safe-area-inset-top) + 14px) 0 14px;border-bottom:1px solid var(--line)}
 .brand {display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;font-weight:800;letter-spacing:.03em;font-size:14px;line-height:1.3}
 .brand img {border-radius:9px;background:var(--ink)}
 .time {display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:8px;background:#e9f3f6;color:var(--ink);font-variant-numeric:tabular-nums}
 .time.urgent {background:#fff0e5;color:#8d3916}
 .time strong {min-width:4ch;text-align:center}
 .intro {display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:6px 12px;padding:20px 0 14px}
 .page-count {font-size:13px;font-variant-numeric:tabular-nums;color:var(--muted)}
 h1,p {margin:0}
 h1 {font-family:Manrope,system-ui,sans-serif;font-size:clamp(26px,6vw,36px);line-height:1.15;letter-spacing:-.035em}
 p {margin-top:8px;color:var(--muted);font-size:16px;line-height:1.45}
 button {touch-action:manipulation}
 .primary,.secondary {display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:9px 13px;border:1px solid transparent;border-radius:10px;font-size:15px;font-weight:750;line-height:1.2}
 .primary {background:var(--teal);color:#fff}
 .primary:active:not(:disabled) {background:#07554d}
 .secondary {background:#fff;color:var(--ink);border-color:#c7d9e3}
 .primary:disabled,.secondary:disabled {background:#e6eef2;color:#526b7d;border-color:#d8e5ec;cursor:default}
 .camera-card {display:grid;justify-items:center;gap:8px;padding:16px 12px;background:var(--surface);border:1px solid var(--line);border-radius:15px}
 .state-icon {display:grid;place-items:center;width:58px;height:58px;border-radius:16px;background:#dcefe9;color:var(--teal)}
 .capture {width:100%;margin-top:8px}
 .viewfinder {position:relative;display:grid;place-items:center;width:100%;max-height:min(49dvh,460px);min-height:180px;background:#102436;border-radius:14px;overflow:hidden}
 video {width:100%;height:100%;object-fit:contain}
 .frame {position:absolute;inset:9% 15%;pointer-events:none}
 .frame i {position:absolute;width:23px;height:23px;border:2px solid #f4fffd;border-radius:5px}
 .frame i:nth-child(1) {left:0;top:0;border-right:0;border-bottom:0}
 .frame i:nth-child(2) {right:0;top:0;border-left:0;border-bottom:0}
 .frame i:nth-child(3) {left:0;bottom:0;border-right:0;border-top:0}
 .frame i:nth-child(4) {right:0;bottom:0;border-left:0;border-top:0}
 .pages {display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));gap:8px;margin:12px 0 0;padding:0;list-style:none}
 .pages li {overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--surface)}
 .pages img {display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain}
 .pages li div {display:flex;justify-content:space-between;align-items:center;padding-left:10px}
 .pages li button {min-width:44px;min-height:44px;padding:0 7px;border:0;background:transparent;color:#92322f;font-size:12px;font-weight:700}
 .error {padding:9px 10px;border-radius:8px;background:#fae9e9;color:#852522}
 footer {position:sticky;bottom:0;padding:10px 0 max(8px,env(safe-area-inset-bottom));margin-top:14px;background:#f3f6f8}
 .submit {width:100%}
 .progress {display:grid;gap:3px;padding-bottom:8px;color:var(--muted)}
 progress {width:100%;accent-color:var(--teal)}
 .state {display:grid;justify-items:center;gap:10px;margin:clamp(32px,13dvh,120px) auto;padding:22px 16px;max-width:420px;text-align:center;border:1px solid var(--line);border-radius:16px;background:#fff}
</style>

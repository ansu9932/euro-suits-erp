<script lang="ts">
 import {fullPage, validCrop, type Corners, type Point} from './documentScanGeometry';

 let {src, width, height, detected, busy, onkeep, onretake}: {
  src: string; width: number; height: number; detected: Corners | null; busy: boolean;
  onkeep: (corners: Corners) => void; onretake: () => void;
 } = $props();

 const names = ['Top left', 'Top right', 'Bottom right', 'Bottom left'];
 let corners = $state<Corners>(fullPage);
 $effect(() => {corners = detected ?? fullPage;});
 let picture: HTMLDivElement;
 let drag = $state<{corner: number; pointer: number; offset: Point}>();
 const points = $derived(corners.map(({x, y}) => `${x * 100},${y * 100}`).join(' '));
 const magnified = $derived(drag && corners[drag.corner]);

 function move(corner: number, x: number, y: number) {
  const next = corners.map((point, index) => index === corner ? {
   x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y))
  } : point) as Corners;
  if (validCrop(next)) corners = next;
 }

 function start(event: PointerEvent, corner: number) {
  if (busy || drag || event.button !== 0) return;
  const rect = picture.getBoundingClientRect();
  drag = {corner, pointer: event.pointerId, offset: {
   x: corners[corner].x - (event.clientX - rect.left) / rect.width,
   y: corners[corner].y - (event.clientY - rect.top) / rect.height,
  }};
  (event.currentTarget as HTMLButtonElement).setPointerCapture(event.pointerId);
 }

 function slide(event: PointerEvent) {
  if (!drag || drag.pointer !== event.pointerId) return;
  const rect = picture.getBoundingClientRect();
  move(drag.corner, (event.clientX - rect.left) / rect.width + drag.offset.x, (event.clientY - rect.top) / rect.height + drag.offset.y);
 }

 function end(event: PointerEvent) {
  if (drag?.pointer === event.pointerId) drag = undefined;
 }

 function nudge(event: KeyboardEvent, corner: number) {
  const step = event.shiftKey ? 0.03 : 0.006;
  const point = corners[corner];
  const x = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
  const y = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
  if (!x && !y) return;
  event.preventDefault();
  move(corner, point.x + x, point.y + y);
 }
</script>

<section aria-label="Document crop">
 <div class="caption">
  <p>Drag the corners to fit the page.</p>
  <button type="button" class="reset" disabled={busy} onclick={() => {corners = fullPage;}}>Full photo</button>
 </div>

 <div class="photo-wrap">
  <div class="photo" bind:this={picture} style:--ratio={width / height}>
   <img class="source-photo" {src} alt="Captured document" draggable="false" />
   <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <path d={'M0,0 H100 V100 H0 Z M' + points + ' Z'} fill="#071a29" fill-opacity=".53" fill-rule="evenodd"/>
    <polygon {points} fill="none" stroke="#e8fffa" stroke-width="2" vector-effect="non-scaling-stroke"/>
   </svg>
   {#each corners as corner, index}
    <button class="handle" type="button" aria-label={names[index] + ' crop corner'}
     disabled={busy} style:left={corner.x * 100 + '%'} style:top={corner.y * 100 + '%'}
     onpointerdown={event => start(event, index)} onpointermove={slide} onpointerup={end} onpointercancel={end}
     onlostpointercapture={end} onkeydown={event => nudge(event, index)}></button>
   {/each}
  </div>
  {#if magnified}
   <div class="loupe" aria-hidden="true" class:bottom={magnified.y < 0.35}>
    <img {src} alt="" style:width={160 * Math.max(1, width / height) + 'px'}
     style:height={160 * Math.max(1, height / width) + 'px'}
     style:transform={`translate(-${magnified.x * 100}%, -${magnified.y * 100}%)`}/>
   </div>
  {/if}
 </div>

 <div class="actions">
  <button type="button" class="retake" disabled={busy} onclick={onretake}>Retake</button>
  <button type="button" class="keep" disabled={busy} onclick={() => onkeep($state.snapshot(corners))}>{busy ? 'Preparing page…' : 'Keep scan'}</button>
 </div>
</section>

<style>
 .caption {display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted,#486075)}
 .caption p {margin:0;font-size:14px;line-height:1.35}
 button {touch-action:manipulation}
 .reset {min-height:44px;padding:0 4px;border:0;background:transparent;color:var(--teal,#08695d);font-size:13px;font-weight:750;white-space:nowrap}
 .photo-wrap {position:relative;display:grid;place-items:center;margin:1px 0 12px;padding:22px;background:#132638;border-radius:13px}
 .photo {position:relative;width:min(100%,calc(min(56dvh,550px) * var(--ratio)));aspect-ratio:var(--ratio);user-select:none}
 .source-photo,svg {position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
 .handle {position:absolute;width:44px;height:44px;min-height:44px;padding:0;border:0;transform:translate(-50%,-50%);border-radius:50%;background:transparent;touch-action:none;cursor:grab;display:grid;place-items:center}
 .handle::after {content:'';width:17px;height:17px;box-sizing:border-box;border:2px solid #fff;border-radius:50%;background:#08786b;box-shadow:0 0 0 1px #243f4f,0 2px 5px #071a29a0}
 .handle:active {cursor:grabbing}
 .loupe {position:absolute;top:8px;left:8px;width:76px;height:76px;overflow:hidden;border:2px solid #fff;border-radius:10px;box-shadow:0 1px 8px #102436b0;pointer-events:none;background:#132638;z-index:2}
 .loupe.bottom {top:auto;bottom:8px}
 .loupe img {position:absolute;top:50%;left:50%;max-width:none}
 .loupe::after {content:'+';position:absolute;inset:0;display:grid;place-items:center;color:#e5fffa;font-size:19px;text-shadow:0 0 3px #142b40}
 .actions {display:grid;grid-template-columns:1fr 1.35fr;gap:8px}
 .retake,.keep {min-height:48px;border:1px solid #c7d9e3;border-radius:10px;font-size:15px;font-weight:750;padding:8px 12px;background:#fff;color:var(--ink,#142b40)}
 .keep {border-color:transparent;background:var(--teal,#08695d);color:#fff}
 button:disabled {opacity:.65;cursor:default}
 button:focus-visible {outline:2px solid #159487;outline-offset:2px}
</style>

<script lang="ts">
 import {Check,CodeXml,Copy,X} from '@lucide/svelte';
 import {enter} from './motion';

 let {disabled=false}:{disabled?:boolean}=$props();
 const titleId=$props.id();
 let open=$state(false);
 let copying=$state(false);
 let feedback=$state('');
 let copied=$state(false);
 let drawer=$state<HTMLDialogElement>();

 const componentSource=String.raw`import React, { useEffect, useId, useRef, useState } from 'react';

const quiet = [0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16];

function releaseCapture(capture) {
  clearTimeout(capture.timer);
  cancelAnimationFrame(capture.frame);
  if (capture.recorder) {
    capture.recorder.onstop = null;
    if (capture.recorder.state !== 'inactive') capture.recorder.stop();
  }
  capture.stream?.getTracks().forEach(track => track.stop());
  capture.context?.close().catch(() => {});
}

// transcribe(audio, { signal }) must resolve to the recognized text.
export default function VoiceDictation({ transcribe, label = 'Update comment' }) {
  const fieldId = useId();
  const active = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [message, setMessage] = useState('');
  const [comment, setComment] = useState('');
  const [levels, setLevels] = useState(quiet);

  function dispose() {
    const capture = active.current;
    if (!capture) return;
    active.current = null;
    capture.controller.abort();
    releaseCapture(capture);
  }

  useEffect(() => dispose, []);

  function finish(text) {
    dispose();
    setPhase('idle');
    setLevels(quiet);
    setMessage(text);
  }

  function stop() {
    const capture = active.current;
    if (capture?.recorder?.state !== 'recording') return;
    clearTimeout(capture.timer);
    cancelAnimationFrame(capture.frame);
    setPhase('transcribing');
    capture.recorder.stop();
    capture.stream.getTracks().forEach(track => track.stop());
  }

  async function start() {
    if (active.current) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      finish('Microphone recording is unavailable. You can still type.');
      return;
    }
    const capture = { controller: new AbortController(), chunks: [] };
    active.current = capture;
    setPhase('starting');
    setMessage('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (active.current !== capture) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      capture.stream = stream;
      const recorder = new MediaRecorder(stream);
      capture.recorder = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size) capture.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (active.current === capture) finish('Recording failed. Try again or type your comment.');
      };
      recorder.onstop = async () => {
        if (active.current !== capture) return;
        setPhase('transcribing');
        releaseCapture(capture);
        capture.context = undefined;
        capture.timer = setTimeout(() => {
          if (active.current === capture) finish('Transcription timed out. Try again or type your comment.');
        }, 25000);
        try {
          const audio = new Blob(capture.chunks, { type: recorder.mimeType });
          const text = audio.size
            ? (await transcribe(audio, { signal: capture.controller.signal })).trim()
            : '';
          if (active.current !== capture) return;
          if (text) setComment(current => current ? current.trimEnd() + ' ' + text : text);
          finish(text ? 'Text added. Review it before saving.' : 'No speech detected. Try again.');
        } catch {
          if (active.current === capture) finish('Could not transcribe. Try again or type your comment.');
        }
      };

      recorder.start(250);
      capture.timer = setTimeout(stop, 30000);
      setPhase('recording');

      if (!window.AudioContext || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      try {
        const context = new AudioContext();
        capture.context = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        context.resume().catch(() => {});
        const samples = new Uint8Array(analyser.fftSize);
        const groupSize = Math.floor(samples.length / quiet.length);
        let lastPaint = 0;
        const meter = now => {
          if (now - lastPaint >= 80) {
            analyser.getByteTimeDomainData(samples);
            setLevels(quiet.map((minimum, index) => {
              const start = index * groupSize;
              let energy = 0;
              for (let i = start; i < start + groupSize; i++) {
                energy += ((samples[i] - 128) / 128) ** 2;
              }
              return Math.min(1, minimum + Math.sqrt(energy / groupSize) * 4);
            }));
            lastPaint = now;
          }
          capture.frame = requestAnimationFrame(meter);
        };
        capture.frame = requestAnimationFrame(meter);
      } catch {
        // Recording still works when audio metering is unavailable.
      }
    } catch {
      if (active.current === capture) finish('Could not access the microphone. Check browser permissions.');
    }
  }

  const recording = phase === 'recording';
  const transcribing = phase === 'transcribing';
  const button = 'min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700';
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm font-semibold text-slate-900">{label}</label>
        <div className="flex flex-wrap items-center gap-2">
          {phase === 'idle' && <button type="button" className={button + ' border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'} onClick={start}>Dictate</button>}
          {recording && (
            <button type="button" className={button + ' flex items-center gap-2 border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100'} onClick={stop}>
              <span aria-hidden="true" className="flex h-5 items-center gap-0.5">
                {levels.map((level, index) => (
                  <span key={index} className="h-full w-0.5 rounded-full bg-current transition-transform motion-reduce:transition-none" style={{ transform: 'scaleY(' + level + ')' }} />
                ))}
              </span>
              Stop recording
            </button>
          )}
          {transcribing && <span aria-hidden="true" className="size-4 rounded-full border-2 border-teal-200 border-t-teal-700 motion-safe:animate-spin" />}
          {phase !== 'idle' && <button type="button" className={button + ' border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} onClick={() => finish('Dictation cancelled.')}>Cancel</button>}
        </div>
      </div>
      <textarea id={fieldId} value={comment} onChange={event => setComment(event.target.value)}
        className={'min-h-24 w-full rounded-xl border p-3 text-slate-900 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 '
          + (recording ? 'border-rose-400 bg-rose-50' : transcribing ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white')} />
      <span role="status" className="text-sm text-slate-700">
        {phase === 'starting' ? 'Waiting for microphone permission…' : recording ? 'Recording…' : transcribing ? 'Transcribing…' : message}
      </span>
    </div>
  );
}
`;

 function show(node:HTMLDialogElement){
  node.showModal();
  const motion=enter(node);
  return {destroy(){motion.destroy();if(node.open)node.close()}};
 }

 function close(){
  open=false;
  copied=false;
  copying=false;
  feedback='';
 }

 async function copyCode(){
  const current=drawer;
  if(copying||!current?.open)return;
  copying=true;
  try{
   await navigator.clipboard.writeText(componentSource);
   if(drawer!==current||!current.open)return;
   copied=true;
   feedback='Component copied.';
  }catch{
   if(drawer!==current||!current.open)return;
   copied=false;
   feedback='Could not copy automatically. Select and copy the code below.';
  }finally{
   if(drawer===current)copying=false;
  }
 }
</script>

<button type="button" class="dictation-code-trigger" aria-haspopup="dialog" aria-label="View React + Tailwind code" title="View React + Tailwind code" {disabled} onclick={()=>open=true}>
 <CodeXml size={16} aria-hidden="true"/>Code
</button>

{#if open}
 <dialog class="dictation-code" bind:this={drawer} aria-labelledby={titleId} use:show onclose={close}>
  <div class="dictation-code__header">
   <div class="dictation-code__title">
    <h3 id={titleId}>React + Tailwind component</h3>
    <span>VoiceDictation.jsx</span>
   </div>
   <div class="dictation-code__actions">
    <button type="button" class="dictation-code__copy" disabled={copying} onclick={copyCode}>
     {#if copied}<Check size={16} aria-hidden="true"/>{:else}<Copy size={16} aria-hidden="true"/>{/if}
     {copied?'Copied':'Copy component'}
    </button>
    <button type="button" class="dictation-code__close" onclick={()=>drawer?.close()}><X size={16} aria-hidden="true"/>Close</button>
   </div>
  </div>
  <p role="status" class="dictation-code__status">{feedback}</p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to focus the code region to scroll it.) -->
  <div class="dictation-code__source" role="region" aria-label="VoiceDictation.jsx source code" tabindex="0"><pre><code>{componentSource}</code></pre></div>
 </dialog>
{/if}

<style>
 .dictation-code-trigger{
  display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:5px 10px;
  border:1px solid var(--ui-header,#142b40);border-radius:8px;background:var(--ui-header,#142b40);
  color:#fff;font:inherit;font-size:.8125rem;font-weight:700;cursor:pointer
 }
 .dictation-code-trigger:hover:enabled{background:#25485e}
 .dictation-code-trigger:disabled{opacity:.55;cursor:default}
 .dictation-code-trigger:focus-visible{outline:2px solid #08746f;outline-offset:2px}
 .dictation-code{
  width:min(760px,calc(100% - 32px));max-width:none;max-height:min(84dvh,720px);
  margin:auto;padding:0;overflow:hidden;border:0;border-radius:16px;background:#0d1520;color:#e2e8f0;
  box-shadow:0 20px 56px #10243665;font-family:inherit
 }
 .dictation-code[open]{display:flex;flex-direction:column}
 .dictation-code::backdrop{background:#15253790}
 .dictation-code__header{
  display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  padding:12px 16px;background:var(--ui-header,#142b40);border-bottom:1px solid #34566c
 }
 .dictation-code__title{display:grid;gap:2px}
 .dictation-code__title h3{margin:0;color:#fff;font-size:1rem;line-height:1.3;font-weight:750}
 .dictation-code__title span{color:#bfcfdd;font:500 .8125rem/1.3 ui-monospace,SFMono-Regular,Consolas,monospace}
 .dictation-code__actions{display:flex;align-items:center;gap:8px}
 .dictation-code__actions button{
  display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 10px;border:1px solid transparent;
  border-radius:8px;color:#fff;font:inherit;font-size:.8125rem;font-weight:700;cursor:pointer;white-space:nowrap
 }
 .dictation-code__actions button:disabled{cursor:default;opacity:.6}
 .dictation-code__copy{min-width:136px;justify-content:center;background:#0c7469}
 .dictation-code__copy:hover:enabled{background:#0c655c}
 .dictation-code__close{background:#ffffff16}
 .dictation-code__close:hover{background:#ffffff28}
 .dictation-code__actions button:focus-visible{outline:2px solid #fff;outline-offset:2px}
 .dictation-code__status{margin:0;padding:8px 16px 0;color:#a8e2d3;font-size:.8125rem;font-weight:650}
 .dictation-code__status:empty{display:none}
 .dictation-code__source{
  min-height:0;padding:16px;overflow:auto;overscroll-behavior:contain;
  scrollbar-color:#657e90 #0d1520;user-select:text
 }
 .dictation-code__source:focus-visible{outline:2px solid #a8e2d3;outline-offset:-3px}
 .dictation-code pre{margin:0;color:#dbe7f0;font:400 .8125rem/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;tab-size:2}
</style>

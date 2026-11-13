<script lang="ts">
 import {Check} from '@lucide/svelte';
 import {signInPhase} from '../../signInTransition';
 import SpinnerLoader from './SpinnerLoader.svelte';

 const headingId = $props.id();
 const signingIn = $derived($signInPhase === 'authentication');

 function showTransition(dialog: HTMLDialogElement) {
  dialog.showModal();
  return {
   destroy() {
    dialog.close();
    if (document.activeElement === document.body) {
     document.querySelector<HTMLElement>('#workspace-content, #export-content')?.focus({preventScroll:true});
    }
   },
  };
 }
</script>

{#if $signInPhase}
<dialog
 use:showTransition
 class="erp-post-login"
 aria-label="Signing in to Euro Suits"
 data-phase={$signInPhase}
 oncancel={(event) => event.preventDefault()}
>
  <div class="sign-in-status">
   <div class="sign-in-logo"><img src="/logo.png" alt="Euro Suits" width="52" height="52"/></div>
   <h2 id={headingId} tabindex="-1" aria-live="polite">{signingIn ? 'Signing in…' : 'Opening your workspace…'}</h2>
   <ol aria-label="Sign-in progress">
    <li data-state={signingIn ? 'active' : 'complete'} aria-current={signingIn ? 'step' : undefined}>
     {#if signingIn}<SpinnerLoader size={16} label=""/>{:else}<Check size={16} aria-hidden="true"/>{/if}
     <span>{signingIn ? 'Verifying sign-in' : 'Signed in'}</span>
    </li>
    <li data-state={signingIn ? 'pending' : 'active'} aria-current={signingIn ? undefined : 'step'}>
     {#if signingIn}<span class="waiting-dot" aria-hidden="true"></span>{:else}<SpinnerLoader size={16} label=""/>{/if}
     <span>Loading dashboard</span>
    </li>
   </ol>
   <progress aria-labelledby={headingId}></progress>
  </div>
</dialog>
{/if}

<style>
 .erp-post-login {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  box-sizing: border-box;
  margin: 0;
  padding: 24px;
  border: 0;
  background: #f9fbfb;
  color: #142b3a;
  font-family: var(--hig-font, system-ui, sans-serif);
 }
 .erp-post-login[open] { display: grid; place-items: center; }
 .erp-post-login::backdrop { background: #f9fbfb; }
 .sign-in-status { width: min(100%, 400px); text-align: center; }
 .sign-in-logo {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  border-radius: 16px;
  background: #142b3a;
 }
 .sign-in-logo img { display: block; object-fit: contain; }
 h2 { margin: 0 0 20px; font-size: 22px; font-weight: 700; line-height: 1.3; }
 ol {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
 }
 li { display: inline-flex; align-items: center; gap: 7px; color: #475569; font-size: 13px; line-height: 1.5; }
 li[data-state='active'], li[data-state='complete'] { color: #0a675b; font-weight: 650; }
 .waiting-dot { display: grid; width: 16px; height: 16px; place-items: center; }
 .waiting-dot::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
 progress {
  display: block;
  appearance: none;
  width: 112px;
  height: 3px;
  margin: 24px auto 0;
  border: 0;
  border-radius: 3px;
  color: #0a7a6b;
  background: #e0eae7;
  overflow: hidden;
 }
 progress:indeterminate {
  background: linear-gradient(90deg, #0a7a6b 40%, transparent 40%) -70px 0 / 112px 100% no-repeat #e0eae7;
  animation: loading 1.4s linear infinite;
 }
 progress::-webkit-progress-bar { background: transparent; }
 @keyframes loading { to { background-position: 112px 0; } }
 @media (prefers-reduced-motion: reduce) {
  progress:indeterminate { animation: none; background-position: 33px 0; }
 }
 @media (forced-colors: active) {
  .erp-post-login, .erp-post-login::backdrop { background: Canvas; color: CanvasText; }
  .sign-in-logo { forced-color-adjust: none; }
  li, li[data-state] { color: CanvasText; }
  progress:indeterminate { border: 1px solid CanvasText; }
 }
</style>

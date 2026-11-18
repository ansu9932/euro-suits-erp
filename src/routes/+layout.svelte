<script lang="ts">
 import {onMount} from 'svelte';
 import {reportClientIssue} from '$lib/diagnostics';
 import {installActionLocks} from '$lib/actionLock';
 import {navigating} from '$app/state';
 import {installReportDownloads} from '$lib/loading';
 import {PageLoader,PostLoginTransition} from '$lib/components/loaders';
 import {signInPhase} from '$lib/signInTransition';
 import ERPLanguage from '$lib/ERPLanguage.svelte';
 import {loadLanguagePreferences} from '$lib/languagePreferences';
 import {languagePanel} from '$lib/languagePanel';
 import {resetTranslationSession} from '$lib/chatLanguage';
 import ERPChat from '$lib/ERPChat.svelte';
 import {sessionUserID} from '$lib/api';
 import {page} from '$app/state';
 import LoaderHost from '$lib/LoaderHost.svelte';
 import '../interactions.css';
 import '../readability.css';
 import '$lib/styles/enterprise-forms/index.css';
 import '$lib/styles/clean-workspace.css';
 import '$lib/styles/sky.css';
 import '$lib/styles/hig-dashboard.css';
 import '$lib/components/loaders/loader-integration.css';
 let {children}=$props();
 const routePending=$derived(!!navigating.to && (
  navigating.from?.url.pathname !== navigating.to.url.pathname ||
  navigating.from?.url.search !== navigating.to.url.search
 ));
 $effect(()=>{
  if(!$sessionUserID)return;
  const stop=loadLanguagePreferences($sessionUserID);
  return ()=>{stop();languagePanel.set(null);resetTranslationSession();};
 });
 onMount(()=>{
  const removeActionLocks=installActionLocks();
  const removeReportDownloads=installReportDownloads();
  const expired=()=>sessionUserID.set(null);
  window.addEventListener('erp:session-expired',expired);
  const runtime=()=>reportClientIssue('runtime'),promise=()=>reportClientIssue('promise');
  window.addEventListener('error',runtime);window.addEventListener('unhandledrejection',promise);
  return()=>{window.removeEventListener('erp:session-expired',expired);removeActionLocks();removeReportDownloads();window.removeEventListener('error',runtime);window.removeEventListener('unhandledrejection',promise)};
 });
</script>
<div style="display:contents" inert={routePending}>
 {@render children()}
</div>
<PageLoader isLoading={routePending && !$signInPhase} enhanced/>
<PostLoginTransition/>
<LoaderHost/>

{#if $sessionUserID&&page.url.pathname!=='/'&&page.url.pathname!=='/privacy'&&page.url.pathname!=='/guide'&&!/^\/scan\/?$/.test(page.url.pathname)}
 {#key $sessionUserID}<ERPLanguage/><ERPChat userId={$sessionUserID}/>{/key}
{/if}

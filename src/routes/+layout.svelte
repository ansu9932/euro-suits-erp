<script lang="ts">
 import {onMount} from 'svelte';
 import {reportClientIssue} from '$lib/diagnostics';
 import {installActionLocks} from '$lib/actionLock';
 import {navigating} from '$app/state';
 import {installReportDownloads} from '$lib/loading';
 import {PageLoader,PostLoginTransition} from '$lib/components/loaders';
 import {signInPhase} from '$lib/signInTransition';
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
 onMount(()=>{
  const removeActionLocks=installActionLocks();
  const removeReportDownloads=installReportDownloads();
  const runtime=()=>reportClientIssue('runtime'),promise=()=>reportClientIssue('promise');
  window.addEventListener('error',runtime);window.addEventListener('unhandledrejection',promise);
  return()=>{removeActionLocks();removeReportDownloads();window.removeEventListener('error',runtime);window.removeEventListener('unhandledrejection',promise)};
 });
</script>
<div style="display:contents" inert={routePending}>
 {@render children()}
</div>
<PageLoader isLoading={routePending && !$signInPhase} enhanced/>
<PostLoginTransition/>
<LoaderHost/>

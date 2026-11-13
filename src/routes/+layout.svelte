<script lang="ts">
 import {onMount} from 'svelte';
 import {reportClientIssue} from '$lib/diagnostics';
 import {installActionLocks} from '$lib/actionLock';
 import {onNavigate} from '$app/navigation';
 import {beginFullScreen,installReportDownloads} from '$lib/loading';
 import LoaderHost from '$lib/LoaderHost.svelte';
 import '../interactions.css';
 import '../readability.css';
 import '$lib/styles/enterprise-forms/index.css';
 import '$lib/styles/clean-workspace.css';
 import '$lib/styles/sky.css';
 import '$lib/styles/hig-dashboard.css';
 import '$lib/components/loaders/loader-integration.css';
 let {children}=$props();
 onNavigate(navigation=>{
  if(!navigation.from||navigation.from.url.pathname===navigation.to?.url.pathname)return;
  const finish=beginFullScreen('Opening your workspace…');
  void navigation.complete.catch(finish);
  return()=>{void finish()};
 });
 onMount(()=>{
  const removeActionLocks=installActionLocks();
  const removeReportDownloads=installReportDownloads();
  const runtime=()=>reportClientIssue('runtime'),promise=()=>reportClientIssue('promise');
  window.addEventListener('error',runtime);window.addEventListener('unhandledrejection',promise);
  return()=>{removeActionLocks();removeReportDownloads();window.removeEventListener('error',runtime);window.removeEventListener('unhandledrejection',promise)};
 });
</script>
{@render children()}
<LoaderHost/>

<script lang="ts">
 import {ChevronDown,Users,Link as LinkIcon} from '@lucide/svelte';
 import {enter} from './motion';
 import {reportingTree,reportingManagerIds,type ReportingBranch} from './reporting';
 import type {Row} from './types';
 let {users, currentUserId, search='', onedit}:{users:Row[];currentUserId:number;search?:string;onedit:(u:Row)=>void}=$props();
 let roots=$derived(reportingTree(users,search));
 let collapsed=$state<string[]>([]);
 let byId=$derived(new Map(users.filter(u=>!u.is_developer).map(u=>[u.id,u])));
 let directCounts=$derived.by(()=>{
  const counts=new Map<number,number>();
  for(const u of users.filter(u=>!u.is_developer))for(const id of reportingManagerIds(u))counts.set(id,(counts.get(id)||0)+1);
  return counts;
 });
 function toggle(path:string){collapsed=collapsed.includes(path)?collapsed.filter(p=>p!==path):[...collapsed,path]}
 function collapseAll(){
  const paths:string[]=[];
  function visit(nodes:ReportingBranch[],parent=''){for(const node of nodes){const path=parent+'/'+node.user.id;if(node.children.length)paths.push(path);visit(node.children,path)}}
  visit(roots);collapsed=paths;
 }
 function otherManagers(u:Row,parentId?:number){return reportingManagerIds(u).filter(id=>id!==parentId).map(id=>byId.get(id)?.name||'Unavailable manager').join(', ')}
</script>

{#snippet branches(items:ReportingBranch[],parentPath='',parent:Row|null=null)}
 {#each items as node(node.user.id)}
  {@const u=node.user}
  {@const path=parentPath+'/'+u.id}
  {@const open=!!search.trim()||!collapsed.includes(path)}
  {@const count=directCounts.get(u.id)||0}
  {@const shared=reportingManagerIds(u).length>1}
  <li class="org-tree__branch">
   <article class="org-tree__person" class:org-tree__person--root={!parent} class:org-tree__person--manager={count>0} class:org-tree__person--shared={node.reference} aria-label={`${u.name}, ${u.username}`}>
    <div class="org-tree__identity">
     <span class="org-tree__avatar" aria-hidden="true">{u.name.trim().split(/\s+/).map((n:string)=>n[0]).slice(0,2).join('')}</span>
     <div class="org-tree__name"><strong>{u.name}</strong><span>{u.designation||u.role}</span><small>@{u.username}{u.department?' · '+u.department:''}{u.territory?' · '+u.territory:''}</small></div>
     <div class="org-tree__tags">
      {#if !parent}<span class="org-tree__tag">{reportingManagerIds(u).length?'Reporting manager unavailable':'No reporting manager'}</span>{/if}
      {#if shared}<span class="org-tree__tag org-tree__tag--shared"><LinkIcon size={13}/>{reportingManagerIds(u).length} managers</span>{/if}
      {#if !u.active}<span class="org-tree__tag org-tree__tag--inactive">Disabled account</span>{/if}
     </div>
    </div>
    <div class="org-tree__relationship">
     {#if parent}<p>Reports to <strong>{parent.name}</strong><span class="org-tree__account"> (@{parent.username})</span></p>{/if}
     {#if parent&&otherManagers(u,parent.id)}<p>Also reports to <strong>{otherManagers(u,parent.id)}</strong></p>{/if}
     {#if node.reference}<p class="org-tree__shared-note"><LinkIcon size={13}/>Same account shown in another branch.{count?' Their team is shown at the first listing.':''}</p>{/if}
    </div>
    <div class="org-tree__actions">
     {#if node.children.length}<button class="org-tree__toggle" aria-expanded={open} aria-controls={open?'org-branch'+path.replaceAll('/','-'):undefined} aria-label={`${open?'Hide':'Show'} direct reports for ${u.name} (${u.username})`} disabled={!!search.trim()} onclick={()=>toggle(path)}><ChevronDown size={17} class={open?'org-tree__chevron--open':''}/><Users size={15}/>{count} direct {count===1?'report':'reports'}</button>
     {:else if !node.reference}<span class="org-tree__leaf">{count?`${count} direct reports · filtered out`:'No direct reports'}</span>{/if}
     <button class="button secondary small-button org-tree__edit" disabled={u.id===currentUserId} onclick={()=>onedit(u)}>Edit access</button>
    </div>
   </article>
   {#if node.children.length&&open}<ul class="org-tree__children" id={'org-branch'+path.replaceAll('/','-')} aria-label={`Direct reports of ${u.name} (${u.username})`} use:enter>{@render branches(node.children,path,u)}</ul>{/if}
  </li>
 {/each}
{/snippet}

<div class="org-tree">
 <div class="org-tree__heading"><div><h2>Who reports to whom</h2><p>Follow each branch from a manager to their direct reports. People with multiple managers appear in each reporting line.</p></div><div class="org-tree__controls"><button class="button secondary" disabled={!!search.trim()||!roots.length} onclick={()=>collapsed=[]}>Expand all</button><button class="button secondary" disabled={!!search.trim()||!roots.length} onclick={collapseAll}>Collapse all</button></div></div>
 <div class="org-tree__legend"><span><span class="org-tree__key org-tree__key--manager"></span>Manager / team</span><span><span class="org-tree__key org-tree__key--shared"></span>Shared report — same account</span>{#if search.trim()}<span role="status">Matching people and their managers are expanded.</span>{/if}</div>
 <ul class="org-tree__roots" aria-label="Organisation reporting structure">{@render branches(roots)}</ul>
 {#if !roots.length}<p class="empty">No matching employees. Try another name, department or designation.</p>{/if}
 <p class="org-tree__footnote">Reporting shows responsibility only. Companies, teams, buyers and permissions are assigned separately in Edit access.</p>
</div>

<style>
 /* Scoped BEM classes prevent dashboard avatar/card rules from obscuring hierarchy. */
 .org-tree{padding:24px;overflow:auto;color:#203c4e}
 .org-tree ul{list-style:none;padding:0;margin:0}
 .org-tree__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
 .org-tree__heading h2{font-size:20px;margin:0 0 8px;color:#173447}
 .org-tree__heading p{font-size:13px;line-height:1.6;max-width:70ch;margin:0;color:#526574}
 .org-tree__controls{display:flex;gap:8px;flex-shrink:0}
 .org-tree__legend{display:flex;flex-wrap:wrap;gap:12px 20px;padding-bottom:16px;font-size:12px;color:#42586a}
 .org-tree__legend>span{display:flex;align-items:center;gap:7px}
 .org-tree__key{width:10px;height:10px;border-radius:3px;border:1px solid currentColor}
 .org-tree__key--manager{background:#d9efea;color:#176657}.org-tree__key--shared{background:#deebfc;color:#285b95}
 .org-tree__branch{position:relative}
 .org-tree__person{border:1px solid #ccd9e0;border-radius:10px;background:#fff;padding:14px;margin-bottom:12px;min-width:310px}
 .org-tree__identity{display:flex;gap:12px;align-items:center}
 .org-tree__avatar{display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;border-radius:9px;background:#edf2f5;color:#324f62;font-size:13px;font-weight:700}
 .org-tree__name{min-width:0;flex:1;display:grid;gap:4px;overflow-wrap:anywhere}
 .org-tree__name strong{font-size:15px;color:#173447}.org-tree__name>span{font-size:13px;color:#3b5364}.org-tree__name small{font-size:12px;color:#526574}
 .org-tree__tags{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;max-width:240px}
 .org-tree__tag{display:inline-flex;align-items:center;gap:5px;background:#eaf0f4;color:#344f62;border-radius:5px;padding:4px 7px;font-size:11px;font-weight:600}
 .org-tree__tag--shared{background:#e1edff;color:#24518b}.org-tree__tag--inactive{background:#fff0d6;color:#80530b}
 .org-tree__relationship{margin:10px 0 0 52px;font-size:12px;line-height:1.6;overflow-wrap:anywhere}
 .org-tree__relationship:empty{display:none}.org-tree__relationship p{margin:2px 0;color:#405969}.org-tree__account{color:#526574;margin-left:4px}
 .org-tree__shared-note{display:flex;align-items:center;gap:6px}.org-tree__shared-note :global(svg){flex-shrink:0}
 .org-tree__actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:10px 0 0 52px}
 .org-tree__toggle{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:6px 10px;border:1px solid #b9d5ce;border-radius:7px;color:#145b4e;background:#edf8f4;font-size:12px;font-weight:600}
 .org-tree__toggle:hover:not(:disabled){background:#dcf0e8}.org-tree__toggle:disabled{cursor:default;opacity:1}
 .org-tree__toggle :global(svg:first-child){transform:rotate(-90deg);transition:transform 180ms ease-out}
 .org-tree__toggle :global(svg.org-tree__chevron--open){transform:rotate(0deg)}
 .org-tree__edit{margin-left:auto;min-height:44px}.org-tree__leaf{font-size:12px;color:#526574}
 .org-tree .org-tree__children{margin-left:20px;padding-left:24px;border-left:1px solid #92afa9}
 .org-tree__children>.org-tree__branch:before{content:'';position:absolute;left:-24px;top:34px;width:24px;border-top:1px solid #92afa9}
 .org-tree__footnote{font-size:12px;color:#526574;line-height:1.6;margin:16px 0 0;padding-top:16px;border-top:1px solid #dae4e8}
 .org-tree button:focus-visible{outline:3px solid #2563eb;outline-offset:3px}
 /* Desktop colour hierarchy: labeled states also work without colour. */
 @media(min-width:1024px){
  .org-tree{padding:20px;scrollbar-color:#78968e #f2f6f5}
  .org-tree__roots{max-width:1120px}
  .org-tree__person--manager{background:#f1f9f6;border-color:#a6cabe}
  .org-tree__person--manager .org-tree__avatar{background:#176657;color:#fff}
  .org-tree__person--root{background:#edf3f8;border-color:#afc4d3}
  .org-tree__person--root .org-tree__avatar{background:#203f56;color:#fff}
  .org-tree__person--shared{background:#f2f6fd;border-color:#b5cbe8}
  .org-tree__person--shared .org-tree__avatar{background:#285b95;color:#fff}
  .org-tree__person{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:16px}
  .org-tree__identity{align-items:flex-start;grid-column:1}
  .org-tree__relationship{grid-column:1}
  .org-tree__actions{grid-column:2;grid-row:1 / 3;flex-direction:column;align-items:flex-end;justify-content:center;margin:0;gap:6px}
  .org-tree__tags{max-width:160px}
  .org-tree__edit{padding:8px 12px}
 }
 @media(max-width:1023px){.org-tree__heading{flex-wrap:wrap}.org-tree__tags{max-width:150px}}
 @media(max-width:640px){.org-tree{padding:14px}.org-tree .org-tree__children{margin-left:12px;padding-left:14px}.org-tree__children>.org-tree__branch:before{left:-14px;width:14px}.org-tree__identity{flex-wrap:wrap}}
 @media(prefers-reduced-motion:reduce){.org-tree__toggle :global(svg:first-child){transition:none}}
 @media(prefers-contrast:more){.org-tree__person,.org-tree__children{border-color:currentColor}.org-tree__children>.org-tree__branch:before{border-color:currentColor}}
</style>

import {writable} from 'svelte/store';
import {trackAction} from './actionLock';
import {minimumWindow,MINIMUM_LOADING_MS} from './loadingWindow';
export {minimumWindow,MINIMUM_LOADING_MS} from './loadingWindow';

type Operation={id:number;label:string};
const operations=writable<Operation[]>([]);
export const activeOperations={subscribe:operations.subscribe};
export const downloadError=writable('');
let sequence=0;

/** Reference counting prevents one finished task from hiding another task. */
export function beginFullScreen(label:string){
 const id=++sequence,start=Date.now();let finished=false;
 operations.update(items=>[...items,{id,label}]);
 return async()=>{
  if(finished)return;finished=true;
  const remaining=MINIMUM_LOADING_MS-(Date.now()-start);
  if(remaining>0)await new Promise(resolve=>setTimeout(resolve,remaining));
  operations.update(items=>items.filter(item=>item.id!==id));
 };
}

export function withFullScreen<T>(label:string,work:()=>T|PromiseLike<T>):Promise<T>{
 const finish=beginFullScreen(label);
 return trackAction(minimumWindow(work)).finally(finish);
}
export function withAction<T>(work:()=>T|PromiseLike<T>):Promise<T>{return trackAction(minimumWindow(work))}

const downloads=new Map<string,Promise<void>>();
export function downloadReport(url:string,fallback='report.xlsx'):Promise<void>{
 const existing=downloads.get(url);if(existing)return trackAction(existing);
 const request=withFullScreen('Preparing your export…',async()=>{
  const response=await fetch(url,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok){
   if(response.status===401)window.dispatchEvent(new Event('erp:session-expired'));
   const body=await response.json().catch(()=>null);
   throw new Error(body?.error||'The export could not be prepared. Please try again.');
  }
  const blob=await response.blob();
  const header=response.headers.get('Content-Disposition')||'';
  const encoded=/filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
  const plain=/filename="([^"]+)"|filename=([^;]+)/i.exec(header);
  let name=plain?.[1]||plain?.[2]||fallback;
  if(encoded){try{name=decodeURIComponent(encoded)}catch{/* Keep the plain filename. */}}
  name=name.replace(/[\\/\u0000-\u001f\u007f]/g,'-').trim()||fallback;
  const objectURL=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=objectURL;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(objectURL),10000);
 }).finally(()=>{if(downloads.get(url)===request)downloads.delete(url)});
 downloads.set(url,request);return request;
}

/** Existing authorized report links retain their URL, scope and server filename.
 * Ordinary document links/new-tab previews continue using the browser directly. */
export function installReportDownloads(){
 const click=(event:MouseEvent)=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
  if(!link||link.target==='_blank')return;
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin||!url.pathname.startsWith('/api/')||
   !(/\/export(?:\/|$)/.test(url.pathname)||url.pathname==='/api/exports/statement'||url.searchParams.get('format')==='xlsx'))return;
  event.preventDefault();downloadError.set('');
  void downloadReport(url.href,link.download||'report.xlsx').catch(error=>downloadError.set(error instanceof Error?error.message:'Export failed. Please try again.'));
 };
 // Capture after actionLock, before SvelteKit treats an API link as a route.
 document.addEventListener('click',click,true);
 return()=>document.removeEventListener('click',click,true);
}

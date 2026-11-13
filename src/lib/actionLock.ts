import {mount,unmount} from 'svelte';
import SpinnerLoader from './components/loaders/SpinnerLoader.svelte';
// Local draft clicks have a short guard. Real requests extend it through their
// two-second execution window. No form values or request payloads are stored.
type Lock = {until:number;pending:number;timer:ReturnType<typeof setTimeout>|null;ariaDisabled:string|null;ariaBusy:string|null;width:number;ink:string;styles:Map<string,string>;indicator?:HTMLElement;spinner?:ReturnType<typeof mount>;nativeOwned?:boolean;observer?:MutationObserver;inputValue?:string};
const locks = new Map<HTMLElement,Lock>();
let current:HTMLElement[]=[];
let contextTimer:ReturnType<typeof setTimeout>|undefined;

function restore(node:HTMLElement, lock:Lock){
 lock.observer?.disconnect();
 if(lock.nativeOwned&&(node instanceof HTMLButtonElement||node instanceof HTMLInputElement))node.disabled=false;
 if(lock.spinner)void unmount(lock.spinner);
 lock.indicator?.remove();
 if(lock.inputValue!==undefined&&node instanceof HTMLInputElement&&node.value==='Working…')node.value=lock.inputValue;
 for(const [property,value] of lock.styles){if(value)node.style.setProperty(property,value);else node.style.removeProperty(property)}
 node.removeAttribute('data-request-loading');
 node.removeAttribute('data-action-locked');
 for(const [name,value] of [['aria-disabled',lock.ariaDisabled],['aria-busy',lock.ariaBusy]]){
  if(value===null)node.removeAttribute(name!);else node.setAttribute(name!,value!);
 }
 locks.delete(node);
}
function schedule(node:HTMLElement,lock:Lock){
 if(lock.timer)clearTimeout(lock.timer);
 if(lock.pending)return;
 lock.timer=setTimeout(()=>{if(!lock.pending)restore(node,lock)},Math.max(0,lock.until-Date.now()));
}
function acquire(node:HTMLElement){
 let lock=locks.get(node);
 if(!lock){lock={until:Date.now()+650,pending:0,timer:null,ariaDisabled:node.getAttribute('aria-disabled'),ariaBusy:node.getAttribute('aria-busy'),width:node.getBoundingClientRect().width,ink:getComputedStyle(node).color,styles:new Map()};locks.set(node,lock);node.setAttribute('data-action-locked','');node.setAttribute('aria-disabled','true');}
 schedule(node,lock);
}
function loading(node:HTMLElement,lock:Lock){
 if(node instanceof HTMLFormElement)return;
 if(node.hasAttribute('data-request-loading'))return;
 node.setAttribute('data-request-loading','');
 if(!node.hasAttribute('data-loader-owned')&&(node instanceof HTMLButtonElement||node instanceof HTMLAnchorElement)){
  for(const property of ['width','min-width','max-width','position','--action-loader-ink'])lock.styles.set(property,node.style.getPropertyValue(property));
  if(lock.width>0){for(const property of ['width','min-width','max-width'])node.style.setProperty(property,lock.width+'px')}
  if(getComputedStyle(node).position==='static')node.style.position='relative';
  node.style.setProperty('--action-loader-ink',lock.ink);
  // Keep Svelte's original nodes in place: wrapping/replacing them would break
  // conditional labels and bound components. The decorative layer hides them.
  const indicator=document.createElement('span');indicator.className='erp-action-loader';indicator.setAttribute('aria-hidden','true');
  node.append(indicator);lock.indicator=indicator;
  lock.spinner=mount(SpinnerLoader,{target:indicator,props:{size:18,label:'Working…'}});
 }else if(node instanceof HTMLInputElement&&['submit','button'].includes(node.type)){
  lock.inputValue=node.value;node.value='Working…';
 }
 // Native disabling waits until event activation/HTML validation has run. The
 // capture guard is immediate. Respect component-owned disabled conditions.
 queueMicrotask(()=>{
  if(locks.get(node)!==lock||!lock.pending)return;
  if((node instanceof HTMLButtonElement||node instanceof HTMLInputElement)&&!node.disabled){
   const observer=new MutationObserver(()=>{lock.nativeOwned=false});
   observer.observe(node,{attributes:true,attributeFilter:['disabled']});
   node.disabled=true;observer.takeRecords();lock.nativeOwned=true;lock.observer=observer;
  }
 });
}
function context(nodes:HTMLElement[]){
 current=nodes;
 if(contextTimer)clearTimeout(contextTimer);
 contextTimer=setTimeout(()=>{current=[]},0);
}
function block(event:Event){event.preventDefault();event.stopImmediatePropagation();}

export function installActionLocks(){
 const click=(event:MouseEvent)=>{
  const target=event.target instanceof Element?event.target.closest<HTMLElement>('button,input[type="submit"],input[type="button"],a.button,a[download],a[href*="/export"],[role="button"]'):null;
  if(!target||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(locks.has(target)||target.matches(':disabled')||target.getAttribute('aria-disabled')==='true'){block(event);return;}
  acquire(target);context([target]);
 };
 const submit=(event:SubmitEvent)=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement))return;
  if(locks.has(form)){block(event);return;}
  const targets:HTMLElement[]=[form];
  if(event.submitter instanceof HTMLElement)targets.push(event.submitter);
  // Do not set native disabled in click capture: that would cancel the first
  // button's default form submission before validation/onsubmit can run.
  targets.forEach(acquire);context(targets);
 };
 const change=(event:Event)=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement)||input.type!=='file')return;
  if(locks.has(input)){block(event);return;}
  acquire(input);context([input]);
 };
 document.addEventListener('click',click,true);
 document.addEventListener('submit',submit,true);
 document.addEventListener('change',change,true);
 return()=>{
  document.removeEventListener('click',click,true);document.removeEventListener('submit',submit,true);document.removeEventListener('change',change,true);
  if(contextTimer)clearTimeout(contextTimer);current=[];
  for(const [node,lock] of locks){if(lock.timer)clearTimeout(lock.timer);restore(node,lock);}
 };
}

export function trackAction<T>(request:Promise<T>):Promise<T>{
 const targets=[...current].filter(node=>locks.has(node));
 for(const node of targets){const lock=locks.get(node)!;lock.pending++;node.setAttribute('aria-busy','true');loading(node,lock);schedule(node,lock);}
 return request.finally(()=>{
  for(const node of targets){const lock=locks.get(node);if(!lock)continue;lock.pending--;lock.until=Math.max(lock.until,Date.now()+250);schedule(node,lock);}
 });
}

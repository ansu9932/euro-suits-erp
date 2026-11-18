<script lang="ts">
 import {onMount,tick} from 'svelte';
 import {afterNavigate,replaceState} from '$app/navigation';
 import {page} from '$app/state';
 import {ArrowLeft,Bell,Check,CheckCheck,ChevronDown,Download,FileText,Languages,Maximize2,MessageCircle,Mic,Minimize2,MoreHorizontal,Paperclip,Plus,Search,Send,Square,Users,X} from '@lucide/svelte';
 import {api,csrf} from './api';
 import {createChatRecognition,createKannadaTranslation,type Recognition} from './chatLanguage';
 import './styles/erp-chat.css';

 type Person={id:number;name:string;department:string;email?:string;online:boolean};
 type Thread={id:number;kind:'direct'|'group';name:string;peer_id:number;department:string;online:boolean;preview:string;created_at:string|null;unread:number;member_count:number};
 type Attachment={id:number;name:string;kind:'image'|'video'|'audio'|'file';size:number};
 type Message={id:number;sender_id:number;name:string;department:string;kind:'text'|'system';body:string;created_at:string;read_count:number;attachments?:Attachment[]};
 type Typing={id:number;name:string;remaining_ms:number};
 type Settings='new'|'group'|'email'|'clear'|'leave';
 type EmailMode='immediate'|'offline_delay'|'off';

 const kannada=createKannadaTranslation();
 const maxFiles=5,maxMedia=12*1024*1024;
 const blockingSurfaces=[
  'dialog[open]','[aria-modal="true"]','[role="dialog"]',
  '.drawer-backdrop','.sample-overlay','.company-modal-backdrop',
  '.company-editor','.material-detail','#enquiry-detail-title','#export-task-title',
  '.enquiry-editor','.ex-editor','.sp-editor','.wa-editor','.capacity-editor',
  '.cancel-plan','.wa-replies__recipient'
 ].join(',');
 let {userId}:{userId:number}=$props();
 let blocked=$state(false),picked=$state<File[]>([]),fileInput=$state<HTMLInputElement>();
 let dictating=$state(false),speech:Recognition|undefined,speechTimer:ReturnType<typeof setTimeout>;
 let translating=$state(false),translationStatus=$state(''),translationTask:AbortController|undefined;
 let draftOriginal=$state(''),draftKannada=$state(''),translated=$state<Record<number,string>>({});
 let messageNodes=new Map<number,HTMLElement>();
 let uploadProgress=$state<number|null>(null);
 let opened=$state(false),expanded=$state(false),mobileThread=$state(false);
 let selected=$state<number|null>(null),details=$state<number|null>(null);
 let threads=$state<Thread[]>([]),messages=$state<Message[]>([]),members=$state<Person[]>([]);
 let total=$state(0),q=$state(''),people=$state<Person[]>([]),userLoading=$state(false);
 let loadingInbox=$state(true),loadingMessage=$state(false),hasOlder=$state(false),loadingOlder=$state(false);
 let disconnected=$state(false),error=$state(''),composeError=$state(''),draft=$state(''),sending=$state(false);
 let typing=$state<Typing[]>([]),menu=$state(false),settings=$state<Settings|null>(null);
 let groupName=$state(''),selectedPeople=$state<Person[]>([]),memberQuery=$state(''),memberResults=$state<Person[]>([]);
 let mode=$state<EmailMode>('offline_delay'),delay=$state(40),saving=$state(false),settingsReady=$state(false),settingsError=$state('');
 let tray=$state<HTMLButtonElement>(),searchInput=$state<HTMLInputElement>(),composer=$state<HTMLTextAreaElement>(),messageArea=$state<HTMLDivElement>();
 let disposed=false,revision='',refreshing=false,refreshQueued=false,threadGeneration=0,settingsGeneration=0;
 let typingTimer:ReturnType<typeof setTimeout>,pendingMessage:{thread:number;body:string;files:File[];id:string}|undefined;
 let initialGroupName='',visibleSince='',lastTyping=0,typingThread:number|null=null,reading=0,latestRead=0;
 const pollController=new AbortController();
 const thread=$derived(threads.find(item=>item.id===selected));
 const filtered=$derived(threads.filter(item=>[item.name,item.department].some(value=>value?.toLowerCase().includes(q.trim().toLowerCase()))));
 const visibleMemberResults=$derived(memberResults.filter(person=>!selectedPeople.some(item=>item.id===person.id)&&(settings!=='group'||!members.some(item=>item.id===person.id))));
 const peer=$derived(members.find(person=>person.id!==userId));
 const subtitle=$derived(thread?.kind==='group'?members.length+' members':(peer?.department||thread?.department||'ERP user')+' · '+((peer?.online??thread?.online)?'Online':'Offline'));
 const timeFormat=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
 const dayFormat=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric'});
 const listDayFormat=new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short'});
 const errorText=(e:unknown)=>(e instanceof Error?e.message:'Please try again.');
 const status=(e:unknown)=>(e as {status?:number})?.status;
 const url=(id:number)=>'/chat/conversations/'+id;
 const time=(value:string)=>timeFormat.format(new Date(value));
 const date=(value:string)=>dayFormat.format(new Date(value));
 const calendarDay=(value:Date)=>Date.UTC(value.getFullYear(),value.getMonth(),value.getDate());
 const age=(value:string)=>Math.round((calendarDay(new Date())-calendarDay(new Date(value)))/86400000);
 const dateLabel=(value:string)=>{
  const days=age(value);
  if(days===0)return 'Today';
  if(days===1)return 'Yesterday';
  return date(value)+(days>1?' · '+days+' days ago':'');
 };
 const previewTime=(value:string)=>{
  const days=age(value);
  return days===0?time(value):days===1?'Yesterday':days>1?days+' days ago':listDayFormat.format(new Date(value));
 };
 const fullTime=(value:string)=>date(value)+' · '+time(value);
 const mediaURL=(id:number)=>'/api/chat/attachments/'+id;
 const fileSize=(size:number)=>size>=1024*1024?(size/(1024*1024)).toFixed(1)+' MB':Math.max(1,Math.ceil(size/1024))+' KB';
 const initial=(name:string)=>name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>Array.from(part)[0]).join('').toUpperCase();

 function fitViewport(node:HTMLElement){
  const viewport=window.visualViewport;
  if(!viewport)return;
  const resize=()=>{
   node.style.setProperty('--chat-visible-width',viewport.width+'px');
   node.style.setProperty('--chat-visible-height',viewport.height+'px');
   node.style.setProperty('--chat-right-inset',Math.max(0,innerWidth-viewport.width-viewport.offsetLeft)+'px');
   node.style.setProperty('--chat-bottom-inset',Math.max(0,innerHeight-viewport.height-viewport.offsetTop)+'px');
  };
  const observer=new ResizeObserver(resize);
  observer.observe(document.body);
  viewport.addEventListener('resize',resize);
  viewport.addEventListener('scroll',resize);
  window.addEventListener('resize',resize);
  resize();
  return{destroy(){
   observer.disconnect();
   viewport.removeEventListener('resize',resize);
   viewport.removeEventListener('scroll',resize);
   window.removeEventListener('resize',resize);
  }};
 }

 function watchForms(node:HTMLElement){
  let frame=0;
  const check=()=>{
   frame=0;
   const covered=Array.from(document.querySelectorAll<HTMLElement>(blockingSurfaces)).some(element=>
    !node.contains(element)&&!!element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden'
   );
   if(covered===blocked)return;
   blocked=covered;
   if(covered){settings=null;menu=false;cancelSpeech();cancelTranslation();stopTyping();}
   else if(opened&&selected)void loadThread(selected,true);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(check);};
  const changes=new MutationObserver(schedule);
  changes.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open','hidden','aria-modal','aria-hidden','role','class','style']});
  check();
  return {destroy(){changes.disconnect();cancelAnimationFrame(frame);}};
 }

 function saveWindow(){
  try{sessionStorage.setItem('erp-chat-window-'+userId,JSON.stringify({opened,expanded,selected,mobileThread}));}catch{/* optional display preference */}
 }
 function openLink(){
  const requested=page.url.searchParams.get('chat');
  if(!requested||!/^[1-9]\d{0,14}$/.test(requested))return;
  opened=true;
  selectThread(Number(requested));
  const cleaned=new URL(location.href);
  cleaned.searchParams.delete('chat');
  replaceState(cleaned,page.state);
 }
 afterNavigate(()=>{if(!disposed)openLink()});

 onMount(()=>{
  if(!opened){
   try{
    const previous=JSON.parse(sessionStorage.getItem('erp-chat-window-'+userId)||'null');
    if(previous){opened=!!previous.opened;expanded=!!previous.expanded;selected=previous.selected??null;mobileThread=!!previous.mobileThread;}
   }catch{/* default closed */}
  }
  openLink();
  if(opened&&selected&&details!==selected)void loadThread(selected);
  void refresh(false);
  void eventLoop();
  const attended=()=>{if(!document.hidden){void refresh(true);void readVisible();}};
  window.addEventListener('focus',attended);
  document.addEventListener('visibilitychange',attended);
  return()=>{
   disposed=true;
   clearTimeout(typingTimer);
   pollController.abort();
   cancelSpeech();cancelTranslation();kannada.destroy();
   window.removeEventListener('focus',attended);
   document.removeEventListener('visibilitychange',attended);
  };
 });

 async function eventLoop(){
  let wait=1000;
  while(!disposed){
   try{
    const result=await fetch('/api/chat/events?since='+encodeURIComponent(revision),{signal:pollController.signal,cache:'no-store'});
    if(result.status===401){window.dispatchEvent(new Event('erp:session-expired'));return;}
    if(!result.ok)throw new Error('Chat connection interrupted.');
    const update=await result.json();
    revision=update.revision;
    const recovered=disconnected;
    disconnected=false;wait=1000;
    // A periodic reconciliation also covers presence expiration and Redis restarts.
    if(update.event==='chat:typing_indicator'&&!recovered){
     if(opened&&!blocked&&selected)void loadTyping(selected);
    }else void refresh(true);
   }catch{
    if(disposed)return;
    disconnected=true;
    await new Promise(resolve=>setTimeout(resolve,wait));
    wait=Math.min(wait*2,15000);
   }
  }
 }

 async function refresh(withThread:boolean){
  if(refreshing){refreshQueued=refreshQueued||withThread;return;}
  refreshing=true;
  try{
   const response=await api('/chat/conversations');
   if(disposed)return;
   threads=response.conversations;
   total=response.unread;
   if(withThread&&opened&&!blocked&&selected)await loadThread(selected,true);
  }catch(e){
   if(!disposed){error=errorText(e);disconnected=true;}
  }finally{
   loadingInbox=false;refreshing=false;
   if(refreshQueued&&!disposed){refreshQueued=false;void refresh(true);}
  }
 }

 function selectThread(id:number){
  if(selected!==id){
   stopTyping();cancelSpeech();cancelTranslation();
   picked=[];translated={};draftOriginal='';draftKannada='';
   threadGeneration++;details=null;messages=[];members=[];typing=[];draft='';menu=false;
   latestRead=0;reading=0;visibleSince='';selected=id;composeError='';
  }
  mobileThread=true;opened=true;error='';saveWindow();
  void loadThread(id);
 }

 async function loadThread(id:number,quiet=false){
  const version=++threadGeneration;
  if(!quiet||details!==id)loadingMessage=true;
  try{
   const response=await api(url(id)+'/messages');
   if(disposed||selected!==id||version!==threadGeneration)return;
   const nearLatest=!messageArea||messageArea.scrollHeight-messageArea.scrollTop-messageArea.clientHeight<80;
   const initialLoad=details!==id;
   const first=response.messages[0]?.id;
   const boundary=response.thread.visible_since as string;
   const cutoff=Date.now()-60*86400000;
   const older=first&&visibleSince===boundary?messages.filter(message=>message.id<first&&Date.parse(message.created_at)>=cutoff):[];
   visibleSince=boundary;
   messages=[...older,...response.messages];
   if(!older.length)hasOlder=response.more;
   members=response.members;
   applyTyping(response.typing);
   if(!threads.some(item=>item.id===id))void refresh(false);
   details=id;
   await tick();
   if(messageArea&&(nearLatest||initialLoad))messageArea.scrollTop=messageArea.scrollHeight;
   void readVisible();
  }catch(e){
   if(disposed||selected!==id||version!==threadGeneration)return;
   if(status(e)===404){
    selected=null;details=null;mobileThread=false;messages=[];members=[];settings=null;
    saveWindow();error='This conversation is no longer available to you.';
   }else error=errorText(e);
  }finally{if(version===threadGeneration)loadingMessage=false;}
 }

 async function loadOlder(){
  const id=selected,first=messages[0]?.id;
  if(!id||!first||loadingOlder)return;
  loadingOlder=true;
  try{
   const response=await api(url(id)+'/messages?before='+first);
   if(disposed||selected!==id||messages[0]?.id!==first||response.thread.visible_since!==visibleSince)return;
   const height=messageArea?.scrollHeight||0;
   messages=[...response.messages,...messages];hasOlder=response.more;
   await tick();
   if(messageArea)messageArea.scrollTop+=messageArea.scrollHeight-height;
  }catch(e){error=errorText(e);}finally{loadingOlder=false;}
 }

 async function readVisible(){
  const id=selected;const last=messages.at(-1)?.id;
  if(!id||details!==id||!last||last<=Math.max(latestRead,reading)||!opened||blocked||!mobileThread||document.hidden||!document.hasFocus()||
    !messageArea||messageArea.scrollHeight-messageArea.scrollTop-messageArea.clientHeight>80)return;
  reading=last;
  try{
   const result=await api(url(id)+'/read',{message_id:last});
   if(disposed||selected!==id||details!==id)return;
   latestRead=result.read_id;
   void refresh(false);
  }catch{/* a subsequent refresh retries the receipt */}
  finally{if(selected===id&&reading===last)reading=0;}
 }

 function applyTyping(values:Typing[]){
  clearTimeout(typingTimer);
  const captured=Date.now();
  typing=values.filter(person=>person.remaining_ms>0);
  function expire(){
   const elapsed=Date.now()-captured;
   typing=typing.filter(person=>person.remaining_ms>elapsed);
   if(typing.length)typingTimer=setTimeout(expire,Math.max(10,Math.min(...typing.map(person=>person.remaining_ms))-elapsed));
  }
  if(typing.length)typingTimer=setTimeout(expire,Math.min(...typing.map(person=>person.remaining_ms)));
 }
 async function loadTyping(id:number){
  try{
   const response=await api(url(id)+'/typing');
   if(!disposed&&selected===id&&opened)applyTyping(response.typing);
  }catch{/* typing expires locally */}
 }
 function sendTyping(id:number,active:boolean){
  void fetch('/api/chat/typing',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({conversation_id:String(id),active})}).catch(()=>{});
 }
 function onType(event:Event){
  const id=selected;
  if(!id)return;
  if(!(event.currentTarget as HTMLTextAreaElement).value.trim()){stopTyping();return;}
  if(typingThread===id&&Date.now()-lastTyping<850)return;
  typingThread=id;lastTyping=Date.now();sendTyping(id,true);
 }
 function stopTyping(){
  if(typingThread)sendTyping(typingThread,false);
  typingThread=null;lastTyping=0;
 }

 function addFiles(files:File[]){
  const total=(entries:File[])=>entries.reduce((sum,file)=>sum+file.size,0);
  const valid=files.filter(file=>file.size>0);
  if(valid.length!==files.length)composeError='Empty files cannot be sent.';
  const next=[...picked,...valid];
  if(next.length>maxFiles||total(next)>maxMedia){
   composeError='Attach up to five files and 12 MB total.';
   return;
  }
  picked=next;
  if(valid.length===files.length)composeError='';
 }
 function paste(event:ClipboardEvent){
  const files=Array.from(event.clipboardData?.files??[]);
  if(!files.length||sending)return;
  event.preventDefault();
  addFiles(files);
  const text=event.clipboardData?.getData('text/plain');
  if(text&&composer){
   const start=composer.selectionStart,end=composer.selectionEnd;
   const insertion=text.slice(0,Math.max(0,4000-draft.length+end-start));
   draft=draft.slice(0,start)+insertion+draft.slice(end);
   void tick().then(()=>composer?.setSelectionRange(start+insertion.length,start+insertion.length));
  }
 }
 function registerMessage(node:HTMLElement,id:number){
  messageNodes.set(id,node);
  return {destroy(){messageNodes.delete(id);}};
 }

 function cancelSpeech(){
  clearTimeout(speechTimer);
  const current=speech;
  speech=undefined;dictating=false;
  current?.abort();
 }
 function toggleDictation(){
  if(speech){speech.stop();return;}
  composeError='';
  try{
   const current=createChatRecognition(),target=selected;
   speech=current;
   current.onresult=event=>{
    if(speech!==current||selected!==target||blocked)return;
    const words:string[]=[];
    for(let i=event.resultIndex;i<event.results.length;i++){
     if(event.results[i].isFinal)words.push(event.results[i][0].transcript.trim());
    }
    if(words.length)draft=[draft.trimEnd(),words.join(' ')].filter(Boolean).join(' ').slice(0,4000);
   };
   current.onerror=event=>{
    if(speech!==current)return;
    if(event.error!=='aborted')composeError=event.error==='not-allowed'||event.error==='service-not-allowed'
     ?'Allow microphone access in your browser to use voice typing.'
     :event.error==='no-speech'?'No speech was detected. Try again.':'Voice typing is unavailable. Check your microphone and try again.';
   };
   current.onend=()=>{
    if(speech===current){speech=undefined;dictating=false;clearTimeout(speechTimer);}
   };
   current.start();dictating=true;
   speechTimer=setTimeout(()=>{if(speech===current)current.stop();},60000);
  }catch(e){
   cancelSpeech();composeError=errorText(e);
  }
 }

 function cancelTranslation(){
  translationTask?.abort();translationTask=undefined;
  translating=false;translationStatus='';
 }
 async function translate(message?:Message){
  if(translating||dictating)return;
  const target=selected,original=draft;
  let source=message?.body??original;
  if(message){
   const element=messageNodes.get(message.id),selection=window.getSelection();
   if(element&&selection?.anchorNode&&selection.focusNode&&element.contains(selection.anchorNode)&&element.contains(selection.focusNode)){
    source=selection.toString().trim()||source;
   }
  }
  if(!source.trim())return;
  const task=new AbortController();
  translationTask=task;translating=true;translationStatus='Preparing Kannada translation…';composeError='';
  try{
   const result=await kannada.translate(source,task.signal,progress=>{
    if(translationTask===task)translationStatus=progress<100?'Preparing Kannada · '+progress+'%':'Translating to Kannada…';
   });
   if(disposed||blocked||selected!==target||translationTask!==task)return;
   if(!result)throw new Error('The translation returned no text. Try again.');
   if(message)translated={...translated,[message.id]:result};
   else if(draft!==original){
    translationStatus='Your draft changed. Select Kannada again to translate the latest text.';
    return;
   }else if(result.length>4000){throw new Error('The Kannada translation is too long. Shorten the draft and try again.');}
   else{draftOriginal=original;draftKannada=result;draft=result;void tick().then(()=>composer?.focus());}
   translationStatus='';
  }catch(e){
   if(translationTask===task){composeError=errorText(e);translationStatus='';}
  }finally{
   if(translationTask===task){translating=false;translationTask=undefined;}
  }
 }

 async function send(event?:Event){
  event?.preventDefault();
  const id=selected,body=draft.trim(),files=picked;
  if(!id||(!body&&!files.length)||sending||dictating||translating)return;
  if(pendingMessage?.thread!==id||pendingMessage.body!==body||pendingMessage.files!==files){
   pendingMessage={thread:id,body,files,id:crypto.randomUUID()};
  }
  sending=true;composeError='';uploadProgress=files.length?0:null;
  try{
   let payload:FormData|{message:string;client_id:string}={message:body,client_id:pendingMessage.id};
   if(files.length){
    const upload=new FormData();
    upload.set('client_id',pendingMessage.id);upload.set('message',body);
    for(const file of files)upload.append('files',file);
    payload=upload;
   }
   const sent=await api(url(id)+'/messages',payload,'POST',files.length?progress=>{
    if(!disposed&&selected===id)uploadProgress=progress;
   }:undefined);
   if(disposed||selected!==id)return;
   if(draft.trim()===body)draft='';
   if(picked===files)picked=[];
   draftOriginal='';draftKannada='';
   pendingMessage=undefined;stopTyping();
   if(sent.message&&details===id){
    if(!messages.some(message=>message.id===sent.id))messages=[...messages,sent.message].sort((left,right)=>left.id-right.id);
    await tick();
   }else await loadThread(id);
   if(messageArea)messageArea.scrollTop=messageArea.scrollHeight;
   composer?.focus();void refresh(false);
  }catch(e){if(selected===id)composeError=errorText(e);}
  finally{sending=false;uploadProgress=null;}
 }

 function searchPeople(query:string,done:(result:Person[])=>void,onError:(message:string)=>void){
  let live=true;
  const timer=setTimeout(async()=>{
   try{
    const result=await api('/chat/users?q='+encodeURIComponent(query.trim()));
    if(live&&!disposed)done(result.users);
   }catch(e){if(live&&!disposed)onError(errorText(e));}
  },180);
  return()=>{live=false;clearTimeout(timer);};
 }
 $effect(()=>{
  const query=q;
  if(!opened||!query.trim()){people=[];userLoading=false;return;}
  userLoading=true;
  return searchPeople(query,result=>{people=result;userLoading=false;},message=>{people=[];userLoading=false;error=message;});
 });
 $effect(()=>{
  const query=memberQuery;
  if(settings!=='new'&&settings!=='group')return;
  return searchPeople(query,result=>memberResults=result,message=>settingsError=message);
 });

 async function direct(id:number){
  error='';
  try{
   const result=await api('/chat/conversations/direct',{user_id:id});
   q='';selectThread(result.id);void refresh(false);
  }catch(e){error=errorText(e);}
 }

 function show(){
  opened=true;saveWindow();void refresh(true);
  void tick().then(()=>searchInput?.focus());
 }
 function hide(){
  opened=false;settings=null;menu=false;cancelSpeech();cancelTranslation();stopTyping();saveWindow();
  void tick().then(()=>tray?.focus());
 }
 function backToList(){
  mobileThread=false;cancelSpeech();cancelTranslation();stopTyping();menu=false;saveWindow();
  void tick().then(()=>searchInput?.focus());
 }
 function showDialog(node:HTMLDialogElement){
  node.showModal();
  return{destroy(){node.close();}};
 }
 async function configure(kind:Settings){
  const generation=++settingsGeneration;
  settings=kind;menu=false;settingsError='';selectedPeople=[];memberQuery='';memberResults=[];
  initialGroupName=kind==='group'?(thread?.name??''):'';
  groupName=initialGroupName;
  settingsReady=kind!=='email';
  if(kind==='email'){
   try{
    const result=await api('/chat/preferences');
    if(settings===kind&&generation===settingsGeneration){mode=result.email_mode;delay=result.delay_minutes;settingsReady=true;}
   }catch(e){if(settings===kind&&generation===settingsGeneration)settingsError=errorText(e);}
  }
 }
 async function submitSettings(event:SubmitEvent){
  event.preventDefault();
  const kind=settings,id=selected;
  if(saving||!settingsReady)return;
  saving=true;settingsError='';
  try{
   if(kind==='email')await api('/chat/preferences',{email_mode:mode,delay_minutes:delay},'PATCH');
   if(kind==='new'){
    const created=await api('/chat/conversations/group',{name:groupName,user_ids:selectedPeople.map(person=>person.id)});
    selectThread(created.id);
   }
   if(id&&kind==='group'){
    if(groupName.trim()!==initialGroupName){
     await api(url(id)+'/rename',{name:groupName},'PATCH');
     initialGroupName=groupName.trim();
    }
    if(selectedPeople.length)await api(url(id)+'/participants',{user_ids:selectedPeople.map(person=>person.id)});
   }
   if(id&&kind==='clear'){
    await api(url(id)+'/clear',{});threadGeneration++;messages=[];hasOlder=false;
   }
   if(id&&kind==='leave'){
    await api(url(id)+'/leave',{},'DELETE');threadGeneration++;selected=null;details=null;mobileThread=false;messages=[];members=[];saveWindow();
   }
   settings=null;void refresh(true);
  }catch(e){settingsError=errorText(e);}
  finally{saving=false;}
 }
 async function removeMember(person:Person){
  const id=selected;
  if(!id||saving||!window.confirm('Remove '+person.name+' from this group?'))return;
  saving=true;settingsError='';
  try{
   await api(url(id)+'/participants/'+person.id,{},'DELETE');
   await refresh(true);
  }catch(e){settingsError=errorText(e);}
  finally{saving=false;}
 }
 const dialogTitle=$derived(settings==='new'?'New group':settings==='group'?'Group settings':settings==='email'?'Email notifications':settings==='clear'?'Clear chat from your view?':thread?.kind==='group'?'Leave this group?':'Hide this conversation?');
</script>

<svelte:window onkeydown={(event)=>{if(event.key==='Escape'&&opened&&!blocked&&!settings)menu?menu=false:hide();}}/>

<div class="erp-chat-root" use:fitViewport use:watchForms hidden={blocked} inert={blocked}>
 {#if !opened}
  <button class="chat-launch" type="button" bind:this={tray} onclick={show} aria-label={total?'Open ERP chat, '+total+' unread':'Open ERP chat'} title="ERP chat">
   <MessageCircle size={22}/><span>Chat</span>{#if total}<b class="chat-count">{total>99?'99+':total}</b>{/if}
  </button>
 {:else}
  <div class="chat-window" class:expanded class:mobile-thread={mobileThread&&selected!==null} role="dialog" aria-label="ERP chat">
   <header class="chat-top">
    <div><MessageCircle size={19}/><strong>ERP chat</strong>{#if total}<span class="chat-count" aria-label={total+' unread'}>{total>99?'99+':total}</span>{/if}</div>
    <div>
     <button type="button" class="chat-icon" title="Email notifications" aria-label="Email notifications" onclick={()=>configure('email')}><Bell size={18}/></button>
     <button type="button" class="chat-icon chat-resize" aria-label={expanded?'Use compact size':'Expand chat'} title={expanded?'Use compact size':'Expand chat'} onclick={()=>{expanded=!expanded;saveWindow();}}>{#if expanded}<Minimize2 size={18}/>{:else}<Maximize2 size={18}/>{/if}</button>
     <button type="button" class="chat-icon" aria-label="Collapse chat" title="Collapse chat" onclick={hide}><ChevronDown size={21}/></button>
    </div>
   </header>
   {#if disconnected}<div class="chat-connect" role="status">Reconnecting to chat…</div>{/if}
   {#if error}<div class="chat-error" role="alert"><span>{error}</span><button class="chat-icon" aria-label="Dismiss message" onclick={()=>error=''}><X size={16}/></button></div>{/if}
   <div class="chat-panes">
    <aside class="chat-list" aria-label="Conversations">
     <div class="chat-search-area">
      <div class="chat-search"><Search size={17}/><input bind:this={searchInput} bind:value={q} maxlength="120" placeholder="Search chats or people" aria-label="Search chats or people"/>{#if q}<button class="chat-icon" type="button" aria-label="Clear search" onclick={()=>q=''}><X size={15}/></button>{/if}</div>
      <button class="chat-new" type="button" onclick={()=>configure('new')}><Plus size={16}/> New group</button>
     </div>
     <div class="chat-thread-list">
      {#if loadingInbox}<p class="chat-muted">Loading conversations…</p>{/if}
      {#each filtered as item (item.id)}
       <button type="button" class="chat-thread" class:active={selected===item.id&&mobileThread} aria-current={selected===item.id&&mobileThread?'true':undefined} onclick={()=>selectThread(item.id)}>
        <span class="chat-avatar" class:group={item.kind==='group'} aria-hidden="true">{#if item.kind==='group'}<Users size={17}/>{:else}{initial(item.name)}<i class:online={item.online}></i>{/if}</span>
        <span class="chat-thread-text"><strong>{item.name}</strong><span>{item.preview||item.department||'Group conversation'}</span></span>
        <span class="chat-thread-meta">{#if item.created_at}<time datetime={item.created_at} title={fullTime(item.created_at)} aria-label={fullTime(item.created_at)}>{previewTime(item.created_at)}</time>{/if}{#if item.unread}<b class="chat-count" aria-label={item.unread+' unread'}>{item.unread>99?'99+':item.unread}</b>{/if}</span>
       </button>
      {/each}
      {#if q.trim()}
       <h3 class="chat-list-label">People</h3>
       {#each people as person (person.id)}
        <button type="button" class="chat-thread" onclick={()=>direct(person.id)}>
         <span class="chat-avatar" aria-hidden="true">{initial(person.name)}<i class:online={person.online}></i></span>
         <span class="chat-thread-text"><strong>{person.name}</strong><span>{person.department} · {person.online?'Online':'Offline'}</span></span>
        </button>
       {:else}<p class="chat-muted">{userLoading?'Searching…':'No matching people.'}</p>{/each}
      {:else if !loadingInbox&&!threads.length}<p class="chat-muted">Search for a colleague to start a chat.</p>{/if}
     </div>
    </aside>
    <div class="chat-main">
     {#if selected&&thread}
      <header class="chat-active">
       <button class="chat-icon chat-mobile-back" type="button" aria-label="Back to conversations" onclick={backToList}><ArrowLeft size={19}/></button>
       <span class="chat-avatar" class:group={thread.kind==='group'} aria-hidden="true">{#if thread.kind==='group'}<Users size={17}/>{:else}{initial(thread.name)}<i class:online={peer?.online??thread.online}></i>{/if}</span>
       <div class="chat-active-text"><h2>{thread.name}</h2><span>{subtitle}</span></div>
       {#if thread.kind==='group'}<button class="chat-icon" type="button" title="Group settings" aria-label="Group settings" onclick={()=>configure('group')}><Users size={18}/></button>{/if}
       <div class="chat-actions">
        <button class="chat-icon" type="button" title="Chat actions" aria-expanded={menu} aria-label="Chat actions" onclick={()=>menu=!menu}><MoreHorizontal size={21}/></button>
        {#if menu}<div class="chat-menu"><button onclick={()=>configure('clear')}>Clear chat (my view)</button><button class="chat-danger-text" onclick={()=>configure('leave')}>{thread.kind==='group'?'Leave group':'Hide conversation'}</button></div>{/if}
       </div>
      </header>
      <div class="chat-feed" bind:this={messageArea} onscroll={()=>void readVisible()} aria-label="Messages">
       {#if hasOlder}<button class="chat-older" type="button" onclick={loadOlder} disabled={loadingOlder}>{loadingOlder?'Loading…':'Load older messages'}</button>{/if}
       {#each messages as message,index (message.id)}
        {#if index===0||date(messages[index-1].created_at)!==date(message.created_at)}<div class="chat-day" title={date(message.created_at)}>{dateLabel(message.created_at)}</div>{/if}
        {#if message.kind==='system'}
         <p class="chat-system">{message.body}</p>
        {:else}
         <article class="chat-message" class:mine={message.sender_id===userId}>
          {#if message.sender_id!==userId&&thread.kind==='group'}<div class="chat-sender"><b>{message.name}</b> · {message.department}</div>{/if}
          {#if message.body}<p use:registerMessage={message.id}>{message.body}</p>{/if}
          {#each message.attachments??[] as attachment (attachment.id)}
           {#if attachment.kind==='image'}
            <a class="chat-image" href={mediaURL(attachment.id)} target="_blank" rel="noopener" title={'Open '+attachment.name}>
             <img src={mediaURL(attachment.id)} alt={attachment.name} loading="lazy" decoding="async"/>
            </a>
           {:else if attachment.kind==='video'}
            <!-- svelte-ignore a11y_media_has_caption -->
            <video class="chat-video" controls playsinline preload="none" src={mediaURL(attachment.id)} aria-label={attachment.name}></video>
           {:else if attachment.kind==='audio'}
            <audio class="chat-audio" controls preload="none" src={mediaURL(attachment.id)} aria-label={attachment.name}></audio>
           {/if}
           <a class="chat-file" href={mediaURL(attachment.id)+'?download=1'} download={attachment.name} data-sveltekit-preload-data="off" aria-label={'Download '+attachment.name} title={attachment.name}>
            <FileText size={16}/><span>{attachment.name}<small>{fileSize(attachment.size)}</small></span><Download size={15}/>
           </a>
          {/each}
          {#if translated[message.id]}
           <div class="chat-translated"><b>ಕನ್ನಡ</b><p lang="kn">{translated[message.id]}</p></div>
          {/if}
          <div class="chat-meta">
           {#if message.body}
            <button class="chat-message-translate" type="button" aria-label={translated[message.id]?'Hide Kannada translation':'Translate message to Kannada'} title={translated[message.id]?'Hide Kannada translation':'Translate message to Kannada'} disabled={translating||dictating}
             onpointerdown={event=>event.preventDefault()}
             onclick={()=>{if(translated[message.id]){const rest={...translated};delete rest[message.id];translated=rest;}else void translate(message);}}>
             <Languages size={14}/>
            </button>
           {/if}
           <time datetime={message.created_at} title={fullTime(message.created_at)}>{time(message.created_at)}</time>
           {#if message.sender_id===userId}
            <span class:chat-read={message.read_count>0} title={message.read_count?(thread.kind==='group'?'Read by '+message.read_count:'Read'):'Sent'} aria-label={message.read_count?'Read':'Sent'}>{#if message.read_count}<CheckCheck size={14}/>{:else}<Check size={14}/>{/if}</span>
           {/if}
          </div>
         </article>
        {/if}
       {:else}<div class="chat-empty"><p>{loadingMessage?'Loading messages…':'No messages yet.'}</p></div>{/each}
      </div>
      <div class="chat-typing" aria-live="polite">{#if typing.length}{typing.map(person=>person.name).join(', ')} {typing.length===1?'is':'are'} typing…{/if}</div>
      {#if composeError}<p class="chat-compose-error" role="alert">{composeError}</p>{/if}
      {#if picked.length}
       <div class="chat-pending" aria-label="Files to send">
        {#each picked as file,index}
         <div><FileText size={14}/><span title={file.name}>{file.name}</span><button class="chat-icon" type="button" aria-label={'Remove '+file.name} disabled={sending} onclick={()=>picked=picked.filter((_,i)=>i!==index)}><X size={14}/></button></div>
        {/each}
       </div>
      {/if}
      {#if uploadProgress!==null||dictating||translationStatus||draftOriginal&&draft===draftKannada}
       <div class="chat-composer-status" aria-live="polite">
        {#if uploadProgress!==null}<span>{uploadProgress<100?'Uploading · '+uploadProgress+'%':'Saving attachment…'}</span>
        {:else if dictating}<span>Listening…</span>{:else if translationStatus}<span>{translationStatus}</span>
        {:else}<button type="button" onclick={()=>{draft=draftOriginal;draftOriginal='';draftKannada='';}}>Undo translation</button>{/if}
       </div>
      {/if}
      <form class="chat-composer" onsubmit={send}>
       <input type="file" bind:this={fileInput} multiple hidden onchange={event=>{const input=event.currentTarget;addFiles(Array.from(input.files??[]));input.value='';}}/>
       <textarea bind:this={composer} bind:value={draft} rows="1" maxlength="4000" placeholder="Write a message" aria-label="Write a message" onpaste={paste} oninput={onType} onkeydown={(event)=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing)void send(event);}}></textarea>
       <div class="chat-composer-tools">
        <button type="button" class="chat-icon" title="Attach photos or files" aria-label="Attach photos or files" disabled={sending} onclick={()=>fileInput?.click()}><Paperclip size={18}/></button>
        <button type="button" class="chat-icon" class:chat-listening={dictating} aria-pressed={dictating} title={dictating?'Stop voice typing':'Voice to text'} aria-label={dictating?'Stop voice typing':'Voice to text'} disabled={sending||translating} onclick={toggleDictation}>{#if dictating}<Square size={16}/>{:else}<Mic size={18}/>{/if}</button>
        <button type="button" class="chat-icon" title="Translate draft to Kannada" aria-label="Translate draft to Kannada" disabled={!draft.trim()||translating||dictating||sending} onclick={()=>translate()}><Languages size={18}/></button>
        <button type="submit" class="chat-primary chat-send" aria-label="Send message" disabled={(!draft.trim()&&!picked.length)||sending||dictating||translating||details!==selected}><Send size={18}/></button>
       </div>
      </form>
     {:else}
      <div class="chat-empty chat-start"><MessageCircle size={30}/><h2>{loadingMessage?'Opening conversation…':'Select a conversation'}</h2></div>
     {/if}
    </div>
   </div>
  </div>
 {/if}

 {#if settings}
  <dialog class="chat-dialog" use:showDialog aria-labelledby="chat-dialog-title" onclose={()=>settings=null} oncancel={(event)=>{event.preventDefault();if(!saving)settings=null;}}>
   <form onsubmit={submitSettings}>
    <header><h2 id="chat-dialog-title">{dialogTitle}</h2><button type="button" class="chat-icon" aria-label="Close settings" disabled={saving} onclick={()=>settings=null}><X size={20}/></button></header>
    <div class="chat-dialog-body">
     {#if settingsError}<p class="chat-compose-error" role="alert">{settingsError}</p>{/if}
     {#if settings==='email'}
      {#if settingsReady}
       <label>Email me about new messages<select bind:value={mode}>
        <option value="immediate">Immediately</option><option value="offline_delay">After a delay if unread</option><option value="off">Never</option>
       </select></label>
       {#if mode==='offline_delay'}<label>Delay in minutes<input type="number" bind:value={delay} required min="1" max="60"/></label>{/if}
      {:else if !settingsError}<p>Loading preferences…</p>{/if}
     {:else if settings==='new'||settings==='group'}
      <label>Group name<input bind:value={groupName} required maxlength="120"/></label>
      {#if settings==='group'}
       <div class="chat-member-list" aria-label="Current members">
        {#each members as person (person.id)}
         <div><span>{person.name}{person.id===userId?' (you)':''}<small>{person.department}</small></span>
          {#if person.id!==userId}<button type="button" class="chat-icon chat-danger-text" title={'Remove '+person.name} aria-label={'Remove '+person.name} disabled={saving} onclick={()=>removeMember(person)}><X size={17}/></button>{/if}
         </div>
        {/each}
       </div>
      {/if}
      <label>{settings==='new'?'Add people':'Add more people'}<input bind:value={memberQuery} type="search" placeholder="Name, department or email" maxlength="120"/></label>
      {#if selectedPeople.length}<div class="chat-chips">{#each selectedPeople as person (person.id)}<button type="button" onclick={()=>selectedPeople=selectedPeople.filter(item=>item.id!==person.id)} aria-label={'Deselect '+person.name}>{person.name}<X size={14}/></button>{/each}</div>{/if}
      <div class="chat-member-list" aria-label="Available people">
       {#each visibleMemberResults as person (person.id)}
        <button type="button" onclick={()=>selectedPeople=[...selectedPeople,person]} disabled={selectedPeople.length+(settings==='group'?members.length:1)>=50}><span>{person.name}<small>{person.department}</small></span><Plus size={17}/></button>
       {:else}<small>No more matching people.</small>{/each}
      </div>
     {:else if settings==='clear'}<p>Messages currently in this conversation will disappear from your view. Other participants keep their history.</p>
     {:else}<p>{thread?.kind==='group'?'The group will disappear from your conversations and you’ll stop receiving new messages from it.':'The conversation will disappear from your list. You can start a new chat with the same person at any time.'}</p>{/if}
    </div>
    <footer>
     <button type="button" class="chat-secondary" disabled={saving} onclick={()=>settings=null}>Cancel</button>
     <button class="chat-primary" class:chat-danger={settings==='leave'} disabled={saving||!settingsReady||(settings==='new'&&!selectedPeople.length)} type="submit">{saving?'Saving…':settings==='new'?'Create group':settings==='clear'?'Clear chat':settings==='leave'?(thread?.kind==='group'?'Leave group':'Hide conversation'):'Save'}</button>
    </footer>
   </form>
  </dialog>
 {/if}
</div>

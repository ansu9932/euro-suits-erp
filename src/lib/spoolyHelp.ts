export type HelpGuide = {id:string;module:string;title:string;keywords:string;steps:string[];url?:string};
export type HelpContext = {guides:HelpGuide[];ai_available:boolean;languages:string[]};
export type HelpReply = {topic:string;steps:string[];source:'guide'|'gemini';explanation:string;notice:string};

const aliases:Record<string,string>={inovice:'invoice',ivoice:'invoice',invoic:'invoice',comany:'company',recipt:'receipt',recip:'receipt',banking:'bank',ebrc:'ebrc',jv:'jv',gst:'gst'};
const words=(s:string)=>s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').split(/\s+/).map(w=>aliases[w]||w).filter(w=>w.length>1&&!['how','can','the','and','for','with','this','that','want','need','please','does','what'].includes(w));
// Search runs only in the browser. Raw questions never leave this function.
export function findHelp(guides:HelpGuide[],query:string,context:string):HelpGuide[]{
 const tokens=words(query.slice(0,160));
 const preferred=/export|dispatch|warehouse|receipt|bank|reconciliation/i.test(context)?'exports':/compan|finance|kyc/i.test(context)?'company':/enquir|merch/i.test(context)?'enquiries':/material|fabric|trim|store/i.test(context)?'materials':/sampl/i.test(context)?'sampling':'operations';
 return guides.map((guide,index)=>{
  const haystack=words(guide.title+' '+guide.keywords);
  const hits=tokens.reduce((score,word)=>score+(haystack.some(term=>term===word||term.startsWith(word))?1:0),0);
  return {guide,index,score:tokens.length?hits*10:(guide.module===preferred?3:guide.module==='general'?2:1)};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.guide);
}

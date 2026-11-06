// Shared presentation vocabulary; server permissions and saved milestones own state.
export const processViews:Record<string,string>={
 fabric:'Fabric follow-up',trims:'Trims follow-up',approvals:'Update approvals',
 planning:'Plan follow-up',pattern:'Pattern follow-up',marker:'Marker follow-up',
 cutting:'Cutting follow-up',allocation:'Allocation follow-up',sampling:'Sample follow-up',
 finishing:'Finishing follow-up',audit:'Audit follow-up',merchant:'Merchandising handover',
 dispatch:'Final handover & AWB',all:'Sample report',issues:'Rework & rejection report'
};
export const processSteps=[
 ['fabric','Fabric','fabric_update_date'],['trims','Trims','trims_update_date'],
 ['pattern','Pattern','pattern_actual'],['marker','Marker','marker_actual'],
 ['cutting','Cut start','cut_started'],['cutting','Cut done','cut_actual'],
 ['allocation','Allocate','allocation_actual'],['sampling','Load','load_actual'],
 ['sampling','Sew','sewing_actual'],['finishing','Finish','finishing_actual'],
 ['audit','Audit','audit_actual'],['merchant','Merchant H/O','merchant_actual'],
 ['dispatch','Final H/O','handover_actual']
];
export const processLabel=(key:string)=>processViews[key]?.replace(' follow-up','')||key.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase());
export const actionLabel=(key:string)=>({fabric:'Fabric availability',trims:'Trims availability',plan:'Plan / tailor / DC',pattern:'Pattern completed',marker:'Marker completed',cut_start:'Cutting started',cut:'Cutting completed',allocate:'Tailor allocation',load:'Loaded to tailor',sew_start:'Sewing started',sew:'Sewing completed',finish_start:'Finishing started',finish:'Finishing completed',audit_start:'Audit started',audit:'Signed audit',merchant_handover:'Merchant handover',handover:'Final handover',file_review:'File review',buyer_feedback:'Buyer feedback',exception:'Stage issue',resolve:'Issue resolution'} as Record<string,string>)[key]||processLabel(key);
export const processTone=(row:any)=>row.production?.process_exception||['Rework','Rejected'].includes(row.status)||['Changes requested','Rejected'].includes(row.latest_update?.decision)?'issue':row.latest_update?.decision==='Pending'?'pending':row.status==='Handed over'?'complete':['Ready','Pattern ready','Marker ready','Cut'].includes(row.status)?'waiting':'active';
export const stamp=(value:unknown)=>{if(!value)return 'Not recorded';const s=String(value);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleString('en-GB',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' IST'};
export const planFields=[['sample_maker','Sample tailor / maker'],['pattern_by','Pattern by'],['cut_by','Cut by'],['pattern_plan_date','Pattern plan','date'],['cutting_plan_date','Cutting plan','date'],['allocation_plan_date','Allocation plan','date'],['sewing_plan_date','Sample completion plan','date'],['finishing_plan_date','Finishing plan','date'],['audit_plan_date','Audit plan','date'],['handover_plan_date','Final handover plan','date'],['handover_dc','Handover DC'],['enclosures','Enclosures']];

export const sampleStatusLabel=(status:string)=>({Ready:'Indent issued','Pattern ready':'Pattern complete','Marker ready':'Waiting for cutting',Cutting:'Cutting in progress',Cut:'Cut done · awaiting allocation',Allocated:'Tailor allocated',Loaded:'Loaded to sample tailor',Sewing:'Sample in progress',Sewn:'Sewing complete',Finishing:'Finishing in progress','Awaiting audit':'Waiting for audit',Audit:'Audit in progress',Approved:'Audit passed','With merchant':'With Merchandising',Showroom:'With showroom','Handed over':'Final handover complete',Rework:'QA rework',Rejected:'QA rejected'} as Record<string,string>)[status]||status;

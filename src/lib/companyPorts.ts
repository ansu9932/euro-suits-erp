import type {Row} from './types';

/** Match backend validation: an ICD and a sea port share one default slot. */
export function companyPortDefaultGroup(port:Row, registry:Row[]): 'Sea' | 'Air' | null {
 const mode=registry.find(item=>String(item.id)===String(port.id))?.mode;
 return mode==='Air'?'Air':mode==='Sea'||mode==='ICD'?'Sea':null;
}

/** Only default flags change; linked ports, registration data and files remain. */
export function setCompanyPortDefault(ports:Row[],registry:Row[],index:number,checked:boolean):void {
 const selected=ports[index];if(!selected)return;
 const group=companyPortDefaultGroup(selected,registry);
 selected.default=checked&&group!==null;
 if(selected.default)for(let i=0;i<ports.length;i++){
  if(i!==index&&companyPortDefaultGroup(ports[i],registry)===group)ports[i].default=false;
 }
}

export function changeCompanyPort(ports:Row[],registry:Row[],index:number,value:string):void {
 const selected=ports[index];if(!selected)return;
 selected.id=registry.find(item=>String(item.id)===value)?.id??'';
 // A default row moving to another mode must not duplicate that mode's default.
 if(selected.default)setCompanyPortDefault(ports,registry,index,true);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleFormDocument} from '../src/lib/sampleFormPdf.ts';
function allText(value){if(typeof value==='string'||typeof value==='number')return [String(value)];if(Array.isArray(value))return value.flatMap(allText);if(value&&typeof value==='object')return Object.values(value).flatMap(allText);return []}
function fixture(){const piece={id:1400,size:'',colour:'Navy',production:{}};return {piece,detail:{record:{id:13,buyer_name:'Fixture buyer',profile:{legacy_indent_number:'SR1554',length_metres:0,pattern_plan_date:'2099-12-31'},bom:[]},pieces:[piece],files:[],issues:[]}}}
test('registered garment and original source numbers remain distinct',()=>{const {piece,detail}=fixture();const text=allText(sampleFormDocument('indent',detail,piece,()=>'' )).join(' ');assert.match(text,/Indent #1400/);assert.match(text,/Original Excel indent SR1554/);assert.throws(()=>sampleFormDocument('indent',detail,{id:999},()=>''));});
test('missing audit data never creates a signature, decision or measurements',()=>{const {piece,detail}=fixture();const text=allText(sampleFormDocument('audit',detail,piece,()=>'' )).join(' ');assert.doesNotMatch(text,/Electronically signed|\[x\]|undefined|null/);assert.doesNotMatch(text,/Fixture auditor/);});
test('zero quantities remain present and planned dates do not become actual dates',()=>{const {piece,detail}=fixture();piece.production.pattern_plan_date='2099-12-31';const text=allText(sampleFormDocument('indent',detail,piece,()=>'' )).join(' ');assert.match(text,/\b0\b/);assert.doesNotMatch(text,/2099/);});
test('latest saved audit supplies actual measurements and QA identity',()=>{const {piece,detail}=fixture();piece.production.audit_reports=[{auditor:'Earlier auditor',measurements:[{point:'Outdated point',actual:'555'}]},{revision:2,auditor:'Fixture auditor',signed_at:'2026-11-06T04:00:00Z',result:'Rework',measurements:[{point:'Chest',required:100,actual:99.5,tolerance:0,unit:'cm'}]}];const text=allText(sampleFormDocument('audit',detail,piece,()=>'' )).join(' ');assert.match(text,/Fixture auditor/);assert.match(text,/99\.5/);assert.match(text,/\[x\] Re Work/);assert.doesNotMatch(text,/Earlier auditor|Outdated point/);});
test('entered markup remains a plain PDF text node',()=>{const {piece,detail}=fixture();detail.record.profile.description='<script>doNotExecute()</script>';const document=sampleFormDocument('indent',detail,piece,()=>'' );assert(allText(document).includes('<script>doNotExecute()</script>'));assert.equal(document.pageSize,'A4');});

test('saved indent remarks appear as bold plain text in their own full-width row',()=>{
 const {piece,detail}=fixture();
 const message='Check <shade> against swatch.\nKeep contrast stitching.';
 detail.record.profile.email_message=message;
 detail.record.profile.special_remarks='Existing production remarks.';
 const indent=sampleFormDocument('indent',detail,piece,()=>'' );
 const remarkRow=indent.content.flatMap(item=>item.table?.body||[]).find(row=>row[0]?.stack?.[0]?.text==='SPECIAL REMARK');
 assert.equal(remarkRow.length,1);
 assert.equal(remarkRow[0].stack[0].bold,true);
 assert.equal(remarkRow[0].stack[1].bold,true);
 assert.equal(remarkRow[0].stack[1].text,message);
 assert(allText(indent).includes('Existing production remarks.'));
 assert(!allText(sampleFormDocument('audit',detail,piece,()=>'' )).includes(message));
});

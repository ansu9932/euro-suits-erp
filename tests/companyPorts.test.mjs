import {test} from 'node:test';
import assert from 'node:assert/strict';
import {companyPortDefaultGroup,setCompanyPortDefault,changeCompanyPort} from '../src/lib/companyPorts.ts';
const registry=[{id:1,mode:'Air'},{id:2,mode:'Sea'},{id:3,mode:'ICD'},{id:4,mode:'Air'}];
test('sea and ICD share a default category while air remains separate',()=>{
 assert.equal(companyPortDefaultGroup({id:'3'},registry),'Sea');
 assert.equal(companyPortDefaultGroup({id:1},registry),'Air');
 const ports=[{id:1,default:true},{id:2,default:true},{id:3,default:false}];
 setCompanyPortDefault(ports,registry,2,true);
 assert.deepEqual(ports.map(p=>p.default),[true,false,true]);
 setCompanyPortDefault(ports,registry,1,true);
 assert.deepEqual(ports.map(p=>p.default),[true,true,false]);
});
test('choosing a second airport replaces only the previous airport',()=>{
 const ports=[{id:1,default:true},{id:3,default:true},{id:4,default:false}];
 setCompanyPortDefault(ports,registry,2,true);
 assert.deepEqual(ports.map(p=>p.default),[false,true,true]);
 setCompanyPortDefault(ports,registry,2,false);
 assert.deepEqual(ports.map(p=>p.default),[false,true,false]);
});
test('changing a default port across transport groups resolves the new conflict',()=>{
 const ports=[{id:1,default:true},{id:2,default:true}];
 changeCompanyPort(ports,registry,1,'4');
 assert.deepEqual(ports,[{id:1,default:false},{id:4,default:true}]);
 changeCompanyPort(ports,registry,1,'');
 assert.deepEqual(ports[1],{id:'',default:false});
 setCompanyPortDefault(ports,registry,1,true);assert.equal(ports[1].default,false);
});
test('resolving an existing conflict preserves every port, registration and document',()=>{
 const ports=[{id:1,default:true},{id:2,default:true,registered:true,registration:'Synthetic',bank_id:'bank-1',documents:[7],reminder_enabled:true,reminder_emails:['test@example.invalid']},{id:3,default:true}];
 const before=structuredClone(ports);
 setCompanyPortDefault(ports,registry,2,true);
 assert.equal(ports.length,3);assert.equal(ports[1].default,false);
 assert.deepEqual(ports.map(({default:ignored,...p})=>p),before.map(({default:ignored,...p})=>p));
});

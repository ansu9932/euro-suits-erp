import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportingManagerIds,reportingManagerAllowed,reportingTree} from '../src/lib/reporting.ts';
const user=(id,managers=[],extra={})=>({id,name:`User ${id}`,active:true,reports_to_ids:managers,...extra});
const flat=nodes=>nodes.flatMap(node=>[node,...flat(node.children)]);
test('plural managers preserve explicit clear and legacy values',()=>{
 assert.deepEqual(reportingManagerIds({reports_to_id:7}),[7]);
 assert.deepEqual(reportingManagerIds({reports_to_id:7,reports_to_ids:[]}),[]);
 assert.deepEqual(reportingManagerIds({reports_to_ids:[7,8,7]}),[7,8]);
});
test('all manager branches participate in self/cycle eligibility',()=>{
 const staff=[user(1),user(2),user(3,[1,2]),user(4,[3])];
 assert.equal(reportingManagerAllowed(staff[3],2,staff),false);
 assert.equal(reportingManagerAllowed(staff[1],2,staff),false);
 assert.equal(reportingManagerAllowed(staff[0],2,staff),true);
 assert.equal(reportingManagerAllowed(user(9,[],{active:false}),2,staff),false);
 assert.equal(reportingManagerAllowed(user(9,[],{is_developer:true}),2,staff),false);
});
test('tree/search show both reporting branches and each descendant subtree once',()=>{
 const staff=[user(1),user(2),user(3,[1,2]),user(4,[3])];
 const tree=reportingTree(staff);assert.deepEqual(tree.map(n=>n.user.id),[1,2]);
 assert.equal(flat(tree).filter(n=>n.user.id===3).length,2);
 assert.equal(flat(tree).filter(n=>n.user.id===4).length,1);
 assert.equal(tree[1].children[0].reference,true);
 assert.deepEqual(new Set(flat(reportingTree(staff,'User 4')).map(n=>n.user.id)),new Set([1,2,3,4]));
});
test('legacy cycles terminate and shared descendants do not grow exponentially',()=>{
 assert.equal(flat(reportingTree([user(1,[2]),user(2,[1])])).length,3);
 const staff=[user(1),user(2)];for(let id=3;id<40;id++)staff.push(user(id,[id-1,id-2]));
 assert.ok(flat(reportingTree(staff)).length<=staff.length*2);
 assert.equal(reportingManagerAllowed(user(3,[1]),99,[user(1,[2]),user(2,[1])]),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {minimumWindow,MINIMUM_LOADING_MS} from '../src/lib/loadingWindow.ts';

test('loading windows start work immediately and retain success, rejection and slow work',async()=>{
 let calls=0;const start=performance.now(),problem=new Error('expected failure');
 const fast=minimumWindow(()=>{calls++;return 42}).then(value=>{assert.equal(value,42);assert.ok(performance.now()-start>=MINIMUM_LOADING_MS-20)});
 const failed=minimumWindow(()=>{calls++;throw problem}).then(()=>assert.fail('should reject'),error=>{assert.equal(error,problem);assert.ok(performance.now()-start>=MINIMUM_LOADING_MS-20)});
 const slow=minimumWindow(async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,2200));return 'slow'}).then(value=>{assert.equal(value,'slow');assert.ok(performance.now()-start>=2180)});
 assert.equal(calls,3,'work is invoked synchronously, without delaying the request');
 await Promise.all([fast,failed,slow]);assert.equal(calls,3,'no timer retries the work');
});

import test from 'node:test';import assert from 'node:assert/strict';
import {chatHistory} from '../src/lib/spoolyHelp.ts';
const exchange=(n,kind='answer')=>({question:'Question '+n,reply:{answer:'Answer '+n,kind,guides:[]}});
test('chat history contains only three recent complete exchanges',()=>{const source=[1,2,3,4,5].map(n=>exchange(n));const before=structuredClone(source);const result=chatHistory(source);assert.equal(result.length,6);assert.deepEqual(result[0],{role:'user',text:'Question 3'});assert.deepEqual(result[5],{role:'assistant',text:'Answer 5'});assert.deepEqual(source,before)});
test('sensitive and failed exchanges never enter later provider context',()=>{const result=chatHistory([exchange(1),exchange(2,'private_input'),exchange(3,'unavailable'),exchange(4,'live_lookup')]);assert.deepEqual(result.map(x=>x.text),['Question 1','Answer 1','Question 4','Answer 4']);assert.deepEqual(chatHistory([]),[])});

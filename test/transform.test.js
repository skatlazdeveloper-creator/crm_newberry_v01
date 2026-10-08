import {test} from 'node:test';import assert from 'node:assert/strict';
import {eventFacts,validateRow} from '../lib/transform.js';
test('conversation_created maps to local hour',()=>{const f=eventFacts({event:'conversation_created',account:{id:4},id:91,created_at:1725793200});assert.equal(f.kind,'created');assert.match(f.day,/^\d{4}-\d{2}-\d{2}$/);assert.ok(f.hour>=0&&f.hour<=23)});
test('unrelated events ignored',()=>assert.equal(eventFacts({event:'message_created',account:{id:4},id:91}),null));
test('validate table values',()=>{assert.throws(()=>validateRow('conversation_traffic',{traffic_date:'2026-09-08',hour_of_day:25}));assert.equal(validateRow('resolution_heatmap',{resolution_date:'2026-09-08',hour_of_day:10,resolution_count:3}).resolution_count,3)});

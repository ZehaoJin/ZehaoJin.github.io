/* Run: node _tools/research.test.cjs */
const assert = require('node:assert/strict');
const model = require('../assets/research-model.js');
const data = require('../_data/research.json');
// Independent fixture: a multi-scale/multi-method paper must count just once per marginal.
const p = {id:'p', status:'published',scales:['x','z'],approaches:['a','b'],roles:['first-author']};
const q = {id:'q', status:'published',scales:['x'],approaches:['a'],roles:[]};
const draft = {id:'draft', status:'submitted',scales:['z'],approaches:['b'],roles:[]};
const fixture = {scales:[{id:'x'},{id:'z'},{id:'empty'}],approaches:[{id:'a'},{id:'b'}],papers:[p,q,draft,p]};
const stats = model.statistics(fixture);
assert.equal(stats.total,2);
assert.deepEqual(stats.scales.map(x=>x.count),[2,1,0]);
assert.deepEqual(stats.approaches.map(x=>x.percent),[100,50]);
assert.equal(stats.cells.find(x=>x.scale==='z'&&x.approach==='b').count,1);
assert.equal(model.matches(p,new Set(['x','b','first-author'])),true);
assert.equal(model.matches(q,new Set(['x','b'])),false);
assert.equal(model.matches(draft,new Set()),true);
assert.equal(model.percent(0,0),0);
assert.equal(model.percent(1,3),33.3);
const actual = model.statistics(data);
assert.equal(actual.total,15);
assert.equal(data.papers.length,16);
assert.equal(new Set(data.papers.map(p=>p.id)).size,16);
assert.deepEqual(actual.scales.map(x=>x.count),[2,2,10,0,1]);
assert.deepEqual(actual.approaches.map(x=>x.count),[13,6,7,4,2,2,1]);
assert.equal(data.papers.filter(p=>p.roles.includes('highlighted')).length,6);
assert.equal(data.papers.find(p=>p.id==='tno-colours').roles.includes('first-author'),true);
assert.equal(data.papers.find(p=>p.id==='tno-colours').roles.includes('corresponding-author'),false);
assert.deepEqual(data.papers.find(p=>p.id==='causa-prima').scales,['galaxies-smbhs']);
assert.equal(data.papers.find(p=>p.id==='least-action').approaches.includes('deep-learning'),false);
assert.deepEqual(data.papers.filter(p=>p.approaches.includes('reinforcement-learning')).map(p=>p.id),['least-action']);
const allowed = new Set([...data.scales,...data.approaches,...data.roles].map(t=>t.id));
for (const paper of data.papers) {
  assert(paper.scales.length&&paper.approaches.length);
  model.tags(paper).forEach(tag=>assert(allowed.has(tag),`${paper.id}: unknown tag ${tag}`));
  for (const key of ['scales','approaches','roles']) assert.equal(new Set(paper[key]).size,paper[key].length);
  if(paper.status==='published') {assert(paper.year);assert.match(paper.url,/^https:\/\//);}
  else {assert.equal(paper.year,null); assert.equal(paper.date,null);}
}
console.log('Research model and publication metadata checks passed.');

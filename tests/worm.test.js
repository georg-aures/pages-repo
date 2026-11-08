import test from 'node:test';
import assert from 'node:assert/strict';
import {WormWorld,hash,id,zoneAt,RELICS} from '../worm-engine.js';
const world=()=>new WormWorld({seed:37});
function place(w,x,y){w.player={x,y,dir:'down'};w.trail=Array.from({length:4},()=>({x,y}));w.dug.add(id(x,y));w.reveal();}
function fixture(w,x,y,tile){w.overrides.set(id(x,y),tile);}

test('the world is deterministic and generates new terrain at arbitrary depths and horizontal coordinates',()=>{
  const a=world(),b=world(),c=new WormWorld({seed:123456});
  let differences=0;
  for(const y of [0,17,18,51,52,80,1000,100000,1000000])for(let x=-38;x<=38;x++){
    assert.deepEqual(a.baseTile(x,y),b.baseTile(x,y));
    assert.ok(a.baseTile(x,y).type);
    if(JSON.stringify(a.baseTile(x,y))!==JSON.stringify(c.baseTile(x,y)))differences++;
  }
  assert.ok(differences>50);
  assert.equal(zoneAt(17).level,0);assert.equal(zoneAt(18).level,1);assert.equal(zoneAt(52).level,2);
});

test('the surface is peaceful, the middle introduces puzzles, and hazards start only in the depths',()=>{
  const w=world(),danger=new Set(['spores','crumble','falling']);let hazards=0;
  for(let y=0;y<100;y++)for(let x=-25;x<25;x++){
    const tile=w.baseTile(x,y);
    if(y<18)assert.ok(!['wall','door','rock',...danger].includes(tile.type));
    if(y<52)assert.ok(!danger.has(tile.type));
    if(danger.has(tile.type))hazards++;
  }
  assert.ok(hazards>30);
  assert.equal(w.creaturesNear(0,40).length,0);
});

test('movement digs one neighboring cell, allows all directions and backtracking, and rejects the sky',()=>{
  const w=world();
  assert.equal(w.move('left'),true);assert.deepEqual(w.player,{x:-1,y:1,dir:'left'});
  w.move('down');assert.ok(w.dug.has('-1,2'));w.move('right');w.move('up');w.move('up');
  assert.equal(w.player.y,0);
  const turns=w.turns;assert.equal(w.move('up'),false);assert.equal(w.turns,turns);
  assert.equal(w.move('teleport'),false);
});

test('each heart creates one permanent world wonder; collecting the same spot twice is impossible',()=>{
  const w=world();w.move('down');
  assert.equal(w.hearts,1);assert.equal(w.blooms.length,1);assert.equal(w.blooms[0].kind,'flower');
  w.move('up');w.move('down');assert.equal(w.hearts,1);
  for(let i=1;i<5;i++){place(w,0,2+i);fixture(w,1,2+i,{type:'air',item:'heart'});w.move('right');}
  assert.deepEqual(w.blooms.map(b=>b.kind),['flower','crystal','fireflies','vine','starflower']);
  const saved=new WormWorld({saved:w.serialize()});assert.deepEqual(saved.blooms,w.blooms);
});

test('all four treasure categories are collected and chests give stable contents without duplication',()=>{
  const w=world();
  for(const [i,item] of ['gem','necklace','shoes','chest'].entries()){
    place(w,0,i+3);fixture(w,1,i+3,{type:'air',item});w.move('right');
  }
  for(const name of ['gem','necklace','shoes','chest'])assert.ok(w.inventory[name]>0);
  const inventory={...w.inventory},total=w.treasureCount;w.move('left');w.move('right');
  assert.deepEqual(w.inventory,inventory);assert.equal(w.treasureCount,total);
});

test('a complete generated key chamber is solvable with ordinary movement and pushing',()=>{
  const w=world();place(w,7,20);
  assert.equal(w.tile(7,21).item,'key');
  w.move('down');assert.equal(w.inventory.key,1);
  fixture(w,7,22,{type:'air'});w.move('down');w.move('down');
  assert.ok(w.opened.has('7,23'));assert.equal(w.inventory.key,0);
  w.move('down');w.move('down');assert.equal(w.tile(7,26).type,'rock');
  w.move('down');w.move('down');w.move('right');w.move('right');
  assert.equal(w.inventory.chest,1);assert.ok(w.discovered.has('Schlüsselkammer'));
  assert.deepEqual(w.player,{x:9,y:27,dir:'right'});
});

test('locked doors and magic walls cannot be bypassed by digging and do not advance time',()=>{
  const w=world();place(w,7,22);const turns=w.turns;
  assert.equal(w.move('down'),false);assert.equal(w.turns,turns);assert.equal(w.player.y,22);
  place(w,6,22);assert.equal(w.move('down'),false);assert.equal(w.turns,turns);
});

test('special finds open matching new regions and remain available for later gates',()=>{
  const w=world();place(w,7,36);
  assert.equal(w.move('down'),false);
  w.move('up');assert.ok(w.relics.has('moon'));assert.equal(w.inventory.necklace,1);
  w.move('down');w.move('down');assert.ok(w.opened.has('7,37'));assert.ok(w.discovered.has('Mondgarten'));
  assert.ok(w.relics.has('moon'));
  place(w,49,36);assert.equal(w.tile(49,37).required,'moon');assert.equal(w.move('down'),true);
  assert.ok(w.opened.has('49,37'));assert.ok(w.relics.has('moon'));
});

test('every generated gate has its correct key or relic in accessible soil above it',()=>{
  const w=world();
  for(let cy=0;cy<100;cy++)for(let cx=-3;cx<=3;cx++){
    const x=cx*14+7,y=18+cy*14;
    const gate=w.tile(x,y+5),key=w.tile(x,y+3);
    assert.equal(gate.type,'door');
    assert.equal(key.item,gate.required==='key'?'key':'relic');
    if(gate.required!=='key'){assert.ok(RELICS[gate.required]);assert.equal(key.relic,gate.required);}
    assert.ok(!['wall','door','rock'].includes(w.tile(x,y+2).type));
    assert.ok(!['wall','door','rock'].includes(w.tile(x,y+4).type));
  }
});

test('rocks move only into empty opened cells and never overwrite treasure or a sanctuary',()=>{
  const w=world();place(w,0,20);fixture(w,1,20,{type:'rock'});fixture(w,2,20,{type:'soil'});
  assert.equal(w.move('right'),false);
  fixture(w,2,20,{type:'air',item:'gem'});assert.equal(w.move('right'),false);
  fixture(w,2,20,{type:'sanctuary'});assert.equal(w.move('right'),false);
  fixture(w,2,20,{type:'air'});assert.equal(w.move('right'),true);
  assert.equal(w.tile(1,20).type,'air');assert.equal(w.tile(2,20).type,'rock');
  w.undo();assert.equal(w.tile(1,20).type,'rock');assert.equal(w.tile(2,20).type,'air');
});

test('spores send the worm to its last sanctuary while retaining collected treasures',()=>{
  const w=world();place(w,7,18);w.move('down');assert.deepEqual(w.safe,{x:7,y:19});
  w.inventory.gem=11;w.inventory.shoes=2;
  place(w,0,54);fixture(w,1,54,{type:'spores'});
  const offset=Math.floor(hash(w.seed,1,54,10)*3);w.turns=(2-offset+3)%3;
  w.move('right');assert.equal(w.player.x,7);assert.equal(w.player.y,19);
  assert.equal(w.inventory.gem,11);assert.equal(w.inventory.shoes,2);assert.ok(w.message.includes('Schätze bleiben'));
});

test('crumbling ground gives time to move away; waiting on it produces a gentle rescue',()=>{
  for(const leave of [true,false]){
    const w=world();place(w,0,55);fixture(w,1,55,{type:'crumble'});fixture(w,2,55,{type:'air'});
    w.move('right');assert.equal(w.player.y,55);
    if(leave)w.move('right');else w.wait();w.wait();
    assert.equal(w.tile(1,55).type,'air');assert.equal(w.player.y,leave?55:1);
  }
});

test('falling stones warn on the preceding turn and hazards only change on a game turn',()=>{
  const w=world();place(w,0,83);fixture(w,1,83,{type:'air'});fixture(w,1,82,{type:'falling'});
  const offset=Math.floor(hash(w.seed,1,82,11)*4);w.turns=(3-offset+4)%4;
  const before=w.serialize();for(let i=0;i<30;i++)w.hazardAt(1,83);
  assert.deepEqual(w.serialize(),before);
  w.move('right');assert.equal(w.player.y,w.safe.y);
});

test('creatures have deterministic turn-based patrols confined to their cave passage',()=>{
  const w=world();let found;
  for(let x=-100;x<100&&!found;x+=14)found=w.creaturesNear(x,100).find(c=>true);
  assert.ok(found);
  const now=w.creaturesNear(found.x,found.y,0),later=w.creaturesNear(found.x,found.y,1);
  assert.ok(now.every(c=>Math.abs(c.x-c.nextX)===1));
  assert.notDeepEqual(now,later);
  for(const c of now)assert.equal(w.tile(c.x,c.y).type,'air');
});

test('returning to the meadow preserves the entire explored world and collection',()=>{
  const w=world();w.move('down');w.inventory.gem=7;const blooms=[...w.blooms];
  place(w,21,145);const dug=new Set(w.dug);w.maxDepth=145;w.home();
  assert.deepEqual(w.player,{x:0,y:1,dir:'right'});assert.equal(w.inventory.gem,7);
  assert.deepEqual(w.blooms,blooms);assert.deepEqual(w.dug,dug);assert.equal(w.maxDepth,145);
});

test('undo restores doors, keys, collectibles, turns, and world magic atomically',()=>{
  const w=world();const start=w.serialize();w.move('down');assert.equal(w.hearts,1);w.undo();
  assert.deepEqual(w.serialize(),start);
  place(w,7,22);w.inventory.key=1;const before=w.serialize();w.move('down');w.undo();
  assert.deepEqual(w.serialize(),before);assert.equal(w.tile(7,23).type,'door');
});

test('saved worlds restore exactly, retain future generation, and reject invalid progress',()=>{
  const w=world();w.move('down');w.move('right');w.move('down');
  const save=w.serialize(),restored=new WormWorld({saved:save});
  assert.deepEqual(restored.serialize(),save);
  for(const [x,y] of [[83,1000],[-37,90212],[0,52]])assert.deepEqual(restored.tile(x,y),w.tile(x,y));
  for(const broken of [{...save,version:99},{...save,trail:null},{...save,inventory:{...save.inventory,gem:-1}},{...save,player:{x:0,y:-1,dir:'up'}}])assert.throws(()=>new WormWorld({saved:broken}));
  fixture(w,w.player.x,w.player.y+1,{type:'air',item:'gem'});
  w.move('down');assert.notDeepEqual(w.inventory,save.inventory); // The original snapshot is independent of the live run.
});

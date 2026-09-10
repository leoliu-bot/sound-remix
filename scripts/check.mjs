import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {Vector3} from '../dist/vendor/three.module.js';
import {Game} from '../dist/game.js';
import {World} from '../dist/world.js';

const root=path.resolve(import.meta.dirname,'..');
for(const file of ['main.js','world.js','audio.js','game.js']){const result=spawnSync(process.execPath,['--check',path.join(root,'dist',file)],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)){assert.ok(fs.existsSync(path.join(root,'dist',match[1])),`Missing local asset ${match[1]}`);}
const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));const js=fs.readFileSync(path.join(root,'dist/main.js'),'utf8');for(const match of js.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(match[1]),`Missing UI element ${match[1]}`);
const noop=()=>{};
function mockWorld(){return{actors:[],constrain:World.prototype.constrain,clear(){this.actors=[];},createActor(type,hero){const a={position:new Vector3(),type,hero,angle:0,scale:1,walk:0,hit:0,visible:true};this.actors.push(a);return a;},removeActor(a){this.actors=this.actors.filter(x=>x!==a);},burst:noop,shockwave:noop,label:noop,beat:noop,danger:noop,beam:noop,shake:0};}
function mockAudio(){return{ctx:null,stop:noop,start:async()=>{},pause:noop,resume:noop,fx:noop,schedule:()=>[],layers:1};}
let seed=1257;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
const results=[];
for(let profile=0;profile<4;profile++){
  const hero=profile%3;
  const events=[];const world=mockWorld(),audio=mockAudio(),g=new Game(world,audio,(type,data)=>events.push({type,data}));g.selectHero(hero);await g.start();
  assert.equal(g.state,'playing');assert.equal(g.friends.length,1);assert.equal(g.hp,g.maxHp);
  g.pause();const t=g.time;g.update(1);assert.equal(g.time,t);assert.equal(g.performDash(),false);g.resume();
  g.energy=100;assert.equal(g.performPulse(),true);assert.ok(g.energy<100);
  let iterations=0;
  while(g.state!=='result'&&g.time<220&&iterations++<20000){
    if(g.state==='upgrade'){const before=g.time;g.update(.5);assert.equal(g.time,before);const preferred=['health','heal','multishot','bass','strings','power','orbit','drums','magnet','tempo'];let pick=0,best=100;g.upgradeChoices.forEach((u,i)=>{let rank=preferred.indexOf(u.id);if(rank<0)rank=90;if(g.hp>g.maxHp*.7&&['health','heal'].includes(u.id))rank+=10;if(rank<best){best=rank;pick=i;}});g.chooseUpgrade(pick);continue;}
    const p=g.player.position;let dx=0,dz=0;const close=g.enemies.filter(e=>e.type!=='boss'&&Math.hypot(e.actor.position.x-p.x,e.actor.position.z-p.z)<5);
    for(const e of close){const x=p.x-e.actor.position.x,z=p.z-e.actor.position.z,d=Math.max(.2,Math.hypot(x,z));dx+=x/d*(5-d)*1.5;dz+=z/d*(5-d)*1.5;}
    const gems=g.gems.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));if(gems.length){const d=Math.hypot(gems[0].x-p.x,gems[0].z-p.z)||1;dx+=(gems[0].x-p.x)/d*2.5;dz+=(gems[0].z-p.z)/d*2.5;}else{dx+=Math.cos(g.time*.25);dz+=Math.sin(g.time*.25);}
    if(Math.abs(p.x)>15)dx-=Math.sign(p.x)*5;if(Math.abs(p.z)>13)dz-=Math.sign(p.z)*5;
    if(g.boss){const x=p.x-g.boss.actor.position.x,z=p.z-g.boss.actor.position.z,d=Math.hypot(x,z)||1;dx+=x/d*2+z/d*2;dz+=z/d*2-x/d*2;}
    const len=Math.hypot(dx,dz)||1;g.stick={x:dx/len,z:dz/len};if(close.some(e=>Math.hypot(e.actor.position.x-p.x,e.actor.position.z-p.z)<1.7))g.performDash();if(g.energy>=100)g.performPulse();if(profile<3&&g.timing()<.025)g.manualAttack();g.update(1/60);
    assert.ok(Number.isFinite(g.hp)&&Number.isFinite(g.player.position.x));assert.ok(g.enemies.length<=65);assert.ok(g.projectiles.length<=451);assert.ok(g.gems.length<=171);
  }
  assert.ok(iterations<20000,'Simulation stalled');results.push({hero,manualRhythm:profile<3,state:g.state,seconds:Math.round(g.time),kills:g.kills,level:g.level,bossSpawned:g.bossSpawned,hp:g.hp,won:events.filter(e=>e.type==='finish').at(-1)?.data.win??false});
  // Exercise terminal states and restart independently of bot survival.
  if(g.state!=='playing')await g.start();g.time=151;g.gems=[];g.spawnBoss();assert.ok(g.boss);g.hitEnemy(g.boss,100000,true);assert.equal(g.state,'result');assert.equal(events.at(-1).type,'finish');assert.equal(events.at(-1).data.win,true);await g.start();g.invincible=0;g.hurt(100000);assert.equal(g.state,'result');assert.equal(events.at(-1).data.win,false);g.resetMenu();assert.equal(g.state,'menu');assert.equal(g.enemies.length,0);assert.equal(g.projectiles.length,0);
}
console.log(JSON.stringify({passed:true,checks:['ES module syntax','local assets','UI references','pause/resume','upgrade freeze','combat simulation for 3 heroes','entity caps','boss victory','defeat','restart and cleanup'],simulations:results},null,2));

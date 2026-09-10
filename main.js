import {World} from './world.js';
import {MusicEngine} from './audio.js';
import {Game,HEROES} from './game.js';

const $=id=>document.getElementById(id);
const timeText=seconds=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const safeRead=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const safeWrite=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
const show=(id,on=true)=>{$(id).hidden=!on;};
let world,audio,game,announcementTimer,damageTimer,lastHud=0,frameCount=0,fps=60,lastFps=performance.now(),previousFocus=null;
const modalIds=['pause-screen','upgrade-screen','result-screen','help-screen','settings-screen'];
const closeModals=()=>modalIds.forEach(id=>show(id,false));
const focusModal=id=>{previousFocus=document.activeElement;requestAnimationFrame(()=>$(`${id}`).querySelector('button,input,select')?.focus({preventScroll:true}));};

function updateHud(){if(!game?.config)return;const g=game;$('health-bar').style.width=`${g.hp/g.maxHp*100}%`;$('health-bar').style.background=g.hp/g.maxHp<.3?'#ee99ad':'var(--accent)';$('health-text').textContent=`${Math.ceil(g.hp)} / ${g.maxHp}`;$('xp-bar').style.width=`${Math.min(100,g.xp/g.nextXp*100)}%`;$('level').textContent=`LV. ${String(g.level).padStart(2,'0')}`;$('timer').textContent=timeText(g.time);$('kills').textContent=String(g.kills).padStart(3,'0');$('combo').textContent=g.combo;$('combo-display').style.opacity=g.combo>=3?1:0;$('dash-cooldown').style.height=`${g.dashCd/Math.max(1.25,2.5-(g.upgrades.tempo||0)*.3)*100}%`;$('dash-ability').classList.toggle('ready',g.dashCd<=0);$('pulse-charge').style.height=`${g.energy}%`;$('pulse-ability').classList.toggle('ready',g.energy>=100);$('pulse-label').textContent=g.energy>=100?'共鸣爆发':`共鸣 ${Math.floor(g.energy)}%`;$('movement-hint').style.opacity=g.time>17?'0':'1';$('objective').textContent=g.boss?'击败寂静之心':g.time<30?'跟随节拍，招募你的乐队':`乐队 ${g.friends.length+1} 人 · 坚持至 02:30`;if(g.boss)$('boss-health').style.width=`${Math.max(0,g.boss.hp/g.boss.maxHp*100)}%`;}
function announce(data){clearTimeout(announcementTimer);const el=$('announcement');el.replaceChildren();const small=document.createElement('small'),title=document.createElement('b');small.textContent=data.small;title.textContent=data.title;el.append(small,title);el.classList.add('visible');announcementTimer=setTimeout(()=>el.classList.remove('visible'),3100);}
function onEvent(type,data){
  if(type==='menu'){closeModals();show('hud',false);show('menu');show('boss-hud',false);document.body.classList.remove('playing');}
  if(type==='start'){closeModals();show('menu',false);show('hud');show('boss-hud',false);document.body.classList.add('playing');$('hero-name').textContent=data.name;$('portrait').textContent=data.symbol;$('track-name').textContent=data.track;$('bpm-label').textContent=`${data.bpm} BPM · ${data.genre}`;document.documentElement.style.setProperty('--accent',data.color);$('beat-quality').textContent='寻找你的节奏';$('start').disabled=false;updateHud();}
  if(type==='pause'){show('pause-screen');focusModal('pause-screen');}
  if(type==='resume'){show('pause-screen',false);}
  if(type==='announcement')announce(data);
  if(type==='beat'){$('beat-number').textContent=`0${data%4+1} / 04`;}
  if(type==='judge'){const el=$('judgement');el.textContent=data.text;el.className='judgement '+data.kind;void el.offsetWidth;el.classList.add('show');$('beat-quality').textContent=data.kind==='perfect'?'频率已同步':data.kind==='good'?'渐入佳境':'稍等下一拍';}
  if(type==='hurt'){clearTimeout(damageTimer);$('damage-flash').style.opacity='1';damageTimer=setTimeout(()=>$('damage-flash').style.opacity='0',200);}
  if(type==='stats')updateHud();
  if(type==='tick'&&performance.now()-lastHud>85){lastHud=performance.now();updateHud();}
  if(type==='stage'){const labels=['林间序曲','切分节奏','夜色渐强','虚空失真','终章前奏'];$('stage-label').textContent=`0${data+1} / ${labels[data]}`;$('wave-label').textContent=['第一乐章','第二乐章','第三乐章','第四乐章','最终乐章'][data];}
  if(type==='boss'){show('boss-hud');$('stage-label').textContent='FINAL / 寂静之心';}
  if(type==='upgrade'){
    const cards=$('upgrade-cards');cards.replaceChildren();data.forEach((u,i)=>{const button=document.createElement('button');button.className='upgrade-card';const fields=[['span','upgrade-number',`0${i+1}`],['span','upgrade-icon',u.icon],['span','upgrade-rarity',u.tag],['h3',null,u.name],['p',null,u.description],['span','upgrade-effect',u.effect]];for(const [tag,cls,text] of fields){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=text;button.append(el);}button.addEventListener('click',()=>game.chooseUpgrade(i));cards.append(button);});show('upgrade-screen');focusModal('upgrade-screen');updateHud();
  }
  if(type==='upgraded'){show('upgrade-screen',false);announce({small:'RESONANCE CHIP / ACQUIRED',title:data.name});}
  if(type==='finish'){
    show('boss-hud',false);show('result-screen');$('result-title').innerHTML=data.win?'世界，再次共鸣<span>.</span>':'回声仍在<span>.</span>';$('result-eyebrow').textContent=data.win?'THE FOREST SINGS AGAIN':'EVERY END IS AN ECHO';$('result-description').textContent=data.win?'寂静散去。你和乐队的旋律，留在了每一片叶子里。':'一次休止，是下一次起奏的开始。';$('result-time').textContent=timeText(data.time);$('result-kills').textContent=data.kills;$('result-combo').textContent=data.combo;$('result-score').textContent=data.score.toLocaleString();const previous=Number(safeRead('remix-best','0'))||0;const best=Math.max(previous,data.score);safeWrite('remix-best',String(best));$('best-score').textContent=data.score>previous?'NEW BEST · 新纪录':`最高 ${best.toLocaleString()}`;focusModal('result-screen');updateHud();
  }
}
function closeAux(id){show(id,false);previousFocus?.focus?.({preventScroll:true});}
function openSettings(){show('settings-screen');focusModal('settings-screen');}
function tryStart(){if(game.starting)return;$('start').disabled=true;game.start().catch(fatal);}
function fatal(error){console.error(error);show('loading',false);show('fatal');$('fatal-detail').textContent=error?.message||String(error);}

try{
  world=new World($('world'));audio=new MusicEngine();game=new Game(world,audio,onEvent);
  audio.setVolume((Number(safeRead('remix-volume','65'))||0)/100);$('volume').value=Math.round(audio.volume*100);$('volume-value').textContent=`${$('volume').value}%`;const quality=safeRead('remix-quality','high');$('quality').value=['high','low'].includes(quality)?quality:'high';world.setQuality($('quality').value);world.shakeEnabled=safeRead('remix-shake','true')==='true'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;$('shake').checked=world.shakeEnabled;
  for(const button of document.querySelectorAll('[data-character]'))button.addEventListener('click',()=>{const i=Number(button.dataset.character);game.selectHero(i);document.querySelectorAll('[data-character]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});$('char-skill').textContent=HEROES[i].skill;$('char-bpm').textContent=`${HEROES[i].bpm} BPM`;document.documentElement.style.setProperty('--accent',HEROES[i].color);});
  $('start').addEventListener('click',tryStart);$('play-again').addEventListener('click',tryStart);$('restart').addEventListener('click',tryStart);$('quit').addEventListener('click',()=>game.resetMenu());$('result-home').addEventListener('click',()=>game.resetMenu());$('resume').addEventListener('click',()=>game.resume());$('pause-button').addEventListener('click',()=>game.pause());$('how-to').addEventListener('click',()=>{show('help-screen');focusModal('help-screen');});$('menu-settings').addEventListener('click',openSettings);$('pause-settings').addEventListener('click',openSettings);
  for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>closeAux(b.dataset.close));
  $('sound-toggle').addEventListener('click',()=>{audio.setMuted(!audio.muted);$('sound-toggle').textContent=audio.muted?'♪':'♫';$('sound-toggle').style.opacity=audio.muted?.5:1;$('sound-toggle').setAttribute('aria-label',audio.muted?'开启声音':'静音');$('sound-toggle').title=audio.muted?'开启声音':'静音';});
  $('volume').addEventListener('input',e=>{const n=Number(e.target.value);audio.setVolume(n/100);$('volume-value').textContent=`${n}%`;safeWrite('remix-volume',String(n));});$('quality').addEventListener('change',e=>{world.setQuality(e.target.value);safeWrite('remix-quality',e.target.value);});$('shake').addEventListener('change',e=>{world.shakeEnabled=e.target.checked;safeWrite('remix-shake',String(e.target.checked));});
  $('dash-ability').addEventListener('click',()=>game.performDash());$('pulse-ability').addEventListener('click',()=>game.performPulse());
  const blocked=()=>!$('settings-screen').hidden||!$('help-screen').hidden;
  window.addEventListener('keydown',e=>{
    if(e.code==='Tab'){const visible=modalIds.filter(id=>!$(id).hidden).at(-1);if(visible){const nodes=[...$(visible).querySelectorAll('button,input,select')].filter(n=>!n.disabled);if(nodes.length){const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}return;}
    if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(!$('settings-screen').hidden)closeAux('settings-screen');else if(!$('help-screen').hidden)closeAux('help-screen');else if(game.state==='playing')game.pause();else if(game.state==='paused')game.resume();}return;}
    if(blocked())return;
    if(game.state==='upgrade'&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(e.code)){e.preventDefault();if(!e.repeat)game.chooseUpgrade(Number(e.code.slice(-1))-1);return;}
    if(game.state==='menu'&&e.code==='Enter'&&document.activeElement?.tagName!=='BUTTON'){e.preventDefault();tryStart();return;}
    if(game.state!=='playing')return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyQ','KeyK','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
    game.keys.add(e.code);if(e.repeat)return;if(e.code==='Space'||e.code.startsWith('Shift'))game.performDash();if(e.code==='KeyQ'||e.code==='KeyK')game.performPulse();if(e.code==='KeyJ')game.manualAttack();
  });
  window.addEventListener('keyup',e=>game.keys.delete(e.code));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){game.keys.clear();game.pause();}});window.addEventListener('blur',()=>{game.keys.clear();game.stick={x:0,z:0};if(game.state==='playing')game.pause();});
  $('world').addEventListener('pointerdown',e=>{if(e.button!==0||game.state!=='playing'||blocked())return;game.pointer=world.pointerToGround(e.clientX,e.clientY);game.lastAim=game.time;game.manualAttack();});$('world').addEventListener('contextmenu',e=>e.preventDefault());
  $('mobile-dash').addEventListener('pointerdown',e=>{e.preventDefault();game.performDash();});$('mobile-pulse').addEventListener('pointerdown',e=>{e.preventDefault();game.performPulse();});
  const joystick=$('joystick'),thumb=joystick.querySelector('i');let joyId=null,joyRect;
  const stickMove=e=>{if(e.pointerId!==joyId)return;const x=e.clientX-joyRect.left-joyRect.width/2,z=e.clientY-joyRect.top-joyRect.height/2,len=Math.hypot(x,z),limit=33,mult=len>limit?limit/len:1;thumb.style.transform=`translate(${x*mult}px,${z*mult}px)`;game.stick={x:x*mult/limit,z:z*mult/limit};};
  joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;joyRect=joystick.getBoundingClientRect();joystick.setPointerCapture(joyId);stickMove(e);});joystick.addEventListener('pointermove',stickMove);const stopStick=e=>{if(e.pointerId!==joyId)return;joyId=null;game.stick={x:0,z:0};thumb.style.transform='';};joystick.addEventListener('pointerup',stopStick);joystick.addEventListener('pointercancel',stopStick);joystick.addEventListener('lostpointercapture',stopStick);
  const notes=[];for(let i=-4;i<=4;i++){const n=document.createElement('i');n.className='beat-note';$('beat-notes').appendChild(n);notes.push(n);}
  let previous=performance.now();
  function frame(now){requestAnimationFrame(frame);const rawDelta=(now-previous)/1000;previous=now;const dt=Math.min(.045,rawDelta);if(rawDelta>1.5&&game.state==='playing')game.pause();game.update(dt);const visualDt=game.state==='paused'||game.state==='upgrade'?0:dt;world.update(visualDt,game.player,game.state,game.visualProjectiles(),game.gems);
    if(game.state==='playing'||game.state==='paused'||game.state==='upgrade'){const beat=audio.ctx?audio.now()*game.config.bpm/60:game.time*game.config.bpm/60,phase=beat%1;notes.forEach((n,i)=>{const step=i-4,offset=step-phase;n.style.left=`${50+offset*25}%`;n.style.opacity=Math.abs(offset)>2.1?'0':'.85';n.classList.toggle('heavy',(Math.floor(beat)+step)%4===0);});}
    frameCount++;if(now-lastFps>1000){fps=Math.round(frameCount*1000/(now-lastFps));frameCount=0;lastFps=now;}
  }
  world.update(.016,game.player,'menu');requestAnimationFrame(frame);show('loading',false);show('menu');
  // Read-only diagnostics are useful when checking real devices and reports.
  window.remixDiagnostics=()=>({state:game.state,fps,time:game.time||0,enemies:game.enemies.length,projectiles:game.projectiles.length,particles:world.particles.length,drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,webgl:world.renderer.capabilities.isWebGL2?'WebGL2':'WebGL',audioState:audio.ctx?.state||'not started'});
  $('world').addEventListener('webglcontextlost',e=>{e.preventDefault();game.pause();fatal(new Error('图形上下文中断。请重新加载，或关闭其他占用显卡的页面。'));});
}catch(error){fatal(error);}

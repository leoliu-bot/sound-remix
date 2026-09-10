// Original synthesized score. No recordings or music assets from ReMix are used.
export class MusicEngine {
  constructor(){this.ctx=null;this.volume=.65;this.muted=false;this.running=false;this.step=0;this.bpm=120;this.layers=1;this.events=[];this.hero=0;this.epoch=0;this.pausedAt=0;}
  async init(){
    if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.46;const compressor=this.ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;this.master.connect(compressor);compressor.connect(this.ctx.destination);this.delay=this.ctx.createDelay(.6);this.delay.delayTime.value=.1875;this.feedback=this.ctx.createGain();this.feedback.gain.value=.24;this.wet=this.ctx.createGain();this.wet.gain.value=.16;this.delay.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.wet);this.wet.connect(this.master);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.3,this.ctx.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
    if(this.ctx.state==='suspended')await this.ctx.resume();
  }
  async start(bpm,hero=0){await this.init();if(!this.ctx)return;this.bpm=bpm;this.hero=hero;this.step=0;this.layers=1;this.epoch=this.ctx.currentTime+.08;this.next=this.epoch;this.running=true;this.events=[];this.delay.delayTime.value=60/bpm*.375;this.master.gain.setTargetAtTime(this.muted?0:this.volume*.46,this.ctx.currentTime,.08);}
  now(){return this.ctx?Math.max(0,(this.running?this.ctx.currentTime:this.pausedAt)-this.epoch):0;}
  phase(){const beat=this.now()*this.bpm/60;return beat-Math.floor(beat);}
  setVolume(v){this.volume=v;if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:v*.46,this.ctx.currentTime,.04);}
  setMuted(v){this.muted=v;this.setVolume(this.volume);}
  pause(){if(!this.ctx||!this.running)return;this.pausedAt=this.ctx.currentTime;this.running=false;this.ctx.suspend().catch(()=>{});}
  resume(){if(!this.ctx)return;this.ctx.resume().catch(()=>{});this.running=true;this.master.gain.setTargetAtTime(this.muted?0:this.volume*.46,this.ctx.currentTime,.02);}
  stop(){this.pause();this.events=[];}
  tone(freq,time,duration,type='sine',volume=.15,pan=0,echo=false){const c=this.ctx;if(!c)return;const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,time);g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+duration);p.pan.value=pan;o.connect(g);g.connect(p);p.connect(this.master);if(echo)p.connect(this.delay);o.start(time);o.stop(time+duration+.03);}
  kick(t){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(145,t);o.frequency.exponentialRampToValueAtTime(42,t+.14);g.gain.setValueAtTime(.7,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.32);}
  hat(t,open=false){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='highpass';f.frequency.value=8000;g.gain.setValueAtTime(open?.09:.045,t);g.gain.exponentialRampToValueAtTime(.001,t+(open?.13:.04));s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+(open?.16:.06));}
  snare(t){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=this.noise;f.type='bandpass';f.frequency.value=1600;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.12);s.connect(f);f.connect(g);g.connect(this.master);s.start(t);s.stop(t+.14);this.tone(170,t,.12,'triangle',.18);}
  schedule(){if(!this.ctx||!this.running)return [];const sixteenth=60/this.bpm/4;if(this.next<this.ctx.currentTime-.25){this.step=Math.ceil((this.ctx.currentTime-this.epoch)/sixteenth);this.next=this.epoch+this.step*sixteenth;this.events=this.events.filter(e=>e.time>this.ctx.currentTime-.12);}while(this.next<this.ctx.currentTime+.12){this.playStep(this.step,this.next);if(this.step%4===0)this.events.push({beat:this.step/4,time:this.next});this.step++;this.next=this.epoch+this.step*sixteenth;}const out=[];while(this.events.length&&this.events[0].time<=this.ctx.currentTime)out.push(this.events.shift().beat);return out;}
  playStep(step,t){const s=step%16,bar=Math.floor(step/16),chord=[0,-3,5,-5][Math.floor(bar/2)%4],root=110*Math.pow(2,chord/12),beat=60/this.bpm;
    if(s%4===0)this.kick(t);
    if(s===4||s===12)this.snare(t);
    if(s%2===0)this.hat(t,s%4===2);
    const bassPattern=this.hero===1?[0,0,7,0,12,7,0,10]:[0,0,0,7,0,12,7,0];
    if(s%2===0)this.tone(root*Math.pow(2,bassPattern[(s/2)%8]/12),t,beat*.28,'triangle',.24,-.1);
    if(s===0){[0,3,7,10].forEach((n,i)=>this.tone(root*4*Math.pow(2,n/12),t+i*.007,beat*3.6,'sine',.027,(i-1.5)*.3,true));}
    const seq=[[12,19,15,22,19,15,10,7],[12,15,19,24,22,19,15,10],[0,7,12,15,19,15,12,7]][this.hero];
    if(s%2===0&&((bar%4!==3)||s<12))this.tone(root*2*Math.pow(2,seq[(step/2)%8]/12),t,beat*.45,'sine',.085,Math.sin(step)*.45,true);
    if(this.layers>=2&&s%4===2)this.tone(root*2*Math.pow(2,[7,12,10,15][(s-2)/4]/12),t,beat*.7,'triangle',.065,.5,true);
    if(this.layers>=3&&s%2===1)this.tone(root*4*Math.pow(2,[0,7,12,7,3,10,15,10][(s-1)/2]/12),t,beat*.32,'sine',.06,-.5,true);
    if(this.layers>=4&&s%4===0)this.tone(root*8*Math.pow(2,[7,3,0,10][s/4]/12),t,beat*.2,'triangle',.037,.2,true);
  }
  fx(kind){if(!this.ctx||!this.running||this.muted)return;const t=this.ctx.currentTime;
    if(kind==='perfect'){this.tone(880,t,.12,'sine',.09,-.2);this.tone(1320,t+.035,.17,'sine',.07,.2,true);}
    else if(kind==='hit')this.tone(130+Math.random()*80,t,.055,'triangle',.055);
    else if(kind==='hurt'){this.tone(85,t,.15,'sawtooth',.10);this.tone(71,t+.04,.17,'triangle',.12);}
    else if(kind==='dash'){[500,700,950].forEach((f,i)=>this.tone(f,t+i*.025,.055,'sine',.035));}
    else if(kind==='upgrade'){[523,659,784,1047].forEach((f,i)=>this.tone(f,t+i*.065,.3,'sine',.12,0,true));}
    else if(kind==='pulse'){[110,220,440,880].forEach((f,i)=>this.tone(f,t+i*.03,.7,'triangle',.14,0,true));this.kick(t);}
    else if(kind==='pickup')this.tone(1200,t,.04,'sine',.017);
  }
}

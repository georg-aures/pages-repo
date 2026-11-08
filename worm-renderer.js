import { hash,id,zoneAt,WormWorld } from './worm-engine.js';
import { round,glow,star,drawItem,gem,flower,mushroom,drawWorm,heart } from './worm-icons.js';
export const TILE=48;
const PALETTES=[
  {soil:'#685b48',grain:'#8a7854',air:'#253c37',edge:'#9ba879',glow:'#edca85',crystal:'#9fe4d4'},
  {soil:'#31454c',grain:'#4d6570',air:'#142a34',edge:'#6ca7a7',glow:'#8bdfd5',crystal:'#9bdfe2'},
  {soil:'#40324e',grain:'#655276',air:'#211a35',edge:'#9b83ad',glow:'#d4acf2',crystal:'#c5b1ed'},
  {soil:'#293d52',grain:'#47627a',air:'#15223b',edge:'#709ac2',glow:'#9dcbf7',crystal:'#b6d9f4'},
  {soil:'#30483d',grain:'#4c6b56',air:'#152e2e',edge:'#83b798',glow:'#a1e5b7',crystal:'#99ddba'},
  {soil:'#4c3549',grain:'#75566a',air:'#2d1a30',edge:'#b88aab',glow:'#f4b6d8',crystal:'#e8b1d7'},
];
function palette(y,theme) {
  if(theme==='moon')return PALETTES[1];if(theme==='rose')return PALETTES[5];if(theme==='star')return PALETTES[3];
  return PALETTES[y<18?0:y<52?1:2+Math.floor((y-52)/42)%4];
}
const lerp=(a,b,t)=>a+(b-a)*t;

export class WormRenderer {
  constructor(canvas) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cache=new Map();this.particles=[];
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.camera={x:0,y:-144};this.lastTime=0;this.motion=null;this.hover=null;
  }
  invalidate(){this.cache.clear();}
  focus(world) {
    this.world=world;this.invalidate();this.motion=null;
    this.camera={x:(world.player.x+.5)*TILE-this.canvas.width/2,y:Math.max(-144,world.player.y*TILE-this.canvas.height*.38)};
  }
  at(world,x,y) {
    const key=id(x,y);if(!this.cache.has(key))this.cache.set(key,world.tile(x,y));return this.cache.get(key);
  }
  passage(world,x,y) {
    const tile=this.at(world,x,y);
    return tile.type!=='sky' && (['air','rock','door','wall','sanctuary'].includes(tile.type)||world.dug.has(id(x,y)));
  }
  effects(events,time) {
    if(this.reduced)return;
    for(const event of events) if(['heart','chest','door','relic','sanctuary','rescue','zone'].includes(event.type)) {
      for(let i=0;i<16;i++)this.particles.push({x:(event.x+.5)*TILE,y:(event.y+.5)*TILE,born:time,
        vx:Math.cos(i*2.4)*(15+i*2),vy:-30-Math.sin(i*1.7)*30,color:event.type==='heart'?'#f4bfd5':'#f4dfa3',heart:event.type==='heart'&&i%4===0});
    }
  }
  draw(world,time=0) {
    if(this.world!==world)this.focus(world);
    const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height;
    const dt=this.lastTime?Math.min(.05,time-this.lastTime):1/30;this.lastTime=time;
    const targetX=(world.player.x+.5)*TILE-W/2,targetY=Math.max(-144,world.player.y*TILE-H*.38);
    const follow=this.reduced?1:1-Math.exp(-dt*12);
    this.camera.x=lerp(this.camera.x,targetX,follow);this.camera.y=lerp(this.camera.y,targetY,follow);
    const cam=this.camera;
    ctx.clearRect(0,0,W,H);
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#bcd9c5');sky.addColorStop(1,'#536f64');
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const x0=Math.floor(cam.x/TILE)-1,x1=Math.ceil((cam.x+W)/TILE)+1;
    const y0=Math.max(0,Math.floor(cam.y/TILE)-1),y1=Math.ceil((cam.y+H)/TILE)+1;
    // First paint earth; the connected rounded passages are cut through it.
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const X=x*TILE-cam.x,Y=y*TILE-cam.y,p=palette(y),v=hash(world.seed,x,y,31);
      ctx.fillStyle=p.soil;ctx.fillRect(X,Y,TILE+1,TILE+1);
      ctx.fillStyle=p.grain;ctx.globalAlpha=.11;
      ctx.beginPath();ctx.ellipse(X+TILE*v,Y+TILE*.6,15+v*12,7+v*5,v,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.22;ctx.strokeStyle=p.grain;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(X+4,Y+TILE*v);ctx.quadraticCurveTo(X+20,Y+30,X+44,Y+20+v*18);ctx.stroke();
      ctx.globalAlpha=.35;ctx.fillStyle='#d8c79a';
      for(let i=0;i<3;i++){const h=hash(world.seed,x+i*99,y,32);ctx.beginPath();ctx.ellipse(X+5+h*37,Y+6+((h*37)%1)*35,1.5+h*2,1+h,0,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
    }
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++) {
      const X=x*TILE-cam.x,Y=y*TILE-cam.y,tile=this.at(world,x,y),p=palette(y,tile.theme),known=world.revealed.has(id(x,y));
      if(this.passage(world,x,y)) {
        round(ctx,X+1,Y+1,TILE-2,TILE-2,12,p.air);
        ctx.fillStyle=p.air;
        if(this.passage(world,x-1,y))ctx.fillRect(X-1,Y+10,TILE/2+2,TILE-20);
        if(this.passage(world,x+1,y))ctx.fillRect(X+TILE/2,Y+10,TILE/2+2,TILE-20);
        if(this.passage(world,x,y-1))ctx.fillRect(X+10,Y-1,TILE-20,TILE/2+2);
        if(this.passage(world,x,y+1))ctx.fillRect(X+10,Y+TILE/2,TILE-20,TILE/2+2);
        if(this.passage(world,x-1,y)&&this.passage(world,x,y-1)&&this.passage(world,x-1,y-1))ctx.fillRect(X-1,Y-1,26,26);
        if(this.passage(world,x+1,y)&&this.passage(world,x,y-1)&&this.passage(world,x+1,y-1))ctx.fillRect(X+24,Y-1,25,26);
        if(this.passage(world,x-1,y)&&this.passage(world,x,y+1)&&this.passage(world,x-1,y+1))ctx.fillRect(X-1,Y+24,26,25);
        if(this.passage(world,x+1,y)&&this.passage(world,x,y+1)&&this.passage(world,x+1,y+1))ctx.fillRect(X+24,Y+24,25,25);
        ctx.strokeStyle=p.edge+'55';ctx.lineWidth=1.5;
        if(!this.passage(world,x,y+1)){ctx.beginPath();ctx.moveTo(X+12,Y+TILE-4);ctx.quadraticCurveTo(X+24,Y+TILE-1,X+37,Y+TILE-4);ctx.stroke();}
        if(hash(world.seed,x,y,34)<.12 && !tile.item && tile.type==='air') {
          glow(ctx,X+25,Y+34,36,p.glow+'16');mushroom(ctx,X+17,Y+43,13,hash(world.seed,x,y,35)<.5);
        }
        if(y>=18&&tile.type==='air'&&!tile.item&&hash(world.seed,x,y,38)<.17){
          glow(ctx,X+31,Y+35,35,p.glow+'29');gem(ctx,X+34,Y+37,15,p.crystal);gem(ctx,X+22,Y+40,10,p.crystal);
        }
        if(y<18&&!this.passage(world,x,y-1)) {
          ctx.strokeStyle='#a9b38466';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X+14,Y+5);ctx.quadraticCurveTo(X+8,Y+18,X+19,Y+21);ctx.moveTo(X+34,Y+5);ctx.quadraticCurveTo(X+28,Y+17,X+35,Y+25);ctx.stroke();
        }
      }
      if(!known){ctx.fillStyle='#10182738';ctx.fillRect(X,Y,TILE,TILE);continue;}
      if(tile.type==='wall')this.wall(ctx,X,Y,p);
      if(tile.type==='door'||tile.openedDoor)this.door(ctx,X,Y,p,tile);
      if(tile.type==='rock')this.rock(ctx,X,Y,p);
      if(tile.type==='sanctuary') {
        glow(ctx,X+24,Y+23,65,'#f3da8b45');flower(ctx,X+24,Y+40,45,1,this.reduced?0:time);star(ctx,X+24,Y+4,7);
      }
      if(tile.type==='spores') {
        const phase=(world.turns+Math.floor(hash(world.seed,x,y,10)*3))%3;
        glow(ctx,X+24,Y+24,40,phase===0?'#db94e944':'#bca2e71a');mushroom(ctx,X+24,Y+42,31,true);
        if(phase!==1){ctx.strokeStyle=phase===0?'#efa9e9aa':'#e6d99a';ctx.lineWidth=1.5;ctx.setLineDash([2,4]);ctx.beginPath();ctx.arc(X+24,Y+24,19,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
      }
      if(tile.type==='crumble') {
        ctx.strokeStyle=world.unstable.has(id(x,y))?'#f3ca83':'#bbaa7f';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(X+5,Y+37);ctx.lineTo(X+18,Y+29);ctx.lineTo(X+27,Y+39);ctx.lineTo(X+38,Y+26);ctx.lineTo(X+43,Y+31);ctx.stroke();
      }
      if(tile.type==='falling') {
        this.rock(ctx,X,Y-16,p,.65);const phase=(world.turns+Math.floor(hash(world.seed,x,y,11)*4))%4;
        ctx.strokeStyle=phase===3?'#f8c488':'#c6acd780';ctx.lineWidth=1.5;ctx.setLineDash([2,5]);ctx.beginPath();ctx.moveTo(X+24,Y+29);ctx.lineTo(X+24,Y+TILE+22);ctx.stroke();ctx.setLineDash([]);
        if(phase===3)star(ctx,X+24,Y+10,5,'#ffd69e');
      }
      if(tile.item) {
        const lift=this.reduced?0:Math.sin(time*1.6+x+y)*1.3;
        glow(ctx,X+24,Y+24,30,(tile.item==='heart'?'#eda7c1':'#dbc888')+'24');
        drawItem(ctx,tile.item,X+24,Y+24+lift,tile.item==='chest'?31:26,tile.relic);
      }
    }
    if(cam.y<10)this.meadow(ctx,world,time,W,cam);
    for(const bloom of world.blooms) {
      const X=(bloom.x+.5)*TILE-cam.x+(bloom.variant%2?-15:15),Y=(bloom.y+1.02)*TILE-cam.y;
      if(X< -80||X>W+80||Y< -80||Y>H+80)continue;
      const p=palette(bloom.y);
      glow(ctx,X,Y-12,75,p.glow+'48');
      if(bloom.kind==='flower'||bloom.kind==='starflower') {
        flower(ctx,X,Y,34,bloom.variant,this.reduced?0:time);
        if(bloom.kind==='starflower')for(let j=0;j<4;j++)star(ctx,X+Math.cos(j*1.7)*20,Y-20+Math.sin(j*1.7)*18,2.5);
      } else if(bloom.kind==='crystal') {
        gem(ctx,X-6,Y-7,25,p.crystal);gem(ctx,X+8,Y-2,17,'#c9b6eb');
      } else if(bloom.kind==='vine') {
        ctx.strokeStyle='#a2c79e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(X-12,Y+7);ctx.bezierCurveTo(X-25,Y-12,X+28,Y-10,X+10,Y-37);ctx.stroke();
        for(let j=0;j<4;j++){ctx.fillStyle='#aed1a9';ctx.beginPath();ctx.ellipse(X-7+j*5,Y-j*8,6,2.5,-.6,0,Math.PI*2);ctx.fill();}flower(ctx,X+9,Y-30,16,bloom.variant,0);
      } else for(let j=0;j<5;j++) {
        const t=this.reduced?0:time*.6;const xx=X+Math.sin(t+j*2)*22,yy=Y-16+Math.cos(t*.8+j)*17;
        glow(ctx,xx,yy,12,'#eae6a75a');star(ctx,xx,yy,2.5,'#fff3bd');
      }
    }
    for(const creature of world.creaturesNear(world.player.x,world.player.y)) {
      if(!world.revealed.has(id(creature.x,creature.y)))continue;
      const X=(creature.x+.5)*TILE-cam.x,Y=(creature.y+.5)*TILE-cam.y;
      glow(ctx,X,Y,38,'#a3b7f922');round(ctx,X-17,Y-11,34,25,12,'#7f90b5','#c4c4e3');
      for(const d of [-6,6]){ctx.fillStyle='#fff2d9';ctx.beginPath();ctx.arc(X+d,Y-1,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#33354e';ctx.beginPath();ctx.arc(X+d+1,Y,2,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#d9c39a88';for(let j=0;j<4;j++){ctx.beginPath();ctx.ellipse(X-12+j*8,Y+13,4,2,0,0,Math.PI*2);ctx.fill();}
      const nextX=(creature.nextX+.5)*TILE-cam.x;ctx.strokeStyle='#d0bde180';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(nextX,Y+16,4,0,Math.PI*2);ctx.stroke();
    }
    for(const [direction,[dx,dy]] of Object.entries({up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]})) {
      const x=world.player.x+dx,y=world.player.y+dy;if(y<0)continue;
      const X=x*TILE-cam.x,Y=y*TILE-cam.y;
      const hovered=this.hover?.x===x&&this.hover?.y===y;
      round(ctx,X+4,Y+4,40,40,10,hovered?'#fbe9b921':'#fff7d407',hovered?'#ffe6acaa':'#f4e1b029');
    }
    let points=world.trail.map(p=>({x:(p.x+.5)*TILE-cam.x,y:(p.y+.5)*TILE-cam.y}));
    if(this.motion&&!this.reduced) {
      const t=Math.min(1,Math.max(0,(time-this.motion.at)/.16)),ease=1-(1-t)**3;
      points=points.map((p,i)=>({x:lerp((this.motion.from[i]?.x??world.player.x)*TILE+24-cam.x,p.x,ease),y:lerp((this.motion.from[i]?.y??world.player.y)*TILE+24-cam.y,p.y,ease)}));
      if(t===1)this.motion=null;
    }
    glow(ctx,points[0].x,points[0].y,115,'#f2db9f13');drawWorm(ctx,points,world.player.dir,this.reduced?0:time);
    this.particles=this.particles.filter(p=>time-p.born<1.4);
    for(const particle of this.particles) {
      const age=time-particle.born;ctx.globalAlpha=Math.max(0,1-age/1.4);
      const X=particle.x-cam.x+particle.vx*age,Y=particle.y-cam.y+particle.vy*age-8*age*age;
      if(particle.heart)heart(ctx,X,Y,12);else star(ctx,X,Y,4,particle.color);
    }
    ctx.globalAlpha=1;
    const vignette=ctx.createRadialGradient(W*.5,H*.45,W*.1,W*.5,H*.5,Math.max(W,H)*.65);
    vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#07132055');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  }
  wall(ctx,X,Y,p) {
    round(ctx,X+2,Y+2,44,44,7,p.soil,p.edge+'99');
    ctx.strokeStyle=p.edge+'66';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X+4,Y+8);ctx.lineTo(X+25,Y+3);ctx.lineTo(X+43,Y+21);ctx.lineTo(X+27,Y+43);ctx.lineTo(X+5,Y+30);ctx.closePath();ctx.moveTo(X+25,Y+3);ctx.lineTo(X+27,Y+43);ctx.stroke();
    star(ctx,X+24,Y+24,5,p.edge+'99');
  }
  door(ctx,X,Y,p,tile) {
    glow(ctx,X+24,Y+26,42,p.glow+'25');
    ctx.strokeStyle=tile.openedDoor?'#e8d89a77':'#e1c789';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(X+9,Y+45);ctx.lineTo(X+9,Y+20);ctx.bezierCurveTo(X+9,Y-1,X+39,Y-1,X+39,Y+20);ctx.lineTo(X+39,Y+45);ctx.stroke();
    if(!tile.openedDoor) {
      round(ctx,X+14,Y+19,20,26,3,'#253a44','#bfb28a88');
      for(let j=0;j<3;j++){ctx.strokeStyle='#bcb28f99';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(X+17+j*7,Y+20);ctx.lineTo(X+17+j*7,Y+44);ctx.stroke();}
      drawItem(ctx,tile.required==='key'?'key':'relic',X+24,Y+27,19,tile.required);
    }
  }
  rock(ctx,X,Y,p,scale=1) {
    ctx.save();ctx.translate(X+24,Y+27);ctx.scale(scale,scale);
    const g=ctx.createLinearGradient(-15,-20,15,18);g.addColorStop(0,'#a1a29b');g.addColorStop(1,'#646f78');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-18,9);ctx.quadraticCurveTo(-25,-6,-10,-17);ctx.quadraticCurveTo(8,-26,20,-5);ctx.quadraticCurveTo(27,11,7,18);ctx.quadraticCurveTo(-10,20,-18,9);ctx.fill();
    ctx.strokeStyle='#d8d9c066';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-13,-6);ctx.quadraticCurveTo(-5,-18,6,-13);ctx.stroke();ctx.restore();
  }
  meadow(ctx,world,time,W,cam) {
    const Y=-cam.y;
    // Soft trees, a tiny home, and wildflowers tie the surface to the underground art.
    for(let n=Math.floor(cam.x/330)-1;n<(cam.x+W)/330+1;n++) {
      const X=n*330+90-cam.x;
      ctx.strokeStyle='#637e68';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(X,Y+2);ctx.quadraticCurveTo(X-12,Y-56,X+8,Y-105);ctx.stroke();
      for(let i=0;i<5;i++){ctx.fillStyle=['#8db39b','#a5c6a6','#c1d5a8'][i%3];ctx.beginPath();ctx.ellipse(X+Math.cos(i*1.3)*38,Y-87+Math.sin(i*1.3)*23,38,29,i*.4,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#eeddbf77';ctx.beginPath();ctx.arc(X-8,Y-84,9,0,Math.PI*2);ctx.fill();
    }
    const home=-95-cam.x;
    round(ctx,home-34,Y-45,68,46,14,'#d4bc95','#907d67');
    ctx.fillStyle='#927b81';ctx.beginPath();ctx.moveTo(home-44,Y-38);ctx.quadraticCurveTo(home,Y-100,home+44,Y-38);ctx.closePath();ctx.fill();
    round(ctx,home-10,Y-25,20,26,10,'#6d7e70','#efdbb1');heart(ctx,home,Y-39,15);
    ctx.fillStyle='#8cb58b';ctx.fillRect(0,Y-5,W,7);ctx.strokeStyle='#d8ddb0';ctx.lineWidth=1.5;
    for(let x=Math.floor(cam.x/24)*24;x<cam.x+W;x+=24) {const X=x-cam.x;ctx.beginPath();ctx.moveTo(X,Y);ctx.quadraticCurveTo(X-2,Y-10,X+3,Y-13);ctx.stroke();if(hash(world.seed,x,0,25)<.4)flower(ctx,X,Y-2,13,Math.abs(Math.floor(x/24))%4,this.reduced?0:time);}
  }
}

export function drawWormPreview(canvas) {
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#183f3c');bg.addColorStop(.5,'#263f42');bg.addColorStop(1,'#403052');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  glow(ctx,W*.38,H*.6,W*.4,'#b8c8912e');glow(ctx,W*.76,H*.4,W*.3,'#c5a4e930');
  ctx.strokeStyle='#81a18a33';ctx.lineWidth=1.5;
  for(let i=0;i<12;i++){ctx.beginPath();ctx.moveTo(i*95,-10);ctx.bezierCurveTo(i*95-40,80,i*95+50,100,i*95-20,160+i%3*30);ctx.stroke();}
  for(let i=0;i<35;i++)star(ctx,hash(12,i,1)*W,hash(17,i,2)*H,1+hash(7,i,3)*2,'#ebdbb877');
  ctx.save();ctx.translate(W*.12,H*.7);ctx.scale(2.1,2.1);
  drawWorm(ctx,[{x:118,y:-16},{x:85,y:0},{x:51,y:-7},{x:14,y:6}],'right');ctx.restore();
  for(let i=0;i<7;i++)flower(ctx,W*.07+i*W*.14,H*.89,38+i%3*14,i%4,0);
  mushroom(ctx,W*.16,H*.73,64,true);mushroom(ctx,W*.79,H*.82,81,false);mushroom(ctx,W*.89,H*.87,45,true);
  glow(ctx,W*.62,H*.29,85,'#f9b9cf30');heart(ctx,W*.62,H*.29,63);
  gem(ctx,W*.86,H*.44,53,'#bbabec');drawItem(ctx,'necklace',W*.41,H*.28,49);star(ctx,W*.67,H*.18,8);star(ctx,W*.53,H*.39,6);
}

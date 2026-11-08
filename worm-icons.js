// Original vector artwork is shared by the world, collection, and arcade card.
export function round(ctx,x,y,w,h,r,fill,stroke) {
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
export function glow(ctx,x,y,r,color) {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
export function star(ctx,x,y,r,color='#ffe9a6') {
  ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+r*.2,y-r*.2,x+r,y);
  ctx.quadraticCurveTo(x+r*.2,y+r*.2,x,y+r);ctx.quadraticCurveTo(x-r*.2,y+r*.2,x-r,y);
  ctx.quadraticCurveTo(x-r*.2,y-r*.2,x,y-r);ctx.fill();
}
export function heart(ctx,x,y,size,color='#ed8cab') {
  ctx.save();ctx.translate(x,y);ctx.scale(size/32,size/32);
  const g=ctx.createLinearGradient(0,-14,0,14);g.addColorStop(0,'#ffd1de');g.addColorStop(.45,color);g.addColorStop(1,'#c85f89');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,13);ctx.bezierCurveTo(-30,-5,-13,-25,0,-12);ctx.bezierCurveTo(13,-25,30,-5,0,13);ctx.fill();
  ctx.strokeStyle='#fff3e0aa';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-11,-10);ctx.quadraticCurveTo(-17,-5,-12,0);ctx.stroke();ctx.restore();
}
export function gem(ctx,x,y,size,color='#85ded6') {
  ctx.save();ctx.translate(x,y);ctx.scale(size/32,size/32);
  ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(12,-8);ctx.lineTo(10,10);ctx.lineTo(0,18);ctx.lineTo(-10,10);ctx.lineTo(-12,-8);ctx.closePath();
  ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#d7fff4bb';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#dcfff799';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-3,-5);ctx.lineTo(-10,10);ctx.lineTo(-12,-8);ctx.closePath();ctx.fill();
  ctx.fillStyle='#166c7980';ctx.beginPath();ctx.moveTo(-3,-5);ctx.lineTo(12,-8);ctx.lineTo(10,10);ctx.lineTo(0,18);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#fff9d7bb';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(-3,-5);ctx.lineTo(0,18);ctx.moveTo(-3,-5);ctx.lineTo(12,-8);ctx.stroke();
  star(ctx,7,-9,4,'#fffbe1');ctx.restore();
}
export function drawItem(ctx,kind,x,y,size=30,variant) {
  if(kind==='heart') {heart(ctx,x,y,size);return;}
  if(kind==='relic'&&variant==='star') {gem(ctx,x,y,size,'#c2d8ee');star(ctx,x+size*.1,y-size*.08,size*.15,'#fff0b3');return;}
  if(kind==='gem') {gem(ctx,x,y,size);return;}
  if(kind==='relic') kind=variant==='rose'?'shoes':variant==='star'?'gem':'necklace';
  ctx.save();ctx.translate(x,y);ctx.scale(size/40,size/40);ctx.lineCap='round';ctx.lineJoin='round';
  if(kind==='necklace') {
    ctx.strokeStyle='#bb874b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-6,14,0,Math.PI);ctx.stroke();
    for(let i=0;i<10;i++){const t=i*Math.PI/9;ctx.fillStyle=i%2?'#f7d58a':'#fff0b8';ctx.beginPath();ctx.arc(Math.cos(t)*14,-6+Math.sin(t)*14,2.3,0,Math.PI*2);ctx.fill();}
    if(variant==='moon') {
      ctx.fillStyle='#ffe5a2';ctx.beginPath();ctx.arc(0,15,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#59726d';ctx.beginPath();ctx.arc(4,12,7,0,Math.PI*2);ctx.fill();
    } else {ctx.strokeStyle='#f8d387';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(8,14);ctx.lineTo(0,22);ctx.lineTo(-8,14);ctx.closePath();ctx.stroke();gem(ctx,0,14,11,'#e5a2d7');}
  } else if(kind==='shoes') {
    ctx.fillStyle='#f8d6ed';ctx.beginPath();ctx.moveTo(-19,6);ctx.quadraticCurveTo(-22,14,-10,16);ctx.lineTo(16,16);ctx.quadraticCurveTo(23,14,20,7);ctx.lineTo(14,-9);ctx.lineTo(6,-8);ctx.quadraticCurveTo(6,5,-5,4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#c87eac';ctx.beginPath();ctx.moveTo(13,14);ctx.lineTo(14,25);ctx.lineTo(19,25);ctx.lineTo(20,10);ctx.fill();
    ctx.strokeStyle='#f2ce86';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,12);ctx.quadraticCurveTo(2,16,20,12);ctx.stroke();
    ctx.fillStyle=variant==='rose'?'#dc718d':'#a49ce0';ctx.beginPath();ctx.ellipse(-6,3,6,3,-.4,0,Math.PI*2);ctx.ellipse(3,3,6,3,.4,0,Math.PI*2);ctx.fill();star(ctx,-1,3,3,'#ffe9b0');
    ctx.strokeStyle='#fff6f6bb';ctx.beginPath();ctx.moveTo(-15,9);ctx.lineTo(-8,9);ctx.stroke();
  } else if(kind==='chest') {
    const g=ctx.createLinearGradient(0,-7,0,18);g.addColorStop(0,'#bd8d63');g.addColorStop(1,'#795544');
    round(ctx,-20,-1,40,25,4,g,'#e2bf83');
    const lid=ctx.createLinearGradient(0,-20,0,0);lid.addColorStop(0,'#dab28a');lid.addColorStop(1,'#9b694c');
    ctx.beginPath();ctx.moveTo(-20,0);ctx.lineTo(-20,-7);ctx.quadraticCurveTo(-17,-22,0,-22);ctx.quadraticCurveTo(17,-22,20,-7);ctx.lineTo(20,0);ctx.closePath();ctx.fillStyle=lid;ctx.fill();ctx.strokeStyle='#f1d294';ctx.stroke();
    ctx.fillStyle='#e9c47e';ctx.fillRect(-14,-17,4,35);ctx.fillRect(10,-17,4,35);ctx.fillRect(-20,-1,40,3);
    round(ctx,-5,-5,10,13,3,'#f3d695');heart(ctx,0,1,7,'#ce7890');
  } else if(kind==='key') {
    ctx.strokeStyle='#9b793d';ctx.lineWidth=6;ctx.beginPath();ctx.arc(-7,-8,8,0,Math.PI*2);ctx.moveTo(-1,-2);ctx.lineTo(17,16);ctx.moveTo(10,9);ctx.lineTo(5,14);ctx.moveTo(15,14);ctx.lineTo(11,18);ctx.stroke();
    ctx.strokeStyle='#ffe4a0';ctx.lineWidth=3;ctx.stroke();star(ctx,-7,-8,5,'#fff0b5');
  }
  ctx.restore();
}

export function flower(ctx,x,y,size=25,variant=0,time=0) {
  const colors=['#f2b3ce','#e5c77e','#a5dfd4','#c9b7e9'];
  ctx.save();ctx.translate(x,y);ctx.scale(size/30,size/30);
  const bend=Math.sin(time*.7+x*.01)*1.5;
  ctx.strokeStyle='#8bb993';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,8);ctx.quadraticCurveTo(-3,-4,bend,-17);ctx.stroke();
  ctx.fillStyle='#6a9b82';ctx.beginPath();ctx.ellipse(-5,0,6,2.6,.5,0,Math.PI*2);ctx.ellipse(4,-6,6,2.6,-.5,0,Math.PI*2);ctx.fill();
  for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillStyle=colors[variant%4];ctx.beginPath();ctx.ellipse(bend+Math.cos(a)*5,-17+Math.sin(a)*5,4.5,3,a,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fff3ba';ctx.beginPath();ctx.arc(bend,-17,3.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function mushroom(ctx,x,y,size=26,pink=false) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/30,size/30);
  ctx.strokeStyle='#d9d1ad';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(0,4);ctx.quadraticCurveTo(-2,-5,0,-13);ctx.stroke();
  const g=ctx.createLinearGradient(0,-25,0,-10);g.addColorStop(0,pink?'#edb4cd':'#a6dfca');g.addColorStop(1,pink?'#a9608c':'#528b87');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-16,-10);ctx.bezierCurveTo(-14,-31,14,-31,16,-10);ctx.quadraticCurveTo(0,-4,-16,-10);ctx.fill();
  ctx.fillStyle='#fff0da99';for(const [x,y,r] of [[-7,-16,2],[2,-21,2.5],[9,-14,1.7]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}

export function drawWorm(ctx,points,direction='right',time=0) {
  if(!points.length)return;
  const path=(width,color)=>{ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    points.forEach((p,i)=>{if(!i)ctx.moveTo(p.x,p.y);else{const prev=points[i-1];ctx.quadraticCurveTo(prev.x,prev.y,(p.x+prev.x)/2,(p.y+prev.y)/2);}});const last=points.at(-1);ctx.lineTo(last.x,last.y);ctx.stroke();};
  ctx.save();ctx.shadowColor='#070c1b66';ctx.shadowBlur=9;ctx.shadowOffsetY=5;path(29,'#995976');ctx.shadowBlur=0;ctx.shadowOffsetY=0;path(25,'#e9a7bb');
  for(let i=points.length-1;i>0;i--){const p=points[i],next=points[i-1];ctx.strokeStyle='#ba78947a';ctx.lineWidth=1.5;const a=Math.atan2(next.y-p.y,next.x-p.x);
    for(const f of [.25,.6]){const x=p.x+(next.x-p.x)*f,y=p.y+(next.y-p.y)*f;ctx.beginPath();ctx.moveTo(x+Math.sin(a)*9,y-Math.cos(a)*9);ctx.quadraticCurveTo(x-2,y-2,x-Math.sin(a)*9,y+Math.cos(a)*9);ctx.stroke();}}
  const p=points[0];const angle={right:0,left:Math.PI,up:-Math.PI/2,down:Math.PI/2}[direction]??0;
  ctx.translate(p.x,p.y);ctx.rotate(angle);
  const g=ctx.createRadialGradient(-5,-7,1,0,0,22);g.addColorStop(0,'#ffe0df');g.addColorStop(1,'#db8aa9');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(2,0,18,16,0,0,Math.PI*2);ctx.fill();
  for(const y of [-6,6]){ctx.fillStyle='#fff8eb';ctx.beginPath();ctx.ellipse(8,y,5,4.6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#343046';ctx.beginPath();ctx.arc(10,y,2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(11,y-1,1,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#d2749b66';ctx.beginPath();ctx.ellipse(2,-11,4,2,0,0,Math.PI*2);ctx.ellipse(2,11,4,2,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#78445f';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(12,0,3,-.5,.5);ctx.stroke();
  ctx.rotate(-angle);ctx.strokeStyle='#7da385';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-6,-12);ctx.quadraticCurveTo(-12,-23,-4,-24);ctx.stroke();
  ctx.fillStyle='#a8cb9d';ctx.beginPath();ctx.ellipse(-5,-23,6,3,-.4,0,Math.PI*2);ctx.fill();star(ctx,-4,-23,2.5,'#ffe4a1');ctx.restore();
}

// A deterministic, unbounded, turn-based world. Animation never advances hazards.
export const CHUNK = 14;
export const DIRECTIONS = { up: [0,-1], right: [1,0], down: [0,1], left: [-1,0] };
export const LOOT = {
  gem: { name: 'Edelsteine', singular: 'Ein Edelstein', color: '#88e3df' },
  necklace: { name: 'Schmuckketten', singular: 'Eine goldene Kette', color: '#f3d180' },
  chest: { name: 'Schatztruhen', singular: 'Eine Schatztruhe', color: '#dfb479' },
  shoes: { name: 'Prinzessinnenschuhe', singular: 'Ein Prinzessinnenschuh', color: '#f4b0d6' },
};
export const RELICS = {
  moon: { name: 'Mondmedaillon', category: 'necklace', place: 'Mondgarten', text: 'öffnet die Mondgärten' },
  star: { name: 'Sternenstein', category: 'gem', place: 'Sternengrotte', text: 'öffnet die Sternengrotten' },
  rose: { name: 'Rosenschuh', category: 'shoes', place: 'Rosengewölbe', text: 'öffnet die Rosengewölbe' },
};
const ROOM = ['###D###','#.....#','#..R..#','###.###','#....C#','#.H...#','#######'];
export const id = (x,y) => `${x},${y}`;
export function hash(seed,x,y,salt=0) {
  let h = (seed ^ Math.imul(x,374761393) ^ Math.imul(y,668265263) ^ Math.imul(salt,1274126177)) >>> 0;
  h = Math.imul(h ^ h >>> 13,1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
export function zoneAt(y) {
  if (y < 18) return { name:'Blumenwiese', level:0, hint:'Hier darfst du einfach neugierig sein.' };
  if (y < 52) return { name:'Glitzerhöhlen', level:1, hint:'Schlüssel und kleine Rätsel warten auf dich.' };
  const names = ['Amethysttiefen','Sternenmeer','Smaragdträume','Rosenschimmer'];
  return { name:names[Math.floor((y-52)/42)%names.length], level:2, hint:'Schau auf die Zeichen. Alles wartet auf deinen Zug.' };
}

export class WormWorld {
  constructor({ seed = 1007, saved } = {}) {
    this.seed = seed >>> 0;
    this.player = { x:0,y:1,dir:'right' };
    this.trail = [{x:0,y:1},{x:-1,y:1},{x:-2,y:1},{x:-3,y:1}];
    this.dug = new Set(['0,0','0,1','-1,1','-2,1','-3,1']);
    this.revealed = new Set();
    this.collected = new Set();
    this.opened = new Set();
    this.overrides = new Map();
    this.unstable = new Map();
    this.blooms = [];
    this.inventory = { gem:0, necklace:0, chest:0, shoes:0, key:0 };
    this.relics = new Set();
    this.discovered = new Set(['Blumenwiese']);
    this.hearts = 0;
    this.turns = 0;
    this.maxDepth = 1;
    this.safe = {x:0,y:1};
    this.history = [];
    this.events = [];
    this.journal = ['Dein Abenteuer beginnt unter der Blumenwiese.'];
    this.message = 'Ein Herz wartet direkt unter dir. Grabe ein Feld nach unten.';
    if (saved) this.restore(saved);
    this.reveal();
  }

  roomAt(x,y) {
    if (y < 18) return null;
    const cx = Math.floor(x/CHUNK), cy = Math.floor((y-18)/CHUNK);
    const lx = x-cx*CHUNK, ly = y-18-cy*CHUNK;
    const special = ((cy + Math.abs(cx)) % 3 === 1);
    const relic = ['moon','star','rose'][Math.floor(cy/3 + Math.abs(cx))%3];
    return {cx,cy,lx,ly,special,relic,inside:lx>=4&&lx<=10&&ly>=5&&ly<=11};
  }

  baseTile(x,y) {
    if (y < 0) return {type:'sky'};
    const start = { '0,2':'heart','-1,3':'gem','1,4':'heart','2,5':'necklace','-1,7':'shoes','1,9':'chest','0,12':'key','2,14':'heart' };
    const starting = start[id(x,y)];
    if (starting) return { type:'soil',item:starting };
    if (y===1 && Math.abs(x)<=3 || y===0 && x===0) return {type:'air'};
    const room = this.roomAt(x,y);
    if (room) {
      const {lx,ly,special,relic,cx,cy} = room;
      if (lx===7 && ly===1) return {type:'sanctuary'};
      if (lx===7 && ly===3) return {type:'soil',item:special?'relic':'key',relic};
      // The checkpoint and the approach to its key/door are always peaceful.
      if (lx>=6 && lx<=8 && ly<=4) return {type:'soil'};
      if (room.inside) {
        const code = ROOM[ly-5][lx-4];
        const theme = special ? relic : 'crystal';
        if (code==='#') return {type:'wall',theme};
        if (code==='D') return {type:'door',required:special?relic:'key',theme};
        if (code==='R') return {type:'rock',theme};
        if (code==='C') return {type:'air',item:'chest',theme,room:id(cx,cy)};
        if (code==='H') return {type:'air',item:'heart',theme};
        return {type:'air',theme};
      }
      // Deeper cave creatures stay in a small visible side passage.
      if (y>=80 && ly===8 && lx>=1 && lx<=3) return {type:'air'};
    }
    const value = hash(this.seed,x,y);
    const hazard = hash(this.seed,x,y,8);
    if (y>=52 && hazard < Math.min(0.12,0.035+(y-52)*0.00035)) {
      const kind = hash(this.seed,x,y,9);
      return {type:kind<0.48?'spores':kind<0.82?'crumble':y>=80?'falling':'spores'};
    }
    if (y>=18 && value<0.032) return {type:'rock'};
    let item;
    const v = hash(this.seed,x,y,3);
    if (v<0.085) item='heart';
    else if(v<0.15) item='gem';
    else if(v<0.169) item='necklace';
    else if(v<0.184) item='shoes';
    else if(v<0.2) item='chest';
    else if(v<0.225 && y>=9) item='key';
    const pocket = hash(this.seed,Math.floor(x/3),Math.floor(y/2),5)>0.76;
    return {type:pocket?'air':'soil',item};
  }

  tile(x,y) {
    const key = id(x,y);
    let tile = this.overrides.has(key) ? { ...this.overrides.get(key) } : this.baseTile(x,y);
    if (this.opened.has(key) && tile.type==='door') tile = { ...tile,type:'air',openedDoor:true };
    if (this.collected.has(key)) delete tile.item;
    return tile;
  }

  isOpen(x,y) {
    const tile = this.tile(x,y);
    return !['sky','wall','door','rock'].includes(tile.type) && (tile.type!=='soil'||this.dug.has(id(x,y)));
  }

  reveal() {
    for (let dy=-3;dy<=3;dy++) for (let dx=-3;dx<=3;dx++) {
      if (dx*dx+dy*dy<=11 && this.player.y+dy>=0) this.revealed.add(id(this.player.x+dx,this.player.y+dy));
    }
  }

  say(message,event) {
    this.message = message;
    if (event) this.events.push({type:event,x:this.player.x,y:this.player.y});
  }

  log(message) {
    this.journal.unshift(message);
    this.journal = this.journal.slice(0,8);
  }

  collect(x,y) {
    const tile = this.tile(x,y), key = id(x,y);
    if (!tile.item) return;
    this.collected.add(key);
    if (tile.item==='heart') {
      this.hearts++;
      const kinds = ['flower','crystal','fireflies','vine','starflower'];
      const bloom = {x,y,kind:kinds[(this.hearts-1)%kinds.length],variant:Math.floor(hash(this.seed,x,y,12)*4)};
      this.blooms.push(bloom);
      const messages = ['Eine leuchtende Blume erwacht für dich.','Die Erde schenkt dir einen funkelnden Kristall.','Kleine Lichtwesen tanzen durch deinen Gang.','Eine Zauberranke beginnt zu wachsen.','Eine Sternenblüte öffnet sich für dich.'];
      this.say(messages[(this.hearts-1)%5],'heart');
      this.log(`Herz gefunden · ein Stück Welt verzaubert (${this.hearts}).`);
    } else if (tile.item==='key') {
      this.inventory.key++;
      this.say('Ein Blumenschlüssel! Er passt zu einer verschlossenen Schatzkammer.','key');
      this.log('Ein goldener Blumenschlüssel liegt jetzt in deiner Tasche.');
    } else if (tile.item==='relic') {
      const relic = RELICS[tile.relic];
      this.relics.add(tile.relic);
      this.inventory[relic.category]++;
      this.say(`${relic.name} gefunden! Es ${relic.text}.`,'relic');
      this.log(`Besonderer Fund: ${relic.name}.`);
    } else if (tile.item==='chest') {
      this.inventory.chest++;
      const gems = 2+Math.floor(hash(this.seed,x,y,14)*3);
      this.inventory.gem+=gems;
      const bonus = hash(this.seed,x,y,15)<0.5?'necklace':'shoes';
      this.inventory[bonus]++;
      this.say(`Die Truhe öffnet sich: ${gems} Edelsteine und ${bonus==='shoes'?'ein Prinzessinnenschuh':'eine Schmuckkette'}!`,'chest');
      this.log(`Schatztruhe geöffnet · ${gems} Edelsteine und ein kleiner Märchenschatz.`);
    } else {
      this.inventory[tile.item]++;
      this.say(`${LOOT[tile.item].singular}! Dein Fund ist sicher in der Schatzkammer.`,'treasure');
      this.log(`${LOOT[tile.item].singular} gefunden.`);
    }
  }

  creaturesNear(x,y,turn=this.turns) {
    if (y<75) return [];
    const found=[];
    const cx=Math.floor(x/CHUNK), cy=Math.floor((y-18)/CHUNK);
    for (let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
      const Cx=cx+dx,Cy=cy+dy,Y=18+Cy*CHUNK+8;
      if(Y<80 || hash(this.seed,Cx,Cy,20)>Math.min(.8,.3+Y*.001)) continue;
      const phase=(turn+Math.floor(hash(this.seed,Cx,Cy,21)*4))%4;
      found.push({x:Cx*CHUNK+[1,2,3,2][phase],y:Y,nextX:Cx*CHUNK+[1,2,3,2][(phase+1)%4]});
    }
    return found;
  }

  hazardAt(x,y,turn=this.turns) {
    const tile=this.tile(x,y);
    if(tile.type==='spores' && (turn+Math.floor(hash(this.seed,x,y,10)*3))%3===0) return 'Der Schlummerpilz pustet eine Wolke Zauberstaub.';
    const above=this.tile(x,y-1);
    if(above.type==='falling' && (turn+Math.floor(hash(this.seed,x,y-1,11)*4))%4===0) return 'Ein kleiner Deckenstein purzelt herunter.';
    if(this.creaturesNear(x,y,turn).some(c=>c.x===x&&c.y===y)) return 'Ein Höhlenwesen stupst dich sanft an.';
    return null;
  }

  remember() {
    this.history.push(this.serialize());
    if(this.history.length>12) this.history.shift();
  }

  move(direction) {
    const delta=DIRECTIONS[direction];
    if(!delta) return false;
    const from={...this.player}, x=from.x+delta[0], y=from.y+delta[1], key=id(x,y);
    const tile=this.tile(x,y);
    if(tile.type==='sky') {this.say('Die Blumenwiese liegt über dir. Unter der Erde wartet dein Abenteuer.');return false;}
    if(tile.type==='wall') {this.say('Das ist eine Zauberwand. Suche den Eingang und seinen Schlüssel.');return false;}
    if(tile.type==='door') {
      const unlocked = tile.required==='key' ? this.inventory.key>0 : this.relics.has(tile.required);
      if(!unlocked) {
        this.say(tile.required==='key'?'Ein Blumenschlüssel öffnet dieses Tor. Schau ein Stück darüber nach.':`Zum Öffnen brauchst du: ${RELICS[tile.required].name}. Suche oberhalb des Eingangs.`);
        return false;
      }
    }
    if(tile.type==='rock') {
      const bx=x+delta[0],by=y+delta[1],beyond=this.tile(bx,by);
      if(!this.isOpen(bx,by)||beyond.item||beyond.type==='sanctuary') {
        this.say('Der Fels braucht einen freien Gang hinter sich. Grabe seitlich um ihn herum.');return false;
      }
    }
    this.remember();
    this.say('Ein kleiner Schritt, ein neues Wunder.');
    if(tile.type==='door') {
      if(tile.required==='key') this.inventory.key--;
      this.opened.add(key);
      const place=tile.required==='key'?'Schlüsselkammer':RELICS[tile.required].place;
      this.discovered.add(place);
      this.say(`${place} geöffnet. Die Welt hat einen neuen Ort für dich bewahrt.`,'door');
      this.log(`${place} entdeckt.`);
    }
    if(tile.type==='rock') {
      this.overrides.set(id(x+delta[0],y+delta[1]),{type:'rock',theme:tile.theme});
      this.overrides.set(key,{type:'air',theme:tile.theme});
      this.say('Der runde Fels rollt ein Feld weiter.','push');
    }
    this.player={x,y,dir:direction};
    this.trail.unshift({x,y});this.trail=this.trail.slice(0,4);
    this.dug.add(key);
    this.collect(x,y);
    if(tile.type==='sanctuary') {
      this.safe={x,y};
      this.say('Ein Lichtplatz! Hier bist du geborgen und kehrst bei einem Missgeschick zurück.','sanctuary');
      this.log('Einen neuen sicheren Lichtplatz gefunden.');
    }
    if(tile.type==='crumble'&&!this.unstable.has(key)) {
      this.unstable.set(key,3);
      this.say('Der Boden knistert. Gehe auf deinem nächsten Zug weiter.');
    }
    this.finishTurn(from);
    return true;
  }

  wait() {
    this.remember();
    this.say('Du wartest einen Zug und beobachtest die Höhle.');
    this.finishTurn({...this.player});
  }

  finishTurn(from) {
    this.turns++;
    let danger;
    for(const [key,timer] of this.unstable) {
      if(timer<=1) {
        this.overrides.set(key,{type:'air'});this.unstable.delete(key);
        if(key===id(this.player.x,this.player.y)) danger='Der brüchige Boden gibt unter dir nach.';
      } else this.unstable.set(key,timer-1);
    }
    danger ||= this.hazardAt(this.player.x,this.player.y);
    const swapped=this.creaturesNear(from.x,from.y,this.turns-1).some(c=>c.x===this.player.x&&c.y===this.player.y&&c.nextX===from.x&&c.y===from.y);
    if(swapped) danger='Ein Höhlenwesen kreuzt deinen Weg.';
    if(danger) {
      this.player={...this.safe,dir:'right'};
      this.trail=Array.from({length:4},()=>({...this.safe}));
      this.say(`${danger} Die Welt bringt dich zum Lichtplatz zurück. Deine Schätze bleiben bei dir.`,'rescue');
    }
    this.maxDepth=Math.max(this.maxDepth,this.player.y);
    const zone=zoneAt(this.player.y);
    if(!this.discovered.has(zone.name)) {
      this.discovered.add(zone.name);
      this.log(`${zone.name} entdeckt.`);
      if(!danger) this.say(`Willkommen: ${zone.name}. ${zone.hint}`,'zone');
    }
    this.reveal();
  }

  home() {
    this.remember();
    this.player={x:0,y:1,dir:'right'};
    this.trail=[{x:0,y:1},{x:-1,y:1},{x:-2,y:1},{x:-3,y:1}];
    this.safe={x:0,y:1};
    this.reveal();
    this.say('Zurück unter den Blumen. Die Tiefe wartet, bis du wieder neugierig bist.','sanctuary');
  }

  undo() {
    const previous=this.history.pop();
    if(!previous) return false;
    this.restore(previous);
    this.events=[];
    this.say('Ein Schritt zurück. Du darfst deinen Weg neu wählen.');
    return true;
  }

  get treasureCount() { return Object.keys(LOOT).reduce((sum,key)=>sum+this.inventory[key],0); }

  serialize() {
    return {version:1,seed:this.seed,player:{...this.player},trail:this.trail.map(p=>({...p})),dug:[...this.dug],revealed:[...this.revealed],
      collected:[...this.collected],opened:[...this.opened],overrides:[...this.overrides],unstable:[...this.unstable],
      blooms:this.blooms.map(b=>({...b})),inventory:{...this.inventory},relics:[...this.relics],discovered:[...this.discovered],hearts:this.hearts,
      turns:this.turns,maxDepth:this.maxDepth,safe:{...this.safe},journal:[...this.journal]};
  }

  restore(data) {
    // Copy to prevent undo snapshots from sharing mutable objects with the live world.
    const d=JSON.parse(JSON.stringify(data));
    const point=p=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.y)&&p.y>=0;
    if(d.version!==1 || !Number.isInteger(d.seed) || !point(d.player)||!DIRECTIONS[d.player.dir]||!point(d.safe)||
      !Array.isArray(d.trail)||d.trail.length<1||d.trail.length>4||!d.trail.every(point)||
      !Array.isArray(d.blooms)||!d.blooms.every(b=>point(b)&&typeof b.kind==='string'&&Number.isInteger(b.variant))||
      !Array.isArray(d.overrides)||!Array.isArray(d.unstable)||!d.inventory||!Array.isArray(d.journal)||!d.journal.every(s=>typeof s==='string'))throw new Error('Ungültiger Spielstand');
    for(const field of ['dug','revealed','collected','opened','relics','discovered'])if(!Array.isArray(d[field])||!d[field].every(s=>typeof s==='string'))throw new Error('Ungültige Welt');
    for(const field of ['hearts','turns','maxDepth'])if(!Number.isSafeInteger(d[field])||d[field]<0)throw new Error('Ungültiger Fortschritt');
    if(!d.overrides.every(p=>Array.isArray(p)&&typeof p[0]==='string'&&['rock','air'].includes(p[1]?.type))||
      !d.unstable.every(p=>Array.isArray(p)&&typeof p[0]==='string'&&Number.isInteger(p[1])&&p[1]>0))throw new Error('Ungültiger Gang');
    for(const key of [...Object.keys(LOOT),'key']) if(!Number.isInteger(d.inventory[key])||d.inventory[key]<0) throw new Error('Ungültiger Fund');
    this.seed=d.seed>>>0;
    for(const field of ['player','trail','blooms','inventory','hearts','turns','maxDepth','safe','journal']) this[field]=d[field];
    for(const field of ['dug','revealed','collected','opened','relics','discovered']) this[field]=new Set(d[field]);
    this.overrides=new Map(d.overrides);this.unstable=new Map(d.unstable);
  }

  drainEvents() {return this.events.splice(0);}
}

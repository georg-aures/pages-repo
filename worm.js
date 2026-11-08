import { WormWorld,LOOT,RELICS,DIRECTIONS,zoneAt,id } from './worm-engine.js';
import { WormRenderer,TILE } from './worm-renderer.js';
import { drawItem } from './worm-icons.js';
const $=id=>document.getElementById(id);
const SAVE_KEY='georg-arcade-worm-v1';
const newSeed=()=>globalThis.crypto?.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0;
const TILE_NAMES={soil:'Erde',air:'offener Gang',rock:'verschiebbarer Fels',wall:'Zauberwand',door:'verschlossenes Tor',sanctuary:'sicherer Lichtplatz',spores:'Schlummerpilz',crumble:'brüchiger Boden',falling:'Deckenstein',sky:'Blumenwiese'};

export class WormController {
  constructor({sound,unlockAudio}) {
    this.sound=sound;this.unlockAudio=unlockAudio;this.active=false;this.storageAvailable=true;
    this.board=$('worm-board');this.renderer=new WormRenderer(this.board);this.lastPaint=0;this.lastKey=0;
    this.world=this.load();
    this.dialogs=['worm-collection-dialog','worm-help-dialog','worm-reset-dialog'].map($);
    $('worm-back-button').addEventListener('click',()=>{location.hash='';});
    for(const button of document.querySelectorAll('[data-worm-direction]'))button.addEventListener('click',()=>this.perform('move',button.dataset.wormDirection));
    $('worm-wait-button').addEventListener('click',()=>this.perform('wait'));
    $('worm-undo-button').addEventListener('click',()=>this.perform('undo'));
    $('worm-home-button').addEventListener('click',()=>this.perform('home'));
    for(const name of ['worm-collection-button','worm-mobile-collection'])$(name).addEventListener('click',()=>this.openCollection());
    $('worm-help-button').addEventListener('click',()=>this.openDialog('worm-help-dialog'));
    for(const name of ['worm-new-button','worm-mobile-new'])$(name).addEventListener('click',()=>this.openDialog('worm-reset-dialog'));
    for(const button of document.querySelectorAll('[data-close-worm-dialog]'))button.addEventListener('click',()=>button.closest('dialog').close());
    this.dialogs.forEach(dialog=>dialog.addEventListener('close',()=>{if(this.active)this.board.focus({preventScroll:true});}));
    $('worm-confirm-new').addEventListener('click',()=>{
      this.world=new WormWorld({seed:newSeed()});
      this.renderer.focus(this.world);this.renderer.particles=[];
      this.save();this.updateHud();$('worm-reset-dialog').close();
    });
    this.board.addEventListener('pointerdown',event=>{
      if(!this.active||this.modalOpen||event.button!==0)return;
      event.preventDefault();this.board.focus({preventScroll:true});
      const cell=this.pointerCell(event),dx=cell.x-this.world.player.x,dy=cell.y-this.world.player.y;
      const direction=Object.keys(DIRECTIONS).find(key=>DIRECTIONS[key][0]===dx&&DIRECTIONS[key][1]===dy);
      if(direction)this.perform('move',direction);
      else{this.world.say('Tippe ein direkt benachbartes Feld an – oder benutze die Richtungspfeile.');this.updateHud();}
    });
    this.board.addEventListener('pointermove',event=>{this.renderer.hover=this.pointerCell(event);});
    this.board.addEventListener('pointerleave',()=>{this.renderer.hover=null;});
    document.addEventListener('keydown',event=>this.keydown(event));
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.active)this.save();});
    for(const canvas of document.querySelectorAll('[data-loot-icon]')) {
      drawItem(canvas.getContext('2d'),canvas.dataset.lootIcon,canvas.width/2,canvas.height/2,canvas.width*.6,canvas.dataset.relicIcon);
    }
    if(this.world.turns>0)$('worm-play-button').firstChild.nodeValue='Weitergraben ';
  }

  get modalOpen(){return this.dialogs.some(dialog=>dialog.open);}

  load() {
    try {
      const text=localStorage.getItem(SAVE_KEY);
      if(text){const world=new WormWorld({saved:JSON.parse(text)});world.say('Willkommen zurück. Deine Wege, Schätze und Weltwunder haben auf dich gewartet.');return world;}
    }catch{this.storageAvailable=false;}
    return new WormWorld({seed:newSeed()});
  }

  save() {
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(this.world.serialize()));this.storageAvailable=true;}
    catch{this.storageAvailable=false;}
    const note=this.storageAvailable?'Dein Abenteuer wird hier im Browser gespeichert.':'Speichern ist gerade nicht verfügbar. Deine Welt bleibt in diesem geöffneten Tab erhalten.';
    $('worm-save-note').textContent=note;
    $('worm-mobile-save').textContent=this.storageAvailable?'Dein Fortschritt wird gespeichert.':'Deine Welt bleibt in diesem geöffneten Tab erhalten.';
  }

  start() {
    this.active=true;
    const small=window.innerWidth<=650;
    this.board.width=small?576:960;this.board.height=small?544:640;
    this.renderer.focus(this.world);this.lastPaint=0;
    $('worm-screen').hidden=false;document.body.classList.add('game-active','worm-active');
    document.title="Wurm & Wunder — Georg's Arcade";
    this.updateHud();this.save();
    this.renderer.draw(this.world,performance.now()/1000);
    window.scrollTo({top:0,behavior:'instant'});this.board.focus({preventScroll:true});
  }

  stop() {
    const wasActive=this.active;this.active=false;
    if(wasActive)this.save();
    this.dialogs.forEach(dialog=>{if(dialog.open)dialog.close();});
    $('worm-screen').hidden=true;document.body.classList.remove('worm-active');
  }

  pointerCell(event) {
    const box=this.board.getBoundingClientRect();
    return {x:Math.floor(((event.clientX-box.x)*this.board.width/box.width+this.renderer.camera.x)/TILE),
      y:Math.floor(((event.clientY-box.y)*this.board.height/box.height+this.renderer.camera.y)/TILE)};
  }

  perform(action,argument) {
    if(!this.active||this.modalOpen)return false;
    this.unlockAudio();
    const before=this.world.trail.map(p=>({...p})),old={...this.world.player};
    let changed;
    if(action==='move')changed=this.world.move(argument);
    else if(action==='wait'){this.world.wait();changed=true;}
    else if(action==='undo')changed=this.world.undo();
    else if(action==='home'){this.world.home();changed=true;}
    const events=this.world.drainEvents(),now=performance.now()/1000;
    this.renderer.invalidate();
    const distance=Math.abs(this.world.player.x-old.x)+Math.abs(this.world.player.y-old.y);
    if(distance>5||action==='home')this.renderer.focus(this.world);
    else if(changed)this.renderer.motion={from:before,at:now};
    this.renderer.effects(events,now);
    events.forEach(event=>this.sound(`worm-${event.type}`));
    if(changed)this.save();
    this.updateHud();this.renderer.draw(this.world,now);
    return changed;
  }

  keydown(event) {
    if(!this.active||this.modalOpen||event.ctrlKey||event.metaKey||event.altKey||event.target.matches('input,textarea,select'))return;
    const key=event.key.toLowerCase();
    const directions={arrowup:'up',w:'up',arrowright:'right',d:'right',arrowdown:'down',s:'down',arrowleft:'left',a:'left'};
    if(directions[key]) {
      event.preventDefault();
      const now=performance.now();if(event.repeat&&now-this.lastKey<140)return;
      this.lastKey=now;this.perform('move',directions[key]);
    } else if(!event.repeat) {
      if(key===' '&&!event.target.closest('button,a')){event.preventDefault();this.perform('wait');}
      else if(key==='u'||key==='backspace'){event.preventDefault();this.perform('undo');}
      else if(key==='t'){event.preventDefault();this.openCollection();}
      else if(key==='h'||key==='?'){event.preventDefault();this.openDialog('worm-help-dialog');}
      else if(key==='escape')location.hash='';
    }
  }

  updateHud() {
    const world=this.world,zone=zoneAt(world.player.y);
    $('worm-depth').textContent=`${world.player.y} m`;
    $('worm-hearts').textContent=world.hearts;
    $('worm-keys').textContent=world.inventory.key;
    $('worm-treasures').textContent=world.treasureCount;
    $('worm-region').textContent=zone.name;
    $('worm-max-depth').textContent=`${world.maxDepth} m`;
    if($('worm-message').textContent!==world.message)$('worm-message').textContent=world.message;
    $('worm-undo-button').disabled=world.history.length===0;
    document.querySelectorAll('[data-worm-zone]').forEach(element=>element.classList.toggle('is-current',Number(element.dataset.wormZone)===zone.level));
    $('worm-journal').replaceChildren(...world.journal.slice(0,4).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    $('worm-neighbors').textContent=`Du bist ${world.player.y} Meter tief. `+Object.entries(DIRECTIONS).map(([direction,[dx,dy]])=>{
      const tile=world.tile(world.player.x+dx,world.player.y+dy),label={up:'Oben',right:'Rechts',down:'Unten',left:'Links'}[direction];
      const item=tile.item==='heart'?'ein Herz':tile.item==='key'?'ein Schlüssel':tile.item==='relic'?'ein besonderer Fund':LOOT[tile.item]?.singular;
      return `${label}: ${TILE_NAMES[tile.type]}${item?`, ${item}`:''}.`;
    }).join(' ');
    $('worm-play-button').firstChild.nodeValue=world.turns>0?'Weitergraben ':'Wunder entdecken ';
  }

  openDialog(name) {
    if(!this.active||this.modalOpen)return;
    $(name).showModal();
  }

  openCollection() {
    if(!this.active||this.modalOpen)return;
    for(const key of Object.keys(LOOT))$(`worm-count-${key}`).textContent=this.world.inventory[key];
    document.querySelectorAll('[data-relic]').forEach(element=>{
      const found=this.world.relics.has(element.dataset.relic);
      element.classList.toggle('is-found',found);
      element.querySelector('span').textContent=found?`Gefunden · ${RELICS[element.dataset.relic].place} zugänglich`:'Noch verborgen';
    });
    $('worm-collection-summary').textContent=`${this.world.hearts} ${this.world.hearts===1?'Herz hat':'Herzen haben'} ${this.world.blooms.length} ${this.world.blooms.length===1?'kleines Weltwunder':'kleine Weltwunder'} geweckt. ${this.world.discovered.size} ${this.world.discovered.size===1?'Ort':'Orte'} entdeckt. Dein tiefster Ausflug: ${this.world.maxDepth} m.`;
    this.openDialog('worm-collection-dialog');
  }

  frame(time) {
    if(!this.active||this.modalOpen||time-this.lastPaint<1000/30)return;
    this.lastPaint=time;this.renderer.draw(this.world,time/1000);
  }
}

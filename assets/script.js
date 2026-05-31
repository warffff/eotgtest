const views = [...document.querySelectorAll('.view')];
const navLinks = [...document.querySelectorAll('[data-view]')];
const mainNav = document.getElementById('mainNav');
const mobileMenu = document.getElementById('mobileMenu');
let currentView = document.querySelector('.view.active')?.id?.replace('view-', '') || 'home';

function showView(id, push = true) {
  const target = document.getElementById(`view-${id}`) ? id : 'home';
  if (target === currentView && document.getElementById(`view-${target}`)?.classList.contains('active')) {
    mainNav?.classList.remove('open');
    return;
  }

  currentView = target;
  views.forEach(v => {
    const active = v.id === `view-${target}`;
    v.classList.toggle('active', active);
    v.classList.remove('entering');
    if (active) {
      v.classList.add('entering');
      setTimeout(() => v.classList.remove('entering'), 260);
    }
  });

  document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === target));
  if (push) history.replaceState(null, '', `#${target}`);
  window.scrollTo({ top: 0, behavior: 'auto' });
  mainNav?.classList.remove('open');
}

navLinks.forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));
mobileMenu?.addEventListener('click', () => mainNav.classList.toggle('open'));
window.addEventListener('DOMContentLoaded', () => showView(location.hash.replace('#','') || 'home', false));
window.addEventListener('hashchange', () => showView(location.hash.replace('#','') || 'home', false));

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
const fxCanvas = document.getElementById('battleFx');
const fx = fxCanvas.getContext('2d');
let w, h, stars, sabers, duelBursts;
const saberColors = [
  'rgba(255,50,70,',
  'rgba(78,255,120,',
  'rgba(168,105,255,',
  'rgba(90,180,255,',
  'rgba(255,235,120,'
];

function resize(){
  const ratio = devicePixelRatio || 1;
  w = canvas.width = fxCanvas.width = innerWidth * ratio;
  h = canvas.height = fxCanvas.height = innerHeight * ratio;
  canvas.style.width = fxCanvas.style.width = innerWidth + 'px';
  canvas.style.height = fxCanvas.style.height = innerHeight + 'px';
  const count = Math.min(360, Math.floor(innerWidth * innerHeight / 4200));
  stars = Array.from({length:count}, () => ({
    x: Math.random()*w,
    y: Math.random()*h,
    r: (Math.random()*1.45 + .2) * ratio,
    a: Math.random()*0.65 + 0.15,
    s: Math.random()*0.018 + 0.004,
    vx: (Math.random()*0.055 + 0.01) * ratio
  }));
  sabers = [];
  duelBursts = [];
}

function spawnSaber(){
  const ratio = devicePixelRatio || 1;
  const side = Math.random() > .5 ? -1 : 1;
  const y = (Math.random() * 0.72 + 0.12) * h;
  const len = (Math.random()*170 + 130) * ratio;
  const speed = (Math.random()*6 + 7) * ratio * side;
  const angle = (Math.random()*.22 - .11);
  sabers.push({
    x: side > 0 ? -len : w + len,
    y, len, speed, angle,
    life: 1,
    width: (Math.random()*3 + 3) * ratio,
    color: saberColors[Math.floor(Math.random()*saberColors.length)]
  });
}

function spawnDuel(){
  const ratio = devicePixelRatio || 1;
  duelBursts.push({
    x: (Math.random()*.7 + .15) * w,
    y: (Math.random()*.45 + .28) * h,
    t: 0,
    life: Math.random()*90 + 95,
    s: (Math.random()*0.5 + 0.75) * ratio,
    c1: saberColors[Math.floor(Math.random()*saberColors.length)],
    c2: saberColors[Math.floor(Math.random()*saberColors.length)]
  });
}

function drawHumanSilhouette(x, y, s, alpha){
  fx.save();
  fx.globalAlpha = alpha;
  fx.fillStyle = 'rgba(1,6,12,.58)';
  fx.beginPath(); fx.arc(x, y - 18*s, 6*s, 0, Math.PI*2); fx.fill();
  fx.fillRect(x - 5*s, y - 12*s, 10*s, 28*s);
  fx.fillRect(x - 13*s, y + 13*s, 8*s, 22*s);
  fx.fillRect(x + 5*s, y + 13*s, 8*s, 22*s);
  fx.restore();
}

function drawSaberLine(x1,y1,x2,y2,width,color,alpha){
  fx.save();
  fx.lineCap = 'round';
  fx.strokeStyle = color + (0.28*alpha) + ')';
  fx.lineWidth = width * 4.4;
  fx.beginPath(); fx.moveTo(x1,y1); fx.lineTo(x2,y2); fx.stroke();
  fx.strokeStyle = color + (0.86*alpha) + ')';
  fx.lineWidth = width * 2.1;
  fx.beginPath(); fx.moveTo(x1,y1); fx.lineTo(x2,y2); fx.stroke();
  fx.strokeStyle = 'rgba(235,252,255,' + (0.92*alpha) + ')';
  fx.lineWidth = Math.max(1, width * .75);
  fx.beginPath(); fx.moveTo(x1,y1); fx.lineTo(x2,y2); fx.stroke();
  fx.restore();
}

function draw(){
  ctx.clearRect(0,0,w,h);
  for(const st of stars){
    st.a += st.s;
    const alpha = .13 + Math.abs(Math.sin(st.a)) * .78;
    st.x += st.vx;
    if(st.x > w+5) st.x = -5;
    ctx.beginPath();
    ctx.fillStyle = `rgba(180,235,255,${alpha})`;
    ctx.arc(st.x, st.y, st.r, 0, Math.PI*2);
    ctx.fill();
  }

  fx.clearRect(0,0,w,h);
  if(Math.random() < 0.0018 && sabers.length < 1) spawnSaber();
  if(Math.random() < 0.00055 && duelBursts.length < 1) spawnDuel();

  for(let i=sabers.length-1;i>=0;i--){
    const s = sabers[i];
    s.x += s.speed;
    s.life -= .0068;
    const dx = Math.cos(s.angle)*s.len;
    const dy = Math.sin(s.angle)*s.len;
    const alpha = Math.max(0, Math.min(1, s.life));
    drawSaberLine(s.x, s.y, s.x + dx, s.y + dy, s.width, s.color, alpha);
    if(s.x < -s.len*2 || s.x > w+s.len*2 || s.life <= 0) sabers.splice(i,1);
  }

  for(let i=duelBursts.length-1;i>=0;i--){
    const d = duelBursts[i];
    d.t++;
    const p = d.t / d.life;
    const alpha = Math.sin(Math.PI * p) * .28;
    const swing = Math.sin(d.t*.075) * 32 * d.s;
    drawHumanSilhouette(d.x - 46*d.s, d.y + 32*d.s, d.s, alpha*.75);
    drawHumanSilhouette(d.x + 46*d.s, d.y + 32*d.s, d.s, alpha*.75);
    drawSaberLine(d.x - 48*d.s, d.y + 2*d.s, d.x + 38*d.s, d.y - 36*d.s + swing, 3.2*d.s, d.c1, alpha);
    drawSaberLine(d.x + 48*d.s, d.y + 2*d.s, d.x - 40*d.s, d.y - 30*d.s - swing, 3.2*d.s, d.c2, alpha);
    if(d.t % 48 === 0){
      fx.save();
      fx.fillStyle = `rgba(210,245,255,${alpha*.25})`;
      fx.beginPath(); fx.arc(d.x, d.y - 18*d.s, 28*d.s, 0, Math.PI*2); fx.fill();
      fx.restore();
    }
    if(d.t > d.life) duelBursts.splice(i,1);
  }
  requestAnimationFrame(draw);
}
resize(); draw();
addEventListener('resize', resize);

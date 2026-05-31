const views = [...document.querySelectorAll('.view')];
const navLinks = [...document.querySelectorAll('[data-view]')];
const mainNav = document.getElementById('mainNav');
const mobileMenu = document.getElementById('mobileMenu');

function showView(id, push = true) {
  const target = document.getElementById(`view-${id}`) ? id : 'home';
  views.forEach(v => v.classList.toggle('active', v.id === `view-${target}`));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.view === target));
  document.querySelectorAll('.reveal').forEach(el => { el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; });
  if (push) history.replaceState(null, '', `#${target}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  mainNav?.classList.remove('open');
}

navLinks.forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));
mobileMenu?.addEventListener('click', () => mainNav.classList.toggle('open'));
window.addEventListener('load', () => showView(location.hash.replace('#','') || 'home', false));
window.addEventListener('hashchange', () => showView(location.hash.replace('#','') || 'home', false));

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let w, h, stars;
function resize(){
  w = canvas.width = innerWidth * devicePixelRatio;
  h = canvas.height = innerHeight * devicePixelRatio;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  const count = Math.min(260, Math.floor(innerWidth * innerHeight / 5200));
  stars = Array.from({length:count}, () => ({
    x: Math.random()*w,
    y: Math.random()*h,
    r: (Math.random()*1.35 + .25) * devicePixelRatio,
    a: Math.random()*0.65 + 0.15,
    s: Math.random()*0.018 + 0.004,
    vx: (Math.random()*0.08 + 0.02) * devicePixelRatio
  }));
}
function draw(){
  ctx.clearRect(0,0,w,h);
  for(const st of stars){
    st.a += st.s;
    const alpha = .18 + Math.abs(Math.sin(st.a)) * .78;
    st.x += st.vx;
    if(st.x > w+5) st.x = -5;
    ctx.beginPath();
    ctx.fillStyle = `rgba(180,235,255,${alpha})`;
    ctx.arc(st.x, st.y, st.r, 0, Math.PI*2);
    ctx.fill();
  }
  requestAnimationFrame(draw);
}
resize(); draw();
addEventListener('resize', resize);

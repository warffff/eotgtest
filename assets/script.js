const navToggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
if (navToggle && nav) navToggle.addEventListener('click', () => nav.classList.toggle('open'));

document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => nav?.classList.remove('open')));

const search = document.getElementById('search');
const cards = [...document.querySelectorAll('.doc-card')];
if (search) search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  cards.forEach(card => {
    const hay = (card.dataset.title + ' ' + card.textContent).toLowerCase();
    card.style.display = hay.includes(q) ? '' : 'none';
  });
});

const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => io.observe(el));

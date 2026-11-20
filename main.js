(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Reveal on scroll (staggered per batch) ---------- */
  const io = new IntersectionObserver((entries) => {
    const entering = entries.filter(e => e.isIntersecting).map(e => e.target);
    entering.forEach((el, i) => {
      setTimeout(() => el.classList.add('in'), reduce ? 0 : i * 80);
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  $$('.reveal, .deco').forEach(el => io.observe(el));

  /* ---------- Stat counters ---------- */
  const countUp = (el) => {
    const target = parseFloat(el.dataset.count);
    const dec = el.dataset.count.includes('.') ? 1 : 0;
    const suffix = el.dataset.suffix || '';
    if (reduce) return;
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => {
      const k = clamp((t - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = (target * e).toLocaleString('en-CA', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  setTimeout(() => $$('[data-count]').forEach(countUp), 700);

  /* ---------- Elements driven by scroll ---------- */
  const nav = $('.nav');
  const steps = $('.steps');
  const stepItems = steps ? $$('li', steps) : [];
  const process = $('#process');
  const cta = $('.cta');
  const decos = $$('.deco[data-speed]');
  const navLinks = $$('.links a');
  const sections = navLinks.map(a => $(a.getAttribute('href')));

  const rail = $('.brush-rail');
  const brush = $('.brush', rail);
  const brushImg = $('img', brush);
  const paint = $('.trail-paint', rail);
  const pathLen = paint.getTotalLength();

  let target = 0, current = 0, lastY = scrollY, running = false;

  const docProgress = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? clamp(scrollY / max, 0, 1) : 0;
  };

  function placeBrush(p, tilt) {
    const w = rail.clientWidth, h = rail.clientHeight;
    const pt = paint.getPointAtLength(p * pathLen);      // path lives in a 40x1000 box
    const x = (pt.x / 40) * w, y = (pt.y / 1000) * h;
    const bw = brush.offsetWidth, bh = bw * 104 / 160;
    // bristle tip sits at ~95% / 70% of the brush art; pin that point to the trail head
    brush.style.transform = `translate(${x - bw / 2 - bw * 0.45}px, ${y - bh * 0.70}px)`;
    brushImg.style.transformOrigin = '95% 70%';
    brushImg.style.transform = `rotate(${63 + tilt}deg)`;
    paint.style.strokeDashoffset = 1 - p;
  }

  function loop() {
    const diff = target - current;
    current = reduce ? target : current + diff * 0.12;
    const tilt = reduce ? 0 : clamp(diff * 900, -16, 16);
    placeBrush(current, tilt);
    if (Math.abs(diff) > 0.0004) requestAnimationFrame(loop);
    else { current = target; placeBrush(current, 0); running = false; }
  }

  function onScroll() {
    const y = scrollY;

    // nav: solid after leaving top, hide on scroll down, show on scroll up
    nav.classList.toggle('solid', y > 40);
    nav.classList.toggle('hide', y > innerHeight * 0.9 && y > lastY + 2);
    if (y < lastY - 2) nav.classList.remove('hide');
    lastY = y;

    // brush
    rail.classList.toggle('on', y > 60);
    target = docProgress();
    if (!running) { running = true; requestAnimationFrame(loop); }

    if (reduce) return;

    // process line fill + dots
    if (process && steps) {
      const r = process.getBoundingClientRect();
      const p = clamp((innerHeight * 0.75 - r.top) / (r.height * 0.7), 0, 1);
      steps.style.setProperty('--p', p.toFixed(3));
      stepItems.forEach((li, i) => li.classList.toggle('lit', p >= i / (stepItems.length - 1) - 0.02));
    }

    // parallax brush strokes
    decos.forEach(d => {
      const r = d.parentElement.getBoundingClientRect();
      d.style.transform = `translateY(${(r.top) * parseFloat(d.dataset.speed)}px)`;
    });

    // CTA background parallax
    if (cta) {
      const r = cta.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) cta.style.setProperty('--py', `${r.top * -0.15}px`);
    }

    // active nav link
    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) active = i; });
    navLinks.forEach((a, i) => a.classList.toggle('active', i === active));
  }

  if (reduce) stepItems.forEach(li => li.classList.add('lit')), steps && steps.style.setProperty('--p', 1);

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();

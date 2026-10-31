/* Tirage du tarot gratuit : mise en scène « rituel » (mélange, distribution, retournement, révélation).
   Tout se passe dans le navigateur, rien n'est envoyé. */
(function () {
  'use strict';
  var bloc = document.querySelector('[data-tarot]');
  if (!bloc) return;
  var cartes = JSON.parse(bloc.querySelector('.tarot-donnees').textContent);
  var scene = bloc.querySelector('.tirage-jeu');
  var resultat = bloc.querySelector('.tirage-resultat');
  var consigne = bloc.querySelector('.tc-n');
  var modes = bloc.querySelectorAll('.tm-mode');
  var btnBattre = bloc.querySelector('.tirage-reset');
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var POSITIONS = ['Le passé', 'Le présent', 'Le futur'];
  var REPONSE = { oui: 'Plutôt oui', non: 'Plutôt non', 'peut-être': 'Peut-être, à préciser' };
  var mode = 1, choisies = [], tirage = [], els = [], occupe = false, distribue = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hasard(n) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n; }
  function attendre(ms) { return new Promise(function (r) { setTimeout(r, calme ? 0 : ms); }); }
  function melanger() {
    var t = cartes.slice();
    for (var i = t.length - 1; i > 0; i--) { var j = hasard(i + 1); var x = t[i]; t[i] = t[j]; t[j] = x; }
    return t.slice(0, 7);
  }
  function face(c) {
    if (c.img) return '<img class="tj-img" src="./assets/' + c.img + '" alt="' + esc(c.n) + '">';
    return '<span class="carte-tarot"><span class="ct-num">' + esc(c.r || '') + '</span><span class="ct-sym"></span><span class="ct-nom">' + esc(c.n) + '</span></span>';
  }

  // ---------- Géométrie de la scène ----------
  function dims() {
    var w = scene.clientWidth;
    var cw = w < 420 ? Math.round(Math.max(64, w / 4.6)) : w < 640 ? 100 : 140;
    var ch = Math.round(cw * 1047 / 720);
    return { w: w, cw: cw, ch: ch, pas: Math.min(cw * 0.86, (w - cw * 1.45) / 6) };
  }
  function tf(p) { return 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + (p.r || 0).toFixed(2) + 'deg) scale(' + (p.s || 1) + ')'; }
  function paquet(i) { var d = dims(); return { x: d.w / 2 - d.cw / 2 + (i - 3) * 0.7, y: 40 - i * 1.4, r: (i % 2 ? 1 : -1) * 1.5 }; }
  function eventail(i) { var d = dims(); var k = i - 3; return { x: d.w / 2 - d.cw / 2 + k * d.pas, y: 34 + k * k * 4.5, r: k * 5.5 }; }
  function bouger(el, p, ms, delai, courbe) {
    var de = el._t, vers = tf(p);
    el._t = vers;
    el.style.transform = vers;
    if (calme || !ms || !el.animate) return Promise.resolve();
    return el.animate([{ transform: de }, { transform: vers }], { duration: ms, delay: delai || 0, easing: courbe || 'cubic-bezier(.22,.8,.2,1)', fill: 'backwards' }).finished.catch(function () {});
  }
  function hauteurScene() { var d = dims(); scene.style.height = (d.ch + 120) + 'px'; }

  // ---------- Les cartes ----------
  function creer() {
    tirage = melanger(); choisies = [];
    var d = dims();
    scene.innerHTML = '';
    els = tirage.map(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tj-carte';
      b.setAttribute('aria-label', 'Choisir la carte ' + (i + 1));
      b.style.width = d.cw + 'px';
      b.style.setProperty('--i', i);
      b.style.zIndex = 10 + i;
      b.innerHTML = '<span class="tj-lift"><span class="tj-flotte"><span class="tj-inner">' +
        '<span class="tj-dos"><img src="./assets/tarot-dos.webp" alt="" width="720" height="1047"></span>' +
        '<span class="tj-face">' + face(c) + '</span></span></span></span>';
      b._i = i;
      b._t = tf(paquet(i));
      b.style.transform = b._t;
      scene.appendChild(b);
      return b;
    });
  }

  // Le mélange : le paquet se coupe en deux et se recompose, deux fois
  function melangerAnim() {
    if (calme) return Promise.resolve();
    var d = dims();
    var tour = function (sens) {
      return Promise.all(els.map(function (el, i) {
        var p = paquet(i), cote = (i % 2 ? 1 : -1) * sens;
        return bouger(el, { x: p.x + cote * d.cw * 0.62, y: p.y - 6, r: cote * 9 }, 260, i * 18, 'cubic-bezier(.4,0,.2,1)');
      })).then(function () {
        els.forEach(function (el, i) { el.style.zIndex = 10 + (i % 2 ? i : 6 - i); });
        return Promise.all(els.map(function (el, i) { return bouger(el, paquet(i), 300, i * 18, 'cubic-bezier(.4,0,.2,1)'); }));
      });
    };
    return tour(1).then(function () { return tour(-1); });
  }

  // La distribution en éventail, carte après carte
  function distribuer() {
    hauteurScene();
    var d = dims();
    return Promise.all(els.map(function (el, i) {
      el.style.zIndex = 10 + i;
      el.style.width = d.cw + 'px';
      return bouger(el, eventail(i), 760, 120 + i * 95, 'cubic-bezier(.16,.9,.24,1)');
    })).then(function () { scene.classList.add('pret'); distribue = true; });
  }

  // Poussière d'or au moment où la carte se retourne
  function poussiere(el) {
    if (calme || !el.animate) return;
    var r = el.getBoundingClientRect(), s = scene.getBoundingClientRect();
    var cx = r.left - s.left + r.width / 2, cy = r.top - s.top + r.height / 2;
    for (var k = 0; k < 28; k++) {
      var p = document.createElement('span');
      p.className = 'poussiere';
      var taille = 3 + Math.random() * 5;
      p.style.width = p.style.height = taille + 'px';
      p.style.left = cx + 'px'; p.style.top = cy + 'px';
      scene.appendChild(p);
      var a = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 110;
      var dx = Math.cos(a) * dist, dy = Math.sin(a) * dist - 30;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: 'translate(calc(-50% + ' + dx * 0.4 + 'px),calc(-50% + ' + dy * 0.4 + 'px)) scale(1)', opacity: 1, offset: 0.25 },
        { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + (dy + 40) + 'px)) scale(.3)', opacity: 0 }
      ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished.then(function (x) { return function () { x.remove(); }; }(p));
    }
  }

  // Les cartes choisies viennent au centre, les autres s'effacent
  function reveler() {
    var d = dims();
    scene.classList.add('fini');
    var cibles = choisies.map(function (i, k) {
      if (mode === 1) return { x: d.w / 2 - d.cw / 2, y: 16, r: 0, s: 1.22 };
      var ecart = Math.min(d.cw * 1.55, (d.w - d.cw) / 2.15);
      return { x: d.w / 2 - d.cw / 2 + (k - 1) * ecart, y: 22, r: 0, s: d.w < 560 ? 1.12 : 1.1 };
    });
    return Promise.all(choisies.map(function (i, k) {
      els[i].style.zIndex = 40 + k;
      return bouger(els[i], cibles[k], 950, k * 120, 'cubic-bezier(.2,.8,.2,1)');
    })).then(montrer);
  }

  function montrer() {
    var cs = choisies.map(function (i) { return tirage[i]; });
    if (mode === 1) {
      var c = cs[0];
      resultat.innerHTML = '<div class="tr-un apparait"><p class="eyebrow" style="--d:0">Votre réponse</p><p class="tr-oui" style="--d:1">' + esc(REPONSE[c.on]) + '</p>' +
        '<h3 class="h2" style="--d:2">' + esc(c.n) + '</h3><p class="tr-k" style="--d:2">' + esc(c.k) + '</p><p style="--d:3">' + esc(c.sens) + '</p>' +
        '<p style="--d:4"><strong>En amour :</strong> ' + esc(c.amour) + '</p><p style="--d:5"><strong>Le conseil :</strong> ' + esc(c.conseil) + '</p>' +
        '<a class="ulink" style="--d:6" href="arcane-' + c.s + '.html">Tout savoir sur ' + esc(c.n) + '</a></div>';
    } else {
      resultat.innerHTML = '<div class="tr-trois apparait">' + cs.map(function (c, k) {
        return '<div class="tr-pos" style="--d:' + (k * 2) + '"><p class="eyebrow">' + POSITIONS[k] + '</p><h3 class="h3">' + esc(c.n) + '</h3><p class="tr-k">' + esc(c.k) + '</p><p>' + esc(c.sens) + '</p><a class="ulink" href="arcane-' + c.s + '.html">Lire la carte</a></div>';
      }).join('') + '</div>';
    }
    if (window.gtag) window.gtag('event', 'tirage_tarot', { mode: mode });
    var r = resultat.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.75) window.scrollBy({ top: r.top - window.innerHeight * 0.45, behavior: calme ? 'auto' : 'smooth' });
  }

  // Un nouveau tirage : on rassemble, on mélange, on distribue
  function battre() {
    if (occupe) return;
    occupe = true;
    resultat.innerHTML = '';
    consigne.textContent = mode === 1 ? '1 carte' : '3 cartes';
    var rassembler = Promise.resolve();
    if (els.length) {
      scene.classList.remove('pret');
      els.forEach(function (el) { el.classList.remove('retournee'); });
      scene.classList.remove('fini');
      rassembler = attendre(distribue ? 450 : 0).then(function () {
        return Promise.all(els.map(function (el, i) { return bouger(el, paquet(i), 520, (6 - i) * 35, 'cubic-bezier(.5,0,.3,1)'); }));
      });
    }
    distribue = false;
    rassembler.then(function () { hauteurScene(); creer(); return attendre(150); })
      .then(melangerAnim).then(distribuer)
      .then(function () { occupe = false; });
  }

  scene.addEventListener('click', function (e) {
    var b = e.target.closest('.tj-carte');
    if (!b || occupe || !distribue || b.classList.contains('retournee') || choisies.length >= mode) return;
    // Version haute définition de la face, chargée au moment du retournement
    var fi = b.querySelector('.tj-img');
    if (fi && /-mini\.webp$/.test(fi.src)) { var hd = new Image(); hd.onload = function () { fi.src = hd.src; }; hd.src = fi.src.replace('-mini.webp', '.webp'); }
    b.classList.add('retournee');
    choisies.push(b._i);
    setTimeout(function () { poussiere(b); }, calme ? 0 : 420);
    if (choisies.length === mode) {
      occupe = true;
      attendre(1350).then(reveler).then(function () { occupe = false; });
    }
  });
  btnBattre.addEventListener('click', battre);
  Array.prototype.forEach.call(modes, function (m) {
    m.addEventListener('click', function () {
      if (occupe) return;
      mode = +m.getAttribute('data-mode');
      Array.prototype.forEach.call(modes, function (x) { x.setAttribute('aria-pressed', x === m ? 'true' : 'false'); });
      battre();
    });
  });
  window.addEventListener('resize', function () {
    if (!distribue || occupe || scene.classList.contains('fini')) return;
    hauteurScene();
    var d = dims();
    els.forEach(function (el, i) { el.style.width = d.cw + 'px'; bouger(el, eventail(i), 0); });
  });

  // Le paquet attend, puis le rituel commence quand le tirage apparaît à l'écran
  hauteurScene(); creer();
  var lancer = function () { occupe = true; attendre(250).then(melangerAnim).then(distribuer).then(function () { occupe = false; }); };
  if ('IntersectionObserver' in window && !calme) {
    var io = new IntersectionObserver(function (entrees) { if (entrees[0].isIntersecting) { io.disconnect(); lancer(); } }, { threshold: 0.45 });
    io.observe(scene);
  } else lancer();
})();

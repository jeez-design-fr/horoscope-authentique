/* Tirage du tarot gratuit : tout se passe dans le navigateur, rien n'est envoyé. */
(function () {
  'use strict';
  var bloc = document.querySelector('[data-tarot]');
  if (!bloc) return;
  var cartes = JSON.parse(bloc.querySelector('.tarot-donnees').textContent);
  var jeu = bloc.querySelector('.tirage-jeu');
  var resultat = bloc.querySelector('.tirage-resultat');
  var consigne = bloc.querySelector('.tc-n');
  var modes = bloc.querySelectorAll('.tm-mode');
  var mode = 1, choisies = [], tirage = [];
  var POSITIONS = ['Le passé', 'Le présent', 'Le futur'];
  var REPONSE = { oui: 'Plutôt oui', non: 'Plutôt non', 'peut-être': 'Peut-être, à préciser' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function hasard(n) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] % n; }
  function melanger() {
    var t = cartes.slice();
    for (var i = t.length - 1; i > 0; i--) { var j = hasard(i + 1); var x = t[i]; t[i] = t[j]; t[j] = x; }
    return t.slice(0, 7);
  }
  function face(c) {
    if (c.img) return '<img class="tj-img" src="./assets/' + c.img + '" alt="' + esc(c.n) + '">';
    return '<span class="carte-tarot"><span class="ct-num">' + esc(c.r || '') + '</span><span class="ct-sym"></span><span class="ct-nom">' + esc(c.n) + '</span></span>';
  }

  function distribuer() {
    choisies = []; tirage = melanger(); resultat.innerHTML = '';
    consigne.textContent = mode === 1 ? '1 carte' : '3 cartes';
    jeu.innerHTML = tirage.map(function (c, i) {
      return '<button type="button" class="tj-carte" data-i="' + i + '" aria-label="Choisir la carte ' + (i + 1) + '" style="--i:' + i + '">' +
        '<span class="tj-inner"><span class="tj-dos"><img src="./assets/tarot-dos.webp" alt="" width="720" height="1047"></span><span class="tj-face">' + face(c) + '</span></span></button>';
    }).join('');
  }

  function montrer() {
    var cs = choisies.map(function (i) { return tirage[i]; });
    if (mode === 1) {
      var c = cs[0];
      resultat.innerHTML = '<div class="tr-un">' + (c.img ? '<img class="tr-img" src="./assets/' + c.img.replace('-mini', '') + '" alt="' + esc(c.n) + '">' : '') + '<p class="eyebrow">Votre réponse</p><p class="tr-oui">' + esc(REPONSE[c.on]) + '</p>' +
        '<h3 class="h2">' + esc(c.n) + '</h3><p class="tr-k">' + esc(c.k) + '</p><p>' + esc(c.sens) + '</p>' +
        '<p><strong>En amour :</strong> ' + esc(c.amour) + '</p><p><strong>Le conseil :</strong> ' + esc(c.conseil) + '</p>' +
        '<a class="ulink" href="arcane-' + c.s + '.html">Tout savoir sur ' + esc(c.n) + '</a></div>';
    } else {
      resultat.innerHTML = '<div class="tr-trois">' + cs.map(function (c, k) {
        return '<div class="tr-pos">' + (c.img ? '<img class="tr-img petite" src="./assets/' + c.img + '" alt="' + esc(c.n) + '">' : '') + '<p class="eyebrow">' + POSITIONS[k] + '</p><h3 class="h3">' + esc(c.n) + '</h3><p class="tr-k">' + esc(c.k) + '</p><p>' + esc(c.sens) + '</p><a class="ulink" href="arcane-' + c.s + '.html">Lire la carte</a></div>';
      }).join('') + '</div>';
    }
    if (window.gtag) window.gtag('event', 'tirage_tarot', { mode: mode });
    resultat.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  jeu.addEventListener('click', function (e) {
    var b = e.target.closest('.tj-carte');
    if (!b || b.classList.contains('retournee') || choisies.length >= mode) return;
    b.classList.add('retournee');
    choisies.push(+b.getAttribute('data-i'));
    if (choisies.length === mode) {
      jeu.classList.add('fini');
      setTimeout(montrer, 900);
    }
  });
  bloc.querySelector('.tirage-reset').addEventListener('click', function () { jeu.classList.remove('fini'); distribuer(); });
  Array.prototype.forEach.call(modes, function (m) {
    m.addEventListener('click', function () {
      mode = +m.getAttribute('data-mode');
      Array.prototype.forEach.call(modes, function (x) { x.setAttribute('aria-pressed', x === m ? 'true' : 'false'); });
      jeu.classList.remove('fini'); distribuer();
    });
  });
  distribuer();
})();

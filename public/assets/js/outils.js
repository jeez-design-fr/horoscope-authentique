/* Calculateurs « signe chinois » et « chemin de vie ». Tout se passe dans le navigateur. */
(function () {
  'use strict';
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- Signe chinois ----------
  document.querySelectorAll('[data-chinois]').forEach(function (bloc) {
    var nouvelAn = JSON.parse(bloc.querySelector('.nouvel-an').textContent);
    var noms = JSON.parse(bloc.querySelector('.animaux').textContent);
    var ordre = ['rat', 'boeuf', 'tigre', 'lapin', 'dragon', 'serpent', 'cheval', 'chevre', 'singe', 'coq', 'chien', 'cochon'];
    var elements = ['Bois', 'Bois', 'Feu', 'Feu', 'Terre', 'Terre', 'Métal', 'Métal', 'Eau', 'Eau'];
    var form = bloc.querySelector('form'), champ = form.querySelector('input'), res = bloc.querySelector('.outil-res');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = champ.value;
      if (!v) { res.textContent = 'Indiquez votre date de naissance.'; return; }
      var y = +v.slice(0, 4);
      if (!nouvelAn[y]) { res.textContent = 'Le calcul est possible pour les naissances entre 1900 et 2050.'; return; }
      var annee = v < nouvelAn[y] ? y - 1 : y; // né avant le Nouvel An chinois : signe de l'année précédente
      var k = ordre[(((annee - 4) % 12) + 12) % 12], el = elements[(((annee - 4) % 10) + 10) % 10];
      res.innerHTML = 'Votre signe chinois : <strong>' + esc(noms[k]) + ' de ' + esc(el) + '</strong>' +
        (annee !== y ? ' (naissance avant le Nouvel An chinois du ' + esc(new Date(nouvelAn[y] + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' })) + ')' : '') +
        '. <a class="inlink" href="signe-chinois-' + k + '.html">Découvrir ce signe</a>';
    });
  });

  // ---------- Chemin de vie ----------
  var reduire = function (n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split('').reduce(function (a, c) { return a + +c; }, 0);
    return n;
  };
  document.querySelectorAll('[data-numerologie]').forEach(function (bloc) {
    var titres = JSON.parse(bloc.querySelector('.chemins').textContent);
    var form = bloc.querySelector('form'), champ = form.querySelector('input'), res = bloc.querySelector('.outil-res');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = champ.value;
      if (!v) { res.textContent = 'Indiquez votre date de naissance.'; return; }
      var p = v.split('-').map(Number);
      var somme = function (x) { return String(x).split('').reduce(function (a, c) { return a + +c; }, 0); };
      var j = reduire(somme(p[2])), m = reduire(somme(p[1])), a = reduire(somme(p[0]));
      var n = reduire(j + m + a);
      res.innerHTML = 'Votre chemin de vie : <strong>' + n + ' · ' + esc(titres[n] || '') + '</strong>. <a class="inlink" href="chemin-de-vie-' + n + '.html">Lire sa signification</a>';
      if (window.gtag) window.gtag('event', 'calcul_numerologie');
    });
  });
})();

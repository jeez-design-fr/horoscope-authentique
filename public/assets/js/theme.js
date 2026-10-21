/* Thème astral & ascendant — calcul entièrement dans le navigateur.
   Aucune donnée de naissance n'est envoyée : ni serveur, ni cookie, ni stockage. */
(function () {
  'use strict';
  var A = window.Astronomy;
  var SIGNES = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];
  var SLUGS = ['belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge', 'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'];
  var DU = ['du Bélier', 'du Taureau', 'des Gémeaux', 'du Cancer', 'du Lion', 'de la Vierge', 'de la Balance', 'du Scorpion', 'du Sagittaire', 'du Capricorne', 'du Verseau', 'des Poissons'];
  var ROMAIN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  var ASTRES = [
    { id: 'Sun', nom: 'Soleil', abr: 'So' }, { id: 'Moon', nom: 'Lune', abr: 'Lu' }, { id: 'Mercury', nom: 'Mercure', abr: 'Me' },
    { id: 'Venus', nom: 'Vénus', abr: 'Vé' }, { id: 'Mars', nom: 'Mars', abr: 'Ma' }, { id: 'Jupiter', nom: 'Jupiter', abr: 'Ju' },
    { id: 'Saturn', nom: 'Saturne', abr: 'Sa' }, { id: 'Uranus', nom: 'Uranus', abr: 'Ur' }, { id: 'Neptune', nom: 'Neptune', abr: 'Ne' },
    { id: 'Pluto', nom: 'Pluton', abr: 'Pl' }
  ];
  var RAD = Math.PI / 180;
  var page = document.querySelector('[data-theme-astral]');
  if (!page || !A) return;
  var INTERP = JSON.parse(document.getElementById('interp').textContent);
  var mode = page.getAttribute('data-theme-astral'); // "theme" ou "ascendant"

  var norm = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var mod = function (x) { return ((x % 360) + 360) % 360; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---------- Villes ----------
  var villes = null, choix = null;
  function charger() {
    if (villes) return Promise.resolve();
    return fetch('./assets/data/villes.json').then(function (r) { return r.json(); }).then(function (d) {
      villes = d.v.map(function (v) { return { label: v[0], lat: v[1], lon: v[2], tz: d.tz[v[3]], k: norm(v[0]) }; });
    });
  }
  var champVille = page.querySelector('#ville'), liste = page.querySelector('#ville-liste'), infoVille = page.querySelector('#ville-info');
  var actif = -1, resultats = [];
  function afficherListe() {
    liste.innerHTML = resultats.map(function (v, i) {
      return '<li role="option" id="vopt' + i + '" aria-selected="' + (i === actif) + '" data-i="' + i + '">' + esc(v.label) + '</li>';
    }).join('');
    liste.hidden = !resultats.length;
    champVille.setAttribute('aria-expanded', resultats.length ? 'true' : 'false');
    if (actif >= 0) champVille.setAttribute('aria-activedescendant', 'vopt' + actif); else champVille.removeAttribute('aria-activedescendant');
  }
  function selectionner(v) {
    choix = v; champVille.value = v.label; resultats = []; actif = -1; afficherListe();
    infoVille.textContent = v.lat.toFixed(2).replace('.', ',') + '° ' + (v.lat >= 0 ? 'N' : 'S') + ' · ' + Math.abs(v.lon).toFixed(2).replace('.', ',') + '° ' + (v.lon >= 0 ? 'E' : 'O') + ' · fuseau ' + v.tz;
  }
  champVille.addEventListener('focus', charger, { once: true });
  champVille.addEventListener('input', function () {
    choix = null; infoVille.textContent = '';
    var q = norm(champVille.value.trim());
    charger().then(function () {
      if (q.length < 2) { resultats = []; afficherListe(); return; }
      var debut = [], dedans = [];
      for (var i = 0; i < villes.length && debut.length < 8; i++) {
        var v = villes[i];
        if (v.k.indexOf(q) === 0) debut.push(v); else if (dedans.length < 8 && v.k.indexOf(q) > 0) dedans.push(v);
      }
      resultats = debut.concat(dedans).slice(0, 8); actif = -1; afficherListe();
    });
  });
  champVille.addEventListener('keydown', function (e) {
    if (liste.hidden) return;
    if (e.key === 'ArrowDown') { actif = Math.min(actif + 1, resultats.length - 1); afficherListe(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { actif = Math.max(actif - 1, 0); afficherListe(); e.preventDefault(); }
    else if (e.key === 'Enter' && actif >= 0) { selectionner(resultats[actif]); e.preventDefault(); }
    else if (e.key === 'Escape') { resultats = []; afficherListe(); }
  });
  liste.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li'); if (li) { selectionner(resultats[+li.getAttribute('data-i')]); e.preventDefault(); }
  });

  // ---------- Heure locale -> instant UTC (avec l'historique des fuseaux) ----------
  function decalage(tz, d) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var p = {}; f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - d.getTime()) / 60000;
  }
  function versUTC(y, m, j, h, mi, tz) {
    var t = Date.UTC(y, m - 1, j, h, mi), o = decalage(tz, new Date(t)), u = t - o * 60000, o2 = decalage(tz, new Date(u));
    if (o2 !== o) u = t - o2 * 60000;
    return new Date(u);
  }

  // ---------- Calculs ----------
  function longitude(id, d) {
    if (id === 'Sun') return A.SunPosition(d).elon;
    if (id === 'Moon') return A.EclipticGeoMoon(d).lon;
    return mod(A.Ecliptic(A.GeoVector(id, d, true)).elon);
  }
  function siecles(d) { return (d.getTime() / 86400000 + 2440587.5 - 2451545.0) / 36525; }
  function versEcliptique(ra, eps) { return mod(Math.atan2(Math.sin(ra * RAD), Math.cos(ra * RAD) * Math.cos(eps * RAD)) / RAD); }

  function maisonsPlacidus(ramc, lat, eps, asc, mc) {
    var phi = lat * RAD, e = eps * RAD;
    function cuspide(f, basse) {
      var lam = mod(ramc + (basse ? 180 - 60 * f : 30 * f * 3 / 3 * 1)), i;
      for (i = 0; i < 40; i++) {
        var dec = Math.asin(Math.sin(e) * Math.sin(lam * RAD));
        var x = Math.tan(phi) * Math.tan(dec);
        if (Math.abs(x) >= 1) return null;
        var ad = Math.asin(x) / RAD;
        var ra = basse ? ramc + 180 - f * (90 - ad) : ramc + f * (90 + ad);
        var n = versEcliptique(ra, eps);
        if (Math.abs(mod(n - lam + 180) - 180) < 1e-6) { lam = n; break; }
        lam = n;
      }
      return lam;
    }
    var c11 = cuspide(1 / 3, false), c12 = cuspide(2 / 3, false), c2 = cuspide(2 / 3, true), c3 = cuspide(1 / 3, true);
    if ([c11, c12, c2, c3].some(function (c) { return c === null; })) {
      return { systeme: 'égales', c: Array.from({ length: 12 }, function (_, i) { return mod(asc + 30 * i); }) };
    }
    return { systeme: 'Placidus', c: [asc, c2, c3, mod(mc + 180), mod(c11 + 180), mod(c12 + 180), mod(asc + 180), mod(c2 + 180), mod(c3 + 180), mc, c11, c12] };
  }
  function maisonDe(lam, c) {
    for (var i = 0; i < 12; i++) {
      var a = c[i], b = c[(i + 1) % 12];
      if (mod(lam - a) < mod(b - a)) return i;
    }
    return 0;
  }
  function calculer(d, lat, lon, heureConnue) {
    var T = siecles(d);
    var eps = 23.439291 - 0.0130042 * T;
    var pts = ASTRES.map(function (a) {
      var l = longitude(a.id, d), l2 = longitude(a.id, new Date(d.getTime() + 3600000 * 6));
      return { nom: a.nom, abr: a.abr, lon: l, retro: a.id !== 'Sun' && a.id !== 'Moon' && mod(l2 - l + 180) - 180 < 0 };
    });
    pts.push({ nom: 'Nœud Nord', abr: 'NN', lon: mod(125.04452 - 1934.136261 * T + 0.0020708 * T * T), retro: true });
    pts.push({ nom: 'Lune noire', abr: 'LN', lon: mod(83.3532465 + 4069.0137287 * T - 0.01032 * T * T + 180), retro: false });
    var res = { pts: pts, eps: eps };
    if (heureConnue) {
      var ramc = mod(A.SiderealTime(d) * 15 + lon);
      var asc = mod(Math.atan2(Math.cos(ramc * RAD), -(Math.sin(ramc * RAD) * Math.cos(eps * RAD) + Math.tan(lat * RAD) * Math.sin(eps * RAD))) / RAD);
      var mc = versEcliptique(ramc, eps);
      res.asc = asc; res.mc = mc;
      res.maisons = maisonsPlacidus(ramc, lat, eps, asc, mc);
      pts.forEach(function (p) { p.maison = maisonDe(p.lon, res.maisons.c); });
    }
    return res;
  }

  // ---------- Affichage ----------
  var signe = function (l) { return Math.floor(mod(l) / 30); };
  var deg = function (l) { var x = mod(l) % 30; return Math.floor(x) + '° ' + String(Math.floor((x % 1) * 60)).padStart(2, '0') + '′'; };
  function carte(titre, s, d, texte) {
    return '<article class="trio-carte"><img src="./assets/' + SLUGS[s] + '-carte.webp" alt="" width="320" height="366"><span class="eyebrow" style="color:var(--gris)">' + titre + '</span><h3 class="h3" style="font-size:34px">' + SIGNES[s] + (d ? ' <span class="trio-deg">' + d + '</span>' : '') + '</h3><p>' + esc(texte) + '</p></article>';
  }
  function roue(r) {
    var asc = r.asc !== undefined ? r.asc : 0;
    var pos = function (l, rayon) { var t = (180 + (l - asc)) * RAD; return { x: 50 + rayon * Math.cos(t), y: 50 - rayon * Math.sin(t) }; };
    var html = '<div class="orbit r1" aria-hidden="true"></div><div class="orbit r3" aria-hidden="true"></div>';
    for (var i = 0; i < 12; i++) {
      var p = pos(30 * i + 15, 43);
      html += '<span class="roue-signe" style="left:' + p.x.toFixed(2) + '%;top:' + p.y.toFixed(2) + '%"><img src="./assets/' + SLUGS[i] + '-carte.webp" alt="' + SIGNES[i] + '" width="320" height="366"></span>';
    }
    var svg = '<svg class="roue-svg" viewBox="0 0 100 100" aria-hidden="true">';
    if (r.maisons) r.maisons.c.forEach(function (c, i) {
      var a = pos(c, 35), b = pos(c, 12), axe = i % 3 === 0;
      svg += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (axe ? '#8A6A22' : '#E8DDBF') + '" stroke-width="' + (axe ? 0.35 : 0.2) + '"/>';
      var m = pos(c + mod(r.maisons.c[(i + 1) % 12] - c) / 2, 15);
      svg += '<text x="' + m.x + '" y="' + m.y + '" font-size="2.4" fill="#6B655B" text-anchor="middle" dominant-baseline="middle" font-family="Cinzel, serif">' + ROMAIN[i] + '</text>';
    });
    svg += '</svg>';
    html += svg;
    var places = [];
    r.pts.forEach(function (p) {
      var ray = 30;
      for (var k = 0; k < places.length; k++) if (Math.abs(mod(places[k].lon - p.lon + 180) - 180) < 7 && places[k].ray === ray) ray -= 5;
      places.push({ lon: p.lon, ray: ray });
      var q = pos(p.lon, ray);
      html += '<span class="roue-astre" style="left:' + q.x.toFixed(2) + '%;top:' + q.y.toFixed(2) + '%" title="' + p.nom + ' ' + SIGNES[signe(p.lon)] + ' ' + deg(p.lon) + '">' + p.abr + '</span>';
    });
    if (r.asc !== undefined) {
      var a1 = pos(r.asc, 49), m1 = pos(r.mc, 49);
      html += '<span class="roue-axe" style="left:' + a1.x + '%;top:' + a1.y + '%">AS</span><span class="roue-axe" style="left:' + m1.x + '%;top:' + m1.y + '%">MC</span>';
    }
    return html;
  }

  var form = page.querySelector('#form-theme'), sortie = page.querySelector('#resultat'), erreur = page.querySelector('#erreur');
  var caseHeure = page.querySelector('#sans-heure'), champHeure = page.querySelector('#heure');
  caseHeure.addEventListener('change', function () { champHeure.disabled = caseHeure.checked; });
  page.querySelectorAll('[data-exemple]').forEach(function (b) {
    b.addEventListener('click', function () {
      page.querySelector('#date').value = '1992-03-15'; champHeure.value = '08:30'; caseHeure.checked = false; champHeure.disabled = false;
      charger().then(function () { selectionner(villes.find(function (v) { return v.label === 'Toulouse (31)'; })); form.requestSubmit(); });
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    erreur.textContent = '';
    var dv = page.querySelector('#date').value, hv = champHeure.value, sansHeure = caseHeure.checked;
    if (!dv) { erreur.textContent = 'Indiquez votre date de naissance.'; return; }
    if (!choix) { erreur.textContent = 'Choisissez votre ville de naissance dans la liste (ou la grande ville la plus proche).'; champVille.focus(); return; }
    if (!sansHeure && !hv) { erreur.textContent = 'Indiquez votre heure de naissance, ou cochez « Je ne connais pas mon heure ».'; return; }
    var p = dv.split('-').map(Number), y = p[0];
    if (y < 1900 || y > 2100) { erreur.textContent = 'Le calcul est possible pour les naissances entre 1900 et 2100.'; return; }
    var h = sansHeure ? [12, 0] : hv.split(':').map(Number);
    var d = versUTC(y, p[1], p[2], h[0], h[1], choix.tz);
    var r = calculer(d, choix.lat, choix.lon, !sansHeure);
    var so = r.pts[0], lu = r.pts[1];

    var trio = carte('Soleil · votre nature', signe(so.lon), deg(so.lon), INTERP.soleil[SLUGS[signe(so.lon)]]) +
      carte('Lune · vos émotions', signe(lu.lon), sansHeure ? '' : deg(lu.lon), INTERP.lune[SLUGS[signe(lu.lon)]] + (sansHeure ? ' (Sans heure de naissance, la Lune peut se trouver dans le signe voisin.)' : '')) +
      (sansHeure ? '<article class="trio-carte"><span class="eyebrow" style="color:var(--gris)">Ascendant · votre allure</span><h3 class="h3" style="font-size:30px">Heure nécessaire</h3><p>L’ascendant change de signe environ toutes les deux heures : sans heure de naissance, il ne peut pas être calculé.</p></article>'
        : carte('Ascendant · votre allure', signe(r.asc), deg(r.asc), INTERP.ascendant[SLUGS[signe(r.asc)]]));
    if (mode === 'ascendant' && !sansHeure) {
      trio = carte('Votre ascendant', signe(r.asc), deg(r.asc), INTERP.ascendant[SLUGS[signe(r.asc)]]) + carte('Soleil · votre nature', signe(so.lon), deg(so.lon), INTERP.soleil[SLUGS[signe(so.lon)]]) + carte('Lune · vos émotions', signe(lu.lon), deg(lu.lon), INTERP.lune[SLUGS[signe(lu.lon)]]);
    }
    var lignes = r.pts.map(function (pt) {
      var s = signe(pt.lon), sens = INTERP.planetes[pt.nom] ? INTERP.planetes[pt.nom] + ' prend la couleur ' + DU[s] + ' : ' + INTERP.teinte[SLUGS[s]] + '.' : INTERP.teinte[SLUGS[s]];
      return '<tr><td>' + pt.nom + (pt.retro && pt.nom !== 'Nœud Nord' ? ' <span class="retro" title="rétrograde">R</span>' : '') + '</td><td>' + SIGNES[s] + '</td><td class="num">' + deg(pt.lon) + '</td><td class="num">' + (pt.maison !== undefined ? ROMAIN[pt.maison] : '—') + '</td><td class="sens">' + (pt.nom === 'Soleil' || pt.nom === 'Lune' ? (pt.maison !== undefined ? INTERP.maisons[pt.maison] : '') : esc(sens)) + '</td></tr>';
    }).join('');
    var dateTxt = new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    sortie.innerHTML =
      '<section class="section"><div class="wrap stack gap-l"><div class="stack gap-s center" style="align-items:center"><p class="eyebrow">' + esc(dateTxt) + (sansHeure ? '' : ' à ' + hv.replace(':', ' h ')) + ' · ' + esc(choix.label) + '</p><h2 class="h2">' + (mode === 'ascendant' ? 'Votre ascendant' : 'Votre grand trio') + '</h2></div><div class="trio">' + trio + '</div></div></section>' +
      '<section class="section"><div class="wrap theme-grille"><div class="roue" role="img" aria-label="Roue du thème astral">' + roue(r) + '</div><div class="stack gap-m" style="min-width:0"><h2 class="h2">Vos planètes</h2><p class="muted small" style="margin:0">' + (r.maisons ? 'Milieu du Ciel en ' + SIGNES[signe(r.mc)] + ' ' + deg(r.mc) + ' · maisons ' + r.maisons.systeme : 'Sans heure de naissance : maisons et ascendant non calculés') + '</p><div class="table-scroll"><table class="table-theme"><thead><tr><th>Astre</th><th>Signe</th><th>Degré</th><th>Maison</th><th>Ce que cela dit</th></tr></thead><tbody>' + lignes + '</tbody></table></div></div></div></section>' +
      '<section class="section"><div class="wrap strip" style="padding-top:72px;padding-bottom:72px"><div class="l"><img src="./assets/cabinet.webp" alt="" width="640" height="731" loading="lazy"><div class="stack" style="gap:6px"><h2 class="h2" style="font-size:clamp(28px,2.8vw,38px)">Ce thème, lu et interprété par Madeleine.</h2><p style="margin:0;color:var(--encre-2)">Votre thème identitaire, votre héritage familial et votre mission de vie, écrits pour vous. Dès 20 €.</p></div></div><a class="btn" href="etude-karmique.html">Le Cabinet privé</a></div></section>';
    sortie.hidden = false;
    sortie.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (window.gtag) window.gtag('event', 'calcul_theme', { mode: mode, heure_connue: !sansHeure });
  });
})();

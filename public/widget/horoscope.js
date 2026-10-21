/* Widget « Horoscope du jour par Madeleine » — Horoscope Authentique
   Usage : <div class="horoscope-authentique" data-signe="belier"></div>
           <script src="https://www.horoscope-authentique.fr/widget/horoscope.js" async></script> */
(function () {
  'use strict';
  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/widget\/horoscope\.js.*$/, '') : 'https://www.horoscope-authentique.fr/';
  var SITE = 'https://www.horoscope-authentique.fr/';
  var ORDRE = ['belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge', 'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'];

  function el(tag, styles, texte) {
    var e = document.createElement(tag);
    if (styles) e.setAttribute('style', styles);
    if (texte) e.textContent = texte;
    return e;
  }

  function afficher(bloc, data) {
    var choix = (bloc.getAttribute('data-signe') || 'belier').toLowerCase();
    if (!data.signes[choix]) choix = 'belier';
    bloc.textContent = '';
    bloc.setAttribute('style', 'box-sizing:border-box;max-width:460px;margin:0 auto;padding:22px 24px;background:#FFFFFF;border:1px solid #C9A54A;box-shadow:inset 0 0 0 5px #FFFFFF,inset 0 0 0 6px #E8DDBF;color:#1C1A17;font-family:"Cormorant Garamond",Georgia,"Times New Roman",serif;text-align:center;line-height:1.5');
    var titre = el('p', 'margin:0 0 4px;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#8A6A22;font-family:inherit', 'Horoscope du jour');
    var date = el('p', 'margin:0 0 12px;font-size:14px;font-style:italic;color:#8A6A22', data.dateLongue);
    var select = el('select', 'font:inherit;font-size:17px;padding:4px 8px;border:1px solid #E8DDBF;background:#FFFFFF;color:#1C1A17;margin:0 0 12px;cursor:pointer');
    select.setAttribute('aria-label', 'Choisir un signe');
    ORDRE.forEach(function (s) { if (!data.signes[s]) return; var o = el('option', null, data.signes[s].nom); o.value = s; if (s === choix) o.selected = true; select.appendChild(o); });
    var dates = el('p', 'margin:0 0 10px;font-size:13px;color:#6B655B');
    var texte = el('p', 'margin:0 0 14px;font-size:18px;color:#3A362F');
    var lien = el('a', 'display:inline-block;font-size:15px;color:#8A6A22;text-decoration:none;border-bottom:1px solid #C9A54A');
    lien.target = '_blank';
    lien.rel = 'noopener';
    var credit = el('p', 'margin:14px 0 0;font-size:11px;color:#6B655B');
    var a = el('a', 'color:#8A6A22;text-decoration:none', 'Horoscope Authentique');
    a.href = SITE;
    a.target = '_blank';
    credit.appendChild(document.createTextNode('Par Madeleine · '));
    credit.appendChild(a);
    function maj() {
      var s = data.signes[select.value];
      dates.textContent = s.dates;
      texte.textContent = s.texte;
      lien.textContent = 'Lire l’horoscope ' + s.nom + ' complet →';
      lien.href = s.url + '?utm_source=widget&utm_medium=referral';
    }
    select.addEventListener('change', maj);
    [titre, date, select, dates, texte, lien, credit].forEach(function (x) { bloc.appendChild(x); });
    maj();
  }

  function lancer() {
    var blocs = document.querySelectorAll('.horoscope-authentique');
    if (!blocs.length) return;
    fetch(base + 'widget/horoscope-du-jour.json', { mode: 'cors' })
      .then(function (r) { return r.json(); })
      .then(function (data) { for (var i = 0; i < blocs.length; i++) afficher(blocs[i], data); })
      .catch(function () { /* en cas d'échec, l'encadré reste vide */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lancer); else lancer();
})();

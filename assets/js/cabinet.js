/* Cabinet privé : choix de l'étude et formulaire de commande.
   Le paiement en ligne sera branché ici (Stripe) ; d'ici là, rien n'est envoyé. */
(function () {
  'use strict';
  var el = document.getElementById('cab-donnees');
  var form = document.getElementById('commande');
  if (!el || !form) return;
  var OFFRES = JSON.parse(el.textContent);
  var texte = document.getElementById('cf-texte');
  var label = document.getElementById('cf-label');
  var aide = document.getElementById('cf-aide');
  var compte = document.getElementById('cf-compte');
  var prix = document.getElementById('cf-prix');
  var message = document.getElementById('cf-message');
  var parents = form.querySelector('[data-pour="alchimie"]');
  var heure = form.elements.heure, sansHeure = form.elements.sansHeure;

  function offre() { var r = form.querySelector('input[name="offre"]:checked'); return r ? r.value : 'boussole'; }
  function majCompte() {
    var o = OFFRES[offre()], n = texte.value.length;
    compte.textContent = n + ' / ' + o.champ.max + ' caractères';
  }
  function maj() {
    var id = offre(), o = OFFRES[id];
    label.textContent = '3. ' + o.champ.label;
    aide.textContent = o.champ.aide;
    texte.maxLength = o.champ.max;
    texte.rows = o.champ.lignes;
    if (texte.value.length > o.champ.max) texte.value = texte.value.slice(0, o.champ.max);
    prix.textContent = o.prix + ' €';
    parents.hidden = !o.parents;
    document.querySelectorAll('.formule').forEach(function (f) { f.classList.toggle('choisie', f.getAttribute('data-offre') === id); });
    majCompte();
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'offre') maj();
    if (e.target === sansHeure) { heure.disabled = sansHeure.checked; if (sansHeure.checked) heure.value = ''; }
  });
  texte.addEventListener('input', majCompte);

  // Les boutons « Choisir cette étude » sélectionnent l'offre et mènent au formulaire
  document.querySelectorAll('[data-choisir]').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = form.querySelector('input[name="offre"][value="' + b.getAttribute('data-choisir') + '"]');
      if (r) { r.checked = true; maj(); }
      document.getElementById('commander').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.gtag) window.gtag('event', 'cabinet_choix', { offre: b.getAttribute('data-choisir') });
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!heure.value && !sansHeure.checked) { heure.setCustomValidity('Indiquez votre heure de naissance, ou cochez la case si vous ne la connaissez pas.'); } else heure.setCustomValidity('');
    if (!form.reportValidity()) return;
    if (window.gtag) window.gtag('event', 'cabinet_commande', { offre: offre() });
    // Paiement pas encore ouvert : on prévient avec douceur, sans rien transmettre
    message.textContent = 'Merci pour votre confiance. Les commandes en ligne ouvrent dans quelques jours : votre étude pourra être réglée ici très bientôt. Rien n’a été envoyé ni débité.';
    message.hidden = false;
  });
  heure.addEventListener('input', function () { heure.setCustomValidity(''); });

  maj();
})();

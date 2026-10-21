// Petites briques communes à toutes les pages.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const { esc } = L;

const OUT = './public';

// Dimensions des images (après compression) pour éviter les décalages de mise en page
const IMG = {
    medal: (slug, lazy = true) => `<img src="./assets/${slug}-carte.webp" alt="" width="320" height="366"${lazy ? ' loading="lazy"' : ''} decoding="async">`,
    obj: (file, alt = '', lazy = true) => `<img src="./assets/${file}" alt="${esc(alt)}" width="640" height="731"${lazy ? ' loading="lazy"' : ''} decoding="async">`,
    lune: (i, lazy = true) => `<img src="./assets/lune-${i + 1}.webp" alt="" width="240" height="274"${lazy ? ' loading="lazy"' : ''} decoding="async">`
};

const phrase = (t) => { const l = String(t || '').toLowerCase(); return l.charAt(0).toUpperCase() + l.slice(1); };
const tronquer = (s, n = 155) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…'; };
const premierePhrase = (s) => (String(s || '').match(/^.*?[.!?](\s|$)/) || [s])[0].trim();
const dateSigne = (s) => s.date.replace(' - ', ' – ');
const ancre = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const write = (file, html) => fs.writeFileSync(path.join(OUT, file), html);
const auteur = { '@type': 'Person', name: 'Madeleine', url: L.SITE + 'apropos.html' };
const editeur = { '@type': 'Organization', name: 'Horoscope Authentique', logo: { '@type': 'ImageObject', url: L.SITE + 'assets/icon-192.png' } };
const article = (s) => (/^[AEIOUÉÈÊŒH]/i.test(s) ? "l'" : 'la ');

// « du Bélier », « des Gémeaux », « de la Vierge »…
const DU = { belier: 'du Bélier', taureau: 'du Taureau', gemeaux: 'des Gémeaux', cancer: 'du Cancer', lion: 'du Lion', vierge: 'de la Vierge', balance: 'de la Balance', scorpion: 'du Scorpion', sagittaire: 'du Sagittaire', capricorne: 'du Capricorne', verseau: 'du Verseau', poissons: 'des Poissons' };
const LE = { belier: 'le Bélier', taureau: 'le Taureau', gemeaux: 'les Gémeaux', cancer: 'le Cancer', lion: 'le Lion', vierge: 'la Vierge', balance: 'la Balance', scorpion: 'le Scorpion', sagittaire: 'le Sagittaire', capricorne: 'le Capricorne', verseau: 'le Verseau', poissons: 'les Poissons' };
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function faqHtml(items) {
    return `<div class="faq">${items.map((f, i) => `<details${i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span><span class="plus" aria-hidden="true">+</span></summary><p class="rep">${esc(f.a)}</p></details>`).join('')}</div>`;
}
const faqSchema = (items) => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

// Onglets de période d'un signe : liens vers de vraies pages (une URL par recherche)
function ongletsSigne(slug, actif, dispo) {
    const items = [
        ['jour', "Aujourd'hui", `${slug}.html`], ['demain', 'Demain', `${slug}-demain.html`],
        ['semaine', 'Semaine', `${slug}-semaine.html`], ['mois', 'Mois', `${slug}-mois.html`], ['2027', '2027', `${slug}-2027.html`]
    ].filter(([k]) => k === 'jour' || dispo[k]);
    return `<nav class="wrap onglets" aria-label="Période"><ul>${items.map(([k, lb, href]) => `<li><a href="${href}"${k === actif ? ' aria-current="page"' : ''}>${lb}</a></li>`).join('')}</ul></nav>`;
}
function ongletsHub(actif, dispo) {
    const items = [['jour', "Aujourd'hui", 'horoscope.html'], ['demain', 'Demain', 'horoscope-demain.html'], ['semaine', 'Semaine', 'horoscope-semaine.html'], ['mois', 'Mois', 'horoscope-mois.html'], ['2027', '2027', 'horoscope-2027.html']]
        .filter(([k]) => k === 'jour' || dispo[k]);
    return `<nav class="wrap onglets" aria-label="Période"><ul>${items.map(([k, lb, href]) => `<li><a href="${href}"${k === actif ? ' aria-current="page"' : ''}>${lb}</a></li>`).join('')}</ul></nav>`;
}

// Bandeau « Cabinet privé » réutilisable
function bandeauCabinet(titre, texte, cta = 'Le Cabinet privé') {
    return `<section class="section"><div class="wrap strip" style="padding-top:72px;padding-bottom:72px">
<div class="l"><img src="./assets/cabinet.webp" alt="" width="640" height="731" loading="lazy"><div class="stack" style="gap:6px"><h2 class="h2" style="font-size:clamp(28px,2.8vw,38px)">${titre}</h2><p style="margin:0;color:var(--encre-2)">${texte}</p></div></div>
<a class="btn" href="etude-karmique.html">${cta}</a>
</div></section>`;
}

function grilleSignes(signs, href, titre, exclure) {
    return `<section class="section"><div class="wrap stack gap-l" style="padding-top:80px;padding-bottom:96px"><h2 class="h2 center" style="font-size:clamp(30px,3vw,42px)">${titre}</h2><ul class="signs-grid">${signs.filter((x) => x.slug !== exclure).map((x) => `<li><a href="${href(x)}">${IMG.medal(x.slug)}<span>${esc(x.name)}</span></a></li>`).join('')}</ul></div></section>`;
}

module.exports = { IMG, phrase, tronquer, premierePhrase, dateSigne, ancre, write, auteur, editeur, article, DU, LE, majuscule, faqHtml, faqSchema, ongletsSigne, ongletsHub, bandeauCabinet, grilleSignes, OUT };

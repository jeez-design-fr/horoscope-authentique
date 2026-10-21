// Mise en avant automatique et gratuite du site :
// 1. aperçus de partage (Open Graph) propres à chaque rubrique
// 2. épingles Pinterest quotidiennes + flux RSS lu par Pinterest
// 3. widget « Horoscope du jour par Madeleine » pour les autres sites (liens entrants)
// 4. llms.txt (présentation du site aux IA) et clé IndexNow (Bing, ChatGPT, Copilot)
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const { esc } = L;
const U = require('./ui');
const I = require('./images');

const OUT = U.OUT;
const SITE = L.SITE; // https://www.horoscope-authentique.fr/
const INDEXNOW_KEY = '035a86c6b978dcc82f5d0922f3c9fcc1';
const DONNEES_PINS = path.join(__dirname, '..', 'data', 'pinterest.json');
const isoParis = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const dateFr = (iso) => { const s = new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const xml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const RATIO_OBJ = 731 / 640;

// ---------------------------------------------------------------------
// 1. Aperçus de partage
// ---------------------------------------------------------------------
function apercuPour(file, ctx) {
    const { signs, compatData } = ctx;
    const slugs = signs.map((s) => s.slug).join('|');
    const nom = (slug) => signs.find((s) => s.slug === slug).name;
    let m;
    if ((m = file.match(new RegExp(`^(?:signe-)?(${slugs})(?:-(demain|semaine|mois|2027))?\\.html$`)))) {
        return { id: `signe-${m[1]}`, eyebrow: 'Horoscope', titre: `Horoscope ${nom(m[1])}`, sousTitre: 'Jour, demain, semaine, mois et 2027 : la lecture de Madeleine', visuel: { fichier: `${m[1]}.webp` } };
    }
    if ((m = file.match(new RegExp(`^compatibilite-(${slugs})-(${slugs})\\.html$`)))) {
        const c = (compatData[m[1]] || []).find((x) => x.with === m[2]);
        return { id: `couple-${m[1]}-${m[2]}`, eyebrow: 'Compatibilité amoureuse', titre: `${nom(m[1])} & ${nom(m[2])}`, sousTitre: c ? U.phrase(c.titre) : 'Ce que vit vraiment ce couple', visuel: { fichier: `${m[1]}.webp` } };
    }
    if (/^(theme-astral|calcul-ascendant)\.html$/.test(file)) return { id: 'theme', eyebrow: 'Calcul gratuit', titre: 'Ton thème astral', sousTitre: 'Ascendant, Lune, maisons : calculé sur le vrai ciel', visuel: { fichier: 'cosmos.webp', ratio: RATIO_OBJ } };
    if (/^(calendrier-lunaire|pleine-lune-.*|nouvelle-lune-.*|ciel-2027|mercure-retrograde-2027)\.html$/.test(file)) return { id: 'lune', eyebrow: 'Calendrier lunaire', titre: 'La Lune et le ciel', sousTitre: 'Pleines lunes, éclipses et rétrogrades, à l’heure près', visuel: { fichier: 'lune-5.webp', ratio: 274 / 240, y: 90 } };
    if (/^horoscope(-demain|-semaine|-mois|-2027)?\.html$/.test(file)) return { id: 'horoscope', eyebrow: 'Les douze signes', titre: 'L’horoscope de Madeleine', sousTitre: 'Calculé sur le vrai ciel, écrit avec le cœur', visuel: { fichier: 'livre.webp', ratio: RATIO_OBJ } };
    if (/^(horoscope-chinois-2027|signe-chinois-.*)\.html$/.test(file)) return { id: 'chinois', eyebrow: 'Astrologie chinoise', titre: 'Horoscope chinois 2027', sousTitre: 'L’année du Cheval de Feu, signe par signe' };
    if (/^(numerologie-chemin-de-vie|chemin-de-vie-.*)\.html$/.test(file)) return { id: 'numerologie', eyebrow: 'Numérologie', titre: 'Ton chemin de vie', sousTitre: 'Le nombre qui raconte ta route, calculé en un clic' };
    return null;
}

async function apercus(ctx) {
    const dossier = path.join(OUT, 'assets', 'og');
    fs.mkdirSync(dossier, { recursive: true });
    let crees = 0, pages = 0;
    for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith('.html'))) {
        const spec = apercuPour(file, ctx);
        if (!spec) continue;
        const nomImg = `og/${spec.id}.jpg`;
        const chemin = path.join(OUT, 'assets', nomImg);
        if (!fs.existsSync(chemin)) { await I.apercu({ ...spec, sortie: chemin }); crees++; }
        const p = path.join(OUT, file);
        const html = fs.readFileSync(p, 'utf-8');
        const url = `${SITE}assets/${nomImg}`;
        const net = html.replace(/<meta property="og:image" content="[^"]*">(\n<meta property="og:image:width"[^>]*>\n<meta property="og:image:height"[^>]*>\n<meta name="twitter:image"[^>]*>)?/,
            `<meta property="og:image" content="${url}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:image" content="${url}">`);
        if (net !== html) { fs.writeFileSync(p, net); pages++; }
    }
    console.log(`✅ Aperçus de partage : ${pages} pages (${crees} image(s) créée(s))`);
}

// ---------------------------------------------------------------------
// 2. Pinterest : 3 épingles par jour (2 signes + 1 page permanente) et flux RSS
// ---------------------------------------------------------------------
function pagesPermanentes(ctx) {
    const { signs, compatData } = ctx;
    const couples = [], portraits = [];
    signs.forEach((a, i) => signs.slice(i).forEach((b) => {
        const c = (compatData[a.slug] || []).find((x) => x.with === b.slug);
        couples.push({
            id: `couple-${a.slug}-${b.slug}`, lien: `compatibilite-${a.slug}-${b.slug}.html`,
            eyebrow: 'Compatibilité amoureuse', titre: `${a.name} & ${b.name}`, sousTitre: c ? `${U.phrase(c.titre)} : ce que vit vraiment ce couple` : 'Ce que vit vraiment ce couple',
            visuels: a.slug === b.slug ? [{ fichier: `${a.slug}.webp` }] : [{ fichier: `${a.slug}.webp` }, { fichier: `${b.slug}.webp` }],
            description: `Compatibilité ${a.name} et ${b.name} en amour : points forts, frictions et conseils de Madeleine pour que ce couple dure.`
        });
    }));
    for (const s of signs) {
        portraits.push({ id: `fiche-${s.slug}`, lien: `signe-${s.slug}.html`, eyebrow: 'Portrait astrologique', titre: s.name, sousTitre: 'Caractère, qualités, défauts et décans', visuels: [{ fichier: `${s.slug}.webp` }], description: `Le signe ${s.name} : caractère, qualités, défauts, amour et décans. Le portrait complet par Madeleine.` });
        portraits.push({ id: `annee-${s.slug}`, lien: `${s.slug}-2027.html`, eyebrow: 'Horoscope 2027', titre: `${s.name} en 2027`, sousTitre: 'Amour, travail, argent : ton année mois par mois', visuels: [{ fichier: `${s.slug}.webp` }], description: `Horoscope 2027 ${s.name} : les grandes dates de l’année, en amour, au travail et pour ton énergie.` });
    }
    const speciales = [
        { id: 'theme', lien: 'theme-astral.html', eyebrow: 'Calcul gratuit', titre: 'Ton thème astral', sousTitre: 'Ascendant, Lune et maisons, calculés sur le vrai ciel', visuels: [{ fichier: 'cosmos.webp', ratio: RATIO_OBJ, affichage: 640 }], description: 'Calcule gratuitement ton thème astral et ton ascendant : positions réelles des planètes, maisons, interprétation.' },
        { id: 'lune', lien: 'calendrier-lunaire.html', eyebrow: 'Calendrier lunaire', titre: 'Pleines lunes et éclipses', sousTitre: 'Les dates exactes et ce qu’elles remuent pour ton signe', visuels: [{ fichier: 'lune-5.webp', ratio: 274 / 240, affichage: 680, largeur: 680 }], description: 'Calendrier lunaire : dates et heures des pleines lunes, nouvelles lunes et éclipses, avec leurs effets signe par signe.' },
        { id: 'ascendant', lien: 'calcul-ascendant.html', eyebrow: 'Calcul gratuit', titre: 'Quel est ton ascendant ?', sousTitre: 'La réponse en 30 secondes, avec ton heure de naissance', visuels: [{ fichier: 'entree.webp', ratio: RATIO_OBJ, affichage: 640 }], description: 'Calcule ton ascendant gratuitement avec ta date, ton heure et ta ville de naissance.' }
    ];
    // Alternance : couple, portrait, couple, portrait… et une page spéciale tous les 8 jours
    const out = [];
    for (let i = 0; out.length < couples.length + portraits.length + speciales.length; i++) {
        if (i % 8 === 0 && speciales[i / 8]) out.push(speciales[i / 8]);
        if (couples[i]) out.push(couples[i]);
        if (portraits[i]) out.push(portraits[i]);
        if (i > 200) break;
    }
    return out;
}

async function pinterest(ctx) {
    const { signs, jour } = ctx;
    const aujourdhui = isoParis(new Date());
    let pins = [];
    try { pins = JSON.parse(fs.readFileSync(DONNEES_PINS, 'utf-8')); } catch { /* premier passage */ }
    const dossier = path.join(OUT, 'pins');
    fs.mkdirSync(dossier, { recursive: true });

    if (!pins.some((p) => p.date === aujourdhui) && jour && jour.signes) {
        const n = Math.floor(Date.parse(aujourdhui + 'T12:00:00Z') / 86400000);
        const nouveaux = [];
        // Deux signes par jour : les 12 signes passent tous les 6 jours
        for (const k of [0, 1]) {
            const s = signs[(2 * n + k) % 12];
            const d = jour.signes[s.slug];
            if (!d) continue;
            const image = `pins/${aujourdhui}-${s.slug}.jpg`;
            await I.epingleSigne({ signe: s, eyebrow: 'Horoscope du jour', date: dateFr(aujourdhui), texte: d.essentiel || U.premierePhrase(d.amour.texte), sortie: path.join(OUT, image) });
            nouveaux.push({ id: `${aujourdhui}-${s.slug}`, date: aujourdhui, titre: `Horoscope ${s.name} du ${dateFr(aujourdhui).replace(/^\w+ /, '')}`, description: `${d.essentiel || ''} Amour, travail, bien-être et ta mission du jour : l’horoscope ${s.name} complet de Madeleine, calculé sur le vrai ciel.`.trim(), lien: `${s.slug}.html`, image });
        }
        // Une page permanente, à tour de rôle
        const liste = pagesPermanentes(ctx);
        const p = liste[n % liste.length];
        const image = `pins/${aujourdhui}-${p.id}.jpg`;
        await I.epinglePage({ eyebrow: p.eyebrow, titre: p.titre, sousTitre: p.sousTitre, visuels: p.visuels, sortie: path.join(OUT, image) });
        nouveaux.push({ id: `${aujourdhui}-${p.id}`, date: aujourdhui, titre: `${p.titre} · ${p.sousTitre}`, description: p.description, lien: p.lien, image });
        pins = [...nouveaux, ...pins].slice(0, 45);
        fs.writeFileSync(DONNEES_PINS, JSON.stringify(pins, null, 2));
        console.log(`📌 Pinterest : ${nouveaux.length} épingles du jour`);
    }
    // Ménage : on ne garde que les images encore dans le flux (Pinterest les a déjà copiées)
    const gardees = new Set(pins.map((p) => path.basename(p.image)));
    for (const f of fs.readdirSync(dossier)) if (!gardees.has(f)) fs.unlinkSync(path.join(dossier, f));

    const items = pins.map((p) => {
        const lien = `${SITE}${p.lien}?utm_source=pinterest&utm_medium=social`;
        const img = `${SITE}${p.image}`;
        const taille = fs.existsSync(path.join(OUT, p.image)) ? fs.statSync(path.join(OUT, p.image)).size : 0;
        return `<item><title>${xml(p.titre)}</title><link>${xml(lien)}</link><description>${xml(p.description)}</description><pubDate>${new Date(p.date + 'T07:00:00+02:00').toUTCString()}</pubDate><guid isPermaLink="false">${xml(p.id)}</guid><enclosure url="${xml(img)}" type="image/jpeg" length="${taille}"/><media:content url="${xml(img)}" medium="image" type="image/jpeg" width="1000" height="1500"/></item>`;
    }).join('\n');
    fs.writeFileSync(path.join(OUT, 'pinterest.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Horoscope Authentique · Madeleine</title>
<link>${SITE}</link>
<atom:link href="${SITE}pinterest.xml" rel="self" type="application/rss+xml"/>
<description>L’horoscope du jour des douze signes, calculé sur le vrai ciel et écrit par Madeleine.</description>
<language>fr-FR</language>
${items}
</channel>
</rss>
`);
}

// ---------------------------------------------------------------------
// 3. Widget pour les autres sites
// ---------------------------------------------------------------------
function widget(ctx) {
    const { signs, jour } = ctx;
    const dossier = path.join(OUT, 'widget');
    fs.mkdirSync(dossier, { recursive: true });
    fs.copyFileSync(path.join(__dirname, '..', 'widget', 'horoscope.js'), path.join(dossier, 'horoscope.js'));
    if (jour && jour.signes) {
        const date = jour.date || isoParis(new Date());
        fs.writeFileSync(path.join(dossier, 'horoscope-du-jour.json'), JSON.stringify({
            date, dateLongue: dateFr(date),
            signes: Object.fromEntries(signs.map((s) => [s.slug, { nom: s.name, dates: s.date.replace(' - ', ' – '), texte: (jour.signes[s.slug] && (jour.signes[s.slug].essentiel || U.premierePhrase(jour.signes[s.slug].amour.texte))) || '', url: `${SITE}${s.slug}.html` }]))
        }));
    }
    const code = `<div class="horoscope-authentique" data-signe="belier"></div>
<script src="${SITE}widget/horoscope.js" async></script>
<p style="font-size:13px">Horoscope du jour offert par <a href="${SITE}">Horoscope Authentique</a></p>`;
    const crumbs = [{ label: 'Accueil', href: './' }, { label: 'Widget horoscope' }];
    const faq = [
        { q: 'Le widget est-il vraiment gratuit ?', a: 'Oui, entièrement. Il suffit de garder la petite mention « Horoscope du jour offert par Horoscope Authentique » sous l’encadré.' },
        { q: 'Le texte se met-il à jour tout seul ?', a: 'Oui. Chaque matin, le widget affiche automatiquement le nouvel horoscope du jour, sans rien faire de votre côté.' },
        { q: 'Peut-on choisir le signe affiché ?', a: 'Oui : remplacez « belier » par le signe voulu dans le code (taureau, gemeaux, cancer, lion, vierge, balance, scorpion, sagittaire, capricorne, verseau, poissons). Le visiteur peut aussi changer de signe dans le menu du widget.' }
    ];
    U.write('widget-horoscope.html', L.page({
        ...ctx, crumbs, active: '',
        after: '<script src="./widget/horoscope.js" async></script>',
        main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:24px">
<p class="eyebrow">Pour les blogs et les sites</p>
<h1 class="display">Ajoutez <em>l’horoscope du jour</em> à votre site</h1>
<p class="lede">Un encadré élégant, mis à jour chaque matin, avec l’horoscope des douze signes écrit par Madeleine. Gratuit, sans inscription, à copier-coller en dix secondes.</p>
</section>
<section class="section"><div class="wrap-narrow stack gap-l" style="padding-top:56px;padding-bottom:56px">
<h2 class="h2 center">Aperçu</h2>
<div class="horoscope-authentique" data-signe="belier"></div>
<h2 class="h2 center" style="margin-top:24px">Le code à copier</h2>
<pre class="code-widget" id="code-widget">${esc(code)}</pre>
<p class="center"><button type="button" class="btn" id="copier-widget">Copier le code</button></p>
<script>document.getElementById('copier-widget').addEventListener('click',function(){var b=this;navigator.clipboard.writeText(document.getElementById('code-widget').textContent).then(function(){b.textContent='Code copié';setTimeout(function(){b.textContent='Copier le code'},2000)})});</script>
</div></section>
<section class="section"><div class="wrap-narrow stack gap-l">${U.faqHtml(faq)}</div></section>`,
        head: { title: 'Widget horoscope du jour gratuit pour votre site · Horoscope Authentique', description: 'Ajoutez gratuitement l’horoscope du jour des 12 signes à votre site ou blog : un encadré élégant, mis à jour chaque matin, à copier-coller.', file: 'widget-horoscope.html', jsonld: [L.crumbsSchema(crumbs), U.faqSchema(faq)] }
    }));
    return [['widget-horoscope.html', 'monthly', '0.4']];
}

// ---------------------------------------------------------------------
// 4. llms.txt et clé IndexNow
// ---------------------------------------------------------------------
function pourLesMoteurs(ctx) {
    const { signs } = ctx;
    fs.writeFileSync(path.join(OUT, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);
    const lien = (titre, f, d) => `- [${titre}](${SITE}${f})${d ? ` : ${d}` : ''}`;
    fs.writeFileSync(path.join(OUT, 'llms.txt'), `# Horoscope Authentique

> Site français d'astrologie. L'horoscope quotidien des douze signes y est rédigé chaque nuit à partir des positions réelles des planètes (éphémérides calculées, vérifiées automatiquement), sous la plume de Madeleine, l'astrologue éditoriale de la Maison. Le site propose aussi des calculateurs gratuits (thème astral, ascendant, signe chinois, chemin de vie) qui fonctionnent dans le navigateur, sans collecte de données de naissance.

## Horoscopes
${lien('Horoscope du jour des 12 signes', 'horoscope.html', 'mis à jour chaque nuit')}
${lien('Horoscope de demain', 'horoscope-demain.html')}
${lien('Horoscope de la semaine', 'horoscope-semaine.html')}
${lien('Horoscope du mois', 'horoscope-mois.html')}
${lien('Horoscope 2027', 'horoscope-2027.html', 'les grandes tendances de l’année pour chaque signe')}
${signs.map((s) => lien(`Horoscope ${s.name} du jour`, `${s.slug}.html`)).join('\n')}

## Calculateurs gratuits
${lien('Thème astral gratuit', 'theme-astral.html', 'positions réelles, maisons Placidus, interprétation')}
${lien('Calcul de l’ascendant', 'calcul-ascendant.html')}
${lien('Horoscope chinois 2027 et calcul du signe chinois', 'horoscope-chinois-2027.html')}
${lien('Chemin de vie en numérologie', 'numerologie-chemin-de-vie.html')}

## Le ciel
${lien('Calendrier lunaire', 'calendrier-lunaire.html', 'pleines lunes, nouvelles lunes et éclipses à l’heure près (Paris)')}
${lien('Le ciel de 2027', 'ciel-2027.html', 'rétrogrades, éclipses et changements de signe')}
${lien('Mercure rétrograde 2027', 'mercure-retrograde-2027.html')}

## Signes et compatibilités
${signs.map((s) => lien(`${s.name} : caractère et décans`, `signe-${s.slug}.html`)).join('\n')}
${lien('Compatibilité amoureuse des 78 couples de signes', 'compatibilite-amoureuse.html')}

## La Maison
${lien('Madeleine, l’astrologue de la Maison', 'apropos.html')}
${lien('Le Cabinet privé (études personnalisées)', 'etude-karmique.html')}
${lien('Widget horoscope gratuit pour les sites', 'widget-horoscope.html')}
`);
}

module.exports = { apercus, pinterest, widget, pourLesMoteurs, INDEXNOW_KEY };

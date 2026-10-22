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
    if (/^(horoscope-chinois-2027|signe-chinois-.*)\.html$/.test(file)) return { id: 'chinois', eyebrow: 'Astrologie chinoise', titre: 'Horoscope chinois 2027', sousTitre: 'L’année de la Chèvre de Feu, signe par signe' };
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

// Styles des épingles « horoscope du jour », en alternance : chaque jour, les 3 signes
// reçoivent 3 styles différents, et le roulement se décale d'un cran le lendemain.
const STYLES_PINS = ['porcelaine', 'nuit', 'magazine', 'creme'];

// Événement marquant du ciel aujourd'hui (date de Paris) : lunaison, entrée du Soleil, rétrograde
function evenementDuJour(ctx, aujourdhui) {
    const G = require('./agenda');
    const C = require('./chantiers');
    const debut = new Date(Date.parse(aujourdhui + 'T00:00:00Z') - 2 * 3600000);
    const evts = G.agenda(debut, new Date(debut.getTime() + 28 * 3600000)).filter((e) => isoParis(e.date) === aujourdhui);
    const lune = evts.find((e) => e.type === 'lune' && (e.quartier === 0 || e.quartier === 2));
    if (lune) {
        const pleine = lune.quartier === 2;
        const page = (C.lune.pages || []).find((p) => Math.abs(new Date(p.date) - new Date(lune.date)) < 86400000);
        return {
            id: pleine ? 'pleine-lune' : 'nouvelle-lune', eyebrow: pleine ? 'Ce soir, pleine lune' : 'Aujourd’hui, nouvelle lune',
            titre: `${pleine ? 'Pleine lune' : 'Nouvelle lune'} en ${lune.signe}`, sousTitre: 'L’heure exacte et ce qu’elle remue pour ton signe',
            visuels: [{ fichier: pleine ? 'lune-5.webp' : 'lune-1.webp', ratio: 274 / 240, affichage: 680, largeur: 680 }],
            description: `${pleine ? 'Pleine lune' : 'Nouvelle lune'} en ${lune.signe} : la date, l’heure exacte à Paris et ce qu’elle change pour chacun des 12 signes, par Madeleine.`,
            lien: page ? `${page.slug}.html` : 'calendrier-lunaire.html'
        };
    }
    const saison = evts.find((e) => e.type === 'entree' && e.astre === 'Soleil');
    if (saison) {
        const du = U.DU[saison.slug] || `du ${saison.signe}`;
        return {
            id: `saison-${saison.slug}`, eyebrow: 'Le Soleil change de signe', titre: `La saison ${du} commence`, sousTitre: 'Ce qu’elle change pour chaque signe',
            visuels: [{ fichier: `${saison.slug}.webp` }],
            description: `Le Soleil entre en ${saison.signe} : la saison ${du} commence. Caractère du signe, dates et ce que cette période change pour toi, par Madeleine.`,
            lien: `signe-${saison.slug}.html`
        };
    }
    const station = evts.find((e) => (e.type === 'retro' || e.type === 'direct') && ['Mercure', 'Vénus', 'Mars'].includes(e.astre));
    if (station) {
        const retro = station.type === 'retro';
        const lien = station.astre === 'Mercure' && fs.existsSync(path.join(OUT, `mercure-retrograde-${new Date(station.date).getUTCFullYear()}.html`))
            ? `mercure-retrograde-${new Date(station.date).getUTCFullYear()}.html` : 'horoscope-semaine.html';
        return {
            id: `${retro ? 'retro' : 'direct'}-${station.astre}-${station.slug}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),eyebrow: retro ? 'Alerte rétrograde' : 'Fin de rétrograde',
            titre: retro ? `${station.astre} rétrograde` : `${station.astre} repart`, sousTitre: `En ${station.signe} : ce que ça change pour toi`,
            visuels: [{ fichier: 'cosmos.webp', ratio: RATIO_OBJ, affichage: 640 }],
            description: `${station.astre} ${retro ? 'devient rétrograde' : 'redevient direct'} en ${station.signe} : les dates, et les conseils de Madeleine pour chaque signe.`,
            lien
        };
    }
    return null;
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
        const dateTxt = dateFr(aujourdhui);
        const nouveaux = [];
        const ajouter = async (id, fabrique, infos) => {
            const image = `pins/${aujourdhui}-${id}.jpg`;
            await fabrique(path.join(OUT, image));
            nouveaux.push({ id: `${aujourdhui}-${id}`, date: aujourdhui, image, ...infos });
        };

        // 1 à 12 : les douze signes, chaque jour (styles en alternance)
        for (let k = 0; k < 12; k++) {
            const s = signs[k];
            const d = jour.signes[s.slug];
            if (!d) continue;
            const texte = d.essentiel || U.premierePhrase(d.amour.texte);
            await ajouter(s.slug, (sortie) => I.epingleSigneStyle({ style: STYLES_PINS[(n + k) % STYLES_PINS.length], signe: s, eyebrow: 'Horoscope du jour', date: dateTxt, texte, sortie }), {
                titre: `Horoscope ${s.name} du ${dateTxt.replace(/^\S+ /, '')}`,
                description: `${texte} Amour, travail, bien-être et ta mission du jour : l’horoscope ${s.name} complet de Madeleine, calculé sur le vrai ciel.`,
                lien: `${s.slug}.html`
            });
        }

        // 4 : la mission du jour d'un autre signe, en carte citation
        {
            const s = signs[(3 * n + 6) % 12];
            const d = jour.signes[s.slug];
            if (d && d.mission) {
                await ajouter(`mission-${s.slug}`, (sortie) => I.epingleSigneStyle({ style: 'creme', signe: s, eyebrow: 'Ta mission du jour', date: dateTxt, texte: d.mission, sortie }), {
                    titre: `Ta mission du jour, ${s.name}`,
                    description: `${d.mission} La petite mission de Madeleine pour le signe ${s.name}, avec ton horoscope complet du jour.`,
                    lien: `${s.slug}.html`
                });
            }
        }

        // 5 : une page permanente, à tour de rôle (couples, portraits, 2027…)
        {
            const liste = pagesPermanentes(ctx);
            const p = liste[n % liste.length];
            await ajouter(p.id, (sortie) => I.epinglePage({ eyebrow: p.eyebrow, titre: p.titre, sousTitre: p.sousTitre, visuels: p.visuels, sortie }),
                { titre: `${p.titre} · ${p.sousTitre}`, description: p.description, lien: p.lien });
        }

        // 6 : l'événement du ciel du jour s'il y en a un, sinon un article de l'encyclopédie
        const evt = evenementDuJour(ctx, aujourdhui);
        if (evt) {
            await ajouter(evt.id, (sortie) => I.epinglePage({ eyebrow: evt.eyebrow, titre: evt.titre, sousTitre: evt.sousTitre, visuels: evt.visuels, sortie }),
                { titre: `${evt.titre} · ${evt.sousTitre}`, description: evt.description, lien: evt.lien });
        } else {
            const arts = (ctx.articles || []).filter((a) => fs.existsSync(path.join(OUT, `${a.slug}.html`)));
            if (arts.length) {
                const a = arts[n % arts.length];
                const rubrique = U.majuscule(String(a.categorie || 'Encyclopédie').split('&')[0].trim().toLowerCase());
                await ajouter(`article-${a.slug}`, (sortie) => I.epinglePage({ eyebrow: rubrique, titre: a.titre, sousTitre: 'Par Madeleine', visuels: [{ fichier: a.image || 'livre.webp', ratio: RATIO_OBJ, affichage: 600 }], sortie }),
                    { titre: a.titre, description: `${a.titre} : l’article de Madeleine, astrologue de la Maison Authentique.`, lien: `${a.slug}.html` });
            }
        }

        // Le lundi : l'horoscope de la semaine
        if (new Date(aujourdhui + 'T12:00:00Z').getUTCDay() === 1 && fs.existsSync(path.join(OUT, 'horoscope-semaine.html'))) {
            const label = ctx.semaine && ctx.semaine.label ? U.majuscule(ctx.semaine.label) : 'Les douze signes';
            await ajouter('semaine', (sortie) => I.epinglePage({ eyebrow: 'Horoscope de la semaine', titre: 'Ta semaine, signe par signe', sousTitre: label, visuels: [{ fichier: 'livre.webp', ratio: RATIO_OBJ, affichage: 620 }], sortie }),
                { titre: `Horoscope de la semaine · ${label}`, description: 'Amour, travail, bien-être : l’horoscope de la semaine des 12 signes par Madeleine, calculé sur le vrai ciel.', lien: 'horoscope-semaine.html' });
        }

        // 7 : un des visuels de la Maison (signes dorés, couples, duels red flags), à tour de rôle
        const lire = (f) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf-8')); } catch { return []; } };
        const stock = lire('visuels-pinterest.json');
        if (stock.length) {
            const v = stock[n % stock.length];
            nouveaux.push({ id: `${aujourdhui}-${v.id}`, date: aujourdhui, image: v.image, hauteur: 1778, titre: v.titre, description: v.description, lien: v.lien });
        }
        // Saint-Valentin : une épingle de plus par jour du 1er au 14 février
        const val = lire('valentin-pinterest.json').find((v) => v.date === aujourdhui);
        if (val) nouveaux.push({ id: `${aujourdhui}-${val.id}`, date: aujourdhui, image: val.image, hauteur: val.hauteur, titre: val.titre, description: val.description, lien: val.lien });

        pins = [...nouveaux, ...pins].slice(0, 100);
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
        return `<item><title>${xml(p.titre)}</title><link>${xml(lien)}</link><description>${xml(p.description)}</description><pubDate>${new Date(p.date + 'T07:00:00+02:00').toUTCString()}</pubDate><guid isPermaLink="false">${xml(p.id)}</guid><enclosure url="${xml(img)}" type="image/jpeg" length="${taille}"/><media:content url="${xml(img)}" medium="image" type="image/jpeg" width="1000" height="${p.hauteur || 1500}"/></item>`;
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

module.exports = { apercus, pinterest, widget, pourLesMoteurs, evenementDuJour, INDEXNOW_KEY };

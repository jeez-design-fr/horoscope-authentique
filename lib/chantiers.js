// Les nouvelles rubriques du site : horoscope par période, thème astral, lune,
// compatibilité par paire, fiches de caractère, astrologie chinoise, numérologie.
// Tout ce qui est daté est calculé (astronomy-engine) ; aucun appel Gemini ici.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const { esc } = L;
const U = require('./ui');
const { IMG, phrase, tronquer, premierePhrase, dateSigne, write, auteur, editeur, faqHtml, faqSchema, DU, LE, majuscule } = U;
const G = require('./agenda');
const { SIGNES, SLUGS, PHASES } = require('./ciel');
const CH = require('./chinois');

const lireJson = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', f), 'utf-8'));
const ANNUEL = lireJson('annuel-2027.json');
const INTERP = lireJson('interpretations.json');
const FICHES = lireJson('fiches-signes.json');
const CHINOIS = lireJson('chinois.json');
const NUMERO = lireJson('numerologie.json');

const JOUR = 86400000;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const accueil = { label: 'Accueil', href: './' };
const dateLongueFr = (d) => G.dateFr(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------------
// Horoscope par période
// ---------------------------------------------------------------------
function lectures(d) {
    return `<div class="lectures">${[['Amour', 'I', d.amour], ['Travail', 'II', d.travail], ['Bien-être', 'III', d.bienetre]].map(([lb, n, x]) => {
        const texte = typeof x === 'string' ? x : x.texte;
        const titre = typeof x === 'string' ? null : x.titre;
        return `<article class="lecture"><p class="lb"><span>${lb}</span><span aria-hidden="true">${n}</span></p>${titre ? `<h3 class="h3">${esc(titre)}</h3>` : ''}<p class="tx">${esc(texte)}</p></article>`;
    }).join('')}</div>`;
}

function heroSigne(s, eyebrow, h1, essentiel, extra = '') {
    return `<section class="wrap sign-hero" aria-labelledby="h1">
<div class="media"><img src="./assets/${s.image}" alt="Le ${esc(s.name)}, bas-relief de porcelaine et feuille d'or" width="800" height="1193" fetchpriority="high" decoding="async"></div>
<div class="text">
<p class="eyebrow">${eyebrow}</p>
<h1 id="h1" class="display">${h1}</h1>
<p class="meta-caps"><span>${esc(dateSigne(s))}</span><span>Signe de ${esc(s.element)}</span><span>Gouverné par ${esc(s.planete)}</span></p>
${essentiel ? `<div class="essentiel"><p class="eyebrow">L'essentiel</p><p>${esc(essentiel)}</p></div>` : ''}
${extra}
</div>
</section>`;
}

function listeEvenements(evts, titre) {
    if (!evts.length) return '';
    return `<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">${titre}</h2><ol class="agenda">${evts.map((e) => `<li><span class="ag-d">${esc(G.dateFr(e.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</span><span class="ag-t">${esc(G.libelle(e))}</span></li>`).join('')}</ol></div></section>`;
}

function datesCles2027(slug) {
    const i = SLUGS.indexOf(slug), opp = SLUGS[(i + 6) % 12];
    const debut = new Date('2027-01-01T00:00:00Z'), fin = new Date('2028-01-01T00:00:00Z');
    const ev = G.agenda(debut, fin).filter((e) => {
        if (e.type === 'eclipse') return true;
        if (e.type === 'lune') return (e.quartier === 0 || e.quartier === 2) && e.slug === slug;
        if (e.astre === 'Soleil') return false;
        if (e.astre === 'Mercure') return e.type !== 'entree';
        if (e.astre === 'Vénus') return e.type !== 'entree' || e.slug === slug;
        if (['Jupiter', 'Saturne'].includes(e.astre)) return true;
        return e.slug === slug || e.slug === opp;
    });
    return ev;
}

function periodes(ctx) {
    const { signs, ciel, jour, demain, semaine, mois } = ctx;
    const urls = [];
    const dispo = { demain: !!demain, semaine: !!semaine, mois: !!mois, 2027: true };
    const base = { ciel, signs };

    const variantes = [];
    if (demain) variantes.push({ k: 'demain', data: demain.signes, eyebrow: `Horoscope de demain · ${esc(L.dateLongue(demain.ciel.date))}`, h1: (s) => `Horoscope <em>${esc(s.name)}</em> de demain`, titre: (s) => `Horoscope ${s.name} de demain, ${L.dateCourte(demain.ciel.date)}`, hub: 'horoscope-demain.html', hubH1: 'Horoscope de demain', hubEyebrow: esc(L.dateLongue(demain.ciel.date)), evts: [], changefreq: 'daily' });
    if (semaine) {
        const d0 = new Date(semaine.debutIso + 'T00:00:00Z'), d1 = new Date(new Date(semaine.finIso + 'T00:00:00Z').getTime() + JOUR);
        variantes.push({ k: 'semaine', data: semaine.signes, eyebrow: esc(majuscule(semaine.label)), h1: (s) => `Horoscope <em>${esc(s.name)}</em> de la semaine`, titre: (s) => `Horoscope ${s.name} de la semaine du ${G.dateFr(d0)}`, hub: 'horoscope-semaine.html', hubH1: 'Horoscope de la semaine', hubEyebrow: esc(majuscule(semaine.label)), evts: G.agenda(d0, d1).filter((e) => e.astre !== 'Soleil' || e.type !== 'entree' || true), changefreq: 'weekly' });
    }
    if (mois) {
        const d0 = new Date(mois.debutIso + 'T00:00:00Z'), d1 = new Date(new Date(mois.finIso + 'T00:00:00Z').getTime() + JOUR);
        const nomMois = mois.label.replace('mois de ', '');
        variantes.push({ k: 'mois', data: mois.signes, eyebrow: `Horoscope du mois · ${esc(majuscule(nomMois))}`, h1: (s) => `Horoscope <em>${esc(s.name)}</em> ${esc(nomMois.startsWith('a') || nomMois.startsWith('o') ? "d'" + nomMois : 'de ' + nomMois)}`, titre: (s) => `Horoscope ${s.name} ${nomMois.startsWith('a') || nomMois.startsWith('o') ? "d'" + nomMois : 'de ' + nomMois}`, hub: 'horoscope-mois.html', hubH1: `Horoscope ${nomMois.startsWith('a') || nomMois.startsWith('o') ? "d'" + nomMois : 'de ' + nomMois}`, hubEyebrow: 'Horoscope du mois', evts: G.agenda(d0, d1).filter((e) => e.type !== 'lune' || e.quartier % 2 === 0), changefreq: 'weekly' });
    }

    for (const v of variantes) {
        for (const s of signs) {
            const d = v.data[s.slug];
            if (!d) continue;
            const file = `${s.slug}-${v.k}.html`;
            const crumbs = [accueil, { label: 'Horoscope', href: 'horoscope.html' }, { label: s.name, href: `${s.slug}.html` }, { label: v.k === 'demain' ? 'Demain' : v.k === 'semaine' ? 'Semaine' : 'Mois' }];
            const main = heroSigne(s, v.eyebrow, v.h1(s), d.essentiel || premierePhrase(d.amour.texte)) +
                U.ongletsSigne(s.slug, v.k, dispo) +
                `<section class="section" aria-label="Lecture"><div class="wrap stack gap-l">${lectures(d)}</div></section>` +
                listeEvenements(v.evts, 'Le ciel de la période') +
                U.bandeauCabinet("Votre signe n'est qu'un douzième de votre ciel.", 'Madeleine lit votre thème complet, ascendant et héritage familial compris. Dès 20 €.') +
                U.grilleSignes(signs, (x) => `${x.slug}-${v.k}.html`, `${v.hubH1} des autres signes`, s.slug);
            write(file, L.page({
                ...base, main, crumbs, active: 'horoscope',
                head: {
                    title: `${v.titre(s)} · Horoscope Authentique`,
                    description: tronquer(`${v.titre(s)} : ${d.essentiel || premierePhrase(d.amour.texte)} Amour, travail et bien-être selon le ciel réel.`),
                    file, ogType: 'article',
                    jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: v.titre(s), author: auteur, publisher: editeur, datePublished: ctx.genere, dateModified: ctx.genere, image: L.SITE + 'assets/' + s.image, inLanguage: 'fr-FR', mainEntityOfPage: L.SITE + file }, L.crumbsSchema(crumbs)]
                }
            }));
            urls.push([file, v.changefreq, '0.8']);
        }
        // Hub de la période
        const crumbs = [accueil, { label: 'Horoscope', href: 'horoscope.html' }, { label: v.hubH1 }];
        const liste = signs.map((s) => { const d = v.data[s.slug]; return d ? `<li><a href="${s.slug}-${v.k}.html">${IMG.medal(s.slug)}<span><span class="nm">${esc(s.name)}</span><span class="dt">${esc(dateSigne(s))}</span><span class="es">${esc(d.essentiel || premierePhrase(d.amour.texte))}</span></span></a></li>` : ''; }).join('');
        write(v.hub, L.page({
            ...base, crumbs, active: 'horoscope',
            main: `<section class="wrap stack gap-m" style="padding-top:48px;padding-bottom:40px;align-items:center;text-align:center"><p class="eyebrow">${v.hubEyebrow}</p><h1 class="display">${esc(v.hubH1)}</h1><p class="lede">L'essentiel pour chacun des douze signes, rédigé à partir des vraies positions des planètes. La lecture complète vous attend sur la page de votre signe.</p></section>${U.ongletsHub(v.k, dispo)}<section class="section"><div class="wrap" style="padding-top:24px;padding-bottom:96px"><ul class="hub">${liste}</ul></div></section>${listeEvenements(v.evts, 'Le ciel de la période')}`,
            head: { title: `${v.hubH1} : les 12 signes · Horoscope Authentique`, description: tronquer(`${v.hubH1} pour les 12 signes du zodiaque, calculé sur les vraies positions des planètes : amour, travail, bien-être.`), file: v.hub, jsonld: [L.crumbsSchema(crumbs)] }
        }));
        urls.push([v.hub, v.changefreq, '0.8']);
    }

    // ---------- 2027 ----------
    for (const s of signs) {
        const a = ANNUEL.signes[s.slug];
        const file = `${s.slug}-2027.html`;
        const crumbs = [accueil, { label: 'Horoscope 2027', href: 'horoscope-2027.html' }, { label: s.name }];
        const dates = datesCles2027(s.slug);
        const faq = [
            { q: `Comment sera l'année 2027 pour ${LE[s.slug]} ?`, a: `${a.essentiel} ${a.intro}` },
            { q: `Quels sont les meilleurs moments de 2027 pour ${LE[s.slug]} ?`, a: a.trimestres.map((t) => `${t.periode} : ${t.titre.toLowerCase()}.`).join(' ') },
            { q: 'Quand Mercure sera-t-il rétrograde en 2027 ?', a: 'Mercure sera rétrograde à trois reprises en 2027 : ' + G.periodesRetro('Mercure', new Date('2027-01-01'), new Date('2028-01-01')).map((p) => `du ${G.dateFr(p.debut)} au ${G.dateFr(p.fin)}`).join(', ') + '.' }
        ];
        const main = heroSigne(s, 'Horoscope annuel · 2027', `Horoscope 2027 ${DU[s.slug].match(/^(du|des|de la) /)[0]}<em>${esc(s.name)}</em>`, a.essentiel, `<p style="margin:0;color:var(--encre-2);max-width:32em">${esc(a.intro)}</p>`) +
            U.ongletsSigne(s.slug, '2027', dispo) +
            `<section class="section" aria-labelledby="h-trim"><div class="wrap stack gap-l"><h2 id="h-trim" class="h2">Ton année, saison par saison</h2><div class="trimestres">${a.trimestres.map((t) => `<article class="lecture"><p class="lb"><span>${esc(t.periode)}</span></p><h3 class="h3">${esc(t.titre)}</h3><p class="tx">${esc(t.texte)}</p></article>`).join('')}</div></div></section>` +
            `<section class="section" aria-label="Amour, travail, bien-être"><div class="wrap stack gap-l"><h2 class="h2 center">Amour, travail, bien-être en 2027</h2>${lectures({ amour: a.amour, travail: a.travail, bienetre: a.bienetre })}<p class="quote center" style="font-size:clamp(24px,2.6vw,32px);margin-top:12px">« ${esc(a.conseil)} »</p></div></section>` +
            `<section class="section"><div class="wrap-narrow stack gap-l"><div class="head-row"><h2 class="h2">Les dates clés de 2027</h2><span class="muted small">Calculées à partir des éphémérides</span></div><ol class="agenda">${dates.map((e) => `<li><span class="ag-d">${esc(G.dateFr(e.date, { day: 'numeric', month: 'long' }))}</span><span class="ag-t">${esc(G.libelle(e))}</span></li>`).join('')}</ol></div></section>` +
            `<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions sur 2027</h2>${faqHtml(faq)}</div></section>` +
            U.bandeauCabinet('Votre année à vous, calculée sur votre anniversaire.', 'La Boussole annuelle : votre révolution solaire et vos dates clés personnelles, par Madeleine. 45 €.', 'La Boussole annuelle') +
            U.grilleSignes(signs, (x) => `${x.slug}-2027.html`, "L'horoscope 2027 des autres signes", s.slug);
        write(file, L.page({
            ...base, main, crumbs, active: 'horoscope',
            head: {
                title: `Horoscope 2027 ${DU[s.slug]} : amour, travail, dates clés · Horoscope Authentique`,
                description: tronquer(`Horoscope 2027 ${DU[s.slug]} : ${a.essentiel} Amour, travail, bien-être et dates clés calculées sur le vrai ciel.`),
                file, ogType: 'article',
                jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: `Horoscope 2027 ${DU[s.slug]}`, description: a.essentiel, author: auteur, publisher: editeur, datePublished: '2026-10-21', image: L.SITE + 'assets/' + s.image, inLanguage: 'fr-FR', mainEntityOfPage: L.SITE + file }, L.crumbsSchema(crumbs), faqSchema(faq)]
            }
        }));
        urls.push([file, 'monthly', '0.9']);
    }
    {
        const crumbs = [accueil, { label: 'Horoscope 2027' }];
        const liste = signs.map((s) => `<li><a href="${s.slug}-2027.html">${IMG.medal(s.slug)}<span><span class="nm">${esc(s.name)}</span><span class="dt">${esc(dateSigne(s))}</span><span class="es">${esc(ANNUEL.signes[s.slug].essentiel)}</span></span></a></li>`).join('');
        const grands = G.agenda(new Date('2027-01-01T00:00:00Z'), new Date('2028-01-01T00:00:00Z'), { lunes: false }).filter((e) => e.type === 'eclipse' || ['Jupiter', 'Saturne'].includes(e.astre) || (e.astre === 'Mercure' && e.type === 'retro'));
        write('horoscope-2027.html', L.page({
            ...base, crumbs, active: 'horoscope',
            main: `<section class="wrap stack gap-m" style="padding-top:48px;padding-bottom:40px;align-items:center;text-align:center"><p class="eyebrow">Horoscope annuel</p><h1 class="display">Horoscope 2027</h1><p class="lede">${esc(ANNUEL.intro)}</p></section>${U.ongletsHub('2027', dispo)}<section class="section"><div class="wrap" style="padding-top:24px;padding-bottom:72px"><ul class="hub">${liste}</ul></div></section>${listeEvenements(grands, 'Les grands rendez-vous du ciel en 2027')}<section class="section bridge"><div class="wrap-narrow"><p class="eyebrow">Et en Chine ?</p><h2 class="h2">2027, l'année de la Chèvre de Feu</h2><p class="q">Le Nouvel An chinois tombe le 6 février 2027.</p><a class="btn" href="horoscope-chinois-2027.html">L'horoscope chinois 2027</a></div></section>`,
            head: { title: 'Horoscope 2027 : les 12 signes, amour, travail et dates clés · Horoscope Authentique', description: tronquer('Horoscope 2027 pour les 12 signes : Saturne et Neptune en Bélier, Jupiter en Vierge le 26 juillet, éclipse totale le 2 août. Amour, travail et dates clés calculées.'), file: 'horoscope-2027.html', jsonld: [L.crumbsSchema(crumbs)] }
        }));
        urls.push(['horoscope-2027.html', 'monthly', '0.9']);
    }
    return { urls, dispo };
}

// ---------------------------------------------------------------------
// Thème astral & calcul de l'ascendant
// ---------------------------------------------------------------------
function theme(ctx) {
    const { signs, ciel } = ctx;
    const pages = [
        { file: 'theme-astral.html', mode: 'theme', h1: "Thème astral gratuit et calcul de l'<em>ascendant</em>", title: "Thème astral gratuit : calcul en ligne, ascendant, maisons · Horoscope Authentique", desc: "Calculez gratuitement votre thème astral : position exacte des planètes, ascendant, milieu du ciel et maisons, avec interprétation. Calcul dans votre navigateur, rien n'est enregistré.", label: 'Thème astral' },
        { file: 'calcul-ascendant.html', mode: 'ascendant', h1: "Calcul de l'ascendant <em>gratuit</em>", title: "Calcul de l'ascendant gratuit et précis · Horoscope Authentique", desc: "Calculez votre ascendant gratuitement avec votre date, votre heure et votre ville de naissance. Calcul astronomique précis, signe solaire et lunaire inclus, sans inscription.", label: "Calcul de l'ascendant" }
    ];
    const faq = [
        { q: "Comment calculer son ascendant ?", a: "L'ascendant est le signe qui se levait à l'horizon est au moment exact de votre naissance. Il se calcule à partir de l'heure sidérale du lieu et de sa latitude : il faut donc la date, l'heure et la ville de naissance." },
        { q: "Pourquoi l'heure de naissance est-elle indispensable ?", a: "L'ascendant change de signe environ toutes les deux heures. Sans heure exacte, le Soleil et la plupart des planètes restent justes, mais l'ascendant et les maisons ne peuvent pas être déterminés." },
        { q: "Quelle différence entre signe solaire, signe lunaire et ascendant ?", a: "Le signe solaire décrit votre nature profonde, le signe lunaire votre vie émotionnelle, et l'ascendant la manière dont vous abordez le monde et dont les autres vous perçoivent." },
        { q: "Mes données sont-elles enregistrées ?", a: "Non. Le calcul se fait entièrement dans votre navigateur : votre date, votre heure et votre lieu de naissance ne sont envoyés à aucun serveur et ne sont pas conservés." },
        { q: "Le calcul est-il précis ?", a: "Oui : les positions sont calculées avec un moteur astronomique dont l'écart avec les éphémérides de référence est inférieur à un centième de degré. Les maisons sont calculées en système Placidus, le plus utilisé en France." }
    ];
    for (const p of pages) {
        const crumbs = [accueil, { label: p.label }];
        const autre = p.mode === 'theme' ? '<a class="ulink" href="calcul-ascendant.html">Calculer seulement mon ascendant</a>' : '<a class="ulink" href="theme-astral.html">Voir mon thème astral complet</a>';
        const main = `<div data-theme-astral="${p.mode}">
<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:36px">
<p class="eyebrow">Outil gratuit · calcul astronomique</p>
<h1 class="display">${p.h1}</h1>
<p class="lede">Votre date, votre heure et votre ville de naissance suffisent. La Maison calcule la position exacte des planètes à cet instant${p.mode === 'theme' ? ', votre ascendant et vos maisons' : ' et le signe qui se levait à l\u2019horizon'}.</p>
</section>
<section class="wrap" style="max-width:980px;padding-bottom:64px">
<form id="form-theme" class="form-theme" novalidate>
<label class="champ-bloc"><span class="champ-lb">Date de naissance</span><input id="date" class="champ" type="date" min="1900-01-01" max="2100-12-31" required></label>
<label class="champ-bloc"><span class="champ-lb">Heure de naissance</span><input id="heure" class="champ" type="time"></label>
<div class="champ-bloc ville-bloc"><label for="ville" class="champ-lb">Ville de naissance</label><input id="ville" class="champ" type="text" autocomplete="off" placeholder="Commencez à taper…" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="ville-liste"><ul id="ville-liste" class="ville-liste" role="listbox" hidden></ul><span id="ville-info" class="champ-aide"></span></div>
<div class="form-pied"><label class="case"><input id="sans-heure" type="checkbox"> Je ne connais pas mon heure de naissance</label><button type="submit" class="btn">Calculer ${p.mode === 'theme' ? 'mon thème' : 'mon ascendant'}</button></div>
<p id="erreur" class="erreur" role="alert"></p>
<p class="champ-aide" style="margin:0">Petite commune ? Choisissez la grande ville la plus proche : l'écart sur l'ascendant est négligeable. <button type="button" class="lien-bouton" data-exemple>Voir un exemple</button></p>
</form>
</section>
<div id="resultat" hidden></div>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Comprendre son thème</h2>${faqHtml(faq)}<p class="muted small center" style="margin:0">${autre}</p></div></section>
<p class="wrap muted small center credits">Données géographiques : <a class="inlink" href="https://www.geonames.org/" rel="noopener">GeoNames</a> (CC BY 4.0) · calcul astronomique : Astronomy Engine (licence MIT). Aucune donnée n'est enregistrée.</p>
</div>
<script type="application/json" id="interp">${JSON.stringify(INTERP).replace(/</g, '\\u003c')}</script>`;
        write(p.file, L.page({
            ...ctx, ciel, signs, main, crumbs, active: 'theme',
            after: '<script src="./assets/js/astronomy.min.js" defer></script><script src="./assets/js/theme.js" defer></script>',
            head: { title: p.title, description: p.desc, file: p.file, jsonld: [L.crumbsSchema(crumbs), faqSchema(faq), { '@context': 'https://schema.org', '@type': 'WebApplication', name: p.label, applicationCategory: 'LifestyleApplication', operatingSystem: 'Tous', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, url: L.SITE + p.file }] }
        }));
    }
    return { urls: [['theme-astral.html', 'monthly', '0.9'], ['calcul-ascendant.html', 'monthly', '0.9']] };
}

// ---------------------------------------------------------------------
// Lune, éclipses, rétrogrades
// ---------------------------------------------------------------------
const NL_MAISON = ['un nouveau départ personnel : votre image, votre énergie, vos envies', 'vos finances et votre valeur : une nouvelle source de revenus, un budget à réinventer', 'vos échanges et votre entourage : une conversation à ouvrir, un apprentissage à commencer', 'votre foyer et votre famille : un projet de maison, une réconciliation, un besoin de racines', "l'amour, le plaisir et la création : une rencontre, un projet créatif, une envie de légèreté", 'votre quotidien et votre santé : une nouvelle routine, une meilleure hygiène de vie', 'le couple et les associations : un nouvel engagement, un contrat, une relation qui commence', "les transformations profondes : lâcher un attachement, clarifier une question d'argent commun", 'les horizons lointains : un voyage, une formation, une quête de sens', 'votre carrière : une ambition à formuler, une nouvelle orientation professionnelle', 'vos amitiés et vos projets : un réseau, un collectif, un rêve à long terme', 'votre vie intérieure : repos, introspection, intuition, ce qui se prépare en coulisses'];
const PL_MAISON = ["vous-même : vos besoins personnels réclament de l'attention, et une émotion forte peut faire surface", "vos finances : un bilan, une dépense ou une rentrée d'argent met les choses au clair", 'vos échanges : une vérité se dit, une nouvelle arrive, un malentendu se dissipe', 'votre foyer : une émotion familiale, un besoin de repos chez vous, une décision sur la maison', 'votre vie amoureuse et créative : une déclaration, un aboutissement, un coup de cœur', 'votre quotidien : la fatigue se signale, une routine arrive à son terme', 'votre couple et vos associations : une relation révèle ses forces et ses limites', 'vos zones d\u2019ombre : un lâcher-prise, une transformation, un sujet délicat qui se règle', 'vos projets lointains : un voyage, un examen ou une conviction arrive à maturité', 'votre carrière : une reconnaissance, une fin de cycle, un arbitrage entre travail et vie privée', 'vos amitiés : un groupe, un projet collectif ou un rêve trouve son aboutissement', 'votre monde intérieur : besoin de solitude, de sommeil et de bilan ; écoutez vos rêves'];

function lunaisonSlug(l, deja) {
    const d = new Date(l.date.getTime() + 2 * 3600000);
    const m = MOIS[new Date(l.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }).split('-')[1] - 1];
    const y = new Date(l.date).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }).split('-')[0];
    let base = `${l.quartier === 0 ? 'nouvelle-lune' : 'pleine-lune'}-${m.normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${y}`;
    if (deja.has(base)) base += '-2';
    deja.add(base);
    return { slug: base, mois: m, annee: y };
}

function lune(ctx) {
    const { signs, ciel } = ctx;
    const urls = [];
    const maintenant = new Date();
    const debut = new Date('2026-10-01T00:00:00Z');
    const fin = new Date(maintenant.getTime() + 400 * JOUR);
    const toutes = G.lunaisons(debut, fin);
    const deja = new Set();
    const pages = toutes.filter((l) => l.quartier === 0 || l.quartier === 2).map((l) => ({ ...l, ...lunaisonSlug(l, deja) }));
    const ecl = G.eclipses(debut, fin);
    const imgQ = [0, 2, 4, 6];

    for (const p of pages) {
        const pleine = p.quartier === 2;
        const e = ecl.find((x) => Math.abs(x.date - p.date) < 2 * JOUR);
        const nom = `${pleine ? 'Pleine lune' : 'Nouvelle lune'} ${['a', 'o'].includes(p.mois[0]) ? "d'" : 'de '}${p.mois} ${p.annee}`;
        const file = `${p.slug}.html`;
        const parSigne = signs.map((s) => {
            const h = (SIGNES.indexOf(p.signe) - SLUGS.indexOf(s.slug) + 12) % 12;
            return `<li><a href="${s.slug}.html">${IMG.medal(s.slug)}</a><div><h3 class="h3" style="font-size:24px">${esc(s.name)}</h3><p>${pleine ? 'Cette pleine lune éclaire ' : 'Cette nouvelle lune ouvre un cycle pour '}${esc(pleine ? PL_MAISON[h] : NL_MAISON[h])}.</p></div></li>`;
        }).join('');
        const crumbs = [accueil, { label: 'Calendrier lunaire', href: 'calendrier-lunaire.html' }, { label: nom }];
        const prec = pages[pages.indexOf(p) - 1], suiv = pages[pages.indexOf(p) + 1];
        const faq = [
            { q: `Quand a lieu la ${nom.toLowerCase().replace(/^(\w)/, (c) => c)} ?`, a: `${majuscule(nom)} : ${dateLongueFr(p.date)} à ${G.heureFr(p.date)} (heure de Paris), dans le signe ${DU[SLUGS[SIGNES.indexOf(p.signe)]]}, à ${p.degre}°.${e ? ` C'est aussi une éclipse ${e.nature} de ${e.corps}.` : ''}` },
            { q: pleine ? 'Que faire pendant la pleine lune ?' : 'Que faire pendant la nouvelle lune ?', a: pleine ? "La pleine lune est un temps d'aboutissement et de lâcher-prise : faire le bilan, remercier, se libérer de ce qui pèse. C'est aussi le moment traditionnel pour purifier et recharger ses pierres." : "La nouvelle lune est un temps de semailles : poser une intention, commencer un projet, prendre une résolution. On l'écrit souvent, pour la relire à la pleine lune suivante." }
        ];
        const main = `<section class="wrap lune-hero" aria-labelledby="h1">
<div class="lune-visuel">${IMG.lune(pleine ? 4 : 0, false)}</div>
<div class="stack gap-m" style="min-width:0">
<p class="eyebrow">${pleine ? 'Pleine lune' : 'Nouvelle lune'}${e ? ` · éclipse ${esc(e.nature)}` : ''}</p>
<h1 id="h1" class="display">${esc(majuscule(nom))} en <em>${esc(p.signe)}</em></h1>
<dl class="fiche"><div><dt>Date</dt><dd>${esc(majuscule(dateLongueFr(p.date)))}</dd></div><div><dt>Heure exacte (Paris)</dt><dd>${esc(G.heureFr(p.date))}</dd></div><div><dt>Signe</dt><dd>${esc(p.signe)} ${p.degre}°</dd></div>${e ? `<div><dt>Éclipse</dt><dd>${esc(majuscule(e.nature))}${e.corps === 'Soleil' ? (e.parisObscuration ? `, ${e.parisObscuration} % à Paris` : ', invisible en France') : ''}</dd></div>` : ''}</dl>
</div></section>
<section class="section"><div class="wrap stack gap-l"><h2 class="h2">Ce qu'elle remue pour chaque signe</h2><ul class="lune-signes">${parSigne}</ul></div></section>
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>
${pleine && fs.existsSync(path.join(U.OUT, 'pleine-lune-rituel-lacher-prise.html')) ? L.bridge({ eyebrow: 'Rituel', title: 'Le rituel de pleine lune', text: 'Lâcher prise, purifier ses pierres, écrire ce que l\u2019on laisse derrière soi.', href: 'pleine-lune-rituel-lacher-prise.html', cta: 'Lire le rituel' }) : ''}
<nav class="wrap lune-nav" aria-label="Lunaisons voisines">${prec ? `<a class="ulink" href="${prec.slug}.html">← ${esc(prec.quartier === 2 ? 'Pleine' : 'Nouvelle')} lune précédente</a>` : '<span></span>'}<a class="ulink" href="calendrier-lunaire.html">Calendrier lunaire</a>${suiv ? `<a class="ulink" href="${suiv.slug}.html">${esc(suiv.quartier === 2 ? 'Pleine' : 'Nouvelle')} lune suivante →</a>` : '<span></span>'}</nav>`;
        write(file, L.page({
            ...ctx, ciel, signs, main, crumbs, active: 'lune',
            head: { title: `${majuscule(nom)} en ${p.signe} : date, heure, effets par signe · Horoscope Authentique`, description: tronquer(`${majuscule(nom)} : ${dateLongueFr(p.date)} à ${G.heureFr(p.date)}, en ${p.signe}. Ce qu'elle remue pour chaque signe, et le rituel à faire.`), file, ogType: 'article', ogImage: `lune-${pleine ? 5 : 1}.webp`, jsonld: [L.crumbsSchema(crumbs), faqSchema(faq), { '@context': 'https://schema.org', '@type': 'Event', name: `${majuscule(nom)} en ${p.signe}`, startDate: p.date.toISOString(), eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode', location: { '@type': 'VirtualLocation', url: L.SITE + file }, organizer: { '@type': 'Organization', name: 'Horoscope Authentique', url: L.SITE } }] }
        }));
        urls.push([file, 'monthly', '0.7']);
    }

    // Calendrier lunaire (hub)
    {
        const futures = toutes.filter((l) => l.date > maintenant);
        const prochaine = futures.find((l) => l.quartier === 2);
        const pageProchaine = pages.find((x) => Math.abs(x.date - prochaine.date) < JOUR);
        const jours = Math.ceil((prochaine.date - maintenant) / JOUR);
        const liste = futures.slice(0, 16).map((l) => {
            const pg = pages.find((x) => Math.abs(x.date - l.date) < JOUR);
            const nm = `<span class="ag-t">${pg ? `<a class="inlink" href="${pg.slug}.html">${esc(l.nom)}</a>` : esc(l.nom)} en ${esc(l.signe)}</span>`;
            return `<li class="phase-l">${IMG.lune(imgQ[l.quartier])}<span class="ag-d">${esc(majuscule(G.dateFr(l.date, { weekday: 'long', day: 'numeric', month: 'long' })))} · ${esc(G.heureFr(l.date))}</span>${nm}</li>`;
        }).join('');
        const archives = pages.filter((x) => x.date <= maintenant).reverse().map((x) => `<li><a class="inlink" href="${x.slug}.html">${esc(majuscule((x.quartier === 2 ? 'Pleine lune ' : 'Nouvelle lune ') + (['a', 'o'].includes(x.mois[0]) ? "d'" : 'de ') + x.mois + ' ' + x.annee))}</a></li>`).join('');
        const crumbs = [accueil, { label: 'Calendrier lunaire' }];
        const faq = [{ q: 'Quand a lieu la prochaine pleine lune ?', a: `La prochaine pleine lune a lieu le ${dateLongueFr(prochaine.date)} à ${G.heureFr(prochaine.date)} (heure de Paris), en ${prochaine.signe}.` }];
        write('calendrier-lunaire.html', L.page({
            ...ctx, ciel, signs, crumbs, active: 'lune',
            main: `<section class="wrap lune-hero" aria-labelledby="h1"><div class="stack gap-m" style="min-width:0;flex:1 1 460px"><p class="eyebrow">Calendrier lunaire</p><h1 id="h1" class="display">Les phases de la Lune, <em>date par date</em></h1><p class="lede">Dates et heures exactes à Paris, calculées par la Maison, avec le signe traversé par la Lune à chaque phase.</p></div>
<div class="prochaine">${IMG.lune(4, false)}<span class="eyebrow">Prochaine pleine lune · dans ${jours} jour${jours > 1 ? 's' : ''}</span><span class="pr-d">${esc(majuscule(dateLongueFr(prochaine.date)))}</span><span class="muted">à ${esc(G.heureFr(prochaine.date))}, en ${esc(prochaine.signe)}</span>${pageProchaine ? `<a class="ulink" href="${pageProchaine.slug}.html">Ce qu'elle remue</a>` : ''}</div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Les prochaines phases</h2><ol class="agenda phases-liste">${liste}</ol></div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Éclipses et rétrogrades</h2><p style="margin:0;color:var(--encre-2)">Toutes les éclipses, rétrogradations et entrées des planètes de l'année, calculées pour la France.</p><div style="display:flex;flex-wrap:wrap;gap:16px 32px"><a class="btn" href="ciel-2027.html">Le ciel de 2027</a><a class="ulink" href="mercure-retrograde-2027.html">Mercure rétrograde 2027</a></div></div></section>
${archives ? `<section class="section"><div class="wrap-narrow stack gap-m"><h2 class="h2">Lunaisons passées</h2><ul class="archives">${archives}</ul></div></section>` : ''}
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>`,
            head: { title: 'Calendrier lunaire : prochaine pleine lune, phases et dates exactes · Horoscope Authentique', description: tronquer(`Calendrier lunaire : prochaine pleine lune le ${dateLongueFr(prochaine.date)} en ${prochaine.signe}. Toutes les phases de la Lune avec date, heure exacte et signe.`), file: 'calendrier-lunaire.html', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push(['calendrier-lunaire.html', 'weekly', '0.9']);
    }

    // Le ciel de 2027
    {
        const d0 = new Date('2027-01-01T00:00:00Z'), d1 = new Date('2028-01-01T00:00:00Z');
        const e27 = G.eclipses(d0, d1);
        const retros = ['Mercure', 'Vénus', 'Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton'].flatMap((a) => G.periodesRetro(a, d0, d1));
        const entrees = G.entreesEtStations(d0, d1).filter((e) => e.type === 'entree' && ['Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune', 'Pluton'].includes(e.astre));
        const pleines = G.lunaisons(d0, d1).filter((l) => l.quartier === 2);
        const crumbs = [accueil, { label: 'Calendrier lunaire', href: 'calendrier-lunaire.html' }, { label: 'Le ciel de 2027' }];
        const ligneRetro = (p) => `<li><span class="ag-d">${esc(p.astre)}</span><span class="ag-t">du ${esc(G.dateFr(p.debut, { day: 'numeric', month: 'long', year: 'numeric' }))} au ${esc(G.dateFr(p.fin, { day: 'numeric', month: 'long', year: 'numeric' }))}${p.signeDebut === p.signeFin ? `, en ${esc(p.signeDebut)}` : `, de ${esc(p.signeDebut)} à ${esc(p.signeFin)}`}</span></li>`;
        write('ciel-2027.html', L.page({
            ...ctx, ciel, signs, crumbs, active: 'lune',
            main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:40px"><p class="eyebrow">Agenda astral</p><h1 class="display">Le ciel de <em>2027</em></h1><p class="lede">Éclipses, rétrogradations, entrées des planètes et pleines lunes de l'année, calculées pour la France.</p></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Les éclipses de 2027</h2><ol class="agenda">${e27.map((e) => `<li><span class="ag-d">${esc(G.dateFr(e.date, { day: 'numeric', month: 'long' }))}</span><span class="ag-t">${esc(G.libelle(e))}</span></li>`).join('')}</ol></div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Les rétrogradations de 2027</h2><ol class="agenda">${retros.map(ligneRetro).join('')}</ol><a class="ulink" style="align-self:flex-start" href="mercure-retrograde-2027.html">Tout sur Mercure rétrograde en 2027</a></div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Les planètes changent de signe</h2><ol class="agenda">${entrees.map((e) => `<li><span class="ag-d">${esc(G.dateFr(e.date, { day: 'numeric', month: 'long' }))}</span><span class="ag-t">${esc(G.libelle(e))}</span></li>`).join('')}</ol></div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Les pleines lunes de 2027</h2><ol class="agenda">${pleines.map((l) => `<li><span class="ag-d">${esc(G.dateFr(l.date, { day: 'numeric', month: 'long' }))}</span><span class="ag-t">Pleine lune en ${esc(l.signe)} · ${esc(G.heureFr(l.date))}</span></li>`).join('')}</ol></div></section>
${L.bridge({ eyebrow: 'Votre année', title: "L'horoscope 2027 de votre signe", href: 'horoscope-2027.html', cta: "Lire l'horoscope 2027" })}`,
            head: { title: 'Le ciel de 2027 : éclipses, rétrogrades, pleines lunes · Horoscope Authentique', description: tronquer('Toutes les éclipses, rétrogradations, entrées des planètes et pleines lunes de 2027, avec les dates exactes calculées pour la France.'), file: 'ciel-2027.html', jsonld: [L.crumbsSchema(crumbs)] }
        }));
        urls.push(['ciel-2027.html', 'monthly', '0.8']);

        // Mercure rétrograde 2027
        const merc = G.periodesRetro('Mercure', new Date('2026-07-01'), d1);
        const crumbsM = [accueil, { label: 'Le ciel de 2027', href: 'ciel-2027.html' }, { label: 'Mercure rétrograde 2027' }];
        const m27 = merc.filter((p) => p.debut >= d0);
        const faqM = [
            { q: 'Quand Mercure est-il rétrograde en 2027 ?', a: `En 2027, Mercure est rétrograde trois fois : ${m27.map((p) => `du ${G.dateFr(p.debut)} au ${G.dateFr(p.fin)}`).join(', ')}.` },
            { q: "Qu'est-ce que Mercure rétrograde ?", a: "C'est une période d'environ trois semaines où Mercure semble reculer dans le ciel vu depuis la Terre. Le mouvement est apparent. En astrologie, on y associe les malentendus, les retards et les contrats à relire : un temps pour revoir plutôt que pour lancer." }
        ];
        write('mercure-retrograde-2027.html', L.page({
            ...ctx, ciel, signs, crumbs: crumbsM, active: 'lune',
            main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:40px"><p class="eyebrow">Rétrogradations</p><h1 class="display">Mercure rétrograde <em>2027</em> : les dates</h1><p class="lede">Les périodes exactes, calculées pour la France, et comment les traverser sans paniquer.</p></section>
<section class="section"><div class="wrap-narrow stack gap-l"><ol class="agenda">${merc.map((p) => `<li><span class="ag-d">${esc(G.dateFr(p.debut, { day: 'numeric', month: 'long', year: 'numeric' }))}</span><span class="ag-t">jusqu'au ${esc(G.dateFr(p.fin, { day: 'numeric', month: 'long', year: 'numeric' }))}, ${p.signeDebut === p.signeFin ? `en ${esc(p.signeDebut)}` : `de ${esc(p.signeDebut)} à ${esc(p.signeFin)}`}</span></li>`).join('')}</ol>${faqHtml(faqM)}<a class="ulink" style="align-self:flex-start" href="mercure-retrograde.html">Notre article : survivre à Mercure rétrograde</a></div></section>`,
            head: { title: 'Mercure rétrograde 2027 : les dates exactes · Horoscope Authentique', description: tronquer(`Mercure rétrograde en 2027 : ${m27.map((p) => `du ${G.dateFr(p.debut)} au ${G.dateFr(p.fin)}`).join(', ')}. Dates calculées pour la France et conseils.`), file: 'mercure-retrograde-2027.html', jsonld: [L.crumbsSchema(crumbsM), faqSchema(faqM)] }
        }));
        urls.push(['mercure-retrograde-2027.html', 'monthly', '0.8']);
    }
    return { urls };
}

// ---------------------------------------------------------------------
// Compatibilité par paire (78 pages)
// ---------------------------------------------------------------------
const ELEM_DUO = {
    'Feu-Feu': 'Deux signes de Feu : la même flamme, la même impatience.', 'Terre-Terre': 'Deux signes de Terre : le même besoin de concret et de sécurité.', 'Air-Air': "Deux signes d'Air : une complicité d'esprit immédiate.", 'Eau-Eau': "Deux signes d'Eau : une compréhension émotionnelle profonde.",
    'Feu-Air': "Le Feu et l'Air s'attisent : l'Air nourrit la flamme.", 'Terre-Eau': "La Terre et l'Eau se complètent : l'une contient, l'autre nourrit.",
    'Feu-Terre': 'Le Feu et la Terre avancent à des rythmes différents : élan contre patience.', 'Feu-Eau': "Le Feu et l'Eau s'opposent et s'attirent : passion et vapeur garanties.",
    'Air-Terre': "L'Air et la Terre parlent deux langues : les idées et le concret.", 'Air-Eau': "L'Air et l'Eau : la tête et le cœur, à accorder."
};
const elemDuo = (a, b) => ELEM_DUO[`${a}-${b}`] || ELEM_DUO[`${b}-${a}`];

function paires(ctx) {
    const { signs, ciel, compatData, roastData, bySlug } = ctx;
    const urls = [];
    for (let i = 0; i < 12; i++) for (let j = i; j < 12; j++) {
        const a = signs[i], b = signs[j];
        const c = compatData[a.slug].find((x) => x.with === b.slug);
        const r1 = roastData[a.slug].find((x) => x.with === b.slug);
        if (!c) continue;
        const file = `compatibilite-${a.slug}-${b.slug}.html`;
        const nom = a.slug === b.slug ? `${a.name} et ${a.name}` : `${a.name} et ${b.name}`;
        const crumbs = [accueil, { label: 'Compatibilité', href: 'compatibilite-amoureuse.html' }, { label: a.name, href: `compatibilite-${a.slug}.html` }, { label: nom }];
        const verdict = c.score >= 85 ? 'une très belle compatibilité' : c.score >= 70 ? 'une bonne compatibilité' : c.score >= 55 ? 'une compatibilité à travailler' : 'une alliance difficile, mais pas impossible';
        const faq = [
            { q: `Quelle est la compatibilité entre ${LE[a.slug]} et ${LE[b.slug]} ?`, a: `Avec ${c.score} %, ${a.name} et ${b.name} forment ${verdict}. ${elemDuo(a.element, b.element)} Ce qui les rapproche : ${c.rapproche.replace(/\.$/, '').toLowerCase()}. Le point épineux : ${c.epineux.replace(/\.$/, '').toLowerCase()}.` },
            { q: `Un couple ${nom} peut-il durer ?`, a: c.duree }
        ];
        const autres = (s, o) => signs.filter((x) => x.slug !== o.slug).map((x) => { const [p, q] = SLUGS.indexOf(s.slug) <= SLUGS.indexOf(x.slug) ? [s, x] : [x, s]; return `<li><a href="compatibilite-${p.slug}-${q.slug}.html">${IMG.medal(x.slug)}<span>${esc(s.name)} × ${esc(x.name)}</span></a></li>`; }).join('');
        const main = `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:48px">
<div class="duo-medailles">${IMG.medal(a.slug, false)}<span aria-hidden="true">&amp;</span>${IMG.medal(b.slug, false)}</div>
<p class="eyebrow">Compatibilité amoureuse</p>
<h1 class="display">${esc(a.name)} <em>et</em> ${esc(b.name)}</h1>
<p class="score-grand">${c.score} %</p>
<p class="lede" style="font-style:italic">« ${esc(phrase(c.titre))} » · ${esc(elemDuo(a.element, b.element))}</p>
</section>
<section class="section"><div class="wrap duos" style="padding-top:0;padding-bottom:40px"><article class="duo-card"><div class="main" style="flex-basis:100%"><dl>
<div><dt>Au quotidien</dt><dd>${esc(c.quotidien)}</dd></div><div><dt>En amour</dt><dd>${esc(c.amour)}</dd></div><div><dt>Dans la durée</dt><dd>${esc(c.duree)}</dd></div><div><dt>Ce qui vous rapproche</dt><dd>${esc(c.rapproche)}</dd></div><div><dt>Le point épineux</dt><dd>${esc(c.epineux)}</dd></div>
</dl></div></article></div></section>
${r1 ? `<section class="section"><div class="wrap-narrow stack gap-m"><p class="eyebrow">L'oracle du chaos · toxicité ${esc(String(r1.score).replace('%', ' %'))}</p><h2 class="h2">${esc(phrase(r1.titre))}</h2><p style="margin:0;color:var(--encre-2)">${esc(r1.resume)}</p><p style="margin:0"><strong>Le red flag :</strong> ${esc(r1.redflag)}</p><a class="ulink" style="align-self:flex-start" href="red-flags-${a.slug}.html#avec-${b.slug}">Tous les red flags ${esc(DU[a.slug])}</a></div></section>` : ''}
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>
${U.bandeauCabinet('Au-delà des signes solaires : votre couple, thème contre thème.', "Madeleine compare vos deux cartes du ciel complètes dans l'Étude Céleste & Héritage. Dès 20 €.")}
<section class="section"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 class="h2 center" style="font-size:clamp(28px,3vw,40px)">${esc(majuscule(LE[a.slug]))} avec les autres signes</h2><ul class="signs-grid">${autres(a, b)}</ul></div></section>`;
        write(file, L.page({
            ...ctx, ciel, signs, main, crumbs, active: 'compat',
            head: { title: `Compatibilité ${nom} : amour, couple, avenir (${c.score} %) · Horoscope Authentique`, description: tronquer(`Compatibilité ${nom} : ${c.score} %, « ${phrase(c.titre)} ». Au quotidien, en amour, dans la durée : ce qui les rapproche et ce qui coince.`), file, ogType: 'article', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push([file, 'monthly', '0.7']);
    }
    return { urls };
}

// ---------------------------------------------------------------------
// Fiches de caractère (12)
// ---------------------------------------------------------------------
const TRIGONE = { Feu: ['belier', 'lion', 'sagittaire'], Terre: ['taureau', 'vierge', 'capricorne'], Air: ['gemeaux', 'balance', 'verseau'], Eau: ['cancer', 'scorpion', 'poissons'] };
function decans(s, bySlug) {
    const [deb, fin] = s.date.split(' - ');
    const [j, m] = deb.split(' ');
    const debut = new Date(Date.UTC(2027, MOIS.indexOf(m), +j));
    const tri = TRIGONE[s.element];
    const ordre = [...tri.slice(tri.indexOf(s.slug)), ...tri.slice(0, tri.indexOf(s.slug))];
    const f = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    const fins = [new Date(debut.getTime() + 9 * JOUR), new Date(debut.getTime() + 19 * JOUR)];
    return ordre.map((sl, k) => ({ n: k + 1, du: f(k === 0 ? debut : new Date(debut.getTime() + (k * 10) * JOUR)), au: k === 2 ? fin : f(fins[k]), sous: bySlug[sl] }));
}
function fiches(ctx) {
    const { signs, ciel, compatData, bySlug } = ctx;
    const urls = [];
    for (const s of signs) {
        const f = FICHES[s.slug];
        const file = `signe-${s.slug}.html`;
        const top = [...compatData[s.slug]].filter((c) => c.with !== s.slug).sort((x, y) => y.score - x.score).slice(0, 3);
        const crumbs = [accueil, { label: 'Signification des signes', href: 'signification.html' }, { label: s.name }];
        const dc = decans(s, bySlug);
        const faq = [
            { q: `Quel est le caractère ${DU[s.slug]} ?`, a: f.intro },
            { q: `Quelles sont les qualités ${DU[s.slug]} ?`, a: f.qualites.join(', ') + '.' },
            { q: `Quels sont les défauts ${DU[s.slug]} ?`, a: f.defauts.join(', ') + '.' },
            { q: `Quels signes sont les plus compatibles avec ${LE[s.slug]} ?`, a: `Ses meilleures alliances sont ${top.map((c) => `${bySlug[c.with].name} (${c.score} %)`).join(', ')}.` }
        ];
        const main = heroSigne(s, 'Le signe', `${esc(majuscule(LE[s.slug].replace(/^(le|la|les) /, '')))} : <em>caractère</em> et personnalité`, null, `<p class="lede" style="font-size:21px">${esc(f.intro)}</p>`) +
            `<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2">Le caractère ${esc(DU[s.slug])}</h2>${f.caractere.split('\n\n').map((p) => `<p style="margin:0;color:var(--encre-2);font-size:21px;line-height:1.75">${esc(p)}</p>`).join('')}</div></section>
<section class="section"><div class="wrap" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:48px 72px"><div class="stack gap-m"><h2 class="h2">Ses qualités</h2><ul class="puces">${f.qualites.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div><div class="stack gap-m"><h2 class="h2">Ses défauts</h2><ul class="puces">${f.defauts.map((q) => `<li>${esc(q)}</li>`).join('')}</ul></div></div></section>
<section class="section"><div class="wrap stack gap-l">${lectures({ amour: f.amour, travail: f.travail, bienetre: f.bienetre })}<p class="quote center" style="font-size:clamp(24px,2.6vw,32px)">« ${esc(f.conseil)} »</p></div></section>
<section class="section"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:48px 80px"><div class="stack gap-m" style="flex:1 1 380px;min-width:0"><h2 class="h2">Les trois décans ${esc(DU[s.slug])}</h2><p style="margin:0;color:var(--encre-2)">Chaque signe se divise en trois périodes d'environ dix jours, chacune teintée par un signe du même élément. Les dates varient légèrement selon les années.</p></div><dl class="fiche">${dc.map((d) => `<div><dt>${d.n}${d.n === 1 ? 'er' : 'e'} décan · ${esc(d.du)} → ${esc(d.au)}</dt><dd>teinte ${esc(d.sous.name)}</dd></div>`).join('')}<div><dt>Élément · mode</dt><dd>${esc(s.element)} · ${esc(s.mode)}</dd></div><div><dt>Planète maîtresse</dt><dd>${esc(s.planete)}</dd></div><div><dt>Pierre</dt><dd><a class="inlink" href="pierres-protectrices.html">${esc(s.pierre)}</a></dd></div><div><dt>Partie du corps</dt><dd>${esc(s.corps)}</dd></div></dl></div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions sur ${esc(LE[s.slug])}</h2>${faqHtml(faq)}</div></section>
<section class="section"><div class="wrap" style="padding-top:64px;padding-bottom:64px;display:flex;flex-wrap:wrap;gap:16px 32px;justify-content:center"><a class="btn" href="${s.slug}.html">Horoscope du jour</a><a class="ulink" href="${s.slug}-2027.html">Horoscope 2027</a><a class="ulink" href="compatibilite-${s.slug}.html">Compatibilités</a><a class="ulink" href="red-flags-${s.slug}.html">Red flags</a></div></section>
${U.grilleSignes(signs, (x) => `signe-${x.slug}.html`, 'Les autres signes', s.slug)}`;
        write(file, L.page({
            ...ctx, ciel, signs, main, crumbs, active: 'encyclo',
            head: { title: `${majuscule(LE[s.slug])} : caractère, qualités, défauts, amour · Horoscope Authentique`, description: tronquer(`${majuscule(LE[s.slug])} (${dateSigne(s)}) : caractère, qualités, défauts, amour, travail et décans. ${f.intro}`), file, ogType: 'article', jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: `${majuscule(LE[s.slug])} : caractère et personnalité`, author: auteur, publisher: editeur, image: L.SITE + 'assets/' + s.image, inLanguage: 'fr-FR', mainEntityOfPage: L.SITE + file }, L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push([file, 'monthly', '0.8']);
    }
    return { urls };
}

// ---------------------------------------------------------------------
// Astrologie chinoise
// ---------------------------------------------------------------------
function medaillonChinois(a, petit) { return `<span class="hanzi${petit ? ' petit' : ''}" aria-hidden="true">${a.hanzi}</span>`; }
function chinois(ctx) {
    const { signs, ciel } = ctx;
    const urls = [];
    const table = CH.table(1900, 2050);
    const annees = (slug) => Object.keys(table).map(Number).filter((y) => CH.animalDeAnnee(y) === slug && y >= 1924 && y <= 2031);
    const calc = `<section class="section"><div class="wrap-narrow stack gap-m center" style="align-items:center" data-chinois>
<h2 class="h2">Quel est votre signe chinois ?</h2>
<form class="outil-mini" novalidate><label class="champ-bloc"><span class="champ-lb">Date de naissance</span><input class="champ" type="date" min="1900-01-01" max="2050-12-31" required></label><button type="submit" class="btn">Trouver mon signe</button></form>
<p class="outil-res" aria-live="polite"></p>
<script type="application/json" class="nouvel-an">${JSON.stringify(table)}</script>
<script type="application/json" class="animaux">${JSON.stringify(Object.fromEntries(CHINOIS.ordre.map((k) => [k, CHINOIS.animaux[k].nom])))}</script>
</div></section>`;
    for (const k of CHINOIS.ordre) {
        const a = CHINOIS.animaux[k];
        const le = k === 'chevre' ? 'la' : 'le', Le = k === 'chevre' ? 'La' : 'Le', du = k === 'chevre' ? 'de la' : 'du';
        const file = `signe-chinois-${k}.html`;
        const crumbs = [accueil, { label: 'Horoscope chinois 2027', href: 'horoscope-chinois-2027.html' }, { label: a.nom }];
        const ans = annees(k);
        const faq = [
            { q: `Quelles sont les années ${du} ${a.nom} ?`, a: ans.map((y) => `${y} (${CH.elementDeAnnee(y)})`).join(', ') + '. Attention : l\u2019année chinoise commence au Nouvel An chinois, entre le 21 janvier et le 20 février.' },
            { q: `Comment sera 2027 pour ${le} ${a.nom} ?`, a: a.a2027 }
        ];
        const main = `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:40px">${medaillonChinois(a)}<p class="eyebrow">Astrologie chinoise</p><h1 class="display">${Le} <em>${esc(a.nom)}</em> : caractère et année 2027</h1><p class="lede">${esc(a.profil)}</p></section>
<section class="section"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:48px 80px"><div class="stack gap-m" style="flex:1 1 420px;min-width:0"><p class="eyebrow">L'année de la Chèvre de Feu</p><h2 class="h2">${Le} ${esc(a.nom)} en 2027</h2><p style="margin:0;color:var(--encre-2);font-size:21px;line-height:1.7">${esc(a.a2027)}</p><p style="margin:0;color:var(--encre-2)">${esc(a.relations)}</p></div>
<div class="stack gap-m" style="flex:1 1 380px;min-width:0"><h2 class="h2">Les années ${du} ${esc(a.nom)}</h2><ol class="agenda">${ans.map((y) => `<li><span class="ag-d">${y}</span><span class="ag-t">${esc(a.nom)} de ${esc(CH.elementDeAnnee(y))} · à partir du ${esc(new Date(table[y] + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }))}</span></li>`).join('')}</ol></div></div></section>
${calc}
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>
<section class="section"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 class="h2 center" style="font-size:clamp(28px,3vw,40px)">Les douze signes chinois</h2><ul class="signs-grid">${CHINOIS.ordre.filter((x) => x !== k).map((x) => `<li><a href="signe-chinois-${x}.html">${medaillonChinois(CHINOIS.animaux[x], true)}<span>${esc(CHINOIS.animaux[x].nom)}</span></a></li>`).join('')}</ul></div></section>`;
        write(file, L.page({
            ...ctx, ciel, signs, main, crumbs, active: 'horoscope',
            after: '<script src="./assets/js/outils.js" defer></script>',
            head: { title: `${a.nom} (astrologie chinoise) : caractère et horoscope 2027 · Horoscope Authentique`, description: tronquer(`${Le} ${a.nom} en astrologie chinoise : caractère, compatibilités, années de naissance et horoscope 2027 de la Chèvre de Feu.`), file, ogType: 'article', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push([file, 'monthly', '0.7']);
    }
    {
        const crumbs = [accueil, { label: 'Horoscope chinois 2027' }];
        const faq = [
            { q: 'Quand a lieu le Nouvel An chinois 2027 ?', a: `Le Nouvel An chinois 2027 a lieu le samedi 6 février 2027. L'année de la Chèvre de Feu dure jusqu'au ${new Date(Date.parse(table[2028] + 'T12:00:00Z') - JOUR).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}, veille du Nouvel An suivant.` },
            { q: 'Quel est le signe chinois de 2027 ?', a: "2027 est l'année de la Chèvre (ou Mouton) de Feu, un signe de douceur, de créativité et de paix." }
        ];
        write('horoscope-chinois-2027.html', L.page({
            ...ctx, ciel, signs, crumbs, active: 'horoscope',
            after: '<script src="./assets/js/outils.js" defer></script>',
            main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:40px">${medaillonChinois(CHINOIS.animaux.chevre)}<p class="eyebrow">Astrologie chinoise</p><h1 class="display">Horoscope chinois 2027 : la <em>Chèvre de Feu</em></h1><p class="lede">${esc(CHINOIS.intro2027)}</p></section>
${calc}
<section class="section"><div class="wrap" style="padding-top:72px;padding-bottom:88px"><ul class="hub">${CHINOIS.ordre.map((k) => `<li><a href="signe-chinois-${k}.html">${medaillonChinois(CHINOIS.animaux[k], true)}<span><span class="nm">${esc(CHINOIS.animaux[k].nom)}</span><span class="es">${esc(premierePhrase(CHINOIS.animaux[k].a2027))}</span></span></a></li>`).join('')}</ul></div></section>
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>`,
            head: { title: "Horoscope chinois 2027 : l'année de la Chèvre de Feu · Horoscope Authentique", description: tronquer("Horoscope chinois 2027 : l'année de la Chèvre de Feu commence le 6 février 2027. Prévisions pour les 12 signes chinois et calcul de votre signe."), file: 'horoscope-chinois-2027.html', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push(['horoscope-chinois-2027.html', 'monthly', '0.8']);
    }
    return { urls };
}

// ---------------------------------------------------------------------
// Numérologie
// ---------------------------------------------------------------------
function numerologie(ctx) {
    const { signs, ciel } = ctx;
    const urls = [];
    const nombres = Object.keys(NUMERO.chemins);
    const calc = `<section class="section"><div class="wrap-narrow stack gap-m center" style="align-items:center" data-numerologie>
<h2 class="h2">Calculez votre chemin de vie</h2>
<form class="outil-mini" novalidate><label class="champ-bloc"><span class="champ-lb">Date de naissance</span><input class="champ" type="date" min="1900-01-01" max="2100-12-31" required></label><button type="submit" class="btn">Calculer</button></form>
<p class="outil-res" aria-live="polite"></p>
<script type="application/json" class="chemins">${JSON.stringify(Object.fromEntries(nombres.map((n) => [n, NUMERO.chemins[n].titre])))}</script>
</div></section>`;
    for (const n of nombres) {
        const c = NUMERO.chemins[n];
        const file = `chemin-de-vie-${n}.html`;
        const crumbs = [accueil, { label: 'Numérologie', href: 'numerologie-chemin-de-vie.html' }, { label: `Chemin de vie ${n}` }];
        const faq = [{ q: `Que signifie le chemin de vie ${n} ?`, a: `${c.titre} : ${c.motsCles.toLowerCase()}. ${c.profil}` }];
        write(file, L.page({
            ...ctx, ciel, signs, crumbs, active: 'encyclo',
            after: '<script src="./assets/js/outils.js" defer></script>',
            main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:40px"><span class="nombre" aria-hidden="true">${n}</span><p class="eyebrow">Numérologie · ${esc(c.motsCles)}</p><h1 class="display">Chemin de vie ${n} : <em>${esc(c.titre.replace(/ \(.*\)/, '').replace(/^Le |^L'/, (m) => m.toLowerCase()))}</em></h1><p class="lede">${esc(c.profil)}</p></section>
<section class="section"><div class="wrap stack gap-l">${lectures({ amour: c.amour, travail: c.travail, bienetre: { titre: 'Votre défi', texte: c.defi } }).replace('>Bien-être<', '>Défi<')}</div></section>
${calc}
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>
<section class="section"><div class="wrap" style="padding-top:64px;padding-bottom:88px"><ul class="nombres-grille">${nombres.filter((x) => x !== n).map((x) => `<li><a href="chemin-de-vie-${x}.html"><span class="nombre petit">${x}</span><span>${esc(NUMERO.chemins[x].titre.replace(/ \(.*\)/, ''))}</span></a></li>`).join('')}</ul></div></section>`,
            head: { title: `Chemin de vie ${n} en numérologie : ${c.titre.replace(/ \(.*\)/, '').toLowerCase()} · Horoscope Authentique`, description: tronquer(`Chemin de vie ${n} : ${c.motsCles.toLowerCase()}. ${c.profil}`), file, ogType: 'article', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push([file, 'monthly', '0.6']);
    }
    {
        const crumbs = [accueil, { label: 'Numérologie' }];
        const faq = [{ q: 'Comment calculer son chemin de vie ?', a: NUMERO.methode }];
        write('numerologie-chemin-de-vie.html', L.page({
            ...ctx, ciel, signs, crumbs, active: 'encyclo',
            after: '<script src="./assets/js/outils.js" defer></script>',
            main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:48px;padding-bottom:24px"><p class="eyebrow">Numérologie</p><h1 class="display">Calcul du <em>chemin de vie</em></h1><p class="lede">${esc(NUMERO.intro)}</p></section>
${calc}
<section class="section"><div class="wrap" style="padding-top:64px;padding-bottom:88px"><ul class="nombres-grille">${nombres.map((x) => `<li><a href="chemin-de-vie-${x}.html"><span class="nombre petit">${x}</span><span>${esc(NUMERO.chemins[x].titre.replace(/ \(.*\)/, ''))}</span></a></li>`).join('')}</ul></div></section>
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>`,
            head: { title: 'Calcul du chemin de vie gratuit : numérologie · Horoscope Authentique', description: tronquer('Calculez gratuitement votre chemin de vie en numérologie à partir de votre date de naissance, et découvrez sa signification : talents, amour, travail, défis.'), file: 'numerologie-chemin-de-vie.html', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push(['numerologie-chemin-de-vie.html', 'monthly', '0.8']);
    }
    return { urls };
}

module.exports = { periodes, theme, lune, paires, fiches, chinois, numerologie, ANNUEL };

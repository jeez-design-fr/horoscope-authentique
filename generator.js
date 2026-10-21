// =====================================================================
//  HOROSCOPE AUTHENTIQUE — générateur du site
//  Chaque nuit (GitHub Actions) : calcule le ciel réel, fait rédiger
//  l'horoscope par Gemini à partir de ce ciel, (ré)écrit quelques
//  articles, puis régénère toutes les pages dans ./public.
// =====================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { getCiel, astresPourSigne, periodeMercureRetro, PHASES } = require('./lib/ciel');
const H = require('./lib/horoscope');
const C = require('./lib/chantiers');
const P = require('./lib/promotion');
const U = require('./lib/ui');
const articlesLib = require('./lib/articles');
const L = require('./lib/layout');
const { esc } = L;

const OUT = './public';
const API_KEY = (process.env.GOOGLE_API_KEY || '').trim();
const signs = require('./signs.json');
const articles = require('./articles.json');
const compatData = require('./compatibilite-data.json');
const roastData = require('./red-flags-data.json');
const bySlug = Object.fromEntries(signs.map((s) => [s.slug, s]));
const SLUGS_ORDRE = signs.map((s) => s.slug);

const { IMG, phrase, tronquer, premierePhrase, dateSigne, ancre, write, auteur, editeur, article, faqHtml, faqSchema, ongletsSigne, ongletsHub } = require('./lib/ui');

async function main() {
    console.log('🚀 Génération du site');
    fs.mkdirSync(path.join(OUT, 'assets', 'fonts'), { recursive: true });

    // ---------- 1. Le ciel et l'horoscope ----------
    const cielMaintenant = getCiel(new Date());
    // Ordre de priorité des appels Gemini (plafond par nuit) : demain, semaine, mois, puis articles
    const { jour: horo, demain: horoDemain } = await H.quotidiens({ apiKey: API_KEY, signs, publicDir: OUT });
    const horoSemaine = await H.semaine({ apiKey: API_KEY, signs });
    const horoMois = await H.mois({ apiKey: API_KEY, signs });
    const ciel = horo.ciel || cielMaintenant;
    const dispo = { demain: !!horoDemain, semaine: !!horoSemaine, mois: !!horoMois, 2027: true };
    const quand = horo.genereLe;
    const merc = periodeMercureRetro(new Date());
    const mercTexte = merc.enCours
        ? `Mercure est rétrograde en ce moment, jusqu'au ${L.dateCourte(merc.fin)}.`
        : `La prochaine période de Mercure rétrograde ira du ${L.dateCourte(merc.debut)} au ${L.dateCourte(merc.fin)}.`;

    // ---------- 2. Articles à (ré)écrire cette nuit ----------
    await articlesLib.mettreAJour(API_KEY, articles);
    const articlesPrets = articles.filter((a) => articlesLib.lireCorps(a.slug));

    // ---------- 3. Copie des assets ----------
    const copier = (src, dst) => {
        for (const f of fs.readdirSync(src)) {
            const s = path.join(src, f), d = path.join(dst, f);
            if (fs.statSync(s).isDirectory()) { fs.mkdirSync(d, { recursive: true }); copier(s, d); } else fs.copyFileSync(s, d);
        }
    };
    copier('./assets', path.join(OUT, 'assets'));

    const ctx = { ciel, signs };
    const accueilCrumb = { label: 'Accueil', href: './' };

    // ---------- 4. Accueil ----------
    {
        const dial = signs.map((s, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const left = (50 + 41 * Math.cos(a)).toFixed(2), top = (50 + 41 * Math.sin(a)).toFixed(2);
            return `<a class="medal" href="${s.slug}.html" style="left:${left}%;top:${top}%" aria-label="Horoscope ${esc(s.name)} du jour"><span class="m"><img src="./assets/${s.slug}-carte.webp" alt="" width="320" height="366" decoding="async"><span class="nm" aria-hidden="true">${esc(s.name)}</span></span></a>`;
        }).join('');
        const astres = ciel.astres.map((a) => `<li><span class="n">${a.nom}</span><span class="v">en ${a.signe} <span class="muted small">${a.degre}°</span></span>${a.retrograde ? '<span class="r">rétrograde</span>' : ''}</li>`).join('');
        const phases = PHASES.map((p, i) => `<li${i === ciel.lune.phaseIndex ? ' class="now"' : ''}>${IMG.lune(i)}<span class="nm">${p}</span>${i === ciel.lune.phaseIndex ? '<span class="tag-now">Ce soir</span>' : ''}</li>`).join('');
        const semaine = Math.floor(Date.now() / (7 * 86400000));
        const aLire = [0, 1, 2, 3].map((k) => articlesPrets[(semaine * 4 + k * 7) % articlesPrets.length]).filter((v, i, t) => v && t.indexOf(v) === i);
        const listeArticles = aLire.map((a) => {
            const c = articlesLib.cat(a.categorie);
            return `<a class="aitem" href="${a.slug}.html"><img src="./assets/${c.image}" alt="" width="640" height="731" loading="lazy"><span><span class="c">${esc(c.label)}</span><span class="t">${esc(a.titre)}</span><span class="m">Par Madeleine</span></span></a>`;
        }).join('');
        const faq = [
            { q: "L'horoscope du jour est-il fiable ?", a: "Un horoscope par signe décrit une tendance commune à des millions de personnes : il ne remplace pas un thème natal. Le nôtre part des positions réelles des planètes, calculées chaque nuit, puis les traduit pour chacun des douze signes." },
            { q: 'Comment les positions des planètes sont-elles calculées ?', a: "Chaque nuit, la Maison calcule la position du Soleil, de la Lune et des huit planètes à partir des éphémérides astronomiques, ainsi que les rétrogradations, la phase de la Lune et les aspects du jour. L'horoscope n'a le droit de citer que ces positions." },
            { q: 'Quand Mercure sera-t-il rétrograde ?', a: mercTexte + ' La période dure environ trois semaines et revient trois à quatre fois par an.' },
            { q: 'Pourquoi connaître son ascendant ?', a: "Le signe solaire décrit votre nature profonde ; l'ascendant, calculé avec l'heure et le lieu exacts de naissance, décrit votre manière d'aborder le monde. Deux personnes du même signe peuvent avoir des ascendants très différents." },
            { q: "Qu'est-ce que l'astrologie karmique ?", a: "Une lecture du thème natal qui cherche les schémas hérités de la lignée et la direction indiquée par le Nœud Nord. C'est la spécialité du Cabinet privé de Madeleine." }
        ];
        const main = `
<section class="wrap hero" aria-labelledby="h1">
<div class="hero-text">
<p class="eyebrow">Astrologie · Maison Authentique</p>
<h1 id="h1" class="display">L'horoscope du jour, calculé sur le <em>ciel réel</em>.</h1>
<p class="lede">Chaque nuit, la Maison calcule la position du Soleil, de la Lune et des planètes, puis rédige pour chacun des douze signes une lecture en trois temps : amour, travail, bien-être. Choisissez le vôtre sur le cadran.</p>
<div class="hero-actions"><a class="btn" href="horoscope.html">Lire mon horoscope</a><a class="ulink" href="calcul-ascendant.html">Calculer mon ascendant</a></div>
<p class="muted small" style="margin:0">Mis à jour le ${L.dateCourte(quand)} à ${L.heure(quand)} · 12 signes · lecture gratuite</p>
</div>
<div class="hero-dial"><div class="dial" role="group" aria-label="Cadran des douze signes">
<div class="orbit r1" aria-hidden="true"></div><div class="orbit r2" aria-hidden="true"></div>
<div class="centre"><img src="./assets/lune-${ciel.lune.phaseIndex + 1}.webp" alt="${esc(ciel.lune.phase)}" width="240" height="274" fetchpriority="high"><span class="k">Ce soir</span><span class="v">${esc(ciel.lune.phase)}</span><span class="s">${ciel.lune.illumination} % éclairée · en ${esc(ciel.lune.signe)}</span></div>
<div class="ronde">${dial}</div>
</div></div>
</section>

<section class="section" aria-labelledby="h-ciel"><div class="wrap stack gap-l">
<div class="head-row"><div class="stack gap-s"><p class="eyebrow">Le ciel du jour</p><h2 id="h-ciel" class="h2">Où sont les planètes aujourd'hui</h2></div>
<p class="muted" style="margin:0;max-width:30em">Positions calculées pour le ${esc(L.dateLongue(ciel.date).toLowerCase())}. ${esc(mercTexte)}</p></div>
<ul class="astres">${astres}</ul>
</div></section>

<section class="section" aria-labelledby="h-lune"><div class="wrap stack gap-l">
<div class="head-row"><div class="stack gap-s"><p class="eyebrow">Le cycle en cours</p><h2 id="h-lune" class="h2">La Lune, phase après phase</h2></div>
<p class="muted" style="margin:0;max-width:30em">${ciel.lune.croissante ? 'La Lune croît : un temps pour porter les projets lancés à la nouvelle lune, avant le bilan de la pleine lune.' : 'La Lune décroît : un temps pour trier, terminer et lâcher ce qui ne sert plus, avant le prochain départ.'}</p></div>
<ol class="phases">${phases}</ol>
</div></section>

<section class="section" aria-labelledby="h-outils"><div class="wrap stack gap-xl">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Les outils de la Maison</p><h2 id="h-outils" class="h2">Au-delà du signe solaire</h2><p class="glisser" aria-hidden="true">Faites glisser →</p></div>
<div class="tools">
<a class="tool" href="theme-astral.html"><span class="socle">${IMG.obj('cosmos.webp')}</span><span class="eyebrow">Gratuit</span><h3 class="h3">Thème astral</h3><p>Votre ciel de naissance calculé au centième de degré : ascendant, planètes, maisons.</p></a>
<a class="tool" href="compatibilite-amoureuse.html"><span class="socle">${IMG.obj('compatibilite.webp')}</span><span class="eyebrow">Amour</span><h3 class="h3">Compatibilité</h3><p>Deux signes, cinq lectures : le quotidien, le désir, la durée, ce qui rapproche et ce qui coince.</p></a>
<a class="tool" href="horoscope-2027.html"><span class="socle">${IMG.obj('entree.webp')}</span><span class="eyebrow">L'année qui vient</span><h3 class="h3">Horoscope 2027</h3><p>Votre année saison par saison, avec les dates clés calculées sur le vrai ciel.</p></a>
<a class="tool" href="calendrier-lunaire.html"><span class="socle socle-lune"><img src="./assets/lune-5.webp" alt="" width="240" height="274" loading="lazy" decoding="async"></span><span class="eyebrow">Lune</span><h3 class="h3">Calendrier lunaire</h3><p>Pleines et nouvelles lunes à l'heure près, et ce qu'elles remuent pour chaque signe.</p></a>
<a class="tool" href="red-flags.html"><span class="socle">${IMG.obj('red-flags.webp')}</span><span class="eyebrow">L'oracle du chaos</span><h3 class="h3">Red Flags</h3><p>Les alliances toxiques du zodiaque, sans filtre et avec humour.</p></a>
<a class="tool" href="horoscope-chinois-2027.html"><span class="socle">${IMG.obj('elements.webp')}</span><span class="eyebrow">Chèvre de Feu</span><h3 class="h3">Horoscope chinois</h3><p>Votre signe chinois et votre année 2027, à partir du 6 février.</p></a>
<a class="tool" href="encyclopedie.html"><span class="socle">${IMG.obj('livre.webp')}</span><span class="eyebrow">Encyclopédie</span><h3 class="h3">La Bibliothèque</h3><p>Ascendant, Lilith, maisons, rétrogrades : les notions qui vont plus loin que le signe.</p></a>
<a class="tool" href="numerologie-chemin-de-vie.html"><span class="socle">${IMG.obj('pierres.webp')}</span><span class="eyebrow">Numérologie</span><h3 class="h3">Chemin de vie</h3><p>Le nombre de votre date de naissance et ce qu'il dit de votre route.</p></a>
</div></div></section>

<section class="section" aria-labelledby="h-cabinet"><div class="wrap split">
<div class="split-media">${IMG.obj('cabinet.webp', 'Encrier de porcelaine et plume dorée du Cabinet privé')}</div>
<div class="split-text">
<p class="eyebrow">Le Cabinet privé</p>
<h2 id="h-cabinet" class="h2">Votre thème complet, lu par <em>Madeleine</em>.</h2>
<p class="lede" style="font-size:21px">Une étude écrite à partir de votre date, de votre heure et de votre lieu de naissance. Sa spécialité : l'héritage familial, ce que votre ciel porte de la lignée qui vous précède.</p>
<ul class="offers">
<li><span class="o-n">L'Essentiel karmique</span><span class="o-t">Thème identitaire, héritage familial, mission de vie, une question.</span><span class="o-p">20 €</span></li>
<li><span class="o-n">La Boussole annuelle</span><span class="o-t">L'Essentiel, plus la révolution solaire et vos dates clés de l'année.</span><span class="o-p">45 €</span></li>
<li><span class="o-n">L'Alchimie totale</span><span class="o-t">La Boussole, plus un rituel, une prescription de pierres et une correspondance ouverte.</span><span class="o-p">80 €</span></li>
</ul>
<div><a class="btn" href="etude-karmique.html">Commander une étude</a></div>
</div></div></section>

<section class="section" aria-labelledby="h-biblio"><div class="wrap stack gap-l">
<div class="head-row"><div class="stack gap-s"><p class="eyebrow">La Bibliothèque</p><h2 id="h-biblio" class="h2">À lire cette semaine</h2></div><a class="ulink" href="encyclopedie.html">Toute l'encyclopédie</a></div>
<div class="alist">${listeArticles}</div>
</div></section>

<section class="section" aria-labelledby="h-faq"><div class="wrap-narrow stack gap-l">
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Questions fréquentes</p><h2 id="h-faq" class="h2">Ce qu'on nous demande</h2></div>
${faqHtml(faq)}
</div></section>

<section class="section" aria-label="Signature"><div class="wrap-narrow stack gap-m center" style="align-items:center">
<img src="./assets/entree.webp" alt="" width="640" height="731" loading="lazy" style="width:72px;height:auto">
<p class="quote">« Les étoiles inclinent, mais ne déterminent pas. »</p>
<p class="eyebrow" style="color:var(--gris)">Madeleine, fondatrice de la Maison</p>
</div></section>`;
        write('index.html', L.page({
            ...ctx, main,
            head: {
                title: 'Horoscope du jour gratuit, calculé sur le ciel réel · Horoscope Authentique',
                description: 'Horoscope du jour gratuit pour les 12 signes, rédigé chaque nuit à partir des vraies positions des planètes. Amour, travail, bien-être, compatibilités et Cabinet privé.',
                file: 'index.html',
                preload: `<link rel="preload" as="image" href="./assets/lune-${ciel.lune.phaseIndex + 1}.webp">`,
                jsonld: [
                    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Horoscope Authentique', alternateName: 'Maison Authentique', url: L.SITE, inLanguage: 'fr-FR' },
                    { '@context': 'https://schema.org', '@type': 'Organization', name: 'Horoscope Authentique', url: L.SITE, logo: L.SITE + 'assets/icon-192.png', founder: auteur },
                    faqSchema(faq)
                ]
            }
        }));
    }

    // ---------- 5. Pages des signes ----------
    for (const s of signs) {
        const d = horo.signes[s.slug];
        const essentiel = d.essentiel || premierePhrase(d.amour.texte);
        const { dans, face } = astresPourSigne(ciel, s.slug);
        const transits = [
            `Soleil en ${ciel.soleil.signe}`,
            ...[...dans, ...face].filter((a) => a.id !== 'Sun' && a.id !== 'Moon').map((a) => `${a.nom} en ${a.signe}${a.retrograde ? ' (rétrograde)' : ''}`),
            `Lune en ${ciel.lune.signe}`
        ];
        const lectures = [['Amour', 'I', d.amour], ['Travail', 'II', d.travail], ['Bien-être', 'III', d.bienetre]].map(([lb, n, x]) => `
<article class="lecture"><p class="lb"><span>${lb}</span><span aria-hidden="true">${n}</span></p>${x.titre ? `<h3 class="h3">${esc(x.titre)}</h3>` : ''}<p class="tx">${esc(x.texte)}</p></article>`).join('');
        const compat = compatData[s.slug].map((c) => {
            const o = bySlug[c.with];
            return `<li><a href="compatibilite-${SLUGS_ORDRE.indexOf(s.slug) <= SLUGS_ORDRE.indexOf(o.slug) ? s.slug + '-' + o.slug : o.slug + '-' + s.slug}.html">${IMG.medal(o.slug)}<span class="info"><span class="duo">${esc(s.name)} × ${esc(o.name)}</span><span class="ti">${esc(phrase(c.titre))}</span><span class="bar" aria-hidden="true"><span style="width:${c.score}%"></span></span></span><span class="sc">${c.score} %</span></a></li>`;
        }).join('');
        const top = [...compatData[s.slug]].filter((c) => c.with !== s.slug).sort((a, b) => b.score - a.score).slice(0, 3).map((c) => bySlug[c.with].name);
        const autres = signs.filter((x) => x.slug !== s.slug).map((x) => `<li><a href="${x.slug}.html">${IMG.medal(x.slug)}<span>${esc(x.name)}</span></a></li>`).join('');
        const faq = [
            { q: `Quelles sont les dates du signe ${s.name} ?`, a: `Le signe ${s.name} couvre les naissances du ${dateSigne(s)}. C'est un signe de ${s.element} ${s.mode.toLowerCase()}, gouverné par ${s.planete}.` },
            { q: `Avec quels signes le ${s.name} est-il le plus compatible ?`, a: `D'après les lectures de la Maison, le ${s.name} s'accorde le mieux avec ${top[0]}, ${top[1]} et ${top[2]}. Chaque alliance est détaillée sur la page compatibilité du signe.` },
            { q: `Quelle est la pierre du signe ${s.name} ?`, a: `La pierre associée au ${s.name} est ${article(s.pierre)}${s.pierre.toLowerCase()}. Elle se porte sur soi ou se garde à portée de main pour soutenir les forces du signe.` }
        ];
        const titre = `Horoscope ${s.name} du jour`;
        const crumbs = [accueilCrumb, { label: 'Horoscope du jour', href: 'horoscope.html' }, { label: s.name }];
        const main = `
<section class="wrap sign-hero" aria-labelledby="h1">
<div class="media"><img src="./assets/${s.image}" alt="Le ${esc(s.name)}, bas-relief de porcelaine et feuille d'or" width="800" height="1193" fetchpriority="high" decoding="async"></div>
<div class="text">
<p class="eyebrow">Horoscope du jour · ${esc(L.dateLongue(ciel.date))}</p>
<h1 id="h1" class="display">Horoscope <em>${esc(s.name)}</em> du jour</h1>
<p class="meta-caps"><span>${esc(dateSigne(s))}</span><span>Signe de ${esc(s.element)}</span><span>Gouverné par ${esc(s.planete)}</span></p>
<div class="essentiel"><p class="eyebrow">L'essentiel du jour</p><p>${esc(essentiel)}</p></div>
<p class="muted small" style="margin:0">Ciel pris en compte : ${esc(transits.join(' · '))}. Mis à jour à ${L.heure(quand)}.</p>
</div>
</section>
${ongletsSigne(s.slug, 'jour', dispo)}
<section class="section" aria-labelledby="h-lecture"><div class="wrap stack gap-l">
<h2 id="h-lecture" class="h2 center">La lecture du jour</h2>
<div class="lectures">${lectures}</div>
${U.mission(d.mission)}
</div></section>
<section class="section" aria-labelledby="h-bref"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:48px 80px">
<div style="flex:1 1 380px;min-width:0" class="stack gap-m">
<p class="eyebrow">Fiche d'identité</p>
<h2 id="h-bref" class="h2">Le ${esc(s.name)} en bref</h2>
<p style="margin:0;color:var(--encre-2);max-width:30em">${esc(s.presentation)}</p>
<a class="ulink" style="align-self:flex-start" href="signe-${s.slug}.html">Caractère et personnalité ${s.slug === 'gemeaux' || s.slug === 'poissons' ? 'des' : s.slug === 'vierge' || s.slug === 'balance' ? 'de la' : 'du'} ${esc(s.name)}</a>
</div>
<dl class="fiche">
<div><dt>Dates</dt><dd>${esc(dateSigne(s))}</dd></div>
<div><dt>Élément</dt><dd>${esc(s.element)}</dd></div>
<div><dt>Mode</dt><dd>${esc(s.mode)}</dd></div>
<div><dt>Planète maîtresse</dt><dd>${esc(s.planete)}</dd></div>
<div><dt>Pierre</dt><dd><a class="inlink" href="pierres-protectrices.html">${esc(s.pierre)}</a></dd></div>
<div><dt>Partie du corps</dt><dd>${esc(s.corps)}</dd></div>
</dl>
</div></section>
<section class="section" aria-labelledby="h-compat"><div class="wrap stack gap-l">
<div class="head-row"><div class="stack gap-s"><p class="eyebrow">Compatibilités</p><h2 id="h-compat" class="h2">Le ${esc(s.name)} en amour</h2></div>
<div style="display:flex;flex-wrap:wrap;gap:16px 32px"><a class="ulink" href="compatibilite-${s.slug}.html">Toutes les alliances</a><a class="ulink" href="red-flags-${s.slug}.html">Ses red flags</a></div></div>
<ul class="compat">${compat}</ul>
</div></section>
<section class="section" aria-labelledby="h-faq"><div class="wrap-narrow stack gap-l">
<h2 id="h-faq" class="h2 center">Questions sur le ${esc(s.name)}</h2>
${faqHtml(faq)}
</div></section>
<section class="section" aria-labelledby="h-cab"><div class="wrap strip" style="padding-top:72px;padding-bottom:72px">
<div class="l"><img src="./assets/cabinet.webp" alt="" width="640" height="731" loading="lazy"><div class="stack" style="gap:6px"><h2 id="h-cab" class="h2" style="font-size:clamp(28px,2.8vw,38px)">Votre signe n'est qu'un douzième de votre ciel.</h2><p style="margin:0;color:var(--encre-2)">Madeleine lit votre thème complet, ascendant et héritage familial compris. Dès 20 €.</p></div></div>
<a class="btn" href="etude-karmique.html">Le Cabinet privé</a>
</div></section>
<section class="section" aria-labelledby="h-autres"><div class="wrap stack gap-l" style="padding-top:80px;padding-bottom:96px">
<h2 id="h-autres" class="h2 center" style="font-size:clamp(30px,3vw,42px)">L'horoscope des autres signes</h2>
<ul class="signs-grid">${autres}</ul>
</div></section>`;
        write(`${s.slug}.html`, L.page({
            ...ctx, main, crumbs, active: 'horoscope',
            head: {
                title: `${titre}, ${L.dateCourte(ciel.date)} · Horoscope Authentique`,
                description: tronquer(`${titre} : ${essentiel} Amour, travail et bien-être selon le ciel réel du ${L.dateCourte(ciel.date)}.`),
                file: `${s.slug}.html`, ogType: 'article',
                jsonld: [
                    { '@context': 'https://schema.org', '@type': 'Article', headline: titre, description: essentiel, datePublished: quand, dateModified: quand, author: auteur, publisher: editeur, image: L.SITE + 'assets/' + s.image, mainEntityOfPage: L.SITE + s.slug + '.html', inLanguage: 'fr-FR' },
                    L.crumbsSchema(crumbs), faqSchema(faq)
                ]
            }
        }));
    }
    console.log('✅ 12 pages signes');

    // ---------- 6. Hub horoscope ----------
    {
        const liste = signs.map((s) => {
            const d = horo.signes[s.slug];
            return `<li><a href="${s.slug}.html">${IMG.medal(s.slug)}<span><span class="nm">${esc(s.name)}</span><span class="dt">${esc(dateSigne(s))}</span><span class="es">${esc(d.essentiel || premierePhrase(d.amour.texte))}</span></span></a></li>`;
        }).join('');
        const crumbs = [accueilCrumb, { label: 'Horoscope du jour' }];
        const main = `
<section class="wrap stack gap-m" style="padding-top:48px;padding-bottom:64px;align-items:center;text-align:center">
<p class="eyebrow">${esc(L.dateLongue(ciel.date))}</p>
<h1 class="display">Horoscope du jour</h1>
<p class="lede">Le Soleil est en ${esc(ciel.soleil.signe)}, la Lune ${esc(ciel.lune.phase.toLowerCase())} en ${esc(ciel.lune.signe)}. Voici l'essentiel de la journée pour chaque signe ; la lecture complète vous attend sur la page de votre signe.</p>
</section>
${ongletsHub('jour', dispo)}
<section class="section"><div class="wrap" style="padding-top:24px;padding-bottom:96px"><ul class="hub">${liste}</ul></div></section>`;
        write('horoscope.html', L.page({
            ...ctx, main, crumbs, active: 'horoscope',
            head: {
                title: `Horoscope du jour, ${L.dateCourte(ciel.date)} : les 12 signes · Horoscope Authentique`,
                description: tronquer(`Horoscope du jour du ${L.dateCourte(ciel.date)} pour les 12 signes du zodiaque, calculé sur les vraies positions des planètes. Soleil en ${ciel.soleil.signe}, Lune en ${ciel.lune.signe}.`),
                file: 'horoscope.html',
                jsonld: [L.crumbsSchema(crumbs), { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: signs.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: L.SITE + s.slug + '.html', name: `Horoscope ${s.name} du jour` })) }]
            }
        }));
    }

    // ---------- 7. Pages compatibilité & red flags par signe ----------
    const enteteSigne = (s, eyebrow, h1, lede, href, cta) => `
<section class="wrap stack gap-m" style="padding-top:48px;padding-bottom:56px;align-items:center;text-align:center">
<img src="./assets/${s.slug}-carte.webp" alt="" width="320" height="366" style="width:96px;height:auto">
<p class="eyebrow">${eyebrow}</p>
<h1 class="display">${h1}</h1>
<p class="lede">${lede}</p>
<a class="ulink" href="${href}">${cta}</a>
</section>`;
    for (const s of signs) {
        {
            const cartes = compatData[s.slug].map((c) => {
                const o = bySlug[c.with];
                return `<article class="duo-card" id="avec-${o.slug}">
<div class="side">${IMG.medal(o.slug)}<span class="eyebrow" style="color:var(--gris)">${esc(s.name)} &amp; ${esc(o.name)}</span><span class="score">${c.score} %</span><a class="ulink" style="align-self:flex-start;margin-top:6px" href="compatibilite-${SLUGS_ORDRE.indexOf(s.slug) <= SLUGS_ORDRE.indexOf(o.slug) ? s.slug + '-' + o.slug : o.slug + '-' + s.slug}.html">Le couple en détail</a></div>
<div class="main"><h2 class="h3" style="font-size:32px">${esc(phrase(c.titre))}</h2><dl>
<div><dt>Au quotidien</dt><dd>${esc(c.quotidien)}</dd></div>
<div><dt>En amour</dt><dd>${esc(c.amour)}</dd></div>
<div><dt>Dans la durée</dt><dd>${esc(c.duree)}</dd></div>
<div><dt>Ce qui vous rapproche</dt><dd>${esc(c.rapproche)}</dd></div>
<div><dt>Le point épineux</dt><dd>${esc(c.epineux)}</dd></div>
</dl></div></article>`;
            }).join('');
            const top = [...compatData[s.slug]].filter((c) => c.with !== s.slug).sort((a, b) => b.score - a.score).slice(0, 3);
            const faq = [{ q: `Avec quel signe le ${s.name} est-il le plus compatible ?`, a: `Le ${s.name} s'accorde le mieux avec ${top.map((c) => `${bySlug[c.with].name} (${c.score} %)`).join(', ')}.` }];
            const crumbs = [accueilCrumb, { label: 'Compatibilité', href: 'compatibilite-amoureuse.html' }, { label: s.name }];
            const main = enteteSigne(s, 'Compatibilité amoureuse', `Le <em>${esc(s.name)}</em> en amour`, `Avec qui le ${esc(s.name)} s'entend-il vraiment ? Les douze alliances du signe, lues sous cinq angles : le quotidien, le désir, la durée, ce qui rapproche et ce qui coince.`, 'compatibilite-amoureuse.html', 'Tester deux signes') + `
<section class="section"><div class="wrap duos" style="padding-top:0;padding-bottom:64px">${cartes}</div></section>
<section class="section"><div class="wrap-narrow stack gap-l">${faqHtml(faq)}</div></section>
${L.bridge({ eyebrow: 'Le revers de la médaille', title: `Les red flags du ${esc(s.name)}`, text: "L'amour rend aveugle. Les signaux toxiques, eux, ne mentent pas.", href: `red-flags-${s.slug}.html`, cta: 'Voir les red flags' })}`;
            write(`compatibilite-${s.slug}.html`, L.page({
                ...ctx, main, crumbs, active: 'compat',
                head: {
                    title: `Compatibilité amoureuse du ${s.name} avec les 12 signes · Horoscope Authentique`,
                    description: tronquer(`Compatibilité du ${s.name} avec chaque signe : quotidien, amour, durée, points forts et points épineux. Meilleures alliances : ${top.map((c) => bySlug[c.with].name).join(', ')}.`),
                    file: `compatibilite-${s.slug}.html`, ogType: 'article',
                    jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: `Compatibilité amoureuse du ${s.name}`, author: auteur, publisher: editeur, inLanguage: 'fr-FR', mainEntityOfPage: L.SITE + `compatibilite-${s.slug}.html` }, L.crumbsSchema(crumbs), faqSchema(faq)]
                }
            }));
        }
        {
            const cartes = roastData[s.slug].map((c) => {
                const o = bySlug[c.with];
                return `<article class="duo-card" id="avec-${o.slug}">
<div class="side">${IMG.medal(o.slug)}<span class="eyebrow" style="color:var(--gris)">${esc(s.name)} &amp; ${esc(o.name)}</span><span class="score">${esc(String(c.score).replace('%', ' %'))}</span><span class="muted small">Toxicité · ${esc(phrase(c.niveau))}</span></div>
<div class="main"><h2 class="h3" style="font-size:32px">${esc(phrase(c.titre))}</h2>
<p style="margin:0;color:var(--encre-2);font-size:20px;line-height:1.6">${esc(c.resume)}</p>
<dl><div><dt>Le red flag</dt><dd>${esc(c.redflag)}</dd></div></dl></div></article>`;
            }).join('');
            const crumbs = [accueilCrumb, { label: 'Red Flags', href: 'red-flags.html' }, { label: s.name }];
            const main = enteteSigne(s, "L'oracle du chaos", `Les red flags du <em>${esc(s.name)}</em>`, `Pourquoi ça va casser, signe par signe. Les douze couples du ${esc(s.name)}, leur indice de toxicité et le détail qui tue. À lire avec humour.`, 'red-flags.html', 'Lancer le crash test') + `
<section class="section"><div class="wrap duos" style="padding-top:0;padding-bottom:64px">${cartes}</div></section>
${L.bridge({ eyebrow: 'Et pourtant…', title: 'Ces défauts sont-ils rédhibitoires ?', text: "L'amour est un équilibre. Vérifiez si vos astres s'alignent malgré tout.", href: `compatibilite-${s.slug}.html`, cta: `Compatibilité du ${s.name}` })}`;
            write(`red-flags-${s.slug}.html`, L.page({
                ...ctx, main, crumbs, active: 'redflags',
                head: {
                    title: `Red flags du ${s.name} en amour : les 12 couples · Horoscope Authentique`,
                    description: tronquer(`Les red flags du ${s.name} en couple avec chaque signe, avec leur indice de toxicité. L'oracle du chaos, sans filtre et avec humour.`),
                    file: `red-flags-${s.slug}.html`, ogType: 'article',
                    jsonld: [{ '@context': 'https://schema.org', '@type': 'Article', headline: `Les red flags du ${s.name}`, author: auteur, publisher: editeur, inLanguage: 'fr-FR', mainEntityOfPage: L.SITE + `red-flags-${s.slug}.html` }, L.crumbsSchema(crumbs)]
                }
            }));
        }
    }
    console.log('✅ 24 pages compatibilité & red flags');

    // ---------- 8. Articles ----------
    for (const a of articlesPrets) {
        const c = articlesLib.cat(a.categorie);
        const meta = articlesLib.lireMeta(a.slug) || {};
        const { html, toc, minutes } = articlesLib.preparer(articlesLib.lireCorps(a.slug));
        const enBref = meta.enBref;
        const extraBref = a.slug === 'mercure-retrograde' ? mercTexte : '';
        const lies = articlesPrets.filter((x) => x.categorie === a.categorie && x.slug !== a.slug);
        const pos = articlesPrets.indexOf(a);
        const suite = [0, 1, 2].map((k) => lies[(pos + k) % lies.length]).filter((v, i, t) => v && t.indexOf(v) === i);
        const maj = meta.maj || null;
        const crumbs = [accueilCrumb, { label: 'Encyclopédie', href: 'encyclopedie.html' }, { label: c.label, href: 'encyclopedie.html#' + ancre(c.label) }, { label: a.titre }];
        const main = `
<article>
<header class="wrap-narrow article-head">
<p class="eyebrow">${esc(c.label)}</p>
<h1 class="display" style="font-size:clamp(40px,5vw,70px)">${esc(a.titre)}</h1>
<p class="by"><span>Par <a class="inlink" href="apropos.html">Madeleine</a></span>${maj ? `<span>Mis à jour le ${L.dateCourte(maj)}</span>` : ''}<span>${minutes} min de lecture</span></p>
<img src="./assets/${c.image}" alt="" width="640" height="731" fetchpriority="high" decoding="async">
</header>
<div class="article-layout">
${toc.length > 1 ? `<aside class="toc" aria-label="Sommaire"><p class="eyebrow" style="margin-bottom:14px">Sommaire</p><ol>${toc.map((t, i) => `<li><a href="#${t.id}"><span>${i + 1}</span><span>${esc(t.label)}</span></a></li>`).join('')}</ol></aside>` : ''}
<div class="prose">
${enBref || extraBref ? `<section class="enbref" aria-label="En bref"><p class="eyebrow">En bref</p>${enBref ? `<p class="tx">${esc(enBref)}</p>` : ''}${extraBref ? `<p class="muted" style="margin:0;font-size:19px">${esc(extraBref)}</p>` : ''}</section>` : ''}
${html}
<aside class="author" aria-label="L'autrice"><img src="./assets/entree.webp" alt="" width="640" height="731" loading="lazy"><div class="stack" style="gap:4px"><p class="eyebrow">L'autrice</p><p style="margin:0;font-size:27px">Madeleine</p><p style="margin:0;font-size:18px;color:var(--encre-2)">Voix de la Maison Authentique, spécialisée en astrologie karmique et transgénérationnelle. Elle reçoit au <a class="inlink" href="etude-karmique.html">Cabinet privé</a>.</p></div></aside>
</div>
</div>
</article>
${suite.length ? `<section class="section" aria-labelledby="h-suite"><div class="wrap stack gap-l"><h2 id="h-suite" class="h2 center">Poursuivre la lecture</h2><div class="related">${suite.map((x) => `<a href="${x.slug}.html">${IMG.obj(articlesLib.cat(x.categorie).image)}<span class="eyebrow">${esc(articlesLib.cat(x.categorie).label)}</span><span class="t">${esc(x.titre)}</span></a>`).join('')}</div></div></section>` : ''}`;
        const desc = enBref || a.sujet;
        write(`${a.slug}.html`, L.page({
            ...ctx, main, crumbs, active: 'encyclo', compact: true,
            head: {
                title: `${a.titre} · Horoscope Authentique`,
                description: tronquer(desc),
                file: `${a.slug}.html`, ogType: 'article', ogImage: c.image,
                jsonld: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.titre, description: tronquer(desc, 300), image: L.SITE + 'assets/' + c.image, author: auteur, publisher: editeur, ...(maj ? { dateModified: maj } : {}), inLanguage: 'fr-FR', mainEntityOfPage: L.SITE + a.slug + '.html', articleSection: c.label }, L.crumbsSchema(crumbs)]
            }
        }));
    }
    console.log(`✅ ${articlesPrets.length} articles (${articles.length - articlesPrets.length} en attente de rédaction)`);

    // ---------- 9. Encyclopédie ----------
    {
        const parCat = {};
        for (const a of articlesPrets) (parCat[a.categorie] = parCat[a.categorie] || []).push(a);
        const blocs = Object.keys(parCat).sort((x, y) => articlesLib.cat(x).priorite - articlesLib.cat(y).priorite).map((k) => {
            const c = articlesLib.cat(k);
            return `<div class="cat-block stack gap-l" id="${ancre(c.label)}"><h2 class="h2">${esc(c.label)}</h2><div class="alist">${parCat[k].map((a) => `<a class="aitem" href="${a.slug}.html"><img src="./assets/${c.image}" alt="" width="640" height="731" loading="lazy"><span><span class="t">${esc(a.titre)}</span><span class="m">${esc(tronquer((articlesLib.lireMeta(a.slug) || {}).enBref || a.sujet, 110))}</span></span></a>`).join('')}</div></div>`;
        }).join('');
        const crumbs = [accueilCrumb, { label: 'Encyclopédie' }];
        const main = `
<section class="wrap stack gap-m" style="padding-top:48px;padding-bottom:56px;align-items:center;text-align:center">
<img src="./assets/livre.webp" alt="" width="640" height="731" style="width:150px;height:auto">
<p class="eyebrow">La Bibliothèque de la Maison</p>
<h1 class="display">L'Encyclopédie</h1>
<p class="lede">Les notions qui vont plus loin que le signe solaire : planètes et transits, astronomie, rituels, lithothérapie. ${articlesPrets.length} articles signés Madeleine.</p>
</section>
<section class="section"><div class="wrap" style="padding-top:72px;padding-bottom:100px">${blocs}</div></section>`;
        write('encyclopedie.html', L.page({
            ...ctx, main, crumbs, active: 'encyclo',
            head: {
                title: "Encyclopédie de l'astrologie : planètes, rituels, pierres · Horoscope Authentique",
                description: "Ascendant, Lilith, maisons astrologiques, Mercure rétrograde, nébuleuses, lithothérapie : l'encyclopédie de la Maison Authentique, signée Madeleine.",
                file: 'encyclopedie.html', jsonld: [L.crumbsSchema(crumbs)]
            }
        }));
    }

    // ---------- 9 bis. Les nouvelles rubriques ----------
    const cctx = { ciel, signs, bySlug, compatData, roastData, jour: horo, demain: horoDemain, semaine: horoSemaine, mois: horoMois, genere: quand, articles: articlesPrets };
    const nouvelles = [C.periodes(cctx), C.theme(cctx), C.lune(cctx), C.paires(cctx), C.fiches(cctx), C.chinois(cctx), C.numerologie(cctx)].flatMap((r) => r.urls);
    console.log(`✅ ${nouvelles.length} pages des nouvelles rubriques`);
    nouvelles.push(...P.widget(cctx));
    P.pourLesMoteurs(cctx);

    // ---------- 10. Pages historiques, habillées du nouveau gabarit ----------
    const historiques = {
        'apropos.html': { active: null, label: 'Madeleine' },
        'signification.html': { active: 'encyclo', label: 'Signification des signes' },
        'comprendre-astrologie.html': { active: 'encyclo', label: 'Les quatre éléments' },
        'pierres-protectrices.html': { active: 'litho', label: 'Lithothérapie' },
        'le-cosmos.html': { active: 'encyclo', label: 'Astronomie & cosmos' },
        'compatibilite-amoureuse.html': { active: 'compat', label: 'Compatibilité amoureuse' },
        'red-flags.html': { active: 'redflags', label: 'Red Flags' },
        'etude-karmique.html': { active: 'cabinet', label: 'Cabinet privé' },
        'verite-horoscope-mensonge.html': { active: null, label: 'Le manifeste' },
        'mentions-legales.html': { active: null, label: 'Mentions légales' }
    };
    const versHoroscope = L.bridge({ eyebrow: 'Assez de théorie', title: "Que vous réservent les astres aujourd'hui ?", href: 'horoscope.html', cta: 'Lire mon horoscope' });
    const grille = (prefix, titre) => `<section class="section"><div class="wrap stack gap-l"><h2 class="h2 center">${titre}</h2><ul class="signs-grid">${signs.map((x) => `<li><a href="${prefix}${x.slug}.html">${IMG.medal(x.slug)}<span>${esc(x.name)}</span></a></li>`).join('')}</ul></div></section>`;
    const passerelles = {
        'red-flags.html': grille('red-flags-', 'Les red flags de chaque signe') + L.bridge({ eyebrow: 'Et pourtant…', title: 'Ces défauts sont-ils rédhibitoires ?', text: "L'amour est un équilibre. Vérifiez si vos astres s'alignent malgré tout.", href: 'compatibilite-amoureuse.html', cta: 'Tester la compatibilité' }),
        'compatibilite-amoureuse.html': grille('compatibilite-', 'La compatibilité de chaque signe') + L.bridge({ eyebrow: "L'amour rend aveugle", title: 'Avez-vous repéré les signaux toxiques ?', text: "La compatibilité n'est pas tout.", href: 'red-flags.html', cta: 'Voir les red flags' }),
        'signification.html': grille('', "L'horoscope du jour de chaque signe"),
        'comprendre-astrologie.html': versHoroscope,
        'pierres-protectrices.html': versHoroscope,
        'le-cosmos.html': versHoroscope,
        'verite-horoscope-mensonge.html': ''
    };

    for (const [file, conf] of Object.entries(historiques)) {
        if (!fs.existsSync(file)) { console.warn('⚠️ Page source absente :', file); continue; }
        const src = fs.readFileSync(file, 'utf-8');
        const headSrc = src.slice(0, src.indexOf('</head>'));
        const title = ((headSrc.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || conf.label).replace(/Maison Authentique$/, 'Horoscope Authentique');
        const desc = (headSrc.match(/<meta name="description" content="([^"]*)"/) || [])[1];
        const robots = (headSrc.match(/<meta name="robots" content="([^"]*)"/) || [])[1];
        const styles = (headSrc.match(/<style>[\s\S]*?<\/style>/g) || []).join('\n');
        const lds = (headSrc.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g) || []).join('\n');
        const bodyTag = (src.match(/<body([^>]*)>/) || [, ''])[1];
        const bodyClass = ((bodyTag.match(/class="([^"]*)"/) || [, ''])[1]).replace(/\bmin-h-screen\b|\bbg-\[#FAFAFA\]/g, '').trim();
        let body = src.slice(src.indexOf('>', src.indexOf('<body')) + 1, src.lastIndexOf('</body>'));
        body = body.replace(/<!-- Google tag[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/g, '')
            .replace(/<header[\s\S]*?<\/header>/, '')
            .replace(/<footer[\s\S]*?<\/footer>/g, '');
        const extraLd = file === 'etude-karmique.html'
            ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Service', name: 'Étude Céleste & Héritage', serviceType: 'Consultation astrologique écrite', provider: auteur, areaServed: 'FR', offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: '20', highPrice: '80', offerCount: 3 } })}</script>`
            : '';
        const crumbs = [accueilCrumb, { label: conf.label }];
        const main = `<div class="legacy ${esc(bodyClass)}">${body}</div>${passerelles[file] || ''}`;
        write(file, L.page({
            ...ctx, main, crumbs, active: conf.active,
            head: { title, description: desc, robots, file, jsonld: [L.crumbsSchema(crumbs)], extra: [styles, lds, extraLd].filter(Boolean).join('\n') }
        }));
    }
    if (fs.existsSync('./links.html')) fs.copyFileSync('./links.html', path.join(OUT, 'links.html'));
    fs.copyFileSync('./vercel.json', path.join(OUT, 'vercel.json')); // en-têtes de sécurité (si Vercel sert le dossier public)
    console.log('✅ Pages historiques habillées');

    // ---------- 11. Page 404 ----------
    write('404.html', L.page({
        ...ctx, crumbs: null,
        main: `<section class="wrap-narrow stack gap-m center" style="align-items:center;padding-top:72px;padding-bottom:120px"><img src="./assets/lune-1.webp" alt="" width="240" height="274" style="width:110px;height:auto"><p class="eyebrow">Erreur 404</p><h1 class="display">Cette page s'est perdue dans le ciel.</h1><p class="lede">Elle a peut-être changé d'adresse. Le cadran des signes, lui, est toujours là.</p><a class="btn" href="./">Retour à l'accueil</a></section>`,
        head: { title: 'Page introuvable · Horoscope Authentique', file: '404.html', robots: 'noindex' }
    }));

    // ---------- 11. Aperçus de partage et épingles Pinterest (images générées) ----------
    await P.apercus(cctx);
    await P.pinterest(cctx);

    // ---------- 11 bis. Filet de sécurité : aucun lien vers une page absente ----------
    // (ex. « Horoscope de demain » une nuit où Gemini n'a pas répondu)
    const existe = (h) => fs.existsSync(path.join(OUT, h));
    let retires = 0;
    for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith('.html'))) {
        const src = fs.readFileSync(path.join(OUT, f), 'utf-8');
        const net = src
            .replace(/<li><a href="([a-z0-9-]+\.html)"[^>]*>[^<]*<\/a><\/li>/g, (m, h) => (existe(h) ? m : (retires++, '')))
            .replace(/<a ([^>]*?)href="([a-z0-9-]+\.html)"([^>]*)>([\s\S]*?)<\/a>/g, (m, a, h, b, t) => (existe(h) ? m : (retires++, `<span>${t}</span>`)));
        if (net !== src) fs.writeFileSync(path.join(OUT, f), net);
    }
    if (retires) console.log(`⚠️  ${retires} lien(s) vers des pages absentes neutralisé(s)`);

    // ---------- 12. Sitemap & robots.txt ----------
    const jour = L.isoJour(quand);
    const urls = [
        ['', 'daily', '1.0', jour], ['horoscope.html', 'daily', '0.9', jour],
        ...signs.map((s) => [`${s.slug}.html`, 'daily', '0.9', jour]),
        ['encyclopedie.html', 'weekly', '0.7'],
        ...signs.flatMap((s) => [[`compatibilite-${s.slug}.html`, 'monthly', '0.7'], [`red-flags-${s.slug}.html`, 'monthly', '0.6']]),
        ...Object.keys(historiques).filter((f) => f !== 'mentions-legales.html').map((f) => [f, 'monthly', '0.6']),
        ...articlesPrets.map((a) => { const m = articlesLib.lireMeta(a.slug) || {}; return [`${a.slug}.html`, 'monthly', '0.6', m.maj ? L.isoJour(m.maj) : null]; }),
        ...nouvelles.map(([u, f, p]) => [u, f, p, f === 'daily' ? jour : null])
    ];
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, f, p, lm]) => `  <url><loc>${L.SITE}${u}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}<changefreq>${f}</changefreq><priority>${p}</priority></url>`).join('\n')}\n</urlset>\n`);
    write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${L.SITE}sitemap.xml\n`);
    console.log(`✅ Sitemap : ${urls.length} adresses`);
    console.log('✅ FIN');
}

main().catch((e) => { console.error('❌', e); process.exit(1); });

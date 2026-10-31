// Rubriques « Heures miroirs », « Nombres angéliques » et « Tarot gratuit ».
// Textes rédigés par la Maison (content/*.json), aucune génération automatique.
const fs = require('fs');
const path = require('path');
const L = require('./layout');
const { esc } = L;
const U = require('./ui');
const { write, faqHtml, faqSchema, tronquer } = U;

const lire = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', f), 'utf-8'));
const HM = lire('heures-miroirs.json');
const NA = lire('nombres-angeliques.json');
const TA = lire('tarot.json');
const accueil = { label: 'Accueil', href: './' };
// Visuels porcelaine fournis par la Maison (largeur, hauteur) ; à défaut, le site dessine la carte en CSS
const DIMS = lire('visuels-dims.json');
const img = (fichier, alt, { lazy = true, cls = 'carte-photo' } = {}) => {
    const d = DIMS[fichier];
    return d ? `<img class="${cls}" src="./assets/${fichier}" alt="${esc(alt)}" width="${d[0]}" height="${d[1]}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">` : null;
};

// Réduction numérologique (garde 11 et 22)
const reduire = (n) => { while (n > 9 && n !== 11 && n !== 22) n = String(n).split('').reduce((s, c) => s + +c, 0); return n; };
const slugHeure = (h) => `heure-miroir-${h.h}`; // heure-miroir-11h11
const affiche = (h) => h.h.replace('h', ':'); // 11:11

// Tuile « porcelaine » dessinée en CSS : chiffres dorés et leur reflet
const tuile = (txt, petit = false) => `<span class="tuile-miroir${petit ? ' petite' : ''}" aria-hidden="true"><span class="tm-haut">${esc(txt)}</span><span class="tm-ligne"></span><span class="tm-bas">${esc(txt)}</span></span>`;
const VISUEL_HEURE = { '11h11': ['miroir-1111.webp', 720, 969], '22h22': ['miroir-2222.webp', 720, 1006] };
const visuelHeure = (h, lazy = false) => VISUEL_HEURE[h.h]
    ? `<img class="carte-photo" src="./assets/${VISUEL_HEURE[h.h][0]}" alt="Carte en porcelaine et or de l'heure miroir ${esc(affiche(h))}" width="${VISUEL_HEURE[h.h][1]}" height="${VISUEL_HEURE[h.h][2]}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}>`
    : `<span class="carte-css">${tuile(affiche(h))}</span>`;
const medaille = (n, lazy = false) => img(`ange-${n}.webp`, `Médaillon en porcelaine et or du nombre angélique ${n}`, { lazy })
    || `<span class="carte-css medaillon-css"><span class="mc-ailes" aria-hidden="true"></span><span class="mc-n">${esc(n)}</span></span>`;

function heroSplit({ eyebrow, h1, lede, visuel, actions = '' }) {
    return `<section class="wrap split esot-hero">
<div class="split-text"><p class="eyebrow">${eyebrow}</p><h1 class="display">${h1}</h1><p class="lede">${lede}</p>${actions}</div>
<div class="split-media">${visuel}</div>
</section>`;
}
const lectures = (items) => `<div class="lectures">${items.map(([lb, n, titre, txt]) => `<article class="lecture"><p class="lb"><span>${lb}</span><span aria-hidden="true">${n}</span></p>${titre ? `<h2 class="h3">${esc(titre)}</h2>` : ''}<p class="tx">${esc(txt)}</p></article>`).join('')}</div>`;
const conseil = (eyebrow, txt) => `<div class="mission"><p class="eyebrow">${eyebrow}</p><p class="mission-tx">${esc(txt)}</p></div>`;

// ---------------------------------------------------------------------
// Heures miroirs
// ---------------------------------------------------------------------
function heuresMiroirs(ctx) {
    const urls = [];
    const grille = (actif) => `<ul class="grille-heures">${HM.heures.map((h) => `<li><a href="${slugHeure(h)}.html"${h.h === actif ? ' aria-current="page"' : ''}>${tuile(affiche(h), true)}<span class="gh-t">${esc(h.theme)}</span></a></li>`).join('')}</ul>`;

    HM.heures.forEach((h, i) => {
        const file = `${slugHeure(h)}.html`;
        const nombre = +h.h.slice(0, 2);
        const red = reduire(nombre);
        const prec = HM.heures[(i + 23) % 24], suiv = HM.heures[(i + 1) % 24];
        const crumbs = [accueil, { label: 'Heures miroirs', href: 'heures-miroirs.html' }, { label: h.h }];
        const faq = [
            { q: `Que signifie ${h.h} en amour ?`, a: h.amour },
            { q: `Que signifie ${h.h} pour le travail et l'argent ?`, a: h.travail },
            { q: `Quel est le message spirituel de ${h.h} ?`, a: h.spirituel },
            { q: `Que faire quand on voit souvent ${h.h} ?`, a: `${h.conseil} Notez aussi ce que vous pensiez au moment où vous l'avez vue : c'est souvent là que se trouve le vrai message.` }
        ];
        const numero = nombre === 0 ? 'Le 0 ne se réduit pas : il évoque le potentiel infini, le cercle complet.'
            : nombre < 10 ? `Le ${nombre} est l'un des neuf chiffres de base de la numérologie.`
                : (red === nombre ? `Le ${nombre} est un nombre maître : il ne se réduit pas.` : `En numérologie, ${nombre} se réduit en ${String(nombre).split('').join(' + ')} = ${red}${red !== reduire(red) ? '' : ''}.`);
        write(file, L.page({
            ...ctx, crumbs, active: 'miroir',
            main: `${heroSplit({ eyebrow: `Heure miroir · ${esc(h.theme)}`, h1: `${esc(h.h)} : <em>${esc(h.theme.charAt(0).toLowerCase() + h.theme.slice(1))}</em>`, lede: esc(h.message), visuel: visuelHeure(h) })}
<section class="section"><div class="wrap stack gap-l">
${lectures([['Amour', 'I', `${h.h} en amour`, h.amour], ['Travail', 'II', `${h.h} au travail`, h.travail], ['Spiritualité', 'III', `Le message spirituel`, h.spirituel]])}
${conseil(`Le conseil de Madeleine pour ${h.h}`, h.conseil)}
<p class="muted center" style="margin:0 auto;max-width:42em;font-size:18px">${esc(numero)} Les heures miroirs sont une lecture symbolique : elles invitent à la réflexion, sans rien prédire.</p>
</div></section>
<nav class="wrap lune-nav" aria-label="Heures voisines"><a class="ulink" href="${slugHeure(prec)}.html">← ${esc(prec.h)}</a><a class="ulink" href="heures-miroirs.html">Toutes les heures miroirs</a><a class="ulink" href="${slugHeure(suiv)}.html">${esc(suiv.h)} →</a></nav>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions sur ${esc(h.h)}</h2>${faqHtml(faq)}</div></section>
<section class="section"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 class="h2 center">Les autres heures miroirs</h2>${grille(h.h)}</div></section>`,
            head: {
                title: `${h.h} : signification de l'heure miroir en amour et au travail · Horoscope Authentique`,
                description: tronquer(`${h.h} heure miroir : ${h.theme.toLowerCase()}. ${h.message}`),
                file, ogType: 'article', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)]
            }
        }));
        urls.push([file, 'monthly', h.h === '11h11' || h.h === '22h22' ? '0.8' : '0.6']);
    });

    {
        const crumbs = [accueil, { label: 'Heures miroirs' }];
        const faq = [
            { q: "Qu'est-ce qu'une heure miroir ?", a: HM.intro },
            { q: 'Pourquoi voit-on souvent des heures miroirs ?', a: HM.pourquoi },
            { q: "Quelle est l'heure miroir la plus recherchée ?", a: "En France, 11h11 et 22h22 sont les plus recherchées, suivies notamment de 21h21 et 17h17. 11h11 et 22h22 portent les nombres maîtres 11 et 22, ce qui explique leur aura particulière en numérologie." },
            { q: 'Les heures miroirs prédisent-elles quelque chose ?', a: "Non. La Maison les lit comme une invitation à faire une pause et à observer ses pensées du moment. Ce sont des repères symboliques, pas des prédictions." }
        ];
        write('heures-miroirs.html', L.page({
            ...ctx, crumbs, active: 'miroir',
            main: `${heroSplit({ eyebrow: 'Heures miroirs', h1: 'Heures miroirs : <em>la signification</em> de chaque heure', lede: esc(HM.intro), visuel: `<img class="carte-photo" src="./assets/miroir-1111.webp" alt="Carte en porcelaine et or de l'heure miroir 11:11, soleil et lune en miroir" width="720" height="969" fetchpriority="high">`, actions: `<div class="hero-actions"><a class="btn" href="heure-miroir-11h11.html">Lire 11h11</a><a class="ulink" href="nombres-angeliques.html">Les nombres angéliques</a></div>` })}
<section class="section" aria-labelledby="h-toutes"><div class="wrap stack gap-l"><div class="stack gap-s center" style="align-items:center"><p class="eyebrow">De 00h00 à 23h23</p><h2 id="h-toutes" class="h2">Toutes les heures miroirs</h2></div>${grille(null)}</div></section>
<section class="section"><div class="wrap split" style="padding-top:88px;padding-bottom:88px">
<div class="split-media"><img class="carte-photo" src="./assets/miroir-2222.webp" alt="Carte en porcelaine de l'heure miroir 22:22, deux anges en miroir" width="720" height="1006" loading="lazy"></div>
<div class="split-text"><p class="eyebrow">Synchronicité</p><h2 class="h2">Pourquoi voit-on <em>des heures miroirs</em> ?</h2><p style="margin:0;color:var(--encre-2)">${esc(HM.pourquoi)}</p><a class="ulink" href="heure-miroir-22h22.html">Lire 22h22, l'heure du bâtisseur</a></div>
</div></section>
<section class="section"><div class="wrap split" style="padding-top:88px;padding-bottom:88px">
<div class="split-text"><p class="eyebrow">111 · 222 · 333…</p><h2 class="h2">Les <em>nombres angéliques</em></h2><p style="margin:0;color:var(--encre-2)">${esc(NA.intro)}</p><ul class="grille-nombres">${NA.nombres.map((x) => `<li><a href="nombre-angelique-${x.n}.html"><span class="gn-n">${esc(x.n)}</span><span class="gn-t">${esc(x.theme)}</span></a></li>`).join('')}</ul></div>
<div class="split-media"><img class="carte-photo" src="./assets/ange-444.webp" alt="Médaillon en porcelaine du nombre angélique 444" width="720" height="963" loading="lazy"></div>
</div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions fréquentes</h2>${faqHtml(faq)}</div></section>`,
            head: { title: 'Heures miroirs : signification de toutes les heures (11h11, 22h22…) · Horoscope Authentique', description: tronquer("Signification des 24 heures miroirs, de 00h00 à 23h23 : message, amour, travail et spiritualité. 11h11, 22h22, 21h21, 17h17… lues par la Maison Authentique."), file: 'heures-miroirs.html', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push(['heures-miroirs.html', 'monthly', '0.9']);
    }
    return { urls };
}

// ---------------------------------------------------------------------
// Nombres angéliques
// ---------------------------------------------------------------------
function nombresAngeliques(ctx) {
    const urls = [];
    const grille = (actif) => `<ul class="grille-nombres large">${NA.nombres.map((x) => `<li><a href="nombre-angelique-${x.n}.html"${x.n === actif ? ' aria-current="page"' : ''}>${img(`ange-${x.n}-mini.webp`, '', { cls: 'gn-img' }) || ''}<span class="gn-n">${esc(x.n)}</span><span class="gn-t">${esc(x.theme)}</span></a></li>`).join('')}</ul>`;
    for (const x of NA.nombres) {
        const file = `nombre-angelique-${x.n}.html`;
        const crumbs = [accueil, { label: 'Nombres angéliques', href: 'nombres-angeliques.html' }, { label: x.n }];
        const faq = [
            { q: `Que signifie ${x.n} en amour ?`, a: x.amour },
            { q: `Que signifie ${x.n} au travail ?`, a: x.travail },
            { q: `Que faire quand on voit ${x.n} partout ?`, a: `${x.conseil} Observez à quoi vous pensiez à ce moment-là : c'est la clé de lecture la plus personnelle.` }
        ];
        write(file, L.page({
            ...ctx, crumbs, active: 'miroir',
            main: `${heroSplit({ eyebrow: `Nombre angélique · ${esc(x.theme)}`, h1: `${esc(x.n)} : <em>${esc(x.theme.charAt(0).toLowerCase() + x.theme.slice(1))}</em>`, lede: esc(x.message), visuel: medaille(x.n) })}
<section class="section"><div class="wrap stack gap-l">
${lectures([['Amour', 'I', `${x.n} en amour`, x.amour], ['Travail', 'II', `${x.n} au travail`, x.travail]])}
${conseil(`Le conseil de Madeleine pour ${x.n}`, x.conseil)}
</div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions sur ${esc(x.n)}</h2>${faqHtml(faq)}</div></section>
<section class="section"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 class="h2 center">Les autres nombres angéliques</h2>${grille(x.n)}<p class="center" style="margin:0"><a class="ulink" href="heures-miroirs.html">Voir aussi les heures miroirs</a></p></div></section>`,
            head: { title: `${x.n} : signification du nombre angélique en amour et au travail · Horoscope Authentique`, description: tronquer(`Nombre angélique ${x.n} : ${x.theme.toLowerCase()}. ${x.message}`), file, ogType: 'article', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push([file, 'monthly', '0.6']);
    }
    {
        const crumbs = [accueil, { label: 'Nombres angéliques' }];
        write('nombres-angeliques.html', L.page({
            ...ctx, crumbs, active: 'miroir',
            main: `${heroSplit({ eyebrow: 'Nombres angéliques', h1: 'Nombres angéliques : <em>111, 222… 999</em>', lede: esc(NA.intro), visuel: medaille('444') })}
<section class="section"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 class="h2 center">Choisissez votre nombre</h2>${grille(null)}<p class="center" style="margin:0"><a class="ulink" href="heures-miroirs.html">Voir aussi les heures miroirs</a></p></div></section>`,
            head: { title: 'Nombres angéliques : signification de 111, 222, 333 à 999 · Horoscope Authentique', description: tronquer('Signification des nombres angéliques 111, 222, 333, 444, 555, 666, 777, 888 et 999 : message, amour, travail et conseil.'), file: 'nombres-angeliques.html', jsonld: [L.crumbsSchema(crumbs)] }
        }));
        urls.push(['nombres-angeliques.html', 'monthly', '0.8']);
    }
    return { urls };
}

// ---------------------------------------------------------------------
// Tarot gratuit
// ---------------------------------------------------------------------
const carteFace = (a, petite = false) => (petite ? img(`arcane-${a.slug}-mini.webp`, '', { cls: 'carte-img' }) : null) || `<span class="carte-tarot${petite ? ' petite' : ''}" aria-hidden="true"><span class="ct-num">${esc(a.romain || '')}</span><span class="ct-sym"></span><span class="ct-nom">${esc(a.nom)}</span></span>`;

function tarot(ctx) {
    const urls = [];
    const grille = (actif) => `<ul class="grille-arcanes">${TA.arcanes.map((a) => `<li><a href="arcane-${a.slug}.html"${a.slug === actif ? ' aria-current="page"' : ''}>${carteFace(a, true)}<span class="ga-k">${esc(a.motsCles)}</span></a></li>`).join('')}</ul>`;
    TA.arcanes.forEach((a, i) => {
        const file = `arcane-${a.slug}.html`;
        const crumbs = [accueil, { label: 'Tarot', href: 'tirage-tarot-gratuit.html' }, { label: a.nom }];
        const on = { oui: 'plutôt un oui', non: 'plutôt un non', 'peut-être': 'une réponse nuancée, à préciser' }[a.ouiNon];
        const faq = [
            { q: `Que signifie ${a.nom} en amour ?`, a: a.amour },
            { q: `Que signifie ${a.nom} au travail ?`, a: a.travail },
            { q: `${a.nom} est-il un oui ou un non ?`, a: `Dans un tirage oui ou non, ${a.nom} est traditionnellement ${on}. Le sens dépend toujours de la question posée et des cartes voisines.` }
        ];
        const prec = TA.arcanes[(i + 21) % 22], suiv = TA.arcanes[(i + 1) % 22];
        write(file, L.page({
            ...ctx, crumbs, active: 'tarot',
            main: `${heroSplit({ eyebrow: `Arcane majeur${a.romain ? ' ' + a.romain : ''} · ${esc(a.motsCles)}`, h1: `${esc(a.nom)} : <em>signification</em> dans le tarot`, lede: esc(a.sens), visuel: img(`arcane-${a.slug}.webp`, `Carte de tarot en porcelaine et or : ${a.nom}`, { lazy: false }) || `<span class="carte-css">${carteFace(a)}</span>`, actions: `<div class="hero-actions"><a class="btn" href="tirage-tarot-gratuit.html">Faire un tirage gratuit</a></div>` })}
<section class="section"><div class="wrap stack gap-l">
${lectures([['Amour', 'I', `${a.nom} en amour`, a.amour], ['Travail', 'II', `${a.nom} au travail`, a.travail], ['Oui ou non', 'III', 'Dans un tirage oui ou non', `${a.nom} est ${on}.`]])}
${conseil(`Le conseil de ${a.nom}`, a.conseil)}
</div></section>
<nav class="wrap lune-nav" aria-label="Arcanes voisins"><a class="ulink" href="arcane-${prec.slug}.html">← ${esc(prec.nom)}</a><a class="ulink" href="tirage-tarot-gratuit.html">Tirage gratuit</a><a class="ulink" href="arcane-${suiv.slug}.html">${esc(suiv.nom)} →</a></nav>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions sur ${esc(a.nom)}</h2>${faqHtml(faq)}</div></section>
<section class="section"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 class="h2 center">Les 22 arcanes majeurs</h2>${grille(a.slug)}</div></section>`,
            head: { title: `${a.nom} tarot : signification en amour, travail, oui ou non · Horoscope Authentique`, description: tronquer(`${a.nom} (arcane ${a.romain || '0'}) dans le Tarot de Marseille : ${a.motsCles}. ${a.sens}`), file, ogType: 'article', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq)] }
        }));
        urls.push([file, 'monthly', '0.6']);
    });

    {
        const crumbs = [accueil, { label: 'Tirage du tarot gratuit' }];
        const faq = [
            { q: 'Le tirage du tarot est-il vraiment gratuit ?', a: 'Oui, entièrement, sans inscription et sans limite. Le tirage se fait dans votre navigateur : vos questions ne sont envoyées nulle part.' },
            { q: 'Comment fonctionne le tirage oui ou non ?', a: "Concentrez-vous sur une question fermée, puis choisissez une carte parmi les sept présentées face cachée. Chaque arcane majeur penche traditionnellement vers le oui, le non ou une réponse nuancée." },
            { q: 'Que signifie le tirage passé, présent, futur ?', a: "Vous choisissez trois cartes : la première éclaire ce qui a mené à la situation, la deuxième ce qui se joue maintenant, la troisième la tendance si rien ne change. C'est une piste de réflexion, pas une certitude." },
            { q: 'Combien y a-t-il de cartes dans le Tarot de Marseille ?', a: TA.intro }
        ];
        const donnees = JSON.stringify(TA.arcanes.map((a) => ({ n: a.nom, r: a.romain, s: a.slug, k: a.motsCles, sens: a.sens, amour: a.amour, travail: a.travail, conseil: a.conseil, on: a.ouiNon, img: DIMS[`arcane-${a.slug}-mini.webp`] ? `arcane-${a.slug}-mini.webp` : null })));
        write('tirage-tarot-gratuit.html', L.page({
            ...ctx, crumbs, active: 'tarot',
            after: `<script src="./assets/js/tarot.js?v=${require('crypto').createHash('md5').update(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'tarot.js'))).digest('hex').slice(0, 8)}" defer></script>`,
            main: `${heroSplit({ eyebrow: 'Tarot gratuit', h1: 'Tirage du tarot <em>gratuit</em>', lede: esc(TA.intro), visuel: `<img class="carte-photo" src="./assets/tarot-dos.webp" alt="Dos de carte de tarot en porcelaine blanche, soleil et lunes dorés, pierre de lune" width="720" height="1047" fetchpriority="high">`, actions: `<div class="hero-actions"><a class="btn" href="#tirage">Tirer les cartes</a><a class="ulink" href="#arcanes">Les 22 arcanes</a></div>` })}
<section class="section" id="tirage" aria-labelledby="h-tirage"><div class="wrap stack gap-l tirage" data-tarot>
<div class="stack gap-s center" style="align-items:center"><p class="eyebrow">Choisissez votre tirage</p><h2 id="h-tirage" class="h2">Concentrez-vous sur votre question</h2></div>
<div class="tirage-modes" role="tablist"><button type="button" class="tm-mode" data-mode="1" aria-pressed="true">Oui ou non · 1 carte</button><button type="button" class="tm-mode" data-mode="3" aria-pressed="false">Passé, présent, futur · 3 cartes</button></div>
<p class="tirage-consigne center muted">Choisissez <strong class="tc-n">1 carte</strong> parmi les sept.</p>
<div class="tirage-jeu" aria-live="polite"></div>
<div class="tirage-resultat" aria-live="polite"></div>
<p class="center"><button type="button" class="btn tirage-reset">Battre les cartes</button></p>
<script type="application/json" class="tarot-donnees">${donnees}</script>
</div></section>
<section class="section" id="arcanes" aria-labelledby="h-arcanes"><div class="wrap stack gap-l" style="padding-top:72px;padding-bottom:88px"><h2 id="h-arcanes" class="h2 center">Les 22 arcanes majeurs</h2>${grille(null)}</div></section>
<section class="section"><div class="wrap-narrow stack gap-l"><h2 class="h2 center">Questions fréquentes</h2>${faqHtml(faq)}</div></section>`,
            head: { title: 'Tirage du tarot gratuit : oui ou non et passé, présent, futur · Horoscope Authentique', description: tronquer('Tirage du tarot gratuit et sans inscription avec les 22 arcanes majeurs du Tarot de Marseille : tirage oui ou non en une carte, tirage passé, présent, futur en trois cartes.'), file: 'tirage-tarot-gratuit.html', jsonld: [L.crumbsSchema(crumbs), faqSchema(faq), { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Tirage du tarot gratuit', url: L.SITE + 'tirage-tarot-gratuit.html', applicationCategory: 'LifestyleApplication', operatingSystem: 'Tous', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } }] }
        }));
        urls.push(['tirage-tarot-gratuit.html', 'monthly', '0.9']);
    }
    return { urls };
}

module.exports = { heuresMiroirs, nombresAngeliques, tarot, HM, NA, TA };

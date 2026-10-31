// Gabarit commun à toutes les pages : <head> SEO complet, bandeau du ciel, en-tête, pied de page.
const SITE = 'https://www.horoscope-authentique.fr/';
const GA_ID = 'G-0FP733JKXH';

const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const canonicalUrl = (file) => (file === 'index.html' ? SITE : SITE + file);

const SIGN_IDX = ['belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge', 'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'];

// Date en français, fuseau de Paris
function dateLongue(d) {
    const s = new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function dateCourte(d) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
}
function heure(d) {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
}
const isoJour = (d) => new Date(d).toISOString().split('T')[0];

const NAV = [
    { href: 'horoscope.html', label: 'Horoscope', key: 'horoscope' },
    { href: 'theme-astral.html', label: 'Thème astral', key: 'theme' },
    { href: 'compatibilite-amoureuse.html', label: 'Compatibilité', key: 'compat' },
    { href: 'calendrier-lunaire.html', label: 'Lune', key: 'lune' },
    { href: 'tirage-tarot-gratuit.html', label: 'Tarot', key: 'tarot' },
    { href: 'heures-miroirs.html', label: 'Heures miroirs', key: 'miroir' },
    { href: 'encyclopedie.html', label: 'Encyclopédie', key: 'encyclo' },
    { href: 'etude-karmique.html', label: 'Cabinet privé', key: 'cabinet', accent: true }
];

function cielBar(ciel) {
    if (!ciel) return '';
    return `<div class="ciel-bar"><div class="wrap">
<span>${esc(dateLongue(ciel.date))}</span>
<span>Soleil en ${esc(ciel.soleil.signe)} · Lune ${esc(ciel.lune.phase.toLowerCase())} en ${esc(ciel.lune.signe)}</span>
</div></div>`;
}

function header({ active, compact } = {}) {
    const items = NAV.map((n) => {
        const cur = n.key === active ? ' aria-current="page"' : '';
        const cls = n.accent && n.key !== active ? ' class="accent"' : '';
        return `<li><a href="${n.href}"${cur}${cls}>${n.label}</a></li>`;
    }).join('');
    return `<header class="wrap site-header${compact ? ' compact' : ''}">
<a class="logo" href="./" aria-label="Horoscope Authentique, accueil"><img src="./assets/logo.svg" alt="Horoscope Authentique" width="752" height="200"></a>
<nav class="nav" aria-label="Navigation principale"><ul>${items}</ul></nav>
</header>`;
}

function crumbs(items) {
    // items : [{label, href}] ; le dernier est la page courante
    const lis = items.map((it, i) => (i === items.length - 1
        ? `<li aria-current="page">${esc(it.label)}</li>`
        : `<li><a href="${it.href}">${esc(it.label)}</a></li>`)).join('');
    return `<nav class="wrap crumbs" aria-label="Fil d'Ariane"><ol>${lis}</ol></nav>`;
}

function crumbsSchema(items) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((it, i) => {
            const el = { '@type': 'ListItem', position: i + 1, name: it.label };
            if (it.href) el.item = it.href === './' ? SITE : SITE + it.href.replace(/^\.\//, '').split('#')[0];
            return el;
        })
    };
}

function footer(signs) {
    const signLinks = signs.map((s) => `<li><a href="${s.slug}.html">${esc(s.name)}</a></li>`).join('');
    return `<footer class="site-footer"><div class="wrap">
<div class="cols">
<div><h2>Les douze signes</h2><ul class="two">${signLinks}</ul></div>
<div><h2>Horoscopes</h2><ul>
<li><a href="horoscope.html">Horoscope du jour</a></li>
<li><a href="horoscope-demain.html">Horoscope de demain</a></li>
<li><a href="horoscope-semaine.html">Horoscope de la semaine</a></li>
<li><a href="horoscope-mois.html">Horoscope du mois</a></li>
<li><a href="horoscope-2027.html">Horoscope 2027</a></li>
<li><a href="horoscope-chinois-2027.html">Horoscope chinois 2027</a></li>
</ul></div>
<div><h2>Outils</h2><ul>
<li><a href="theme-astral.html">Thème astral gratuit</a></li>
<li><a href="calcul-ascendant.html">Calcul de l'ascendant</a></li>
<li><a href="compatibilite-amoureuse.html">Compatibilité amoureuse</a></li>
<li><a href="red-flags.html">Red Flags</a></li>
<li><a href="numerologie-chemin-de-vie.html">Numérologie</a></li>
<li><a href="tirage-tarot-gratuit.html">Tirage du tarot gratuit</a></li>
<li><a href="heures-miroirs.html">Heures miroirs</a></li>
<li><a href="calendrier-lunaire.html">Calendrier lunaire</a></li>
</ul></div>
<div><h2>Savoirs</h2><ul>
<li><a href="encyclopedie.html">Encyclopédie</a></li>
<li><a href="signification.html">Signification des signes</a></li>
<li><a href="ciel-2027.html">Le ciel de 2027</a></li>
<li><a href="pierres-protectrices.html">Lithothérapie</a></li>
<li><a href="le-cosmos.html">Astronomie &amp; cosmos</a></li>
</ul></div>
<div><h2>La Maison</h2><p class="devise">« Les étoiles inclinent, mais ne déterminent pas. »</p><ul>
<li><a href="verite-horoscope-mensonge.html">Le manifeste</a></li>
<li><a href="apropos.html">Madeleine</a></li>
<li><a href="etude-karmique.html">Cabinet privé</a></li>
<li><a href="widget-horoscope.html">Widget pour votre site</a></li>
<li><a href="mentions-legales.html">Mentions légales</a></li>
</ul></div>
</div>
<div class="bottom"><img src="./assets/logo-ligne.svg" alt="Horoscope Authentique" width="1740" height="100" loading="lazy"><span>© ${new Date().getFullYear()} Horoscope Authentique</span></div>
</div></footer>`;
}

// Empreinte de la feuille de style : change dès que le CSS change, pour que les navigateurs rechargent
const VERSION_CSS = (() => { try { return require('crypto').createHash('md5').update(require('fs').readFileSync(require('path').join(__dirname, '..', 'assets', 'style.css'))).digest('hex').slice(0, 8); } catch { return '1'; } })();

const GA = `<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`;

function head({ title, description, file, ogImage, ogType, robots, jsonld = [], extra = '', preload = '' }) {
    const url = canonicalUrl(file);
    const img = SITE + 'assets/' + (ogImage || 'og-image.jpg');
    const ld = jsonld.filter(Boolean).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${description ? `<meta name="description" content="${esc(description)}">` : ''}
${robots ? `<meta name="robots" content="${esc(robots)}">` : ''}
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="Horoscope Authentique">
<meta property="og:locale" content="fr_FR">
<meta property="og:type" content="${ogType || 'website'}">
<meta property="og:title" content="${esc(title)}">
${description ? `<meta property="og:description" content="${esc(description)}">` : ''}
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#FFFFFF">
<meta name="p:domain_verify" content="2f64752dc14147ffd68e8750d1b2641a">
<link rel="icon" type="image/png" sizes="32x32" href="./assets/favicon-32.png">
<link rel="apple-touch-icon" href="./assets/apple-touch-icon.png">
<link rel="preload" href="./assets/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="./assets/fonts/cinzel-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
${preload}
<link rel="stylesheet" href="./assets/style.css?v=${VERSION_CSS}">
${GA}
${ld}
${extra}
</head>`;
}

// Page complète
function page({ head: h, ciel, active, compact, crumbs: cr, main, signs, after = '' }) {
    return `${head(h)}
<body>
<a class="sr-only" href="#contenu">Aller au contenu</a>
${cielBar(ciel)}
${header({ active, compact })}
${cr && cr.length ? crumbs(cr) : ''}
<main id="contenu">
${main}
</main>
${footer(signs)}
${after}
</body>
</html>
`;
}

// Petit bloc de passerelle vers une autre page
function bridge({ eyebrow, title, text, href, cta }) {
    return `<section class="section bridge"><div class="wrap-narrow">
<p class="eyebrow">${esc(eyebrow)}</p>
<h2 class="h2">${title}</h2>
${text ? `<p class="q">${esc(text)}</p>` : ''}
<a class="btn" href="${href}">${esc(cta)}</a>
</div></section>`;
}

module.exports = { SITE, esc, canonicalUrl, dateLongue, dateCourte, heure, isoJour, head, page, crumbs, crumbsSchema, footer, header, bridge, cielBar, GA, SIGN_IDX };

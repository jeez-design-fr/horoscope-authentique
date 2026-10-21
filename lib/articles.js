// Articles de l'encyclopédie.
// Source : content/articles/<slug>.html (corps) + <slug>.json (version, encadré « En bref », date).
// Chaque nuit, quelques articles sont (ré)écrits avec une consigne adaptée à leur catégorie,
// pour respecter le quota gratuit de Gemini. Les plus prioritaires d'abord : articles absents,
// puis notions d'astrologie et d'astronomie (jusqu'ici rédigées avec une consigne lithothérapie).
const fs = require('fs');
const path = require('path');
const { appelerGemini } = require('./gemini');

const DIR = path.join(__dirname, '..', 'content', 'articles');
const VERSION = 2;
const PAR_NUIT = 3;

const CATEGORIES = {
    'BIBLIOTHÈQUE INTERDITE': { label: 'Bibliothèque', image: 'livre.webp', priorite: 1,
        consigne: "C'est une notion d'astrologie. Commence par l'expliquer clairement : ce que c'est, comment elle se calcule ou se repère dans un thème, ce qu'elle change concrètement dans la vie. Donne ensuite des exemples parlants et des conseils. Ne parle de pierres que si c'est vraiment pertinent." },
    "L'OBSERVATOIRE": { label: 'Observatoire', image: 'cosmos.webp', priorite: 2,
        consigne: "C'est un sujet d'astronomie. Commence par les faits scientifiques exacts et vérifiables (ce qu'est l'objet ou le phénomène, son échelle, quand l'observer), puis propose une lecture symbolique et spirituelle clairement présentée comme telle." },
    'SANCTUAIRE DES ÉLÉMENTS': { label: 'Sanctuaire des éléments', image: 'elements.webp', priorite: 3,
        consigne: "C'est un rituel ou un objet de bien-être. Explique à quoi il sert, comment le pratiquer pas à pas, et les précautions de sécurité (fumée, flamme, huiles essentielles, contre-indications). Relie-le à l'élément concerné." },
    'LITHOTHÉRAPIE & RITUELS': { label: 'Lithothérapie', image: 'pierres.webp', priorite: 4,
        consigne: "C'est un article de lithothérapie. Présente la pierre (aspect, origine), ses vertus selon la tradition, comment la choisir, la purifier et la porter, et un petit rituel. Précise que la lithothérapie accompagne mais ne remplace pas un avis médical." }
};
const cat = (c) => CATEGORIES[c] || { label: 'Bibliothèque', image: 'livre.webp', priorite: 5, consigne: '' };

const lireMeta = (slug) => {
    const p = path.join(DIR, slug + '.json');
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : null;
};
const lireCorps = (slug) => {
    const p = path.join(DIR, slug + '.html');
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : null;
};

function prompt(article) {
    return `RÔLE : Tu es Madeleine, astrologue et autrice de la Maison Authentique. Ton : mystique, chaleureux, expert mais accessible. Tu vouvoies le lecteur, au genre neutre (aucun accord masculin ou féminin pour le lecteur).

SUJET : « ${article.titre} »
ANGLE : ${article.sujet}
${cat(article.categorie).consigne}

CONSIGNES :
- Réponds d'abord précisément à la question que se pose quelqu'un qui tape ce sujet dans Google.
- Environ 800 mots. Pas d'introduction du type « Bonjour », n'écris pas ton nom, pas d'emojis.
- N'invente aucun chiffre, aucune date, aucune étude.
- Aucun emoji, aucun markdown (pas de ** ni de #), aucune apostrophe genrée (« ma belle », « mon grand »…).
- HTML uniquement avec <h2>, <p>, <ul>, <li>, <strong>, <em>. Pas de <h1>, pas de <html> ni <body>.
- 3 à 5 intertitres <h2>, formulés comme des questions ou des titres clairs.

FORMAT : un objet JSON :
{
  "enBref": "la réponse à la question du sujet en 2 ou 3 phrases, factuelle et autonome, 400 caractères maximum",
  "html": "le corps de l'article"
}`;
}

async function ecrire(apiKey, article) {
    const o = await appelerGemini(apiKey, prompt(article), { temperature: 0.8 });
    if (!o.html || o.html.length < 1500) throw new Error('Article trop court');
    const html = o.html.replace(/```html|```/g, '').replace(/<\/?(h1|html|body|script|style)[^>]*>/gi, '').trim();
    fs.writeFileSync(path.join(DIR, article.slug + '.html'), html + '\n');
    fs.writeFileSync(path.join(DIR, article.slug + '.json'), JSON.stringify({ version: VERSION, enBref: o.enBref || null, maj: new Date().toISOString() }, null, 2));
}

async function mettreAJour(apiKey, articles) {
    if (!apiKey) return;
    fs.mkdirSync(DIR, { recursive: true });
    const file = articles
        .map((a) => ({ a, meta: lireMeta(a.slug), corps: lireCorps(a.slug) }))
        .filter((x) => !x.corps || !x.meta || (x.meta.version || 1) < VERSION)
        .sort((x, y) => (y.a.urgent ? 1 : 0) - (x.a.urgent ? 1 : 0) || (x.corps ? 1 : 0) - (y.corps ? 1 : 0) || cat(x.a.categorie).priorite - cat(y.a.categorie).priorite)
        .slice(0, PAR_NUIT);
    for (const { a } of file) {
        try {
            console.log(`✍️  Rédaction : ${a.titre}`);
            await ecrire(apiKey, a);
        } catch (e) {
            console.error(`❌ Article non rédigé (${a.slug}) : ${e.message}`);
        }
    }
}

// Ajoute des id aux <h2> pour le sommaire, et marque le premier paragraphe pour la lettrine.
function preparer(html) {
    const toc = [];
    const slugify = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    let out = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (m, attrs, inner) => {
        const id = slugify(inner) || 'partie-' + (toc.length + 1);
        toc.push({ id, label: inner.replace(/<[^>]+>/g, '').trim() });
        return `<h2 id="${id}">${inner}</h2>`;
    });
    out = out.replace(/<p>/, '<p class="lettrine">');
    const mots = out.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return { html: out, toc, minutes: Math.max(2, Math.round(mots / 220)) };
}

module.exports = { mettreAJour, lireMeta, lireCorps, preparer, cat, CATEGORIES };

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
const PAR_NUIT = 5;

const CATEGORIES = {
    'LES GRANDES QUESTIONS': { label: 'Grandes questions', image: 'compatibilite.webp', priorite: 0,
        consigne: "C'est une question que beaucoup de gens tapent dans Google. Réponds-y franchement dès le début, puis développe signe par signe quand c'est pertinent, avec chaleur et une pointe d'humour, sans jamais être blessant envers un signe." },
    'LA LUNE AU QUOTIDIEN': { label: 'La Lune au quotidien', image: 'lune-5.webp', priorite: 2,
        consigne: "C'est un sujet de tradition lunaire pratique. Distingue clairement ce qui est établi scientifiquement de ce qui relève de la tradition, et donne des conseils concrets et faciles à appliquer." },
    'NOMBRES & SYMBOLES': { label: 'Nombres & symboles', image: 'entree.webp', priorite: 3,
        consigne: "C'est un sujet de symbolique (numérologie, heures miroirs, tarot). Présente toujours ces lectures comme une tradition symbolique et un outil de réflexion, jamais comme une certitude. Donne des exemples précis et vérifie chaque calcul." },
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

// Format long de la salve « grandes questions » : article de fond, FAQ, liens internes contrôlés
function promptLong(article) {
    const liens = (article.liens || []).map((l) => `- ${l}`).join('\n');
    return `RÔLE : Tu es Madeleine, astrologue et autrice de la Maison Authentique. Ton : chaleureux, expert, rassurant et accessible, avec une pointe d'humour. Tu vouvoies le lecteur, au genre neutre (aucun accord masculin ou féminin pour le lecteur).

SUJET : « ${article.titre} »
PLAN ET FAITS À RESPECTER : ${article.sujet}
${cat(article.categorie).consigne}

CONSIGNES :
- Article de fond de 1 800 à 2 400 mots, le plus complet du web en français sur ce sujet.
- Le premier paragraphe répond directement à la question en 2 ou 3 phrases (c'est lui que Google affiche).
- 6 à 9 intertitres <h2> clairs, avec des <h3> quand tu développes signe par signe.
- Termine par un <h2>Questions fréquentes</h2> suivi de 4 à 6 questions en <h3>, chacune suivie d'une réponse en un <p> de 2 à 4 phrases.
- N'invente aucun chiffre, aucune date, aucune étude, aucune citation : n'utilise que les faits donnés ou des connaissances générales sûres.
- Liens internes : place 3 à 6 liens <a href="page.html">texte du lien</a>, naturellement dans le texte, UNIQUEMENT vers ces pages :
${liens}
- Aucun emoji, aucun markdown, aucune apostrophe genrée.
- HTML uniquement avec <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <a>. Pas de <h1>, pas de <html> ni <body>.

FORMAT : un objet JSON :
{
  "enBref": "la réponse à la question en 2 ou 3 phrases, factuelle et autonome, 400 caractères maximum",
  "html": "le corps de l'article"
}`;
}

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
    const long = !!article.salve;
    const o = await appelerGemini(apiKey, (long ? promptLong : prompt)(article), { temperature: 0.7 });
    if (!o.html || o.html.length < (long ? 7000 : 1500)) throw new Error('Article trop court');
    const permis = new Set(article.liens || []);
    const html = o.html.replace(/```html|```/g, '').replace(/<\/?(h1|html|body|script|style)[^>]*>/gi, '')
        // on ne garde que les liens vers les pages autorisées du site
        .replace(/<a(?=[\s>])[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => (permis.has(href.replace(/^\.\//, '')) ? `<a class="inlink" href="${href.replace(/^\.\//, '')}">${txt}</a>` : txt))
        .trim();
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

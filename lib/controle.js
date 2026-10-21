// Contrôle qualité des textes écrits par l'IA, avant publication.
// Vérifie : positions de planètes citées = ciel calculé, rétrogradations réelles,
// genre neutre (pas de « ma belle », « mon grand », « tu es prête »…), pas d'emoji ni de markdown.
const ASTRES = 'Soleil|Lune|Mercure|Vénus|Venus|Mars|Jupiter|Saturne|Uranus|Neptune|Pluton';
const SIGNES = 'Bélier|Belier|Taureau|Gémeaux|Gemeaux|Cancer|Lion|Vierge|Balance|Scorpion|Sagittaire|Capricorne|Verseau|Poissons';
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const RE_POSITION = new RegExp(`\\b(${ASTRES})\\s+(?:est\\s+|reste\\s+|passe\\s+|entre\\s+|transite\\s+|arrive\\s+|séjourne\\s+|se trouve\\s+|toujours\\s+)?(?:en|dans le signe du|dans le signe des|dans le|dans les)\\s+(${SIGNES})\\b`, 'gi');
const RE_RETRO = new RegExp(`\\b(${ASTRES})\\s+(?:est\\s+|reste\\s+|toujours\\s+|encore\\s+)*rétrograde`, 'gi');
const RE_VOCATIF = /\b(ma belle|mon beau|mon grand|ma grande|ma ch[eè]re|mon cher|ma ch[ée]rie|mon ch[ée]ri|mon amie?|ma reine|mon roi|ma puce|mon chou|ma biche|mon pote|ma poule|beaut[ée])\b/i;
const RE_ACCORD = /\btu (?:es|seras|te sens|te sentiras|sembles|as l'air)\s+(?:tellement |si |très |plus |toute |tout )?(\p{L}+)/giu;
const GENRES = /(é|ée|és|ées|eux|euse|ier|ière|if|ive)$/i;
const GENRES_MOTS = new Set(['prêt', 'prête', 'seul', 'seule', 'fier', 'fière', 'sûr', 'sûre', 'ravi', 'ravie', 'perdu', 'perdue', 'déçu', 'déçue', 'convaincu', 'convaincue']);
const RE_EMOJI = /\p{Extended_Pictographic}/u;

function erreursTexte(texte, ciel) {
    const err = [];
    const reel = Object.fromEntries(ciel.astres.map((a) => [norm(a.nom), a]));
    for (const m of texte.matchAll(RE_POSITION)) {
        const a = reel[norm(m[1])];
        if (a && norm(a.signe) !== norm(m[2])) err.push(`« ${m[0]} » est faux : ${a.nom} est en ${a.signe}`);
    }
    for (const m of texte.matchAll(RE_RETRO)) {
        const a = reel[norm(m[1])];
        if (a && !a.retrograde) err.push(`« ${m[0]} » est faux : ${a.nom} n'est pas rétrograde`);
    }
    const v = texte.match(RE_VOCATIF);
    if (v) err.push(`apostrophe genrée « ${v[0]} »`);
    for (const m of texte.matchAll(RE_ACCORD)) {
        const mot = m[1].toLowerCase();
        if (GENRES_MOTS.has(mot) || (mot.length > 3 && GENRES.test(mot))) err.push(`accord genré « ${m[0]} »`);
    }
    if (RE_EMOJI.test(texte)) err.push('emoji');
    if (/\*\*|__|#/.test(texte)) err.push('mise en forme markdown');
    return err;
}

// Contrôle un horoscope complet { slug: {essentiel, amour:{texte}, ...} }
function controlerHoroscope(signes, ciel) {
    const rapport = {};
    for (const [slug, d] of Object.entries(signes)) {
        const morceaux = [d.essentiel || '', d.amour?.titre || '', d.amour?.texte || '', d.travail?.titre || '', d.travail?.texte || '', d.bienetre?.titre || '', d.bienetre?.texte || ''];
        const e = morceaux.flatMap((t) => erreursTexte(t, ciel));
        if (e.length) rapport[slug] = e;
    }
    return rapport;
}

// Dernier recours : retire les phrases fautives.
function nettoyer(texte, ciel) {
    if (!texte) return texte;
    const phrases = texte.match(/[^.!?…]+[.!?…]*\s*/g) || [texte];
    const gardees = phrases.filter((p) => erreursTexte(p, ciel).length === 0);
    return (gardees.join('').trim() || texte).replace(/\*\*/g, '');
}

module.exports = { erreursTexte, controlerHoroscope, nettoyer };

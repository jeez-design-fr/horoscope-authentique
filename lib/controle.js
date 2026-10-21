// Contrôle qualité des textes écrits par l'IA, avant publication.
// Vérifie : positions de planètes citées = ciel calculé, rétrogradations réelles,
// genre neutre (pas de « ma belle », « mon grand », « tu es prête »…), pas d'emoji ni de markdown.
const ASTRES = 'Soleil|Lune|Mercure|Vénus|Venus|Mars|Jupiter|Saturne|Uranus|Neptune|Pluton';
const SIGNES = 'Bélier|Belier|Taureau|Gémeaux|Gemeaux|Cancer|Lion|Vierge|Balance|Scorpion|Sagittaire|Capricorne|Verseau|Poissons';
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const RE_POSITION = new RegExp(`\\b(${ASTRES})\\s+(?:est\\s+|reste\\s+|passe\\s+|entre\\s+|transite\\s+|arrive\\s+|séjourne\\s+|se trouve\\s+|toujours\\s+)?(?:en|dans le signe du|dans le signe des|dans le|dans les)\\s+(${SIGNES})\\b`, 'g');
const RE_RETRO = new RegExp(`\\b(${ASTRES})\\s+(?:est\\s+|reste\\s+|toujours\\s+|encore\\s+)*rétrograde`, 'g');
const RE_VOCATIF = /\b(ma belle|mon beau|mon grand|ma grande|ma ch[eè]re|mon cher|ma ch[ée]rie|mon ch[ée]ri|mon amie?|ma reine|mon roi|ma puce|mon chou|ma biche|mon pote|ma poule|beaut[ée])\b/i;
const RE_ACCORD = /(?<!\p{L})(?:tu (?:es|seras|serais|étais|sembles|as l'air|restes|resteras|deviens|deviendras)|(?:te |t')(?:sens|sentir|sentiras|retrouves|retrouver|retrouveras)|(?:crainte|peur|besoin|envie|impression|sentiment|droit|risque|honte) d'être|sans être|sois)\s+(?:tellement |si |très |plus |toute |tout |enfin |totalement |vraiment |bien )?(\p{L}+)/giu;
// « tu ressors de cette journée transformé » : participe accordé quelques mots après un verbe de mouvement
const RE_ACCORD_LOIN = /(?<!\p{L})(?:ressors|ressortiras|sors|sortiras|reviens|reviendras|repars|repartiras)(?!\p{L})(?:[^.!?]{0,45}?[,\s])?(?<!(?:la|une|cette|ta|ma|sa|de|du|des|les|ces|tes|mes|ses|l'|d'|et|ton|son|mon|un|le|au|aux) )(?<!(?:cœur|esprit|âme|corps|mental|moral|regard|visage|ventre|souffle) )(?<!\p{L})(\p{L}+(?:é|ée|és|ées))(?!\p{L})/giu;
const GENRES = /(é|ée|és|ées|eux|euse|ier|ière|if|ive)$/i;
const GENRES_MOTS = new Set(['prêt', 'prête', 'seul', 'seule', 'fier', 'fière', 'sûr', 'sûre', 'ravi', 'ravie', 'perdu', 'perdue', 'déçu', 'déçue', 'convaincu', 'convaincue']);
const RE_EMOJI = /\p{Extended_Pictographic}/u;

// Ce qui est vrai sur la période : pour chaque astre, les signes occupés et s'il est rétrograde à un moment.
// Accepte un ciel unique ou une liste de ciels (un par jour d'une semaine, d'un mois…).
function verification(ciels) {
    const liste = Array.isArray(ciels) ? ciels : [ciels];
    if (liste[0] && liste[0].__verif) return liste[0];
    const v = { __verif: true, signes: {}, retro: {}, noms: {} };
    for (const c of liste) for (const a of c.astres) {
        const k = norm(a.nom);
        (v.signes[k] = v.signes[k] || new Set()).add(norm(a.signe));
        v.retro[k] = v.retro[k] || a.retrograde;
        v.noms[k] = v.noms[k] || { nom: a.nom, signes: new Set() };
        v.noms[k].signes.add(a.signe);
    }
    return v;
}

function erreursTexte(texte, ciels) {
    const err = [];
    const v = verification(ciels);
    for (const m of texte.matchAll(RE_POSITION)) {
        const k = norm(m[1]);
        if (v.signes[k] && !v.signes[k].has(norm(m[2]))) err.push(`« ${m[0]} » est faux : ${v.noms[k].nom} est en ${[...v.noms[k].signes].join(' puis ')}`);
    }
    for (const m of texte.matchAll(RE_RETRO)) {
        const k = norm(m[1]);
        if (v.signes[k] && !v.retro[k]) err.push(`« ${m[0]} » est faux : ${v.noms[k].nom} n'est pas rétrograde`);
    }
    const voc = texte.match(RE_VOCATIF);
    if (voc) err.push(`apostrophe genrée « ${voc[0]} »`);
    for (const m of texte.matchAll(RE_ACCORD)) {
        const mot = m[1].toLowerCase();
        if (GENRES_MOTS.has(mot) || (mot.length > 3 && GENRES.test(mot))) err.push(`accord genré « ${m[0]} »`);
    }
    for (const m of texte.matchAll(RE_ACCORD_LOIN)) err.push(`accord genré « ${m[1]} »`);
    const vous = texte.match(/(^|[^\p{L}-])(vous|votre|vos)(?!\p{L})/iu);
    if (vous) err.push(`vouvoiement « ${vous[2]} » : il faut tutoyer (tu, ton, ta, tes)`);
    if (RE_EMOJI.test(texte)) err.push('emoji');
    if (/\*\*|__|#/.test(texte)) err.push('mise en forme markdown');
    return err;
}

// Contrôle un horoscope complet { slug: {essentiel, amour:{texte}, ...} }
function controlerHoroscope(signes, ciels) {
    const ciel = verification(ciels);
    const rapport = {};
    for (const [slug, d] of Object.entries(signes)) {
        const morceaux = [d.essentiel || '', d.amour?.titre || '', d.amour?.texte || '', d.travail?.titre || '', d.travail?.texte || '', d.bienetre?.titre || '', d.bienetre?.texte || '', d.mission || ''];
        const e = morceaux.flatMap((t) => erreursTexte(t, ciel));
        if (e.length) rapport[slug] = e;
    }
    return rapport;
}

// Remet les apostrophes que Gemini oublie parfois : « t envoie » → « t'envoie », « te invite » → « t'invite »
const VOY = "aeiouyàâäéèêëîïôöûùüœAEIOUYÀÂÉÈÊÎÔÛŒ";
function apostrophes(texte) {
    if (typeof texte !== 'string') return texte;
    return texte
        .replace(new RegExp(`(^|[\\s(«"])([cldtsjmnCLDTSJMN]|[Qq]u|[Jj]usqu|[Ll]orsqu|[Pp]uisqu) (?=[${VOY}h])`, 'g'), "$1$2'")
        .replace(new RegExp(`(^|[\\s(«"])([tsmjnTSMJN])e (?=[${VOY}])`, 'g'), "$1$2'");
}

// Dernier recours : retire les phrases fautives.
function nettoyer(texte, ciels) {
    if (!texte) return texte;
    const ciel = verification(ciels);
    const phrases = texte.match(/[^.!?…]+[.!?…]*\s*/g) || [texte];
    const gardees = phrases.filter((p) => erreursTexte(p, ciel).length === 0);
    return (gardees.join('').trim() || texte).replace(/\*\*/g, '');
}

module.exports = { erreursTexte, controlerHoroscope, nettoyer, verification, apostrophes };

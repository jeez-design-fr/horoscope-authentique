// Images générées automatiquement (gratuit, sans service externe) :
// - épingles Pinterest verticales 1000 × 1500
// - aperçus de partage (Open Graph) 1200 × 630
// Rendu : SVG → PNG avec resvg (polices du site embarquées), puis JPEG compressé avec sharp.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');
const opentype = require('opentype.js');

const RACINE = path.join(__dirname, '..');
// Polices du site (converties depuis les woff2) ; les lettres sont dessinées en tracés,
// ce qui garantit des accents bien placés quel que soit le moteur de rendu.
const POLICE = Object.fromEntries(Object.entries({ serif: 'CormorantGaramond-Medium.ttf', italique: 'CormorantGaramond-Italic.ttf', caps: 'Cinzel-Medium.ttf' })
    .map(([k, f]) => [k, opentype.loadSync(path.join(__dirname, 'polices', f))]));

// Texte → <path> : police (serif | italique | caps), taille, ancre (start | middle), espacement en px
function txt(chaine, x, y, { police = 'serif', taille, couleur, ancre = 'start', espacement = 0 }) {
    const f = POLICE[police];
    const glyphes = f.stringToGlyphs(String(chaine).normalize('NFC'));
    const echelle = taille / f.unitsPerEm;
    let largeur = 0;
    glyphes.forEach((g, i) => { largeur += g.advanceWidth * echelle + (i < glyphes.length - 1 ? espacement : 0); if (i < glyphes.length - 1) largeur += f.getKerningValue(g, glyphes[i + 1]) * echelle; });
    let cx = ancre === 'middle' ? x - largeur / 2 : x;
    let d = '';
    glyphes.forEach((g, i) => {
        d += g.getPath(cx, y, taille).toPathData(1);
        cx += g.advanceWidth * echelle + espacement + (i < glyphes.length - 1 ? f.getKerningValue(g, glyphes[i + 1]) * echelle : 0);
    });
    return `<path d="${d}" fill="${couleur}"/>`;
}
const OR = '#8A6A22', OR_CLAIR = '#C9A54A', FILET = '#E8DDBF', ENCRE = '#1C1A17', ENCRE_2 = '#4A453E';

const xml = (s) => String(s).normalize('NFC').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Image du site → data URI PNG (resvg ne lit pas le webp)
const cache = new Map();
async function dataUri(fichier, largeur) {
    const cle = fichier + '@' + largeur;
    if (!cache.has(cle)) {
        const buf = await sharp(path.join(RACINE, 'assets', fichier)).resize({ width: largeur }).png().toBuffer();
        cache.set(cle, 'data:image/png;base64,' + buf.toString('base64'));
    }
    return cache.get(cle);
}
const LOGO = () => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(RACINE, 'assets', 'logo.svg')).toString('base64');

// Découpe un texte en lignes (largeur moyenne d'un caractère ≈ ratio × taille)
function lignes(texte, largeur, taille, ratio = 0.43, max = 99) {
    const mots = String(texte).split(/\s+/);
    const parLigne = Math.floor(largeur / (taille * ratio));
    const out = [];
    let cur = '';
    for (const m of mots) {
        if ((cur + ' ' + m).trim().length > parLigne && cur) { out.push(cur); cur = m; } else cur = (cur + ' ' + m).trim();
    }
    if (cur) out.push(cur);
    if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s+\S*$/, '') + '…'; }
    return out;
}
const bloc = (ls, x, y, interligne, opts) => ls.map((l, i) => txt(l, x, y + i * interligne, opts)).join('');

async function rendre(svg, sortie, qualite = 82) {
    const png = new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng();
    fs.mkdirSync(path.dirname(sortie), { recursive: true });
    await sharp(png).jpeg({ quality: qualite, mozjpeg: true }).toFile(sortie);
}

// Cadre commun : fond blanc, double filet doré, logo en pied
function cadre(w, h, contenu) {
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<rect width="${w}" height="${h}" fill="#FFFFFF"/>
<rect x="28" y="28" width="${w - 56}" height="${h - 56}" fill="none" stroke="${OR_CLAIR}" stroke-width="2"/>
<rect x="40" y="40" width="${w - 80}" height="${h - 80}" fill="none" stroke="${FILET}" stroke-width="1"/>
${contenu}
</svg>`;
}

// ---------- Épingle « horoscope du jour » d'un signe ----------
async function epingleSigne({ signe, eyebrow, date, texte, sortie }) {
    const W = 1000, H = 1500;
    const visuel = await dataUri(`${signe.slug}.webp`, 560);
    const t = lignes(texte, 780, 44, 0.4, 5);
    const yTexte = 1090;
    const svg = cadre(W, H, `
${txt(eyebrow.toUpperCase(), 500, 128, { police: 'caps', taille: 26, couleur: OR, ancre: 'middle', espacement: 7 })}
${txt(signe.name, 500, 230, { police: 'serif', taille: 104, couleur: ENCRE, ancre: 'middle' })}
${txt(date, 500, 290, { police: 'italique', taille: 38, couleur: OR, ancre: 'middle' })}
<image x="${500 - 260}" y="330" width="520" height="${Math.round(520 * 1192 / 800)}" preserveAspectRatio="xMidYMin meet" href="${visuel}" xlink:href="${visuel}" opacity="1" clip-path="url(#c)"/>
<defs><clipPath id="c"><rect x="0" y="330" width="1000" height="${yTexte - 120 - 330}"/></clipPath><linearGradient id="fondu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="1"/></linearGradient></defs>
<rect x="44" y="${yTexte - 260}" width="912" height="140" fill="url(#fondu)"/>
<line x1="440" y1="${yTexte - 84}" x2="560" y2="${yTexte - 84}" stroke="${OR_CLAIR}" stroke-width="2"/>
${bloc(t, 500, yTexte - 30, 56, { police: 'italique', taille: 44, couleur: ENCRE_2, ancre: 'middle' })}
<image x="${500 - 170}" y="1318" width="340" height="${Math.round(340 * 2048 / 7706)}" href="${LOGO()}" xlink:href="${LOGO()}"/>
${txt('HOROSCOPE-AUTHENTIQUE.FR', 500, 1458, { police: 'caps', taille: 19, couleur: OR, ancre: 'middle', espacement: 4 })}`);
    await rendre(svg, sortie);
}

// ---------- Épingle « page permanente » (couples, fiches, lune, 2027…) ----------
// visuels : 1 ou 2 fichiers d'assets
async function epinglePage({ eyebrow, titre, sousTitre, visuels, sortie }) {
    const W = 1000, H = 1500;
    const imgs = await Promise.all(visuels.map((v) => dataUri(v.fichier, v.largeur || 420)));
    const t = lignes(titre, 820, 84, 0.42, 3);
    const s = lignes(sousTitre || '', 800, 40, 0.4, 3);
    const yT = 230;
    const yV = Math.min(600, yT + (t.length - 1) * 92 + (s.length ? 20 + s.length * 52 : 0) + 90);
    let visu = '';
    if (visuels.length === 2) {
        const hImg = Math.round(390 * 1.49), y0 = Math.round(yV + Math.max(0, (1290 - yV - hImg) / 2));
        visu = visuels.map((v, i) => `<image x="${i ? 530 : 80}" y="${y0}" width="390" height="${hImg}" preserveAspectRatio="xMidYMin meet" href="${imgs[i]}" xlink:href="${imgs[i]}"/>`).join('') +
            `${txt('&', 500, y0 + hImg / 2 + 30, { police: 'italique', taille: 96, couleur: OR, ancre: 'middle' })}`;
    } else {
        const v = visuels[0], l = v.affichage || 520;
        const hV = Math.round(l * (v.ratio || 1.49)), y1 = Math.round(yV + Math.max(0, (1290 - yV - hV) / 2));
        visu = `<image x="${500 - l / 2}" y="${y1}" width="${l}" height="${Math.round(l * (v.ratio || 1.49))}" preserveAspectRatio="xMidYMin meet" href="${imgs[0]}" xlink:href="${imgs[0]}"/>`;
    }
    const svg = cadre(W, H, `
${txt(eyebrow.toUpperCase(), 500, 128, { police: 'caps', taille: 26, couleur: OR, ancre: 'middle', espacement: 7 })}
${bloc(t, 500, yT, 92, { police: 'serif', taille: 84, couleur: ENCRE, ancre: 'middle' })}
${bloc(s, 500, yT + t.length * 92 + 20, 52, { police: 'italique', taille: 40, couleur: OR, ancre: 'middle' })}
<defs><clipPath id="c"><rect x="44" y="${yV - 20}" width="912" height="${1300 - yV}"/></clipPath><linearGradient id="fondu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="1"/></linearGradient></defs>
<g clip-path="url(#c)">${visu}</g>
<rect x="44" y="1180" width="912" height="130" fill="url(#fondu)"/>
<image x="${500 - 170}" y="1318" width="340" height="${Math.round(340 * 2048 / 7706)}" href="${LOGO()}" xlink:href="${LOGO()}"/>
${txt('HOROSCOPE-AUTHENTIQUE.FR', 500, 1458, { police: 'caps', taille: 19, couleur: OR, ancre: 'middle', espacement: 4 })}`);
    await rendre(svg, sortie);
}

// ---------- Aperçu de partage 1200 × 630 ----------
async function apercu({ eyebrow, titre, sousTitre, visuel, sortie }) {
    const W = 1200, H = 630;
    const img = visuel ? await dataUri(visuel.fichier, 440) : null;
    const xTexte = img ? 500 : 600, ancre = img ? 'start' : 'middle', larg = img ? 620 : 980;
    const t = lignes(titre, larg, 68, 0.42, 3);
    const s = lignes(sousTitre || '', larg, 34, 0.4, 2);
    const yT = 300 - (t.length - 1) * 38;
    const svg = cadre(W, H, `
${img ? `<defs><clipPath id="c"><rect x="44" y="44" width="420" height="542"/></clipPath></defs><image clip-path="url(#c)" x="${254 - 200}" y="${visuel.y || 60}" width="400" height="${Math.round(400 * (visuel.ratio || 1.49))}" preserveAspectRatio="xMidYMin meet" href="${img}" xlink:href="${img}"/>` : ''}
${txt(eyebrow.toUpperCase(), xTexte, yT - 90, { police: 'caps', taille: 22, couleur: OR, ancre: ancre, espacement: 6 })}
${bloc(t, xTexte, yT, 76, { police: 'serif', taille: 68, couleur: ENCRE, ancre: ancre })}
${bloc(s, xTexte, yT + t.length * 76 + 6, 44, { police: 'italique', taille: 34, couleur: OR, ancre: ancre })}
${txt('HOROSCOPE-AUTHENTIQUE.FR', xTexte, 560, { police: 'caps', taille: 18, couleur: OR, ancre: ancre, espacement: 4 })}`);
    await rendre(svg, sortie, 84);
}

module.exports = { epingleSigne, epinglePage, apercu };

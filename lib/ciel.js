// Le ciel réel du jour, calculé localement avec astronomy-engine (open source, gratuit, sans API).
// Ces positions sont la seule source autorisée pour l'horoscope : l'IA n'a plus le droit d'en inventer.
const A = require('astronomy-engine');

const SIGNES = ['Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge', 'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'];
const SLUGS = ['belier', 'taureau', 'gemeaux', 'cancer', 'lion', 'vierge', 'balance', 'scorpion', 'sagittaire', 'capricorne', 'verseau', 'poissons'];

const ASTRES = [
    { id: 'Sun', nom: 'Soleil', art: 'le Soleil' },
    { id: 'Moon', nom: 'Lune', art: 'la Lune' },
    { id: 'Mercury', nom: 'Mercure', art: 'Mercure' },
    { id: 'Venus', nom: 'Vénus', art: 'Vénus' },
    { id: 'Mars', nom: 'Mars', art: 'Mars' },
    { id: 'Jupiter', nom: 'Jupiter', art: 'Jupiter' },
    { id: 'Saturn', nom: 'Saturne', art: 'Saturne' },
    { id: 'Uranus', nom: 'Uranus', art: 'Uranus' },
    { id: 'Neptune', nom: 'Neptune', art: 'Neptune' },
    { id: 'Pluto', nom: 'Pluton', art: 'Pluton' }
];

const PHASES = ['Nouvelle lune', 'Premier croissant', 'Premier quartier', 'Gibbeuse croissante', 'Pleine lune', 'Gibbeuse décroissante', 'Dernier quartier', 'Dernier croissant'];

const ASPECTS = [
    { angle: 0, nom: 'conjonction', orbe: 6 },
    { angle: 60, nom: 'sextile', orbe: 4 },
    { angle: 90, nom: 'carré', orbe: 5 },
    { angle: 120, nom: 'trigone', orbe: 5 },
    { angle: 180, nom: 'opposition', orbe: 6 }
];

function longitude(id, date) {
    if (id === 'Sun') return A.SunPosition(date).elon;
    if (id === 'Moon') return A.EclipticGeoMoon(date).lon;
    return A.Ecliptic(A.GeoVector(id, date, true)).elon;
}

const norm = (x) => ((x % 360) + 360) % 360;

function ecart(a, b) {
    const d = Math.abs(norm(a) - norm(b));
    return d > 180 ? 360 - d : d;
}

function getCiel(date = new Date()) {
    const demain = new Date(date.getTime() + 86400000);
    const astres = ASTRES.map((a) => {
        const lon = norm(longitude(a.id, date));
        const lon2 = norm(longitude(a.id, demain));
        const mouvement = ((lon2 - lon + 540) % 360) - 180;
        const i = Math.floor(lon / 30);
        return {
            id: a.id, nom: a.nom, art: a.art,
            longitude: +lon.toFixed(2),
            signe: SIGNES[i], signeSlug: SLUGS[i],
            degre: Math.floor(lon % 30),
            retrograde: a.id !== 'Sun' && a.id !== 'Moon' && mouvement < 0
        };
    });

    // Aspects majeurs entre astres (hors Lune trop rapide pour une tendance de journée, sauf avec le Soleil)
    const aspects = [];
    for (let i = 0; i < astres.length; i++) {
        for (let j = i + 1; j < astres.length; j++) {
            const a = astres[i], b = astres[j];
            if ((a.id === 'Moon' || b.id === 'Moon') && a.id !== 'Sun') continue;
            const d = ecart(a.longitude, b.longitude);
            for (const asp of ASPECTS) {
                if (Math.abs(d - asp.angle) <= asp.orbe) {
                    aspects.push({ a: a.nom, b: b.nom, aspect: asp.nom, orbe: +Math.abs(d - asp.angle).toFixed(1) });
                }
            }
        }
    }
    aspects.sort((x, y) => x.orbe - y.orbe);

    const angle = A.MoonPhase(date);
    const phaseIndex = Math.round(angle / 45) % 8;
    const illumination = Math.round(A.Illumination('Moon', date).phase_fraction * 100);
    const lune = astres.find((a) => a.id === 'Moon');

    return {
        date: date.toISOString(),
        astres,
        aspects: aspects.slice(0, 8),
        lune: { phaseIndex, phase: PHASES[phaseIndex], illumination, signe: lune.signe, croissante: angle < 180 },
        soleil: astres.find((a) => a.id === 'Sun')
    };
}

// Les astres présents dans un signe, et dans son signe opposé (les deux zones qui parlent le plus à ce signe)
function astresPourSigne(ciel, slug) {
    const i = SLUGS.indexOf(slug);
    const oppose = SLUGS[(i + 6) % 12];
    return {
        dans: ciel.astres.filter((a) => a.signeSlug === slug),
        face: ciel.astres.filter((a) => a.signeSlug === oppose)
    };
}

// Texte factuel transmis à l'IA : positions exactes, rien d'autre.
function cielEnTexte(ciel) {
    const pos = ciel.astres.map((a) => `- ${a.nom} en ${a.signe} (${a.degre}°)${a.retrograde ? ', rétrograde' : ''}`).join('\n');
    const asp = ciel.aspects.length ? ciel.aspects.map((x) => `- ${x.a} ${x.aspect} ${x.b}`).join('\n') : '- aucun aspect majeur serré';
    return `POSITIONS DU JOUR (calculées, exactes) :\n${pos}\n\nPHASE DE LA LUNE : ${ciel.lune.phase}, ${ciel.lune.illumination} % éclairée.\n\nASPECTS MAJEURS DU JOUR :\n${asp}`;
}

// Prochaine (ou actuelle) période de Mercure rétrograde, en cherchant jour par jour.
function periodeMercureRetro(depuis = new Date()) {
    const jour = 86400000;
    const retroLe = (d) => {
        const a = norm(longitude('Mercury', d));
        const b = norm(longitude('Mercury', new Date(d.getTime() + jour)));
        return ((b - a + 540) % 360) - 180 < 0;
    };
    let d = new Date(depuis.getTime());
    let enCours = retroLe(d);
    if (enCours) {
        while (retroLe(new Date(d.getTime() - jour))) d = new Date(d.getTime() - jour);
    } else {
        for (let k = 0; k < 200 && !retroLe(d); k++) d = new Date(d.getTime() + jour);
    }
    const debut = d;
    let fin = new Date(debut.getTime());
    for (let k = 0; k < 40 && retroLe(fin); k++) fin = new Date(fin.getTime() + jour);
    return { enCours, debut, fin };
}

module.exports = { getCiel, astresPourSigne, cielEnTexte, periodeMercureRetro, SIGNES, SLUGS, PHASES };

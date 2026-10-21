// Dates du Nouvel An chinois, calculées selon la règle du calendrier chinois :
// le 11e mois contient le solstice d'hiver ; le Nouvel An est la 2e nouvelle lune qui suit
// (la 3e si un mois intercalaire tombe en 11e ou 12e mois). Heure de Pékin (UTC+8).
const A = require('astronomy-engine');
const JOUR = 86400000;
const bj = (d) => new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 10); // date civile à Pékin
const lonSoleil = (d) => A.SunPosition(d).elon;

function nouvellesLunes(debut, nb) {
    const out = [];
    let t = debut;
    for (let i = 0; i < nb; i++) {
        const nl = A.SearchMoonPhase(0, t, 40);
        out.push(nl.date);
        t = new Date(nl.date.getTime() + JOUR);
    }
    return out;
}

// Début (date Pékin) du 11e mois de l'année civile Y : la nouvelle lune au plus tard le jour du solstice
function debutMois11(y) {
    const sol = A.Seasons(y).dec_solstice.date;
    const nls = nouvellesLunes(new Date(sol.getTime() - 35 * JOUR), 3);
    return nls.filter((d) => bj(d) <= bj(sol)).pop();
}

// La période [a, b[ (dates Pékin) contient-elle un terme principal (longitude solaire multiple de 30°) ?
function aUnTermePrincipal(a, b) {
    const da = new Date(bj(a) + 'T00:00:00+08:00'), db = new Date(bj(b) + 'T00:00:00+08:00');
    const la = lonSoleil(da), lb = lonSoleil(db);
    return Math.floor(la / 30) !== Math.floor(((lb < la ? lb + 360 : lb)) / 30);
}

function nouvelAn(y) {
    const m11 = debutMois11(y - 1), m11suiv = debutMois11(y);
    const nls = nouvellesLunes(new Date(m11.getTime() + JOUR), 14);
    const lunes = [m11, ...nls];
    const nbMois = lunes.findIndex((d) => bj(d) === bj(m11suiv));
    let rang = 2;
    if (nbMois === 13) {
        for (let i = 0; i < 13; i++) {
            if (!aUnTermePrincipal(lunes[i], lunes[i + 1])) { if (i === 1 || i === 2) rang = 3; break; }
        }
    }
    return bj(lunes[rang]);
}

function table(de = 1900, a = 2100) {
    const t = {};
    for (let y = de; y <= a; y++) t[y] = nouvelAn(y);
    return t;
}

const ANIMAUX = ['rat', 'boeuf', 'tigre', 'lapin', 'dragon', 'serpent', 'cheval', 'chevre', 'singe', 'coq', 'chien', 'cochon'];
const ELEMENTS = ['Bois', 'Bois', 'Feu', 'Feu', 'Terre', 'Terre', 'Métal', 'Métal', 'Eau', 'Eau'];
const animalDeAnnee = (y) => ANIMAUX[(((y - 4) % 12) + 12) % 12];
const elementDeAnnee = (y) => ELEMENTS[(((y - 4) % 10) + 10) % 10];

module.exports = { nouvelAn, table, animalDeAnnee, elementDeAnnee, ANIMAUX };

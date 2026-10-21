// Agenda du ciel : entrées des planètes dans les signes, rétrogradations, lunaisons, éclipses.
// Tout est calculé (astronomy-engine), jamais écrit à la main ni inventé par l'IA.
const A = require('astronomy-engine');
const { SIGNES, SLUGS } = require('./ciel');

const JOUR = 86400000;
const PARIS = new A.Observer(48.8566, 2.3522, 35);
const PLANETES = [
    { id: 'Mercury', nom: 'Mercure' }, { id: 'Venus', nom: 'Vénus' }, { id: 'Mars', nom: 'Mars' },
    { id: 'Jupiter', nom: 'Jupiter' }, { id: 'Saturn', nom: 'Saturne' }, { id: 'Uranus', nom: 'Uranus' },
    { id: 'Neptune', nom: 'Neptune' }, { id: 'Pluto', nom: 'Pluton' }
];
const norm = (x) => ((x % 360) + 360) % 360;
const lon = (id, d) => (id === 'Sun' ? A.SunPosition(d).elon : id === 'Moon' ? A.EclipticGeoMoon(d).lon : norm(A.Ecliptic(A.GeoVector(id, d, true)).elon));
const signeDe = (l) => ({ signe: SIGNES[Math.floor(norm(l) / 30)], slug: SLUGS[Math.floor(norm(l) / 30)], degre: Math.floor(norm(l) % 30) });
const vitesse = (id, d) => ((lon(id, new Date(d.getTime() + JOUR)) - lon(id, d) + 540) % 360) - 180;

// Affine par dichotomie l'instant où une condition change entre a et b
function affiner(a, b, test) {
    const ta = test(a);
    for (let i = 0; i < 20; i++) {
        const m = new Date((a.getTime() + b.getTime()) / 2);
        if (test(m) === ta) a = m; else b = m;
    }
    return b;
}

function entreesEtStations(debut, fin, corps = [{ id: 'Sun', nom: 'Soleil' }, ...PLANETES]) {
    const ev = [];
    for (const p of corps) {
        let t = new Date(debut.getTime());
        let s0 = Math.floor(lon(p.id, t) / 30), r0 = p.id !== 'Sun' && vitesse(p.id, t) < 0;
        while (t < fin) {
            const t2 = new Date(Math.min(t.getTime() + JOUR, fin.getTime()));
            const s1 = Math.floor(lon(p.id, t2) / 30), r1 = p.id !== 'Sun' && vitesse(p.id, t2) < 0;
            if (s1 !== s0) {
                const quand = affiner(t, t2, (d) => Math.floor(lon(p.id, d) / 30));
                ev.push({ type: 'entree', astre: p.nom, date: quand, signe: SIGNES[s1], slug: SLUGS[s1], retro: r1 });
            }
            if (r1 !== r0) {
                const quand = affiner(t, t2, (d) => vitesse(p.id, d) < 0);
                ev.push({ type: r1 ? 'retro' : 'direct', astre: p.nom, date: quand, ...signeDe(lon(p.id, quand)) });
            }
            s0 = s1; r0 = r1; t = t2;
        }
    }
    return ev;
}

const QUARTIERS = ['Nouvelle lune', 'Premier quartier', 'Pleine lune', 'Dernier quartier'];
function lunaisons(debut, fin) {
    const out = [];
    let q = A.SearchMoonQuarter(debut);
    while (q.time.date < fin) {
        const d = q.time.date;
        out.push({ type: 'lune', quartier: q.quarter, nom: QUARTIERS[q.quarter], date: d, ...signeDe(A.EclipticGeoMoon(d).lon) });
        q = A.NextMoonQuarter(q);
    }
    return out;
}

const NOMS_ECL = { penumbral: 'pénombrale', partial: 'partielle', total: 'totale', annular: 'annulaire' };
function eclipses(debut, fin) {
    const out = [];
    let e = A.SearchLunarEclipse(debut);
    while (e.peak.date < fin) {
        out.push({ type: 'eclipse', corps: 'Lune', nature: NOMS_ECL[e.kind] || e.kind, date: e.peak.date, ...signeDe(A.EclipticGeoMoon(e.peak.date).lon) });
        e = A.NextLunarEclipse(e.peak);
    }
    let s = A.SearchGlobalSolarEclipse(debut);
    while (s.peak.date < fin) {
        let paris = null;
        try {
            const loc = A.SearchLocalSolarEclipse(new Date(s.peak.date.getTime() - 2 * JOUR), PARIS);
            if (Math.abs(loc.peak.time.date - s.peak.date) < 2 * JOUR && loc.peak.altitude > 0) paris = Math.round(loc.obscuration * 100);
        } catch (_) { /* pas visible */ }
        out.push({ type: 'eclipse', corps: 'Soleil', nature: NOMS_ECL[s.kind] || s.kind, date: s.peak.date, parisObscuration: paris, ...signeDe(A.SunPosition(s.peak.date).elon) });
        s = A.NextGlobalSolarEclipse(s.peak);
    }
    return out;
}

// Tous les événements d'une période, triés
function agenda(debut, fin, { lunes = true, ecl = true } = {}) {
    return [...entreesEtStations(debut, fin), ...(lunes ? lunaisons(debut, fin) : []), ...(ecl ? eclipses(debut, fin) : [])]
        .sort((a, b) => a.date - b.date);
}

const dateFr = (d, opts = { day: 'numeric', month: 'long' }) => new Date(d).toLocaleDateString('fr-FR', { ...opts, timeZone: 'Europe/Paris' });
const heureFr = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', ' h ');

function libelle(e) {
    if (e.type === 'entree') return `${e.astre} entre en ${e.signe}${e.retro ? ' (rétrograde)' : ''}`;
    if (e.type === 'retro') return `${e.astre} devient rétrograde en ${e.signe}`;
    if (e.type === 'direct') return `${e.astre} redevient direct en ${e.signe}`;
    if (e.type === 'lune') return `${e.nom} en ${e.signe}`;
    if (e.type === 'eclipse') return `Éclipse ${e.nature} de ${e.corps} en ${e.signe}${e.corps === 'Soleil' ? (e.parisObscuration ? `, visible à ${e.parisObscuration} % depuis Paris` : ', non visible depuis la France') : ''}`;
    return '';
}

// Périodes de rétrogradation d'une planète sur une année (début → fin)
function periodesRetro(nomAstre, debut, fin) {
    const p = PLANETES.find((x) => x.nom === nomAstre);
    const ev = entreesEtStations(new Date(debut.getTime() - 200 * JOUR), new Date(fin.getTime() + 200 * JOUR), [p]).filter((e) => e.type !== 'entree');
    const out = [];
    for (let i = 0; i < ev.length; i++) {
        if (ev[i].type === 'retro') {
            const f = ev.slice(i + 1).find((x) => x.type === 'direct');
            if (f && f.date >= debut && ev[i].date <= fin) out.push({ astre: nomAstre, debut: ev[i].date, fin: f.date, signeDebut: ev[i].signe, signeFin: f.signe });
        }
    }
    return out;
}

module.exports = { agenda, lunaisons, eclipses, entreesEtStations, periodesRetro, libelle, dateFr, heureFr, signeDe, lon, PLANETES, QUARTIERS };

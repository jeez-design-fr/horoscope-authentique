// Horoscopes rédigés par Gemini, toujours à partir du ciel réellement calculé :
// aujourd'hui, demain, la semaine, le mois.
// Chaque texte est sauvegardé dans data/ (commité chaque nuit) : le site se reconstruit
// sans clé, ne perd jamais un texte, et n'appelle Gemini que quand c'est nécessaire.
//   - chaque nuit : 1 appel (demain) ; « aujourd'hui » reprend le « demain » de la veille
//   - le lundi : 1 appel (la semaine) ; une fois par mois : 1 appel (le mois)
const fs = require('fs');
const path = require('path');
const { getCiel, cielEnTexte, astresPourSigne } = require('./ciel');
const { agenda, libelle, dateFr } = require('./agenda');
const { appelerGemini } = require('./gemini');
const { controlerHoroscope, nettoyer, verification, apostrophes } = require('./controle');

const DATA = path.join(__dirname, '..', 'data');
// Version des règles de rédaction : l'augmenter force une réécriture (1 appel par fichier)
const VERSION = 3;
const F = { jour: 'horoscope-du-jour.json', demain: 'horoscope-demain.json', semaine: 'horoscope-semaine.json', mois: 'horoscope-mois.json' };
const JOUR = 86400000;

const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isoParis = (d) => new Date(d).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
const midi = (iso) => new Date(iso + 'T11:00:00Z');
const lire = (f) => (fs.existsSync(path.join(DATA, f)) ? JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf-8')) : null);
const ecrire = (f, o) => { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, f), JSON.stringify(o, null, 2)); };

function parSigne(ciel, signs) {
    return signs.map((s) => {
        const { dans, face } = astresPourSigne(ciel, s.slug);
        const f = (l) => (l.length ? l.map((a) => a.nom + (a.retrograde ? ' (rétrograde)' : '')).join(', ') : 'aucun astre');
        return `- ${s.name} (${s.element}, maître : ${s.planete}) : dans le signe → ${f(dans)} ; dans le signe opposé → ${f(face)}`;
    }).join('\n');
}

const ROLE = `RÔLE : Tu es Madeleine, astrologue de la Maison Authentique. Tu écris comme une amie complice qui connaît le ciel par cœur : chaleureuse, drôle, jamais moqueuse, toujours du côté de la personne qui te lit. On doit refermer ton texte en se sentant compris, rassuré et accompagné.

TON STYLE (très important) :
- Commence par une image du quotidien ou une remarque tendre et taquine sur le tempérament du signe (« Toi qui démarres au quart de tour… »).
- Explique toujours le POURQUOI avec le ciel : quel astre, où il est, et ce que ça change concrètement (« parce que le Soleil traverse le signe juste en face du tien, il éclaire tout ce qui se vit à deux »). La personne doit comprendre, pas seulement lire une prédiction.
- Donne ensuite une piste concrète et réaliste pour la journée : une conversation, un geste, une habitude, une pause.
- Ton bienveillant et rassurant : même un ciel tendu se présente comme une occasion d'apprendre, jamais comme une menace. Aucune prédiction catastrophiste, aucun conseil médical ou financier précis.
- Phrases vivantes et variées, vocabulaire simple, pas de jargon (si tu cites un aspect, explique-le en mots simples : « un bel accord », « une tension »).`;

const REGLES = `RÈGLES ABSOLUES :
1. Tu ne cites QUE les positions, rétrogradations, phases, aspects et événements listés ci-dessus. Tu n'inventes aucune autre position, aucun autre aspect, aucune autre date. N'écris jamais qu'une planète « stationne », « s'arrête » ou « repart » si cette station n'est pas listée.
2. Pour chaque signe, appuie-toi d'abord sur les astres qui le touchent directement (dans le signe, en face, ou sa planète maîtresse).
3. Tutoie TOUJOURS le lecteur (tu, ton, ta, tes), jamais « vous », « votre », « vos ». Genre strictement neutre : aucun accord masculin ou féminin pour le lecteur (évite « prêt », « seul », « fier », « heureux »… préfère des tournures neutres), aucun « ma belle », « mon grand », pas d'écriture inclusive avec point médian.
4. Français impeccable : orthographe, accords, conjugaison, apostrophes (c'est, l'amour, t'invite, qu'il), guillemets français. Relis chaque phrase.
5. Pas d'astérisques, pas d'emojis, pas de markdown.
6. Chaque signe est différent des autres : pas de phrases recyclées d'un signe à l'autre.`;

function formatJson(longueur, periode = 'du jour') {
    return `FORMAT : un objet JSON dont les clés sont exactement les noms des signes (Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons). Pour chaque signe :
{
  "essentiel": "une ou deux phrases chaleureuses qui résument l'énergie, 220 caractères maximum",
  "amour": { "titre": "3 à 6 mots, évocateurs", "texte": "${longueur}" },
  "travail": { "titre": "3 à 6 mots, évocateurs", "texte": "${longueur}" },
  "bienetre": { "titre": "3 à 6 mots, évocateurs", "texte": "${longueur}" },
  "mission": "ta mission ${periode} : un petit défi concret, tendre et un peu drôle, en une ou deux phrases (sans le préfixe « Ta mission »)"
}`;
}


function valide(d) {
    return d && typeof d.essentiel === 'string'
        && ['amour', 'travail', 'bienetre'].every((k) => d[k] && typeof d[k].texte === 'string' && d[k].texte.length > 20);
}

function extraire(signs, brut) {
    const parCle = Object.fromEntries(Object.entries(brut).map(([k, v]) => [sansAccent(k), v]));
    const out = {};
    for (const s of signs) {
        const d = parCle[sansAccent(s.name)];
        if (!valide(d)) throw new Error(`Signe incomplet dans la réponse : ${s.name}`);
        out[s.slug] = JSON.parse(JSON.stringify(d), (k, v) => apostrophes(v));
    }
    return out;
}

// Appel + contrôle qualité + correction + nettoyage de dernier recours
async function rediger(apiKey, signs, texte, ciels) {
    const verif = verification(ciels);
    let out = extraire(signs, await appelerGemini(apiKey, texte, { temperature: 0.9 }));
    let rapport = controlerHoroscope(out, verif);
    if (Object.keys(rapport).length) {
        const liste = Object.entries(rapport).map(([slug, e]) => `- ${signs.find((x) => x.slug === slug).name} : ${e.join(' ; ')}`).join('\n');
        console.log('🔁 Corrections demandées à Gemini :\n' + liste);
        try {
            out = extraire(signs, await appelerGemini(apiKey, `${texte}\n\nTA PREMIÈRE VERSION CONTENAIT CES ERREURS, CORRIGE-LES SANS EN AJOUTER :\n${liste}\n\nVERSION À CORRIGER :\n${JSON.stringify(out)}`, { temperature: 0.4 }));
        } catch (e) {
            console.error('   Correction impossible, nettoyage automatique :', e.message);
        }
        rapport = controlerHoroscope(out, verif);
        for (const slug of Object.keys(rapport)) {
            const d = out[slug];
            d.essentiel = nettoyer(d.essentiel, verif);
            if (d.mission) d.mission = nettoyer(d.mission, verif);
            for (const k of ['amour', 'travail', 'bienetre']) { d[k].texte = nettoyer(d[k].texte, verif); d[k].titre = nettoyer(d[k].titre, verif); }
        }
    }
    // Relecture : Gemini relit son texte (orthographe, accords, apostrophes) sans toucher au fond.
    // On ne garde la version relue que pour les signes où elle ne réintroduit aucune erreur.
    try {
        const relu = extraire(signs, await appelerGemini(apiKey, `Tu es correctrice professionnelle en français. Voici un objet JSON d'horoscopes. Corrige UNIQUEMENT l'orthographe, la grammaire, les accords, la conjugaison, les apostrophes et la ponctuation (guillemets français, espaces). Ne change ni le sens, ni le ton, ni les astres cités, ni la longueur. Garde le tutoiement et le genre neutre. Renvoie exactement la même structure JSON, mêmes clés.

${JSON.stringify(Object.fromEntries(signs.map((x) => [x.name, out[x.slug]])))}`, { temperature: 0.1 }));
        const avant = Object.keys(controlerHoroscope(out, verif)).length;
        let gardes = 0;
        for (const x of signs) {
            const r = relu[x.slug];
            if (r && !controlerHoroscope({ [x.slug]: r }, verif)[x.slug] && r.amour.texte.length > out[x.slug].amour.texte.length * 0.8) { out[x.slug] = r; gardes++; }
        }
        console.log(`   Relecture : ${gardes}/12 signes relus et validés (${avant} avec réserve avant relecture).`);
    } catch (e) {
        console.error('   Relecture impossible, on garde la version contrôlée :', e.message);
    }
    console.log(`   Contrôle qualité : ${Object.keys(controlerHoroscope(out, verif)).length} signe(s) avec réserve restante.`);
    return out;
}

async function journee(apiKey, signs, iso, label) {
    const ciel = getCiel(midi(iso));
    const texte = `${ROLE}

JOUR : ${label}, ${dateFr(midi(iso), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

${cielEnTexte(ciel)}

CE QUI TOUCHE DIRECTEMENT CHAQUE SIGNE :
${parSigne(ciel, signs)}

TÂCHE : écris l'horoscope de cette journée pour les 12 signes.

${REGLES}

${formatJson('6 à 7 phrases, 110 à 140 mots', 'du jour')}`;
    const signes = await rediger(apiKey, signs, texte, [ciel]);
    return { version: VERSION, date: iso, genereLe: new Date().toISOString(), source: 'gemini', ciel, signes };
}

// Rattrapage unique : relit le texte de l'ancien modèle de page (public/<signe>.html)
function depuisAnciennesPages(signs, publicDir) {
    const out = {};
    for (const s of signs) {
        const p = path.join(publicDir, `${s.slug}.html`);
        if (!fs.existsSync(p)) return null;
        const h = fs.readFileSync(p, 'utf-8');
        const lireTexte = (label) => {
            const m = h.match(new RegExp(`>${label}</h2>[\\s\\S]*?italic">([\\s\\S]*?)</p>`));
            return m ? m[1].replace(/\s+/g, ' ').trim() : null;
        };
        const amour = lireTexte('Amour'), travail = lireTexte('Travail'), bien = lireTexte('Bien-être');
        if (!amour || !travail || !bien) return null;
        out[s.slug] = { essentiel: null, amour: { titre: null, texte: amour }, travail: { titre: null, texte: travail }, bienetre: { titre: null, texte: bien } };
    }
    return out;
}

async function quotidiens({ apiKey, signs, publicDir }) {
    const aujourdhui = isoParis(new Date());
    const demainIso = isoParis(new Date(Date.now() + JOUR));
    let jour = lire(F.jour);
    if (jour && !jour.date) jour.date = isoParis(jour.genereLe);
    let demain = lire(F.demain);

    // Aujourd'hui
    if (!jour || jour.date !== aujourdhui || jour.source === 'migration' || jour.version !== VERSION) {
        if (demain && demain.date === aujourdhui && demain.version === VERSION) {
            console.log("📄 Aujourd'hui = le « demain » rédigé hier (aucun appel).");
            jour = { ...demain, source: 'veille', genereLe: new Date().toISOString() }; // publié aujourd'hui
            ecrire(F.jour, jour);
        } else if (apiKey) {
            try {
                console.log("✨ Gemini rédige l'horoscope du jour…");
                jour = await journee(apiKey, signs, aujourdhui, "aujourd'hui");
                ecrire(F.jour, jour);
            } catch (e) { console.error("❌ Horoscope du jour non rédigé, on garde le dernier :", e.message); }
        }
    }
    if (!jour) {
        const ancien = depuisAnciennesPages(signs, publicDir);
        if (!ancien) throw new Error('Aucun horoscope disponible (ni clé Gemini, ni fichier data, ni anciennes pages).');
        jour = { date: aujourdhui, genereLe: new Date().toISOString(), source: 'migration', ciel: getCiel(midi(aujourdhui)), signes: ancien };
        ecrire(F.jour, jour);
    }

    // Demain
    if ((!demain || demain.date !== demainIso || demain.version !== VERSION) && apiKey) {
        try {
            console.log("✨ Gemini rédige l'horoscope de demain…");
            demain = await journee(apiKey, signs, demainIso, 'demain');
            ecrire(F.demain, demain);
        } catch (e) { console.error('❌ Horoscope de demain non rédigé :', e.message); }
    }
    if (demain && demain.date !== demainIso) demain = null; // jamais un « demain » périmé

    return { jour, demain };
}

// ---------- Semaine & mois ----------
function lundiDe(iso) {
    const d = midi(iso);
    const jourSemaine = (d.getUTCDay() + 6) % 7;
    return isoParis(new Date(d.getTime() - jourSemaine * JOUR));
}

async function periode({ apiKey, signs, fichier, id, debutIso, finIso, label, longueur }) {
    const existant = lire(fichier);
    if (existant && existant.id === id && existant.version === VERSION) return existant;
    if (!apiKey) return existant && existant.finIso >= isoParis(new Date()) ? existant : null;
    const debut = midi(debutIso), fin = new Date(midi(finIso).getTime() + 12 * 3600000);
    const nbJours = Math.round((fin - debut) / JOUR) + 1;
    const ciels = Array.from({ length: nbJours }, (_, i) => getCiel(new Date(debut.getTime() + i * JOUR)));
    const milieu = ciels[Math.floor(ciels.length / 2)];
    const evts = agenda(debut, fin).map((e) => `- ${dateFr(e.date, { weekday: 'long', day: 'numeric', month: 'long' })} : ${libelle(e)}`).join('\n') || '- aucun changement majeur';
    const texte = `${ROLE}

PÉRIODE : ${label}.

ÉVÉNEMENTS DU CIEL SUR LA PÉRIODE (calculés, exacts) :
${evts}

${cielEnTexte(milieu)}
(positions au milieu de la période)

CE QUI TOUCHE DIRECTEMENT CHAQUE SIGNE AU MILIEU DE LA PÉRIODE :
${parSigne(milieu, signs)}

TÂCHE : écris l'horoscope de cette période pour les 12 signes, en t'appuyant sur les événements datés quand ils concernent le signe.

${REGLES}

${formatJson(longueur, id.length === 7 ? 'du mois' : 'de la semaine')}`;
    try {
        console.log(`✨ Gemini rédige l'horoscope : ${label}…`);
        const signes = await rediger(apiKey, signs, texte, ciels);
        const data = { version: VERSION, id, debutIso, finIso, label, genereLe: new Date().toISOString(), signes };
        ecrire(fichier, data);
        return data;
    } catch (e) {
        console.error(`❌ Horoscope « ${label} » non rédigé :`, e.message);
        return existant && existant.finIso >= isoParis(new Date()) ? existant : null;
    }
}

async function semaine({ apiKey, signs }) {
    const lundi = lundiDe(isoParis(new Date()));
    const dimanche = isoParis(new Date(midi(lundi).getTime() + 6 * JOUR));
    return periode({ apiKey, signs, fichier: F.semaine, id: lundi, debutIso: lundi, finIso: dimanche, label: `semaine du ${dateFr(midi(lundi))} au ${dateFr(midi(dimanche), { day: 'numeric', month: 'long', year: 'numeric' })}`, longueur: '7 à 8 phrases, 130 à 160 mots' });
}

async function mois({ apiKey, signs }) {
    const now = new Date();
    const [y, m, d] = isoParis(now).split('-').map(Number);
    // À partir du 25, on publie déjà le mois suivant (c'est ce que les gens cherchent)
    const cible = d >= 25 ? new Date(Date.UTC(y, m, 1)) : new Date(Date.UTC(y, m - 1, 1));
    const yy = cible.getUTCFullYear(), mm = cible.getUTCMonth();
    const debutIso = `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
    const finIso = isoParis(new Date(Date.UTC(yy, mm + 1, 0, 11)));
    const nom = cible.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    return periode({ apiKey, signs, fichier: F.mois, id: debutIso.slice(0, 7), debutIso, finIso, label: `mois ${/^[aeiou]/i.test(nom) ? "d'" : 'de '}${nom}`, longueur: '8 à 9 phrases, 150 à 180 mots' });
}

module.exports = { quotidiens, semaine, mois, isoParis };

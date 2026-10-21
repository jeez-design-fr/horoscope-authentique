// Horoscope du jour : Gemini rédige, mais uniquement à partir du ciel réellement calculé.
// Le résultat est sauvegardé dans data/horoscope-du-jour.json (commité chaque nuit),
// ce qui permet de reconstruire le site sans clé d'API et sans jamais perdre le texte du jour.
const fs = require('fs');
const path = require('path');
const { cielEnTexte, astresPourSigne } = require('./ciel');

const FICHIER = path.join(__dirname, '..', 'data', 'horoscope-du-jour.json');
const MODELE = 'gemini-2.5-flash';

const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function prompt(ciel, signs) {
    const parSigne = signs.map((s) => {
        const { dans, face } = astresPourSigne(ciel, s.slug);
        const d = dans.length ? dans.map((a) => a.nom + (a.retrograde ? ' (rétrograde)' : '')).join(', ') : 'aucun astre';
        const f = face.length ? face.map((a) => a.nom + (a.retrograde ? ' (rétrograde)' : '')).join(', ') : 'aucun astre';
        return `- ${s.name} (${s.element}, maître : ${s.planete}) : dans le signe → ${d} ; dans le signe opposé → ${f}`;
    }).join('\n');

    return `RÔLE : Tu es Madeleine, astrologue de la Maison Authentique : complice, un brin taquine, comme une amie qui connaît le ciel par cœur.

${cielEnTexte(ciel)}

CE QUI TOUCHE DIRECTEMENT CHAQUE SIGNE :
${parSigne}

TÂCHE : écris l'horoscope du jour pour les 12 signes.

RÈGLES ABSOLUES :
1. Tu ne cites QUE les positions, rétrogradations, phases et aspects listés ci-dessus. Tu n'inventes aucune autre position, aucun autre aspect. Si une planète n'est pas listée dans un signe, tu ne l'y places pas.
2. Pour chaque signe, appuie-toi d'abord sur les astres qui le touchent directement (dans le signe, en face, ou sa planète maîtresse), puis sur la Lune.
3. Tutoie le lecteur. Genre strictement neutre : aucun accord masculin ou féminin pour le lecteur, aucun « ma belle », « mon grand », « prêt·e », « seul·e ».
4. Traduis en ressenti concret, avec de l'humour et de la chaleur. Pas de jargon technique, pas d'astérisques, pas d'emojis.
5. Chaque signe doit être différent des autres : pas de phrases recyclées.

FORMAT : un objet JSON dont les clés sont exactement les noms des signes (Bélier, Taureau, Gémeaux, Cancer, Lion, Vierge, Balance, Scorpion, Sagittaire, Capricorne, Verseau, Poissons). Pour chaque signe :
{
  "essentiel": "une seule phrase qui résume la journée, 120 caractères maximum",
  "amour": { "titre": "3 à 5 mots", "texte": "2 à 3 phrases" },
  "travail": { "titre": "3 à 5 mots", "texte": "2 à 3 phrases" },
  "bienetre": { "titre": "3 à 5 mots", "texte": "2 à 3 phrases" }
}`;
}

function valide(sign, d) {
    return d && typeof d.essentiel === 'string'
        && ['amour', 'travail', 'bienetre'].every((k) => d[k] && typeof d[k].texte === 'string' && d[k].texte.length > 20);
}

async function demanderGemini(apiKey, ciel, signs) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt(ciel, signs) }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.9 }
        })
    });
    if (!res.ok) throw new Error(`Gemini ${res.status} : ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!txt) throw new Error('Réponse Gemini vide');
    const brut = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    const parCle = Object.fromEntries(Object.entries(brut).map(([k, v]) => [sansAccent(k), v]));
    const out = {};
    for (const s of signs) {
        const d = parCle[sansAccent(s.name)];
        if (!valide(s, d)) throw new Error(`Signe incomplet dans la réponse : ${s.name}`);
        out[s.slug] = d;
    }
    return out;
}

// Rattrapage unique : relit le texte de l'ancien modèle de page (public/<signe>.html)
function depuisAnciennesPages(signs, publicDir) {
    const out = {};
    for (const s of signs) {
        const p = path.join(publicDir, `${s.slug}.html`);
        if (!fs.existsSync(p)) return null;
        const h = fs.readFileSync(p, 'utf-8');
        const lire = (label) => {
            const m = h.match(new RegExp(`>${label}</h2>[\\s\\S]*?italic">([\\s\\S]*?)</p>`));
            return m ? m[1].replace(/\s+/g, ' ').trim() : null;
        };
        const amour = lire('Amour'), travail = lire('Travail'), bien = lire('Bien-être');
        if (!amour || !travail || !bien) return null;
        out[s.slug] = {
            essentiel: null,
            amour: { titre: null, texte: amour },
            travail: { titre: null, texte: travail },
            bienetre: { titre: null, texte: bien }
        };
    }
    return out;
}

async function horoscopeDuJour({ apiKey, ciel, signs, publicDir }) {
    if (apiKey) {
        try {
            console.log('✨ Gemini rédige l\'horoscope à partir du ciel calculé...');
            const signes = await demanderGemini(apiKey, ciel, signs);
            const data = { genereLe: new Date().toISOString(), source: 'gemini', ciel, signes };
            fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
            fs.writeFileSync(FICHIER, JSON.stringify(data, null, 2));
            console.log('✅ Horoscope du jour enregistré.');
            return data;
        } catch (e) {
            console.error('❌ Gemini indisponible, on garde le dernier horoscope enregistré :', e.message);
        }
    }
    if (fs.existsSync(FICHIER)) {
        console.log('📄 Horoscope relu depuis data/horoscope-du-jour.json');
        return JSON.parse(fs.readFileSync(FICHIER, 'utf-8'));
    }
    const ancien = depuisAnciennesPages(signs, publicDir);
    if (ancien) {
        console.log('📄 Horoscope récupéré depuis les anciennes pages (migration).');
        const data = { genereLe: new Date().toISOString(), source: 'migration', ciel, signes: ancien };
        fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
        fs.writeFileSync(FICHIER, JSON.stringify(data, null, 2));
        return data;
    }
    throw new Error('Aucun horoscope disponible (ni clé Gemini, ni fichier data, ni anciennes pages).');
}

module.exports = { horoscopeDuJour };

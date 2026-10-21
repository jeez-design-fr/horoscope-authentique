// Appel Gemini commun, avec repli automatique de modèle.
// Coût : la clé utilisée est celle d'un projet AI Studio SANS compte de facturation.
// Dans ce cas Google ne facture jamais : au-delà du quota gratuit, l'appel échoue
// simplement (erreur 429) et le site garde le dernier texte enregistré.
// Ordre : modèles recommandés par Google pour les nouveaux projets, puis l'ancien.
const MODELES = (process.env.GEMINI_MODELES || 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-2.5-flash')
    .split(',').map((s) => s.trim()).filter(Boolean);

// Plafond d'appels par nuit (filet de sécurité en plus du quota gratuit de Google),
// et pause entre deux appels pour rester sous la limite par minute.
const MAX_APPELS = parseInt(process.env.GEMINI_MAX_APPELS || '20', 10);
const PAUSE_MS = 6500;
let appels = 0;
let dernier = 0;
const restants = () => Math.max(0, MAX_APPELS - appels);

async function appelerGemini(apiKey, texte, { temperature = 0.8 } = {}) {
    if (appels >= MAX_APPELS) throw new Error(`plafond de ${MAX_APPELS} appels atteint pour cette nuit`);
    const attente = dernier + PAUSE_MS - Date.now();
    if (attente > 0) await new Promise((r) => setTimeout(r, attente));
    appels++;
    dernier = Date.now();
    let derniereErreur;
    for (const modele of MODELES) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: texte }] }],
                    generationConfig: { responseMimeType: 'application/json', temperature }
                })
            });
            if (!res.ok) {
                derniereErreur = new Error(`${modele} → ${res.status} ${(await res.text()).slice(0, 160)}`);
                // Modèle retiré, inconnu, ou quota de ce modèle épuisé : on essaie le suivant
                if ([400, 403, 404, 429, 500, 503].includes(res.status)) continue;
                throw derniereErreur;
            }
            const data = await res.json();
            const txt = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
            if (!txt.includes('{')) { derniereErreur = new Error(`${modele} → réponse vide`); continue; }
            console.log(`   (modèle utilisé : ${modele})`);
            return JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        } catch (e) {
            derniereErreur = e;
        }
    }
    throw derniereErreur || new Error('Aucun modèle Gemini disponible');
}

module.exports = { appelerGemini, MODELES, restants, MAX_APPELS };

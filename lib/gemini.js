// Appel Gemini commun, avec repli automatique de modèle.
// Coût : la clé utilisée est celle d'un projet AI Studio SANS compte de facturation.
// Dans ce cas Google ne facture jamais : au-delà du quota gratuit, l'appel échoue
// simplement (erreur 429) et le site garde le dernier texte enregistré.
// Ordre : modèles recommandés par Google pour les nouveaux projets, puis l'ancien.
const MODELES = (process.env.GEMINI_MODELES || 'gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite,gemini-2.5-flash')
    .split(',').map((s) => s.trim()).filter(Boolean);

async function appelerGemini(apiKey, texte, { temperature = 0.8 } = {}) {
    let derniereErreur;
    for (const modele of MODELES) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

module.exports = { appelerGemini, MODELES };
